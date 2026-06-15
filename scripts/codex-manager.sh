#!/usr/bin/env bash
# =============================================================================
# codex-manager.sh — Codex/Electron Process Manager
#
# Manages Codex Desktop and other Electron apps that burn tokens in the
# background. Built because Codex Desktop ran since Sunday and exhausted
# Fritz's OpenAI subscription cap through prewarm calls, memory syncs,
# and chronicle screen captures that persist across laptop sleep/wake cycles.
#
# Usage:
#   codex-manager.sh status              Show all running Electron apps + uptime
#   codex-manager.sh tokens              Show token consumption indicators
#   codex-manager.sh stop                Kill Codex Desktop + all child processes
#   codex-manager.sh stop --all          Kill ALL Electron apps (Codex, Claude, etc.)
#   codex-manager.sh guard [MINUTES]     Auto-kill Codex if idle > MINUTES (default: 30)
#   codex-manager.sh cron-install [MIN]  Install a launchd agent for guard mode
#   codex-manager.sh cron-remove         Remove the launchd agent
#   codex-manager.sh help                Show this help
#
# Guard mode is safe to run from cron or launchd. It only kills Codex Desktop
# (not Claude, not codex-cli) when the main process has zero recent activity
# in its logs for longer than the threshold.
#
# Author: Fritz (via Shay-Shay)
# Created: 2026-06-08
# =============================================================================

set -euo pipefail

# --- Configuration -----------------------------------------------------------

# Codex Desktop main binary path
CODEX_APP="/Applications/Codex.app/Contents/MacOS/Codex"

# Codex log directory (macOS standard location)
CODEX_LOG_DIR="$HOME/Library/Logs/com.openai.codex"

# Codex Application Support directory
CODEX_DATA_DIR="$HOME/Library/Application Support/Codex"

# Claude Desktop main binary path
CLAUDE_APP="/Applications/Claude.app/Contents/MacOS/Claude"

# Default idle threshold in minutes for guard mode
DEFAULT_IDLE_MINUTES=30

# Launchd agent label for cron mode
LAUNCHD_LABEL="com.famtastic.codex-guard"
LAUNCHD_PLIST="$HOME/Library/LaunchAgents/$LAUNCHD_LABEL.plist"

# Script location (for launchd reference)
SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

# --- Color helpers (degrade gracefully in non-TTY) --------------------------

if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    CYAN='\033[0;36m'
    BOLD='\033[1m'
    DIM='\033[2m'
    RESET='\033[0m'
else
    RED='' GREEN='' YELLOW='' CYAN='' BOLD='' DIM='' RESET=''
fi

# --- Helper functions --------------------------------------------------------

# Print a section header
header() {
    echo -e "\n${BOLD}${CYAN}── $1 ──${RESET}"
}

# Print an info line
info() {
    echo -e "  ${GREEN}●${RESET} $1"
}

# Print a warning line
warn() {
    echo -e "  ${YELLOW}⚠${RESET} $1"
}

# Print an error line
error() {
    echo -e "  ${RED}✗${RESET} $1"
}

# Convert elapsed time from ps (HH:MM:SS or D-HH:MM:SS) to human-readable
human_elapsed() {
    local etime="$1"
    # Handle day format: D-HH:MM:SS
    if [[ "$etime" == *-* ]]; then
        local days="${etime%%-*}"
        local time_part="${etime#*-}"
        echo "${days}d ${time_part%%:*}h"
    elif [[ "$etime" == *:*:* ]]; then
        # HH:MM:SS
        local hours="${etime%%:*}"
        local rest="${etime#*:}"
        local mins="${rest%%:*}"
        if (( hours > 24 )); then
            local days=$((hours / 24))
            local remain_h=$((hours % 24))
            echo "${days}d ${remain_h}h ${mins}m"
        elif (( hours > 0 )); then
            echo "${hours}h ${mins}m"
        else
            echo "${mins}m"
        fi
    else
        # MM:SS
        local mins="${etime%%:*}"
        echo "${mins}m"
    fi
}

# Get the main PID for an app by its binary path
# Returns 0 if running, 1 if not
get_main_pid() {
    local app_path="$1"
    local pid
    pid=$(pgrep -xf "$app_path" 2>/dev/null | head -1) || true
    if [[ -n "$pid" ]]; then
        echo "$pid"
        return 0
    fi
    return 1
}

