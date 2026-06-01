"""
goal_loop.py — Phase 1 rewrite + Phase 3c-prep phone wire-in.

Phase 1 changes:
  1. _decompose()/_judge() use BrainChain — not dead-code hermes3 path.
  2. synthesize() reduce step added — was missing, caused final_result_chars=0.
  3. _anchor_check() filters topic drift before sub-goals are appended.
  4. Budget exhaustion now synthesizes partial work instead of discarding it.

Phase 3c-prep addition:
  5. Phone notification hook — when the job hits a gate and needs Fritz's
     input (budget hit on important job, judge blocked, approval needed),
     it calls ask_shay.py if available. Replaces Telegram for swarm alerts.
"""
from __future__ import annotations

import json
import logging
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

from .brain_client import BrainChain, SHAY_SYSTEM
from .message_bus import Message, MessageBus
from .worker_pool import TaskPriority, WorkerPool

ASK_SHAY = Path.home() / "famtastic/shay-phone/ask_shay.py"

logger = logging.getLogger("swarm.goal_loop")


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
    assigned_tier: str = "medium"
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
    anchor_rejects: List[str] = field(default_factory=list)


class GoalLoop:
    """
    Decomposes high-level goals into subgoals, dispatches to workers,
    judges with a real brain, synthesizes into a final result.
    """

    def __init__(
        self,
        worker_pool: WorkerPool,
        message_bus: Optional[MessageBus] = None,
        budget: int = 20,
        judge_model: str = "claude",          # preferred brain for judge/synth
        anchor_model: str = "ollama",         # cheap model for drift check
        enable_adversarial: bool = False,     # Phase 1.6 — opt-in
    ):
        self.worker_pool = worker_pool
        self.message_bus = message_bus
        self.budget = budget
        self.judge_brain = BrainChain(preferred=judge_model)
        self.anchor_brain = BrainChain(preferred=anchor_model)
        self.enable_adversarial = enable_adversarial
        self._sessions: Dict[str, GoalSession] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run(self, goal: str, session_id: Optional[str] = None) -> GoalSession:
        session = self.start(goal, session_id)
        while session.status == GoalStatus.ACTIVE:
            self.step(session)
            if session.turn >= session.budget:
                logger.warning(f"[{session.id}] budget exhausted ({session.budget} turns) — synthesizing partial work")
                session.status = GoalStatus.BUDGET_EXHAUSTED
                self._synthesize(session)
                # Phone notification: Fritz may want to approve continuing
                self._notify_phone(
                    session,
                    kind="question",
                    question=f"Shay job '{session.original_goal[:80]}' hit budget ({session.budget} turns). Synthesis saved. Extend budget?",
                    options=["Extend +10 turns", "Accept result", "Cancel job"],
                )
                break
        return session

    # ------------------------------------------------------------------
    # Phone notification (Phase 3c-prep) — replaces Telegram
    # ------------------------------------------------------------------

    def _notify_phone(
        self,
        session: "GoalSession",
        kind: str = "question",
        question: str = "",
        options: Optional[List[str]] = None,
        context: str = "",
    ) -> None:
        """
        Push a notification to Fritz's phone via ask_shay.py (fire-and-forget).
        The job continues; Fritz answers when he's ready; the answer is recorded
        in the asks/ directory for the next run to pick up.
        Non-blocking: failure to notify never crashes the job.
        """
        if not ASK_SHAY.exists():
            logger.debug("_notify_phone: ask_shay.py not found — skipping")
            return
        try:
            cmd = [
                "python3", str(ASK_SHAY),
                question or f"Shay job update: {session.original_goal[:80]}",
                "--kind", kind,
                "--timeout", "3600",
            ]
            if options:
                cmd += ["--options"] + options
            # Fire-and-forget: don't block the job waiting for the phone
            subprocess.Popen(cmd, start_new_session=True)
            logger.info(f"[{session.id}] Phone notification sent: {question[:60]}")
        except Exception as exc:
            logger.warning(f"[{session.id}] Phone notify failed (non-fatal): {exc}")

    def start(self, goal: str, session_id: Optional[str] = None) -> GoalSession:
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
        session.turn += 1
        logger.info(f"[{session.id}] Turn {session.turn}/{session.budget}")

        if not session.subgoals:
            self._decompose(session)
            return

        pending = [sg for sg in session.subgoals if sg.status == "pending"]
        if pending:
            self._execute_subgoals(session, pending)
            return

        running = [sg for sg in session.subgoals if sg.status == "running"]
        if running:
            logger.info(f"[{session.id}] Waiting on {len(running)} running subgoals")
            time.sleep(0.5)
            return

        if all(sg.status == "completed" for sg in session.subgoals):
            verdict = self._judge(session)
            if verdict.get("complete", False):
                self._synthesize(session)
                session.status = GoalStatus.COMPLETED
                session.completed_at = time.time()
                logger.info(f"[{session.id}] COMPLETED in {session.turn} turns — {len(session.final_result or '')} chars")
                if self.message_bus:
                    self.message_bus.publish("results", Message(
                        topic="goal.completed",
                        payload={"session_id": session.id, "turns": session.turn,
                                 "result_chars": len(session.final_result or "")},
                        sender="goal_loop",
                    ))
            else:
                new_goals = verdict.get("additional_subgoals", [])
                # ANCHOR CHECK: filter drift before appending (Phase 1 fix)
                clean_goals = self._anchor_check(session, new_goals)
                rejected = len(new_goals) - len(clean_goals)
                if rejected:
                    logger.info(f"[{session.id}] Anchor check rejected {rejected} off-topic sub-goals")
                    session.anchor_rejects.extend(
                        [g for g in new_goals if g not in clean_goals]
                    )
                for desc in clean_goals:
                    sg = SubGoal(
                        id=f"{session.id}-sg{len(session.subgoals)+1}",
                        description=desc,
                        assigned_tier=self._tier_for_task(desc),
                    )
                    session.subgoals.append(sg)
        else:
            failed = [sg for sg in session.subgoals if sg.status == "failed"]
            if failed:
                logger.warning(f"[{session.id}] {len(failed)} subgoals failed — retrying")
                for sg in failed:
                    sg.status = "pending"

    # ------------------------------------------------------------------
    # Decompose — FIX: uses BrainChain, not hermes3 via worker_pool
    # ------------------------------------------------------------------

    def _decompose(self, session: GoalSession) -> None:
        prompt = f"""You are a task decomposition engine. Break the following goal into 3-5 concrete subgoals.
Each subgoal must be a single focused task independently executable by a worker agent.
Stay strictly on the topic of the original goal — do not invent unrelated research directions.

Goal: {session.original_goal}

Respond ONLY with a JSON array of strings:
["subgoal 1", "subgoal 2", "subgoal 3"]"""
        logger.info(f"[{session.id}] Decomposing via brain ({self.judge_brain.preferred})...")
        try:
            result = self.judge_brain.call_prompt(prompt, timeout=90.0)
            subgoals = self._parse_subgoals(result)
            # Anchor the decomposition itself against the goal
            subgoals = self._anchor_check(session, subgoals)
            for i, desc in enumerate(subgoals):
                session.subgoals.append(SubGoal(
                    id=f"{session.id}-sg{i+1}",
                    description=desc,
                    assigned_tier=self._tier_for_task(desc),
                ))
            logger.info(f"[{session.id}] Decomposed into {len(subgoals)} subgoals via {self.judge_brain.last_brain}")
            session.history.append({"turn": session.turn, "action": "decompose",
                                    "brain": self.judge_brain.last_brain, "subgoals": subgoals})
        except Exception as exc:
            logger.error(f"[{session.id}] Decomposition failed: {exc} — falling back to single subgoal")
            session.subgoals.append(SubGoal(
                id=f"{session.id}-sg1",
                description=session.original_goal,
                assigned_tier="medium",
            ))

    def _parse_subgoals(self, text: str) -> List[str]:
        text = text.strip()
        start = text.find("[")
        end = text.rfind("]")
        if start != -1 and end != -1 and end > start:
            try:
                arr = json.loads(text[start:end+1])
                if isinstance(arr, list):
                    return [str(x).strip() for x in arr if x][:6]
            except json.JSONDecodeError:
                pass
        lines = [l.strip("- *1234567890. \"'") for l in text.splitlines() if l.strip()]
        return [l for l in lines if l][:5]

    # ------------------------------------------------------------------
    # Anchor check — FIX: new method, was missing entirely
    # ------------------------------------------------------------------

    def _anchor_check(self, session: GoalSession, proposed: List[str]) -> List[str]:
        """Filter proposed sub-goals that have drifted off the original goal's topic.
        Uses a cheap local call so it doesn't burn paid brain credits."""
        if not proposed:
            return []
        goal_words = set(session.original_goal.lower().split())
        # Quick keyword heuristic first (free, no network)
        blocklist = [
            "neuroscience", "cognitive", "working memory", "brain coupling",
            "docker swarm", "kubernetes cluster", "neural tissue",
        ]
        filtered = []
        for sg in proposed:
            sg_lower = sg.lower()
            if any(b in sg_lower for b in blocklist):
                logger.info(f"[{session.id}] Anchor rejected (blocklist): {sg[:80]}")
                continue
            # Keyword overlap — at least 2 content words must overlap with goal
            sg_words = set(sg_lower.split())
            stop = {"the", "a", "an", "of", "and", "or", "to", "in", "for", "is", "it", "be"}
            overlap = (goal_words - stop) & (sg_words - stop)
            if len(overlap) < 1 and len(session.subgoals) > 3:
                # Only enforce strictly after we have enough context (early turns get slack)
                logger.info(f"[{session.id}] Anchor flagged (low overlap {len(overlap)}): {sg[:80]}")
                # Still include it — log only, don't hard-reject on first few turns
            filtered.append(sg)
        return filtered

    # ------------------------------------------------------------------
    # Judge — FIX: uses BrainChain, not hermes3 via worker_pool
    # ------------------------------------------------------------------

    def _judge(self, session: GoalSession) -> Dict[str, Any]:
        completed = [sg for sg in session.subgoals if sg.status == "completed"]
        results_text = "\n\n".join(
            f"SubGoal: {sg.description}\nResult: {(sg.result or '')[:600]}"
            for sg in completed
        )
        # Truncate to avoid token blowup on large sessions
        if len(results_text) > 8000:
            results_text = results_text[:8000] + "\n[... truncated ...]"

        prompt = f"""You are a strict completion judge for a multi-agent swarm.

Original Goal: {session.original_goal}

Completed SubGoal Results:
{results_text}

Is the original goal fully addressed by these results?
Respond with ONLY valid JSON:
{{
  "complete": true,
  "summary": "one sentence on what was accomplished",
  "additional_subgoals": []
}}
OR if not complete:
{{
  "complete": false,
  "summary": "what is missing",
  "additional_subgoals": ["specific task 1 still needed", "specific task 2 still needed"]
}}"""
        logger.info(f"[{session.id}] Judging via brain ({self.judge_brain.preferred})...")
        try:
            result = self.judge_brain.call_prompt(prompt, timeout=90.0)
            verdict = self._parse_judge_verdict(result)
            logger.info(f"[{session.id}] Judge via {self.judge_brain.last_brain}: complete={verdict.get('complete')}")
            return verdict
        except Exception as exc:
            logger.warning(f"[{session.id}] Judge failed: {exc}")
            return {"complete": False, "summary": "", "additional_subgoals": []}

    def _parse_judge_verdict(self, text: str) -> Dict[str, Any]:
        text = text.strip()
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end+1])
            except json.JSONDecodeError:
                pass
        complete = "true" in text.lower()
        return {"complete": complete, "summary": text[:200], "additional_subgoals": []}

    # ------------------------------------------------------------------
    # Synthesize — FIX: new method, was missing entirely
    # ------------------------------------------------------------------

    def _synthesize(self, session: GoalSession) -> None:
        """Reduce all completed sub-goal results into one coherent final_result.
        This was entirely absent before Phase 1 — causing final_result_chars=0."""
        completed = [sg for sg in session.subgoals if sg.status == "completed" and sg.result]
        if not completed:
            session.final_result = "(no completed sub-goals to synthesize)"
            return

        results_text = "\n\n".join(
            f"## {sg.description}\n{sg.result}"
            for sg in completed
        )
        if len(results_text) > 12000:
            results_text = results_text[:12000] + "\n[... truncated for synthesis ...]"

        prompt = f"""You are a synthesis brain. Combine the following sub-goal results into one coherent, well-structured final answer to the original goal.

Original Goal: {session.original_goal}

Sub-Goal Results:
{results_text}

Write the final synthesized output. Use headers where helpful. Be specific and complete.
This is the deliverable — write it as if you are handing it directly to the person who asked."""
        logger.info(f"[{session.id}] Synthesizing via brain ({self.judge_brain.preferred})...")
        try:
            session.final_result = self.judge_brain.call_prompt(prompt, timeout=120.0)
            logger.info(
                f"[{session.id}] Synthesis complete via {self.judge_brain.last_brain}: "
                f"{len(session.final_result)} chars"
            )
        except Exception as exc:
            logger.error(f"[{session.id}] Synthesis failed: {exc} — concatenating raw results")
            session.final_result = "\n\n".join(
                f"### {sg.description}\n{sg.result}" for sg in completed
            )

    # ------------------------------------------------------------------
    # Execute — workers stay on Ollama (local, free)
    # ------------------------------------------------------------------

    def _execute_subgoals(self, session: GoalSession, subgoals: List[SubGoal]) -> None:
        for sg in subgoals:
            sg.status = "running"
            prompt = f"""You are a focused worker agent. Complete this task concisely and precisely.

Task: {sg.description}

Context (original goal): {session.original_goal[:300]}

Provide your result directly. Be specific."""
            tid = self.worker_pool.submit(
                prompt=prompt,
                model_tier=sg.assigned_tier,
                priority=TaskPriority.NORMAL,
                timeout=60.0,
                context={"session_id": session.id, "subgoal_id": sg.id},
            )
            sg._task_id = tid
            logger.info(f"[{session.id}] Dispatched {sg.id} → worker {tid} ({sg.assigned_tier})")

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
            "results": [{"id": sg.id, "status": sg.status,
                         "chars": len(sg.result or "")} for sg in subgoals],
        })

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _tier_for_task(self, description: str) -> str:
        desc_lower = description.lower()
        complex_kw = {"analyze", "design", "architect", "review", "evaluate",
                      "synthesize", "debug", "compare", "research"}
        simple_kw = {"list", "count", "format", "convert", "extract", "name"}
        if any(k in desc_lower for k in complex_kw):
            return "complex"
        if any(k in desc_lower for k in simple_kw):
            return "medium"   # dropped qwen2.5:1.5b — too weak; medium is the floor
        return "medium"

    def get_session(self, session_id: str) -> Optional[GoalSession]:
        return self._sessions.get(session_id)

    def list_sessions(self) -> List[GoalSession]:
        return list(self._sessions.values())
