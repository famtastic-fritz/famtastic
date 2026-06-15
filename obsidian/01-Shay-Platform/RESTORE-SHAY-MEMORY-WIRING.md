---
title: RESTORE-SHAY-MEMORY-WIRING
type: note
permalink: famtastic/01-shay-platform/restore-shay-memory-wiring
---

# RESTORE Shay Memory Wiring — executable handoff (2026-06-04)

> Hand this to Shay herself OR a local Claude Code session **on Fritz's Mac**. It re-registers the
> 3 MCP servers the nuke un-registered. Everything here is reconstructed from `.wolf/buglog.json`
> (entries on vault-semantic-search, basic-memory, and the Claude-Code-cap burn). The code still
> exists locally — this is a RE-REGISTER, not a rebuild. Run it in ONE focused session.

## Goal
Restore Shay's memory to the known-good state: **35 tools from 3 MCP servers (obsidian 2 +
basic-memory ~7 + vault-search 6), state=running, zero failures** — so she can recall the
Obsidian vault (incl. June-2 work).

## The 3 servers + the gotchas (from buglog — do not relearn these the hard way)

### 1. vault-search (vault-semantic-search) — whole-vault semantic recall
- **Exists at:** `~/.shay/tools/vault-semantic-mcp/` (venv: `.venv/bin/python server.py`).
  Local FastEmbed `bge-small-en-v1.5`, ~521 chunks, read-only.
- **⚠️ GOTCHA (buglog #3367/#3393):** do NOT add it as a gateway **stdio** child — onnxruntime's
  ~30–40s teardown destabilizes restarts (CancelledError drops basic-memory). 
- **CORRECT WIRING:** run it as a **background HTTP service** and wire by URL:
  ```bash
  VSM_TRANSPORT=http ~/.shay/tools/vault-semantic-mcp/.venv/bin/python \
    ~/.shay/tools/vault-semantic-mcp/server.py   # serves http://127.0.0.1:8766/mcp
  ```
  Gateway config: `vault-search: { url: 'http://127.0.0.1:8766/mcp' }`
- **Persistence:** install the launchd plist so it survives reboot:
  `~/.shay/tools/vault-semantic-mcp/com.famtastic.vault-search.plist.template`
  → `~/Library/LaunchAgents/com.famtastic.vault-search.plist` → `launchctl load` it.

### 2. basic-memory — scoped knowledge store
- **⚠️ GOTCHA (buglog):** basic-memory **rewrites notes it indexes.** Scope it to
  `~/famtastic/obsidian/Shay-Memory` ONLY — NEVER the whole vault (it already corrupted 2 notes once).
- Add a **`tools.include` allowlist** (~7 useful tools, not all 27) to cut token cost.
- Add via `shay mcp add` (discovery-first) or the `mcp_servers.basic-memory` config block.

### 3. obsidian — vault read (2 tools)
- Standard obsidian MCP server pointed at `~/famtastic/obsidian/`.

## Cost-burn prevention (buglog #3415/#3416 — this is what ate Codex/Claude)
Per-call context was ~55k tokens (a 22,600-token all-160-skills snapshot + 35 MCP schemas + a
`model=default`→HTTP404 bug). Apply in `~/.shay/config.yaml`:
- `skills.max_count: 40` (+ `skills.always_include`) → 22,600 → ~1,274 tokens
- `tools.include` allowlist on basic-memory → 35 → ~19 tools
- confirm `model.default: claude-sonnet-4-6` (already set ✓ — never the literal string `default`)

## Procedure
1. `shay mcp list` — confirm what's registered now (expect empty/missing).
2. Start vault-search as the HTTP service (above) + install its launchd plist.
3. `shay mcp add` (or config) → **obsidian** (`~/famtastic/obsidian/`), **basic-memory**
   (scoped to `Shay-Memory`, tools allowlist), **vault-search** (url `http://127.0.0.1:8766/mcp`).
4. Apply the cost-control config keys above.
5. `shay mcp test` each; `shay mcp list` should show 3 servers.
6. Verify: `shay doctor` clean; ask Shay "what did you work on June 2?" — she should retrieve from
   the vault (`obsidian/05-Captures/sessions/2026-06-02/`).

## After this
- Recover the **persona file** (the "black sista" identity — separate from SOUL); restore alongside SOUL.
- Git-back SOUL + persona into `obsidian/01-Shay/` so a future nuke = `git restore`.
- Then → **money**.