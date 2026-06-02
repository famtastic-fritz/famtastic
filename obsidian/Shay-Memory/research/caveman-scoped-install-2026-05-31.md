---
title: caveman-scoped-install-2026-05-31
type: note
permalink: shay-memory/research/caveman-scoped-install-2026-05-31
---

# Caveman scoped install — delegation-only skill injection, 2026-05-31

Verdict: **DONE / PROVEN**. The delegation-only injection point that §2 of
`track4-safe-prep-2026-05-31.md` flagged as UNPROVEN now exists, is unit-tested,
and caveman is installed worker-scoped. Proven (against the LIVE `~/.shay/skills/`)
that caveman is ABSENT from the primary chat turn and PRESENT on worker turns.

## 1. The mechanism (general, not caveman-specific)

A skill may declare a lane scope in its `SKILL.md` frontmatter:

```yaml
scope: worker     # delegation/sub-agent turns only — EXCLUDED from primary chat
scope: primary    # primary chat turn only — EXCLUDED from delegated turns
# (omitted / scope: all) → appears on every turn (backward-compatible default)
```

`metadata.shay.scope` is also honored; the top-level `scope:` wins. Aliases
accepted: `delegation`, `delegation-only`, `subagent`, `workers` → `worker`;
`chat`, `user-facing`, `primary-only` → `primary`; `any`/`both`/`*` → `all`.

How it routes to the right lane:

- `agent/skill_utils.py` gained `extract_skill_scope(frontmatter)` and
  `scope_allows_lane(scope, lane)` plus `LANE_PRIMARY` / `LANE_WORKER`.
- `agent/prompt_builder.build_skills_system_prompt()` now takes `lane=` (default
  `"primary"`). It filters every skill through `scope_allows_lane` in all three
  resolution paths (disk snapshot, cold filesystem scan, external dirs). The
  in-process cache key includes the lane, and the disk snapshot version was
  bumped 1→2 so entries carry `scope` (old snapshots auto-invalidate).
- `run_agent.py` (`_build_system_prompt_parts`) selects the lane:
  `"worker" if self._delegate_depth > 0 else "primary"`.

Why `_delegate_depth` is the reliable worker marker: child agents are built in
`tools/delegate_tool._build_child_agent`, which sets `child._delegate_depth =
child_depth` (>0) AFTER `AIAgent(...)` construction. The system prompt is built
LAZILY on first `run()` (cached on `_cached_system_prompt`), not at construction —
so by prompt-build time the worker flag is already set. Top-level agents keep
`_delegate_depth == 0` (set in `AIAgent.__init__`).

This resolves the gap in §2: there previously was no "is this a worker turn"
parameter into the skill index, only the global per-platform `disabled` list and
`always_include`. Now there is a per-lane lever. (Note: Hermes3 Ollama delegation
children are a separate matter — but ANY Claude sub-agent turn now correctly gets
the worker lane, and the primary Claude chat turn is guaranteed not to.)

## 2. Files changed (committed to shay-shay, commit 5874f0c)

- `agent/skill_utils.py` — `extract_skill_scope`, `scope_allows_lane`, lane consts.
- `agent/prompt_builder.py` — `lane` param, scope filtering in all 3 paths,
  cache-key lane, snapshot version 1→2 (now stores `scope`).
- `run_agent.py` — lane selection from `_delegate_depth`.
- `tests/agent/test_prompt_builder.py` — 5 lane tests.
- `tests/run_agent/test_run_agent.py` — 2 wiring tests (primary→primary,
  worker→worker through the real `_build_system_prompt`).

Commit author: Fritz Medine <fritz.medine@gmail.com>, no AI attribution. Only
these 5 files were committed — unrelated pre-existing working-tree changes
(`shay_constants.py`, `tools/registry.py`, gateway desk routes, egg-info) were
left untouched.

## 3. Caveman install (worker-only)

Installed at `~/.shay/skills/caveman/` (`SKILL.md` + `README.md`), sourced from
`JuliusBrussee/caveman` `skills/caveman/SKILL.md` verbatim, with `scope: worker`
added to the frontmatter and a "## Scope" section explaining the worker-only
contract. caveman is the token-compression / telegraphic-output skill (~65-75%
output-token reduction, full technical accuracy).

It is NOT in `skills.always_include` and NOT in the global unscoped index — the
scope filter removes it from the primary lane before the cap even runs.

## 4. Proof it does NOT bleed into chat

Unit tests (all pass — `pytest tests/agent/test_prompt_builder.py
tests/run_agent/test_run_agent.py`):
- `test_worker_scoped_skill_absent_from_primary_lane` — caveman NOT in primary.
- `test_worker_scoped_skill_present_in_worker_lane` — caveman IS in worker.
- `test_primary_scoped_skill_absent_from_worker_lane` — symmetric exclusion.
- `test_default_lane_is_primary` — no-arg call defaults to primary (safe).
- `test_lane_cache_does_not_cross_contaminate` — warmed primary cache does not
  leak into the worker build.
- `test_primary_agent_uses_primary_lane` / `test_worker_agent_uses_worker_lane` —
  the real `AIAgent._build_system_prompt` passes `lane="primary"` at depth 0 and
  `lane="worker"` at `_delegate_depth=1`.

Live-directory proof (against the real `~/.shay/skills/`, ~90 skills, with the
live `max_count: 40` cap and `always_include` in effect):

```
caveman in PRIMARY lane: False
caveman in WORKER lane : True
```

## 5. Operator action required to activate

- **No gateway restart was performed.** Gateway PID 84239 is untouched.
- The code path is additive and the skill files are on disk. The running gateway
  reads `config.yaml` mtime-cached per tick but loads the **agent code** that was
  imported at process start, so the LIVE gateway is still running the pre-change
  `build_skills_system_prompt` (no `lane` arg) — i.e. caveman is currently neither
  primary nor worker scoped in the live process; it simply isn't loaded by it yet.
- **To activate for workers:** restart the gateway via the drain-aware path so the
  new code loads: `shay gateway restart` (drains in-flight runs via SIGUSR1 →
  `request_restart`). Before restarting, quiesce per §3 of the prep report: confirm
  the kanban queue is empty or set `kanban.dispatch_in_gateway: false`, and
  checkpoint any `.ralph/loop.py` loop. No `config.yaml` edit is needed (the skill
  is file-based and scope-gated; nothing was added to `always_include`).
- After restart, the primary chat turn will still NOT contain caveman (proven), and
  any `delegate_task` sub-agent turn will.

## 6. No new blockers

The §2 blocker "caveman scoping unproven" is CLOSED for the Claude delegation lane.
The other prep blockers (B2 vault-not-git, B3 live loop, B5 memory.db backup) are
unchanged and out of scope here.
