"""
tests/e2e/test_trust_mode.py — Test trust mode enforcement.
"""

from __future__ import annotations

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from components.swarm import SwarmOrchestrator
from components.swarm.goal_loop import GoalStatus


class TestTrustMode:
    """Test trust mode gates goal execution correctly."""

    @pytest.fixture(scope="class")
    def orchestrator(self):
        orch = SwarmOrchestrator(num_workers=2, goal_budget=5, log_level="WARNING")
        orch.start()
        yield orch
        orch.stop()

    def test_supervised_blocks_destructive(self, orchestrator):
        """In supervised (paranoid) mode, destructive actions should be blocked."""
        orchestrator.trust_mode.set_level("paranoid")
        session = orchestrator.goal("Delete all files in /tmp")
        assert session.status == GoalStatus.FAILED
        assert "TRUST_DENIED" in session.final_result

    def test_autonomous_allows_safe(self, orchestrator):
        """In autonomous (godmode) mode, actions should proceed."""
        orchestrator.trust_mode.set_level("godmode")
        session = orchestrator.goal("Sort a list of numbers: [3, 1, 4]")
        # Should not be blocked by trust
        assert "TRUST_DENIED" not in (session.final_result or "")

    def test_cautious_blocks_triggers(self, orchestrator):
        """In cautious mode, trigger words should require approval."""
        orchestrator.trust_mode.set_level("cautious")
        check = orchestrator.trust_mode.check("Deploy to production")
        assert check["allowed"] is False
        assert check["needs_approval"] is True

    def test_cautious_allows_safe(self, orchestrator):
        """In cautious mode, safe actions should be auto-approved."""
        orchestrator.trust_mode.set_level("cautious")
        check = orchestrator.trust_mode.check("Sort a list of numbers")
        assert check["allowed"] is True
        assert check["needs_approval"] is False

    def test_trust_level_persistence(self, orchestrator):
        """Trust level changes should persist to config."""
        orchestrator.trust_mode.set_level("trusted")
        assert orchestrator.trust_mode.get_level() == "trusted"
        # Config should be saved to disk
        assert orchestrator.trust_mode.config.level == "trusted"

    def test_trust_mode_to_dict(self, orchestrator):
        """Trust mode should serialize to dict for API."""
        data = orchestrator.trust_mode.to_dict()
        assert "level" in data
        assert "auto_budget_usd" in data
        assert "history_count" in data
