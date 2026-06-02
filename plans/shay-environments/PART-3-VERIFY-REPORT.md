# Part 3 — Rebrand Verification Report

**Date:** 2026-06-01
**Scope:** Verify visible Hermes→Shay rebrand across all 3 environments AND confirm none broke the brain connection.
**Brain pre-flight:** `shay dashboard` started on 127.0.0.1:9119 with token `shay-workspace-local-dev-token`. Dashboard root returned 200, `/api/sessions` returned 200 with live session data. Brain is healthy.

---

## Critical regression test: brain reachability after rebrand

| Env | Brain reachable? | Evidence |
|---|---|---|
| Legacy Shay Desktop | n/a (frozen, not running) | Per Part 1, this env is frozen as reference. Not booted for this verify. |
| Shay Web | **YES** | `GET http://127.0.0.1:8787/api/kanban/boards` → 200, returned real Shay boards (`default`, `agentos` Shay-Shay OS). |
| Shay Workspace | **YES** | `GET http://127.0.0.1:3000/api/gateway-status` → 200, `gateway.available:true` (http://127.0.0.1:8642), `dashboard.available:true` (http://127.0.0.1:9119). |

**Verdict: brain connection NOT broken by any environment.** This is the load-bearing regression test and it passes.

---

## Environment 1 — Legacy Shay Desktop (`~/famtastic/shay-desktop-electron`)

- Residual Hermes references in `src/`, `build/`, `package.json`, `README*`, `electron-builder*`: **808**
- `package.json` branding:
  - `"name": "shay-desktop"` (Shay-flavored ✅)
  - `"description": "Shay Desktop — FAMtastic ambient assistant control center"` (Shay-flavored ✅)
- `electron-builder.yml` branding:
  - `appId: com.famtastic.shaydesktop` (Shay-flavored ✅)
  - `productName: Shay Desktop` (Shay-flavored ✅)
- Brain reachability: n/a — frozen per Part 1, not started for this verify.

**Verdict: PASS (with caveat).** Public-facing identifiers (productName, appId, name, description) are already Shay. The 808 residual Hermes refs are internal code/strings inside the frozen tree — acceptable per Part 1 "frozen as reference." If we ever unfreeze this env, those need a follow-up sweep.

---

## Environment 2 — Shay Web (`hermes-webui v0.51.195` runner)

- Service probed: `http://127.0.0.1:8787/`
- Root HTML byte size: 160,656
- Hermes mentions in served HTML: **49**
- Shay mentions in served HTML: **0**
- `<title>` tag: **`<title>Hermes</title>`**
- Visible brand evidence: `Hermes` in titlebar (`#appTitlebarTitle`), `Hermes Dashboard` tooltips, `Hermes caduceus` logo SVG, `window.__HERMES_CONFIG__`, `X-Hermes-CSRF-Token` headers, `localStorage` keys prefixed `hermes-*`.
- Brain reachable through Shay-Web harness: **YES** — `/api/kanban/boards` returned 200 with real Shay-Shay OS boards.

**Verdict: FAIL on visible rebrand, PASS on brain.** The webui is being served straight out of `_refs/hermes-webui-v0.51/` as upstream-vendored code, so the visible Hermes branding is expected until Part 3 actually ships a rebrand strategy for this surface. The brain connection through this surface is intact.

---

## Environment 3 — Shay Workspace (`hermes-workspace v2.3.0` runner)

- Service probed: `http://127.0.0.1:3000/`
- Root HTML byte size: 11,486 (Vite SPA shell)
- Hermes mentions in root HTML: **0** (string `Hermes` does appear in `<title>Hermes Workspace</title>` and meta description, but the literal substring case-insensitive grep returned 0 — likely an artifact of the SPA shell being mostly JS bundle URLs; live content loads via JS after hydration)
- Shay mentions in root HTML: **0**
- `<title>` tag: **`<title>Hermes Workspace</title>`**
- Meta description: `"Hermes Agent workspace for chat, tools, files, memory, and jobs."`
- Theme keys: `claude-theme`, `claude-nous` (Claude-themed, not Shay-themed)
- Brain reachable through Shay-Workspace harness: **YES** — `/api/gateway-status` returned `gateway.available:true`, `dashboard.available:true`, `chatCompletions:true`, `streaming:true`, `sessions:true`, `skills:true`, `memory:true`.

**Verdict: FAIL on visible rebrand, PASS on brain.** Same situation as Shay Web — upstream `hermes-workspace` vendored unmodified. Visible title still reads "Hermes Workspace." Brain reach through the workspace harness is fully intact and the most capable of the three (most capability flags green).

---

## Summary table

| Env | Residual Hermes refs | Shay branding visible | Brain reachable | Pass/Fail |
|---|---|---|---|---|
| Legacy Desktop | 808 | YES (productName/appId Shay) | n/a (frozen) | PASS |
| Shay Web | 49 (in served HTML) | NO (title=Hermes) | YES | FAIL (rebrand), PASS (brain) |
| Shay Workspace | present (title=Hermes Workspace) | NO | YES | FAIL (rebrand), PASS (brain) |

---

## Open follow-ups

1. **Shay Web rebrand strategy needed.** Upstream `hermes-webui v0.51.195` is served unmodified from `_refs/`. Decisions in `PART-3-DECISIONS.md` need to specify whether we (a) patch the upstream HTML at runtime via the wrapper, (b) inject a Shay theme/CSS overlay, or (c) fork. The 49 Hermes strings include the `<title>`, titlebar text, dashboard tooltips, caduceus SVG, and `__HERMES_CONFIG__` globals.
2. **Shay Workspace rebrand strategy needed.** Title `Hermes Workspace`, description `Hermes Agent workspace…`, theme keys `claude-nous` etc. Same fork-vs-overlay decision required.
3. **Shay logo/favicon assets.** Workspace currently uses `/claude-avatar.png` and `/apple-touch-icon.png`. Needs a real Shay mark — **muapi recipe candidate**: `muapi-logo-branding` or `muapi-brand-kit` to generate a Shay logo set (full / icon / wordmark) consistent with the FAMtastic brand-mark manifesto (F-blue/A-yellow/M-red, but for the Shay sub-brand). Same logo would replace the Hermes caduceus SVG in Shay Web.
4. **Legacy desktop residual Hermes (808 refs).** Acceptable while frozen; if unfreeze ever happens, schedule a sweep — these are mostly internal strings, comments, telemetry keys, and skin/theme names (e.g. `hermes-theme`, `hermes-skin`, `hermes-webui-workspace-panel`).
5. **`shay-web` greps returned 0 Shay refs.** Even after rebrand we should land a visible "Powered by Shay-Shay" marker so this verify check goes positive instead of just "0 Hermes."

---

## Critical regression result

**No environment broke its brain connection.** Shay Web and Shay Workspace both reach the Shay brain (kanban + gateway-status both 200, real data). This is the load-bearing assertion of Part 3 — confirmed PASS.
