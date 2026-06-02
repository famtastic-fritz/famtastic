---
title: track4-safe-prep-2026-05-31
type: note
permalink: shay-memory/research/track4-safe-prep-2026-05-31
---

# Track 4 (ADOPT plumbing) — Safe Prep Phase Report, 2026-05-31

Verdict: **CONDITIONAL GO** for the batchable-live subset only; **NO-GO** for autonomous
run-to-completion. caveman config-scoping is **UNPROVEN** and must be deferred or run
attended. No config edit, no gateway restart, and no installs were performed in this prep pass.

---

## 1. Backup status — DONE / VERIFIED

- Source: `~/.shay/config.yaml` (16017 bytes, mode 0600).
- Backup: `~/.shay/backups/config.yaml.1780274687` (stamp from `date +%s`).
- `cmp` reported no differences → **byte-identical**. Backup confirmed.

Memory-track backup targets exist (for the B-track prereq, NOT yet backed up here — out of
this prep's scope):
- basic-memory DB present: `~/.basic-memory/memory.db` (~27.6 MB). Must be copied before any
  B1/B2 memory change.
- Obsidian vault `~/famtastic/obsidian/` is **not a git repo** (no `.git`), so the adversarial
  review's "git tag the vault" quiesce step is not currently possible — flag for Fritz.

## 2. caveman scoping verdict — **UNPROVEN (defer or attended-only)**

What caveman actually is: `JuliusBrussee/caveman` — a **token-compression / telegraphic-output
skill**, not a config-file editor. "Config-scoping" in Track 4 A1 means scoping the skill's
*injection* (worker/delegation lanes + commits + reviews only, NOT user-facing chat). It does
**not** edit, copy, or wrap `config.yaml`. (A separate item, A5 `/caveman-compress`, would
compress CLAUDE/SOUL/MEMORY docs — that is in-place doc editing, also deferred.)

Installed-state evidence:
- caveman is **NOT installed**: no match under `~/.shay/skills/` (84 skill dirs enumerated,
  none named caveman), no marketplace copy anywhere under `~`. Net-new acquisition.

Scopability evidence (why UNPROVEN):
- `agent/prompt_builder.py::build_skills_system_prompt()` builds the skill index keyed on
  `(skills_dir, external_dirs, tools, toolsets, platform, disabled, max_count, always_include)`.
  There is **no "is delegation child / is worker turn" parameter**. The only exclusion lever is
  the per-platform `disabled` skill list and `always_include` — both global per turn, not
  per-lane.
- Delegation children run on a **different model entirely**: `delegation.model: hermes3:latest`
  via Ollama (`base_url: http://localhost:11434/v1`), with `inherit_mcp_toolsets: true`. A Claude
  *skill* injected into the Claude primary system prompt would not even reach the Ollama worker
  turns, and conversely nothing injects a Claude skill selectively into worker-only Claude turns.
- Conclusion: there is **no demonstrated delegation-only / worker-only skill-injection point**.
  As written, A1 would land caveman in `always_include` or the global index and **bleed into
  user-facing chat** — the exact failure the plan tries to avoid. This confirms adversarial
  finding S2.
- Required before adopting: install **disabled**, then empirically prove either a
  delegation-only injection path or a platform/lane `disabled`-list mechanism that keeps it off
  the primary chat turn. If none exists, **defer A1**. Treat as do-not-run-unattended regardless.

## 3. Gateway status + quiesce procedure (NOT executed)

Gateway IS running:
- launchd label **`ai.shay.gateway`** (`~/Library/LaunchAgents/ai.shay.gateway.plist`,
  `RunAtLoad: true`, `KeepAlive` only on non-successful exit).
- Live process PID **31947**: `python -m shay_cli.main gateway run --replace` (up since 02:03).
  Note: running interpreter is Homebrew python, while the plist points at
  `~/famtastic/shay-shay/.venv/bin/python` — the live instance looks manually/replace-launched,
  so a plain `launchctl kickstart` may not match the running PID. Verify before relying on launchd.
- A live Claude Code loop (PID 53892, opus-4-8) is also active.
- A live in-gateway loop exists: `kanban.dispatch_in_gateway: true` (config line 449).

Config is **mtime-cached and re-read per tick** — editing it in place hot-swaps it mid-run with
no transaction boundary. Do not edit while loops are live.

Safe quiesce path (drain-aware, do NOT run yet):
1. Drain the kanban loop: confirm the kanban queue is empty, or set
   `kanban.dispatch_in_gateway: false` (attended) before any model/provider/MCP/memory edit.
2. Checkpoint/stop any `.ralph/loop.py` loop if running.
3. Use the **graceful drain restart**, not SIGTERM/kill: the CLI wires **SIGUSR1** in
   `gateway/run.py` to `request_restart(via_service=True)`, which drains in-flight agent runs up
   to `agent.restart_drain_timeout` before relaunching (see
   `shay_cli/gateway.py::_graceful_restart_via_sigusr1` / `_request_gateway_self_restart`). The
   user-facing command is `shay gateway restart` (drain-aware); `shay gateway stop` to halt.
4. Apply config changes only while quiesced, then `shay gateway restart` and un-quiesce
   (re-enable dispatch).

Anything reload-safe and additive (string flags, additive credential/MCP adds) can be staged on
a fresh session without a hard restart, but still confirm no live loop is mid-tick.

## 4. Agreed adopt sequence (from ADOPT-PLAN + adversarial review)

Split: **batchable-live** vs **attended-only**. Run only the former unattended.

Batchable-live (low-risk, reversible):
1. **F1** — discovery-cron star/maturity filter (trivial, reversible).
2. **A2** — readable "concise" directive for user-facing chat (config string; already a homegrown
   skill at `~/.shay/skills/communication/concise/`).
3. **C2 (partial)** — MCP P0: add **Context7** first via `/reload-mcp`, trimmed tool list, measure
   token delta; then **GitHub** (needs token) same way. **Drop Filesystem** (redundant). Abort if
   per-call tokens rise. Keep active MCP ≤ 6.
4. **D1** — credential pool, only if a second same-provider key exists; additive, reload-safe.
   NOTE: `credential_pool_strategies: {}` is currently empty; and D1 does NOT fix cross-vendor cap
   exhaustion — `fallback_providers` (config lines 13–21) already does. Do not sell it as the cap fix.
5. **D2** — confirm/tune existing code-execution block (no structural change).

Attended-only (irreversible / behavior-changing — never unattended):
6. **A1 caveman** — PROVE SCOPING FIRST (see §2). Install disabled; if not cleanly delegation-only,
   **defer**. Only enable for workers on a fresh session.
7. **C1** — plugin enables (restart); holographic plugin **shadow/additive only**.
8. **B-track:** B3 reflection cron first (additive, formalizes existing loop) → B1 forward-going
   tagging only (no retro-rewrite) → **B2 holographic stays additive, NO sole-provider cutover**
   until shadow recall beats basic-memory in a measured comparison. Back up `memory.db` first.
9. **D3 /goal, D4 shay mcp serve, D5 webhooks** last — never with another loop live (S7).
   `shay mcp serve` is fine to expose once routing is stable.
10. **A5 /caveman-compress + A3 rtk / A4 token-optimizer** last, attended, to-copies / behind flags.
11. Un-quiesce: re-enable dispatch / restart loops.

## 5. Blockers requiring Fritz

- **B1: caveman scoping unproven** — needs a decision: build a delegation-only injection point, or
  defer A1. Do-not-run-unattended.
- **B2: obsidian vault is not git-tracked** — the planned "git tag the vault" quiesce safeguard is
  unavailable; need an alternative vault snapshot before any B1/B2 memory work.
- **B3: live loop running** — `kanban.dispatch_in_gateway: true` plus an active Claude Code loop;
  Fritz must approve quiescing (pause dispatch + drain restart) before any model/provider/MCP/memory
  config edit.
- **B4: launchd/PID mismatch** — running gateway interpreter differs from the plist's `.venv`
  python; confirm the correct restart path so a quiesce doesn't spawn a duplicate.
- **B5: memory.db not yet backed up** — required before any B-track change (this prep only backed
  up config.yaml).
