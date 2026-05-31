---
title: Skills Browser Screen — Implementation Plan
date: 2026-05-30
gate: SHIP
agents_used: 20
r1_majors: 6
r2_ships: 1/3
gate_b_amendment: applied-2026-05-30
tags:
- skills-screen
- desktop
- plan
- phase3c
permalink: shay-memory/plans/skills-screen-plan-2026-05-30
---

# Skills Browser Screen — Implementation Plan

**Gate: NEEDS-REVISION**
**Agents: 18 | R1 majors found: 6 | R2 ships: 0/3**

---

# Skills Browser — Definitive Implementation Plan

## Executive Summary

This plan creates the Skills Browser screen in `shay-desktop-electron`. The work touches four files: a new `Skills.module.css`, an updated `Skills.tsx` (CSS module import, IPC error handling, keyboard accessibility), an updated locale file (`en/skills.ts`), and a targeted removal from `main.css`. IPC bindings are already present. No router changes are made — Skills is surfaced from within the main shell, not as a top-level screen peer.

---

## 0. Pre-Flight Verification

Before writing a single line, run these two commands and record the output:

```bash
# 1. Confirm typecheck baseline
cd /Users/famtasticfritz/famtastic/shay-desktop-electron && npm run typecheck:web

# 2. Audit all skills-* usages across the renderer
grep -rn 'skills-' /Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src \
  --include='*.tsx' --include='*.ts' --include='*.jsx' --include='*.js'
```

The grep output determines which classes may be safely removed from `main.css` (Step 4). Do not proceed to Step 4 without it.

---

## 1. File Inventory

### Create
- `src/renderer/src/screens/Skills/Skills.module.css`

### Modify
- `src/renderer/src/screens/Skills/Skills.tsx` — CSS module import, try/catch on IPC, keyboard a11y
- `src/shared/i18n/locales/en/skills.ts` — add `contentUnavailable` key
- `src/renderer/src/assets/main.css` — remove skills-scoped classes (per audit result)

### Do Not Touch
- `src/preload/index.ts` — IPC bindings already present
- `App.tsx`, `Sidebar.tsx` — no router changes in this task

---

## 2. Skills.module.css — Full Spec

Create `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/screens/Skills/Skills.module.css`.

This file owns **all** styles that are specific to the Skills screen. Global utilities (`btn`, `btn-ghost`, layout containers, overlay helpers shared by other screens) stay in `main.css`.

### Classes the module MUST define

These map 1-to-1 to the class strings used in `Skills.tsx`. After Step 3, `Skills.tsx` will import this module and reference these as `styles.<name>` — the compiled output produces scoped class names.

