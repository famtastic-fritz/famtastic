# FAMtastic Global Rules

## FAMtastic Declaration
FAMtastic (adj.): Fearless deviation from established norms with a bold and unapologetic commitment to stand apart on purpose, applying mastery of craft to the point that the results are the proof, and manifesting the extraordinary from the ordinary.

## Commit Policy
- NEVER include "Claude", "AI", "Co-Authored-By", "generated", "assisted", or any AI-related references in commit messages, commit bodies, or commit metadata.
- Commit messages should read as if a human developer wrote them — clean, professional, no attribution.

## SITE-LEARNINGS.md
- A `SITE-LEARNINGS.md` file is maintained at `~/famtastic/SITE-LEARNINGS.md` (tracked in the repo) to capture architecture notes, lessons learned, and ecosystem-level context.
- When meaningful discoveries, patterns, or decisions are made, update the SITE-LEARNINGS file.

## Current Agent Startup Contract

Before non-trivial work, read `docs/agent-startup/AGENT-STARTUP-CONTRACT.md`.
It is the current orientation layer for Claude Code, Codex, Gemini, Cowork,
and other agent surfaces. It supersedes stale role assumptions from older
worktrees unless those references have been reconciled into the current docs.

Core doctrine: research-first, spec-shaped, proof-driven work; reuse before
generate; route specialized needs to the owning studio/service; record proof
in Data Center; run post-evaluation after meaningful jobs.

## Work-Packet Rule (Active Now)

For any real multi-step effort, do not leave the plan in conversational form.
Restate it as a work packet before proceeding. Minimum fields:

- Goal (outcome, why it matters, success criteria, proof)
- Tasks (explicit next actions)
- Branch (feature branch name when applicable)
- Worktree (path when applicable)
- Main landing path / expectation
- Truth-surface updates required, especially capability-matrix updates
- Proof

If branch/worktree are not needed, say that explicitly instead of omitting them.

## Studio Process Management (Non-Negotiable)

FAMtastic Studio is managed by **macOS launchd** (`com.famtastic.studio`).
- **NEVER start Studio manually** with `node server.js` or `npm run studio` — launchd owns it.
- The restart button calls `process.exit(0)` → launchd restarts automatically in ~2s.
- To check status: `launchctl list | grep famtastic`
- To tail logs: `tail -f /tmp/studio.log`
- To force a restart from terminal: `launchctl stop com.famtastic.studio`
- The plist lives at `~/Library/LaunchAgents/com.famtastic.studio.plist`

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

## Studio UI File Structure Rule (Non-Negotiable)

All CSS for the Studio UI belongs in separate files under
site-studio/public/css/, one file per logical component.
JavaScript follows the same pattern under site-studio/public/js/
when extracted. CDN links for external libraries (xterm, Tailwind,
Google Fonts, etc.) remain in index.html <head> — CDNs are acceptable.
Tailwind utility classes on HTML elements are exempt from this rule.

File map:
  site-studio/public/css/
    studio-base.css      — resets, layout, typography
    studio-panels.css    — three-panel layout, resizers
    studio-chat.css      — chat panel, messages, plan cards
    studio-sidebar.css   — tabs, mode selector, status bar
    studio-modals.css    — settings, upload, all modal dialogs
    studio-terminal.css  — terminal panel and toolbar

Rules:
- New CSS written during any phase goes into the appropriate css/ file
- Never add new styles to a <style> block in index.html
- Never add new <script> blocks to index.html for app logic —
  use the appropriate js/ file instead
- The existing inline <style> block in index.html is known tech debt,
  scheduled for extraction after Phase 1.5 completes
- When adding a new css/ file, add a corresponding <link> tag in
  index.html <head> immediately — never leave a file unlinked
- When adding a new js/ file, add a corresponding <script src="...">
  tag at the bottom of index.html <body> immediately

## OpenWolf Context Management

This project uses OpenWolf (`.wolf/`) for cross-session context management.
Three files are tracked in git as project intelligence:

- `.wolf/anatomy.md` — file inventory with token estimates. Check this BEFORE
  reading any file so you know where things live and can give accurate estimates
  without searching.
- `.wolf/cerebrum.md` — accumulated learnings, architectural decisions, and
  do-not-repeat rules captured across sessions. Check this BEFORE generating
  any code to avoid repeating past mistakes and to honor standing constraints.
- `.wolf/buglog.json` — bug history with root causes and fixes. Check this
  BEFORE debugging any issue to see if the same problem has been solved before.

**Mandatory session-start protocol:** Before beginning ANY work in a session —
before reading files, before writing code, before making recommendations —
read all three files above in the order listed. They are not optional background
reading. They are prerequisites. The cerebrum.md do-not-repeat rules and
decision log represent hard-won knowledge from debugging sessions and
architectural investigations. Violating them means repeating work that has
already been done and mistakes that have already been fixed.

See `.wolf/OPENWOLF.md` for the full operating protocol.

