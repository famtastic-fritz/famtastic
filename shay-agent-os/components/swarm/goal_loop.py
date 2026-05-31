"""
goal_loop.py — Implements the /goal pattern.

Takes a goal string, breaks into subgoals, assigns to workers,
judge model (hermes3) checks completion, loops until done or budget exhausted.
Budget default 20 turns.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .message_bus import Message, MessageBus
from .worker_pool import TaskPriority, WorkerPool

logger = logging.getLogger("swarm.goal_loop")

JUDGE_MODEL = "hermes3:latest"


class GoalStatus:
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    BUDGET_EXHAUSTED = "budget_exhausted"


@dataclass
class SubGoal:
    id: str
    description: str
    status: str = "pending"   # pending | running | completed | failed
    result: Optional[str] = None
    assigned_tier: str = "simple"
    depends_on: List[str] = field(default_factory=list)


@dataclass
class GoalSession:
    id: str
    original_goal: str
    subgoals: List[SubGoal] = field(default_factory=list)
    status: str = GoalStatus.ACTIVE
    turn: int = 0
    budget: int = 20
    history: List[Dict[str, Any]] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    completed_at: Optional[float] = None
    final_result: Optional[str] = None


class GoalLoop:
    """
    Decomposes high-level goals into subgoals, dispatches to workers,
    and uses a judge model to verify completion.
    """

    def __init__(
        self,
        worker_pool: WorkerPool,
        message_bus: Optional[MessageBus] = None,
        budget: int = 20,
        judge_model: str = JUDGE_MODEL,
    ):
        self.worker_pool = worker_pool
        self.message_bus = message_bus
        self.budget = budget
        self.judge_model = judge_model
        self._sessions: Dict[str, GoalSession] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run(self, goal: str, session_id: Optional[str] = None) -> GoalSession:
        """
        Run a goal to completion (blocking).
        Returns the completed session.
        """
        session = self.start(goal, session_id)
        while session.status == GoalStatus.ACTIVE:
            self.step(session)
            if session.turn >= session.budget:
                session.status = GoalStatus.BUDGET_EXHAUSTED
                logger.warning(f"Session {session.id} budget exhausted ({session.budget} turns)")
                break
        return session

    def start(self, goal: str, session_id: Optional[str] = None) -> GoalSession:
        """Initialize a new goal session."""
        sid = session_id or f"goal-{int(time.time()*1000)}"
        session = GoalSession(id=sid, original_goal=goal, budget=self.budget)
        self._sessions[sid] = session
        logger.info(f"Goal session {sid} started: {goal[:120]}")

        if self.message_bus:
            self.message_bus.publish("orchestrator", Message(
                topic="goal.started",
                payload={"session_id": sid, "goal": goal},
                sender="goal_loop",
            ))
        return session

    def step(self, session: GoalSession) -> None:
        """Execute one turn of the goal loop."""
        session.turn += 1
        logger.info(f"[{session.id}] Turn {session.turn}/{session.budget}")

        # Phase 1: Decompose if no subgoals
        if not session.subgoals:
            self._decompose(session)
            return

        # Phase 2: Execute pending subgoals
        pending = [sg for sg in session.subgoals if sg.status == "pending"]
        if pending:
            self._execute_subgoals(session, pending)
            return

        # Phase 3: Check for running subgoals
        running = [sg for sg in session.subgoals if sg.status == "running"]
        if running:
            logger.info(f"[{session.id}] Waiting on {len(running)} running subgoals")
            time.sleep(0.5)
            return

        # Phase 4: Judge completion
        if all(sg.status == "completed" for sg in session.subgoals):
            verdict = self._judge(session)
            if verdict.get("complete", False):
                session.status = GoalStatus.COMPLETED
                session.completed_at = time.time()
                session.final_result = verdict.get("summary", "")
                logger.info(f"[{session.id}] Goal COMPLETED in {session.turn} turns")
                if self.message_bus:
                    self.message_bus.publish("results", Message(
                        topic="goal.completed",
                        payload={
                            "session_id": session.id,
                            "turns": session.turn,
                            "result": session.final_result,
                        },
                        sender="goal_loop",
                    ))
            else:
                # Judge says not done — add more subgoals
                logger.info(f"[{session.id}] Judge says incomplete, adding subgoals")
                new_goals = verdict.get("additional_subgoals", [])
                for desc in new_goals:
                    sg = SubGoal(
                        id=f"{session.id}-sg{len(session.subgoals)+1}",
                        description=desc,
                        assigned_tier=self._tier_for_task(desc),
                    )
                    session.subgoals.append(sg)
        else:
            # Some failed — try to recover
            failed = [sg for sg in session.subgoals if sg.status == "failed"]
            if failed:
                logger.warning(f"[{session.id}] {len(failed)} subgoals failed")
                for sg in failed:
                    sg.status = "pending"  # retry

    # ------------------------------------------------------------------
    # Decomposition
    # ------------------------------------------------------------------

    def _decompose(self, session: GoalSession) -> None:
        """Use judge model to break goal into subgoals."""
        prompt = f"""You are a task decomposition engine. Break the following goal into 2-5 concrete subgoals.
Each subgoal should be a single clear task that a worker can execute.

Goal: {session.original_goal}

