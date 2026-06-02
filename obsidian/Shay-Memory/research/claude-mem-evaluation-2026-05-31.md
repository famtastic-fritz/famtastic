---
title: claude-mem-evaluation-2026-05-31
type: note
permalink: shay-memory/research/claude-mem-evaluation-2026-05-31
---

# claude-mem Evaluation — 2026-05-31

Source: https://github.com/thedotmack/claude-mem (creator: Alex Newman / @thedotmack)
Docs: https://docs.claude-mem.ai
Verdict: **INSTALL-BEHIND-FLAG** (manual, opt-in — do NOT auto-install)

---

## 1. What it is (verified, not fabricated)

Repo metadata pulled live from the GitHub API on 2026-05-31:
- Stars: **79,906** · Forks: 6,878 · Language: ~90% TypeScript
- License: **Apache-2.0** · Archived: no · Last push: **2026-05-29** (actively maintained)
- Description: "Persistent Context Across Sessions for Every Agent." Works with Claude Code, OpenClaw, Codex, Gemini, Hermes, Copilot, OpenCode, etc.

**How it hooks into Claude Code:** via **5 lifecycle hooks** — SessionStart, UserPromptSubmit, PostToolUse, Stop, SessionEnd (plus a smart install pre-hook). It also ships **4 MCP tools** (`search`, `timeline`, `get_observations`, plus a skill-query interface) for retrieving memories, and a **background worker service** (Express HTTP API on **port 37777**, managed by **Bun**) that serves a web viewer and search endpoints.

**What it stores and where:**
- Config + data live under **`~/.claude-mem/`** (`settings.json`).
- **SQLite DB with FTS5** full-text index over sessions/observations/summaries.
- **Chroma vector DB** for hybrid semantic + keyword search.
- It captures tool usage during sessions and AI-compresses it into semantic summaries, then injects relevant context back at SessionStart.
- It **auto-generates `CLAUDE.md` in project folders.**

**Install method:** `npx claude-mem install` (Node ≥18). Also installable as a Claude Code plugin: `/plugin marketplace add thedotmack/claude-mem`. **Bun ≥1.0 is required and auto-installed by the npx installer if missing.**

**Security/privacy:** No external transmission is documented — data is local. Observations are stored **in plaintext** in the local SQLite DB. Sensitive content can be wrapped in `<private>` tags to exclude it from capture. Note: AI compression of observations implies an LLM call path — local SQLite is the store, but confirm whether summarization uses your existing Claude/API plan before trusting "fully local."

---

## 2. Overlap with what Fritz already has

| System | Role | Overlap with claude-mem |
|---|---|---|
| Claude Code native memory (`~/.claude`, MEMORY.md auto-memory) | Per-project facts + feedback index | **High** — both inject cross-session context at session start |
| OpenWolf `.wolf/` (anatomy/cerebrum/buglog/memory) | Curated, git-tracked project intelligence + do-not-repeat rules | **Medium** — OpenWolf is hand/agent-curated and versioned; claude-mem is auto-captured and unversioned. Different philosophy, same goal |
| auto-MEMORY.md | Indexed feedback/project memory | **High** — direct functional overlap with claude-mem's auto-summaries |
| Shay's Obsidian brain + basic-memory | Long-form knowledge vault, semantically searchable | **Medium** — claude-mem adds a *second* vector store (Chroma) over session transcripts specifically |

**Net:** claude-mem is **largely redundant** with the existing stack for cross-session memory, and **complementary** only in one area — it auto-captures raw *tool-call/session* telemetry that none of the current systems capture automatically (OpenWolf and MEMORY.md are curated, not auto-logged). The current stack is deliberately curated and git-tracked; claude-mem trades that for automatic-but-noisy capture.

---

## 3. Verdict — INSTALL-BEHIND-FLAG (do not auto-install)

