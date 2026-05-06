# Creation Canvas — Page-Type Brief

**Status:** draft for review (MVP deliverable 2 of plan_2026_05_05_workbench_per_page_design)
**Page type:** Creation Canvas
**Companion mockup:** `docs/design-research/page-types/02-creation-canvas-mockup.html`
**Inherits:** `docs/design-research/cross-cutting/01-chrome-collapse.md`, `02-glass-slide-out.md`
**Visual rulebook:** `docs/STUDIO-UI-FOUNDATION.md` §2 Night Scheme

---

## 1. Intent

> *"I need space to work."* — Fritz, 2026-05-05

A Creation Canvas page exists for one reason: the operator is *making* something — a hero image, a video clip, a component preview, a page composition. The artifact is the work. Everything else is in service of the artifact. The user's expectation, when they enter this mode, is that the screen *clears* — chrome recedes, the canvas asserts itself, and the tools the user is about to need are *one gesture away* (hover, key, click) rather than *always on*.

This is the page type that distinguishes FAMtastic from a CMS or an admin dashboard. A CMS shows you *fields*. FAMtastic shows you *the work*, and asks Shay-Shay to stand next to you while you make it. The Creation Canvas is where that quality of presence has to be felt — or the platform will read as a website with extra steps.

Three rules from the user's feedback bind every Creation Canvas implementation:
1. **Canvas dominates.** Chrome collapses on intent.
2. **Right rail is a glass slide-out, not a stuck panel.**
3. **Shay-Shay must have a defined home so she sees the canvas and the proofs.**

---

## 2. Product references

### 2.1 Cursor / VS Code (chat-sidebar collapse + focus mode)
**Pattern.** Chat sidebar is dismissible to a thin edge handle (⌘+L). Activity bar collapses with View → Appearance → Centered Layout. Command palette (⌘+K) replaces persistent menus.
**Get right.** Reversible chrome collapse keyed to a single shortcut. Edge handles that *suggest* presence without occupying space. Command palette as the universal escape hatch.
**Adapt.** Apply the same dismiss-to-edge to our right rail and secondary nav. Use ⌘\\ as the canvas-dominant toggle. Keep ⌘K as the palette.
**Reject.** Cursor's ambient chat is a vertical stripe — too narrow for our vision review use case. We need a wider right rail when invoked.

### 2.2 Leonardo AI (generation canvas + glass tool panels)
**Pattern.** Black canvas hosts a 2-up or 4-up grid of generated images. Prompt input is a glass-translucent strip pinned to the bottom, expandable. Tools (style, model, aspect) live in a right glass panel that slides out on hover-edge.
**Get right.** Aesthetic match to our Night Scheme: black canvas, translucent glass tools, hover-rich. Image grid is the *result*, not a card with metadata clutter.
**Adapt.** Steal the prompt-input-as-glass-strip pattern verbatim. Steal the right-glass-tool-panel for our right rail. Adopt their hover-reveal cost meter as a model for our cost/model display.
**Reject.** Leonardo's left rail is a sales funnel (upgrade, community). Ours is the icon rail of domains.

### 2.3 Figma (canvas-dominant, contextual right rail)
**Pattern.** Canvas is *the* page; tools are a thin top toolbar; right rail shows properties of the *currently-selected object*. Right rail is empty when nothing is selected.
**Get right.** "Right rail shows what the selection needs" is the deepest right-rail principle in any tool. We adopt it.
**Adapt.** Right rail content is a function of *(page, selected artifact, mode)*. When nothing is selected the rail can show Shay-Shay's notes about the page or be collapsed entirely.
**Reject.** Figma's top toolbar is heavier than we want. Our top bar stays minimal (breadcrumb + ⌘K hint + Shay presence dot).

### 2.4 Midjourney web (prompt + grid + compare)
**Pattern.** Single prompt input row (top or bottom), large grid of generations below, click any image to enter *compare* mode (hero image + variation strip).
**Get right.** Prompt-then-grid as the canonical generation loop. Compare mode is a *zoom-in*, not a separate page.
**Adapt.** Our generation pages use the same loop. Compare mode is a state of the same Creation Canvas, not a route change.
**Reject.** Midjourney's discord-style social feed is anti-FAMtastic. We never show other operators' work.

### 2.5 Linear (focus mode on issue view)
**Pattern.** Issue view auto-collapses left nav and right rail when opened. Title and body fill the screen. ESC restores chrome.
**Get right.** Implicit chrome collapse on intent (opening a primary artifact = entering focus). No need to ask.
**Adapt.** Entering a Creation Canvas page from a Library auto-engages collapsed-chrome state by default. The user can pin chrome open, but the default is calm.

### 2.6 Pets-assistant screenshot (user-shared reference)
**Pattern.** IDE-style header collapsed to a thin bar with breadcrumb + tabs. Big working area underneath. Side panes minimized to icons.
**Get right.** Header chrome can be a *thin status strip* without losing wayfinding. Big working area earns its size by what's in it.
**Adapt.** Our top bar is the same thin strip in collapsed mode (breadcrumb + cost + Shay dot). The icon rail is always-visible but narrow (56px); the secondary nav is the slide-out.

