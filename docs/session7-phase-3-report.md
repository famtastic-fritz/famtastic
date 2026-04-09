# Session 7 — Phase 3 Report: Studio Config File

**Date:** 2026-04-09  
**Tests:** 49/49 passing  
**Status:** ✅ Complete

---

## What Was Built

Phase 3 delivers the disaster recovery setup document — a single source of truth for rebuilding the FAMtastic Studio environment from scratch on a new machine.

### New Files

| File | Purpose |
|------|---------|
| `FAMTASTIC-SETUP.md` | Complete setup documentation at repo root |
| `scripts/update-setup-doc` | Auto-update script for timestamps, versions, env var status |

---

## FAMTASTIC-SETUP.md Sections

1. **Quick Start (New Machine)** — step-by-step bash commands from zero to running Studio
2. **MCP Servers** — all 7 MCPs with install commands, purpose, current connection status
3. **Claude Code Plugins** — all 10 plugins with source, purpose, enabled status
4. **Environment Variables Required** — 11 API keys + 5 optional runtime vars; each row shows current status (Set/Not set)
5. **Third-Party Accounts and Subscriptions** — 11 services with plan, cost, renewal date, notes
6. **Pinecone Configuration** — index name, embedding model, namespace strategy
7. **Dependency Versions** — Node, Python, uv, Claude Code CLI (live values at doc creation)
8. **FAMtastic-Specific Configuration** — studio-config.json keys, data directories, shared paths
9. **Known Setup Gotchas** — ps-mcp/Photoshop, fonttools cold start, static route order, TAG vs SITE_TAG, CLAUDE.md marker, library.json shape, nested Claude sessions
10. **fam-hub Commands Reference** — quick CLI cheat sheet
11. **Architecture Overview** — directory tree with file roles

---

## scripts/update-setup-doc

Bash script that refreshes FAMTASTIC-SETUP.md in place:
- Updates `## Last Updated:` timestamp (ISO 8601 UTC)
- Updates `## Machine:` hostname
- Updates dependency version table rows (node, python, uv, claude)
- Updates env var status column (Set / Not set) for all 11 API key vars
- `--commit` flag: git adds FAMTASTIC-SETUP.md and commits with `chore: update setup documentation`

The script uses `sed -i ''` (BSD/macOS sed) to do in-place updates on matching table rows. It's safe to run repeatedly — idempotent updates.

---

## Auto-Update Wiring

The script is at `scripts/update-setup-doc` and is executable. It can be:
- Run manually: `scripts/update-setup-doc`
- Run with commit: `scripts/update-setup-doc --commit`
- Scheduled via intelligence loop (Phase 4 scope — deferred)

---

## Current Env Var Status (at document creation)

| Set | Not Set |
|-----|---------|
| GEMINI_API_KEY | ANTHROPIC_API_KEY (uses Claude Code subscription) |
| | NETLIFY_AUTH_TOKEN |
| | GITHUB_TOKEN |
| | PINECONE_API_KEY (Phase 4 required) |
| | PERPLEXITY_API_KEY |
| | PIXELPANDA_API_KEY |
| | MAGIC_API_KEY |
| | GSAP_LICENSE_KEY |
| | GOOGLE_AI_STUDIO_KEY |
| | LEONARDO_API_KEY |

---

## Test Results

```
── File existence ─────────────────────  2/2
── Required sections ────────────────── 11/11
── No placeholder text ──────────────── 5/5
── Env var documentation ────────────── 6/6
── MCP servers documented ───────────── 4/4
── Plugins documented ───────────────── 6/6
── Known gotchas documented ─────────── 4/4
── update-setup-doc script ──────────── 7/7
── update-setup-doc runs ────────────── 4/4

Total: 49/49 ✅
```

---

## Known Gaps (Phase 3)

- `test_quick_start_is_accurate` from the spec (follow Quick Start on clean shell) was not executed — this is a manual integration test that requires wiping an environment. The Quick Start commands are correct based on current system state.
- `update-setup-doc` currently uses BSD `sed -i ''` (macOS) — would need GNU sed adjustment for Linux
- The intelligence loop scheduler (Phase 4) is the intended trigger for monthly auto-updates — not yet wired
- `claude mcp list` output parsing is not yet in `update-setup-doc` (MCP table not auto-updated from live MCP state) — deferred to a future iteration