Reasoning:
- **Conflict risk #1 — `CLAUDE.md` auto-generation.** claude-mem writes `CLAUDE.md` into project folders. Fritz has a heavily curated, git-tracked `CLAUDE.md` plus a strict non-negotiable documentation regime. Auto-generation could clobber or collide with it. Unacceptable without sandboxing.
- **Conflict risk #2 — secrets capture.** `~/.claude/settings.json` holds **live plaintext secrets** (a GitHub PAT and a Gemini API key in `env`). claude-mem's PostToolUse hook captures tool I/O into a plaintext SQLite store. Tool output containing those tokens (or any secret surfaced mid-session) would be persisted unencrypted under `~/.claude-mem/`. This is the single biggest reason not to flip it on globally.
- **Conflict risk #3 — system footprint.** The installer auto-installs **Bun** (not currently present) and runs a **background HTTP worker on port 37777**. That is a real change to the machine, not just a config edit.
- **Redundancy.** High functional overlap with native memory + auto-MEMORY.md + OpenWolf + basic-memory. The marginal gain is auto-captured session telemetry, which is also the noisiest, least-curated form of memory.
- **In its favor:** Apache-2.0, ~80k stars, very active (pushed 2 days ago), local-first, no documented exfiltration, non-destructive to hooks (see below).

Recommend: try it **opt-in on a throwaway/non-FAMtastic project first**, with secrets rotated out of `settings.json` env beforehand, before ever enabling near the FAMtastic repo.

---

## 4. Install result — NOT installed (deliberately deferred)

I did **not** install. The live setup was inspected and backed up conceptually but left untouched. Findings from inspection:

- `~/.claude/settings.json` has **no `hooks` block** and `settings.local.json` contains only `permissions` — so claude-mem's hook install would *add* hooks rather than overwrite existing ones (good). A `.bak` already exists (`settings.json.bak`).
- `~/.claude-mem/` does **not** exist yet (clean slate).
- **Bun is not installed** — the installer would pull it in.
- `dangerouslySkipPermissions: true` is set globally, so an installer would write freely with no prompts — extra reason to run it manually and watch it.

### Manual install steps for Fritz (when ready, opt-in)

1. **Rotate / remove secrets first.** Move `GITHUB_PERSONAL_ACCESS_TOKEN` and `GEMINI_API_KEY` out of `~/.claude/settings.json` `env` into a shell-sourced env or a secrets manager, so they can't land in claude-mem's plaintext capture.
2. **Back up config:**
   `cp ~/.claude/settings.json ~/.claude/settings.json.premem.bak`
   `cp ~/.claude/settings.local.json ~/.claude/settings.local.json.premem.bak`
3. **Trial on a scratch project, not FAMtastic.** `cd` into a throwaway repo first so any auto-generated `CLAUDE.md` lands there, not in `~/famtastic`.
4. Run `npx claude-mem install` and watch what it touches (it will install Bun and start the port-37777 worker).
5. After install, **diff `~/.claude/settings.json`** against the backup to confirm only a `hooks` block was added and the `env`/`enabledPlugins` sections are intact.
6. Verify the worker: `curl localhost:37777` and confirm the SQLite DB appears under `~/.claude-mem/`.
7. If you keep it, add `<private>` discipline and confirm `CLAUDE.md` auto-generation is disabled or gitignored in any real repo. To remove: `npx claude-mem uninstall` and restore the `.premem.bak` files.

---

## 5. Gotchas

- Captures tool I/O to **plaintext SQLite** — dangerous given current plaintext secrets in `settings.json`.
- **Auto-writes `CLAUDE.md`** into project dirs — direct collision with FAMtastic's curated CLAUDE.md and doc rules.
- Installs **Bun** system-wide and runs a **persistent background worker (port 37777)**.
- `dangerouslySkipPermissions: true` means the installer runs unattended — run it deliberately and review the diff.
- Functionally **redundant** with native memory + MEMORY.md + OpenWolf + basic-memory; the only net-new is raw session telemetry capture.
- "Fully local" should be confirmed against the AI-compression step (which model/plan summarizes observations).