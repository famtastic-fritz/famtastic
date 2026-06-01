---
title: ADVERSARIAL-REVIEW-adopt-plan-2026-05-31
type: note
permalink: shay-memory/reviews/adversarial-review-adopt-plan-2026-05-31
---

# Adversarial Review — ADOPT-PLAN-2026-05-31

Reviewer: skeptic pass, read-only. Goal: break the plan before it runs to completion autonomously.
Plan reviewed: `/Users/famtasticfritz/famtastic/obsidian/Shay-Memory/research/ADOPT-PLAN-2026-05-31.md`

## Ground-truth state at review time

- **Gateway is LIVE and busy.** PID 31947 = `python -m shay_cli.main gateway run --replace`, up since 02:03, platforms `api_server` + `telegram` both `connected` (`/Users/famtasticfritz/.shay/gateway_state.json`).
- **Kanban dispatcher runs INSIDE the gateway.** `kanban.dispatch_in_gateway: true`, `dispatch_interval_seconds: 60`, `failure_limit: 2` (config.yaml). Dispatch tick calls `load_config()` every cycle (`shay_cli/kanban.py:126-128`).
- **A second autonomous loop is ALSO running:** `.ralph/loop.py` (PID 58104 shell → `python3 .ralph/loop.py`) doing gated build_app iterations in `shay-desktop-electron`. This is a different loop from the gateway and from `/goal`.
- **basic-memory MCP live** (PID 57627). DB = `/Users/famtasticfritz/.basic-memory/memory.db`, 23.2 MB, WAL active. This is the 340-session/15.8k-msg store the plan must not corrupt.
- **Config loading is mtime-cached, not snapshotted:** `load_config()` returns a deepcopy of a cache keyed on `(path, mtime_ns, size)` (`shay_cli/config.py:77-83`). Editing config.yaml invalidates the cache; the *next* `load_config()` call anywhere re-reads from disk. There is no atomic "config frozen at gateway start" — long-lived loops pick up edits on their next tick. This is the single most important fact for safety.
- **`_config_version: 23`** — schema is versioned; hand-edits that desync from the writer's expected shape can trip the deep-merge.

### What is actually installed vs. net-new
| Item | Reality |
|---|---|
| caveman skill | **NOT installed** — no match under `~/.shay/skills/`, no marketplace copy found. Net-new acquisition. |
| rtk | **NOT the plan's rtk.** Only `~/.gsd/agent/bin/rtk` (unrelated GSD tool) + an app-support dir exist. The "rtk CLI proxy to compress tool output" is net-new. |
| token-optimizer | **NOT installed.** Net-new. |
| holographic | Installed as a **Hermes plugin** (`shay-shay/plugins/memory/holographic/holographic.py`); pure-numpy 1024-dim atom encoder. Own representation, **does not read/write basic-memory's sqlite**. |
| credential pools | **Exists today.** `agent/credential_pool.py`, `shay_cli/auth.py:561-1098`, config key `credential_pool_strategies: {}`. Config flag, not net-new. |
| execute_code | **Exists today.** Config block `code_execution:` (config.py:1370) already present and populated. Config flag, not net-new. |
| /goal persistent loop | **Exists today.** `shay_cli/goals.py` ("Persistent session goals — the Ralph loop for Shay-Shay"); config `goals.max_turns: 20`. Net-new is only the GOAP wiring (D3), not the loop. |
| shay mcp serve | **Exists today.** Referenced `shay_cli/tips.py:92`. Real subcommand. |
| /reload-mcp | **Exists today.** `shay_cli/commands.py:176`, gated by `approvals.mcp_reload_confirm: true`. This is the hot-reload path for C2. |
| holographic/kanban/langfuse plugins (C1) | Bundled plugin tree exists; enabling is a config/plugins action. |

---

## Ranked findings

