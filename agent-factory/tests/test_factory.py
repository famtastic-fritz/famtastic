"""test_factory.py — invariant tests for the agent factory.

Pure stdlib unittest, no third-party deps. Every test redirects core's paths to
a throwaway temp dir, so running the suite never touches the real DB, config,
logs, ledger, or minted workers (SANDBOX-safe).

Run:  .venv/bin/python -m unittest discover -s tests -v
  or:  .venv/bin/python tests/test_factory.py
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

# Make the factory root importable when run from tests/.
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import core
import factory
import models
import router
import self_improve
import task_queue

BASE_CONFIG = {
    "version": 1,
    "concurrency": 2,
    "bounds": {
        "concurrency": [1, 6],
        "complexity_threshold": [0.25, 0.85],
        "poll_interval_seconds": [1, 10],
    },
    "idle_retire_seconds": 4,
    "poll_interval_seconds": 2,
    "batch_size": 8,
    "routing": {
        "complexity_threshold": 0.55,
        "escalate_on_low_confidence": True,
        "triage_model": "triage-cheap",
        "default_model": "worker-mid",
        "escalation_model": "worker-strong",
    },
    "targets": {"min_success_rate": 0.9, "max_avg_cost_usd": 0.02},
    "tuning_history": [],
}


class FactoryTestBase(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        d = Path(self.tmp.name)
        # Redirect every core path into the temp sandbox.
        core.DATA_DIR = d / "data"
        core.LOGS_DIR = d / "logs"
        core.WORKERS_DIR = d / "workers"
        core.DASH_DIR = d / "dashboard"
        core.DB_PATH = core.DATA_DIR / "factory.db"
        core.STATE_PATH = core.DATA_DIR / "state.json"
        core.CONFIG_PATH = d / "config.json"
        core.ORCH_LOG = core.LOGS_DIR / "ORCHESTRATOR.log"
        core.COSTS_LOG = d / "COSTS.log"
        core.LEARNINGS = d / "LEARNINGS.md"
        core.ensure_dirs()
        core.save_config(json.loads(json.dumps(BASE_CONFIG)))
        task_queue.init_db()

    def tearDown(self) -> None:
        self.tmp.cleanup()


class TestRoutingAndCost(FactoryTestBase):
    def test_cheap_kind_stays_default_tier(self):
        cfg = core.load_config()
        r = router.route({"kind": "triage", "prompt": "Sort this ticket"}, cfg)
        self.assertFalse(r["escalated"])
        self.assertEqual(r["model"], "worker-mid")

    def test_hard_kind_escalates_to_strong(self):
        cfg = core.load_config()
        r = router.route(
            {"kind": "codegen",
             "prompt": "Refactor a callback-pyramid into async/await with error handling"},
            cfg,
        )
        self.assertTrue(r["escalated"])
        self.assertEqual(r["model"], "worker-strong")

    def test_threshold_controls_escalation(self):
        # Raising the bar above any score must prevent escalation.
        cfg = core.load_config()
        cfg["routing"]["complexity_threshold"] = 0.99
        r = router.route({"kind": "research", "prompt": "Investigate root cause"}, cfg)
        self.assertFalse(r["escalated"])

    def test_complexity_orders_kinds(self):
        triage = router.estimate_complexity("triage", "x")
        codegen = router.estimate_complexity("codegen", "x")
        self.assertLess(triage, codegen)

    def test_cost_math_matches_price_table(self):
        m = models.MODELS["worker-strong"]
        expected = (1000 / 1_000_000) * m["price_in"] + (500 / 1_000_000) * m["price_out"]
        self.assertAlmostEqual(models.cost_usd("worker-strong", 1000, 500), expected, places=10)

    def test_stub_call_is_deterministic_and_offline(self):
        a = models.call("worker-mid", "same prompt", task_kind="summarize")
        b = models.call("worker-mid", "same prompt", task_kind="summarize")
        self.assertTrue(a["stubbed"])
        self.assertEqual((a["tokens_in"], a["tokens_out"]), (b["tokens_in"], b["tokens_out"]))
        self.assertGreater(a["cost_usd"], 0)

    def test_route_records_two_hops_triage_then_work(self):
        cfg = core.load_config()
        r = router.route({"kind": "summarize", "prompt": "Condense this"}, cfg)
        stages = [h["stage"] for h in r["hops"]]
        self.assertEqual(stages, ["triage", "work"])
        # cheap triage model is always the first hop
        self.assertEqual(r["hops"][0]["model"], "triage-cheap")


class TestQueue(FactoryTestBase):
    def test_atomic_claim_never_double_grabs(self):
        ids = {task_queue.enqueue("triage", f"t{i}", 5) for i in range(10)}
        claimed = []
        while True:
            t = task_queue.claim_next("W-x", 1)
            if t is None:
                break
            claimed.append(t["id"])
        # every task claimed exactly once, nothing invented
        self.assertEqual(len(claimed), 10)
        self.assertEqual(set(claimed), ids)
        self.assertEqual(len(set(claimed)), len(claimed))

    def test_priority_order(self):
        low = task_queue.enqueue("research", "low prio", 9)
        high = task_queue.enqueue("triage", "high prio", 1)
        first = task_queue.claim_next("W-x", 1)
        self.assertEqual(first["id"], high)
        self.assertNotEqual(first["id"], low)

    def test_complete_updates_stats(self):
        tid = task_queue.enqueue("summarize", "x", 5)
        task_queue.claim_next("W-x", 7)
        task_queue.complete(tid, model_used="worker-mid", result="ok",
                            cost_usd=0.001, tokens_in=10, tokens_out=20,
                            latency_ms=50, complexity=0.4)
        stats = task_queue.batch_stats(7)
        self.assertEqual(stats["completed"], 1)
        self.assertEqual(stats["failed"], 0)
        self.assertEqual(stats["success_rate"], 1.0)
        self.assertAlmostEqual(stats["total_cost_usd"], 0.001, places=6)

    def test_failed_task_lowers_success_rate(self):
        a = task_queue.enqueue("triage", "ok", 5)
        b = task_queue.enqueue("triage", "bad", 5)
        task_queue.claim_next("W-x", 3)
        task_queue.claim_next("W-y", 3)
        task_queue.complete(a, model_used="worker-mid", result="ok", cost_usd=0.001,
                            tokens_in=1, tokens_out=1, latency_ms=1, complexity=0.1)
        task_queue.fail(b, "boom")
        stats = task_queue.batch_stats(3)
        self.assertEqual(stats["completed"], 1)
        self.assertEqual(stats["failed"], 1)
        self.assertEqual(stats["success_rate"], 0.5)


class TestMinting(FactoryTestBase):
    def test_mint_substitutes_kind_and_is_valid_python(self):
        path = factory.mint_worker("research")
        self.assertTrue(path.exists())
        src = path.read_text(encoding="utf-8")
        self.assertIn('WORKER_KIND = "research"', src)
        self.assertNotIn("__WORKER_KIND__", src)  # placeholder fully replaced
        compile(src, str(path), "exec")  # must be syntactically valid

    def test_mint_is_idempotent(self):
        p1 = factory.mint_worker("triage")
        mtime1 = p1.stat().st_mtime_ns
        p2 = factory.mint_worker("triage")  # should reuse, not rewrite
        self.assertEqual(p1, p2)
        self.assertEqual(mtime1, p2.stat().st_mtime_ns)

    def test_retire_removes_module_but_not_template(self):
        factory.mint_worker("codegen")
        self.assertIn("worker_codegen.py", factory.list_minted())
        self.assertTrue(factory.retire_minted("codegen"))
        self.assertNotIn("worker_codegen.py", factory.list_minted())
        # the source template is never touched
        self.assertTrue(factory.TEMPLATE.exists())
        self.assertFalse(factory.retire_minted("codegen"))  # already gone


class TestSelfImprovement(FactoryTestBase):
    def _seed_done_batch(self, batch, n, cost_each, fail=0):
        for i in range(n):
            tid = task_queue.enqueue("summarize", f"x{i}", 5)
            task_queue.claim_next("W", batch)
            task_queue.complete(tid, model_used="worker-mid", result="ok",
                                cost_usd=cost_each, tokens_in=10, tokens_out=20,
                                latency_ms=40, complexity=0.4)
        for j in range(fail):
            tid = task_queue.enqueue("summarize", f"f{j}", 5)
            task_queue.claim_next("W", batch)
            task_queue.fail(tid, "boom")

    def test_tuning_stays_within_bounds(self):
        # Drive many cheap successful batches; concurrency must never exceed max.
        for b in range(1, 12):
            self._seed_done_batch(b, 3, 0.0001)
            # keep backlog deep so it keeps trying to scale up
            for _ in range(10):
                task_queue.enqueue("summarize", "backlog", 5)
            self_improve.review_and_tune(b)
        cfg = core.load_config()
        lo, hi = cfg["bounds"]["concurrency"]
        self.assertLessEqual(cfg["concurrency"], hi)
        self.assertGreaterEqual(cfg["concurrency"], lo)
        tlo, thi = cfg["bounds"]["complexity_threshold"]
        self.assertTrue(tlo <= cfg["routing"]["complexity_threshold"] <= thi)

    def test_high_cost_raises_escalation_bar(self):
        before = core.load_config()["routing"]["complexity_threshold"]
        self._seed_done_batch(1, 4, cost_each=0.05)  # well over max_avg_cost_usd
        entry = self_improve.review_and_tune(1)
        after = core.load_config()["routing"]["complexity_threshold"]
        self.assertGreater(after, before)  # escalate LESS when costs run hot
        self.assertTrue(any("raise escalation" in r for r in entry["reasons"]))

    def test_degraded_success_backs_off_concurrency(self):
        start = core.load_config()
        start["concurrency"] = 4
        core.save_config(start)
        self._seed_done_batch(1, 1, 0.001, fail=4)  # 20% success
        self_improve.review_and_tune(1)
        self.assertLess(core.load_config()["concurrency"], 4)

    def test_history_and_learnings_recorded(self):
        self._seed_done_batch(1, 2, 0.001)
        self_improve.review_and_tune(1)
        cfg = core.load_config()
        self.assertEqual(len(cfg["tuning_history"]), 1)
        self.assertTrue(core.LEARNINGS.exists())
        self.assertIn("Batch 1", core.LEARNINGS.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
