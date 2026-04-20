# FAMtastic DNA — Persistent Build Knowledge

> This file is the distilled, cross-session memory of how FAMtastic sites are
> actually built. It is **automatically updated** after every successful build
> by `server.js → updateFamtasticDna()` (Session 12 Phase 3). It is NOT hand-
> written: entries accumulate from real builds, then get condensed when the
> file approaches 40KB.
>
> Claude sees this file via the `@famtastic-dna.md` include in CLAUDE.md, so
> every Studio session starts with the lessons from every prior build already
> in working memory.

---

## Core identity

**FAMtastic** (adj.): *Fearless deviation from established norms with a bold
and unapologetic commitment to stand apart on purpose, applying mastery of
craft to the point that the results are the proof, and manifesting the
extraordinary from the ordinary.*

Every site that ships from this factory should feel — on first paint — like
something a normal agency would not ship. Not quirky for quirk's sake. Not
gimmicky. **Confidently different.** The foundation is normal HTML + CSS; the
differentiation comes from composition, typography, motion, and the layered
hero vocabulary below.

---

## Non-negotiable build rules

These are invariants. They are enforced by tests, by skeletons, and by the
classifier. Do not "simplify past" any of them.

### 1. Hero uses the `fam-hero-layered` BEM vocabulary

Every site hero — regardless of vertical — is built out of four named layers
stacked inside a single `.fam-hero-layered` container:

- `.fam-hero-layer--bg`        — background (image, gradient, video)
- `.fam-hero-layer--fx`        — particles, noise, grain, light sweeps
- `.fam-hero-layer--character` — SVG mascot, silhouettes, foreground art
- `.fam-hero-layer--content`   — H1, subhead, CTA stack

Layers are `position: absolute; inset: 0;` and z-indexed in that order. The
content layer always sits above the character layer. The character layer sits
above fx. Fx sits above bg. The container itself is `position: relative;
overflow: hidden; min-height: 100vh` by default.

**BEM double-dash** is mandatory: `--bg`, `--fx`, `--character`, `--content`.
Single-dash (`-bg`) fails the Groove Theory 13-item checklist.

### 2. Dividers are real SVG clip paths, not straight lines

Sections separate with one of the prebuilt divider SVGs (wave, tilt, peak,
arch). A straight `<hr>` or `border-top` between sections is a regression.
Dividers are emitted by the template call and re-used across pages; parallel
page spawns do not re-emit them.

### 3. Multi-part logo is emitted ONCE, by the template call

The logo extraction pipeline writes three SVG files to `sites/<tag>/dist/assets/`:

- `logo-full.svg`     — icon + wordmark (used in nav, footer, hero)
- `logo-icon.svg`     — icon only (used in favicons, small badges)
- `logo-wordmark.svg` — wordmark only (used in tight horizontal slots)

These are produced by `extractLogoSVGs()` in `site-studio/server.js` from the
delimited output Claude emits inside the template prompt
(`<!-- LOGO_FULL -->`, `<!-- LOGO_ICON -->`, `<!-- LOGO_WORDMARK -->`).

**Parallel page spawns MUST NOT emit logo blocks.** The `LOGO_NOTE_PAGE`
constant in `famtastic-skeletons.js` is injected into every parallel-page
prompt to instruct Claude to reference `assets/logo-full.svg` by path and
never re-emit SVG markup. This prevents the Session 11 race where parallel
pages overwrote the template's clean extraction with conflicting SVGs.

The **nav brand link** is always:

```html
<a href="index.html" class="logo-link" data-logo-v>
  <img src="assets/logo-full.svg" alt="[BRAND_NAME]" class="h-10 w-auto">
</a>
```

Plain text inside `.logo-link` is a regression — caught by `applyLogoV()`,
which now prefers `assets/logo-full.svg` if present.

### 4. Inline styles are prohibited

`style="..."` attributes in generated HTML fail the checklist. All styling
goes through Tailwind utility classes or the site's own stylesheet. Inline
styles exist only in protected library files (`lib/fam-motion.js`,
`lib/fam-shapes.css`, `lib/character-branding.js`) and never in site HTML.

### 5. Protected files

Do NOT modify these — they are shared across all sites and changes cascade:

