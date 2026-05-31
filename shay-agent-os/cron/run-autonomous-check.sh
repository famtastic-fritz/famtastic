#!/bin/bash
# cron/run-autonomous-check.sh — Runs every 5 minutes via cron

set -euo pipefail

cd "$(dirname "$0")/.."

LOG_DIR="$HOME/famtastic/logs"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$TIMESTAMP] Starting autonomous check"

# Run heartbeat check once
python3 -m reporter.heartbeat --once >> "$LOG_DIR/cron-heartbeat.log" 2>&1

# Run blocker detection
python3 -c "
import sys, json
sys.path.insert(0, '.')
from components.swarm import SwarmOrchestrator
from reporter.blocker_detector import BlockerDetector

orch = SwarmOrchestrator(num_workers=3, log_level='WARNING')
orch.start()
detector = BlockerDetector()
health = orch.health()
new_blockers = detector.check(health)

for b in new_blockers:
    print(f'NEW_BLOCKER: {b.description}')
    if detector.escalate(b.id):
        print(f'ESCALATED: {b.id}')

orch.stop()
" >> "$LOG_DIR/cron-blocker.log" 2>&1

echo "[$TIMESTAMP] Autonomous check complete"
