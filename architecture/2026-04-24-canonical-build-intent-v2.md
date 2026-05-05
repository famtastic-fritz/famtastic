# FAMtastic Studio — Canonical BuildIntent Architecture Proposal V2
**Date:** 2026-04-24  
**Status:** Current canonical BuildIntent direction as of 2026-05-04. Phased implementation pending; V1 is historical only.  
**Supersedes:** [`2026-04-24-canonical-build-intent.md`](./2026-04-24-canonical-build-intent.md) (V1 — retained as historical artifact, do not modify)  
**Review source:** GPT-5.4 critique of V1, incorporated by Fritz. Corrections are treated as authoritative, not as suggestions to debate.

---

## What V2 Keeps From V1

V1's core direction is correct and unchanged:
- A single `interpretBuildIntent(rawText, context)` function replaces the four divergent entry-point interpreters
- A deterministic `stripStudioFramingPrefix(text)` utility fixes slug contamination before any AI call
- The approval loop (`design_brief.approved: false` → infinite recycle) is eliminated
- Clarification questions are capped at three, blocking only
- The migration is phased so Studio is functional at every boundary

---

## V1 Positions Being Revised

The following specific positions in V1 are corrected in V2. Each is traceable to one of the seven critique items.

**C1 — Schema leanness (V1 Section 2).**  
V1's `BuildIntent` required the interpreter to produce 12 explicit pose descriptions, full deployment targets, and complete section-level page specs. These belong to downstream layers. V2's schema limits the interpreter to fields it can actually derive from user input: identity, site goal, design direction signals, a page list with intent notes, and a character hint. Everything else is the build layer's job.

**C2 — Interpreter role (V1 Section 3 system prompt).**  
V1's interpreter system prompt restated the full FAMtastic DNA as if it were the sole authority — BEM class vocabulary, section shape defaults, layout constraints, logo position invariants. This duplicates what already lives in `famtastic-skeletons.js` and the build prompt. V2's interpreter carries only enough DNA awareness to normalize user-stated intent. Design defaults are resolved by the build layer, which already has that authority.

**C3 — Auto-approval (V1 Phase 3).**  
V1 proposed auto-triggering a build whenever `readyToBuild: true`. For Studio Chat, this is risky: an expensive or surprising full build can fire on a single message. V2 introduces an explicit `build_mode` field — "review" or "auto" — set per entry point, not derived from completeness of the intent.

**C4 — Semantic fallback in Phase 2 (V1 Phase 2).**  
V1 fell back to `extractBriefPatternBased` (a second code path, not AI-driven but semantically separate) when the interpreter returned `needsClarification: true`. This reintroduces the divergence the refactor eliminates. V2 keeps all fallbacks inside the canonical interpreter. Deterministic helpers (regex, string manipulation) are fine inside `interpretBuildIntent`. A separate fallback path is not.

**C5 — Portfolio migration as a numbered phase (V1 Phase 6).**  
V1 made portfolio spec migration Phase 6 — too early. Retrofitting existing specs before the new interpreter has survived real traffic on new sites is premature. V2 moves all portfolio migration to a "Post-Stabilization Work" section, explicitly out of the numbered phase sequence.

**C6 — Operational recommendation in architecture doc (V1 Section 5).**  
V1 stated that `site-famtastic-build-full` "should be deleted, not migrated." Deleting a site is Fritz's call, not an architecture decision. V2 moves this and any similar operational choices to a clearly-marked appendix, with no recommendation.

**C7 — Test suite framing (V1 Section 5).**  
V1 framed 107/107 vs 31/33 as a contradiction requiring resolution. These are different test suites in different states; treating them as contradictory is wrong. V2 reframes: establish a per-suite baseline for every test file the migration could affect, using git history to find each suite's last known green run. No suite is declared canonical over another.

---

## Section 2 — The Lean BuildIntent Schema

This is the contract between the interpreter and the build layer. It contains what the interpreter can reliably derive from user input. It deliberately excludes what the build layer already owns.

```typescript
interface BuildIntent {

  // ── Identity ─────────────────────────────────────────────────────────────
  // Always populated. The interpreter extracts these deterministically from
  // the stripped input text. Even a minimal "build a site for X" produces a
  // valid slug and business_name — clarification is never needed for these.
  identity: {
    business_name: string;      // required — "JJ B&A Transport"
    slug: string;               // required — "site-jj-ba-transport"
    site_name: string;          // required — display name, may differ from business_name
    tagline?: string;           // optional — extracted verbatim if user states one
    location?: string;          // optional — "Miami, Florida"
    vertical?: string;          // optional — inferred category: "freight", "food", "beauty"
    contact?: {
      phone?: string;
      email?: string;
      address?: string;
    };
  };

  // ── Site Goal ────────────────────────────────────────────────────────────
  // One sentence synthesized from the user's description. What a successful
  // site accomplishes for the business. The build layer uses this to weight
  // content priorities and CTA copy.
  site_goal: string;            // required — "Generate inbound quote requests from
                                //             Bahamian families and commercial shippers"

  // ── Design Direction ─────────────────────────────────────────────────────
  // What the user explicitly stated about design. Sparse is correct here.
  // Fields omitted when the user did not specify them — the build layer
  // applies FAMtastic defaults for any gap. The interpreter does not invent.
  design_direction: {
    palette?: {
      // Populated only when the user specified colors — either by hex or by name.
      // Hex values are used verbatim. Color names are passed as-is; the build
      // layer maps names to canonical FAMtastic hex values via FAMTASTIC_PALETTE
      // in famtastic-skeletons.js. The interpreter does NOT perform name→hex
      // conversion — that mapping lives in one place only.
      user_specified_colors: string[];  // e.g. ["#00A79D", "warm gold", "coral"]
      notes?: string;                   // e.g. "user named specific Bahamian palette"
    };
    typography?: {
      // Populated only when the user named a font style or family.
      headline?: string;        // e.g. "bold display serif", "Playfair Display"
      body?: string;            // e.g. "clean sans-serif"
      notes?: string;
    };
    tone: string[];             // required — always inferrable. Min 1 value.
                                // ["bold", "warm", "dependable"] — extracted from
                                // user's word choices, not asked.
    avoid: string[];            // required — anti-patterns the user explicitly named.
                                // Empty array when none stated (never null).
    logo_position?: 'top-left' | 'top-center' | 'hero-integrated' | 'top-right';
                                // optional — populated only when user explicitly placed it.
                                // Build layer default is top-center when absent.
    override_flags?: string[];  // optional — explicit user deviations from FAMtastic
                                // convention, recorded so the build layer can honor them.
                                // e.g. ["user requested dark navy palette over FAMtastic default"]
  };

  // ── Pages ─────────────────────────────────────────────────────────────────
  // A list of pages with titles and intent notes. Section-level specs belong
  // to the build layer, not the interpreter. The build layer generates section
  // structure from the page intent, the site goal, and the vertical.
  pages: Array<{
    title: string;              // required — "Home", "About Us", "Services", "Contact"
    filename: string;           // required — "index.html", "about.html", etc.
    intent: string;             // required — one sentence. What this page must accomplish.
                                // "Establish credibility and drive quote requests above the fold"
  }>;

  // ── Character Hint ────────────────────────────────────────────────────────
  // Present only when the user described a mascot, character, or brand figure.
  // This is a HINT — a seed for the character pipeline to expand. The pipeline
  // generates anchor, poses, and placement from this hint. The interpreter does
  // NOT produce pose descriptions, pose counts, or placement rules.
  character_hint?: {
    name: string;               // required when present — "Skipper"
    description: string;        // required when present — full visual description as
                                // the user stated or as can be faithfully derived.
                                // "Bold pelican in a captain's hat with Bahamian flag pin,
                                //  weathered-friendly, confident, warm, illustrated style"
    style?: string;             // optional — "Illustrated/Cartoon", "Realistic"
    placement_notes?: string;   // optional — any placement intent the user stated.
                                // "Appears across hero, service cards, and CTAs"
  };

  // ── Clarification ─────────────────────────────────────────────────────────
  clarifications?: string[];    // present when needs_clarification: true.
                                // Max 3. Blocking questions only — things the build layer
                                // cannot reasonably default. Never asked when the build
                                // layer can apply a safe default instead.

  // ── Control Fields ────────────────────────────────────────────────────────
  ready_to_build: boolean;      // required. True when identity is complete and
                                // needs_clarification is false.
  needs_clarification: boolean; // required. True when ≤3 blocking questions exist.
  build_mode: 'review' | 'auto'; // required. Set by caller context, not by interpreter.
                                  // See Section 4 for defaults per entry point.
  source: 'shay-shay' | 'studio-chat' | 'autonomous' | 'copy-paste';
  interpreter_version: string;  // semver — for migration tracking. Specs without this
                                // field were written by the pre-V2 interpreter.
  raw_input?: string;           // original text, truncated to 1000 chars. Audit trail.
  generated_at: string;         // ISO timestamp
}
```

