# II-b — Stable Bearer Auth for `shay dashboard`

## File modified
- `shay-shay/shay_cli/web_server.py`
  - Added `_resolve_stable_bearer_token()` helper (just below the
    `_SESSION_TOKEN` / `_SESSION_HEADER_NAME` block around lines 74–90).
    Reads `SHAY_DASHBOARD_TOKEN` first, falls back to `HERMES_DASHBOARD_TOKEN`,
    treats empty/whitespace as unset, returns `(token, source_name)` or
    `(None, None)`.
  - Extended `_has_valid_session_token()` (was ~lines 113–130, now ~113–145):
    after the existing ephemeral-token `hmac.compare_digest` check, also
    constant-time-compares against `f"Bearer {stable_token}"` when one is
    configured. Otherwise returns `False` exactly as before.
  - `start_server()` (around line 4425) now emits a `logging.INFO` line on
    startup announcing which auth mode is active. Token value is never
    logged — only the env var name is mentioned.

Touched only this one file in `shay-shay/`. No new pip dependencies. No
changes to the WebSocket auth path (it uses its own validation and
workspace doesn't talk to the dashboard over WS).

## Test file created
- `shay-shay/tests/shay_cli/test_dashboard_bearer_auth.py` — 11 tests.

Scenarios covered:
1. Ephemeral session token still validates with no env vars set.
2. Arbitrary token rejected when no env vars set.
3. `SHAY_DASHBOARD_TOKEN=abc123` validates `Bearer abc123`.
4. `SHAY_DASHBOARD_TOKEN=abc123` rejects `Bearer wrong`.
5. `HERMES_DASHBOARD_TOKEN=xyz789` (Shay unset) validates `Bearer xyz789`.
6. Both env vars set → `SHAY_DASHBOARD_TOKEN` wins, hermes value rejected.
7. Ephemeral token still works when stable env token is also configured.
8. Empty/whitespace env value treated as unset.
9–11. Direct unit tests on `_resolve_stable_bearer_token()` precedence,
   fallback, and unset behavior.

## Test results

```
$ .venv/bin/pytest tests/shay_cli/test_dashboard_bearer_auth.py -v
============================== 11 passed in 2.70s ==============================
```

Regression sweep of all dashboard-related tests:

```
$ .venv/bin/pytest tests/shay_cli/ -q --no-header -k 'dashboard'
49 passed in 9.60s
```

No regressions.

## CLI smoke test

```
$ SHAY_DASHBOARD_TOKEN=test-stable-token nohup .venv/bin/shay dashboard --no-open …
$ curl -H "Authorization: Bearer test-stable-token" http://127.0.0.1:9119/api/sessions
with stable token: HTTP 200
$ curl -H "Authorization: Bearer nope" http://127.0.0.1:9119/api/sessions
with wrong token:  HTTP 401
```

Both probes hit the expected status codes — stable env-bearer authenticates
against the live dashboard, wrong bearer is rejected with 401 by
`auth_middleware`.

## Commit SHA
`6763909` (in `shay-shay` repo, branch `main`)
