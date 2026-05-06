# Workshop / Sandbox — Page-Type Brief

**Status:** draft for review (P1 deliverable, ws_research_workshop_sandbox of plan_2026_05_05_workbench_per_page_design)
**Page type:** Workshop / Sandbox
**Companion mockup:** `docs/design-research/page-types/03-workshop-sandbox-mockup.html`
**Inherits:** `docs/design-research/cross-cutting/01-chrome-collapse.md`, `02-glass-slide-out.md`
**Adjacent brief:** `docs/design-research/page-types/02-creation-canvas.md` (most users arrive here from Canvas)
**Visual rulebook:** `docs/STUDIO-UI-FOUNDATION.md` §2 Night Scheme

---

## 1. Intent

> *"componet studio may have a need for a play spot, or a sand box, or a test componet typ of thing. so kindle like js fiddle, theres a js spot a css spt"* — Fritz, capture 2026-05-05 (`cap_creation-product-design-direction-2026-05-05.md`)

The Workshop is the page type for **testing and probing a behavior**, not producing a finished artifact. It exists because Component Studio (and to a lesser extent Media Studio) needs a place where the operator can poke a thing — change one prop, flip one state, edit one rule, paste one snippet — and immediately see what happens. The work is **exploratory**, not productive. The output of a Workshop session is rarely a saved file; it is *understanding*.

This makes the Workshop fundamentally different from a Creation Canvas. Canvas exists to produce *the result* — a hero image, a generated component, a finished page. Workshop exists to interrogate *the behavior* — does this prop combination break the layout, does this CSS rule cascade correctly, does this component render at 360px width, what does the JS console actually say when I click that button.

Three rules bind every Workshop implementation:

1. **Editors are first-class.** HTML / CSS / JS editing surfaces are the page, not a panel. They get pixel weight equal to the preview.
2. **The preview is live.** Hot-reload on save (default) or auto-run on debounce; manual run is a fallback, not the primary loop.
3. **Isolation is visible.** The user must always know whether the preview is running in component-isolation (Storybook-style, no app shell) or full-app context. The badge is part of the chrome.

---

## 2. Product references

### 2.1 JSFiddle (the canonical 4-pane)

**Pattern.** Four equal panes — HTML / CSS / JS / Result — in a 2×2 grid. A run button at the top runs everything. Tabs let you swap which pane is foregrounded; resizers let you favor one over the others.

**Get right.** The 2×2 grid is **the** sandbox grammar. Anyone who has used a code playground in the last 15 years knows the shape on sight. Resizable panes mean the user can collapse what they don't care about right now without losing it. The "Result" pane is always present — there is no run-without-preview mode.

**Adapt.** We adopt the four-pane vocabulary literally: HTML / CSS / JS / Preview. We do **not** adopt the 2×2 layout — three editors stacked on the left, one large preview on the right reads better at 1440px and matches the Component Studio mental model (one component, all its facets visible). 2×2 is reserved for a future "compare two variants" mode.

**Reject.** JSFiddle's CDN/library picker chrome is form-heavy and slow. Our equivalent is the Component Studio's selected component — its imports are already known.

### 2.2 CodePen (live edit + social showcase)

**Pattern.** Same 4-pane grammar as JSFiddle, but the editors auto-run on debounce (no manual run needed) and the result pane updates continuously. Pens can be saved, forked, shared, embedded.

**Get right.** Auto-run-on-debounce is the right default. The user types, the preview updates, the loop is tight. Manual run-buttons exist for the case where a JS error would otherwise loop infinitely or hit an API endlessly — they are the **safety**, not the primary control.

**Adapt.** Default to auto-run with a 400ms debounce. Provide a Stop button (not a Run button) for the case where the preview is in a bad state and needs to be halted. Run becomes a *re-run* affordance — visible only when auto-run is paused.

**Reject.** CodePen's social/showcase layer (likes, follows, trending pens) is anti-FAMtastic. The Workshop is a private workbench. If a sandbox session produces something worth keeping, it gets *promoted* to the Component Library — that is the only outbound surface.

### 2.3 StackBlitz / WebContainers (full IDE-in-browser)

**Pattern.** A complete file tree on the left, a Monaco editor in the middle, a live-running dev server preview on the right. Real Node.js in the browser. Terminal output in a bottom strip.

**Get right.** Monaco as the editor. The bottom-strip terminal/console is the right home for runtime output and errors — it does not deserve its own pane, but it must always be reachable. The dev-server preview as a real iframe (not a re-render) is what makes "is this actually working" answerable.

