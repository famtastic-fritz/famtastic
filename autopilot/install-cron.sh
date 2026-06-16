#!/usr/bin/env bash
# Install the autopilot on a schedule so it runs unattended.
# - Linux: installs a cron entry.
# - macOS: installs a launchd agent (consistent with com.famtastic.studio).
#
# Default cadence: every 6 hours. Override with TICK_CRON / TICK_INTERVAL.
# Usage:  bash autopilot/install-cron.sh [install|uninstall|status]

set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HUB="$(cd "$HERE/.." && pwd)"
NODE="$(command -v node)"
CMD="cd $HUB && $NODE autopilot/cli.mjs tick >> $HUB/autopilot/state/cron.log 2>&1"
TICK_CRON="${TICK_CRON:-0 */6 * * *}"          # every 6 hours
LABEL="com.famtastic.autopilot"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
ACTION="${1:-install}"

is_macos() { [[ "$(uname)" == "Darwin" ]]; }

install_linux() {
  mkdir -p "$HUB/autopilot/state"
  ( crontab -l 2>/dev/null | grep -v "autopilot/cli.mjs tick" ; echo "$TICK_CRON $CMD" ) | crontab -
  echo "✅ cron installed: '$TICK_CRON' → autopilot tick"
  echo "   view: crontab -l   |   logs: $HUB/autopilot/state/cron.log"
}

uninstall_linux() {
  crontab -l 2>/dev/null | grep -v "autopilot/cli.mjs tick" | crontab - || true
  echo "🗑  cron entry removed."
}

install_macos() {
  mkdir -p "$HOME/Library/LaunchAgents" "$HUB/autopilot/state"
  cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>$NODE</string><string>$HUB/autopilot/cli.mjs</string><string>tick</string></array>
  <key>WorkingDirectory</key><string>$HUB</string>
  <key>StartInterval</key><integer>${TICK_INTERVAL:-21600}</integer>
  <key>StandardOutPath</key><string>$HUB/autopilot/state/cron.log</string>
  <key>StandardErrorPath</key><string>$HUB/autopilot/state/cron.log</string>
</dict></plist>
PL
  launchctl unload "$PLIST" 2>/dev/null || true
  launchctl load "$PLIST"
  echo "✅ launchd agent loaded: $LABEL (every ${TICK_INTERVAL:-21600}s)"
}

uninstall_macos() {
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "🗑  launchd agent removed."
}

case "$ACTION" in
  install)   is_macos && install_macos || install_linux ;;
  uninstall) is_macos && uninstall_macos || uninstall_linux ;;
  status)
    if is_macos; then launchctl list | grep "$LABEL" || echo "not loaded";
    else crontab -l 2>/dev/null | grep "autopilot/cli.mjs tick" || echo "no cron entry"; fi ;;
  *) echo "usage: $0 [install|uninstall|status]"; exit 1 ;;
esac