## Brain Sync Contract (Non-Negotiable)

The Obsidian brain (`obsidian/`) is the shared, cross-session memory — the place
Fritz reads to find patterns across every agent and session. Work that never
reaches the brain is invisible and effectively didn't happen. Every session —
Claude Code, Codex, Gemini, Cowork, Shay — MUST leave a trace in the brain, tied
to its session id. This is enforced three ways; do not rely on memory alone.

### Rule 1: Every session is tied to the brain by its session id

Each session's canonical id is `CLAUDE_CODE_SESSION_ID` (Shay uses her build/run
id). A per-session note lives at
`obsidian/05-Captures/sessions/<YYYY-MM-DD>/SESSION-<short-id>.md`. The note's
frontmatter records `session_id`, `branch`, `start_sha`, and timestamps. Never
write an anonymous session — always tie work to the id so Fritz can trace any
change back to the session that made it.

### Rule 2: Write to the brain periodically, not just at the end

The session note is created automatically at SessionStart and updated at every
context compaction (PreCompact) and at session end (Stop) by
`scripts/brain/session-checkpoint.js` (wired in `.claude/settings.json`). Those
hooks guarantee the scaffold, the timeline, and the git delta. **You are still
responsible for the substance:** before any compaction and before ending, fill in
the note's "What this session did" section (2–6 sentences: goals, what shipped,
what's deferred). At natural milestones during long work — a feature landed, a
decision made, a gap discovered — append a line to the note rather than waiting.

### Rule 3: Promote durable knowledge into the right brain folder

The session note is the trace; durable knowledge still goes to its home:
learnings → `.wolf/cerebrum.md` + `obsidian/Shay-Memory/learnings/`, bugs →
`.wolf/buglog.json`, capabilities/skills → `obsidian/06-Capabilities/`,
architecture → `SITE-LEARNINGS.md`. The session note should link to whatever it
promoted. A session that only touched the auto-scaffold but discovered something
durable has not met this contract.

### Rule 4: Branch from a base that HAS the brain

If your branch predates `obsidian/` on `main`, merge `origin/main` in before
doing brain work — otherwise your notes create add/add conflicts and never
converge. (This is the convergence bug that left four 2026-06-02 sessions
siloed; see `obsidian/05-Captures/sessions/`.)

## Agent Coordination (Paused)

Agent check-in is temporarily disabled by Fritz because the current overlap
detection creates too much nuisance/false-positive friction during active
FAMtastic and MBSH work. Do **not** run `node scripts/agent-checkin.js` as a
mandatory prerequisite for new systems, capabilities, or non-trivial
workstreams while this section is marked paused.

If coordination is needed, use lightweight human-readable notes in the active
plan/capture/report instead of blocking on AGENT-COORDINATION.md scope locks.

<!-- famtastic-dna-include (Session 12 Phase 3) — persistent build knowledge -->
@famtastic-dna.md

<!-- studio-context-include -->
@STUDIO-CONTEXT.md

## Plan Closeout Rule (Non-Negotiable)

No plan may stay `status: active` with zero open tasks for more than one
session. At session end, run `node scripts/plans/audit.js`. For every plan
in drift, ship one of:
- A closeout packet (`completed`, `parked`, `superseded`) via
  `node scripts/plans/closeout.js apply <packet.json>`
- A checkpoint packet (`checkpoint_complete`) — phase ended, plan continues
- New tasks (`needs_tasking`) — packet must include `next_task_ids[]`

Schema: `plans/CLOSEOUT-SCHEMA.md`. Packets land at
`plans/<plan-id>/closeouts/<date>-<verdict>.json`. Terminal verdicts
auto-remove the plan from `active_parent_ids`. Memory candidates in the
packet auto-flow into the chat-capture pipeline.

## Default Operating Mode: Ultracode (standing directive)

Operate in **ultracode mode by default** for every substantial task in this repo,
without waiting to be asked:
- Author and run multi-agent Workflows by default for substantive work (research,
  design, build, review) — don't pause to ask "should I orchestrate this?"
- Do not hedge on token/credit cost. Optimize for the most exhaustive, correct result.
- Drive work to its goal; don't stop to report and wait when the next step is clear.
  Track multi-step goals as TodoWrite tasks and keep going until the gates are green.
- Lean on the quality patterns: adversarial-verify, judge panels, completeness critics,
  loop-until-dry, two-gate builds (typecheck + runtime render gate), surgical edits.
- Solo single-agent work only for trivial/conversational turns.

Real cloud-orchestration commands available when wanted: `/ultraplan` (cloud planning),
`/ultrareview` (cloud multi-agent code review).

<!-- AGENT-CONTEXT:START -->
<!-- Generated by scripts/agent-context-emit.js — do not edit between markers. -->

Standing cross-agent orientation is generated into `AGENT-CONTEXT.generated.md`:

@docs/agent-startup/AGENT-CONTEXT.generated.md
<!-- AGENT-CONTEXT:END -->
