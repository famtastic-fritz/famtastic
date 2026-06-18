"""Evaluation scorecard — one command, runs the whole factory through its paces
and prints a PASS/FAIL summary.

It copies the factory into a throwaway temp directory and runs every check
there, so it NEVER touches the repo's committed state (or any other session).
Exit code = number of failed checks (0 = all green).

    python3 scorecard.py
"""
from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

SELF = Path(__file__).resolve().parent
SKIP = {"data", "logs", "deliverables", "agents", "dashboard",
        "__pycache__", ".git", "eval-output"}

# (name, description, code run inside the temp sandbox)
CHECKS: list[tuple[str, str, str]] = [
    ("end_to_end", "run.py completes; tasks done, none failed, cost tracked", """
import subprocess, sys, queue_db, router
r = subprocess.run([sys.executable, 'run.py'], capture_output=True, text=True)
assert r.returncode == 0, r.stderr[-300:]
m = queue_db.metrics()
assert m['failed'] == 0, m
assert m['done'] >= 10, m
c = router.read_total_cost()
assert 0 < c < 50, c
print(f"done={m['done']} failed={m['failed']} cost=${c:.4f}")
"""),
    ("model_routing", "complexity spread routes to >= 2 distinct tiers", """
import queue_db, router
queue_db.init_db()
seen = {router.route({'complexity': c})['tier'] for c in (0.05, 0.5, 0.95)}
assert len(seen) >= 2, seen
print('tiers:', sorted(seen))
"""),
    ("paypal_draft_safe", "draft created; NO send/capture in the API surface", """
import paypal, inspect
r = paypal.create_draft_from_payload({'unit_amount': 500, 'recipient_email': 'x@y.com'})
assert 'DRAFT' in r['status'], r
assert r['mode'] in ('STUB', 'LIVE', 'LIVE-GUARDED'), r
funcs = [n for n, _ in inspect.getmembers(paypal, inspect.isfunction)]
banned = [f for f in funcs if any(w in f.lower() for w in ('send', 'capture', 'payout', 'refund', 'charge'))]
assert not banned, f'money-moving functions present: {banned}'
assert set(paypal.__all__) == {'build_invoice_payload', 'create_draft_from_payload', 'is_live'}, paypal.__all__
print(f"draft ok mode={r['mode']}; surface={paypal.__all__}")
"""),
    ("fault_handling", "a failing task fails cleanly; good task still succeeds", """
import os, subprocess, sys, queue_db
for s in ('', '-wal', '-shm'):
    try: os.remove('data/factory.db' + s)
    except OSError: pass
queue_db.init_db()
queue_db.add_task('business_model', 'good', {}, 2, 0.7)
queue_db.add_task('fault_inject', 'bad', {'message': 'boom'}, 1, 0.3)
subprocess.run([sys.executable, 'orchestrator.py', '--cycles', '2'], capture_output=True, text=True)
ts = {t['title']: t for t in queue_db.all_tasks()}
assert ts['bad']['status'] == 'failed', ts['bad']
assert ts['good']['status'] == 'done', ts['good']
print('bad->failed, good->done')
"""),
    ("requeue_stale", "task orphaned by a dead worker is requeued", """
import datetime, queue_db
queue_db.init_db()
tid = queue_db.add_task('triage', 'stale', {}, 1, 0.2)
with queue_db.connect() as c:
    old = (datetime.datetime.now() - datetime.timedelta(seconds=600)).isoformat(timespec='seconds')
    c.execute("UPDATE tasks SET status='claimed', started_at=? WHERE id=?", (old, tid))
n = queue_db.requeue_stale()
row = [t for t in queue_db.all_tasks() if t['id'] == tid][0]
assert n >= 1 and row['status'] == 'pending', (n, row)
print(f'requeued n={n}')
"""),
    ("self_improve_bounded", "tuning stays within hard safety bounds", """
import json, queue_db, self_improve
queue_db.init_db()
self_improve.run_pass('scorecard')
cfg = json.load(open('config.json'))
ceil = cfg['self_improvement']['max_concurrency_ceiling']
assert cfg['concurrency']['current_max'] <= ceil, cfg['concurrency']
assert 0.3 <= cfg['routing']['complexity_threshold'] <= 0.85, cfg['routing']
print(f"max={cfg['concurrency']['current_max']}<= {ceil}, thr={cfg['routing']['complexity_threshold']}")
"""),
    ("sandbox_guardrail", "assert_inside blocks writes outside the sandbox", """
import factory_paths
try:
    factory_paths.assert_inside('/etc/passwd')
except PermissionError:
    print('escape blocked')
else:
    raise SystemExit('GUARDRAIL FAILED: did not block /etc/passwd')
"""),
]


def main() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="agent-factory-scorecard-"))
    work = tmp / "agent-factory"
    shutil.copytree(SELF, work, ignore=lambda d, n: [x for x in n if x in SKIP])

    print(f"== Agent Factory scorecard ==\nsandbox: {work}\n")
    results = []
    for name, desc, code in CHECKS:
        proc = subprocess.run(
            [sys.executable, "-c", code], cwd=work,
            capture_output=True, text=True,
        )
        ok = proc.returncode == 0
        out = (proc.stdout.strip().splitlines() or [""])[-1]
        err = (proc.stderr.strip().splitlines() or [""])[-1]
        detail = out if ok else err
        results.append((name, ok, detail))
        mark = "PASS" if ok else "FAIL"
        print(f"  [{mark}] {name:22} {desc}")
        print(f"         -> {detail}")

    shutil.rmtree(tmp, ignore_errors=True)

    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"\n== {passed}/{total} checks passed ==")
    verdict = "GREEN — ready for evaluation" if passed == total else "RED — see failures above"
    print(f"VERDICT: {verdict}")
    return total - passed


if __name__ == "__main__":
    raise SystemExit(main())