# Get all PIDs belonging to a Codex app (main + all helpers + sidecars)
get_codex_family_pids() {
    local main_pid="$1"
    # Get all child processes of the main PID
    local children
    children=$(pgrep -P "$main_pid" 2>/dev/null) || true
    # Also match processes whose user-data-dir points to Codex
    local codex_procs
    codex_procs=$(ps aux | grep -E "user-data-dir.*Codex" | grep -v grep | awk '{print $2}') || true
    # Also match /Applications/Codex.app spawned processes
    local codex_app_procs
    codex_app_procs=$(ps aux | grep "/Applications/Codex.app/" | grep -v grep | awk '{print $2}') || true

    # Combine all, deduplicate
    {
        echo "$main_pid"
        echo "$children"
        echo "$codex_procs"
        echo "$codex_app_procs"
    } | tr ' ' '\n' | sort -u | grep -v '^$'
}

# Get all PIDs for Claude Desktop
get_claude_family_pids() {
    local main_pid
    main_pid=$(get_main_pid "$CLAUDE_APP") || return 0
    local children
    children=$(pgrep -P "$main_pid" 2>/dev/null) || true
    local claude_procs
    claude_procs=$(ps aux | grep -E "user-data-dir.*Claude" | grep -v grep | awk '{print $2}') || true
    local claude_app_procs
    claude_app_procs=$(ps aux | grep "/Applications/Claude.app/" | grep -v grep | awk '{print $2}') || true

    {
        echo "$main_pid"
        echo "$children"
        echo "$claude_procs"
        echo "$claude_app_procs"
    } | tr ' ' '\n' | sort -u | grep -v '^$'
}

# Find the most recent Codex log file
find_latest_codex_log() {
    # Logs are organized by date: CODEX_LOG_DIR/YYYY/MM/DD/*.log
    # Find the most recently modified one
    find "$CODEX_LOG_DIR" -name "*.log" -type f 2>/dev/null | while read -r f; do
        # Only consider the main (t0) logs, not the tiny sidecar logs
        if [[ "$(basename "$f")" == *"-t0-"* ]]; then
            echo "$f"
        fi
    done | xargs ls -t 2>/dev/null | head -1
}

# Get the last log timestamp from a Codex log file
# Returns ISO timestamp or empty string
get_last_log_timestamp() {
    local log_file="$1"
    if [[ ! -f "$log_file" ]]; then
        return 1
    fi
    # Codex logs start with ISO timestamps: 2026-06-08T15:27:34.679Z
    local last_line
    last_line=$(tail -1 "$log_file" 2>/dev/null) || return 1
    # Extract the timestamp from the beginning of the line
    echo "$last_line" | grep -oE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' | head -1
}

# Convert an ISO timestamp to epoch seconds (macOS date compatible)
iso_to_epoch() {
    local iso="$1"
    # Replace T with space, strip anything after the seconds
    local dt="${iso/T/ }"
    date -j -f "%Y-%m-%d %H:%M:%S" "$dt" "+%s" 2>/dev/null || echo "0"
}

# Calculate idle minutes for Codex based on log activity
get_codex_idle_minutes() {
    local log_file
    log_file=$(find_latest_codex_log)
    if [[ -z "$log_file" ]]; then
        # No logs at all — if process is running, assume max idle
        echo "9999"
        return
    fi

    local last_ts
    last_ts=$(get_last_log_timestamp "$log_file")
    if [[ -z "$last_ts" ]]; then
        echo "9999"
        return
    fi

    local last_epoch now_epoch
    last_epoch=$(iso_to_epoch "$last_ts")
    now_epoch=$(date "+%s")

    if [[ "$last_epoch" == "0" ]]; then
        echo "9999"
        return
    fi

    local diff=$((now_epoch - last_epoch))
    echo $((diff / 60))
}

# Count "usage limit" errors in the latest log (proxy for token exhaustion)
count_usage_limit_errors() {
    local log_file
    log_file=$(find_latest_codex_log)
    if [[ -z "$log_file" || ! -f "$log_file" ]]; then
        echo "0"
        return
    fi
    grep -c "usage limit" "$log_file" 2>/dev/null || echo "0"
}