```css
/* Skills.module.css */

.skillsContainer {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--spacing-md, 1rem);
  gap: var(--spacing-md, 1rem);
}

.skillsHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm, 0.5rem);
  flex-shrink: 0;
}

.skillsTitle {
  font-size: var(--font-size-xl, 1.25rem);
  font-weight: 600;
  color: var(--color-text-primary, #e2e8f0);
  margin: 0;
}

.skillsSearch {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 0.25rem);
  flex: 1;
  max-width: 320px;
}

.skillsSearchInput {
  flex: 1;
  background: var(--color-surface-2, #1e2a3a);
  border: 1px solid var(--color-border, #334155);
  border-radius: var(--radius-sm, 4px);
  color: var(--color-text-primary, #e2e8f0);
  font-size: var(--font-size-sm, 0.875rem);
  padding: 0.375rem 0.625rem;
  outline: none;
}

.skillsSearchInput:focus {
  border-color: var(--color-accent, #38bdf8);
  box-shadow: 0 0 0 2px var(--color-accent-alpha, rgba(56, 189, 248, 0.2));
}

.skillsSearchClear {
  background: none;
  border: none;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-xs, 2px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.skillsSearchClear:hover {
  color: var(--color-text-primary, #e2e8f0);
}

.skillsSearchClear:focus-visible {
  outline: 2px solid var(--color-accent, #38bdf8);
  outline-offset: 2px;
}

.skillsTabs {
  display: flex;
  gap: var(--spacing-xs, 0.25rem);
  border-bottom: 1px solid var(--color-border, #334155);
  flex-shrink: 0;
}

.skillsTab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  font-size: var(--font-size-sm, 0.875rem);
  padding: 0.5rem 0.875rem;
  margin-bottom: -1px;
  transition: color 150ms, border-color 150ms;
}

.skillsTab:hover {
  color: var(--color-text-primary, #e2e8f0);
}

.skillsTab:focus-visible {
  outline: 2px solid var(--color-accent, #38bdf8);
  outline-offset: 2px;
}

.skillsTabActive {
  border-bottom-color: var(--color-accent, #38bdf8);
  color: var(--color-text-primary, #e2e8f0);
}

.skillsCategoryFilter {
  display: flex;
  gap: var(--spacing-xs, 0.25rem);
  flex-wrap: wrap;
  flex-shrink: 0;
}

.skillsCategoryBtn {
  background: var(--color-surface-2, #1e2a3a);
  border: 1px solid var(--color-border, #334155);
  border-radius: var(--radius-full, 9999px);
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  font-size: var(--font-size-xs, 0.75rem);
  padding: 0.25rem 0.75rem;
  transition: all 150ms;
}

.skillsCategoryBtn:hover {
  border-color: var(--color-accent, #38bdf8);
  color: var(--color-text-primary, #e2e8f0);
}

.skillsCategoryBtn:focus-visible {
  outline: 2px solid var(--color-accent, #38bdf8);
  outline-offset: 2px;
}

.skillsCategoryBtnActive {
  background: var(--color-accent, #38bdf8);
  border-color: var(--color-accent, #38bdf8);
  color: var(--color-surface-1, #0f172a);
}

.skillsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--spacing-md, 1rem);
  overflow-y: auto;
  flex: 1;
}

.skillsCard {
  background: var(--color-surface-2, #1e2a3a);
  border: 1px solid var(--color-border, #334155);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs, 0.25rem);
  padding: var(--spacing-md, 1rem);
  transition: border-color 150ms, box-shadow 150ms;
  text-align: left;
}

.skillsCard:hover {
  border-color: var(--color-accent, #38bdf8);
  box-shadow: 0 0 0 1px var(--color-accent, #38bdf8);
}

.skillsCard:focus-visible {
  outline: 2px solid var(--color-accent, #38bdf8);
  outline-offset: 2px;
}

.skillsCardInstalled {
  border-color: var(--color-success, #22c55e);
}

.skillsCardName {
  font-size: var(--font-size-sm, 0.875rem);
  font-weight: 600;
  color: var(--color-text-primary, #e2e8f0);
  margin: 0;
}

.skillsCardCategory {
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--color-accent, #38bdf8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.skillsCardDesc {
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--color-text-muted, #64748b);
  margin: 0;
  line-height: 1.5;
}

.skillsEmpty {
  grid-column: 1 / -1;
  text-align: center;
  padding: var(--spacing-xl, 2rem);
  color: var(--color-text-muted, #64748b);
  font-size: var(--font-size-sm, 0.875rem);
}

.skillsLoading {
  grid-column: 1 / -1;
  text-align: center;
  padding: var(--spacing-xl, 2rem);
  color: var(--color-text-muted, #64748b);
}

@keyframes skillsSpinLocal {
  to { transform: rotate(360deg); }
}

.skillsLoadingSpinner {
  animation: skillsSpinLocal 0.8s linear infinite;
  display: inline-block;
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--color-border, #334155);
  border-top-color: var(--color-accent, #38bdf8);
  border-radius: 50%;
}

/* Detail overlay — Skills-private. skills-detail-overlay in main.css is
   shared by Schedules and Kanban; that global rule stays. This scoped
   version handles layout internal to Skills only. */
.skillsDetailPanel {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.skillsDetailContent {
  background: var(--color-surface-1, #0f172a);
  border: 1px solid var(--color-border, #334155);
  border-radius: var(--radius-lg, 12px);
  max-height: 80vh;
  max-width: 640px;
  overflow-y: auto;
  padding: var(--spacing-lg, 1.5rem);
  width: 90%;
}

.skillsDetailHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-sm, 0.5rem);
  margin-bottom: var(--spacing-md, 1rem);
}

.skillsDetailTitle {
  font-size: var(--font-size-lg, 1.125rem);
  font-weight: 600;
  color: var(--color-text-primary, #e2e8f0);
  margin: 0;
}

.skillsDetailClose {
  background: none;
  border: none;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  font-size: 1.25rem;
  padding: 0.25rem;
  line-height: 1;
  border-radius: var(--radius-xs, 2px);
}

.skillsDetailClose:hover {
  color: var(--color-text-primary, #e2e8f0);
}

.skillsDetailClose:focus-visible {
  outline: 2px solid var(--color-accent, #38bdf8);
  outline-offset: 2px;
}

.skillsDetailBody {
  color: var(--color-text-secondary, #94a3b8);
  font-size: var(--font-size-sm, 0.875rem);
  line-height: 1.6;
  white-space: pre-wrap;
}

.skillsError {
  padding: var(--spacing-md, 1rem);
  color: var(--color-error, #f87171);
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: var(--radius-sm, 4px);
  font-size: var(--font-size-sm, 0.875rem);
}
```

