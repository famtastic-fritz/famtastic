---
status: canonical
type: vision-and-gap-map
supersedes: none (first of its kind)
referenced by: SITE-LEARNINGS.md, .wolf/cerebrum.md
date captured: 2026-04-24
---

# FAMtastic Knowledge Capture — Vision Alignment Audit

**Date:** 2026-04-24
**Purpose:** Consolidate what's been said across past sessions into a single document that serves the vision you articulated today. Flag what exists, what's dormant, what was designed but never built, and what has never been captured.

**Scope filter applied:** Does this help Fritz reach the vision identified today? Only kept findings that do.

---

## 1. What Already Exists on Disk (in Project Files)

**`famtastic-core-build-principles.md`** is in the project. It was written in a 7-hour founding session. It already contains:

- The canonical FAMtastic definition
- The Lego Principle (universal compatibility, bilateral integration, cross-studio awareness, the "puzzle piece vs Lego" test)
- The Anti-Bottleneck Imperative (Fritz doesn't know what he doesn't know → system must plant seeds)
- The Solution Hierarchy you operate by (efficiency → automation → revenue → "it works" as floor)
- The Empire Architecture (Site Studio → Component Studio → Media Studio → Think Tank → Platform)
- The Faceless Channel Principle (every session/learning = potential content byproduct)
- "Results are the brand" — why the thousand sites exist
- The 2030 survival test — FAMtastic as concept still here + any new tool can be adapted

**This document is the spine.** It's not a site studio doc — it's the whole movement's DNA. I was wrong in the last message to say you'd been slipping on the knowledge capture. The *principles* are captured. What's missing is the *operational translation* of those principles into buildable system behavior, and the current state map of which principles are actually implemented vs still aspirational.

**`famtastic-origin-to-empire.md`** is in the project but memory notes the promotion layer content inside it is still thin.

**`FAMTASTIC-STATE.md`** is in the project but your memory flags it as needing revision to reflect the current system. It's stale relative to today.

---

## 2. Research Architecture — Designed, Partially Built, Not Firing

The research system you're paying for is more built-out than you may remember. It was designed in detail across multiple sessions but is currently dormant in key places.

**Pinecone is the long-term memory tool** you couldn't name. Already set up. Free tier. Index `famtastic-intelligence` with 1536 dimensions, cosine metric, AWS us-east-1. Intended namespace-per-vertical structure. Shay-Shay has a T2 intent called `intelligence_query` that routes Pinecone queries. Whether it's actually being used in every build is unclear and is the first thing to verify.

**Perplexity is wired as API-configured but was previously unused.** A later session confirmed it was added to the agent cards and is intended to handle synthesized multi-source research, market research, competitive analysis — exactly the kind of research you described today. API key is stored. Whether it's firing on every build is unclear.

**The designed research flow is:**
Build starts → check Pinecone for this vertical
↓ cached → use it, mark as base
↓ missing → call Perplexity → store results in Pinecone → use
↓ after 90 days → re-query Perplexity → refresh Pinecone

**The designed Research Source Registry** exists as a spec. Modular, measurable, provider-agnostic. Sources include Pinecone (cache), Perplexity (web research), Gemini CLI (tool/API changes), manual-you, and "homegrown from own builds." Each source has effectiveness tracking. `GET /api/research/effectiveness` was spec'd to return ranking. Whether any of this is actually coded vs still a spec is the critical gap.

**The research tab is missing from the current UI.** Your memory confirms this and a session from April 2026 flagged it — "Phase 3 Research Layer — partially done. `run-research` backend still a stub writer. Real Gemini execution was planned but not shipped. Research Tab UI was deferred pending backend."

**Gap identified:** Research being "generic shipping verbiage" vs "FAMtastic-applied research" is a prompt-layer issue. Even if Pinecone and Perplexity are firing, the queries being sent are generic ("shipping industry best practices") rather than FAMtastic-applied ("how do we make the hero of a shipping company command attention given that fast/reliable/handle-with-care are the buyer values"). The research system needs a FAMtastic query composer, not just a research tool router.