### What V2's Schema Deliberately Excludes — and Why It's Safe

| V1 Field | Why Excluded in V2 | Who Owns It Instead |
|----------|--------------------|---------------------|
| `dna.palette` (full hex values) | Build layer owns canonical FAMtastic hex mapping via `FAMTASTIC_PALETTE` constant in `famtastic-skeletons.js`. Interpreter passes user-stated color signals; build layer resolves to hex. | Build layer (`famtastic-skeletons.js`) |
| `dna.layout_constraints` (hero_bleeds_container, asymmetric_sections, etc.) | These are FAMtastic invariants applied to every build. They do not vary per site unless the user explicitly overrides them. Restating them in the BuildIntent adds no information. | Build prompt + `famtastic-skeletons.js` |
| `dna.section_shapes` | Section shapes are applied by the build layer based on vertical and layout instruction. The interpreter has no more information than "use the vocabulary in famtastic-skeletons.js." | Build prompt |
| `character.pose_descriptions[]` (12 explicit poses) | Generating 12 physically precise pose descriptions is the character pipeline's job. The interpreter does not have the context to produce better poses than `DEFAULT_POSES` already provides. | `generateCharacterPosesCore` |
| `character.pose_count` | Defaulted by the character pipeline (12 for full set, 8 for abbreviated). Not a user-input decision in the general case. | `runCharacterPipeline` |
| `character.placement_rules` (structured booleans) | Placement defaults (hero: true, service_cards: true, cta_sections: true) are applied by the build layer from the character hint's presence. Only user-stated exceptions go in `placement_notes`. | Build prompt |
| `pages[].sections[]` (full section specs) | Section structure is derived by the build layer from page intent + site goal + vertical. The interpreter cannot produce better section specs than the build layer already generates from a page-level intent. | Build prompt + `handleChatMessage` |
| `deployment` (platform, netlify_slug, domain) | Deployment is configured after build, not before. Including it in a pre-build intent schema is premature. | `runDeploy`, Studio UI |

### Schema Safety Condition

The lean schema is only safe if the build layer's default application is reliable — specifically:
- `famtastic-skeletons.js` must apply the canonical FAMtastic palette when `design_direction.palette` is absent
- The build prompt must apply logo-position, hero BEM structure, and section shapes as invariants, not suggestions
- The character pipeline must reliably expand `character_hint` into a full spec

If any of these three conditions does not hold, the gaps the interpreter no longer fills will silently produce generic output — exactly the JJ B&A failure mode. This is the primary new risk introduced by the leaner schema. See Section 6, R-NEW.

---

## Section 3 — Interpreter Responsibility Boundary

### What the Interpreter Does

**1. Deterministic pre-processing (no AI, always runs first)**

```javascript
function stripStudioFramingPrefix(text) {
  return text
    .replace(/^FAMtastic\s*[—–-]\s*Build\s+(?:Full\s+)?Site\s*:\s*/i, '')
    .replace(/^Build\s+(?:Full\s+)?Site\s*:\s*/i, '')
    .replace(/^FAMtastic\s+Site\s+Studio\s*[—–-]\s*/i, '')
    .trim();
}

function truncateForInterpreter(text, maxChars = 6000) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n[...truncated — original preserved in raw_input]';
}
```

These two functions run before any AI call. They are deterministic, testable without an API key, and fix the JJ B&A slug contamination at the source.

**2. Intent normalization (AI call, lean scope)**

The AI call extracts what is in the text — it does not author design decisions. Specifically:

- **Identity extraction:** business name, slug, site_name, tagline, location, contact details, vertical inference. Slug generation follows explicit rules (see system prompt, Section 3.3 below). Business name is derived from content, never from prompt framing.
- **Site goal synthesis:** one sentence capturing what a successful site accomplishes. Synthesized from the user's stated purpose, not from vertical convention.
- **Design direction signal capture:** extracts only what the user explicitly stated — hex values, color names, font names, tone adjectives, specific anti-patterns. Does not invent or default anything.
- **Page list extraction:** titles and filenames inferred from user-stated pages, section names, or standard defaults (home/about/contact). Each page gets one intent sentence derived from the brief.
- **Character hint extraction:** if the user describes a mascot or brand character, captures name, visual description, style, and any placement notes the user stated. Derives nothing beyond what the user stated.
- **Clarification detection:** identifies gaps that block a build and cannot be defaulted — maximum three questions. If the build layer can reasonably default a missing field, the interpreter does not ask about it.

**3. Control field assignment (deterministic, no AI)**

```javascript
// Set after the AI call, not by the AI
buildIntent.build_mode = context.build_mode || 'review';
buildIntent.source = context.source || 'studio-chat';
buildIntent.interpreter_version = INTERPRETER_VERSION;
buildIntent.generated_at = new Date().toISOString();
buildIntent.ready_to_build = !buildIntent.needs_clarification
  && !!buildIntent.identity.business_name
  && buildIntent.pages.length > 0;
```

These are never left to the AI to set — the control fields are stamped programmatically after the AI response is parsed.

