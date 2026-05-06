# Glass Slide-Out — Cross-Cutting Pattern

**Status:** draft for review (MVP deliverable 3b of plan_2026_05_05_workbench_per_page_design)
**Inherits:** `docs/STUDIO-UI-FOUNDATION.md` §2 Night Scheme glass spec
**Related:** `cross-cutting/01-chrome-collapse.md`, `cross-cutting/glass-slide-out-prototype.html`

This brief defines the canonical glass slide-out — the surface used for the secondary nav (slid out from the icon rail) and the right rail (slid out from the right edge). Same visual language, different anchors, same state machine.

---

## 1. The rule + the spec

> *"The right rail is a glass slide-out, not a stuck panel."*
> *"Secondary nav is a glass slide-out from the icon rail."*
> — Fritz, 2026-05-05 (memory: `rule/right-rail-is-glass-slide-out-not-stuck-panel.md`, `rule/secondary-nav-slides-out-as-glass-from-icon-rail.md`)

Both surfaces use the Night Scheme glass spec from `STUDIO-UI-FOUNDATION.md` §2:

```
background:      var(--glass)        rgba(255,255,255,0.025)
border:          1px solid var(--border)   rgba(255,255,255,0.06)
backdrop-filter: blur(20-28px) saturate(180%)
border-radius:   16-20px (cards), 7-9px (kbd, pills)
box-shadow:      0 20px 40px -28px rgba(0,0,0,0.6),
                 inset 0 1px 0 rgba(255,255,255,0.03)
```

Slide-outs *float over* the canvas. They never push the canvas. The canvas keeps its width; the slide-out lays on top of it with the glass blur sampling whatever's underneath.

---

## 2. The two slide-out surfaces

| | Secondary nav | Right rail |
|---|---|---|
| Anchor | Icon rail (left, x=56px) | Right edge (x=100%) |
| Width | 240px | 380px (default), resizable 320–520px |
| Translation | translateX(-100%) → 0 | translateX(100%) → 0 |
| Trigger | Click icon-rail item, or `⌘/` | Click trigger pill, click result tile, click Shay dot, or `⌘.` |
| Default state | Open in Browsing mode, closed in Creating mode | Open in Browsing mode (Tools section), closed in Creating mode |
| Persistence | One section pinned per domain | Last section pinned per domain |
| Top corner radius | 16px | 16px |
| Bottom flush | Yes (full viewport height minus top bar) | Yes |
| Box shadow direction | Right side (24px 0 60px) | Left side (-24px 0 60px) |

Same visual DNA, mirrored geometry.

---

## 3. Anatomy

### 3.1 Secondary nav
```
┌──────────────────────────────┐
│ DOMAIN HEADER (eyebrow)      │
│ Site name (Fraunces 26px)    │
├──────────────────────────────┤
│ ▸ section group 1            │
│   ▸ leaf item                │
│   ▸ leaf item · 4            │
│ ▸ section group 2            │
│   ▸ leaf item                │
├──────────────────────────────┤
│ + new (CTA)                  │
└──────────────────────────────┘
```
Sections collapse independently. Active leaf gets a warm halo + bevel. Hover gets a glass-2 background and a +1px border-hi accent.

### 3.2 Right rail
```
┌──────────────────────────────┐
│ TAB STRIP   SHAY · TOOLS · …│ × │
├──────────────────────────────┤
│                              │
│ active section content       │
│   (glass cards, pills,       │
│    forms, Shay messages)     │
│                              │
├──────────────────────────────┤
│ pinned cost ticker / status  │
└──────────────────────────────┘
```
Tab strip across the top selects the active section. Tabs are pills, JetBrains Mono uppercase. Section content is a vertical scroll of glass cards. The cost ticker (or other always-pinned status) is locked to the bottom and never scrolls.

---

## 4. State machine

```
       ┌─────────┐  trigger      ┌───────────┐
       │ closed  │ ─────────────▶│  opening  │
       └─────────┘               └─────┬─────┘
            ▲                          │ 600ms ease
            │ 600ms ease               ▼
       ┌────┴────┐  ESC / outside  ┌───────────┐
       │ closing │ ◀───────────────│   open    │
       └─────────┘                  └─────┬─────┘
                                          │ pin
                                          ▼
                                    ┌───────────┐
                                    │  pinned   │
                                    └───────────┘
```