### Classes explicitly NOT in this module (stay global in main.css)

- `btn`, `btn-ghost`, `btn-primary`, `btn-sm` — global button utilities
- `skills-detail-overlay` — shared by Schedules.tsx and Kanban.tsx (confirmed by grep audit)
- `skills-error` (the global variant) — if grep confirms other screens use it, keep in main.css alongside the scoped `.skillsError` above

---

## 3. Skills.tsx — Required Changes

`Skills.tsx` requires three surgical edits. The component logic is not restructured.

### 3a. Add CSS module import

At the top of the file, after existing imports:

```typescript
import styles from './Skills.module.css'
```

### 3b. Replace global class strings with module references

Every `className="skills-*"` attribute becomes `className={styles.skillsName}` using camelCase. The mapping is direct — `skills-container` → `styles.skillsContainer`, `skills-tab-active` → `styles.skillsTabActive`, etc. Combined classes use template literals or `clsx`:

```typescript
// Example — tab button
className={`${styles.skillsTab} ${activeTab === 'installed' ? styles.skillsTabActive : ''}`}

// Example — installed card
className={`${styles.skillsCard} ${skill.installed ? styles.skillsCardInstalled : ''}`}
```

If `clsx` is already a dependency, prefer it. If not, template literals are sufficient — do not add a new dependency for this.

### 3c. IPC error handling in handleViewDetail

The current implementation has no error boundary around the `getSkillContent` call. If the IPC channel throws, the component crashes silently. Replace the existing `handleViewDetail` body:

```typescript
const handleViewDetail = async (skill: BundledSkill | InstalledSkill) => {
  setDetailSkill(skill)
  if ('path' in skill) {
    try {
      const content = await window.api.getSkillContent(skill.path)
      setDetailContent(content)
    } catch {
      setDetailContent(t('skills.contentUnavailable'))
    }
  }
}
```

### 3d. Keyboard accessibility

**Skill cards** — add `onKeyDown` and `role` to each card element:

```typescript
<div
  role="button"
  tabIndex={0}
  className={styles.skillsCard}
  onClick={() => handleViewDetail(skill)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleViewDetail(skill)
    }
  }}
  aria-label={`${skill.name}, ${skill.category}`}
>
```

**Search clear button** — add `aria-label`:

```typescript
<button
  className={styles.skillsSearchClear}
  onClick={() => setSearch('')}
  aria-label={t('skills.clearSearch')}
>
```

**Detail overlay** — add `role`, `aria-modal`, `aria-labelledby`, Escape handler, and focus management:

