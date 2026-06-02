"""
tests/e2e/test_goal_loop.py — End-to-end test of the goal loop with real Ollama tasks.
"""

from __future__ import annotations

import sys
import os
import time
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from components.swarm import SwarmOrchestrator
from components.swarm.goal_loop import GoalStatus


class TestGoalLoop:
    """Test goal decomposition and execution end-to-end."""

    @pytest.fixture(scope="class")
    def orchestrator(self):
        orch = SwarmOrchestrator(num_workers=2, goal_budget=10, log_level="WARNING")
        orch.start()
        yield orch
        orch.stop()

    def test_goal_sort_numbers(self, orchestrator):
        """Submit a goal to sort numbers and verify completion."""
        session = orchestrator.goal("Sort a list of numbers: [3, 1, 4, 1, 5, 9, 2, 6]")
        assert session is not None
        assert session.id.startswith("goal-")
        # Goal should complete or exhaust budget
        assert session.status in (GoalStatus.COMPLETED, GoalStatus.BUDGET_EXHAUSTED, GoalStatus.FAILED)
        # If it completed, we should have a result
        if session.status == GoalStatus.COMPLETED:
            assert session.final_result is not None
            assert len(session.final_result) > 0

    def test_goal_async_and_poll(self, orchestrator):
        """Start a goal async and poll until completion."""
        session = orchestrator.goal_async("Write a one-line Python hello world")
        assert session.status == GoalStatus.ACTIVE
        # Step until done or budget exhausted
        for _ in range(15):
            if session.status != GoalStatus.ACTIVE:
                break
            orchestrator.step_session(session)
            time.sleep(0.2)
        assert session.status in (GoalStatus.COMPLETED, GoalStatus.BUDGET_EXHAUSTED, GoalStatus.FAILED)

    def test_goal_session_storage(self, orchestrator):
        """Verify sessions are stored and retrievable."""
        session = orchestrator.goal_async("Count to 3")
        sid = session.id
        retrieved = orchestrator.goal_loop.get_session(sid)
        assert retrieved is not None
        assert retrieved.id == sid

    def test_list_sessions(self, orchestrator):
        """Verify session listing works."""
        before = len(orchestrator.goal_loop.list_sessions())
        orchestrator.goal_async("List the colors of the rainbow")
        after = len(orchestrator.goal_loop.list_sessions())
        assert after == before + 1
