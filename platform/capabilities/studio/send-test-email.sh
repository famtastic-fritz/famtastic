#!/usr/bin/env bash
# studio/send-test-email.sh - send a Site Studio Resend test email.

set -euo pipefail

PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"

node "$HUB_ROOT/site-studio/scripts/send-studio-test-email.js" "$@"
