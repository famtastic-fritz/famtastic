#!/bin/bash
# Agent OS Build Monitor
# Usage: bash ~/famtastic/scripts/agent-os-monitor.sh
# Shows current build status, recent logs, and blockers

STATE_FILE="$HOME/famtastic/shay-agent-os/state/build-state.json"
LOG_DIR="$HOME/famtastic/logs"

echo "=== Agent OS Build Monitor ==="
echo "Time: $(date)"
echo ""

# Show state
if [ -f "$STATE_FILE" ]; then
    echo "--- Build State ---"
    cat "$STATE_FILE" | python3 -m json.tool 2>/dev/null || cat "$STATE_FILE"
    echo ""
else
    echo "WARNING: No build state file found at $STATE_FILE"
    echo ""
fi

# Show recent logs
if [ -d "$LOG_DIR" ]; then
    LATEST_LOG=$(ls -t "$LOG_DIR"/agent-os-*.log 2>/dev/null | head -1)
    if [ -n "$LATEST_LOG" ]; then
        echo "--- Latest Log ($(basename "$LATEST_LOG")) ---"
        tail -50 "$LATEST_LOG"
        echo ""
    fi
    
    # Show progress log
    PROGRESS_LOG="$LOG_DIR/agent-os-build-progress.log"
    if [ -f "$PROGRESS_LOG" ]; then
        echo "--- Progress Log ---"
        tail -20 "$PROGRESS_LOG"
        echo ""
    fi
fi

# Show running processes
echo "--- Running Build Processes ---"
ps aux | grep -E "(shay chat|agent-os)" | grep -v grep || echo "No active build processes found"
echo ""

# Show disk usage
echo "--- Disk Usage ---"
df -h "$HOME" | tail -1
echo ""

echo "=== End Monitor ==="
