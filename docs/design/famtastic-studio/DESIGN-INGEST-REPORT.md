# FAMtastic Studios — Design Ingest Report

**Date:** 2026-05-10
**Source archive:** `docs/design/famtastic-studio/FAMtastic Studios.zip` (50,465 bytes, integrity OK)
**Extraction target:** `docs/design/famtastic-studio/extracted/`
**Phase:** 1 of 5 (drift-correction realignment)

---

## What was found

18 files, all valid. Tree:

```
FAMtastic Studio.html               (44 lines)   entry HTML, loads React 18 UMD + Babel standalone
styles.css                          (620 lines)  design tokens + components
src/
├── app.jsx                         (87 lines)   App wiring, screen registry, sub-tab routing
├── shell.jsx                       (193 lines)  Rail, Topbar, MemoryStrip, ContextPanel, ShayBubble
├── icons.jsx                       (77 lines)   Stroke-based icon set (~50 icons)
├── primitives.jsx                  (186 lines)  Card, Chip, Avatar, Tabs, Seg, Btn, Slot, MediaTile,
│                                                Skel, Tag, Toggle, Hint, SectionHeader, ChatBubble,
│                                                Meter, Field
└── screens/
    ├── home.jsx                    (249 lines)  "Platform Home — command center"
    ├── sites.jsx                   (111 lines)  "Sites Dashboard" (grid/list of site cards)
    ├── site-builder.jsx            (249 lines)  Three-pane Builder: chat / preview / inspector
    ├── site-settings.jsx           (141 lines)  Two-scope: platform defaults vs this-site
    ├── think-tank.jsx              (111 lines)  Brainstorm board (Capture / Cluster / Promote)
    ├── research.jsx                (197 lines)  Research Center (Fast/Standard/Deep/Expert depth)
    ├── component-studio.jsx        (203 lines)  Component library + chat-driven builder + variants
    ├── media-studio.jsx            (180 lines)  Three-pane gen workspace: prompt / grid / inspector
    ├── media-library.jsx           (142 lines)  Tile registry with provenance + placement
    ├── shay.jsx                    (143 lines)  Two-pane Shay workspace: chat / route + readback
    ├── mission-control.jsx         (205 lines)  Operator workspace: brief, runs, proof, blockers, viz
    └── settings.jsx                (133 lines)  Platform-wide settings (models, cost, defaults, theme)
```

Total: 3,271 lines of source.

---

## Page types found

The design is a **single-page React app loaded from one HTML file**, where each "page" is a top-level screen component. There are 12 screens. Routing is in-memory only (no URL hash, no real router).

Screens (in `app.jsx` registry order):

1. `ScreenHome` — Platform Home (command center)
2. `ScreenSites` — Sites Dashboard
3. `ScreenSiteBuilder` — Site Builder Workspace
4. `ScreenSiteSettings` — Site Settings (platform-default + this-site scope toggle)
5. `ScreenThinkTank` — Think-Tank / Brainstorm
6. `ScreenResearch` — Research Center
7. `ScreenComponentStudio` — Component Studio
8. `ScreenMediaStudio` — Media Studio (generation)
9. `ScreenMediaLibrary` — Media Library (registry)
10. `ScreenShay` — Shay assistant workspace
11. `ScreenMissionControl` — Mission Control (Operator)
12. `ScreenSettings` — Platform Settings

---

## Layout structure

### Shell
The `App` component composes:

```
<Rail/>                              ← left icon rail (vertical), 9 nav items + footer Settings
<shell>
  <Topbar/>                          ← project · site · screen breadcrumb, search, queue/cost/notifications
  [optional sub-tab bar]             ← only when section is "sites" or "media"
  <body>
    <main className="workspace">     ← active screen renders here
    [<ContextPanel/>]                ← right panel; hidden for builder/components/media/shay (they own their own right pane)
  </body>
  <MemoryStrip/>                     ← bottom strip: time, who, text, run-id chip
</shell>
<ShayBubble/>                        ← floating Shay button; click → switch to Shay screen
```

### Rail nav (as built)
Top: Home, Sites, Think-Tank, Research Center, Component Studio, Media Studio, Shay Shay, Mission Control.
Spacer.
Footer: Settings.

### Sub-tabs (as built)
- **Sites** parent → tabs `Dashboard | Builder | Settings` (so Site Builder and Site Settings are *nested*, not top-level).
- **Media** parent → tabs `Studio | Library` (so Media Library is *nested*).

