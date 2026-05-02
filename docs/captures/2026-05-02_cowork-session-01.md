# Cowork Session 01 — Knowledge Capture

**Date:** 2026-05-02
**Surface:** Cowork (third pillar — visual / synthesis layer)
**Operator:** Fritz
**Session length:** ~3 hours
**Status:** PROPOSED CAPTURE — Fritz reviews before any of these land in canonical files

This is the first artifact of the FAMtastic capture flywheel. It exists before the capture tool itself, as proof that the pattern works and to establish what "good capture" looks like. The capture tool (Chunk A in `famtastic-total-ask-plan.md`) will eventually produce these automatically. Today they're written by hand.

The goal: nothing important from this session evaporates when the chat closes.

---

## Design decisions made

### D-2026-05-02-01 — Two surfaces under one identity (was three)
**Decision:** Site Studio Chat / Shay-Shay (light) / Shay's Workshop (deep) replace the prior six-surface tangle. One identity (Shay), two contexts. Site Studio Chat preserved as a separate, lower-cost interaction surface routed to subscriptions/local LLMs/terminal — owned by Site Studio, not Shay.
**Rationale:** Audit found 6 distinct Shay surfaces, 3 composers, 2 parallel naming systems (`pip-*` legacy + `shay-*` current). Source of "pieced-together" feeling. Three eras of code stacked without consolidation.
**Lands in:** `.wolf/cerebrum.md` (Decision Log)
**Related artifact:** `docs/shay-architecture-v2-proposal.md`

### D-2026-05-02-02 — "Lite" and "Desk" naming retired
**Decision:** Light surface = "Shay-Shay". Deep surface = "Shay's Workshop". Workbench metaphor for the deep context.
**Rationale:** Fritz disliked the prior "Lite/Desk" names; not his choice. Workshop framing better captures that the deep surface has more *tools*, not a different *identity*.
**Lands in:** `.wolf/cerebrum.md` (Decision Log)

### D-2026-05-02-03 — Workshop is more than a handoff target
**Decision:** Workshop hosts: handoffs from Shay-Shay, regular chat for ideation about new components/apps/features, gap recognition + capture, research + tool evaluation, learning loop. Not just "the place jobs land."
**Rationale:** Fritz framing: "sometime she's a place for regular chats as well, sometimes through chat we may get other ideas, for other components, apps, logs, features." Limiting Workshop to handoffs misses 60% of its value.
**Lands in:** `.wolf/cerebrum.md` (Decision Log) + `shay-architecture-v2-proposal.md`

### D-2026-05-02-04 — Tool rail follows the Cowork sidebar pattern
**Decision:** Workshop tool rail is pluggable, additive, reorderable. Tools register; rail accommodates. Each tool tagged by `appliesTo` (handoff / chat / gap-capture / studio-id) so the rail filters dynamically.
**Rationale:** Fritz: "kinda like how Cowork's UI has the ability to add additional tools to the sidebar." Pluggable architecture means new Studios can contribute their own tools without rewriting the rail.
**Lands in:** `shay-architecture-v2-proposal.md`

### D-2026-05-02-05 — Site Studio is the seed; Studios are sibling products
**Decision:** Each future Studio (Media, Brand, Component, Think Tank, etc.) is its own product with its own tools/functions/context awareness. They interact via standardized contracts (handoff payload, context registry, shared memory/research/learning services in `lib/famtastic/`).
**Rationale:** Fritz: "the seeds for future components like media studio to be their own product in the ecosystem that can interact with other products in the ecosystem seamlessly." This is the ecosystem framing — Studios are siblings, not modules.
**Lands in:** `.wolf/cerebrum.md` (Standing Architecture Rule) + `FAMTASTIC-STATE.md`

### D-2026-05-02-06 — `pip-*` legacy naming retired across two sessions, not one
**Decision:** Architecture-critical IDs renamed this session (`pip-direct-input` → `shay-shay-input`, `shay-desk-input` → `shay-workshop-input`, `shay-desk-shell` → `shay-workshop-shell`). Full `pip-*` retirement (240+ occurrences in studio-orb.css/js) deferred to next session.
**Rationale:** Big rename in one session = high risk, hard to test. Sequencing across two sessions reduces blast radius.
**Lands in:** `.wolf/cerebrum.md` (Do-Not-Repeat — pace of risky renames)

