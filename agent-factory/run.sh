#!/usr/bin/env bash
# Start the orchestrator. Default = bounded demo run (drains the seeded queue,
# spawns workers, routes, logs cost, runs one self-improvement pass, exits).
# Pass --daemon to run the supervisor indefinitely.
set -euo pipefail
cd "$(dirname "$0")"

# ensure there is work; seed if the queue is empty / DB missing
python3 - <<'PY'
import sys; sys.path.insert(0, "src")
import queue as q
q.init_db()
if q.queue_depth() == 0:
    import subprocess; subprocess.run([sys.executable, "seed.py"], check=True)
PY

exec python3 src/orchestrator.py "$@"
