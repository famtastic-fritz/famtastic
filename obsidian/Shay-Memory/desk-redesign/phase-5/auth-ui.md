---
title: auth-ui
type: note
permalink: shay-memory/desk-redesign/phase-5/auth-ui
---

# Phase 5 — auth-ui

**Agent label:** auth-ui
**Date:** 2026-05-30
**Status:** complete

## Files created

Renderer (`src/renderer/src/admin/auth/`):
- `AuthPage.tsx` — SettingsPage that stacks the three panels and floats the
  two dialogs. Registers itself with `registerSettingsPage("auth", …)` +
  `registerSettingsNavEntry({ id: "auth", label: "Authentication", icon:
  "lock", category: "Account", order: 20 })`.
- `CredentialPoolTable.tsx` — provider · label · scope · status · last-used
  table with Re-auth / Sign out actions.
- `AddCredentialDialog.tsx` — three-step stepper (provider → method →
  enter/trigger). Surfaces only the auth methods each provider supports.
- `FallbackChainEditor.tsx` — HTML5 drag-reorderable list of `{provider,
  model}` entries, mirrors `fallback_providers` in `~/.shay/config.yaml`.
- `OAuthLoginDialog.tsx` — generic dialog driving PKCE (browser open + poll),
  device-auth (user-code + poll), and setup-token (textarea + finish).
- `ApiServerKeyPanel.tsx` — Generate / Copy / Rotate with last-4 hint;
  Require-Bearer toggle with restart warning.
- `AuthPage.module.css` — all styling for panels, table, chain editor,
  dialogs, and key panel. No inline `<style>` beyond layout micro-tweaks.
- `index.ts` — barrel + side-effect register.

Services (`src/renderer/src/services/`):
- `auth-service.ts` — typed wrapper with local type mirrors. Prefers
  `window.shayAuthRpc`, falls back to `window.shay.auth`. Every method
  degrades gracefully (empty list / null result) when no bridge is mounted.

Preload (`src/preload/`):
- `auth-domain.ts` — `AuthDomain` extends the base from `main/domains/auth.ts`
  with Phase 5 methods (credential pool, OAuth begin/finish/poll/cancel,
  fallback chain, API_SERVER_KEY admin). `exposeAuthDomain()` mounts
  `window.shayAuthRpc` so the UI does not depend on the Phase 0 namespaced
  surface in `preload/domains.ts` (which is owned by Phase 0 scaffold).

## IPC channels surfaced

The renderer/preload layer invokes the following channels — gateway-side
handlers are expected to be wired by the oauth-helpers agent + Phase 5
backend agent:

- `shay:auth:listCredentials`
- `shay:auth:addCredential`
- `shay:auth:removeCredential`
- `shay:auth:reauthCredential`
- `shay:auth:beginOAuth`
- `shay:auth:finishOAuth`
- `shay:auth:pollOAuth`
- `shay:auth:cancelOAuth`
- `shay:auth:getFallbackChain`
- `shay:auth:setFallbackChain`
- `shay:auth:getApiServerKey`
- `shay:auth:generateApiServerKey`
- `shay:auth:rotateApiServerKey`
- `shay:auth:setRequireBearer`

The Phase 0 channels (`listProviders` / `listAccounts` / `startOAuth` /
`completeOAuth` / `signOut`) still resolve via the inherited base bindings.

## Constraints honored

- Additive only — no edits to `main/domains/auth.ts`,
  `preload/domains.ts`, `main/oauth/spotify-pkce.ts`, `package.json`, or
  any Phase 0–4 module.
- `tsc --noEmit -p tsconfig.web.json` and `… tsconfig.node.json` produce
  no new errors (the lone `i18n/index.ts` TS2742 is pre-existing).
- Settings page registered via the canonical `registerSettingsPage` +
  `registerSettingsNavEntry` pair, matching `Account.tsx`.

## Open dependencies

- `exposeAuthDomain()` in `preload/auth-domain.ts` is exported but is not
  yet called by the preload entry. Adding the call belongs to whichever
  agent owns `src/preload/index.ts` — it is a one-liner
  (`import { exposeAuthDomain } from "./auth-domain"; exposeAuthDomain();`).
  Until that lands, the UI falls back to `window.shay.auth` (Phase 0
  surface) and renders friendly empty states for the new Phase 5 methods.
- Main-process handlers for the new `shay:auth:*` channels are owned by
  the oauth-helpers + backend agents (per the brief). The renderer is
  defensive against missing handlers.