### S1 — CRITICAL: Plan greenlights running to completion *autonomously* while two live loops are mid-flight. Do not.
The gateway dispatcher and the `.ralph/loop.py` build loop are both consuming the same config and the same provider credentials *right now*. Several adopt items mutate exactly those (model/provider routing via credential pools D1, `code_execution` D2, MCP set C2, memory provider B). Because `load_config()` is mtime-cached and re-read per tick, a mid-run edit lands inside an in-flight dispatch/build iteration with no transaction boundary.
**Fix:** Do NOT run section D (capabilities that change routing/tools) or C2 (MCP changes) unattended while loops are active. Quiesce first: confirm kanban queue is drained or pause dispatch (`kanban.dispatch_in_gateway: false`), and stop/checkpoint `.ralph/loop.py`, before any config edit that touches model/provider/MCP/tools. A/F items are safe to do live.

### S2 — CRITICAL: caveman is uninstalled AND its scoping (A1) is unverifiable as written.
The plan asserts caveman can be "scoped to WORKER lanes + commits + reviews ONLY (NOT user-facing chat)" at `intensity=ultra`. Nothing in the installed tree supports this claim — the skill isn't present, so there is no manifest, no scoping hook, and no evidence Shay's skill-injection layer (`agent/prompt_builder.py`, `skills.max_count: 40`, `always_include`) can apply a skill to *delegation/worker turns but not the primary chat turn*. Shay's skill system injects into "each Claude turn's system prompt" globally (config.yaml comment, lines 364-379); per-lane scoping is not a demonstrated feature.
**Risk:** caveman bleeds into user-facing chat → Shay starts talking in compressed/telegraphic style to Fritz. This is the exact failure the plan tries to avoid, and the plan has no enforcement mechanism for it.
**Fix:** Before adopting, install caveman in a *disabled* state and prove the scoping path empirically: (a) confirm delegation children get a separate system prompt from the primary agent (`delegation.*` block + `inherit_mcp_toolsets`), and (b) wire caveman ONLY into the delegation/worker prompt, not `always_include`. If no clean delegation-only injection point exists, **flag A1 as not cleanly scopable and defer it** — ship A2 (readable concise directive) only. Treat A1 as do-not-run-unattended regardless.

### S3 — HIGH: B2 "enable holographic as the single retrieval provider" risks silently sidelining the 23MB basic-memory store, and `memory.provider` is the live switch.
`config.yaml memory.provider: ''` (empty = current default path that feeds basic-memory + Smart Connections). Flipping `memory.provider` to holographic is a one-line edit the dispatcher will pick up next tick (S1). Holographic uses its own numpy atom store and does NOT migrate the existing 23MB sqlite — so retrieval would quietly degrade to an empty/cold holographic index while the real memory sits unused. No data is *destroyed* (good — different store), but recall regresses with no error.
**Fix:** Do NOT set holographic as the *single* provider. If adopted at all, run it *additively/shadow* alongside basic-memory and compare recall before any cutover. Back up `~/.basic-memory/memory.db` (cp with WAL checkpointed) before touching `memory.*`. Keep `memory.provider` change out of any unattended batch.

### S4 — HIGH: B1 L0→L3 schema "restructuring" over the existing vault/db has no migration and no rollback in the plan.
Re-shaping 15.8k messages into L0/L1/L2/L3 is a bulk transform. basic-memory's own history (do-not-repeat in cerebrum: "whole-vault mutation finding") shows bulk vault mutation is dangerous. The plan says "adopt schema over existing infra" with no dry-run, no backup step, no idempotency guarantee.
**Fix:** Treat B1 as additive metadata/tagging on NEW writes going forward, not a retro-rewrite of existing notes. If a retro pass is wanted, it is its own reviewed task with a vault snapshot + git tag first. Do-not-run-unattended.