### D-2026-05-02-07 — 5-state orb officially supported
**Decision:** `SHAY_THINKING` joins the 4 prior states (`IDLE`, `BRIEF_PROGRESS`, `BRAINSTORM_ACTIVE`, `REVIEW_ACTIVE`). State was added in code 2026-04-20 but not in the documented contract until now.
**Rationale:** Audit found state machine doc/code drift. Code wins; doc updated to match.
**Lands in:** `.wolf/cerebrum.md` (already done — `ORB_STATE_MACHINE` rule updated this session)

---

## Breakthroughs

### B-2026-05-02-01 — Cowork is the third pillar
The mental model that unlocked the session: Cowork is the visual/synthesis pillar between Claude Web (strategy) and Claude Code (surgical execution). Not "another assistant" — a different *seat* in the same workflow. The seat that can see the running UI while reasoning about it. The seat that drafts handoff prompts for Code. The seat that captures what the others can't see.
**Implication:** Every Cowork session ends with a digest that feeds the other two pillars. Cowork is the integration layer for the three-pillar workflow.

### B-2026-05-02-02 — The mockups are the proof, not the documentation
The user phrased it: "I'm ready to see the proof." Static HTML mockups (3 of them) demonstrated the v2 vision in 2 hours. They're not the implementation, but they're concrete enough to react to. Lesson: when the architecture is in question, ship visual proofs before code. Mockups are cheap; code refactors aren't.
**Implication:** Standard pattern for major architectural decisions = audit → proposal doc → mockups → user reacts → code.

### B-2026-05-02-03 — The orb dancing was the chat moving
The user's reported symptom ("chat window itself moves") had two distinct causes that LOOKED like the same problem:
1. Composer width reflowing because `--shay-lite-safe-area` was JS-driven and recalculated on every chrome change
2. Orb's CSS keyframes restarting on every chat append (MutationObserver classed it `pip-active` → `pip-idle` → repeat)

Peripheral motion + actual layout shift compound into one perception. Fixing only one wouldn't have felt fully fixed.
**Implication:** Always look for the second cause when fixing a perceived UX bug. User reports are symptoms, not diagnoses.

### B-2026-05-02-04 — The page-context registry IS the ecosystem substrate
The architecture v2 doc proposed `ShayContextRegistry` for Shay-Shay specifically. The ecosystem framing (D-05) made it obvious: same primitive scales to N Studios with no rework. Page IDs already namespaced (`<studio>.<page>`). Tool registration already supports `appliesTo` tags. Handoff contract already has `source_surface` / `destination_surface`. The substrate I built for one Shay accidentally generalized to the ecosystem.
**Implication:** Lucky; could have over-built. Worth pausing to name when a primitive turns out to be more general than designed.

### B-2026-05-02-05 — Solution hierarchy applies to MY work, not just Fritz's
The Workshop rename + tighten was "it works" tier. The Phase 2 fixes (composer / observer / isolation) were efficiency tier. I should name where each chunk falls before proposing it. Otherwise I drift toward "works" and accumulate the same kind of technical debt the briefing names as the trap.
**Implication:** Add solution-hierarchy tier to every plan card going forward.

---

## Gaps surfaced

### G-2026-05-02-01 — Knowledge capture has been entirely manual
**Symptom:** Every Cowork/Web/Code session ends with insights that don't land in any file. THIS session is the example — without this artifact, the 6 decisions and 5 breakthroughs above evaporate when the chat closes.
**Frequency in last 4 weeks:** Every single multi-session conversation.
**Proposed fix:** Capture flywheel (Chunk A in plan). MVP runs manually first session, semi-auto second, auto third+.
**Lands in:** `.wolf/build-backlog.json` as the highest-priority item.

