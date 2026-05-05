#!/usr/bin/env bash
# vault.sh — credential vault, macOS Keychain backed.
# Standing-approval model: once a secret is stored, agents read without re-prompting.
#
# Usage:
#   vault read <secret-id>          Print secret to stdout (no echo via TTY)
#   vault write <secret-id> [value] Store secret. If [value] omitted, read silently from TTY.
#   vault list                       List known secret IDs
#   vault remove <secret-id>         Remove a stored secret
#
# Secret IDs use slash-separated paths, e.g.:
#   sites/mbsh-reunion-v2/db_password.dev
#   sites/mbsh-reunion-v2/db_password.production
#   resend.api_key
#   ssh.FAMTASTICINC.COM.identity_file (path stored, not key contents)
#   cpanel.api_token

set -euo pipefail

VAULT_SERVICE="famtastic-platform"
INDEX_FILE="${HOME}/.config/famtastic/vault-index.txt"
mkdir -p "$(dirname "$INDEX_FILE")"
touch "$INDEX_FILE"

is_macos() { [[ "$(uname -s)" == "Darwin" ]]; }

read_secret() {
  local id="$1"
  if is_macos; then
    security find-generic-password -s "$VAULT_SERVICE" -a "$id" -w 2>/dev/null || {
      echo "vault: not found: $id" >&2; exit 2;
    }
  else
    # Fallback: file-based (NOT recommended; here for sandbox testing only)
    local file="${HOME}/.config/famtastic/vault.d/$(echo "$id" | tr '/' '_')"
    [[ -f "$file" ]] || { echo "vault: not found: $id" >&2; exit 2; }
    cat "$file"
  fi
}

write_secret() {
  local id="$1" value="${2:-}"
  if [[ -z "$value" ]]; then
    read -rsp "Enter value for $id: " value; echo
  fi
  if is_macos; then
    security add-generic-password -U -s "$VAULT_SERVICE" -a "$id" -w "$value" >/dev/null
  else
    local dir="${HOME}/.config/famtastic/vault.d"; mkdir -p "$dir"; chmod 700 "$dir"
    local file="$dir/$(echo "$id" | tr '/' '_')"
    printf '%s' "$value" > "$file"; chmod 600 "$file"
  fi
  # Track in index (without value)
  if ! grep -qxF "$id" "$INDEX_FILE"; then echo "$id" >> "$INDEX_FILE"; fi
  echo "vault: stored $id"
}

list_secrets() {
  echo "Stored secret IDs (values not shown):"
  sort -u "$INDEX_FILE" | sed 's/^/  /'
}

remove_secret() {
  local id="$1"
  if is_macos; then
    security delete-generic-password -s "$VAULT_SERVICE" -a "$id" 2>/dev/null || true
  else
    rm -f "${HOME}/.config/famtastic/vault.d/$(echo "$id" | tr '/' '_')"
  fi
  if [[ -f "$INDEX_FILE" ]]; then grep -vxF "$id" "$INDEX_FILE" > "$INDEX_FILE.tmp" && mv "$INDEX_FILE.tmp" "$INDEX_FILE"; fi
  echo "vault: removed $id"
}

case "${1:-help}" in
  read)   read_secret "${2:?secret-id required}" ;;
  write)  write_secret "${2:?secret-id required}" "${3:-}" ;;
  list)   list_secrets ;;
  remove) remove_secret "${2:?secret-id required}" ;;
  *) echo "Usage: vault.sh {read|write|list|remove} <secret-id> [value]"; exit 1 ;;
esac
