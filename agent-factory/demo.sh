#!/usr/bin/env bash
# Agent Factory — local test scenario runner.
#
#   ./demo.sh <scenario>
#
# Scenarios:
#   smoke       one-shot bounded run (seed -> process -> dashboard)
#   autonomy    persistent daemon picks up LIVE-injected tasks, then stops
#   burst       20-task load: watch concurrency scale up + cadence tighten
#   routing     spread of complexity: watch cheap/mid/premium model routing
#   paypal      create DRAFT PayPal invoices (stub offline) + show artifacts
#   resilience  mix good + failing + stale tasks: prove fail + requeue paths
#   scorecard   run every check and print a PASS/FAIL summary (no repo churn)
#   status      print the dashboard for the current state
#   clean       wipe runtime state (db, logs, deliverables) for a fresh run
#
# Everything is offline + sandboxed. Nothing outside agent-factory/ is touched.
set -euo pipefail
cd "$(dirname "$0")"
PY=${PYTHON:-python3}
SC=${1:-help}

reset_state() {
  rm -f data/factory.db data/factory.db-wal data/factory.db-shm data/STOP
  rm -f logs/*.log LEARNINGS.md
  rm -rf deliverables/* 2>/dev/null || true
  $PY -c "import queue_db; queue_db.init_db()"
}

case "$SC" in
  smoke)
    echo "### SMOKE — one-shot bounded run"
    $PY run.py
    ;;

  autonomy)
    echo "### AUTONOMY — daemon auto-processes live-injected work"
    reset_state
    $PY orchestrator.py --forever > logs/daemon.log 2>&1 &
    DPID=$!; echo "daemon pid=$DPID (log: logs/daemon.log)"
    sleep 4
    echo "-- injecting task A (triage) while idle --"
    $PY add_task.py triage "demo live task A" 0.2 1
    for i in $(seq 1 45); do
      $PY -c "import queue_db,sys; sys.exit(0 if any(t['title']=='demo live task A' and t['status']=='done' for t in queue_db.all_tasks()) else 1)" && { echo "   auto-processed in ~${i}s"; break; } || sleep 1
    done
    echo "-- injecting task B (paypal draft) --"
    $PY add_task.py paypal_invoice_draft "demo live invoice B" 0.4 1 --payload '{"recipient_email":"demo@x.com","item_name":"Demo diagnostic","unit_amount":500}'
    for i in $(seq 1 45); do
      $PY -c "import queue_db,sys; sys.exit(0 if any(t['title']=='demo live invoice B' and t['status']=='done' for t in queue_db.all_tasks()) else 1)" && { echo "   auto-processed in ~${i}s"; break; } || sleep 1
    done
    echo "-- stopping daemon (touch data/STOP) --"
    touch data/STOP
    for i in $(seq 1 35); do kill -0 $DPID 2>/dev/null || { echo "   daemon exited cleanly"; break; }; sleep 1; done
    kill -0 $DPID 2>/dev/null && kill $DPID || true
    $PY dashboard.py
    ;;

  burst)
    echo "### BURST — 20 tasks; watch concurrency scale + cadence adapt"
    reset_state
    $PY -c "
import queue_db, random
queue_db.init_db()
for i in range(20):
    c = round(random.uniform(0.1, 0.95), 2)
    queue_db.add_task('triage' if c < 0.4 else ('summary' if c < 0.7 else 'business_model'),
                      f'burst task {i+1}', {'i': i+1}, priority=5, complexity=c)
print('seeded 20 tasks across the complexity spectrum')
"
    $PY orchestrator.py --cycles 8
    $PY dashboard.py
    echo "-- self-improvement decisions --"; tail -n 30 LEARNINGS.md
    ;;

  routing)
    echo "### ROUTING — cost-aware model selection by complexity"
    reset_state
    $PY -c "
import queue_db
queue_db.init_db()
for label, c in [('trivial',0.1),('easy',0.25),('medium',0.5),('hard',0.75),('expert',0.95)]:
    queue_db.add_task('summary', f'{label} routing probe', {}, 3, c)
print('seeded 5 probes: trivial..expert')
"
    $PY orchestrator.py --cycles 3 >/dev/null
    echo "-- COSTS.log: which model each complexity routed to --"
    $PY -c "
import json
for line in open('logs/COSTS.log'):
    e=json.loads(line); print(f\"  {e['task_type']:8} -> {e['model']:35} \${e['cost_usd']:.6f}\")
"
    ;;

  paypal)
    echo "### PAYPAL — DRAFT-only invoices (stub offline, never sent)"
    reset_state
    $PY add_task.py paypal_invoice_draft "Checkout Rescue Diagnostic" 0.4 1 --payload '{"recipient_name":"Acme Co","recipient_email":"acme@x.com","item_name":"Checkout Rescue Diagnostic — 48h","unit_amount":500}'
    $PY add_task.py paypal_invoice_draft "Signature build deposit" 0.4 1 --payload '{"recipient_email":"client@x.com","item_name":"FAMtastic Signature — 50% deposit","unit_amount":1750}'
    $PY orchestrator.py --cycles 2 >/dev/null
    echo "-- generated draft artifacts --"
    ls -1 deliverables/invoices/
    echo "-- draft #1 (request body that would hit PayPal) --"
    $PY -c "import json,glob; f=sorted(glob.glob('deliverables/invoices/*.json'))[0]; d=json.load(open(f)); print('mode:',d['mode'],'| status:',d['status'],'| amount:',d['amount'])"
    ;;

  resilience)
    echo "### RESILIENCE — failing + stale tasks recover correctly"
    reset_state
    $PY add_task.py business_model "good task (should succeed)" 0.7 2 >/dev/null
    $PY add_task.py fault_inject "FAULT task (should fail)" 0.3 1 --payload '{"message":"simulated worker crash"}' >/dev/null
    # plant a 'stale claimed' task to prove requeue of a dead worker
    $PY -c "
import queue_db, datetime
queue_db.init_db()
tid = queue_db.add_task('triage','stale task (dead worker)',{},1,0.2)
with queue_db.connect() as c:
    old = (datetime.datetime.now()-datetime.timedelta(seconds=600)).isoformat(timespec='seconds')
    c.execute(\"UPDATE tasks SET status='claimed', claimed_by='ghost', started_at=? WHERE id=?\",(old,tid))
print(f'planted stale-claimed task #{tid} (orphaned by a dead worker)')
"
    $PY orchestrator.py --cycles 3
    echo "-- outcome --"
    $PY -c "
import queue_db
for t in queue_db.all_tasks():
    print(f\"  #{t['id']} {t['status']:7} {t['title']}\" + (f\"  err={t['error']}\" if t['error'] else ''))
m=queue_db.metrics(); print(f\"  success_rate={m['success_rate']:.0%}  done={m['done']} failed={m['failed']}\")
"
    ;;

  scorecard)
    echo "### SCORECARD — run every check, print PASS/FAIL (repo untouched)"
    $PY scorecard.py
    ;;

  status)  $PY dashboard.py ;;
  clean)   reset_state; echo "state reset." ;;
  help|*)
    grep -E '^#   [a-z]' "$0" | sed 's/^#   /  /'
    ;;
esac