```typescript
// State for focus return
const triggerRef = useRef<HTMLElement | null>(null)
const detailRef = useRef<HTMLDivElement>(null)

// Modified handleViewDetail — capture trigger ref and focus panel
const handleViewDetail = async (skill: BundledSkill | InstalledSkill, trigger: HTMLElement) => {
  triggerRef.current = trigger
  setDetailSkill(skill)
  // focus the panel after render
  setTimeout(() => detailRef.current?.focus(), 0)
  if ('path' in skill) {
    try {
      const content = await window.api.getSkillContent(skill.path)
      setDetailContent(content)
    } catch {
      setDetailContent(t('skills.contentUnavailable'))
    }
  }
}

const closeDetail = () => {
  setDetailSkill(null)
  setDetailContent(null)
  triggerRef.current?.focus()
}

// In the overlay JSX:
<div
  className={styles.skillsDetailPanel}
  role="dialog"
  aria-modal="true"
  aria-labelledby="skills-detail-title"
  onKeyDown={(e) => { if (e.key === 'Escape') closeDetail() }}
  onClick={(e) => { if (e.target === e.currentTarget) closeDetail() }}
>
  <div
    className={styles.skillsDetailContent}
    ref={detailRef}
    tabIndex={-1}
  >
    <div className={styles.skillsDetailHeader}>
      <h2 id="skills-detail-title" className={styles.skillsDetailTitle}>
        {detailSkill.name}
      </h2>
      <button
        className={styles.skillsDetailClose}
        onClick={closeDetail}
        aria-label={t('skills.closeDetail')}
      >
        ×
      </button>
    </div>
    ...
  </div>
</div>
```

Update every card's `onClick` and `onKeyDown` to pass the event's `currentTarget` as the trigger:

```typescript
onClick={(e) => handleViewDetail(skill, e.currentTarget as HTMLElement)}
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    handleViewDetail(skill, e.currentTarget as HTMLElement)
  }
}}
```

### 3e. Category filter acknowledgment (no code change needed)

`categoryFilter` is intentionally applied only to the Browse tab. The Installed tab filters by search string only. This is correct behavior — categories are a Browse-only concept. Add a one-line comment in the component above the `filteredInstalled` derivation:

```typescript
// categoryFilter intentionally not applied here — categories are Browse-only
const filteredInstalled = installedSkills.filter(...)
```

---

## 4. i18n Locale Update

File: `src/shared/i18n/locales/en/skills.ts`

Add the following keys. Do not remove any existing keys.

```typescript
// Add to the existing skills namespace object:
contentUnavailable: 'Skill content could not be loaded.',
clearSearch: 'Clear search',
closeDetail: 'Close detail panel',
```

Verify the TypeScript interface for the skills namespace accepts these keys. If the namespace is typed via a generated type, run `typecheck:web` after this step before proceeding.

---

## 5. main.css Cleanup

### Protocol

1. Run the pre-flight grep from Step 0.
2. For each `skills-*` class found in `main.css`, check whether any file **other than `Skills.tsx`** references it.
3. Apply the following per-class decision:

| Class | Decision | Reason |
|---|---|---|
| `skills-detail-overlay` | KEEP in main.css | Used by Schedules.tsx and Kanban.tsx (known shared utility) |
| `skills-error` (global) | CHECK grep — if other files reference it, KEEP; otherwise REMOVE | Shared status unknown until audit |
| All other `skills-*` classes | REMOVE if only Skills.tsx references them | Now scoped in module |

4. After removal, re-run `npm run typecheck:web` to confirm no type errors were introduced.

### What "remove" means

Delete the entire CSS rule block for the class from `main.css`. Do not leave empty selectors or comments pointing at the module — that creates confusion. The module is authoritative for its classes.

---

## 6. Acceptance Criteria

All five must pass before this task is closed.

1. **Typecheck:** `npm run typecheck:web` exits 0.

2. **Module consumed:** `Skills.tsx` imports `styles from './Skills.module.css'` and all `className` attributes on Skills-owned elements reference `styles.*` — zero bare `"skills-*"` string literals remain in `Skills.tsx`.

3. **IPC safety:** `handleViewDetail` wraps `getSkillContent` in try/catch and displays `t('skills.contentUnavailable')` on failure. The component does not crash on IPC error.