- **closed** → no DOM presence beyond the trigger pill. `inert`, `aria-hidden=true`.
- **opening / closing** — translateX transition 600ms via `cubic-bezier(0.16, 1, 0.3, 1)`. The trigger pill fades to 0 opacity over 200ms during opening; reverses on closing.
- **open** — focus is trapped inside the slide-out. ESC, outside-click, or trigger-toggle returns to **closed**. Idle behavior follows the chrome-collapse rule (closes after 1.6s idle if user is in Creating mode).
- **pinned** — survives mode changes. Pinning is the user's explicit "keep this open." Pin survives reload (persisted per-domain in localStorage).

---

## 5. Sections — tools vs. information

The right rail can host **tools** (style chips, model selectors, prop editors) or **information** (Shay messages, history, asset metadata). The same surface, varying content. Sections are *declared per page-mode* in the workspace contract (STUDIO-UI-FOUNDATION.md §8).

Proposed declaration shape (to add to the workspace contract spec):

```json
"right_rail": {
  "default_section": "tools",
  "sections": [
    { "id": "shay",    "label": "SHAY",    "kind": "info", "trigger_event": "shay-invoked|result-selected" },
    { "id": "tools",   "label": "TOOLS",   "kind": "tool", "always_available": true },
    { "id": "history", "label": "HISTORY", "kind": "info" }
  ],
  "pinned_status": { "id": "cost-ticker", "anchor": "bottom" }
}
```

Each section declares its `kind` (info | tool) and what triggers automatic selection (e.g. clicking a result auto-selects "shay" because the user probably wants to ask about it). Sections can be reordered by drag in the tab strip; order persists per-domain.

---

## 6. Accessibility

- Focus trap on **open**: tab cycles within the slide-out only. Shift+Tab from the first focusable returns to the last focusable.
- ESC closes the slide-out and returns focus to the trigger that opened it.
- Outside-click closes the slide-out *unless* it is in **pinned** state. Pinned slide-outs ignore outside-click; only an explicit close (×, unpin, or `⌘.` toggle) closes them.
- `aria-modal=false` (these are not modals — the canvas remains interactive when the slide-out is open and unpinned, by clicking through the glass).
- `aria-expanded` on the trigger reflects state. Screen readers announce "shay panel opened" / "tools panel opened" once per open.
- `prefers-reduced-motion: reduce` — translateX duration drops to 1ms; opacity transitions remain.

---

## 7. Product references

### 7.1 macOS Inspector Sidebars (Finder, Preview)
**Pattern.** Right-edge inspector slides in to show selected item's metadata. Same surface, different content per selection. **Adopt:** the section-content-follows-selection model. **Adopt:** consistent right-edge anchor across all surfaces.

### 7.2 Cursor — Command Palette
**Pattern.** Glass-translucent overlay invoked by ⌘K, dismissed by ESC, focuses on input. Lives over the canvas without pushing it. **Adopt:** the float-over-canvas geometry. **Adopt:** ESC as the universal close. (Note: our slide-outs are not modal; the palette is a separate surface kind.)

### 7.3 Aceternity / Cult UI — Floating Glass Panels
**Pattern.** Translucent panels with backdrop-filter and warm/cool glow on focal elements. Hover micro-interactions on every actionable element. **Adopt:** the glow rule and the bevel-on-hover. **Adopt:** the "glass card inside glass surface" nesting.

### 7.4 Linear — Right Rail Inspector
**Pattern.** Click an issue → right rail slides in showing its properties. Properties panel has section groupings (Status / People / Dates / Linked) collapsible independently. Pinning sticks across navigation. **Adopt:** section grouping with independent collapse. **Adopt:** pin-survives-navigation.

### 7.5 Figma — Right Properties Panel
**Pattern.** Properties panel reflects the current selection. Empty selection → shows page properties. Multi-selection → shows shared properties only. **Adopt:** "what does the rail show when nothing is selected" — answer: Shay's notes about the page or, if none, the Tools section in idle state. Never blank.