### S5 — MEDIUM: C2 MCP additions can violate the ≤6 active-MCP budget and the basic-memory selective-tool savings.
Currently active MCP: obsidian, basic-memory (trimmed to 7 tools), vault-search (HTTP). Adding Context7 + GitHub + Filesystem = 6 total, at the ceiling, and each injects tool schemas into *every* Claude turn — directly counter to the cap-burn goal the plan opens with. Filesystem MCP overlaps Shay's native `file`/`terminal` toolsets (redundant token cost). GitHub MCP needs a token.
**Fix:** Add via `/reload-mcp` (hot-reload-safe, gated by `mcp_reload_confirm`), one at a time, each `enabled` only when used. Drop Filesystem (redundant with native tools). Apply the same `tools.include` trimming used for basic-memory to Context7/GitHub. Re-measure per-call token cost after each add; abort if it rises.

### S6 — MEDIUM: D1 credential pools is real but mis-scoped as "fixes both-vendors-capped." It does NOT.
Credential pools rotate *multiple keys for the same provider*. The current cap problem is *Claude (Anthropic) + Codex (OpenAI) both rate-capped* — two different providers (see memory: `project_codex_subscription_capped.md`). A same-provider key pool only helps if Fritz has *multiple* Anthropic or OpenAI keys; it does nothing for cross-vendor exhaustion. The existing `fallback_providers` chain (gemini → ollama hermes3) is what actually saves the both-capped case, and it's already configured.
**Fix:** Reframe D1 as "add a second Anthropic/OpenAI key to the pool IF one exists." Otherwise it's a no-op. Don't bill it as the cap fix. Low blast radius (additive to `credential_pool_strategies`), hot-reload-safe, but verify a key actually exists first.

### S7 — MEDIUM: D3 `/goal` autonomous loop collides with the two loops already running.
`goals.py` is itself "the Ralph loop for Shay-Shay." Standing up a `/goal` loop while `.ralph/loop.py` AND the gateway dispatcher are running means three autonomous loops sharing capped credentials — guaranteed faster cap burn, possible duplicate work, and contention on state.db (already 298MB with active WAL).
**Fix:** Pick ONE loop. Do not launch `/goal` unattended while `.ralph/loop.py` or kanban dispatch is active. `goals.max_turns: 20` is a useful guardrail — keep it low. Do-not-run-unattended.