# Count summary session attempts in the latest log (proxy for background token burns)
count_summary_attempts() {
    local log_file
    log_file=$(find_latest_codex_log)
    if [[ -z "$log_file" || ! -f "$log_file" ]]; then
        echo "0"
        return
    fi
    grep -c "summary session" "$log_file" 2>/dev/null || echo "0"
}

# Count background refresh / prewarm calls
count_prewarm_calls() {
    local log_file
    log_file=$(find_latest_codex_log)
    if [[ -z "$log_file" || ! -f "$log_file" ]]; then
        echo "0"
        return
    fi
    grep -c -E "ambient-suggestions|prewarm|refresh_remote" "$log_file" 2>/dev/null || echo "0"
}

# Get log file size in human-readable format
get_log_size() {
    local log_file
    log_file=$(find_latest_codex_log)
    if [[ -z "$log_file" || ! -f "$log_file" ]]; then
        echo "N/A"
        return
    fi
    local size
    size=$(stat -f%z "$log_file" 2>/dev/null || echo "0")
    if (( size > 1048576 )); then
        echo "$(( size / 1048576 ))MB"
    elif (( size > 1024 )); then
        echo "$(( size / 1024 ))KB"
    else
        echo "${size}B"
    fi
}

# --- Commands ----------------------------------------------------------------

cmd_status() {
    header "Electron Process Status"
    echo -e "  ${DIM}$(date)${RESET}"

    # --- Codex Desktop ---
    local codex_pid
    codex_pid=$(get_main_pid "$CODEX_APP") || true
    if [[ -n "$codex_pid" ]]; then
        local etime
        etime=$(ps -o etime= -p "$codex_pid" 2>/dev/null | tr -d ' ')
        local human_time
        human_time=$(human_elapsed "$etime")

        echo -e "\n  ${BOLD}Codex Desktop${RESET} ${GREEN}RUNNING${RESET}"
        info "PID: $codex_pid"
        info "Uptime: $human_time (since $(ps -o lstart= -p "$codex_pid" 2>/dev/null | sed 's/  */ /g'))"

        # Count child processes
        local child_count
        child_count=$(get_codex_family_pids "$codex_pid" | wc -l | tr -d ' ')
        info "Child processes: $child_count"

        # Idle time
        local idle_min
        idle_min=$(get_codex_idle_minutes)
        if (( idle_min < 5 )); then
            info "Last activity: ${idle_min}m ago ${GREEN}(active)${RESET}"
        elif (( idle_min < 30 )); then
            info "Last activity: ${idle_min}m ago ${YELLOW}(idle)${RESET}"
        else
            info "Last activity: ${idle_min}m ago ${RED}(stale)${RESET}"
        fi

        # Resource usage
        local cpu mem
        cpu=$(ps -o %cpu= -p "$codex_pid" 2>/dev/null | tr -d ' ')
        mem=$(ps -o %mem= -p "$codex_pid" 2>/dev/null | tr -d ' ')
        info "CPU: ${cpu}%  Memory: ${mem}%"

        # Total CPU for the whole family
        local family_pids total_cpu
        family_pids=$(get_codex_family_pids "$codex_pid")
        total_cpu=$(echo "$family_pids" | while read -r pid; do
            ps -o %cpu= -p "$pid" 2>/dev/null || echo "0"
        done | awk '{s+=$1} END {printf "%.1f", s}')
        info "Family total CPU: ${total_cpu}%"
    else
        echo -e "\n  ${BOLD}Codex Desktop${RESET} ${DIM}NOT RUNNING${RESET}"
    fi

    # --- Claude Desktop ---
    local claude_pid
    claude_pid=$(get_main_pid "$CLAUDE_APP") || true
    if [[ -n "$claude_pid" ]]; then
        local etime
        etime=$(ps -o etime= -p "$claude_pid" 2>/dev/null | tr -d ' ')
        local human_time
        human_time=$(human_elapsed "$etime")

        echo -e "\n  ${BOLD}Claude Desktop${RESET} ${GREEN}RUNNING${RESET}"
        info "PID: $claude_pid"
        info "Uptime: $human_time (since $(ps -o lstart= -p "$claude_pid" 2>/dev/null | sed 's/  */ /g'))"

        local child_count
        child_count=$(get_claude_family_pids | wc -l | tr -d ' ')
        info "Child processes: $child_count"

        local cpu mem
        cpu=$(ps -o %cpu= -p "$claude_pid" 2>/dev/null | tr -d ' ')
        mem=$(ps -o %mem= -p "$claude_pid" 2>/dev/null | tr -d ' ')
        info "CPU: ${cpu}%  Memory: ${mem}%"
    else
        echo -e "\n  ${BOLD}Claude Desktop${RESET} ${DIM}NOT RUNNING${RESET}"
    fi

    # --- Codex CLI (MCP server) ---
    local codex_cli_pids
    codex_cli_pids=$(pgrep -f "codex mcp-server" 2>/dev/null || true)
    if [[ -n "$codex_cli_pids" ]]; then
        echo -e "\n  ${BOLD}Codex CLI (MCP)${RESET} ${GREEN}RUNNING${RESET}"
        echo "$codex_cli_pids" | while read -r pid; do
            local etime
            etime=$(ps -o etime= -p "$pid" 2>/dev/null | tr -d ' ') || continue
            info "PID $pid — uptime: $(human_elapsed "$etime")"
        done
    fi

    # --- VS Code Codex extension ---
    local vscode_codex
    vscode_codex=$(pgrep -f "chatgpt-.*codex" 2>/dev/null || true)
    if [[ -n "$vscode_codex" ]]; then
        echo -e "\n  ${BOLD}VS Code Codex${RESET} ${GREEN}RUNNING${RESET}"
        echo "$vscode_codex" | while read -r pid; do
            local etime
            etime=$(ps -o etime= -p "$pid" 2>/dev/null | tr -d ' ') || continue
            info "PID $pid — uptime: $(human_elapsed "$etime")"
        done
    fi

    echo ""
}

