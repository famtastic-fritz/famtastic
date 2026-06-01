#!/usr/bin/env python3
"""
test_cost_meter.py — B1: cost telemetry wired into the routing path.

Verifies, with no network calls:
  1. CostMeter records a non-zero estimated $-cost for a priced cloud route.
  2. Local (ollama) routes record $0.
  3. The low-funds NOTIFY is OFF by default ($0 threshold) and fires exactly
     once when a configured soft threshold is crossed — and never caps/blocks.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from swarm import CostMeter


def test_cloud_route_records_cost():
    meter = CostMeter(notify_usd=0.0)
    # Large prompt/output so even cheap models estimate a measurable cost.
    amt = meter.record("claude", "x" * 40000, "y" * 40000)
    assert amt > 0.0, "priced cloud route should record a positive $-cost"
    snap = meter.snapshot()
    assert snap["calls"] == 1
    assert snap["total_usd"] > 0.0
    assert "claude" in snap["by_brain"]


def test_local_route_is_free():
    meter = CostMeter(notify_usd=0.0)
    amt = meter.record("ollama", "x" * 40000, "y" * 40000)
    assert amt == 0.0, "local ollama route must record $0"
    assert meter.snapshot()["total_usd"] == 0.0


def test_notify_off_by_default():
    meter = CostMeter()  # default threshold 0 == disabled
    for _ in range(5):
        meter.record("claude", "x" * 40000, "y" * 40000)
    snap = meter.snapshot()
    assert snap["notify_usd"] == 0.0
    assert snap["notified"] is False, "no NOTIFY should fire when threshold is 0"


def test_notify_fires_once_and_never_caps():
    fired = []

    def cb(total, threshold):
        fired.append((total, threshold))

    # Tiny threshold so the first sizeable call crosses it.
    meter = CostMeter(notify_usd=0.0001, notify_cb=cb)
    a1 = meter.record("claude", "x" * 40000, "y" * 40000)
    a2 = meter.record("claude", "x" * 40000, "y" * 40000)
    a3 = meter.record("claude", "x" * 40000, "y" * 40000)

    # Calls always return their cost — nothing is ever blocked/zeroed (no cap).
    assert a1 > 0 and a2 > 0 and a3 > 0
    assert meter.snapshot()["total_usd"] == a1 + a2 + a3
    # NOTIFY fires exactly once even though the threshold stays crossed.
    assert len(fired) == 1, f"expected exactly one NOTIFY, got {len(fired)}"
    assert fired[0][0] >= 0.0001


if __name__ == "__main__":
    test_cloud_route_records_cost()
    test_local_route_is_free()
    test_notify_off_by_default()
    test_notify_fires_once_and_never_caps()
    print("B1 cost-meter tests passed")
