#!/usr/bin/env bash
# install.sh — make Agent Business OS run autonomously, forever, via launchd.
# One command, then it never needs you again: tick every 15 min, memo daily 08:00.
#
#   bash agent-business-os/ops/launchd/install.sh          # install + start
#   bash agent-business-os/ops/launchd/install.sh uninstall # stop + remove

set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HUB="$(cd "$HERE/../../.." && pwd)"
LA="$HOME/Library/LaunchAgents"
JOBS=(com.famtastic.abos-tick com.famtastic.abos-memo)

if [[ "${1:-}" == "uninstall" ]]; then
  for j in "${JOBS[@]}"; do
    launchctl unload "$LA/$j.plist" 2>/dev/null || true
    rm -f "$LA/$j.plist"
    echo "removed $j"
  done
  echo "Agent Business OS autonomous runner uninstalled."
  exit 0
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Not macOS. Use cron instead (see agent-business-os/agents/README.md)." >&2
  exit 1
fi
command -v node >/dev/null || { echo "node not found on PATH" >&2; exit 1; }

mkdir -p "$LA"
for j in "${JOBS[@]}"; do
  sed "s|{{HUB}}|$HUB|g" "$HERE/$j.plist.template" > "$LA/$j.plist"
  launchctl unload "$LA/$j.plist" 2>/dev/null || true
  launchctl load "$LA/$j.plist"
  echo "loaded $j"
done

echo ""
echo "✅ Agent Business OS is now running autonomously."
echo "   • tick (sync→qualify→sdr→billing→monitor) every 15 min"
echo "   • daily digest at 08:00 into the brain"
echo "   logs: /tmp/abos-tick.log  /tmp/abos-memo.log"
echo ""
echo "It runs in LIVE billing + auto-close mode. It only COLLECTS when someone"
echo "actually pays; money-out (refunds/payouts) is never automated."
echo "Make sure the vault has: payments/stripe.secret_key, payments/stripe.webhook_secret,"
echo "payments/cashapp.cashtag, and (for live-lead sync) payments/leads_table_connection_string."
