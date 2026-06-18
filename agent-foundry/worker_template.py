"""WORKER TEMPLATE — the orchestrator mints concrete workers from this file.

Placeholders ({{WORKER_ID}}, {{MINTED_AT}}, {{SPECIALTY}}) are filled in when a
worker is minted into agents/worker_<id>.py. A minted worker is intentionally
thin: it claims/processes exactly one task via the shared factory_lib, reports a
JSON result on stdout, and exits. One-shot workers are the cheapest, most
crash-safe unit — if one dies, its task is requeued by the orchestrator.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Ensure the sandbox root is importable no matter where we're spawned from.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import factory_lib  # noqa: E402

WORKER_ID = "{{WORKER_ID}}"
MINTED_AT = "{{MINTED_AT}}"
SPECIALTY = "{{SPECIALTY}}"


def main() -> int:
    ap = argparse.ArgumentParser(description=f"Minted worker {WORKER_ID}")
    ap.add_argument("--task-id", type=int, required=True)
    args = ap.parse_args()

    result = factory_lib.process_claimed(args.task_id, WORKER_ID)
    # Workers communicate only via this single JSON line on stdout.
    print(json.dumps(result))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
