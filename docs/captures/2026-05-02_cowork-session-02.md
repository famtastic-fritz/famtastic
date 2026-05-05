# Cowork Session 02 — Knowledge Capture

**Date:** 2026-05-02
**Surface:** Cowork (third pillar — visual / synthesis layer)
**Operator:** Fritz
**Session length:** ~3 hours autonomous (Fritz authorized "no interactions" mode)
**Status:** PROPOSED CAPTURE — operator reviews before items land in canonical files

Second iteration of the FAMtastic capture flywheel. Includes items from the briefing absorption + iteration 3 build.

---

### D-2026-05-02-08 — Cowork is the third pillar (canonical framing)

STATUS: pending
LANDS IN: .wolf/cerebrum.md (Decision Log)

**Decision:** Cowork is officially the third pillar of FAMtastic's strategy/execution stack. Claude Web = strategy + design conversations; Cowork = visual inspection, multi-source synthesis, audit harnesses, knowledge capture; Claude Code = surgical execution against the codebase.
**Rationale:** Per the briefing — "neither Web nor Code can see Studio while it thinks; Cowork can." Mental model unlocked work that had been stuck for weeks.
**Implication:** Every Cowork session ends with a digest that feeds Web (project knowledge) and Code (commit-ready prompts). The third pillar isn't a sometimes-tool; it's the integration layer.
**Related:** docs/captures/2026-05-02_cowork-session-01.md (the briefing context)

---

### D-2026-05-02-09 — Solution hierarchy applies to ALL recommendations

STATUS: pending
LANDS IN: .wolf/cerebrum.md (Decision Log)

**Decision:** Every recommendation, plan card, and proposal must name where it falls on Fritz's solution hierarchy: Efficiency > Automation > Revenue > "It works." Cowork agents always surface the higher-tier alternative, even when a working solution exists.
**Rationale:** The "it works" trap is what produces site #6 not benefiting from #5's lessons. Naming the tier forces honesty.
**Implication:** Plan cards explicitly tagged. "It works" decisions get a follow-up backlog entry to revisit at higher tier.

---

### D-2026-05-02-10 — Site Studio is the seed; Studios are sibling products

STATUS: pending
LANDS IN: .wolf/cerebrum.md (Standing Architecture Rule)