Respond ONLY with a JSON array of strings, like:
["subgoal 1", "subgoal 2", "subgoal 3"]
"""
        logger.info(f"[{session.id}] Decomposing goal...")
        tid = self.worker_pool.submit(
            prompt=prompt,
            model_tier="complex",
            priority=TaskPriority.HIGH,
            timeout=90.0,
            context={"session_id": session.id, "phase": "decompose"},
        )
        task = self.worker_pool.wait(tid, max_wait=120.0)
        if task and task.status.name == "COMPLETED" and task.result:
            subgoals = self._parse_subgoals(task.result)
            for i, desc in enumerate(subgoals):
                sg = SubGoal(
                    id=f"{session.id}-sg{i+1}",
                    description=desc,
                    assigned_tier=self._tier_for_task(desc),
                )
                session.subgoals.append(sg)
            logger.info(f"[{session.id}] Decomposed into {len(subgoals)} subgoals")
            session.history.append({"turn": session.turn, "action": "decompose", "subgoals": subgoals})
        else:
            logger.error(f"[{session.id}] Decomposition failed: {task.error if task else 'timeout'}")
            # Fallback: single subgoal = the original goal
            session.subgoals.append(SubGoal(
                id=f"{session.id}-sg1",
                description=session.original_goal,
                assigned_tier="complex",
            ))

    def _parse_subgoals(self, text: str) -> List[str]:
        """Extract JSON array of subgoals from LLM output."""
        text = text.strip()
        # Try to find JSON array
        start = text.find("[")
        end = text.rfind("]")
        if start != -1 and end != -1 and end > start:
            try:
                arr = json.loads(text[start:end+1])
                if isinstance(arr, list):
                    return [str(x) for x in arr if x]
            except json.JSONDecodeError:
                pass
        # Fallback: split by lines/numbers
        lines = [l.strip("- *1234567890. ") for l in text.splitlines() if l.strip()]
        return lines[:5] if lines else [text]

    def _tier_for_task(self, description: str) -> str:
        """Heuristic to assign model tier based on task description."""
        desc_lower = description.lower()
        complex_keywords = ["analyze", "design", "architect", "review", "judge", "evaluate", "synthesize", "debug"]
        simple_keywords = ["list", "count", "format", "convert", "extract", "summarize briefly"]
        if any(k in desc_lower for k in complex_keywords):
            return "complex"
        if any(k in desc_lower for k in simple_keywords):
            return "simple"
        return "medium"

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    def _execute_subgoals(self, session: GoalSession, subgoals: List[SubGoal]) -> None:
        """Dispatch subgoals to workers."""
        for sg in subgoals:
            sg.status = "running"
            prompt = f"""You are a helpful worker. Complete the following task concisely.

Task: {sg.description}

Provide your result directly. Be specific and actionable.
"""
            tid = self.worker_pool.submit(
                prompt=prompt,
                model_tier=sg.assigned_tier,
                priority=TaskPriority.NORMAL,
                timeout=60.0,
                context={"session_id": session.id, "subgoal_id": sg.id},
            )
            # Store mapping so we can correlate later
            sg._task_id = tid
            logger.info(f"[{session.id}] Dispatched {sg.id} -> {tid} ({sg.assigned_tier})")

        # Wait for all to complete (with timeout)
        for sg in subgoals:
            if hasattr(sg, "_task_id"):
                task = self.worker_pool.wait(sg._task_id, max_wait=90.0)
                if task:
                    if task.status.name == "COMPLETED":
                        sg.status = "completed"
                        sg.result = task.result
                    else:
                        sg.status = "failed"
                        sg.result = task.error or "unknown error"
                else:
                    sg.status = "failed"
                    sg.result = "worker timeout"

        session.history.append({
            "turn": session.turn,
            "action": "execute",
            "results": [{"id": sg.id, "status": sg.status, "result": sg.result} for sg in subgoals],
        })

    # ------------------------------------------------------------------
    # Judge
    # ------------------------------------------------------------------

    def _judge(self, session: GoalSession) -> Dict[str, Any]:
        """Ask judge model if the goal is complete."""
        results_text = "\n\n".join(
            f"SubGoal {sg.id}: {sg.description}\nResult: {sg.result}"
            for sg in session.subgoals
        )
        prompt = f"""You are a strict judge. Review the following subgoal results against the original goal.

Original Goal: {session.original_goal}

SubGoal Results:
{results_text}

Is the original goal fully achieved? Respond with JSON only:
{{
  "complete": true/false,
  "summary": "brief summary of what was accomplished",
  "additional_subgoals": ["only if incomplete — list 1-2 more subgoals needed"]
}}
"""
        logger.info(f"[{session.id}] Judging completion...")
        tid = self.worker_pool.submit(
            prompt=prompt,
            model_tier="complex",
            priority=TaskPriority.HIGH,
            timeout=90.0,
            context={"session_id": session.id, "phase": "judge"},
        )
        task = self.worker_pool.wait(tid, max_wait=120.0)
        if task and task.status.name == "COMPLETED" and task.result:
            verdict = self._parse_judge_verdict(task.result)
            logger.info(f"[{session.id}] Judge verdict: complete={verdict.get('complete')}")
            return verdict
        logger.warning(f"[{session.id}] Judge task failed, assuming incomplete")
        return {"complete": False, "summary": "", "additional_subgoals": []}

    def _parse_judge_verdict(self, text: str) -> Dict[str, Any]:
        """Parse judge JSON response."""
        text = text.strip()
        # Extract JSON object
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end+1])
            except json.JSONDecodeError:
                pass
        # Heuristic fallback
        complete = "true" in text.lower() and "false" not in text.lower().split("true")[-1][:20]
        return {"complete": complete, "summary": text[:200], "additional_subgoals": []}

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def get_session(self, session_id: str) -> Optional[GoalSession]:
        return self._sessions.get(session_id)

    def list_sessions(self) -> List[GoalSession]:
        return list(self._sessions.values())
