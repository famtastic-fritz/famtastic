---
title: Shay Desktop — Provider-Surface PRD Addendum (U25–U27)
date: 2026-06-04
author: feasibility-reconciliation
gate: ready-for-ralph
extends: shay-memory/plans/ultimate-desktop-agentos-plan-2026-05-30
tags:
- desktop
- provider-surface
- prd
- ralph-ready
- save-to-shay
---

# Shay Desktop — Provider-Surface PRD Addendum

> **Extends** `ULTIMATE-desktop-agentos-plan-2026-05-30` with three new gated
> build units (U25–U27) that add the **external-AI capture surface** described
> in `docs/SHAY-DESKTOP-FEASIBILITY.md`. These units follow the existing
> per-unit recipe exactly: new screen folder + IPC domain + preload binding +
> router entry + both gates. They assume **decision (A): merge** — the provider
> surface lives inside the existing `shay-desktop-electron` app.
>
> **Governing constraints (non-negotiable, from the feasibility study):**
> - Capture is **user-triggered only**. No autonomous DOM scraping loop, no
>   auto-submit, no UI automation. (ToS bright line — study §1.3.)
> - Each provider gets an **isolated `session` partition** so three logins
>   coexist. (Study §2.2.)
> - **Gemini login** is expected to fail inside an embedded webview
>   (`disallowed_useragent`). U25 ships ChatGPT + Claude; Gemini is gated behind
>   the login-strategy spike in U25's risk row. (Study §1.2, R2.)
> - Use **`WebContentsView`**, never `<webview>` or `<iframe>`. (Study §2.2.)

---

## Current State (delta from ULTIMATE plan)

- The ULTIMATE plan's 24 units (U1–U24) cover the Agent-OS control surface.
- **No provider-webview surface exists.** The only webview in the app is the
  Studio screen wrapping FAMtastic Studio.
- The **CaptureInbox screen (U19)** is the intended destination for captured
  snippets — U26/U27 wire into it. If U19 is not yet built, U27 has a fallback
  (write straight to the Memory domain).
- Reuse targets that already exist: keychain Providers screen (secrets),
  Memory screen + IPC (the capture store), the `surgical_patch` + two-gate
  build harness.

---

## Build Order (appends to U1–U24)

```
U25 → ProviderWindow surface — ChatGPT + Claude as WebContentsView,
       one isolated session partition each; Gemini gated behind login spike
U26 → Save-to-Shay preload — user-triggered selection capture → capture IPC
       (NO autonomous scraping); floating button + global hotkey
U27 → Capture review flow — inbox item → note / task / project / memory,
       with provider + url + title + timestamp provenance
```

Dependency: **U25 → U26 → U27.** U26 depends on U25's partitioned views
existing; U27 depends on U26 emitting capture events. U27 also depends on the
CaptureInbox screen (U19) or falls back to the Memory domain.

---

## Unit Specs

### U25 — ProviderWindow surface

**Goal:** render ChatGPT and Claude as logged-in, isolated webviews inside a new
screen, with a provider switcher. Gemini is scaffolded but disabled pending the
login spike.

**Files**
- `src/renderer/src/screens/ProviderWindow/index.tsx` *(new)* — screen shell:
  provider tab bar (ChatGPT | Claude | Gemini-disabled) + a host container
  element whose bounds are reported to main so the `WebContentsView` can be
  positioned over it.
- `src/main/domains/provider-window.ts` *(new IPC domain)* — owns the
  `WebContentsView` instances and their partitions.
- `src/preload/index.ts` *(surgical_patch)* — expose `window.api.providerWindow.*`.
- router entry *(surgical_patch)* — add `ProviderWindow` to nav (category: Core).

**IPC channels (registered in `provider-window.ts`)**
| Channel | Direction | Purpose |
|---|---|---|
| `providerWindow:list` | renderer→main | returns `[{id, label, partition, enabled}]` |
| `providerWindow:show` | renderer→main | attach/show the view for `{id, bounds}` |
| `providerWindow:hide` | renderer→main | detach the current view |
| `providerWindow:setBounds` | renderer→main | reposition on layout/resize |
| `providerWindow:reload` | renderer→main | reload the active provider |
| `providerWindow:status` | renderer→main | `{id, url, isLoading, partitionReady}` |

**Implementation notes**
- Create one `WebContentsView` per enabled provider, each with
  `webPreferences.partition = 'persist:chatgpt' | 'persist:claude'`. Persistent
  partitions keep logins across restarts.
