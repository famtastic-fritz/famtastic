# Agent Coordination

Single source of truth for which agent surface (Claude Code, Cowork, Codex)
is doing what. Prevents the parallel-implementation problem where two
surfaces independently build incompatible solutions to the same problem.

## Why this exists

On 2026-05-05 the same problem (cross-session memory) was solved twice in
parallel: Cowork built `.brain/`, Claude Code built `memory/<type>/<id>.md`.
Both branches had to be reconciled after the fact. This document plus
`scripts/agent-checkin.js` make the same situation visible *before* the
duplicate work happens.

## Active branches

Each row is a scope-lock claim. Other agents reading this should avoid the
listed paths or coordinate with the owner.

| Branch | Owner Surface | Intent | Scope Locks | Started |
|--------|---------------|--------|-------------|---------|
| `feat/ops-workspace-gui` | cowork | Ops dashboard UI | `site-studio/public/ops/**`, `site-studio/lib/ops/**` | 2026-05-04 |
| `codex/mbsh-deploy` | codex | Finish MBSH deploy | `sites/mbsh-reunion/**`, `scripts/deploy-mbsh*` | 2026-05-05 |
| `feat/agent-coordination` | claude-code | Coordination scaffold + brain→memory merge | `AGENT-COORDINATION.md`, `scripts/agent-checkin.js`, `memory/<type>/*` (additive only) | 2026-05-05 |

## Scope-lock convention

A scope lock is a path glob (or list of globs) that an agent claims for the
duration of its branch. Other agents seeing the lock should:

1. **Avoid** committing changes inside that glob from a different branch.
2. **Coordinate** if the work genuinely requires touching a locked path —
   read the locking branch, propose a merge, or pick a different scope.
3. **Always-additive paths** (e.g. new files under `memory/<type>/`) do
   not need a lock; conflicts only happen on shared files.

A lock is removed when the branch lands in main or is abandoned.

## Pre-flight protocol

Before starting any non-trivial workstream, every agent runs:

```bash
node scripts/agent-checkin.js --intent "<short description of what you're about to build>"
```

The script:
1. Fetches all remote branches.
2. Lists files changed on each non-main remote branch.
3. Compares your stated intent (and your branch's diff) against active
   scope-locks declared above.
4. Exits **0** with a green "no conflicts" summary, or exits **2** with a
   table of overlapping branches you should coordinate with.
5. Logs the check-in to `memory/usage.jsonl` for telemetry.

If you skip this step and ship overlapping work, you own the merge cost.

## Conflict resolution

If you discover overlap *mid-work* (e.g. you started without checking in,
or a new branch landed after your check-in):

1. **Stop** non-trivial commits on your branch.
2. Append a row to the **Active branches** table above describing your
   work and the overlap.
3. Read the other branch (`git diff main..origin/<their-branch>`) and
   decide: merge into theirs, rebase yours on theirs, or split scopes.
4. Post the resolution back to this file (replace your row with the
   final agreed-on scope).

## Format spec for the active-branches table

Columns are fixed:

- **Branch** — exact remote branch name
- **Owner Surface** — one of `claude-code`, `cowork`, `codex`, or `human`
- **Intent** — short phrase, present tense ("Build X", "Finish Y")
- **Scope Locks** — comma-separated path globs claimed by this branch
- **Started** — ISO date the branch was cut

Agents append rows; humans (or `agent-checkin.js`) prune rows when the
branch merges or is abandoned.