---

## 3. Client Preview / Review / Send-Link Flow — Designed, Sits in Phase 6-A

This was designed in detail. Four components:

1. **Client preview URL** — Netlify's deploy preview system, unique shareable link, copyable with one click from the deploy panel
2. **Payment link** — PayPal.me with monthly rate parameter, generated from the site's configured rate captured in the brief
3. **GoDaddy DNS card** — shows the exact CNAME record the client needs, reads hostname from Netlify API
4. **Approval state transition** — sites can move from `deployed` to `approved`, timestamp recorded, distinct indicator in portfolio

**Status:** Memory says "revenue path done" in a recent session. Whether "done" means "designed and scaffolded" or "shipped and working" requires verification. The UI redesign may have hidden or removed the relevant surfaces. A Claude Code audit of the deploy panel is the quickest way to confirm.

**This feature is blocking for the reunion site** (July 12 deadline) because delivering a real client site without a preview/payment flow defeats the validation.

---

## 4. Brain Routing for Image/Video Generation — Partially Built

What exists:

- Brain adapter pattern with `ClaudeAdapter`, `GeminiAdapter`, `CodexAdapter` — brain-level routing works
- Multi-image-provider setup: Imagen 4.0 (characters), gpt-image-1 (detail quality), FLUX (speed), Leonardo (fallback), gpt-image-2 (pending org verification)
- Character pipeline tested end-to-end via a single Desk prompt

What's designed but not generalized:

- **The quality-vs-speed routing for images** that you described today ("simple spear → fal for speed, full-screen background → gpt-1 or 2") is the right pattern but has been only partially implemented for the character pipeline. It has not been extended to *all* visual generation. This is what you meant by "the character pipeline was a long side quest but the real prize was learning how to compose prompts that produce intentional output." That learning needs to generalize.
- **The prompt composer** — the part that actually knows how to turn "hero for a shipping company with brand colors" into "back of shipping container, three men working fast, wearing [brand colors], shot from angle X, mood Y" — this is the missing piece. It's not a tool problem. It's a composer problem.

**Kimi K2.6** is flagged in memory for evaluation: OpenAI-compatible API, 5-8x cheaper than Claude, Agent Swarm (300 parallel sub-agents). Directly relevant to orchestrating many sites' pipelines concurrently and to your stated goal of Shay-Shay having reach into many brains.

---

## 5. FAMtastic Score — Designed, Partial, Ambiguous

Score was designed with seven components:

- FAMtastic Score (visual distinctiveness, 25%)
- Performance (Lighthouse mobile, 20%)
- Accessibility (axe-core inverted, 15%)
- Brief Fidelity (spec vs output, 15%)
- Content Complete (10%)
- Uptime (10%)
- Revenue Signal (5%)

**Thresholds defined:** Below 60 triggers auto remediation proposal. Below 40 flags for Fritz review.

**Gap:** The "visual distinctiveness evaluation" part of the score — the actual FAMtastic measurement — has never been operationally defined. The score has a weight but no way to compute the number. This is the same tacit-vs-explicit knowledge gap we named today. The principle lives in you. The score function doesn't know how to evaluate it yet.

**This is where the conversation-based learning model you described today becomes architecturally real.** If you and Shay-Shay have iterative conversations about specific elements ("how do we make this testimonial more FAMtastic"), each of those conversations becomes training data for what the visual distinctiveness score is measuring. Over time the score becomes computable because there's enough captured judgment to train a measurement against.

---

## 6. FAMtastic DNA Vocabulary — Instructional, Not Enforced (except after this week's fixes)

Already encoded in `famtastic-skeletons.js` and `FAMTASTIC_DNA_VOCAB`:

- `fam-hero-layered` with four layers (`--bg`, `--fx`, `--character`, `--content`)
- `fam-wave-divider`, `fam-diagonal` section dividers
- `data-fam-animate` animation attributes
- `data-fam-scroll` parallax effects
- Loadable CSS files: `fam-hero.css`, `fam-shapes.css`, `fam-motion.js`, `fam-scroll.js`

**After today's GAP-1/2/3 fixes, the default palette is now enforced** and the single-page edit path preserves hero/nav skeletons.

**Still instructional (not enforced):**

- Font mixing (no rule that says "if 3 fonts used, 2 must be non-generic")
- Wave headers vs rectangles (vocabulary exists, no rule mandates use)
- Background animations (vocabulary exists, no contextual rules about when to use subtle vs bold)
- Parallax (capability exists, no application rules)
- Character bleed past container (described in principles, not encoded as rule)

**What today's vision added that was never captured before:**

- The "mix tastefully blended" rule — a site should contain some mix of these techniques, never all, never none
- The FAMtastic intensity dial concept (some sites need clean-competent, some need WOW) — this is the `famtastic_mode` flag's original design intent
- Third-party functionality always triggers research on the third-party itself — research is not just for the site subject

---

## 7. The Two-Tier Design Intent (Never Documented Until Now)

**This is the most important gap in the existing documentation.**

The `famtastic_mode` flag was your deliberate design choice to have two output tiers:

- **Tier A: Clean-competent.** Sites that get out of the way. Some verticals, some briefs call for this. Not every site in 1,000 needs to be WOW.
- **Tier B: FAMtastic-WOW.** The extraordinary ones. Character extends past container. DJ over strobe lights with spinning turntables. Mixed fonts. The attention-forcing design.

This was never written down anywhere. The audit misread it as a bug. Gap 4 can now be correctly framed: the fix isn't "flip famtastic_mode to true always" — it's "make the tier controllable from the brief and document when each tier applies."

---

## 8. What Was Designed But Never Built

This is a short list of named items that were scoped in past sessions, never shipped, and connect to today's vision.

**Mission Control as an operations center** — not a dashboard. Active missions, gate failures, intelligence feed, health alerts, weekly digest. Scoped in detail. UI partially built. Whether current UI redesign kept or dropped it needs verification.

**Shay-Shay's autonomous cross-studio dispatching** — the "open this component in Component Studio" / "open this image in Media Studio" pattern. The principle is documented. The implementation isn't.

**Component Studio as a separate first-class studio** — referenced throughout principles. Not built.

**Media Studio as a separate first-class studio** — referenced throughout principles. Partially built in the sense that image generation exists, but not as a standalone studio with its own workspace.

**Think Tank** — referenced as a first-class studio for strategy and exploration. Not built.

**The Adapter Pattern for non-FAMtastic tools** — principle documented, no actual adapter code exists yet.

**The 72-part "how I used Claude Code to build this" video series** — mentioned in one session as a future content product. Not built, not scheduled.

**The Faceless Channel pipeline** — system that turns session learnings into content automatically. Described. Not built.

**Competitor research specifically as a layer on top of vertical research** — described today. Not implemented. Distinct from general research because it requires identifying competitors, scraping or researching their sites, extracting what they do well and where the gaps are, and feeding that into the brief with "here's how we beat them on their weaknesses."

**The FAMtastic Fritz Recap Analysis doc** — a principle-level summary referenced in one session as a separate artifact from the core build principles. Appears never to have been created.

---

## 9. The Operational Gap Between Today's Vision and Today's System

Summarizing the gaps that today's vision highlighted and the system doesn't yet close:

1. **Research is not FAMtastic-applied.** Pinecone + Perplexity exist. Queries are generic. The composer that turns "shipping company" into "how do we make this specific hero extraordinary given shipping's buyer values" doesn't exist.

2. **The learning loop from Fritz-Shay-Shay conversations isn't capturing the principle as training data.** Each "make this more FAMtastic" conversation currently evaporates after the session. It should be stored, indexed, and used as reference for future FAMtastic-ification requests.