- Set a **realistic desktop user-agent** on each view's session to reduce
  "unsupported browser" friction; do not spoof to defeat security controls.
- The renderer owns layout; main owns the views. Renderer reports the host
  element's bounds via `setBounds` on mount/resize; main positions the view to
  match. (Standard `WebContentsView` overlay pattern.)
- Gemini entry is present in `providerWindow:list` with `enabled: false` and a
  tooltip explaining the embedded-webview login block until the spike resolves.

**Acceptance checklist (binary)**
- [ ] `npx tsc --noEmit` exits 0
- [ ] App launches; ProviderWindow screen renders host chrome (tab bar + container) without blank/crash/loop within 5s
- [ ] Screen is nav-reachable (not direct-URL only)
- [ ] Switching ChatGPT↔Claude attaches the correct partitioned view; each retains its own cookies (verified by logging into one without affecting the other)
- [ ] No new `any` without an explicit comment; `files_written ≥ 1`

**Modified render gate (important — differs from the standard recipe):**
External provider sites need login + network, so the gate **must not** assert
the *remote page* finished loading. It asserts: (a) host chrome renders, (b) the
`WebContentsView` attaches and its `did-start-loading` fires within 5s, (c) no
renderer crash/loop. Full remote-login is a manual smoke step, not an automated
gate.

**Risks**
| Risk | Likelihood | Mitigation |
|---|---|---|
| **Gemini `disallowed_useragent`** on Google login in embedded webview | High | Ship ChatGPT+Claude in U25; keep Gemini `enabled:false`. Resolve via the system-browser/extension login spike (see §"Gemini login spike") before enabling. |
| Cloudflare/bot-detection challenge on claude.ai / chatgpt.com | Medium | Persistent partition + realistic UA + let the user solve any human-check inline. Do not script around it. |
| `WebContentsView` bounds drift on resize / devtools open | Medium | Single source of truth: renderer pushes `setBounds` on every layout change via ResizeObserver. |
| View leaks if not detached on screen-unmount | Medium | `providerWindow:hide` on unmount; destroy views on app quit. |

---

### U26 — Save-to-Shay preload + capture pipeline

**Goal:** a user can select text in any provider view (or use a hotkey on the
focused message) and capture it to Shay, with full provenance — **no automatic
harvesting**.

