# System Improvement Audit — Bug Logs, Commits & Complaints

Method: inventory what exists, diff against intended state, list improvements with the
smallest fix. Read-only against the current system; nothing was modified.

## Inputs reviewed
- Parent bug log: read 214 entries from parent .wolf/buglog.json (read-only) (entries: 214).
- Documented regressions in `famtastic-dna.md` (BEM single-dash, plain-text nav brand,
  parallel-page logo race, content/layout misrouting, `process.env.SITE_TAG` staleness).
- CLAUDE.md doctrine (documentation, brain-sync, plan-closeout rules).

## Findings → improvements (carry into Shay-Shay v2)
1. **Class-name drift (BEM single vs double dash).** *Fix already proven:* literal
   skeletons + tests. v2: keep skeleton-as-contract; add a pre-write linter so drift
   can't reach disk.
2. **Ambiguous-intent misrouting (content vs layout).** *Fix:* default to the cheap
   surgical path. v2: the router's `triage_threshold` mirrors this — keep ambiguous
   work on the cheap tier.
3. **Stale runtime snapshots (`process.env.SITE_TAG`).** v2: forbid reading startup
   snapshots for mutable state; single live source of truth.
4. **Memory siloing (branches predating the brain).** v2: enforce "branch from a base
   that has the brain"; memory writes converge to one canonical store.
5. **Plan drift (active plans with zero tasks).** v2: bake closeout/checkpoint into the
   reflect step so no plan stays active-but-empty.
6. **Documentation lag.** v2: documentation is part of done — a task isn't complete
   until its learnings are written (this factory's self-improvement loop enforces the
   same idea via LEARNINGS.md).

## How this factory already applies the lessons
- Cheapest-capable routing (finding #2), single source of truth in SQLite (finding #3),
  bounded self-tuning + written learnings (findings #5/#6), and a cost ledger so spend
  regressions are visible.
