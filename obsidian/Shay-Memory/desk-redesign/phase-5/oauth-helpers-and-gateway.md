---
title: oauth-helpers-and-gateway
type: note
permalink: shay-memory/desk-redesign/phase-5/oauth-helpers-and-gateway
---

# Phase 5 — oauth-helpers-and-gateway

**Agent label:** `oauth-helpers-and-gateway`
**Date:** 2026-05-30
**Status:** complete (scaffolds only — wiring deferred per Phase 5 plan)

## What landed

### TypeScript OAuth helpers (Desk main process)

1. **`shay-desktop-electron/src/main/oauth/nous-device-auth.ts`**
   - `beginDeviceAuth(options?)` → POSTs to `${NOUS_DEVICE_CODE_URL}` and
     returns `{ device_code, user_code, verification_uri, interval, expires_in }`.
     Opens the verification URL in the system browser via
     `shell.openExternal` (overridable for tests).
   - `pollDeviceAuth(device_code, options?)` → returns the token set on
     success, the literal `"pending"` (covers `authorization_pending` and
     `slow_down`), or `"expired"` (covers `expired_token` /
     `access_denied`). On success persists `nous.access_token` +
     `nous.refresh_token` via `main/keychain.ts`.
   - `persistTokenSet(tokens)` — exposed for side-channel callers (refresh,
     paste).
   - `runDeviceAuth(options?)` — convenience that drives the full flow
     with slow-down back-off and `expires_in` deadline.
   - Env override hooks: `NOUS_DEVICE_CODE_URL`, `NOUS_DEVICE_TOKEN_URL`,
     `NOUS_CLIENT_ID`, `NOUS_SCOPE`.

2. **`shay-desktop-electron/src/main/oauth/anthropic-setup-token.ts`**
   - `validateSetupToken(token)` — structural validation only, no network.
     Classifies into `oauth_access` (sk-ant-oat), `oauth_refresh`
     (sk-ant-ort), `api_key` (sk-ant-api), `claude_code` (cc-), `jwt`
     (eyJ), or `unknown`. Best-effort JWT decode pulls `exp`, `scope`,
     `iss`, `sub`, and infers `hasRefresh`. Rejects empty/short/whitespace
     tokens and already-expired JWTs.
   - `storeSetupToken(token)` — re-runs validation, then persists under
     `anthropic.<type>` via `main/keychain.ts`.
   - `__keychainKeyForType` is exported `@internal` for future test cases.

### Python gateway stubs (FastAPI APIRouter, not yet registered)

3. **`shay-shay/gateway/desk_mcp_routes.py`** — prefix `/v1/desk/mcp`
   - `POST /add`, `DELETE /{server_id}`, `PATCH /{server_id}/configure`,
     `POST /{server_id}/test`, `POST /{server_id}/restart`,
     `GET /{server_id}/tools`, `POST /{server_id}/login`,
     `GET /{server_id}/login/status`, `GET /{server_id}/logs`.
   - Pydantic models: `AddServerBody`, `ConfigureBody`, `TestBody`,
     `LoginBody`.
   - All handlers return `JSONResponse(status_code=501, …)`.

4. **`shay-shay/gateway/desk_logs_routes.py`** — prefix `/v1/desk/logs`
   - `GET /stream` (SSE), `GET /history`, `GET /sources`. 501 stubs.

5. **`shay-shay/gateway/desk_auth_routes.py`** — prefix `/v1/desk/auth`
   - `GET /list`, `POST /add`, `POST /remove`, `POST /refresh`,
     `POST /setActive`, `POST /fallback`, `POST /apiServerKey/generate`,
     `GET /apiServerKey/status`, `POST /oauth/begin`, `POST /oauth/finish`.
   - Pydantic models for every body. All 501 stubs.

Each Python file carries the standard "Not yet registered with gateway
router" top comment + a security-review checklist that names the gating
work Phase 5 wiring must complete (Bearer enforcement, secret redaction,
rate limits, loopback-only binding).

## Patterns followed

- TS helpers mirror `spotify-pkce.ts`: env overrides for endpoints, an
  optional `fetchImpl` for tests, `openExternal` injection, no plaintext
  persistence outside `main/keychain.ts`.
- Python routers mirror `desk_sessions_routes.py`: optional FastAPI +
  Pydantic imports with graceful fallback typing, `_stub_response()`
  helper, `_dump()` alias-aware serializer, eager `router = build_router()`
  at module bottom, `__all__ = ["build_router", "router"]`.

## Verification

- `npx tsc --noEmit` (full project): no errors attributable to
  `nous-device-auth.ts` or `anthropic-setup-token.ts`.
- `python3 -c "import ast; ast.parse(...)"` on all three gateway files:
  clean.

## Deferred / out of scope

- IPC handler registration (`ipcMain.handle('auth:...')`) — owned by the
  `auth-domain` agent in this phase.
- Renderer wiring (Auth page paste-back, Nous prompt UI) — owned by the
  `auth-ui` agent.
- aiohttp adapter (or FastAPI install + mount in `gateway/run.py`) — Phase
  5 wiring after security review.
- Provider-specific token exchange logic inside `finishOAuth` — currently
  501; lands when the Python router is mounted.

## Files created (full list)

- `shay-desktop-electron/src/main/oauth/nous-device-auth.ts`
- `shay-desktop-electron/src/main/oauth/anthropic-setup-token.ts`
- `shay-shay/gateway/desk_mcp_routes.py`
- `shay-shay/gateway/desk_logs_routes.py`
- `shay-shay/gateway/desk_auth_routes.py`