**Files**
- `src/main/provider-preload.ts` *(new)* — the preload attached to each
  provider `WebContentsView` (separate from the app's main preload). Adds a
  floating "Save to Shay" button + a keyboard shortcut; on activation, reads
  `window.getSelection()` (or the focused message node's text) and sends it up.
- `src/main/domains/capture.ts` *(new or extend)* — `ipcMain.handle('capture:save', …)`
  persists the snippet.
- `src/preload/index.ts` *(surgical_patch)* — expose `window.api.capture.*` for
  the review UI (U27).
- Wire `provider-preload.ts` into each view's `webPreferences.preload` in
  `provider-window.ts` *(surgical_patch from U25)*.

**Capture payload (the provenance contract)**
```ts
interface ShayCapture {
  id: string;            // uuid
  text: string;          // user-selected text ONLY
  provider: 'chatgpt' | 'claude' | 'gemini';
  url: string;           // sender.getURL()
  pageTitle: string;
  capturedAt: string;    // ISO8601
  source: 'selection' | 'hotkey';
  status: 'inbox';       // promoted later in U27
}
```

**IPC channels**
| Channel | Direction | Purpose |
|---|---|---|
| `capture:save` | provider-preload→main | persist a `ShayCapture` |
| `capture:list` | renderer→main | list inbox captures |
| `capture:get` | renderer→main | fetch one |

**Implementation notes**
- The preload listens for the button click / shortcut, grabs **only** the
  current selection (or focused message text on hotkey). It never walks the full
  conversation DOM and never runs on a timer. This is the ToS bright line made
  concrete.
- `capture:save` writes to SQLite **and** a markdown file in the vault
  (`captures/<date>-<id>.md` with YAML frontmatter) — mirrors the existing
  memory/vault dual-store so captures are portable and git-trackable.
- Provider URL/title come from `event.sender` in main, not from the preload, so
  the renderer can't be tricked into mislabeling provenance.

**Acceptance checklist (binary)**
- [ ] `npx tsc --noEmit` exits 0
- [ ] Selecting text in the ChatGPT or Claude view + clicking "Save to Shay" (or hotkey) creates exactly one capture row with correct `provider`, `url`, `text`
- [ ] A markdown file is written to the vault for that capture
- [ ] Capturing nothing selected is a no-op with a gentle toast (no empty rows)
- [ ] **Negative test:** no captures appear without an explicit user action (confirms no autonomous harvesting)
- [ ] `files_written ≥ 1`; no new `any` without comment

**Risks**
| Risk | Likelihood | Mitigation |
|---|---|---|
| Provider DOM change breaks the focused-message hotkey selector | Medium | Prefer plain `window.getSelection()` (DOM-agnostic) as primary; treat node-targeted hotkey as best-effort, degrade to selection. |
| Preload CSP on provider page blocks injected button | Medium | Inject via the preload's isolated world; if button injection is blocked, fall back to the hotkey + a main-process global shortcut. |
| Capture of sensitive content written in plaintext | Low–Med | Vault lives in the user's app-data dir; document it; offer at-rest encryption as a later toggle. |

---

### U27 — Capture review & promotion flow

**Goal:** an inbox capture becomes a first-class Shay object — note, task,
project item, or memory — keeping provenance.

**Files**
- `src/renderer/src/screens/CaptureInbox/index.tsx` *(extend U19, or create if
  U19 not yet built)* — list of inbox captures with a promote action.
- `src/main/domains/capture.ts` *(extend)* — promotion handlers.
- `src/preload/index.ts` *(surgical_patch)* — `window.api.capture.promote`.

**IPC channels**
| Channel | Direction | Purpose |
|---|---|---|
| `capture:promote` | renderer→main | `{id, target: 'note'|'task'|'project'|'memory', projectId?}` → writes to the matching domain, marks capture `promoted` |
| `capture:dismiss` | renderer→main | mark `dismissed` |

**Implementation notes**
- Promotion routes into the **existing** domains: Memory IPC for `memory`,
  the task/plan ledger for `task`, the project entity for `project`. This is
  pure reuse of the ULTIMATE plan's already-built surfaces — U27 is wiring, not
  new storage.
- Promoted objects retain a `sourceCaptureId` + provider/url so you can always
  trace an idea back to the conversation it came from.

**Acceptance checklist (binary)**
- [ ] `npx tsc --noEmit` exits 0
- [ ] CaptureInbox renders the captures from U26 (not mock data) and is nav-reachable
- [ ] Promoting a capture to `note`/`task`/`memory` creates the object in the correct domain and flips the capture's status
- [ ] Promoted object carries `sourceCaptureId` + provider/url provenance
- [ ] Dismiss removes it from the inbox without deleting the markdown record
- [ ] `files_written ≥ 1`; no new `any` without comment

**Risks**
| Risk | Likelihood | Mitigation |
|---|---|---|
| Target domains expose unstable write interfaces | Medium | Inspect actual exports before wiring (same lesson as the ULTIMATE plan's `swarm.ts` risk); stub + gate on real write in the end-to-end smoke. |
| U19 CaptureInbox not built yet | Medium | U27 creates a minimal inbox if absent; full screen polish defers to U19. |

---

## Gemini login spike (blocks enabling Gemini in U25)

Not a build unit — a **decision spike** to run before flipping Gemini to
`enabled: true`. Pick one:

1. **Browser-extension capture for Gemini only** *(recommended)* — login happens
   in real Chrome; the extension's "Save to Shay" posts to `capture:save` over
   native messaging. Sidesteps `disallowed_useragent` entirely. (Study §6.1.)
2. **System-browser OAuth leg** — open Google login in the default browser,
   import the resulting session cookie into the `persist:gemini` partition.
   Fragile; revisit if Google tightens.
3. **Gemini via API** *(v1.0 path)* — skip the webview for Gemini; use the API
   surface with a BYO key. Costs money but is robust and automatable.

Document the choice in `.wolf/cerebrum.md` so it isn't relitigated.

---

## Project-complete addition (extends ULTIMATE acceptance)

- [ ] ChatGPT and Claude render as isolated, independently-logged-in views
- [ ] "Save to Shay" produces a provenance-complete capture from a user action only
- [ ] An inbox capture promotes into note/task/memory with a traceable source
- [ ] **Negative gate:** zero captures are ever produced without explicit user action
- [ ] Gemini is either enabled (spike resolved) or honestly disabled with a reason in the UI

---

## End-to-end smoke (appends to U24)

Select a sentence in the Claude view → click Save to Shay → see it in
CaptureInbox with `provider: 'claude'` + correct url → promote to a task →
confirm the task appears in the Kanban queue (existing surface) with
`sourceCaptureId` set. One pass = the provider surface is live.