cmd_tokens() {
    header "Codex Token Consumption Indicators"

    local codex_pid
    codex_pid=$(get_main_pid "$CODEX_APP") || true
    if [[ -z "$codex_pid" ]]; then
        warn "Codex Desktop is not running."
        echo ""
        return
    fi

    local log_file
    log_file=$(find_latest_codex_log)

    if [[ -z "$log_file" ]]; then
        warn "No Codex log files found."
        return
    fi

    info "Active log: $log_file"
    info "Log size: $(get_log_size)"

    # Usage limit hits
    local limit_errors
    limit_errors=$(count_usage_limit_errors)
    if (( limit_errors > 0 )); then
        error "Usage limit errors: $limit_errors"
        error "  → Codex is STILL making API calls despite being at cap!"
        error "  → Each 'summary session' retry burns tokens on the error path"
    else
        info "Usage limit errors: 0 (no cap hit detected in current log)"
    fi

    # Summary session attempts (background token burns)
    local summary_count
    summary_count=$(count_summary_attempts)
    if (( summary_count > 20 )); then
        warn "Summary session attempts: $summary_count ${RED}(HIGH — lots of background work)${RESET}"
    elif (( summary_count > 5 )); then
        warn "Summary session attempts: $summary_count"
    else
        info "Summary session attempts: $summary_count"
    fi

    # Background refresh / prewarm calls
    local prewarm_count
    prewarm_count=$(count_prewarm_calls)
    if (( prewarm_count > 50 )); then
        warn "Background refresh calls: $prewarm_count ${RED}(HIGH — constant prewarm/sync)${RESET}"
    else
        info "Background refresh calls: $prewarm_count"
    fi

    # Idle time context
    local idle_min
    idle_min=$(get_codex_idle_minutes)
    echo ""
    info "Last log activity: ${idle_min} minutes ago"

    # Estimate of wasted cycles
    if (( limit_errors > 0 && idle_min > 10 )); then
        error "BURNING TOKENS WHILE IDLE: Codex hit usage cap but keeps retrying"
        error "  Run '$(basename "$0") stop' to kill it, or '$(basename "$0") guard' to auto-kill"
    fi

    # Show the actual usage limit message if present
    if (( limit_errors > 0 )); then
        local reset_date
        reset_date=$(grep -o "try again at[^.]*" "$log_file" 2>/dev/null | head -1 | sed 's/try again at //')
        if [[ -n "$reset_date" ]]; then
            warn "Cap resets: $reset_date"
        fi
    fi

    echo ""
}