3. **The two-tier design intent was tacit.** Now documented in this artifact. Needs to be encoded in the interpreter/build layer as an explicit build_mode-style signal.

4. **Image prompt composition doesn't generalize beyond the character pipeline.** Quality-vs-speed routing by shot type needs to be a library function, not a character-specific behavior.

5. **Competitor research is not a pipeline step.** The spec existed for research in general. Competitor research as a FAMtastic-mode adjunct was never specifically scoped.

6. **Research on third-party integrations is not a rule.** Today's vision added this. Not yet encoded.

7. **The FAMtastic Score's visual distinctiveness dimension is uncomputable.** No function, no training data, no operational definition. This is downstream of the conversation-based learning loop — once that exists, this becomes buildable.

8. **Client review/preview/payment flow status is uncertain post-UI-redesign.** Verification needed. Blocks reunion site.

9. **The research tab is missing from the current UI.** Confirmed. Needs rebuild against the vision articulated today.

10. **Font mixing, animation rules, shape-variety rules are instructional not enforced.** Today's fixes addressed palette. These are the next wave of instructional-to-enforced conversions.

---

## 10. What This Means for Sequencing

You said the operational principle is: always have a working end-to-end product that can go concept-to-prod via prompting and automation, phase the gaps in without ever breaking that property.

Based on what this knowledge capture surfaces, the sequencing that serves the vision is:

**Stream 1: Close the active refactor.** Finish gap 4. Run edge case tests. Phase 1 of V2. This gets the interpreter/build pipeline structurally sound. In parallel, this work is not the vision — it's the prerequisite for doing the vision work without the system undermining every step.

**Stream 2: Make research actually fire.** Verify Pinecone and Perplexity are being called on every build. If not, wire them. Then build the FAMtastic-applied query composer that turns vertical + brief into real research questions.

**Stream 3: Build the conversation-based learning capture.** A simple storage mechanism where every "how do we make this more FAMtastic" conversation gets saved, tagged, and indexed. This becomes training data over time. Low-effort to start, high long-term value.

**Stream 4: Close the client delivery path.** Verify or rebuild the preview/payment/DNS flow before reunion site. Can happen in parallel with Stream 2.

**Stream 5: Document and encode the two-tier intent.** After gap 4 is closed, decide whether famtastic_mode becomes interpreter-detectable or explicitly briefable or both. Document the decision.

Streams 2, 3, 4 can happen partially in parallel. Stream 1 is the critical path because the other streams depend on a structurally coherent interpreter and build layer.

---

## 11. Open Questions That Only You Can Answer

These are decisions the vision implies but doesn't settle:

1. Is `famtastic-core-build-principles.md` the canonical principles doc, or should a new `FAMTASTIC-PRINCIPLES-V2.md` supersede it that includes today's two-tier clarification and intensity concepts?

2. Should the FAMtastic Score's visual distinctiveness dimension start with a human-rated numeric scale (Fritz rates every build 1-10) and only automate it once enough data exists, or wait for automation?

3. Does the conversation-based learning capture live in Pinecone alongside vertical research, or in its own separate memory system?

4. When the two-tier build_mode is implemented, what's the default for a brief with no explicit signal? Your instinct today was "FAMtastic mode should be bold" — does that mean Tier B is the default and Tier A is opt-in, or vice versa?

5. Should the four-stream plan above be sequenced, or is parallel OK for your current capacity?

---

## Addendum A: The Adobe Pattern

*Added: 2026-04-24 (same session)*

This addendum corrects and expands Sections 8 and 10 of the main
capture. Fritz flagged that "Component Studio — not built" and
similar items were framed too narrowly as future features of Site
Studio. They are not features. They are future standalone products
whose seeds are being planted inside Site Studio now.

The governing architectural pattern is the Adobe Creative Cloud
pattern. Photoshop, Illustrator, Firefly, Premiere — separate
full-identity products that interact seamlessly through shared
contracts, shared file formats, and shared context. Each has
standalone value. Together they form an ecosystem whose power is
greater than the sum of the apps.