**Decision:** Each future Studio (Media, Brand, Component, Think Tank) is its own product with its own tools, functions, options, context awareness. They interact via standardized contracts in lib/famtastic/. Site Studio is the seed pattern, not the destination.
**Rationale:** Fritz: "the seeds for future components like media studio to be their own product in the ecosystem that can interact with other products in the ecosystem seamlessly."
**Implication:** Every shared service goes in lib/famtastic/* from day one. Studios import. Nothing tightly coupled.
**Related:** lib/famtastic/ecosystem/index.js, lib/famtastic/README.md

---

### D-2026-05-02-11 — Recipe library is the long-term build mechanism

STATUS: pending
LANDS IN: .wolf/cerebrum.md (Decision Log)

**Decision:** Long-term, Shay builds sites by pulling from a proven recipe library — fully vetted, researched, tested patterns with confidence ratings (proven / tested / experimental / deprecated). Each recipe declares inputs, components, skills_required, sub_agents, process_steps, validation criteria.
**Rationale:** Fritz: "ultimately building sites will be like Shay gets the request, pulls from a proven list of recipes, fully vetted, researched, tested, optimized and just builds."
**Implication:** lib/famtastic/recipes/ scaffold built. Iteration 5+ mines sites/<tag>/ for proven patterns. Recipe confidence ratings drive what Shay reaches for first.
**Related:** lib/famtastic/recipes/index.js (1 example recipe registered)

---

### B-2026-05-02-06 — The capture tool unlocks compounding immediately

STATUS: pending
LANDS IN: .wolf/cerebrum.md (Key Learnings)

The MVP capture tool from iteration 2 + the promote command from iteration 3 means: every Cowork session can now end with a structured artifact in docs/captures/, and items marked approved automatically promote to .wolf/cerebrum.md, .wolf/gaps.jsonl, and .wolf/buglog.json. The flywheel is bootable. First real run is THIS very capture.

---

### B-2026-05-02-07 — page_context substrate already generalizes to N Studios

STATUS: pending
LANDS IN: .wolf/cerebrum.md (Key Learnings)

When iteration 2 built ShayContextRegistry, the page IDs were namespaced as `<studio>.<page>` "just in case." Iteration 3's ecosystem framing made this load-bearing — same primitive, no rework, scales to Media Studio + Brand Studio + future Studios. Lucky catch in iter 2; named explicitly in iter 3 so future work uses the same primitive.

---

### B-2026-05-02-08 — The MCP server pattern is the sandbox escape hatch

STATUS: pending
LANDS IN: .wolf/cerebrum.md (Key Learnings)

Cowork sandbox can't write to .git/ or reach localhost:3334 (host). But MCP servers run on the host outside the sandbox — meaning Cowork can delegate git/push/host-localhost via MCP tools without touching either restriction. mcp-server-git or GitHub MCP installed host-side = permanent fix for the commit blocker. Discovered via Claude Code's research; documented in iter 2 capture.

---

### G-2026-05-02-08 — Studio's `/api/jobs` exists but had no Workshop UI

STATUS: pending
LANDS IN: .wolf/gaps.jsonl

**Symptom:** Job queue endpoint at /api/jobs returns real data; no Workshop UI was rendering it (Active Job tool had stub data).
**Frequency:** Persistent since job queue was built (Session 4-A, 2026-04-20).
**Category:** NOT_CONNECTED → fixed in this iteration
**Resolution:** Active Job tool now polls /api/jobs every 5s while open. shay-workshop.js iter 3 update.

---

### G-2026-05-02-09 — Server prompt assembly was dropping page_context

STATUS: pending
LANDS IN: .wolf/gaps.jsonl

**Symptom:** Browser sent page_context in /api/shay-shay payload, but buildShayShaySiteSnapshot didn't extract it, and buildShayShayPromptSnapshot didn't include it. Shay never saw what page she was on.
**Category:** NOT_CONNECTED → fixed in this iteration
**Resolution:** Two surgical edits to server.js add page_context + registered_context_providers to both snapshots. Pattern established for future page-context fields.

---

### G-2026-05-02-10 — Drive sync action never existed (briefing claimed it did)

STATUS: pending
LANDS IN: .wolf/gaps.jsonl

**Symptom:** Briefing referenced a GitHub Action for Drive sync with a delete-before-upload bug. Search of .github/workflows/ found only hub-ci.yml — no Drive sync action exists.
**Category:** NOT_BUILT (briefing was aspirational, not factual)
**Resolution:** Built from scratch. .github/workflows/drive-sync.yml + scripts/drive-sync.js with delete-before-upload from line 1. Requires GDRIVE_SERVICE_ACCOUNT_JSON + GDRIVE_FOLDER_ID secrets.

---

### L-2026-05-02-08 — Always check briefing claims against the repo

STATUS: pending
LANDS IN: .wolf/cerebrum.md (Lessons)

The briefing said "GitHub Action runs but lacks delete-before-upload logic." Reality: action doesn't exist. Always verify briefing claims against the actual repo before assuming a fix is needed. Saved time once verified, but the wrong assumption could have led to time spent debugging a phantom workflow.

---

### L-2026-05-02-09 — Sandbox-aware design saves wasted cycles

STATUS: pending
LANDS IN: .wolf/cerebrum.md (Lessons)

Spent ~30 minutes early in iter 2 trying to commit from inside the sandbox. Hit two layers of restrictions (.git/ writes blocked, localhost outbound blocked). Lesson: when a tool hits sandbox limits, don't loop on workarounds — escalate to user-side handoff (Claude Code, MCP servers) and document the path.

---

### L-2026-05-02-10 — Architectural primitives generalize when designed cleanly

STATUS: pending
LANDS IN: .wolf/cerebrum.md (Lessons)

Page-context registry, handoff contract, tool rail, and component registry all turned out more general than initially scoped. Common pattern: clean separation of concerns + namespaced identifiers. Future architecture work: design as if there will be N consumers, not 1.

---

### P-2026-05-02-03 — "Briefing claim drift" pattern (watch-list)

STATUS: pending
LANDS IN: .wolf/cerebrum.md (Patterns)

**Pattern:** Documentation/briefing references something as existing when it doesn't, OR as broken when it actually works.
**Instances seen:**
1. Briefing said Drive sync action exists with bug — doesn't exist (this session)
2. cerebrum.md said ORB_STATE_MACHINE has 4 states — code has 5 (iter 2)
3. v1 architecture doc said two surfaces — implementation drifted to six (iter 2 audit)
**Promotion threshold:** 1 more instance → standing rule "always verify doc claims against current code/repo state before acting."

---

### C-2026-05-02-04 — Earlier iteration was "it works" tier; iter 3 promoted to higher tiers

STATUS: pending
LANDS IN: .wolf/cerebrum.md (revised Decision Log entry)

**Prior assumption (iter 2):** Workshop tool rail with 2 stub tools (Active Job + Cost Tracker showing fake data) was sufficient MVP.
**New evidence (iter 3, after Fritz directive about hierarchy):** "It works" tier is a red flag. Real polling against /api/jobs takes 1 hour to wire and elevates to Efficiency tier.
**Resolution:** Active Job tool now does real polling. Pattern: when a stub is identified, name its tier and propose the elevation cost before deferring.

---

## Capture metadata

- **Cost to produce:** ~25 minutes manual extraction during iteration 3 build
- **Items proposed:** 14 (4 decisions, 3 breakthroughs, 3 gaps, 3 lessons, 1 pattern, 1 contradiction)
- **Approval gate:** Fritz reviews this whole artifact, marks STATUS approved/rejected per item, then runs:
  ```
  node lib/famtastic/capture/cli.js promote docs/captures/2026-05-02_cowork-session-02.md
  ```
  Approved items auto-route to their canonical files (cerebrum.md, gaps.jsonl, etc.).

*Capture document: 2026-05-02 (iteration 3)*
*Status: PROPOSED — awaiting operator review*