4. **Keyboard accessible:**
   - Skill cards have `role="button"`, `tabIndex={0}`, `onKeyDown` for Enter/Space.
   - Search clear button has `aria-label`.
   - Detail overlay has `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, Escape key closes it, focus returns to the triggering card on close.

5. **main.css audit complete:** grep output was reviewed, per-class keep/remove decision was applied, `skills-detail-overlay` was NOT removed (shared by other screens).

---

## 7. Routing Note (Intentional Deferral)

Skills is not registered as a top-level screen. `App.tsx`'s `Screen` type is `'splash'|'welcome'|'installing'|'setup'|'main'` — there is no `'skills'` variant. Skills is intended to be surfaced from within the `'main'` shell (CommandPalette or a sidebar panel). Adding a nav entry in `Sidebar.tsx` or a `renderScreen()` case is a separate task and is explicitly out of scope here.

---

## Critique Trail

### R1 Found

- IPC `handleViewDetail` had no try/catch — silent crash on failure.
- `Skills.module.css` was proposed as a file that is never imported — dead CSS.
- Internal contradiction: section 2 prescribed a Skills.tsx code change, section 3 said no changes needed.
- `skills-detail-overlay` and `skills-error` are used by Schedules.tsx and Kanban.tsx — blind removal from `main.css` would break those screens.
- i18n key `skills.contentUnavailable` referenced but never added to the locale file.
- No keyboard accessibility spec despite WCAG 2.1 SC 2.1.2 failures (cards not keyboard-activatable, overlay not Escape-closeable, focus not managed).
- Plan text truncated — global utility exclusion list was incomplete.
- Acceptance criterion was only `typecheck:web passes`, which was already passing and proves nothing behavioral.

### R2 Confirmed and Added

- Confirmed the CSS module strategy was architecturally incoherent — module file created but never consumed.
- Confirmed `skills-detail-overlay` / `skills-error` shared-usage problem; the main.css removal must be per-class, not block-delete.
- Confirmed i18n key had no locale file path or update instruction.
- Added: `categoryFilter` scope to Browse-only is intentional but undocumented — R2 flagged this as a potential stall point; plan now adds an explicit comment.
- Added: Detail panel close-on-Escape is a WCAG 2.1 SC 2.1.2 failure — plan now specs the full keyboard flow including focus return to trigger element.
- Acceptance criteria upgraded: behavioral criterion added (module must be consumed, IPC safety verified, keyboard paths verified, audit documented).

### This Plan Resolves All Issues By

- Making Skills.tsx explicitly import the module (3a) and migrate all classNames (3b) — module is consumed, not phantom.
- Adding try/catch in `handleViewDetail` (3c) — IPC error handled.
- Adding full keyboard spec (3d) — cards, search clear, overlay Escape, focus return.
- Adding i18n keys to the locale file with exact path (Section 4).
- Using a per-class keep/remove table for main.css (Section 5) — shared classes preserved.
- Five behavioral acceptance criteria that prove the work (Section 6).
- Acknowledging categoryFilter Browse-only scope explicitly (3e).
---

## Gate B Amendment — Applied 2026-05-30

Gate B (build feasibility) found 4 minor TypeScript issues that would fail the first compile. All corrected here before the build agent executes.

### Fix 1: IPC surface is `window.hermesAPI`, not `window.api`
Every code snippet in this plan that references `window.api.getSkillContent` or `window.api.*` must use `window.hermesAPI.*` instead. The preload bridge exports through `hermesAPI`, not `api`. A coding agent must use `window.hermesAPI.skills.list()` and `window.hermesAPI.skills.getDetail(name)`.

### Fix 2: `detailSkill` state type must be widened
The current `detailSkill` state is typed as `InstalledSkill | null`. The plan passes `BundledSkill | InstalledSkill` to the setter. Change the state declaration to:
```tsx
const [detailSkill, setDetailSkill] = useState<BundledSkill | InstalledSkill | null>(null)
```

### Fix 3: Add `skillsDetail` class to Skills.module.css
The current JSX at the detail wrapper uses the class `skills-detail` (line ~147 in Skills.tsx). The CSS module spec was missing a `skillsDetail` class. Add to Skills.module.css:
```css
.skillsDetail {
  /* inner wrapper for the detail content panel */
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md, 1rem);
  overflow-y: auto;
  flex: 1;
}
```
The className migration in Step 3b must include: `styles['skills-detail']` → `styles.skillsDetail`.

### Fix 4: `detailContent` state must be `string | null`
Step 3d calls `setDetailContent(null)` in `closeDetail()`. The existing state is typed as `string`. Change to:
```tsx
const [detailContent, setDetailContent] = useState<string | null>(null)
```
Update any conditional renders from `if (detailContent)` to `if (detailContent !== null)` where needed.

**Gate verdict after amendment: SHIP — proceed to build.**
