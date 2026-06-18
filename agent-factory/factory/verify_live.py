"""Proof harness for the live model-call path.

Starts the local OpenAI-compatible mock server, points BOTH provider paths
(local + openrouter-style) at it, and asserts the router makes a REAL HTTP call,
returns mode="live", and accounts cost from the endpoint's reported `usage`
tokens — all offline, no key, no spend.

Run:  python -m factory.verify_live
Exit: 0 = live path proven, 1 = failure.
"""
from __future__ import annotations

import os
import sys

from . import mockmodel, router


def _check(name: str, cond: bool, detail: str = "") -> bool:
    print(f"  [{'PASS' if cond else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
    return cond


def main() -> int:
    port = 18434
    httpd, _ = mockmodel.serve_in_thread(port)
    base = f"http://127.0.0.1:{port}/v1"
    print(f"mock model up on {base}\n")

    # Wire the env the router reads (process env wins in load_env()).
    os.environ["FACTORY_ALLOW_LIVE_CALLS"] = "1"
    os.environ["LOCAL_MODEL_URL"] = base
    os.environ["OPENROUTER_BASE_URL"] = base
    os.environ["OPENROUTER_API_KEY"] = "sk-mock-test-key"

    ok = True
    try:
        # Low complexity -> local-triage tier (provider 'local').
        print("Test 1: low-complexity task routes to local tier, live call")
        r1 = router.route_and_run("triage this simple item", complexity=0.2)
        ok &= _check("tier is local-triage", r1.tier == "local-triage", r1.tier)
        ok &= _check("mode is live (real HTTP)", r1.mode == "live", r1.mode)
        ok &= _check("response came from mock", "MOCK-LIVE" in r1.text)
        ok &= _check("usage tokens recorded", r1.input_tokens > 0 and r1.output_tokens > 0,
                     f"in={r1.input_tokens} out={r1.output_tokens}")

        # High complexity -> escalates to a paid (openrouter) tier; cost > 0.
        print("\nTest 2: high-complexity task escalates to paid tier, live call, cost>0")
        r2 = router.route_and_run("complex multi-step reasoning task " * 5, complexity=0.9)
        ok &= _check("provider is openrouter", r2.provider == "openrouter", r2.tier)
        ok &= _check("mode is live (real HTTP)", r2.mode == "live", r2.mode)
        ok &= _check("cost computed from usage > 0", r2.cost_usd > 0, f"${r2.cost_usd}")

        # Safety: with the switch OFF, the very same call must NOT go live.
        print("\nTest 3: safety switch OFF forces stub even with endpoints present")
        os.environ["FACTORY_ALLOW_LIVE_CALLS"] = ""
        r3 = router.route_and_run("triage this simple item", complexity=0.2)
        ok &= _check("mode falls back to stub", r3.mode == "stub", r3.mode)
    finally:
        httpd.shutdown()

    print("\n" + ("LIVE PATH PROVEN ✅" if ok else "LIVE PATH FAILED ❌"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
