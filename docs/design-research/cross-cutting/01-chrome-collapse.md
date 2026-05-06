# Chrome Collapse — Cross-Cutting Pattern

**Status:** draft for review (MVP deliverable 3a of plan_2026_05_05_workbench_per_page_design)
**Inherits:** `docs/STUDIO-UI-FOUNDATION.md` §2 Night Scheme (motion + density rules)
**Related:** `cross-cutting/02-glass-slide-out.md`, `page-types/02-creation-canvas.md`

This brief defines *when* and *how* the Workbench chrome collapses to give the canvas dominance. Every page type that hosts a primary creation surface inherits these rules.

---

## 1. The rule

> *"When the user is actually creating, chrome collapses; canvas dominates."*
> — Fritz, 2026-05-05 (memory: `rule/chrome-collapses-when-user-is-actively-creating.md`)

Chrome is anything that is not the work — top bar, secondary nav, right rail, bottom panels, status strips, prompt strips when not in use. The canvas is the work — the artifact the user is iterating on. The platform must continuously read user intent and bias chrome toward the smallest footprint that preserves wayfinding.

The corollary: **chrome only expands when the user is browsing, selecting, or configuring.** Default state on entering a Library is *expanded*. Default state on entering a Creation Canvas from a Library is *collapsed*.

---

## 2. Default vs. focused state per surface

| Surface | Default (browsing) | Focused (creating) | Notes |
|---|---|---|---|
| Icon rail | Visible, 56px | Visible, 56px | Never collapses. It is the only persistent wayfinder. |
| Secondary nav | Slid-out as glass over canvas, 240px | Closed | Closed default in Creation Canvas / Workshop / Editor-with-Chat focused mode. |
| Top bar | Expanded, 64px | Collapsed, 44px | Collapsed mode keeps breadcrumb + Shay dot + cost pill + ⌘K hint. Drops actions and tab bars. |
| Right rail | Open, 380px (Tools section pre-selected) | Closed, 0px (Cost ticker pinned only) | Reopens on Shay invocation, on result selection, or on explicit trigger click. |
| Bottom panel strip | Visible, 220px (Logs/Trace/Approvals) | Hidden | Hidden in focused mode. Reopens on incoming approval or error event. |
| Prompt strip | Collapsed, single line | Expanded on focus | Glass spec — see slide-out brief. Always above the canvas, never replacing it. |
| Status strip | Visible, 28px | Hidden | Replaced by the cost pill in the top bar. |

Surfaces marked "Hidden" still respond to system events (an approval arriving will surface a quiet badge on the icon rail, never auto-open the panel).

---

## 3. Triggers

### 3.1 Explicit triggers

| Trigger | Action | Reverse |
|---|---|---|
| `⌘\` | Toggle full chrome-collapse on/off | Same shortcut |
| `F` | Fullscreen the canvas (also hides the icon rail) | `ESC` or `F` |
| Pin icon (top bar) | Pin chrome open regardless of intent | Click pin again |
| Right-rail trigger button (right edge) | Open right rail to last-used section | Click `×` or click outside |
| Click an icon-rail item | Open secondary nav for that domain | Click empty canvas or another item |

### 3.2 Implicit triggers

| Signal | Action | Confidence |
|---|---|---|
| First keystroke in prompt strip | Collapse top bar to 44px, close secondary nav | High |
| Click a result tile | Collapse to focused, open right rail Shay section | High |
| Mouse to canvas + idle ≥ 1.6s | Collapse top bar | Medium — only if no menus are hovered |
| Mouse to canvas-edge for ≥ 200ms | Reveal the trigger pill for the adjacent panel (peek, not open) | High |
| Mouse to top edge (≤ 8px) | Re-expand top bar | High |
| Mouse to right edge (≤ 8px) | Reveal right-rail trigger pill | High |

Implicit triggers only fire when the user has a primary canvas. On Library / Settings / Triage pages, implicit collapse is **disabled** — chrome stays put.

### 3.3 Reverse triggers

- `ESC` — closes the topmost open chrome (right rail first, then secondary nav, then expands top bar). One-key escape ladder.
- Click outside any open glass slide-out — closes it.
- System event with severity ≥ warn — auto-opens the matching bottom panel (Logs for an error, Approvals for a gate). Auto-open only fires once per event; further events update silently.

---

## 4. Animation timing

All durations and easing come from STUDIO-UI-FOUNDATION.md §2 motion tokens. Do not introduce new curves.

| Transition | Duration | Easing |
|---|---|---|
| Top bar expand/collapse (height) | 400ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Secondary nav slide-out (translateX) | 600ms | same |
| Right rail slide-out (translateX) | 600ms | same |
| Bottom panel reveal (translateY) | 600ms | same |
| Prompt strip expand (height) | 400ms | same |
| Pin/unpin icon flash | 400ms | same |
| Auto-collapse on idle (delayed start) | 400ms after 1.6s idle | same |

Stagger on entrance: child elements within a re-revealing surface enter with a 0.2s stagger, opacity + 22px translateY (matches §2 entrance spec). Exits do **not** stagger — they leave together to feel decisive.

`prefers-reduced-motion: reduce` — collapse durations drop to 1ms; opacity transitions remain. Pin/idle behavior is preserved.

---

## 5. Accessibility

### 5.1 Keyboard parity
Every implicit trigger has an explicit keyboard equivalent. A keyboard-only user can:
- Toggle full chrome with `⌘\`.
- Open right rail with `⌘.`.
- Open secondary nav with `⌘/`.
- Cycle bottom panels with `Ctrl+Tab`.
- Focus the prompt strip with `⌘K` (palette) or `/` when canvas is focused.

### 5.2 Focus management
- When chrome collapses, focus is moved to the canvas (or to the prompt strip if it is the active intent).
- When chrome re-expands, focus returns to where it was unless the user clicked into a chrome control directly.
- Right rail open captures focus inside the rail; ESC restores focus to the prior canvas position.

### 5.3 Screen readers
- `aria-expanded` on each chrome surface reflects its state.
- Idle-collapse fires a polite live-region announcement (*"chrome collapsed; press command-backslash to restore"*) once per session, not per collapse.
- Hidden surfaces use `inert` so screen readers skip them entirely; reopening removes `inert` and restores tab order.

---

## 6. Product references

### 6.1 Cursor — Focus Mode
Toggleable focus mode collapses activity bar, sidebar, and minimap, leaving the editor. Single shortcut. **Adopt:** the single-shortcut model for full-collapse. **Reject:** Cursor's focus mode does not surface system events while collapsed; we will (per §3.3 auto-open).

### 6.2 Linear — Issue View
Opening any issue auto-collapses the left nav; ESC restores. No setting; the system reads intent. **Adopt:** intent-driven implicit collapse. **Adopt:** ESC as the universal restore.

### 6.3 macOS Stage Manager
Brings the focused window forward and recedes everything else into a thumbnail strip. The chrome doesn't go away — it just gets out of the way. **Adopt:** the *recede, don't remove* posture. Our chrome collapses to thin trigger pills, not to nothing.

### 6.4 Figma — Hide UI (`⌘\`)
Single shortcut hides every panel, leaving the canvas. Re-shows with the same shortcut. **Adopt:** the shortcut and the symmetry verbatim. (Yes — this is where ours comes from.)

### 6.5 Notion — Focus Mode
Hides the sidebar and zoom controls when typing in a page. Subtle; many users never notice. **Adopt:** the subtlety — collapse should feel inevitable, not jarring. **Reject:** Notion's lack of a visible peek-handle (users can't find the sidebar back); our trigger pills are explicit.