- `site-studio/lib/fam-motion.js`
- `site-studio/lib/fam-shapes.css`
- `site-studio/lib/character-branding.js`

### 6. TAG over process.env.SITE_TAG

`TAG` is the mutable runtime variable inside server.js. `process.env.SITE_TAG`
is a startup-only snapshot that goes stale the moment the user switches sites.
Always read `TAG`.

### 7. Post-processing goes through `runPostProcessing()`

Every HTML write path — template call, parallel spawn, surgical edit, rollback,
fallback — must funnel through `runPostProcessing()`. There are no exceptions.
Bypassing it means skipping logo extraction, divider injection, head
dependency wiring, and the fam-motion script tag.

### 8. Classifier default is `content_update`, not `layout_update`

Ambiguous messages route to `content_update`, which performs a surgical edit
and skips the plan gate. Routing ambiguous messages to `layout_update` means
a full rebuild is triggered for a sentence change — that is an expensive
regression.

### 9. Route registration order

Static Express routes are registered BEFORE parameterized routes:
- `/api/research/verticals` (static) before `/api/research/:filename` (param)
- `/api/worker-queue` (static) before `/api/:anything` (param)

Otherwise the parameterized route shadows the static one and returns 404.

### 10. library.json shape

`library.json` is `{ version, components[], last_updated }`. Always extract
`.components` — never treat the root as an array. Session 9's library-render
bug came from this exact mistake.

### 11. Nav uses the `NAV_SKELETON` class vocabulary

Every site nav — regardless of vertical — must use these exact class names.
They are enforced by `NAV_SKELETON` in `famtastic-skeletons.js`:

- `.nav-links`        — desktop `<ul>` of nav links
- `.nav-cta`          — desktop call-to-action button
- `.nav-toggle-label` — hamburger toggle (hidden on desktop, shown on mobile)
- `.nav-mobile-menu`  — mobile dropdown panel (hidden on desktop, shown on mobile)
- `#nav-toggle`       — hidden checkbox driving pure-CSS mobile toggle

**Do NOT use:** `desktop-nav`, `mobile-nav`, `nav-desktop`, `nav-mobile`,
`hamburger`, `menu-toggle`, `mobile-menu-checkbox`, or any variant.

`NAV_SKELETON` is injected into both the template build prompt (so the
template CSS and HTML use matching names) and the parallel page `famSkeletonBlock`
(so page spawns know the mandated names). This is the same pattern as
`HERO_SKELETON` for BEM double-dash enforcement.

---

## Intelligence loop

The intelligence loop (`scripts/intelligence-loop`) iterates every site in
`~/famtastic/sites/`, calls `generateIntelReport(tag)` and
`getPromotedIntelligence(tag)`, and writes `~/PENDING-REVIEW.md` outside the
repo. A cron job runs it 09:00 Mon/Wed/Fri — install with
`scripts/install-intel-loop-cron`.

Promoted findings (from `intelligence-promotions.json`) are injected into
the build prompt by `buildPromptContext()` as a "PROMOTED INTELLIGENCE" block,
so every build respects prior learnings. A promotion with severity `major`
or `opportunity` that has not been dismissed will appear to Claude on the
next build.

The startup banner (`checkPendingReview()`) reports the global counts on
every Studio launch so unreviewed findings cannot silently pile up.

---

## Worker queue (Session 12 Phase 2)

The worker queue at `~/famtastic/.worker-queue.jsonl` is a **dispatch ledger**,
not a task queue. There is **no live worker process** consuming it. Tasks are
appended by the `dispatch_worker` tool call for external execution. On every
Studio startup, `cleanWorkerQueueOnStartup()` drops:

- Any entry with a terminal status (`completed`, `cancelled`, `failed`)
- Any entry older than 7 days (by `queued_at` / `created_at` / `at`)

The cleanup is a **full rewrite** (`fs.writeFileSync`), not append. The badge
tooltip says so explicitly. The classifier intent `run_worker_task` is a
deterministic handler — no Claude call — that reports honest status and
supports clear/purge commands.

---

## Known regressions and the fixes that closed them

### The `fam-hero-single-dash` regression

**Symptom:** hero rendered but layer stacking was wrong because CSS targeted
`.fam-hero-layer--bg` and the HTML emitted `.fam-hero-layer-bg`.

