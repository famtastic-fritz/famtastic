# FAMtastic Global Rules

## FAMtastic Declaration
FAMtastic (adj.): Fearless deviation from established norms with a bold and unapologetic commitment to stand apart on purpose, applying mastery of craft to the point that the results are the proof, and manifesting the extraordinary from the ordinary.

## Commit Policy
- NEVER include "Claude", "AI", "Co-Authored-By", "generated", "assisted", or any AI-related references in commit messages, commit bodies, or commit metadata.
- Commit messages should read as if a human developer wrote them — clean, professional, no attribution.

## SITE-LEARNINGS.md
- A `SITE-LEARNINGS.md` file is maintained at `~/SITE-LEARNINGS.md` (outside any repo) to capture architecture notes, lessons learned, and ecosystem-level context.
- When meaningful discoveries, patterns, or decisions are made, update the SITE-LEARNINGS file.

## FAMtastic Ecosystem
- **One repo:** `~/famtastic/` — the consolidated home for everything
  - Site factory: `fam-hub site *` (build, preview, deploy websites)
  - Idea capture: `fam-hub idea *` (capture, triage, blueprint, validate)
  - Multi-agent workflow: `fam-hub agent *` (Claude, Gemini, Codex adapters + conversation reconciliation)
  - Admin: `fam-hub admin *` (health checks, diagnostics)
- **Archived repos** (superseded, kept for reference on GitHub):
  - `~/famtastic-platform/` — admin tools moved to `fam-hub admin`
  - `~/famtastic-think-tank/` — idea capture moved to `fam-hub idea`
  - `~/famtastic-dev-setup/` — install flow moved to `famtastic/scripts/install.sh`
- Shared paths: `~/.famtastic-bin/`, `~/.local/share/famtastic/`, `~/.config/famtastic/`

## Documentation Rules (Non-Negotiable)

Documentation is not a separate task that happens after the work is done.
Documentation IS part of the work. A feature is not finished until the
documentation reflects it. These rules apply to every session, every wave,
and every fix — no exceptions.

### Rule 1: SITE-LEARNINGS.md is the system's memory

SITE-LEARNINGS.md is the authoritative technical reference for the FAMtastic
codebase. It must reflect reality at all times — not what was planned, not
what was intended, but what actually exists and how it actually behaves. If
the code and the documentation disagree, the documentation is wrong and must
be corrected immediately.

### Rule 2: Every wave ends with a documentation update

No wave, phase, or build session is considered complete until SITE-LEARNINGS.md
has been updated. Before writing the final commit of any session, you must:

Update SITE-LEARNINGS.md to document every feature built in that session.
Each entry must include the relevant file paths, function names, API endpoint
names, config keys, and classifier intent names so the documentation is
actionable — not just descriptive. Write it as if someone who wasn't present
during the session needs to work with this feature tomorrow.

Correct any existing entries that no longer reflect reality. If a bug fix
changed how something works, update the description. If a feature was
documented as working but isn't, mark it clearly as non-functional.

Add any new known gaps to the Known Gaps section. If you built something
that has a limitation, an incomplete toggle, or a missing integration,
record it honestly. Known gaps are not failures — undocumented known gaps
are failures.

### Rule 3: The Known Gaps section must stay current

The Known Gaps section in SITE-LEARNINGS.md is not optional and is never
empty. It is a running honest list of things that are incomplete, broken,
or claimed in the UI but not yet wired to real behavior. Every session must
review this section and update it — removing gaps that were closed and adding
gaps that were opened. If a session introduces a new limitation, it gets
recorded before the session ends.

### Rule 4: Never document what was planned — document what was built

Documentation must reflect the current state of the system as it exists
right now. Do not write documentation that describes the intended behavior
of something that isn't fully working. Do not write documentation based on
the plan that was executed — write it based on the result. If the
implementation diverged from the plan in any way, the documentation reflects
the implementation, not the plan.

### Rule 5: Append a session summary to CHANGELOG.md

At the end of every session, append a brief entry to ~/famtastic/CHANGELOG.md.
This entry should be three to five sentences maximum and must include the
date, what was built or changed, and anything that was left incomplete or
intentionally deferred. This is not a substitute for SITE-LEARNINGS.md — it
is a lightweight chronological trail that makes it possible to reconstruct
what happened between sessions without reading the entire git history.
The format is:

## YYYY-MM-DD — [one-line session title]
[Two to five sentences describing what was built, what changed, and what
was deferred or left incomplete.]

### What triggers a documentation update

Any of the following requires a SITE-LEARNINGS.md update before the session
ends: a new feature was added, an existing feature's behavior changed, a bug
was fixed that changes how something works, a new classifier intent was added,
a new API endpoint was created, a new script was created, a new config key
was added to studio-config.json, a known gap was closed, or a new known gap
was discovered.

### Rule 6: Regenerate FAMTASTIC-STATE.md when structure changes

`~/famtastic/FAMTASTIC-STATE.md` is the canonical project reference — a
single document that captures the full system architecture, feature map,
tech stack, file inventory, known gaps, and what's next. It is the primary
way the project owner keeps Claude Web sessions informed about the current
state of the codebase. It lives in the Claude Web project folder, outside
any single conversation, so it must always reflect reality.

FAMTASTIC-STATE.md must be **regenerated** (not patched — fully rewritten)
at the end of any session that:
- Adds new features, API endpoints, or CLI commands
- Adds or removes files from the codebase
- Changes the post-build pipeline or processing steps
- Adds new config keys to studio-config.json
- Changes the known gaps (opened or closed)
- Meaningfully changes the system's architecture or data flow

Sessions that only fix bugs within existing features, update text content,
or make cosmetic UI changes do not require regeneration.

When regenerating, update ALL sections — do not leave stale line counts,
outdated feature descriptions, or missing entries. The document should be
accurate enough that someone reading only FAMTASTIC-STATE.md (and nothing
else) can understand what the system does, how it works, and what's missing.

### The commit message rule for documentation

Any commit that includes documentation updates must have "docs:" as a prefix
or include "[docs]" in the commit message so documentation changes are
identifiable in the git history separately from code changes. Example:
"docs: update SITE-LEARNINGS with slot system and known gaps"

## OpenWolf Context Management

This project uses OpenWolf (`.wolf/`) for cross-session context management.
Three files are tracked in git as project intelligence:

- `.wolf/anatomy.md` — file descriptions and token estimates (check before reading files)
- `.wolf/cerebrum.md` — learnings, preferences, do-not-repeat list (check before generating code)
- `.wolf/buglog.json` — bug history with root causes and fixes

See `.wolf/OPENWOLF.md` for the full operating protocol.