### G-2026-05-02-02 — Sandbox can't write to .git or reach localhost:3334
**Symptom:** Cowork can't run git commands directly. Can't even reach the bridge that Fritz built (`/api/bridge/exec` whitelist already includes `git`) because of network isolation between sandbox and host.
**Workaround:** Fritz runs git manually with commands Cowork drafts.
**Long-term:** Cowork product feature ask (sandbox-to-host networking, or .git permissions for local repos).
**Lands in:** `gaps.jsonl` as a Cowork product gap, NOT_BUILT category.

### G-2026-05-02-03 — Drive sync still broken (delete-before-upload missing)
**Symptom:** GitHub Action pushes to Drive but creates duplicates. Project knowledge in Claude Web is stale.
**Frequency:** Every push since the action was wired up.
**Proposed fix:** D1 in plan (Drive sync fix). Highest immediate ROI per the briefing.
**Lands in:** `.wolf/build-backlog.json` (already there per briefing? to verify).

### G-2026-05-02-04 — Three site workflows, only one supported
**Symptom:** `new_site_from_brief` works. `adapt_existing_site` and `rebuild_from_brief` don't have first-class support. Different state, permissions, config-discovery needs.
**Source:** Briefing references the MBSH session as the discovery point.
**Proposed fix:** D4 in plan.
**Lands in:** `.wolf/build-backlog.json` (likely already there from MBSH).

### G-2026-05-02-05 — Long-context breakage masked by Opus 1M
**Symptom:** 7-page builds fail without Opus 1M. Three distinct root causes (accumulation / injection / monolithic), each with a different remedy. Currently treated as one problem.
**Source:** Briefing breakthrough.
**Proposed fix:** D5 in plan, sequenced after D2 (workflow-as-data) so we can fix per-stage.
**Lands in:** `.wolf/cerebrum.md` (Standing Knowledge — long-context root causes).

### G-2026-05-02-06 — Shay's conversation history may not persist (unverified)
**Symptom:** Cowork hasn't checked where Shay-Shay conversations save. May be `sites/<tag>/conversation.jsonl`, may be `lib/shay-shay-sessions.js`, may be ephemeral.
**Action item:** Investigate next session before any feature work that depends on session continuity.
**Lands in:** `gaps.jsonl` as INVESTIGATION_NEEDED.

### G-2026-05-02-07 — Studio working modes other than `/studio` not yet defined
**Symptom:** Fritz raised the question "what about working on a site but not in /studio mode?" Real question, no answer yet.
**Action item:** Define what "outside Studio mode" looks like — CLI? Direct file edit? Hand-built? — and whether Shay-Shay should be present.
**Lands in:** `gaps.jsonl` as INVESTIGATION_NEEDED.

---

## Lessons (apply going forward)

### L-2026-05-02-01 — When user says "show me the proof," ship visuals before code
Two-hour mockup investment unlocked architectural alignment that would have taken multiple sessions to achieve through prose. Repeat this pattern for every major architectural decision.

### L-2026-05-02-02 — Per-session digest is a non-negotiable
Cowork sessions end with a structured digest written to `~/famtastic/docs/captures/` regardless of whether the capture tool is built yet. This document is the template.

### L-2026-05-02-03 — Always name solution-hierarchy tier on every plan card
Efficiency / Automation / Revenue / "It works" — name where each chunk falls. Forces honesty about debt accumulation.

### L-2026-05-02-04 — Sandbox limits are real; design around them
Cowork can't write to `.git`, can't reach host services. Plan handoffs that route through Fritz for git operations and anything host-side. Don't waste time fighting the boundary.

### L-2026-05-02-05 — Architecture primitives often generalize beyond their initial scope
Pause when a primitive turns out broader than designed (page-context registry → ecosystem substrate). Name the generalization explicitly so future work uses the same primitive instead of building parallel ones.

### L-2026-05-02-06 — User reports are symptoms, not diagnoses
"Chat window itself moves" was two compounding bugs, not one. Always look for the second cause.

### L-2026-05-02-07 — The FAMtastic standard applies to Cowork's own work
Mockups, plans, captures — every artifact gets held to "the results are the proof." Verbose intro paragraphs in the Workshop tab were "good enough" but not FAMtastic. The user called it out. Lesson: hold every artifact to the standard.

---

## Contradictions to prior assumptions