cmd_stop() {
    local stop_all="${1:-}"

    if [[ "$stop_all" == "--all" ]]; then
        header "Stopping ALL Electron Apps (Codex + Claude)"
    else
        header "Stopping Codex Desktop"
    fi

    # --- Stop Codex ---
    local codex_pid
    codex_pid=$(get_main_pid "$CODEX_APP") || true
    if [[ -n "$codex_pid" ]]; then
        local family_pids
        family_pids=$(get_codex_family_pids "$codex_pid")
        local count
        count=$(echo "$family_pids" | wc -l | tr -d ' ')

        info "Killing Codex Desktop main process (PID $codex_pid) + $((count - 1)) child processes"

        # Kill the main process first (SIGTERM for clean shutdown)
        kill "$codex_pid" 2>/dev/null || true

        # Give it 2 seconds to shut down gracefully
        sleep 2

        # Kill any remaining children
        echo "$family_pids" | while read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null || true
            fi
        done

        # Wait and SIGKILL any stragglers
        sleep 1
        echo "$family_pids" | while read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null || true
                warn "Force-killed stubborn PID $pid"
            fi
        done

        # Verify
        if pgrep -xf "$CODEX_APP" >/dev/null 2>&1; then
            error "Codex Desktop is still running! Try: kill -9 $codex_pid"
        else
            info "Codex Desktop stopped successfully."
        fi
    else
        info "Codex Desktop is not running."
    fi

    # --- Optionally stop Claude ---
    if [[ "$stop_all" == "--all" ]]; then
        local claude_pid
        claude_pid=$(get_main_pid "$CLAUDE_APP") || true
        if [[ -n "$claude_pid" ]]; then
            local family_pids
            family_pids=$(get_claude_family_pids)
            local count
            count=$(echo "$family_pids" | wc -l | tr -d ' ')

            info "Killing Claude Desktop main process (PID $claude_pid) + $((count - 1)) child processes"

            kill "$claude_pid" 2>/dev/null || true
            sleep 2

            echo "$family_pids" | while read -r pid; do
                if kill -0 "$pid" 2>/dev/null; then
                    kill "$pid" 2>/dev/null || true
                fi
            done

            sleep 1
            echo "$family_pids" | while read -r pid; do
                if kill -0 "$pid" 2>/dev/null; then
                    kill -9 "$pid" 2>/dev/null || true
                    warn "Force-killed stubborn PID $pid"
                fi
            done

            if pgrep -xf "$CLAUDE_APP" >/dev/null 2>&1; then
                error "Claude Desktop is still running!"
            else
                info "Claude Desktop stopped successfully."
            fi
        else
            info "Claude Desktop is not running."
        fi
    fi

    echo ""
}

cmd_guard() {
    local threshold_minutes="${1:-$DEFAULT_IDLE_MINUTES}"

    # Guard mode is designed for cron/launchd — minimal output unless action taken
    local codex_pid
    codex_pid=$(get_main_pid "$CODEX_APP") || true

    if [[ -z "$codex_pid" ]]; then
        # Not running — nothing to do, silent exit
        exit 0
    fi

    local idle_min
    idle_min=$(get_codex_idle_minutes)
    local etime
    etime=$(ps -o etime= -p "$codex_pid" 2>/dev/null | tr -d ' ')
    local human_time
    human_time=$(human_elapsed "$etime")

    if (( idle_min >= threshold_minutes )); then
        echo "[$(date)] CODEX GUARD: Killing Codex Desktop (idle ${idle_min}m >= threshold ${threshold_minutes}m, uptime $human_time)"

        # Log to a guard log file
        local guard_log="$HOME/Library/Logs/codex-guard.log"
        echo "[$(date)] KILLED — idle ${idle_min}m, uptime $human_time, PID $codex_pid" >> "$guard_log"

        # Kill it
        local family_pids
        family_pids=$(get_codex_family_pids "$codex_pid")
        kill "$codex_pid" 2>/dev/null || true
        sleep 2
        echo "$family_pids" | while read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null || true
            fi
        done
        sleep 1
        echo "$family_pids" | while read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null || true
            fi
        done

        echo "[$(date)] CODEX GUARD: Codex Desktop stopped."
    else
        # Running but active — log for visibility in verbose mode
        if [[ "${CODEX_GUARD_VERBOSE:-}" == "1" ]]; then
            echo "[$(date)] CODEX GUARD: Codex running (idle ${idle_min}m < threshold ${threshold_minutes}m) — no action"
        fi
    fi
}