This is a **divergence from the platform spec**, which calls for all three (Site Builder, Site Settings, Media Library) to be top-level rail items. See "Implementation risks" below.

---

## Visual theme notes

### Tokens — `styles.css` defines a deep, glass-y dark theme with warm/cool dual accents

**Surfaces:** OKLCH-based depth grading from `--void` (0.08) up through `--bg`, `--bg-2`, `--panel`, `--panel-2`, `--panel-3`, `--panel-hi` (0.27). Glass surfaces use translucent OKLCH with explicit edge highlights.

**Type:**
- Sans: `Geist` (300/400/500/600/700)
- Serif: `Instrument Serif` (regular + italic)
- Mono: `JetBrains Mono` (400/500)
- Five ink levels (`--ink` through `--ink-5`)

**Brand accents:**
- `--ember` (warm gold reveal, 0.78 0.14 65) — primary action color
- `--ember-2` (deeper) and `--ember-soft` (transparent surface)
- `--aurora` (cool teal, 0.74 0.13 200) — secondary accent
- `--plum` (0.55 0.16 320) — rare highlight
- `--shay` (signature glow, 0.82 0.12 90) — Shay-specific
- Status: `--good` `--warn` `--crit` `--info`

**Radii:** five steps (6, 10, 14, 20, 28).
**Shadows:** three; `--shadow-glow` is the ember-glow used on primary buttons hover.

The design narrative (per stylesheet header comment) is *"coming out of darkness — deep blacks, glass, soft warm light."*

### Reusable patterns (from primitives.jsx)
- **`SectionHeader`** with eyebrow / title / sub / right-aligned action group — used at the top of every screen.
- **`Card`** — primary container; variants `card-hi`, `card-hover`.
- **`Eyebrow`** — small uppercase label above a section.
- **`Chip`** — pill with tones (ember, aurora, shay, good, warn, crit).
- **`Tag`** — small monospaced ID/label (used heavily for run IDs, slot names, components).
- **`Dot`** — 6px status dot with optional glow.
- **`Avatar`** — `kind="shay"`, `kind="fritz"`, etc.
- **`Tabs`** + **`Seg`** — both segmented controls; `Tabs` is row-style, `Seg` is button-group style.
- **`Btn`** — three kinds: default / primary / ghost; supports leading icon.
- **`Slot`** — placeholder with `filled` modifier (for component-slot UI).
- **`MediaTile`** — deterministic gradient placeholder (`seed`-driven), supports `ratio` and `badge`.
- **`Skel`** — skeleton loading bar.
- **`Toggle`** — pill switch.
- **`Hint`** — small interaction note.
- **`ChatBubble`** — message row with avatar + meta.
- **`Meter`** — thin progress bar with tone.
- **`Field`** — labelled form-field wrapper with optional sub-text.

### Screen patterns
- Most screens open with `<SectionHeader eyebrow=... title=... right={[buttons]} />`.
- Multi-column layouts use 12-column-equivalent grids with `gap: 14`.
- Three-pane workspaces (Site Builder, Component Studio, Media Studio, Shay) use explicit grid templates and **suppress the global ContextPanel** (the screen owns its own right pane).
- Inspectors (right-rail-of-screen) use `Eyebrow` headers with two-column field rows below.
- "Promote to X" is a recurring CTA pattern (Think-Tank → Research / Site / Component / Media; Research → site task; Component → site slot).
- "Approve / Reject / Save" is a recurring three-button pattern in Media Studio and Component Studio.
- `Tag` is used on every run/slot/component reference, in mono.

---

## Missing assets

- **No raster/SVG image files** in the ZIP. Imagery is fully placeholder via `MediaTile` (deterministic OKLCH gradients).
- **No fonts bundled.** Loaded from Google Fonts CDN.
- **No icon SVG files.** All ~50 icons are inline JSX path data in `icons.jsx`.
- **No favicon, no logo.** The rail mark is a CSS-styled `F` glyph.
- **No build tooling.** This is a Babel-standalone in-browser app, not a real React build. There's no `package.json`, no Vite/Webpack/Next config.

These are **expected gaps** for a Claude-Design template (the goal is layout + look, not real assets).

---

## Implementation risks

### Risk 1 — Nav structure divergence (HIGH)
The design's rail has **9 items**, treating Site Builder, Site Settings, and Media Library as nested tabs under Sites and Media Studio. Your spec calls for **12 top-level rail items** including all three. This must be reconciled before a real implementation. The IA doc (Phase 2) will recommend either:
- (A) Promote all 12 to top-level rail entries (matches your spec, departs from design template).
- (B) Keep design's 9 + sub-tabs but mark all 12 in the `NAV` constant so URL/keyboard nav can target them directly.