FAMtastic follows the same pattern. Site Studio is the first
product AND the incubator for the others. When Component Studio,
Media Studio, Think Tank eventually stand on their own, the fact
that they originated in Site Studio will no longer matter
architecturally. What will matter is that they share the Platform,
share contracts, share context, and know how to hand off work to
each other.

### THE STUDIO ROSTER (PRESENT AND FUTURE)

**Site Studio** — current product, first market expression. Builds
  income-generating websites.

**Component Studio** — future standalone. Seeds: component editing,
  reuse patterns, quality tracking. Expected extraction point:
  after component logic is decoupled enough from site-build logic
  to communicate through contracts.

**Media Studio** — future standalone. Seeds: image generation pipeline
  (Imagen, gpt-image-1, FLUX, Leonardo), video pipeline (Veo,
  ffmpeg), character pipeline. Partially built in the sense that
  generation works, but not yet a standalone workspace with its
  own identity.

**Think Tank** — future standalone. Seeds: brainstorm mode in Shay-Shay,
  strategy conversations, exploratory research. Currently lives as
  modes inside Site Studio. Needs eventual extraction.

**FAMtastic Platform** — the substrate. Hosts all studios. Manages
  accounts, shared assets, billing (eventually), cross-studio
  dispatching, Mission Control, the intelligence loop, Pinecone,
  Perplexity, Shay-Shay's long-term memory, and the conversation-
  based learning capture. The Platform is not a studio — it is what
  makes studios work together.

### ARCHITECTURAL IMPLICATIONS THAT SHAPE CURRENT DECISIONS

1. **Separation-ready architecture.** Every piece of work today that
   relates to future-studio domains (components, media, strategy)
   must be built assuming eventual extraction. Communicate through
   contracts, not tight coupling.

2. **Cross-studio dispatching is a message contract, not a function
   call.** Every inter-studio handoff is a structured payload that
   would work whether the studios are same-process, different-
   process, different-server, or different-product.

3. **Each studio needs its own identity.** Distinct branding, distinct
   entry point, distinct user mental model. The studio's identity
   tells the user what problem it solves.

4. **The Platform hosts shared services.** Research pipeline. Conversa-
   tion-based learning capture. Pinecone namespace management.
   Cross-studio asset library. Account and license management (when
   commercial). Mission Control. Intelligence loop. These are
   Platform concerns, not Site Studio concerns, even though they're
   being built inside Site Studio's codebase today.

5. **FAMtastic is the standard across all studios.** A component can
   be FAMtastic. An image can be FAMtastic. A strategy can be
   FAMtastic. A site can be FAMtastic. The FAMtastic Score must
   eventually be multi-domain, with each studio contributing its
   own scoring dimension.

### HOW THIS CHANGES THE SEQUENCING (UPDATING SECTION 10)

Stream 3 in the original capture was "build the conversation-based
learning capture." The correct framing is: build it in the location
that will become the Platform's shared services layer, not inside
Site Studio's server.js. This may mean creating a new module
structure today — /lib/platform-services/ or similar — that Site
Studio calls but doesn't own. Future studios will also call it.

Stream 2 (research firing) is also a Platform concern. Pinecone
and Perplexity integrations should live in Platform services, not
in Site Studio code. Site Studio calls them. Media Studio will
eventually call them. Think Tank will call them.

This means the correct sequencing has an earlier stream than
any listed before:

**Stream 0:** Create the Platform services layer as a distinct
  namespace inside the current codebase. Move/rewrite Pinecone,
  Perplexity, long-term memory, and (eventually) the learning
  capture to live there. Site Studio calls Platform services
  through a well-defined API, not directly.

Stream 0 does not need to happen before Stream 1 (close the
current refactor). But it needs to happen before Stream 2 and
Stream 3, because doing Stream 2 or Stream 3 without Stream 0
guarantees a later extraction rewrite.
