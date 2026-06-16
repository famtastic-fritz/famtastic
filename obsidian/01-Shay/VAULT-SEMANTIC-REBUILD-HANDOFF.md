---
title: VAULT-SEMANTIC-REBUILD-HANDOFF
type: note
permalink: famtastic/01-shay/vault-semantic-rebuild-handoff
---

# Vault-Semantic Rebuild — handoff for Shay (2026-06-05)

> Rebuild the whole-vault semantic search MCP (the "great memory" upgrade). The nuke wiped
> ~/.shay/tools/vault-semantic-mcp/, so it's a full rebuild. Recipe from the buglog +
> RESTORE-SHAY-MEMORY-WIRING.md. **CRITICAL: run it as a standalone HTTP service, NOT a gateway
> stdio child** — onnxruntime's slow teardown destabilizes gateway restarts (drops basic-memory).

## Goal
A read-only `search_vault(query)` tool so Shay recalls the vault by MEANING, not keywords. Local
FastEmbed (bge-small-en-v1.5), local vector store. $0, no API.

## Steps
1. **Recreate the server** at `~/.shay/tools/vault-semantic-mcp/`:
   - venv with: `fastembed`, `sqlite-vec` (or a simple numpy cosine store), `fastmcp`.
   - Indexer: walk `~/famtastic/obsidian/`, chunk every `.md` (~400–500 tokens/chunk), embed each
     chunk with FastEmbed `bge-small-en-v1.5`, store {vector, source_path, heading, excerpt} in sqlite-vec.
   - Tool `search_vault(query, top_k=6)`: embed the query, return the top_k nearest chunks
     (path + heading + excerpt). READ-ONLY — never writes/mutates notes.
   - HTTP transport: `VSM_TRANSPORT=http` → `mcp.run(transport='http', host='127.0.0.1', port=8766)`.
2. **Build + test STANDALONE first** (do NOT touch the gateway yet): run the indexer, start the HTTP
   service, curl/test that `search_vault` returns relevant hits. Prove it works in isolation.
3. **Wire into the gateway by URL** (NOT stdio): add `vault-search: { url: 'http://127.0.0.1:8766/mcp' }`
   to the mcp config; reload MCP.
4. **Persistence:** install a launchd plist so the HTTP service survives reboot
   (template: `~/.shay/tools/vault-semantic-mcp/com.famtastic.vault-search.plist.template`, or write fresh).
5. **Re-index:** index covers the CURRENT vault (it's grown a lot today). Add a re-index on service
   start (or a cron) so new notes get embedded over time.
6. **Verify:** `shay mcp list` shows vault-search connected; ask a fuzzy/meaning query
   ("what did we decide about money") → confirm it pulls relevant notes by meaning.

## DO NOT
- Add it as a gateway **stdio** child (the prior crash — CancelledError drops basic-memory).
- Let it write to the vault (read-only recall only).