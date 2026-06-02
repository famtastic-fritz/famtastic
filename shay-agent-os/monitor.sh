#!/usr/bin/env bash
# Swarm Process Monitor — One command to see everything
# Usage: ~/famtastic/shay-agent-os/monitor.sh
# Or:    watch -n 5 ~/famtastic/shay-agent-os/monitor.sh

LOG_DIR="${HOME}/famtastic/shay-agent-os/logs"
HEARTBEAT_DIR="${LOG_DIR}/heartbeat"
mkdir -p "${HEARTBEAT_DIR}"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
printf "║  AGENT SWARM STATUS — %-28s ║\n" "$(date '+%H:%M:%S')"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Check running Shay processes
echo "◆ RUNNING AGENTS"
echo "─────────────────────────────────────────────────────────"
SHAY_PIDS=$(pgrep -f "shay chat" 2>/dev/null)
if [ -z "$SHAY_PIDS" ]; then
    echo "  No active Shay chat processes"
else
    for PID in $SHAY_PIDS; do
        ELAPSED=$(ps -p "$PID" -o etime= 2>/dev/null | tr -d ' ')
        ARGS=$(ps -p "$PID" -o args= 2>/dev/null | sed 's/.*shay chat/shay chat/' | cut -c1-60)
        printf "  🟢 PID %-7s | %-10s | %s\n" "$PID" "${ELAPSED:-?}" "$ARGS"
    done
fi
echo ""

# Check heartbeat files
echo "◆ HEARTBEATS"
echo "─────────────────────────────────────────────────────────"
if [ -d "${HEARTBEAT_DIR}" ]; then
    for HB in "${HEARTBEAT_DIR}"/*.json; do
        [ -e "$HB" ] || continue
        AGENT=$(basename "$HB" .json)
        AGE=$(( ($(date +%s) - $(stat -f%m "$HB" 2>/dev/null || stat -c%Y "$HB" 2>/dev/null)) ))
        if [ $? -ne 0 ]; then
            AGE="?"
            STATUS="⚪"
        elif [ "$AGE" -gt 300 ]; then
            STATUS="🔴 STALE"
        elif [ "$AGE" -gt 120 ]; then
            STATUS="🟡 SLOW"
        else
            STATUS="🟢 FRESH"
        fi
        MSG=$(cat "$HB" 2>/dev/null | python3 -c 'import sys,json; d=json.load(sys.stdin); step=d.get("step","?"); status=d.get("status","?"); msg=d.get("message",""); print(f"{status} — step: {step}" + (f" | {msg}" if msg else ""))' 2>/dev/null || echo "corrupt JSON")
        printf "  %-20s %-10s | %s\n" "${AGENT}:" "$STATUS" "$MSG"
    done
fi
echo ""

# Show recent log activity
echo "◆ RECENT LOG ACTIVITY (last session per agent)"
echo "─────────────────────────────────────────────────────────"
for LOG in "${LOG_DIR}"/*.log; do
    [ -e "$LOG" ] || continue
    NAME=$(basename "$LOG" .log)
    LINES=$(tail -3 "$LOG" 2>/dev/null)
    [ -z "$LINES" ] && continue
    printf "\n  📄 %s\n" "$NAME"
    echo "$LINES" | sed 's/^/     /'
done
echo ""

# Show reports
echo "◆ REPORTS AVAILABLE"
echo "─────────────────────────────────────────────────────────"
for RPT in "${LOG_DIR}"/*.md; do
    [ -e "$RPT" ] || continue
    AGE=$(( ($(date +%s) - $(stat -f%m "$RPT" 2>/dev/null || stat -c%Y "$RPT" 2>/dev/null)) / 60 ))
    printf "  ✓ %-40s (%dm ago)\n" "$(basename "$RPT")" "$AGE"
done
echo ""

# Summary
echo "◆ SUMMARY"
echo "─────────────────────────────────────────────────────────"
AGENT_COUNT=$(pgrep -f "shay chat" 2>/dev/null | wc -l)
RPT_COUNT=$(ls "${LOG_DIR}"/*.md 2>/dev/null | wc -l)
HB_COUNT=$(ls "${HEARTBEAT_DIR}"/*.json 2>/dev/null | wc -l)
printf "  Active agents: %-3d | Reports: %-3d | Heartbeats: %-3d\n" "$AGENT_COUNT" "$RPT_COUNT" "$HB_COUNT"
echo ""
echo "  TIP: Run 'watch -n 5 ~/famtastic/shay-agent-os/monitor.sh' for live view"
echo ""