---

## 3. Layout spec

### 3.1 Frame

```
+----+--------------------------------------------------+----+
| IR | TOP BAR (thin, 44px collapsed / 64px expanded)   |    |
| 56 +--------------------------------------------------+ R  |
| px |                                                  | A  |
|    |                  CANVAS (dominant)               | I  |
|    |                                                  | L  |
|    |                                                  |    |
|    +---[ glass prompt strip — collapsible ]-----------+ 0  |
|    | ⌘ ↵                                              | -  |
|    +--------------------------------------------------+ 380|
+----+--------------------------------------------------+----+
```

- **Icon rail (IR):** 56px, always visible, never collapses. Click expands secondary nav as a glass slide-out *over* the canvas (not pushing it).
- **Top bar:** 44px in collapsed/focused mode, 64px when chrome is expanded. Contains breadcrumb (left), Shay presence dot + cost meter (right), ⌘K hint (center, fades on idle).
- **Canvas:** Fills the remaining viewport. Min-height 100vh minus top bar. Background `--bg-0`. Padding 24px horizontal in collapsed mode, 48px in expanded mode (so the work breathes more when chrome is on).
- **Glass prompt strip:** Pinned bottom-center, max-width 880px, glass spec from STUDIO-UI-FOUNDATION.md §2. Collapsed default = single line (`prompt + ⌘+↵ submit`). Expanded = textarea + model selector + style chips + cost preview. Toggle on focus, ⌘E, or click-expand chevron.
- **Right rail:** 0 (closed default) → 380px (open) glass slide-out from the right edge. Anchored to top bar; bottom flush with viewport. Sections inside vary by mode (see §3.4).

### 3.2 Where results / previews go

The canvas hosts the **result grid** during generation and the **detail compare view** when one result is selected.

- **Empty state.** Centered Fraunces italic prompt: *"What are we making?"* with a subtle ambient orb pulse. The prompt strip expands into focus.
- **Generating.** 4-up or 6-up shimmer skeletons matching the requested aspect ratio. A single status line above the grid: *"generating 4 images via Imagen 4 — 18s remaining."* Per UI principle 7 (no spinner without explanation).
- **Result grid.** 2×2 or 2×3 grid of generated artifacts. Each tile has a hover bevel, three corner actions (regenerate, promote, compare). Selected tile gets a warm glow halo.
- **Compare mode.** Selected tile becomes hero (60% width), other results shrink to a vertical strip on the canvas right edge (separate from the right rail — this is *content*, not chrome). A bottom hover-strip shows variant controls (upscale, edit prompt, send to component).

### 3.3 Where Shay-Shay lives

Shay-Shay is **always reachable** from the Creation Canvas, in two surfaces simultaneously:

1. **Presence dot** — top-right of the top bar, breathing cool teal. Always visible. Click opens the right rail with Shay's panel pre-selected.
2. **Right rail Shay panel** — when the right rail is open and the active section is "Shay," she sees the canvas (the selected result, if any) and the prompt history. She can comment, propose a prompt revision, or flag a prior generation as worth promoting.

She is **never** floating randomly over the canvas. She **never** speaks unless the user invites her or the system surfaces a high-confidence suggestion (the ambient-but-not-annoying rule).

Per the user's quote: *"so she can see the canvas + proofs simultaneously"* — the right-rail Shay panel must include a `current_view` block that mirrors the selected canvas tile in miniature so it's clear what she's reasoning about.

### 3.4 Right-rail slide-out — sections per mode

The right rail is a single glass surface; its sections are declared per-page-mode. For Creation Canvas (Media variant), the sections are:

| Section | Purpose | Default state |
|---|---|---|
| Shay | Conversation about the artifact | hidden until invoked |
| History | Prior prompts and their results | collapsed |
| Tools | Style chips, model selector, aspect, seed | expanded if rail is open |
| Cost | Live cost ticker for current generation | always pinned to bottom of rail |

Sections collapse independently. Pinned sections persist across page navigation within the same domain.

### 3.5 Bottom strip

A 28px-high glass bar above the prompt strip shows: model in use, current run cost, generation count this session, ⌘\\ collapse hint. Disappears entirely in fullscreen (F) mode. Never carries actions — purely status.

---

## 4. Modes

The Creation Canvas has three modes:

| Mode | Chrome state | Trigger | Reverse |
|---|---|---|---|
| Browsing | Top bar 64px, secondary nav slid out, right rail open with Tools section | Default on entering from Library | (none — this is the entry state) |
| Creating | Top bar 44px, secondary nav closed, right rail closed except for cost meter | First keystroke in prompt OR canvas click OR ⌘\\ | ESC, mouse-to-edge, or click-expand chevron |
| Reviewing | Top bar 44px, right rail open with Shay section, canvas in compare mode | Click any result tile | ESC or click outside selected tile |

