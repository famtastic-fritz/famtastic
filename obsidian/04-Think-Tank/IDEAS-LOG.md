# FAMtastic Think Tank — Vetted Ideas, Ready to Build

The build queue. Ideas that have been captured (in FAMtastic Thoughts), vetted, and are now ready to be designed/built. Each entry uses a creative seed-themed name — not "Lane A/B/C" — because naming is part of the philosophy.

**Convention:** Each idea = `IDEA-NNN [Stream: X] "Creative Name"` — one-line concept, then the build spec, status, and dispatch notes.

**Stream tags (from the five-stream architecture):**
- `[S1: Shay+platform]` — agent layer, self-improvement, tooling
- `[S2: Income]` — contract/W2 or FAMtastic revenue
- `[S3: Research]` — standing research engine, seed-planting
- `[S4: Metaphysical]` — spiritual layer
- `[S5: Fritz]` — mental/physical/health/relationships

---

## IDEA-001 [S1: Shay+platform] — "The Rod"

**Concept:** Capture-loop skill. Shay's self-improvement module. Triggers on FAMtastic Thought moments across any surface (chat, voice, photo, live convo), pre-scaffolds the four-layer extraction (event → lesson → lesson-from-lesson → pattern), routes to THOUGHTS-LOG. Every catch sharpens the next catch.

**Why the name:** Fishing metaphor (Fritz's, from Q8 and FT-002). You can't script the catch — but you rig the rod. This is the rod.

**Build spec:**
- Skill: `famtastic-thought-capture` (devops category, Shay self-improvement)
- Triggers: heuristic on Fritz's turns that contain concept-transmission language ("the thing is...", "what you missed is...", "the lesson here is...")
- Action: append to THOUGHTS-LOG with extraction layers pre-scaffolded
- Self-improvement loop: each capture updates the trigger heuristic

**Status:** ready to build (in-scope for Shay as self-improvement)

**Dispatch:** Shay builds this herself — it IS her self-improvement module.

---

## IDEA-002 [S2: Income] — "First Leaves"

**Concept:** FAMtastic Thoughts studio MVP. Turn the raw THOUGHTS-LOG into a real studio artifact — Site Studio template for a thought-capture page, derivation workflow (event → derivatives), public/private toggle, concept-tagging (not keyword-tagging).

**Why the name:** First leaves on the seed. The studio's first visible growth past the log.

**Build spec:**
- Site Studio template: "thought-capture-page" — single-thought view with the four-layer extraction visible
- Derivation workflow: each captured thought can spawn derivatives (post, video script, teaching module, symbol sketch)
- Public/private toggle: some thoughts are internal teaching, some are publishable
- Concept tags: tag by underlying concept (identity, faith, capture, seed), not surface keywords

**Status:** ready to delegate

**Dispatch:** Claude Code /goal or Codex. Modular — fits the modular workflow thesis.

---

## IDEA-003 [S2: Income] — "The Wind" (gated)

**Concept:** Marketing/branding/distribution pipeline. Multi-modal output (visual/symbolic/animated) so derivatives transcend language barriers. Brand layer. Cha-ching lane.

**Why the name:** Wind carries seeds. This is the module that spreads what the other modules grow.

**Build spec:**
- Multi-modal format engine: takes a derivative (e.g., "comma-where-God-placed-it" concept) and outputs visual/symbolic/animated variants
- Distribution: routes derivatives to channels (FAMtastic Thoughts blog, social, Site Studio network)
- Brand layer: applies FAMtastic visual language (once seed symbol is solved)

**Status:** GATED on seed symbol (logo redesign, see open-problems). Cannot ship the format engine without the canonical symbol language. Also gated on IDEA-002 producing derivative candidates.

**Dispatch:** defer until symbol work is unblocked + IDEA-002 has produced at least 5 derivatives.

---

## Pipeline map (how ideas move)

```
FAMtastic Thoughts (capture, raw)
        ↓ (vetting — Fritz reviews, marks ready)
FAMtastic Think Tank (this file — vetted ideas, ready to build)
        ↓ (dispatch — Shay routes to right builder)
Build (Claude Code /goal, Codex, Shay-in-scope, etc.)
        ↓ (ship)
FAMtastic Studios (live products)
```

---

*First three ideas logged 2026-06-06. Naming convention: seed-themed creative names. Stream-tagged.*