---

### What the Interpreter Explicitly Defers to the Build Layer

The following are build-layer responsibilities. The interpreter has no opinion on them and produces no output for them.

| Concern | Why It Belongs to the Build Layer |
|---------|----------------------------------|
| Canonical FAMtastic hex values | Lives in `FAMTASTIC_PALETTE` constant in `famtastic-skeletons.js`. Single source of truth. The interpreter passing hex values would create a second copy that diverges over time. |
| Hero BEM layer vocabulary (`.fam-hero-layer--bg`, etc.) | Enforced by `HERO_SKELETON_TEMPLATE` in `famtastic-skeletons.js`. The build prompt injects this skeleton; the interpreter has no role. |
| Section shapes and dividers | Applied by the build prompt based on vertical and layout mode. The interpreter has no better information for this decision than the build layer already has. |
| Nav class vocabulary (`.nav-links`, `.nav-toggle-label`, etc.) | Enforced by `NAV_SKELETON` in `famtastic-skeletons.js`. |
| Logo SVG extraction and placement | Handled by `extractLogoSVGs()` and `applyLogoV()` in `server.js` post-processing pipeline. |
| Pose descriptions for character pipeline | `DEFAULT_POSES` in `runCharacterPipeline` are physically precise descriptions developed specifically for image generation. The interpreter cannot produce poses of equal quality from a brief, and should not try. |
| Section content and copy | Generated by `handleChatMessage` from the page intent + site goal + vertical. |
| `design_brief.approved` flag | The V2 `build_mode` field replaces this. The interpreter does not write to `spec.json` directly — its output is consumed by the caller, which writes spec. |

---

### The Interpreter System Prompt (V2 — Lean)

The V2 system prompt is significantly shorter than V1's because it does not restate the build layer's DNA. It carries only what the interpreter needs to normalize intent correctly.

```
You are the BuildIntent interpreter for FAMtastic Site Studio. Your only job is to
read a site request — structured or unstructured — and extract a normalized BuildIntent
JSON object. You do not make design decisions. You do not invent details the user did
not provide. You extract, normalize, and ask when blocked.

You are not a general-purpose assistant. You produce one JSON object and nothing else.
Begin your response with { and end with }.

───────────────────────────────────────────────────────────────────
SLUG GENERATION — NON-NEGOTIABLE
───────────────────────────────────────────────────────────────────
The slug must come from the BUSINESS NAME, not from the surrounding text structure.

Rules:
1. Identify the actual business name in the content (not the prompt framing).
2. Lowercase it. Remove characters that are not letters, numbers, or spaces.
   Replace spaces and ampersands with hyphens.
3. Prefix with "site-". Maximum 40 characters total.
4. NEVER include these words in the slug unless they are literally in the business name:
   famtastic, build, full, studio, site, platform

Correct: "JJ B&A Transport" → "site-jj-ba-transport"
Wrong:   A prompt starting with "FAMtastic — Build Full Site: JJ B&A Transport"
         → "site-famtastic-build-full"  ← this is a slug contamination failure

If you cannot identify a specific business name, use your best extraction from the
content and set needs_clarification: true with "What is the business name?" as the
first clarification question.

───────────────────────────────────────────────────────────────────
DESIGN DIRECTION — EXTRACT, DON'T INVENT
───────────────────────────────────────────────────────────────────
For design_direction:
- palette: populate user_specified_colors ONLY with colors the user actually named
  (hex values or color names). If the user specified no colors, omit palette entirely.
  Do NOT invent a palette based on industry convention.
- typography: populate ONLY with font families or styles the user named.
  If unspecified, omit entirely.
- tone: always populate — infer 2–4 adjectives from the user's word choices and
  the nature of the business. Never ask.
- avoid: populate with anti-patterns the user explicitly stated. Empty array if none.
- logo_position: populate ONLY if the user placed the logo. Omit if not stated.
- override_flags: record when the user explicitly requests something that departs
  from a design convention (e.g., "I want a traditional corporate look").

───────────────────────────────────────────────────────────────────
CHARACTER HINT — DETECT, DON'T EXPAND
───────────────────────────────────────────────────────────────────
If the user describes a mascot, brand character, or brand animal, populate character_hint
with name, description (faithfully derived from what the user stated), style if stated,
and placement_notes if the user specified where it appears.

Do NOT generate pose descriptions. Do NOT specify pose counts. Do NOT invent placement
rules — only record what the user stated.

───────────────────────────────────────────────────────────────────
PAGES
───────────────────────────────────────────────────────────────────
Build the pages array from what the user listed. If the user listed no pages,
default to: Home (index.html), About (about.html), Contact (contact.html).
For each page, write one sentence of intent derived from the brief.
Do NOT specify sections. Do NOT specify content blocks.

───────────────────────────────────────────────────────────────────
CLARIFICATION
───────────────────────────────────────────────────────────────────
Ask at most 3 questions. Ask only when the gap BLOCKS the build layer from making
a reasonable decision — i.e., when there is no safe default.

Examples of blocking gaps (ask):
  - Business name is completely absent from the input
  - Service types are ambiguous in a way that determines the entire Services section
    structure (e.g., "shipping" — to what destinations? — determines route map section)

Examples of non-blocking gaps (do NOT ask — the build layer defaults these):
  - No palette specified → build layer applies FAMtastic defaults
  - No page list specified → build layer defaults to home/about/contact
  - No font specified → build layer applies FAMtastic typography defaults
  - No character style specified → build layer defaults to illustrated/cartoon
  - No logo position specified → build layer defaults to top-center
```

### DNA Shared Constant (Referenced, Not Restated)

The interpreter system prompt does NOT hardcode FAMtastic hex values, BEM class names, or skeleton vocabulary. Instead, the caller injects a minimal context block at runtime:

```javascript
// In interpretBuildIntent(), before building the system prompt:
const DNA_CONTEXT = buildInterpreterDnaContext(); // reads from famtastic-skeletons.js
// DNA_CONTEXT is a short block (< 200 tokens) naming the FAMtastic palette color names
// so the interpreter can recognize "aquamarine" and "warm gold" as FAMtastic-aligned,
// and recognize "corporate blue" or "generic navy" as signals worth flagging in override_flags.
// It does NOT include hex values — hex resolution stays in famtastic-skeletons.js.
```

This keeps the interpreter aware of FAMtastic's design language without duplicating the build layer's authoritative constants.

---

## Section 4 — The build_mode Field

### Values

`build_mode` has exactly two values. There is no third option, no risk-weighted middle ground, no edge cases based on intent completeness.

| Value | Meaning |
|-------|---------|
| `"review"` | The caller presents the BuildIntent to the user for inspection before any build action fires. The build waits for an explicit human trigger. |
| `"auto"` | If `ready_to_build: true`, the build fires immediately after interpretation. If `needs_clarification: true`, clarification questions are surfaced but the caller decides how to handle them (may block, may proceed with defaults). |

### Defaults Per Entry Point