I recommend (A) for clarity, but it's worth your call.

### Risk 2 — Babel-in-browser is not production tooling (MEDIUM)
React 18 UMD + Babel standalone runs the design at decent speed for previewing, but it would be a step backward to ship as production. Real implementation would either: (i) translate JSX to plain JS modules served by Studio's existing Express; or (ii) introduce Vite/esbuild. We do **not** want to take that on in this realignment pass — Phase 4 will scope it as future work.

### Risk 3 — Existing Studio shells (LOW but real)
There are **9** existing public HTML entry points in `site-studio/public/`:
`index.html`, `operator.html`, `shell-compare.html`, `workbench-foundation.html`, plus 5 `_mockup-*.html` files. Two of these (`index.html` chat shell, `operator.html` Mission Control) are real, working surfaces tied to live server routes. The realignment must not break either. The implementation plan (Phase 4) addresses how the new design template lands without disrupting those.

### Risk 4 — Visual-language collision (LOW)
The existing `operator.css` already defines an OKLCH dark theme with similar but **distinct** tokens (`--op-bg`, `--op-accent` red, `--op-purple`). Wholesale token replacement will require either:
- Renaming existing operator tokens to match the new design's `--ember`/`--aurora` family, or
- Scoping the new theme to the new shell only and leaving operator's classes alone until Mission Control gets folded in.

### Risk 5 — In-memory state only
Design has zero persistence. All state (selected site, active tab, prompts) is in `React.useState` with no localStorage, no URL, no server sync. A real implementation must add at least URL hash routing and server-state hooks. Phase 4 will scope.

### Risk 6 — Missing real handlers
Many `onClick`s in the design are no-ops or `() => {}`. The buttons are visual contracts, not commitments. The IA doc (Phase 2) inventories what's real-vs-placeholder per section.

---

## Inventory: existing repo assets that map to the design

| Design surface | Existing repo file(s) |
|---|---|
| Rail / Topbar / MemoryStrip / ContextPanel | none — new |
| `ScreenHome` | partially: `site-studio/public/workbench-foundation.html` (kickoff dashboard), `index.html` (chat-first home) |
| `ScreenSites` | none — gap (sites are listed via `/api/intelligence/sites` but no dashboard UI) |
| `ScreenSiteBuilder` | `site-studio/public/index.html` (chat + preview), `site-studio/server/intelligence-*` (run state), `site-studio/lib/studio-actions.js` |
| `ScreenSiteSettings` | none — gap (some defaults live in `studio-config.json` but no UI) |
| `ScreenThinkTank` | partially: `captures/inbox/`, `memory/` (capture system), `fam-hub idea` CLI |
| `ScreenResearch` | partially: `docs/research/famtastic-studio-execution/`, `site-studio/intelligence/`, `site-studio/lib/research-*.js` |
| `ScreenComponentStudio` | partially: `components/library.json`, `site-studio/lib/famtastic-skeletons.js`, surgical-editor |
| `ScreenMediaStudio` | partially: `site-studio/lib/openai-image-adapter.js`, `site-studio/lib/media-telemetry.js` |
| `ScreenMediaLibrary` | partially: `site-studio/public/img/`, asset registry spec exists but no UI |
| `ScreenShay` | partially: `site-studio/lib/shay-shay-sessions.js`, mockups in `_mockup-*.html` |
| `ScreenMissionControl` | **fully:** `site-studio/public/operator.html` + `site-studio/server/intelligence-{routes,actions,reader,writer}.js` |
| `ScreenSettings` | partially: `site-studio/lib/model-config.json`, `studio-config.json` (no UI) |

Detailed cross-walk lives in the Phase 2 IA document.

---

## Acceptance — Phase 1

- [x] ZIP found at canonical path, integrity verified.
- [x] All 18 files extracted under `extracted/` (gitignored if you choose; see Phase 4).
- [x] All file types catalogued.
- [x] All 12 screen modules identified.
- [x] Layout structure documented.
- [x] Visual tokens, typography, primitives, screen patterns documented.
- [x] Missing assets called out.
- [x] Implementation risks inventoried with severity.
- [x] Existing-repo cross-walk seeded for Phase 2.
- [x] Nav-structure divergence (design 9 vs spec 12) flagged for explicit resolution.

Ready to proceed to Phase 2.