**Adapt.** We use Monaco for the three editor panes (matches Studio's existing terminal stack). The bottom console strip is **collapsible** but defaults to ~80px tall when there is any output to show. We do **not** adopt the file tree — Workshop is single-component scope, no project navigation needed. (For multi-file scope, the user is in the Component Studio editor proper, which is a Creation Canvas.)

**Reject.** StackBlitz's full project model is too heavy. The Workshop is for one component, one playground, one set of three editor tabs.

### 2.4 Storybook (component isolation + controls + docs)

**Pattern.** A component is rendered in isolation against a clean backdrop. A Controls panel exposes every prop as a typed input. Toolbar buttons toggle theme (light/dark), viewport (mobile/tablet/desktop), and grid overlays. A Docs tab shows usage examples generated from the component's API.

**Get right.** **Component isolation as a stated mode** is the deepest insight Storybook contributed to the industry. The badge, the clean backdrop, the explicit "this is rendering against nothing else" framing — these are what distinguish a sandbox from "just running my app." We adopt all of it.

**Adapt.** The Variants pill set borrowed from the Storybook toolbar: viewport (mobile / tablet / desktop), theme (light / dark / Night), grid (off / 8px / 12-col). The Controls panel pattern lives in the right-rail Tools section when the active sandbox is a single component — see §3 and the Creation Canvas brief for the right-rail vocabulary.

**Reject.** Storybook's Docs tab and MDX layer is a documentation tool. Workshop is for testing, not for shipping docs. Documentation lives in the Component Library card, generated separately.

### 2.5 Component galleries (Cult UI / Aceternity / shadcn examples)

**Pattern.** A grid of pre-rendered component variations, click to expand into a single-component view with copy-paste source.

**Get right.** Per-variant preview at multiple viewport sizes is a useful affordance. The "this is what the component does in five reasonable shapes" view answers a question the editor pane can't.

**Adapt.** A future "variants gallery" mode of the Workshop can show the current component rendered against an array of prop sets. Out of scope for v1.

---

## 3. Layout spec

### 3.1 Frame

```
+----+--------------------------------------------------------+
| IR | TOP BAR — component name · isolated · STOP · variants  |
| 56 +----------------------------+---------------------------+
| px | HTML  [ tab ]              |                           |
|    +----------------------------+        PREVIEW            |
|    | (Monaco — html source)     |        (live iframe)      |
|    +----------------------------+        ~50% width         |
|    | CSS  [ tab ]               |                           |
|    +----------------------------+    [ viewport pills ]     |
|    | (Monaco — css source)      |                           |
|    +----------------------------+                           |
|    | JS  [ tab ]                |                           |
|    +----------------------------+                           |
|    | (Monaco — js source)       |                           |
|    +----------------------------+---------------------------+
|    | CONSOLE (collapsible, ~80px) — runtime output + errors |
+----+--------------------------------------------------------+
```

- **Icon rail (IR):** 56px, identical to every other page type. Component domain icon highlighted.
- **Top bar:** 44px. Left: breadcrumb (Components / [name] / Sandbox) and the **isolated mode badge** (always visible — never hide the isolation state). Right: the **Run/Stop button** (single control, label flips with state), variant pills (viewport · theme), Shay presence dot.
- **Editor stack (left ~50%):** three vertically stacked Monaco panes — HTML / CSS / JS. Each pane has its own tab strip header with line count and dirty indicator. Resizers between panes let the user collapse two and focus on one. A pane can be **muted** (collapsed to a 28px tab strip) without losing its source.
- **Preview pane (right ~50%):** a real `<iframe sandbox>` rendering the composed source. Padding around the iframe shows the canvas backdrop (matches Component Studio: subtle checker on dark, or theme-respective). Variant pills above the preview let the user resize the iframe to mobile / tablet / desktop without resizing the pane itself.
- **Console strip (bottom):** 0px (no output) → 80px (default with output) → resizable up to 240px. Shows `console.log` / `console.error` / runtime exceptions / network failures. Collapse chevron in the right corner. Console pipes errors **and** uses an inline error banner overlaid on the preview when a render fails (so the user sees the problem on the canvas, not buried in a strip).

### 3.2 Run controls

- **Default mode: auto-run with 400ms debounce.** The user types, the preview updates. No spinner; the iframe simply re-renders. Last-good state is preserved if the new state errors.
- **Stop button** (top bar, primary): halts auto-run, freezes the preview at the current state. The button label flips to **Run** (with a warm bevel-and-glow hover treatment per UI principle 4) and the preview gains a subtle overlay reading *"auto-run paused — press Run or ⌘↵ to re-execute."*
- **Manual mode** (toggle in the top bar): turns auto-run off permanently for the session. Used when the JS performs side effects the user does not want to fire on every keystroke.
- **Hot-reload semantics:** CSS edits hot-replace via stylesheet swap (no iframe reload, preserves preview state). HTML and JS edits trigger a full iframe reload by necessity. This distinction is surfaced in the console strip as a one-line eyebrow: `RELOAD · css-only` vs `RELOAD · full`.

### 3.3 State / props inspector

When the active sandbox is a **registered component** (loaded from the Component Library, not a free-form scratch), a **Props panel** appears in the right rail's Tools section (the same right rail spec as Creation Canvas — see `02-creation-canvas.md` §3.4). Props are typed inputs; flipping a prop re-renders the iframe with the new prop set without touching the editor source.

When the active sandbox is a **free-form scratch** (no component context — pure HTML/CSS/JS), the right rail Tools section instead shows: imports/CDN list, a "save as component" CTA (promotes to Component Library), and a "fork from template" picker (Hero, Card, Form, etc.).

### 3.4 Variants pill set

A small pill row sits **above the preview pane**, separate from chrome:

| Group   | Options                            | Default  |
|---------|------------------------------------|----------|
| Viewport| mobile · tablet · desktop          | desktop  |
| Theme   | light · dark · Night               | Night    |
| Grid    | off · 8px baseline · 12-col        | off      |

Selecting a viewport resizes only the iframe (not the pane). The unused space inside the pane is the backdrop, so the user can clearly see "the component is 360px wide on a 720px canvas," not "everything is 360px."

### 3.5 Where Shay-Shay lives

Identical placement to Creation Canvas: **presence dot** in the top bar, **right-rail Shay panel** when invoked. Shay's `current_view` mirror in the Workshop shows the iframe preview (with viewport size annotation), not the editor source — she reasons about behavior, not syntax. A Shay shortcut appears in the console strip when a runtime error fires: *"ask Shay why"* opens the Shay panel pre-loaded with the error message and the relevant editor context.

---

## 4. Surfaces this applies to

| Surface                          | Variant                                | Notes |
|----------------------------------|----------------------------------------|-------|
| Component Studio sandbox         | Full IDE (this brief's canonical form) | Primary use case |
| Media Studio test gen            | Light variant — single prompt → preview, no editor stack | See §5.2 |
| Future: snippet/fiddle scratch   | Free-form scratch (no component context)| Same shell, different right-rail content |

The Workshop pattern is **not** the right page type for editing a *production* component — that work is a Creation Canvas (preview-dominant, prompt-driven changes). Workshop is for *testing*, *probing*, and *exploring*. The two pages may share a "save to library" path but they are distinct page types with distinct chrome.

---

## 5. Per-surface variants

### 5.1 Component sandbox (full IDE) — canonical

Three Monaco editors (HTML / CSS / JS) on the left, live preview on the right, console strip on the bottom, isolated-mode badge always visible. The mockup at `03-workshop-sandbox-mockup.html` shows this variant.

### 5.2 Media test-gen (lightweight)

A single prompt input replaces the editor stack. The preview pane shows the generated media. The console strip shows generation logs (model, latency, cost). The variant pill set drops Theme and Grid; only viewport remains — and only because the same generation may be re-rendered at multiple aspect ratios.

This variant is essentially Creation Canvas with a smaller grid (1-up or 2-up instead of 6-up) and the *intent* shifted from "produce a final image" to "test whether this prompt class works." The badge in the top bar reads **TEST GEN** in place of **ISOLATED**.

---

## 6. State map

| State    | Editors         | Preview                                | Console              | Top bar              |
|----------|-----------------|----------------------------------------|----------------------|----------------------|
| Empty    | Three Monaco panes with template stubs (HTML skeleton, CSS reset, empty JS) | Centered Fraunces *"What are we testing?"* | Hidden (0px) | Run button with warm idle pulse |
| Draft    | User typing     | Last-good preview (or empty if first run hasn't fired) | Hidden unless prior errors | Stop button, dirty dot on changed tabs |
| Running  | Editors enabled | Iframe re-rendering (sub-frame transition, no full spinner) | Eyebrow `RELOAD · full` or `RELOAD · css-only` | Stop button with active glow |
| Success  | Editors enabled | Iframe rendered, viewport pill reflects active size | One-line `OK · rendered in 84ms` | Run/Stop in active state, isolated badge calm |
| Error    | Editors enabled, error tab gets red dot | Preview frozen at last good state, inline error banner overlaid | Strip auto-expands to show the stack trace, *"ask Shay why"* shortcut visible | Run button replaces Stop, top bar gets a thin warm error border |
| Saving   | Editors locked momentarily | Preview unchanged | Eyebrow `PROMOTING · variation → library` | Save spinner with explicit label per UI principle 7 |

---

## 7. How does this differ from Creation Canvas?

This is the most important section of the brief, because the surfaces feel adjacent and they are not the same page type.

| Dimension              | Creation Canvas                            | Workshop / Sandbox                              |
|------------------------|--------------------------------------------|-------------------------------------------------|
| **Operator intent**    | Produce a finished result                  | Test or explore a behavior                      |
| **What dominates**     | The artifact (image grid / single preview) | The editor stack (HTML/CSS/JS) **equally with** the preview |
| **Primary input**      | Prompt strip (natural language)            | Code editors (typed source)                     |
| **Loop**               | Prompt → generate → review → promote       | Edit → auto-run → observe → iterate             |
| **Output expectation** | A saved artifact lands in the library      | Usually nothing is saved; understanding is the output |
| **Chrome behavior**    | Collapses on creating-mode                 | Stays at 44px always — there is no "more focused" state because the editors *are* the work |
| **Right rail**         | Shay + Tools + History + Cost              | Shay + Props (or Imports) + Variants + Console-controls |
| **Primary CTA**        | Submit prompt (`⌘↵`)                       | Stop / Run (`⌘↵` re-runs)                       |
| **Backdrop**           | Black canvas with the artifact             | Editor backdrop on the left, iframe canvas backdrop on the right — two surfaces, not one |

The shortest version: **Canvas = produce a result. Sandbox = test a behavior.** If the operator's mental model is "I want a thing," they are on a Canvas. If the model is "I want to know what this thing does," they are in a Workshop.

A user moving from Canvas → Sandbox is common: they generated a component, they want to verify it renders correctly at 360px and that the click handler works. Both flows must support a **promote to library** path on the Workshop side, so a successful test session can move directly into the canonical component without a route through Canvas.

---

## 8. Acceptance criteria

An implementation passes review when:

1. **Three editor panes are first-class.** Each Monaco pane (HTML / CSS / JS) has its own tab header, line count, dirty indicator, and resizer. None can be made permanently invisible — they can be muted (collapsed to a 28px strip) but always exist.
2. **The preview is a real `<iframe sandbox>`**, not a re-render. The iframe attribute carries `sandbox="allow-scripts"` and the source is composed from the three editor panes via a Blob URL.
3. **Auto-run is the default**, with a 400ms debounce. Manual mode is opt-in via a top-bar toggle.
4. **The Stop/Run button is a single control** whose label flips with state. Hover state shows the warm bevel-and-glow per `STUDIO-UI-FOUNDATION.md` §2 (matches Creation Canvas prompt CTA).
5. **The isolated-mode badge is always visible** in the top bar. There is no full-app preview mode in v1 — if it ever ships, the badge changes to `IN-CONTEXT` and the difference is loud.
6. **Variant pills (viewport · theme · grid) sit above the preview pane, not in chrome.** Selecting a viewport resizes the iframe only.
7. **Console strip auto-expands on any output.** Default 80px, resizable up to 240px, collapse chevron in the corner. On a runtime error, an inline banner overlays the preview *and* the strip expands.
8. **Right rail follows the Creation Canvas glass slide-out spec.** Same animation, same border, same backdrop blur. Tools-section content is component-context-aware (Props if registered component, Imports if free-form scratch).
9. **Shay's `current_view` mirror shows the iframe**, with the active viewport size annotated.
10. **Tokens come from `STUDIO-UI-FOUNDATION.md` §2.** No new colors, no new motion curves.
11. **Cites at least 2 product references in the implementation PR** (per memory rule `every-page-type-design-must-cite-2-product-references.md`).
12. **Renders the matching mockup at `03-workshop-sandbox-mockup.html`** to within visual parity. No invented layouts.

---

## 9. Known gaps this brief opens

- **Free-form scratch persistence.** A scratch session that the user does not promote to library — does it survive a refresh? Unspecified. Default for v1: scratch is session-only, with a soft warning on close.
- **Multi-file scope.** Out of scope for v1. A future Workshop variant may need a thin file tree (StackBlitz-style) for components that span multiple files.
- **Variant-gallery mode.** Section 2.5 mentions a "render against an array of prop sets" mode that is not specified here. File against a future iteration.
- **Real Node.js / build step.** Workshop runs in-browser only. Components that require a build step (TS, Tailwind compilation) need either a pre-compile path or a different sandbox technology. Out of scope; flagged for the consolidation plan.
- **Shay's "ask why" on runtime error.** Requires Shay to receive the error message + the surrounding editor context as a structured payload. The Shay-platform side of this contract does not exist yet — file as a Shay-platform gap, mirrored from the Canvas brief's `current_view` gap.