### C-2026-05-02-01 — Shay v2 doc said two surfaces; reality is two surfaces ACROSS N Studios
The v2 doc framed Shay-Shay + Workshop as the two surfaces. The ecosystem framing (D-05) reframes that: there's ONE Shay-Shay (light, follows you across all Studios) and ONE Workshop (deep, with Studio-tagged tools in the rail). The two-surface count is correct, but the naming felt Site-Studio-bound. Workshop tool rail filters by active Studio — same tool rail, different tool sets per Studio.
**Update:** Amend `shay-architecture-v2-proposal.md` to make the ecosystem framing explicit (Task #30 in current task list).

### C-2026-05-02-02 — Briefing said "build capture tool first"; this session built Shay v2 first
**Tension:** I went deep on Shay v2 because it was in front of me. The briefing is clear that the capture tool is THE first build because it makes everything else compound. I built one slice without first building the thing that captures what we learned doing it.
**Resolution:** Both-in-parallel going forward. Capture tool MVP gets built next iteration alongside Shay v2 chunks.

### C-2026-05-02-03 — I said the chunk B work would take 30+ hours; that's only Shay v2
Initial estimate framed "remaining work" as 30 hours. After absorbing the briefing, total ask is 100+ hours across 5 chunks. The 30-hour figure was Shay v2 alone. Be careful with scope estimates that ignore parallel tracks.

---

## Recurring patterns (3+ instances → propose promotion to standing rule)

### P-2026-05-02-01 — "Pieced-together UI" pattern
**Instances seen:**
1. Six Shay surfaces from three different eras (this session)
2. Two parallel naming conventions (`pip-*` + `shay-*`) doing the same job (this session)
3. Three composers feeding three different surfaces (this session)
**Pattern:** Iterative growth without consolidation passes. Each new feature adds a surface; old surfaces stay because they "still work."
**Proposed standing rule:** Every quarter (or every N sessions), do an audit pass and consolidate. The cost of NOT consolidating compounds — see this session's "way too busy" experience.
**Lands in:** `.wolf/cerebrum.md` (Standing Architecture Rule) once observed in 1 more session.

### P-2026-05-02-02 — "Doc says X, code does Y" drift
**Instances seen:**
1. ORB_STATE_MACHINE rule says 4 states; code has 5 (this session)
2. Architecture v2 doc said paths live in `lib/shay/`; reality wanted some in `public/js/` (browser-side) (this session)
3. Briefing says SDK migration "supposedly underway"; project notes are stale on actual state (briefing)
**Pattern:** Documentation drifts faster than the team realizes.
**Proposed standing rule:** Every shipping PR includes a doc audit step. CLAUDE.md's documentation rules already imply this; making it a CHECKLIST item in the PR template would close the gap.
**Lands in:** `.wolf/cerebrum.md` once observed 1 more time.

---

## Items for next session's reading list

- `lib/shay-shay-sessions.js` — verify session persistence (G-06)
- `sites/<tag>/conversation.jsonl` format — sample one to understand schema for capture tool ingestion
- `lib/job-queue.js` — needed for Workshop job queue UI
- `studio-screens.js` — find Media Studio mount points for real page-context registration
- Any Web chat exports Fritz drops in `~/famtastic/imports/`

---

## Capture metadata

- **This artifact's destination:** `docs/captures/2026-05-02_cowork-session-01.md` (here)
- **Items proposed for canonical files:** 6 decisions → cerebrum.md Decision Log, 5 breakthroughs → cerebrum.md Key Learnings, 7 gaps → gaps.jsonl + build-backlog.json, 7 lessons → cerebrum.md Lessons, 3 contradictions → cerebrum.md Decision Log (revised entries), 2 patterns → watch-list (promote when observed once more)
- **Approval gate:** Fritz reviews this whole artifact, edits/strikes/approves item-by-item, then a follow-up commit (manual for now) writes approved items to canonical files
- **Cost to produce:** ~30 minutes Cowork time, manual extraction
- **Cost target after capture tool exists:** <5 minutes per session, semi-automated

*Capture document: 2026-05-02*
*Status: PROPOSED — awaiting Fritz review*