Mode is implicit, not user-selected. The system reads intent (focus, click target, idle) and chooses. The user can always force-pin chrome via the pin icon in the top bar.

---

## 5. Per-domain variants

The Creation Canvas pattern adapts to four production domains:

### 5.1 Media Studio (image / video generation)
The canonical implementation. Result grid is image tiles. Prompt strip carries model + aspect + style. Right rail Tools section is generation-flavored. Compare mode shows full-resolution preview with upscale/edit affordances.

### 5.2 Component Studio (code + preview)
Canvas hosts a *single* live component preview (centered, on a checkered or branded backdrop). No result grid — one component at a time. Right rail Tools section becomes Props (interactive prop editor). Prompt strip is a "describe a change" input that proposes a diff. For multi-prop sandboxing, route to Workshop instead.

### 5.3 Template Editor
Canvas hosts a side-by-side: template form (left half) + live preview render (right half). Prompt strip is "describe the template change" — agent edits both sides. Right rail Shay section is mandatory because templates affect every site that uses them. *This is on the boundary with Editor-with-Chat — flag for §6 acceptance.*

### 5.4 Page Editor
Canvas hosts the live page preview, full-bleed. Prompt strip is the surgical-edit prompt. Right rail Shay section + a Sections panel (jump to hero / nav / footer / etc.). *Also on the boundary with Editor-with-Chat — see §6.*

The Template and Page editor variants share enough with Editor-with-Chat that they may resolve to that page type instead, after the deferred 06 brief lands. This brief is conservative: build them as Creation Canvas variants for now and let the Editor-with-Chat deliverable promote them if the chat sidebar pattern proves stronger.

---

## 6. State map

| State | Canvas | Prompt strip | Right rail | Top bar |
|---|---|---|---|---|
| Empty (just landed) | Fraunces hero "What are we making?" + ambient orb | Collapsed, 1-line | Open with Tools section | Expanded (64px) |
| Loading (config fetch) | Subtle shimmer overlay on canvas frame | Disabled | Tools section shows spinner with name ("loading models…") | Expanded |
| Generating | 4-up shimmer grid, status line above | Locked, shows submitted prompt | Cost section animates ticker | Collapsed (44px), generation count increments |
| Single result | Hero image centered, two corner actions | Collapsed, ready for refinement | Shay section auto-opens with a one-line summary | Collapsed |
| Multi-result | 2×2 or 2×3 grid | Collapsed | Shay section + History section both visible | Collapsed |
| Error | Canvas stays at last good state, inline toast above prompt strip with retry CTA | Re-enabled, prior prompt preserved | Tools section shows the failure cause | Collapsed |
| Generating-in-progress (stream) | Tiles fill in as they arrive | Locked | Cost ticks up live | Collapsed |
| Approved & saved | Selected tile gets a sustained warm halo, brief "promoted to library" toast | Cleared, ready for next prompt | History section shows the new entry pinned | Collapsed |

---

## 7. Acceptance criteria

An implementation passes review when:

1. **Chrome collapse is automatic.** Entering generation mode (first keystroke or canvas click) collapses the top bar to 44px and closes the secondary nav within 600ms (Night Scheme transition duration). No user action required.
2. **Canvas dominates pixel-wise.** With all chrome closed, canvas occupies ≥ 92% of viewport width (page) and ≥ 88% of viewport height. Measure on a 1440×900 reference frame.
3. **Right rail is a glass slide-out.** It does not push the canvas; it floats over it with backdrop-filter blur ≥ 20px and the §2 glass border. Closed default in Creating mode; open default in Browsing mode.
4. **Shay-Shay has a fixed home.** Presence dot is in the top bar at all times. Right-rail Shay panel includes a `current_view` mirror of the selected result.
5. **Prompt strip is a glass strip, not a form.** It collapses to one line when not focused. Focus expands it with a 400ms ease.
6. **Compare mode is a *state*, not a route.** Clicking a result tile transforms the canvas in place; the URL may update with a `?focus=<id>` query but no full navigation.
7. **All status text names what's happening.** No bare spinners; every wait state has a label per UI principle 7.
8. **Tokens come from STUDIO-UI-FOUNDATION.md §2.** No new colors, no new motion curves. Use the variables.
9. **Cites at least 2 product references in the implementation PR.** Per memory rule `every-page-type-design-must-cite-2-product-references.md`.
10. **Renders the matching mockup at `02-creation-canvas-mockup.html` to within visual parity.** No invented layouts.

---

## 8. Known gaps this brief opens

- **Generation cost meter UX.** The cost-ticker section is specced but the data source isn't (capability manifest needs a `cost_per_call` field per provider). File against Admin → capability manifest.
- **Shay's `current_view` mirror.** Requires an API for "what is the user looking at right now" that doesn't exist. File as a Shay-platform gap.
- **Compare mode URL state.** Decision needed: do we use query params, hash, or none? Defer to the consolidation plan.
- **Pin-chrome affordance design.** Mentioned in §4 but not visually specified. The mockup includes a placeholder pin icon; final affordance TBD.