cmd_cron_install() {
    local minutes="${1:-$DEFAULT_IDLE_MINUTES}"

    header "Installing Codex Guard LaunchAgent"

    # Ensure LaunchAgents directory exists
    mkdir -p "$HOME/Library/LaunchAgents"

    # Create the plist
    cat > "$LAUNCHD_PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$LAUNCHD_LABEL</string>
    <key>ProgramArguments</key>
    <array>
        <string>$SCRIPT_PATH</string>
        <string>guard</string>
        <string>$minutes</string>
    </array>
    <key>StartInterval</key>
    <integer>$((minutes * 60))</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/codex-guard-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/codex-guard-stderr.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
EOF

    # Unload if already loaded
    launchctl unload "$LAUNCHD_PLIST" 2>/dev/null || true

    # Load it
    launchctl load "$LAUNCHD_PLIST" 2>/dev/null

    info "Installed: $LAUNCHD_PLIST"
    info "Checks every $minutes minutes for idle Codex processes"
    info "Guard log: ~/Library/Logs/codex-guard.log"
    info ""
    info "Remove with: $(basename "$0") cron-remove"

    echo ""
}

cmd_cron_remove() {
    header "Removing Codex Guard LaunchAgent"

    if [[ -f "$LAUNCHD_PLIST" ]]; then
        launchctl unload "$LAUNCHD_PLIST" 2>/dev/null || true
        rm -f "$LAUNCHD_PLIST"
        info "Removed: $LAUNCHD_PLIST"
    else
        info "No LaunchAgent found at $LAUNCHD_PLIST"
    fi

    echo ""
}

cmd_help() {
    cat << 'HELP'
codex-manager.sh — Codex/Electron Process Manager

USAGE:
  codex-manager.sh <command> [options]

COMMANDS:
  status              Show all running Electron apps with PID, uptime, CPU
  tokens              Show token consumption indicators from Codex logs
  stop                Kill Codex Desktop + all child/helper processes
  stop --all          Kill ALL Electron apps (Codex, Claude, etc.)
  guard [MINUTES]     Auto-kill Codex if idle > MINUTES (default: 30)
                      Safe for cron/launchd — only kills when idle
  cron-install [MIN]  Install launchd agent that runs guard every MIN minutes
  cron-remove         Remove the launchd agent
  help                Show this help

EXAMPLES:
  # Check what's running
  codex-manager.sh status

  # Check token burn indicators
  codex-manager.sh tokens

  # Kill Codex Desktop now
  codex-manager.sh stop

  # Kill everything
  codex-manager.sh stop --all

  # One-shot guard check (kill if idle > 60min)
  codex-manager.sh guard 60

  # Install persistent guard (checks every 30min via launchd)
  codex-manager.sh cron-install 30

  # Remove the persistent guard
  codex-manager.sh cron-remove

WHY THIS EXISTS:
  Codex Desktop runs background processes (chronicle screen capture,
  prewarm calls, ambient suggestion refreshes, summary session retries)
  that consume API tokens even when you're not actively using it. These
  persist through laptop sleep/wake cycles. This script lets you monitor
  and control that background token burn.

IDLE DETECTION:
  "Idle" is determined by checking the last timestamp in Codex's own log
  files (~/Library/Logs/com.openai.codex/). If no log activity has occurred
  for the threshold period, the app is considered idle and will be killed
  in guard mode.

GUARD LOG:
  Guard actions are logged to ~/Library/Logs/codex-guard.log
  Launchd stdout/stderr go to ~/Library/Logs/codex-guard-{stdout,stderr}.log
HELP
}

# --- Main entry point --------------------------------------------------------

main() {
    local command="${1:-help}"
    shift 2>/dev/null || true

    case "$command" in
        status)
            cmd_status
            ;;
        tokens)
            cmd_tokens
            ;;
        stop)
            cmd_stop "${1:-}"
            ;;
        guard)
            cmd_guard "${1:-$DEFAULT_IDLE_MINUTES}"
            ;;
        cron-install)
            cmd_cron_install "${1:-$DEFAULT_IDLE_MINUTES}"
            ;;
        cron-remove)
            cmd_cron_remove
            ;;
        help|--help|-h)
            cmd_help
            ;;
        *)
            echo "Unknown command: $command"
            echo "Run '$(basename "$0") help' for usage."
            exit 1
            ;;
    esac
}

main "$@"
