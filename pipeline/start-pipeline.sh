#!/bin/bash
# Revenue Pipeline Controller
# Orchestrates all agents and manages the flow

set -e

echo ""
echo "🔥 AUTONOMOUS REVENUE PIPELINE"
echo "==============================="
echo ""

# Configuration
PIPELINE_DIR="$HOME/famtastic/pipeline"
LOG_DIR="$PIPELINE_DIR/logs"
DATA_DIR="$PIPELINE_DIR/data"
LOCK_FILE="$DATA_DIR/pipeline.lock"

# Create directories
mkdir -p "$LOG_DIR" "$DATA_DIR" "$PIPELINE_DIR/assets" "$PIPELINE_DIR/revenue"

# Check if already running
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "✅ Pipeline already running (PID: $PID)"
        echo "   Run: ./pipeline-status.sh to check status"
        exit 0
    fi
fi

# Write PID
echo $$ > "$LOCK_FILE"

# Log start
echo "$(date '+%Y-%m-%d %H:%M:%S') - Pipeline STARTED" >> "$LOG_DIR/pipeline.log"

# Send Telegram notification
curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
    -d "chat_id=7456504966" \
    -d "text=🚀 REVENUE PIPELINE STARTED%0A%0A• Scout: Finding leads%0A• Builder: Creating assets%0A• Closer: Converting sales%0A%0AMonitoring 24/7..." > /dev/null 2>&1

echo "✅ Pipeline running!"
echo "   Logs: $LOG_DIR/"
echo "   Data: $DATA_DIR/"
echo ""

# Start sub-processes
python3 "$PIPELINE_DIR/agents/scout.py" >> "$LOG_DIR/scout.log" 2>&1 &
SCOUT_PID=$!

python3 "$PIPELINE_DIR/agents/builder.py" >> "$LOG_DIR/builder.log" 2>&1 &
BUILDER_PID=$!

python3 "$PIPELINE_DIR/agents/closer.py" >> "$LOG_DIR/closer.log" 2>&1 &
CLOSER_PID=$!

python3 "$PIPELINE_DIR/agents/monitor.py" >> "$LOG_DIR/monitor.log" 2>&1 &
MONITOR_PID=$!

# Write PIDs
cat > "$DATA_DIR/pids.txt" << EOF
SCOUT=$SCOUT_PID
BUILDER=$BUILDER_PID
CLOSER=$CLOSER_PID
MONITOR=$MONITOR_PID
EOF

echo "Agent PIDs:"
echo "  Scout: $SCOUT_PID"
echo "  Builder: $BUILDER_PID"
echo "  Closer: $CLOSER_PID"
echo "  Monitor: $MONITOR_PID"
echo ""
echo "Pipeline active. You can close this terminal."
echo "Agents will run in background and report to Telegram."

# Keep running to maintain lock
wait
