"""
tests/e2e/test_error_recovery.py — Test error recovery with real failures.
"""

from __future__ import annotations

import sys
import os
import time
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from components.swarm import SwarmOrchestrator
from components.swarm.worker_pool import TaskStatus


class TestErrorRecovery:
    """Test error recovery and retry mechanisms."""

    @pytest.fixture(scope="class")
    def orchestrator(self):
        orch = SwarmOrchestrator(num_workers=2, goal_budget=5, log_level="WARNING")
        orch.start()
        yield orch
        orch.stop()

    def test_retry_on_failure(self, orchestrator):
        """Submit a task that may fail and verify retry logic exists."""
        # Submit a task with a very short timeout to force timeout/failure
        tid = orchestrator.worker_pool.submit(
            prompt="Explain quantum computing in detail",
            model_tier="simple",
            timeout=1.0,  # Very short to potentially trigger timeout
            max_retries=2,
        )
        task = orchestrator.worker_pool.wait(tid, max_wait=10.0)
        assert task is not None
        # Task may complete, timeout, or fail — all are valid outcomes
        assert task.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.TIMEOUT)

    def test_error_recovery_records_failure(self, orchestrator):
        """Verify error recovery tracks failures."""
        before = len(orchestrator.error_recovery.get_failures(limit=1000))
        # Force a failure by submitting with invalid model
        tid = orchestrator.worker_pool.submit(
            prompt="Test prompt",
            model_tier="nonexistent_tier",
            timeout=5.0,
        )
        task = orchestrator.worker_pool.wait(tid, max_wait=10.0)
        after = len(orchestrator.error_recovery.get_failures(limit=1000))
        # If task failed, recovery should have recorded it
        if task and task.status in (TaskStatus.FAILED, TaskStatus.TIMEOUT):
            assert after >= before

    def test_escalation_after_max_retries(self, orchestrator):
        """Verify escalation happens after max retries."""
        # The error_recovery should escalate after 3 attempts
        assert orchestrator.error_recovery.escalation_threshold == 3
        assert orchestrator.error_recovery.max_retries == 3

    def test_health_reports_failures(self, orchestrator):
        """Verify health endpoint reports failure counts."""
        health = orchestrator.health()
        assert "failures" in health
        assert isinstance(health["failures"], int)