### S8 — LOW: A5 `/caveman-compress` of CLAUDE.md/SOUL.md/MEMORY.md is irreversible-in-place editing of source-of-truth docs.
The "~46% cut" is attractive but these files are load-bearing (SOUL.md is Shay's persona; MEMORY.md is the memory index). A lossy compression pass that drops a nuance changes behavior permanently.
**Fix:** Compress to *copies*, diff, and keep originals under git. SOUL.md already has a `.backup`. Never compress in-place unattended.

### S9 — LOW: A3 rtk / A4 token-optimizer are unvetted net-new third-party CLIs given shell/pipe access.
The plan itself flags `concise` as a 1-star repo to avoid; rtk and token-optimizer get no such scrutiny. They'd sit in the tool/terminal path compressing build/test output — i.e. they can mangle the exact output the `.ralph` gate parses for PASS/FAIL. A bad compressor breaks the typecheck gate silently.
**Fix:** Vet provenance (stars/maturity — same bar F1 applies to model discovery). Install behind a feature flag, test against `.ralph` gate output before trusting. Not unattended.

### S10 — LOW (safe): F1 discovery cron star/maturity filter and A2 concise directive are clean.
F1 only edits a cron filter; A2 is a personality/system-directive string (config already has a `concise` personality at `display.personality: concise`). Both are low-risk, reversible, hot-reload-safe.

---

## Hot-reload-safe vs needs-restart vs do-not-run-unattended

**Hot-reload-safe (picked up on next dispatcher/agent tick via mtime cache, or via `/reload-mcp`):**
- F1 cron filter edit
- A2 concise directive (config string / personality)
- C2 MCP adds — *only* through `/reload-mcp` (gated), one at a time
- D1 credential-pool key add (additive to `credential_pool_strategies`) — IF a real extra key exists
- D2 `code_execution` config tweak (already a live block)

**Needs explicit restart / new session to take full effect:**
- New skill installs (caveman, A1) — skill set is built into the system prompt; safest applied on a fresh session, not mid-loop
- Plugin enables C1 (kanban/langfuse/holographic plugin load)
- `memory.provider` change (B2) — wired deep enough that a clean restart is safer than mid-tick swap
- `shay mcp serve` (D4) — starts a new server process

**DO NOT run unattended (require a human + quiesced loops + backups):**
- A1 caveman scoping (S2 — unproven scoping, chat-bleed risk)
- A5 caveman-compress of SOUL/CLAUDE/MEMORY (S8)
- B1 L0→L3 retro restructuring (S4)
- B2 holographic-as-sole-provider cutover (S3)
- D3 `/goal` loop launch while other loops run (S7)
- A3/A4 rtk + token-optimizer in the build/test path (S9)

---

## SAFE run order

0. **Quiesce.** Confirm kanban queue drained or set `kanban.dispatch_in_gateway: false`; checkpoint/stop `.ralph/loop.py`. Snapshot: `cp ~/.shay/config.yaml ~/.shay/config.yaml.bak-adopt`; checkpoint + copy `~/.basic-memory/memory.db`; `git tag` the obsidian vault.
1. **F1** discovery cron star/maturity filter (live, trivial, reversible).
2. **A2** readable concise directive for user-facing chat (config string).
3. **C2** MCP P0 — add Context7 first via `/reload-mcp`, trimmed tool list, measure token delta. Then GitHub (needs token) the same way. **Drop Filesystem** (redundant). Abort if per-call tokens rise.
4. **D1** credential-pool — only if a second same-provider key exists; additive, reload-safe.
5. **D2** confirm/tune existing `code_execution` block (no structural change).
6. **A1 caveman — PROVE SCOPING FIRST (attended).** Install disabled, verify delegation-only injection path empirically. If it can't be kept out of user chat, **defer**. Only then enable for workers, on a fresh session.
7. **C1** plugin enables (attended; restart). holographic plugin enabled **shadow/additive only**.
8. **B-track (attended, never unattended):** B3 reflection cron first (it formalizes existing loop, additive). B1 only as forward-going tagging, not retro-rewrite. **B2 holographic stays additive — no sole-provider cutover** until shadow recall beats basic-memory in a measured comparison.
9. **D3/D4/D5 last, attended:** never with another loop live (S7). `shay mcp serve` is fine to expose once routing is stable.
10. **A5 + A3/A4 last, attended, to-copies / behind flags** (S8, S9).
11. Un-quiesce: re-enable dispatch / restart `.ralph` loop.

---

## VERDICT

**No — the adopt plan is NOT safe to run to completion autonomously as written.** Roughly half of it (F1, A2, the reload-safe config flags, additive credential/MCP adds) is genuinely low-risk and could be batched. But five items (A1 caveman scoping, A5 in-place compression, B1 retro restructuring, B2 sole-provider cutover, D3 third concurrent loop) are irreversible-in-place and/or behavior-changing, and three of them touch subsystems (config, memory provider, credentials) that **two live loops are actively reading right now** — with no transaction boundary, because config is mtime-cached and re-read per tick.

**What MUST change before any run:**
1. **Quiesce the live loops** (pause kanban dispatch, stop `.ralph/loop.py`) before any config edit touching model/provider/MCP/memory. The plan currently ignores that the gateway is busy.
2. **Re-scope A1:** prove caveman is delegation-only or defer it. As written its scoping is unverified and will likely bleed into user chat.
3. **Re-scope B2/B1:** holographic and L0→L3 must be **additive/shadow**, never an in-place cutover or retro-rewrite, with a basic-memory backup taken first.
4. **Correct the D1 premise:** credential pools do not fix cross-vendor cap exhaustion; `fallback_providers` already does. Don't sell it as the cap fix.
5. **Split the plan into "batchable-live" vs "attended-only"** and run only the former unattended.