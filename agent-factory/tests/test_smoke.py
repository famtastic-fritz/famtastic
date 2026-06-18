#!/usr/bin/env python3
"""Self-contained smoke test for the agent factory. No pytest required.

    python3 tests/test_smoke.py

Verifies the full loop: seed -> orchestrate (spawn real workers) -> complete ->
route by cost -> ledger -> self-improve (within guardrails) -> artifacts on disk.
"""
import json
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from src import db, ledger, queue, router  # noqa: E402
from src.orchestrator import Orchestrator  # noqa: E402
import seed_tasks  # noqa: E402


class TestFactory(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db.reset()
        seed_tasks.seed_proof()
        seed_tasks.seed_burst(4)
        cls.orch = Orchestrator()
        cls.orch.run(max_batches=2)

    def test_all_tasks_completed(self):
        snap = queue.snapshot()
        self.assertEqual(snap.get("queued", 0), 0, "queue should be drained")
        self.assertGreaterEqual(snap.get("done", 0), 10)
        self.assertEqual(snap.get("failed", 0), 0, "no task should fail")

    def test_cost_tracked_and_offline(self):
        total = ledger.total()
        self.assertGreater(total["usd"], 0, "ledger should record estimated cost")
        self.assertGreater(total["calls"], 0)
        self.assertFalse(router.live_enabled(), "must be offline/stubbed in tests")

    def test_routing_used_multiple_tiers(self):
        models = {r["model"] for r in ledger.by_model()}
        # The proof wave spans low->high complexity, so >1 tier must be exercised.
        self.assertGreaterEqual(len(models), 2, f"expected multiple model tiers, got {models}")

    def test_deliverable_artifacts_exist(self):
        expected = [
            "business-model.md", "claude-code-prompt-builder.md", "prompt_builder.py",
            "shay-shay-v2-spec.md", "agent-inspiration-synthesis.md",
            "odysseus-optimization.md", "system-improvement-audit.md",
        ]
        for name in expected:
            path = os.path.join(ROOT, "deliverables", name)
            self.assertTrue(os.path.exists(path), f"missing artifact: {name}")
            self.assertGreater(os.path.getsize(path), 200, f"artifact too small: {name}")

    def test_config_within_guardrails(self):
        with open(os.path.join(ROOT, "config.json"), encoding="utf-8") as fh:
            cfg = json.load(fh)
        g = cfg["config_guardrails"]
        self.assertGreaterEqual(cfg["max_concurrency"], g["max_concurrency"][0])
        self.assertLessEqual(cfg["max_concurrency"], g["max_concurrency"][1])
        et = cfg["routing"]["escalate_threshold"]
        self.assertGreaterEqual(et, g["routing.escalate_threshold"][0])
        self.assertLessEqual(et, g["routing.escalate_threshold"][1])


if __name__ == "__main__":
    unittest.main(verbosity=2)