**Root cause:** prompt said "use BEM naming" as a suggestion. Claude produced
single-dash class names because both spellings look correct in isolation.

**Fix:** `HERO_SKELETON_TEMPLATE` in `famtastic-skeletons.js` is now a
literal HTML skeleton with `--bg`, `--fx`, `--character`, `--content` baked
in. Tests in `tests/session12-phase0-tests.js` assert the double-dash
vocabulary in both skeleton and CSS.

### The plain-text nav brand regression

**Symptom:** Groove Theory rebuild scored 12/13 because the nav showed plain
text "Groove Theory" instead of the logo SVG, even though `logo-full.svg`
was correctly extracted to `assets/`.

**Root cause:** Claude interpreted "use the logo" ambiguously and sometimes
substituted the brand name as styled text.

**Fix:** `LOGO_SKELETON_TEMPLATE` now contains an explicit "NAV LOGO WIRING
(MANDATORY)" block with the exact `<a><img></a>` structure. `applyLogoV()`
prefers `assets/logo-full.svg` as a belt-and-suspenders fallback.

### The parallel-page logo race

**Symptom:** pages spawned in parallel occasionally overwrote the clean SVGs
with conflicting markup, producing mismatched logos across pages.

**Root cause:** every parallel spawn received the logo instructions and
emitted its own SVG block.

**Fix:** only the template call emits logo SVGs. Parallel spawns get
`LOGO_NOTE_PAGE`, which instructs them to reference `assets/logo-full.svg`
by path and never re-emit SVG markup.

### The `content_update` vs `layout_update` misrouting

**Symptom:** single-sentence edits triggered full rebuilds and plan gates.

**Root cause:** classifier defaulted ambiguous intents to `layout_update`.

**Fix:** default is `content_update`, which uses surgical edits.
`PLAN_REQUIRED_INTENTS` excludes it.

### The `process.env.SITE_TAG` staleness bug

**Symptom:** after switching sites, builds wrote to the previous site's
directory.

**Root cause:** `process.env.SITE_TAG` was a startup snapshot; `TAG` was the
live variable.

**Fix:** all build paths now read `TAG`, not the env var. Cerebrum do-not-
repeat list enforces this.

---

## Build context (auto-updated per session)

> Entries below this line are appended by `updateFamtasticDna()` after each
> successful build. When the file exceeds 40KB, the oldest auto-entries are
> condensed into a single summary block. Manual edits above the line are
> preserved.

<!-- DNA-AUTO-BEGIN -->

### 2026-04-16 — site-altitude build
- Pages: index.html, experience.html, reserve.html
- Intent: build
- Duration: 410s
- Note: parallel build — 3 page(s)

### 2026-04-17 — site-auntie-gale-garage-sales build
- Pages: index.html, shop.html, about.html, contact.html
- Intent: build
- Duration: 551s
- Note: parallel build — 4 page(s)

### 2026-04-17 — site-marios-pizza build
- Pages: index.html, menu.html, about.html, contact.html
- Intent: build
- Duration: 442s
- Note: parallel build — 4 page(s)

### 2026-04-17 — site-fresh-cuts-in-atlanta build
- Pages: index.html, services.html, gallery.html, contact.html
- Intent: build
- Duration: 411s
- Note: parallel build — 4 page(s)

### 2026-04-20 — site-the-daily-grind-in-atlanta build
- Pages: index.html, about.html
- Intent: build
- Duration: 342s
- Note: parallel build — 2 page(s)

### 2026-04-20 — site-the-daily-grind-in-atlanta build
- Pages: index.html, about.html, contact.html
- Intent: build
- Duration: 400s
- Note: parallel build — 3 page(s)

### 2026-04-20 — site-the-daily-grind-in-atlanta build
- Pages: contact.html
- Intent: build
- Duration: 1611s
- Note: parallel build — 1 page(s)

### 2026-04-20 — site-unknown build
- Pages: index.html, about.html, contact.html
- Intent: build
- Duration: 225s
- Note: parallel build — 3 page(s)

### 2026-04-20 — site-the-daily-grind build
- Pages: index.html, menu.html, about.html, contact.html
- Intent: build
- Duration: 289s
- Note: parallel build — 4 page(s)
<!-- DNA-AUTO-END -->