These defaults are set by the **caller** before invoking `interpretBuildIntent`, not by the interpreter itself. The interpreter receives `context.build_mode` and stamps it onto the output verbatim.

| Entry Point | Default `build_mode` | Rationale |
|-------------|---------------------|-----------|
| Studio Chat (`handlePlanning`) | `"review"` | Fritz is interactively composing a site. An auto-firing build on a pasted brief is surprising and expensive. Review preserves human control on the primary interactive surface. |
| Autonomous Build (`runAutonomousBuild`) | `"auto"` | The user explicitly asked for an autonomous build. The intent is unambiguous. Auto is the correct behavior. |
| Shay-Shay `autonomous_build` T0 intent | `"auto"` | Same as above — "autonomous" is in the intent name. |
| Shay-Shay `build_request` T0 intent (routes to Studio Chat) | `"review"` | A conversational build request from Shay-Shay lands in Studio Chat, where the review-mode assumption applies. The user may want to inspect and refine the interpreted brief before a build fires. |
| Shay-Shay T1 studio-kind reasoning (catches build-adjacent messages) | `"review"` | Shay-Shay T1 messages are often exploratory ("what would a site for X look like"). Review mode prevents a build from firing on what may be a hypothetical. |
| Future: direct CLI invocation (`fam-hub site build --from-brief`) | `"auto"` | CLI invocations are deliberate and scripted. Auto is appropriate. |

### Control Flow by Mode

**`build_mode: "review"` flow:**

```
interpretBuildIntent(rawText, { build_mode: 'review', source: 'studio-chat', ... })
  → returns BuildIntent

if (buildIntent.needs_clarification) {
  // Surface clarification questions as conversational messages
  ws.send({ type: 'clarification', questions: buildIntent.clarifications });
  // Wait for user reply. Re-call interpretBuildIntent with accumulated context.
  return;
}

if (buildIntent.ready_to_build) {
  // Write BuildIntent to spec.json
  // Send { type: 'brief', buildIntent } to client — renders as reviewable card
  // Set spec.build_intent = buildIntent (does NOT set design_brief.approved)
  // STOP. Do not trigger build. Wait for explicit "Build it" command.
  ws.send({ type: 'brief', buildIntent });
  return;
}
```

The "Build it" command that follows a review is a separate classifier intent (`build` or `approved_build`) that reads `spec.build_intent` and calls `handleChatMessage` with the appropriate page list. It does not re-run the interpreter.

**`build_mode: "auto"` flow:**

```
interpretBuildIntent(rawText, { build_mode: 'auto', source: 'autonomous', ... })
  → returns BuildIntent

if (buildIntent.needs_clarification) {
  // Log clarification questions to the build log.
  // Proceed with best-effort extraction — do not block.
  // The build will use whatever was extracted plus build-layer defaults.
}

if (buildIntent.ready_to_build || build_mode === 'auto') {
  // Write BuildIntent to spec.json
  // Trigger build immediately via handleChatMessage
  // If character_hint present, queue character pipeline job
}
```

Auto mode does not surface clarification questions conversationally — it logs them and proceeds. This matches the existing behavior of `runAutonomousBuild`, which does not have a conversational return channel.

### What build_mode Is Not

`build_mode` is not a quality signal. A `"review"` build intent is not more or less complete than an `"auto"` one — the same interpreter produces the same output either way. The mode only controls what the **caller** does with the result. This separation is deliberate: it keeps the interpreter stateless with respect to the UI surface it's called from.

`build_mode` is not set by the interpreter based on how complete the intent is. V1's `readyToBuild: true` → auto-trigger logic was a conflation of completeness and mode. V2 separates them cleanly: `ready_to_build` signals interpreter confidence, `build_mode` signals the caller's intent.

---

## Section 5 — Revised Phase Plan

Each phase leaves Studio in a working state. Fritz can stop after any phase. Portfolio migration and UI expansion are deferred to Post-Stabilization Work — they are not numbered phases.

**Pre-work before Phase 1 begins:** Establish per-suite test baselines (see Section 5.5). No implementation starts without known baselines.

---

### Phase 1 — Interpreter as Isolated Function + Test Endpoint
**Effort:** ~1 session  
**Risk:** Low — no existing code is modified

**What changes:**
- Add `interpretBuildIntent(rawText, context)` to `server.js` implementing the lean schema
- Add `stripStudioFramingPrefix(text)` and `truncateForInterpreter(text)` utilities
- Add `buildInterpreterDnaContext()` helper that reads color names from `famtastic-skeletons.js` and produces the short DNA context block (< 200 tokens)
- Add `POST /api/build-intent/interpret` endpoint — calls `interpretBuildIntent`, returns BuildIntent JSON, logs to `sdk-calls.jsonl` under `call_site: 'build-intent-interpret'`
- No existing routes, functions, or callers modified

**What stays the same:** All four entry points continue exactly as before.

**Test suite baseline requirement:** Run all affected suites before touching anything and record results. Do not proceed if any suite is in an unknown state.

**Phase 1 success tests:**
- `POST /api/build-intent/interpret` with the JJ B&A prompt returns:
  - `identity.slug === 'site-jj-ba-transport'` (not `site-famtastic-build-full`)
  - `identity.business_name === 'JJ B&A Transport'`
  - `character_hint.name === 'Skipper'`
  - `design_direction.palette.user_specified_colors` contains "aquamarine", "#00A79D", "warm gold", "coral", "sand cream" (or equivalent from user text)
  - `needs_clarification: false` (the JJ B&A brief is complete) OR `needs_clarification: true` with ≤3 specific, blocking questions
  - `build_mode === 'review'` (default when no context.build_mode passed)
- `POST /api/build-intent/interpret` with "build me a site for a plumbing company in Atlanta" returns `needs_clarification: true` with a question about the business name or services
- `POST /api/build-intent/interpret` with "how are you doing today" returns `ready_to_build: false, needs_clarification: true` with a question indicating it's not a build request

**Deferred to later phases:** All routing changes, UI, callers.

---

### Phase 2 — Wire `extractBriefFromMessage` to the Unified Interpreter
**Effort:** ~1 session  
**Risk:** Low-medium — one function touched, used by Entry D (autonomous build)

