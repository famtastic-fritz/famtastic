---
title: MCP stack wiring (obsidian / basic-memory / vault-search)
type: note
permalink: shay-memory/operational/mcp-stack-wiring
tags: [mcp, vault-search, basic-memory, obsidian, wiring, operational]
---

# Shay MCP stack — wiring

Promoted from hot memory 2026-06-06 (tiering MEMORY.md). Recall on demand when
working on MCP servers, vault search, or memory tooling.

- **obsidian** — WIRED.
- **basic-memory** — WIRED, allowlisted, scoped to the **Shay-Memory** project
  (`~/famtastic/obsidian/Shay-Memory`).
- **vault-search** — WIRED via HTTP url `http://127.0.0.1:8766/mcp`,
  launchd-managed `com.famtastic.vault-search`. **NEVER run it as a gateway stdio
  child.**

## Index
- 336 files / 5337 chunks at `~/.shay/tools/vault-semantic-mcp/vault.db`.
- Re-index: `.venv/bin/python server.py --reindex` (incremental by mtime;
  `--force` wipes and rebuilds).

## Why vault-search must stay out-of-process
Buglog **#208**: heavy-ML stdio children crash the gateway — onnxruntime
teardown drops basic-memory. Keep ML-heavy MCP servers as their own
launchd/HTTP services, not gateway stdio children.
