#!/bin/bash
# Agent OS Autonomous Build Runner
# Usage: bash ~/famtastic/scripts/agent-os-autonomous-run.sh
# This spawns the master build agent via Shay-Shay CLI

set -euo pipefail

LOG_DIR="$HOME/famtastic/logs"
STATE_DIR="$HOME/famtastic/shay-agent-os/state"
PROMPT_FILE="$HOME/famtastic/prompts/agent-os-autonomous-build.md"

mkdir -p "$LOG_DIR" "$STATE_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
MASTER_LOG="$LOG_DIR/agent-os-master-$TIMESTAMP.log"

echo "=== Agent OS Autonomous Build ==="
echo "Started: $(date)"
echo "Master log: $MASTER_LOG"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v shay &> /dev/null; then
    echo "ERROR: shay CLI not found. Install first: curl -fsSL https://raw.githubusercontent.com/NousResearch/shay-shay/main/scripts/install.sh | bash"
    exit 1
fi

if ! command -v redis-cli &> /dev/null; then
    echo "WARNING: redis-cli not found. Redis may not be installed."
fi

if ! curl -s http://localhost:11434/api/tags &> /dev/null; then
    echo "WARNING: Ollama not running on :11434."
fi

echo "Prerequisites checked."
echo ""

# Initialize state if not exists
STATE_FILE="$STATE_DIR/build-state.json"
if [ ! -f "$STATE_FILE" ]; then
    echo "Initializing build state..."
    cat > "$STATE_FILE" << 'EOF'
{
  "phase": "init",
  "completed": [],
  "in_progress": [],
  "blockers": [],
  "start_time": "",
  "last_update": "",
  "workers": []
}
EOF
fi

# Run the master build agent
echo "Spawning master build agent..."
echo "This will run for hours. Check progress with:"
echo "  tail -f $MASTER_LOG"
echo ""

# Use shay chat -q with the full prompt
# The --yolo flag skips approval prompts for dangerous commands
shay chat -q "$(cat "$PROMPT_FILE")" --yolo 2>&1 | tee "$MASTER_LOG"

echo ""
echo "=== Build Complete ==="
echo "Finished: $(date)"
echo "Log: $MASTER_LOG"
echo "State: $STATE_FILE"