**What changes:**
- `extractBriefFromMessage(text)` calls `interpretBuildIntent(stripStudioFramingPrefix(text), { source: 'autonomous', build_mode: 'auto' })`
- Maps `BuildIntent.identity` fields to the existing brief schema shape that `runAutonomousBuild` expects: `{ business_name, tag, revenue_model, business_description, location, ... }`
- If `needs_clarification: true`: log the unanswered questions, use whatever identity was extracted (best-effort), continue — autonomous mode has no conversational channel for clarification
- `extractBriefPatternBased` is retained in the codebase as an emergency fallback for JSON parse failure **only** — it is not called for semantic gaps (correcting V1's C4 violation). If the interpreter AI call fails entirely (timeout, API error), fall back to `extractBriefPatternBased`. All other cases flow through `interpretBuildIntent`.

**What stays the same:** `runAutonomousBuild` is unchanged. It calls `extractBriefFromMessage` and receives the same shape it always did. The change is invisible to its caller.

**Phase 2 success tests:**
- `extractBriefFromMessage("FAMtastic — Build Full Site: Mario's Pizza")` → `tag: 'site-marios-pizza'`, `business_name: "Mario's Pizza"`
- `extractBriefFromMessage("build a site for JJ B&A Transport, Miami to Bahamas shipping")` → `tag: 'site-jj-ba-transport'`
- Existing site smoke test: trigger autonomous build for a simple one-liner brief, verify site builds successfully in `dist/`

**Deferred:** `handlePlanning`, Studio Chat routing, approval gate, Shay-Shay routing.

---

### Phase 3 — Replace `handlePlanning` with the Unified Interpreter
**Effort:** ~1–2 sessions  
**Risk:** Medium — modifies the primary Studio Chat build path

**What changes:**
- `handlePlanning(ws, userMessage, spec)` is rewritten to call `interpretBuildIntent(userMessage, { source: 'studio-chat', build_mode: 'review', existing_spec: spec })`
- On `needs_clarification: true`: send clarification questions as a conversational WS message `{ type: 'clarification', questions: buildIntent.clarifications }`. Wait for user reply. Re-call `interpretBuildIntent` with the combined original message + answers.
- On `ready_to_build: true, build_mode: 'review'`:
  - Write `buildIntent` to `spec.json` under key `build_intent`
  - Populate `spec.design_brief` from `buildIntent` fields for backwards compatibility with downstream code that reads `design_brief`
  - Set `spec.design_brief.approved = false` — review mode does NOT auto-approve
  - Send `{ type: 'brief', buildIntent }` over WS — UI renders this as a reviewable card
  - Stop. Wait for explicit "Build it" or "approve" command
- A new classifier intent `approved_build` (or the existing `build` intent) handles the follow-on command, reads `spec.build_intent`, and calls `handleChatMessage` directly

**The loop fix:** The current bug is that `new_site` messages always re-run `handlePlanning`, which always writes `approved: false`, which means `new_site` fires again next turn. After Phase 3: if `spec.build_intent` already exists and `spec.design_brief.approved` is still false but the user sends "build it" / "let's go" / "start building", the classifier routes to `approved_build`, not back to `handlePlanning`. The loop is broken by route logic, not by auto-approval.

**What stays the same:** `handleChatMessage` (the actual template build layer) is completely untouched. All non-planning intents (content_update, restyle, bug_fix, visual_inspect) are unaffected.

**Rollback:** Keep original `handlePlanning` as `handlePlanningLegacy` until Phase 3 is validated across at least 3 end-to-end builds.

**Phase 3 success tests:**
- Paste full JJ B&A brief → `{ type: 'brief', buildIntent }` received, `buildIntent.identity.slug === 'site-jj-ba-transport'`, build does NOT auto-fire
- "Build from brief" after brief shown → `approved_build` triggers, build fires, `dist/index.html` written
- "I want a site for my plumbing company" → clarification questions sent, NOT an immediate build
- "Build from brief" without a prior brief → `new_site` → handlePlanning → brief card shown (no loop)
- Smoke test: Mario's Pizza, Fresh Cuts, Auntie Gale buildable from their existing spec.json (unaffected by planning path change)

**Deferred:** Shay-Shay routing, character pipeline auto-trigger, UI brief card improvements.

---

### Phase 4 — Shay-Shay Build Request Routing
**Effort:** ~1 session  
**Risk:** Medium — modifies Shay-Shay T0 handler for `build_request` intent

**What changes:**
- Shay-Shay T0 `build_request` intent: instead of routing the full message to Studio Chat (which re-runs classification), call `interpretBuildIntent(message, { source: 'shay-shay', build_mode: 'review' })` directly, then hand the resulting BuildIntent to Studio Chat's `handlePlanning`-replacement with the intent already parsed
- Shay-Shay T0 `autonomous_build` intent: call `interpretBuildIntent(message, { source: 'shay-shay', build_mode: 'auto' })`, then `runAutonomousBuild` with the pre-parsed brief (replacing `extractBriefFromMessage` call at that entry point)
- Raises the effective information density for build requests through Shay-Shay — no more 1400-token truncation on build-planning responses (the interpreter output is JSON, not a prose response, and fits within any token cap)
- T1 `studio`-kind messages that contain build keywords now route to `interpretBuildIntent` with `build_mode: 'review'` instead of `executeShayShayBrainCall`

**What stays the same:** All other Shay-Shay tier routing (research, strategy, review, brainstorm, general, system_status, character_pipeline T0) is completely untouched.

**Phase 4 success tests:**
- "Build a site for a jazz bar in New Orleans" via Shay-Shay → BuildIntent produced, slug is `site-jazz-bar-new-orleans` (or similar), brief card shown in Studio Chat
- "autonomous build a site for a barber in Chicago" via Shay-Shay → auto mode, build fires, `dist/` populated
- "What should I name my restaurant?" via Shay-Shay → does NOT route to interpreter (brainstorm kind, T2)
- "edit the brief" via Shay-Shay → does NOT route to interpreter (T0 or existing classifier)

**Deferred:** Character pipeline auto-trigger, UI improvements.

---

### Phase 5 — Character Hint → Pipeline Auto-Trigger
**Effort:** ~1 session  
**Risk:** Low-medium — new behavior, does not break existing builds

**What changes:**
- When a build is triggered (review mode: after explicit "build it" command; auto mode: immediately) and `buildIntent.character_hint` is present:
  - Queue a character pipeline job using `character_hint` as the seed: name + description → `createCharacterAnchorCore` → `generateCharacterPosesCore` → etc.
  - The pipeline uses `DEFAULT_POSES` (its own default, not interpreter-produced poses)
  - If `character_hint` specifies `style`, pass it to `createCharacterAnchorCore`
  - `characterPipelineOrder` defaults to `'after'` — the site HTML builds first, character assets fill in after (avoids blocking the user's first preview for 3+ minutes of image generation)
- The existing manual T0 `character_pipeline` intent in Shay-Shay is unchanged — it remains the override path for running the pipeline independently

**What stays the same:** Every site that does not have a `character_hint` in its BuildIntent builds exactly as before. The pipeline is never triggered for sites without a character specification.

**Phase 5 success tests:**
- Full JJ B&A build: paste brief → brief card shown with `character_hint.name: 'Skipper'` visible → "Build it" → site HTML generated first → character pipeline queued → Skipper anchor and poses generated → site references character assets
- Mario's Pizza rebuild (no character): no character pipeline triggered, site builds normally

**Deferred:** UI improvements showing character pipeline status in brief card. Fritz decision on `characterPipelineOrder` default (see Deferred Decisions).

---

### Pre-work: Test Suite Baselines

Before Phase 1, run every test file that the migration could affect and record the result. Do not declare any suite "correct" over another — establish what's true right now.

**Known test files (from prior sessions):**
- `session14-smoke-tests.js` — last observed: 31/33. Two failures known: `tab-pane-preview` DOM ID missing; one unreported.
- Any prior session test files (session9, session12, etc.) — use `git log --all -- tests/` to find them, run each, record their state.

**Baseline record format (write to `tests/BASELINE.md` before Phase 1):**
```
| File | Last green commit | Current state | Notes |
|------|-------------------|---------------|-------|
| session14-smoke-tests.js | abc1234 | 31/33 | tab-pane-preview ID missing (pre-existing) |
| ... | ... | ... | ... |
```

The migration is held to the following standard: no suite's passing count may decrease as a result of any phase. If a phase causes a regression, that phase is not complete until the regression is fixed or explicitly accepted by Fritz.

---

### Post-Stabilization Work (Not Numbered Phases)

These items are deferred until the V2 interpreter has processed real builds on new sites — estimated minimum 5 end-to-end builds from Phases 1–5 before any post-stabilization work begins.

**PS-1 — Portfolio Spec Migration**  
Add `build_intent` field to existing `spec.json` files by running each through `interpretBuildIntent` in retrofit mode. Additive only — existing `design_brief` fields are preserved. This work does not happen until the interpreter's output has been validated on live builds.

**PS-2 — Unified Spec Format**  
`spec.json` currently has `design_brief` (from the old `handlePlanning`) and will gain `build_intent` (from the new interpreter). These are redundant. Unifying them into a single canonical field is a separate decision involving schema versioning and migration tooling. Deferred.

**PS-3 — UI Brief Card Expansion**  
After Phase 3, the `{ type: 'brief', buildIntent }` card displays a JSON object. A future session should render it as: palette swatches, character name + description, page list with intent notes, and a clear "Build it" call-to-action. This is UI work that adds no architectural value until the backend is stable.

**PS-4 — Shay-Shay Tier System Review**  
After Phase 4, build-intent messages no longer flow through `classifyShayShayReasoning`. Whether the tier system still pulls its weight for non-build messages is worth reviewing — but it's a separate decision from this migration.

---

## Section 6 — Revised Risk Register

### R-NEW — Build Layer Defaults May Not Be Reliable (Primary New Risk from Lean Schema)
**Severity:** High  **Likelihood:** Medium  
**New in V2.** V1's interpreter produced a full `FamtasticDNA` object — palette with hex values, layout constraints, section shapes, all explicit. When the interpreter got it wrong, the gap was visible in the output. V2's interpreter leaves these fields to the build layer. If the build layer's defaulting is unreliable — if it applies generic freight-industry navy/amber instead of the FAMtastic palette when `design_direction.palette` is absent — the JJ B&A failure mode is still present, just shifted one layer downstream.

**Mitigation:**
Before Phase 1 begins, audit the build layer's default behavior:
1. Run a build with no palette specified in the brief. Confirm the output HTML uses `#00A79D` / `#F5B800` / `#FF6B6B` / `#FDF4E3`, not industry-convention colors.
2. Read the `handleChatMessage` build prompt and confirm it references `FAMTASTIC_PALETTE` or equivalent canonical constants — not inline hex values that could drift.
3. Read `famtastic-skeletons.js` and confirm `HERO_SKELETON_TEMPLATE`, `NAV_SKELETON`, and logo wiring instructions are injected into the build prompt for every build, not just some.
4. If any of these audits fails, the build layer must be fixed before Phase 1, not after. The interpreter lean schema is only safe if the build layer's defaults are invariants, not suggestions.

---

### R1 — Regression on Existing Working Builds
**Severity:** High  **Likelihood:** Medium  
Mario's Pizza, Fresh Cuts, and Auntie Gale are shipped sites. A regression on their build path is visible.

**Mitigation (updated for V2):** Phases 1 and 2 do not touch `handleChatMessage` or the template layer at all. Phase 3 only modifies `handlePlanning` — if a site already has an approved `design_brief` in spec, it routes to `handleChatMessage` directly (same path as today). Keep `handlePlanningLegacy` as a named function until 3 successful end-to-end builds confirm Phase 3 stability. Smoke-test all three shipped sites before and after Phase 3 merges.

---

### R2 — Build Layer Palette Defaulting Applied Inconsistently
**Severity:** High  **Likelihood:** Low  
A close sibling of R-NEW. Distinct case: the build layer does apply FAMtastic defaults, but not consistently — some build paths (e.g. template-based builds via `runOrchestratorSite`) apply them, while others (e.g. direct `handleChatMessage` with minimal spec) do not.

**Mitigation:** The Phase 3 `approved_build` handler that reads `spec.build_intent` and calls `handleChatMessage` must pass the `buildIntent` fields as part of the build context. Specifically, if `design_direction.palette.user_specified_colors` is populated, the build prompt must surface them. If absent, the build prompt must explicitly instruct Claude to use the FAMtastic palette. This injection is a single-prompt-template change, auditable before Phase 3 ships.

---

### R3 — Classifier Confusion During Partial Deployment (Phases 2–4)
**Severity:** Medium  **Likelihood:** Medium  
Two interpreters active during migration: old `handlePlanning` for some entry points, `interpretBuildIntent` for others. A site started via autonomous build (Phase 2) then edited via Studio Chat (pre-Phase 3) may have a `build_intent` field in spec that the old `handlePlanning` ignores.

**Mitigation (updated for V2):** `interpretBuildIntent` writes `interpreter_version` to every spec it touches. `handlePlanning` (pre-Phase 3 version) checks for `spec.build_intent.interpreter_version` — if present, skips re-interpretation and routes directly to the `approved_build` flow. This prevents the two interpreters from competing on the same site spec. The check is a guard clause at the top of `handlePlanning`, adding ~5 lines and no new dependencies.

---

### R4 — DNA Context Block Drifts from famtastic-skeletons.js
**Severity:** Medium  **Likelihood:** Low  
The `buildInterpreterDnaContext()` helper reads color names from `famtastic-skeletons.js`. If `famtastic-skeletons.js` is updated (new palette, renamed colors) but `buildInterpreterDnaContext()` is not, the interpreter may fail to recognize user-stated color names as FAMtastic-aligned.

**Mitigation:** `buildInterpreterDnaContext()` reads directly from `famtastic-skeletons.js` at runtime — it does not maintain its own copy. If the function reads from a named export (`FAMTASTIC_PALETTE_NAMES`, `FAMTASTIC_COLORS`), adding that export to `famtastic-skeletons.js` is the single change needed and it stays in sync automatically. This is a design constraint on how `buildInterpreterDnaContext` is implemented, not a risk after it's implemented correctly.

---

### R5 — Slug Idempotency for Existing Sites (Phase 2)
**Severity:** High  **Likelihood:** Low  
Phase 2 changes what `extractBriefFromMessage` returns. If `interpretBuildIntent` produces a different slug for a business that already has a site (e.g., "Mario's Pizza" → `site-marios-pizza` from old code, but the new interpreter produces `site-mario-s-pizza` due to apostrophe handling), `runAutonomousBuild` will write to a new directory instead of updating the existing one.

**Mitigation:** After slug generation, `extractBriefFromMessage` checks whether a directory with that slug already exists under `SITES_ROOT`. If yes, use the existing directory's tag verbatim — do not regenerate. Log a warning when the new slug differs from the existing one so the discrepancy is visible. This is a three-line guard, not a systems change.

---

### R6 — No Conversational Channel in Auto Mode for Clarifications
**Severity:** Medium  **Likelihood:** Low  
When `build_mode: 'auto'` and `needs_clarification: true`, Phase 2's design is to log questions and proceed with defaults. For simple ambiguities (no business name at all), proceeding with defaults produces a site named "Unknown Business" or similar — a clearly bad outcome.

**Mitigation:** In auto mode, `needs_clarification: true` is only allowed to proceed when `identity.business_name` is non-empty. If the interpreter cannot extract a business name at all, `runAutonomousBuild` must surface an error — not a silent default. The specific check: `if (!buildIntent.identity.business_name) { return { error: 'Cannot start autonomous build: business name could not be extracted. Please include the business name in your request.' }; }`. All other clarification gaps (missing services, destinations, etc.) are acceptable to default in auto mode.

---

### R7 — Scope Creep During Implementation
**Severity:** High  **Likelihood:** High  
Five phases plus post-stabilization work. The temptation to fix adjacent issues, clean up surrounding code, or add features mid-phase is historically expensive.

**Mitigation:** The "Deferred" list at the end of each phase in Section 5 is the gate. Nothing in a Deferred list ships in that phase. The phase boundary tests are the only completion criterion. If a phase runs more than one session, stop at the last completed phase boundary and start a new session from the next phase's scope.

---

### R8 — Retained Risks From V1 (Still Applicable)

The following V1 risks apply to V2 without change in assessment:

**R-V1-5 (Shay-Shay T0 misrouting, Phase 4):** Phase 4 routes `studio`-kind T1 messages containing build keywords to the interpreter. Non-build messages with overlapping vocabulary (e.g. "review the design brief") must not be routed here. Mitigation: require both `kind === 'studio'` AND explicit site/website/build presence in the lower-cased message. Test with known non-build messages before Phase 4 ships.

**R-V1-7 (Scope creep):** Same as R7 above.

**R-V1-8 (Very large input truncation):** `truncateForInterpreter(text, 6000)` handles this deterministically before the AI call. Not a risk after Phase 1 implements it.

---

## Section 7 — Deferred Decisions

Decisions not made in this proposal. Listed so Fritz can see what's open and sequence them.

**D1 — Whether `character_hint` auto-triggers the pipeline in review mode.**  
Phase 5 defaults `characterPipelineOrder` to `'after'` for auto builds — the site builds first, then the pipeline runs. For review-mode builds, this is ambiguous: does the pipeline run when Fritz clicks "Build it"? Or is the pipeline a separate explicit step? The UX implication is significant (3 minutes of image generation vs. an immediate preview). Not decided here.

**D2 — Whether to unify `design_brief` and `build_intent` in spec.json.**  
After Phase 3, `spec.json` has both `design_brief` (old format, backwards-compatible) and `build_intent` (new format). They are redundant. Unifying them requires a spec version bump and migration tooling. This is a separate decision from the migration itself and should not block Phase 3.

**D3 — Whether `approved_build` is a new classifier intent or overloads the existing `build` intent.**  
Phase 3 depends on a classifier path that reads `spec.build_intent` and triggers `handleChatMessage` when Fritz says "Build it". This could be a new `approved_build` classifier intent, or it could be a condition added to the existing `build` intent handler. The tradeoffs (classifier complexity vs. new intent surface) are not decided here.

**D4 — Kimi K2.6 brain router integration sequence.**  
If Kimi K2.6 is added to `selectShayShayBrain`, its integration interacts with Phase 4's routing changes. These are not mutually blocking, but parallel implementation creates merge complexity. Recommendation unchanged from V1: complete Phase 4, then add Kimi. The decision on whether to do them serially or in parallel is Fritz's.

**D5 — Clarification surface for Shay-Shay–initiated review builds.**  
When a review-mode build is initiated via Shay-Shay and `needs_clarification: true`, the clarification questions need to appear somewhere visible. The current flow sends them to Studio Chat's WebSocket. If Fritz is only looking at the Shay-Shay panel, the questions may not surface. Whether to duplicate clarifications in the Shay-Shay response, force a Studio Chat switch, or show a notification badge is a UX decision deferred to PS-3.

**D6 — Whether the Shay-Shay tier system survives Phase 4.**  
See Post-Stabilization PS-4. Not decided here.

**D7 — Whether any existing portfolio sites should be rebuilt vs. incrementally updated post-migration.**  
After Post-Stabilization PS-1 (spec migration), Fritz may discover that a site's retrofitted `build_intent` doesn't match what was actually built. Whether to rebuild such sites from the new interpreter output, or leave them as-is and update only on the next client-requested change, is an operational decision. Not decided in this document.

---

## Section 8 — Compatibility and Backwards Paths

### Behaviors That Must Continue Working Across All Phases

| Behavior | How Preserved Through Phase 5 |
|----------|-------------------------------|
| Mario's Pizza, Fresh Cuts, Auntie Gale build correctly | Phases 1–3 don't touch `handleChatMessage` or the template layer |
| `fam-hub site build <tag>` CLI builds | CLI path hits `handleChatMessage` directly — unaffected |
| Shay-Shay T0 deterministic commands (restart, clear cache, system status) | `classifyShayShayTier0` unmodified until Phase 4; T0 non-build intents untouched in Phase 4 |
| Character pipeline T0 intent (`character pipeline`, `FAM Bear`) | Preserved as the manual override path throughout all phases |
| Rollback, restyle, content edit, layout update, bug fix, visual inspect intents | Route through `handleChatMessage` — untouched by any phase |
| `extractBriefPatternBased` (for API-failure emergency fallback) | Retained in codebase, just demoted from semantic fallback to error-only fallback |

### Behaviors That Will Be Deprecated

| Behavior | Deprecated In | Replacement |
|----------|--------------|-------------|
| `handlePlanning` generic system prompt | Phase 3 | `interpretBuildIntent` system prompt |
| `design_brief.approved: false` loop | Phase 3 | `ready_to_build` + `build_mode: 'review'` + explicit `approved_build` trigger |
| `extractBriefFromMessage` standalone Claude call (400-token extraction) | Phase 2 | Internal call to `interpretBuildIntent` |
| `genericTags` slug guard in `extractBriefFromMessage` | Phase 2 | `stripStudioFramingPrefix` + interpreter-level slug rules |
| Routing `build_request` T0 intent to Studio Chat via `route_to_chat` action | Phase 4 | Direct call to `interpretBuildIntent` |

### Behaviors That Will Be Deleted

| Behavior | Deleted When | Notes |
|----------|-------------|-------|
| `extractBriefPatternBased` as the primary path for any input | Phase 2 | Remains only as API-failure emergency fallback |
| `handlePlanningLegacy` | After 3 successful Phase 3 builds confirm stability | Do not delete preemptively |

### Test Suite Baselines (Revised Framing per C7)

The 107/107 and 31/33 figures refer to different test files in different states. They are not contradictions. Before Phase 1 begins:

1. Run `git log --all -- tests/` to find every test file in the repo's history
2. For each currently-existing test file, run it and record current state
3. For historical test files (deleted), record the last commit where they passed
4. Write results to `tests/BASELINE.md`

The migration is held to: no currently-passing test may regress as a result of any phase. Tests that are already failing are not the migration's responsibility to fix (unless the migration causes a new failure in the same area).

---

## For Fritz — Executive Summary

V2 keeps V1's correct diagnosis and direction while addressing seven legitimate over-reaches that the GPT-5.4 critique identified.

The single most important structural change is the shift from "interpreter as design authority" to "interpreter as normalizer." V2's interpreter extracts what the user said, passes it downstream, and trusts the build layer to apply FAMtastic defaults for everything the user didn't specify. This is the right division of labor — but it creates a new risk: the build layer must actually be reliable for those defaults. Before writing a line of Phase 1 code, audit the build prompt and `famtastic-skeletons.js` to confirm the FAMtastic palette, hero BEM structure, and nav skeleton are applied as invariants, not as suggestions that Claude might override with industry-convention choices.

The second most important change is `build_mode`. V1's auto-approval was a trap for Studio Chat — a complete brief would immediately trigger a 10-minute build with no chance for review. V2 makes Studio Chat default to review mode explicitly, with auto mode reserved for paths where Fritz has already expressed autonomous intent.

The migration is five numbered phases. Portfolio migration, UI work, and the Shay-Shay tier review are deferred to post-stabilization, explicitly outside the phase sequence. Fritz can stop after any phase and the Studio is better than before.

**The single most important thing to do before Phase 1 starts:** audit the build layer's default behavior. If it applies generic freight-industry colors when no palette is specified, V2's lean schema will reproduce the JJ B&A failure silently. Fix the build layer first. Then build the interpreter.

---

## Appendix — Operational Notes (Fritz's Decisions, Not Architecture Decisions)

*These are operational choices that Fritz may want to make but that this document does not prescribe. They are moved here from V1 (where they appeared as architectural recommendations) because they are not the architecture's call to make.*

**On `site-famtastic-build-full`:** This site has a contaminated slug and an empty `dist/`. Whether to delete it, rename it, or leave it as a historical artifact is Fritz's choice. The architecture provides a path to rebuild it correctly (Phase 3, paste the original JJ B&A brief, use `build_mode: 'review'`, verify the slug is `site-jj-ba-transport` before building). The decision of what to do with the existing directory is not made here.

**On the existing portfolio sites' spec.json files:** They are compatible with the current build system and require no migration for Phases 1–5. PS-1 (retrofit migration) adds a `build_intent` field — this is optional work, not a prerequisite for anything. Fritz decides when and whether to do it.

**On `tab-pane-preview` DOM ID regression:** This is a pre-existing failure in `session14-smoke-tests.js` that predates this migration. Whether to fix it as part of the test baseline work or defer it is Fritz's call. It is a one-line HTML attribute addition and does not interact with the interpreter migration.

---

## V1 → V2 Diff Summary
*Read this to see exactly what changed and why. Two minutes.*

**SCHEMA (Section 2)**  
V1's `BuildIntent` had ~12 required fields spanning full hex palette, 12 explicit pose descriptions, section-level page specs, and deployment targets. V2's schema has 10 top-level fields; the interpreter produces only what it can reliably derive from user input. Character detail is a `character_hint` (name + description, no poses). Pages are a list of titles with one intent sentence each. Palette is user-stated color signals, not resolved hex values. Deployment is gone entirely. **Why:** The interpreter was being asked to do downstream layers' jobs. The build layer already owns those defaults; duplicating them in the interpreter created a two-source-of-truth problem and forced the interpreter to invent details it had no basis for.

**INTERPRETER SYSTEM PROMPT (Section 3)**  
V1's system prompt restated the full FAMtastic DNA — BEM class names, logo position invariants, section shape vocabulary, layout constraints. V2's system prompt covers slug rules, design signal extraction, character detection, clarification rules, and output format. DNA awareness comes from a short runtime-injected context block (< 200 tokens, color names only) built from `famtastic-skeletons.js` — not hardcoded. **Why:** The build prompt and `famtastic-skeletons.js` are the authoritative DNA layer. Duplicating them in the interpreter creates drift risk and doubles the surface area that must be kept consistent.

**AUTO-APPROVAL (Section 4)**  
V1 proposed auto-triggering a build whenever `readyToBuild: true`. V2 replaces this with an explicit `build_mode` field: `"review"` or `"auto"`, set by the caller, not derived from intent completeness. Studio Chat defaults to `"review"` (human sees the brief card before anything builds). Autonomous and Shay-Shay autonomous paths default to `"auto"`. **Why:** A complete brief in Studio Chat should not silently fire a 10-minute build. The mode must be explicit per entry point, not inferred.

**FALLBACK PATHS (Phase 2)**  
V1's Phase 2 fell back to `extractBriefPatternBased` when the interpreter returned `needsClarification: true`. V2 removes this semantic fallback. `extractBriefPatternBased` is retained only for total API failure (timeout, network error). All other cases — including ambiguous input — flow through `interpretBuildIntent`. **Why:** A second semantic path is the divergence this refactor is eliminating. Keeping it as a "fallback" reintroduces it.

**PHASE COUNT AND SCOPE (Section 5)**  
V1 had 7 phases including portfolio migration (Phase 6) and UI expansion (Phase 7). V2 has 5 numbered phases plus a "Post-Stabilization Work" section for migration and UI. Portfolio migration is deferred until the new interpreter has real-traffic validation. **Why:** Migrating existing specs before the interpreter is proven on new builds is premature. If the interpreter's output is wrong, the migration propagates the error to the entire portfolio.

**NEW RISK (Section 6, R-NEW)**  
V2 adds R-NEW: the primary risk introduced by the lean schema is that the build layer must reliably apply FAMtastic defaults for everything the interpreter no longer fills. If the build layer applies generic freight-industry colors when no palette is specified, the JJ B&A failure mode is still present — just one layer downstream. Mitigation: audit the build layer's palette defaulting behavior before Phase 1, not after. This risk did not exist in V1 because V1's interpreter was responsible for those defaults.

**OPERATIONAL ITEMS MOVED (Appendix)**  
V1 stated that `site-famtastic-build-full` "should be deleted." V2 moves this to the Operational Appendix with no recommendation — it's Fritz's call. Similarly, the test suite framing is corrected: 107/107 and 31/33 are different suites in different states, not a contradiction. V2 prescribes establishing a per-suite baseline for every affected test file before implementation begins.
