# Shay Web Install — Completion Report

**Date:** 2026-06-01
**Scope:** Install upstream hermes-webui v0.51 fresh as Shay Web, configured
to talk to the Shay gateway + Shay data via the existing `hermes_cli` shim.
No upstream code modified.

## Environment

| Item | Value |
|---|---|
| Venv path | `/Users/famtasticfritz/famtastic/shay-environments/shay-web/.venv` |
| Python | 3.11.15 (from `/opt/homebrew/bin/python3.11`) |
| pip | 26.1.2 |
| Webui repo (read-only) | `/Users/famtasticfritz/famtastic/_refs/hermes-webui-v0.51` |
| Bind | `127.0.0.1:8787` |
| Gateway target | `http://127.0.0.1:8642` |
| State dir | `/Users/famtasticfritz/.shay/webui` |
| `HERMES_HOME` | `/Users/famtasticfritz/.shay` |

## pip install results

| Package | Source | Result |
|---|---|---|
| upstream runtime deps | `_refs/hermes-webui-v0.51/requirements.txt` (pyyaml, cryptography) | OK |
| `shay-shay` 0.13.0 | `-e shay-shay/` | OK (large dep tree: anthropic, openai, httpx, pydantic, etc.) |
| `hermes-cli-shim` 0.1.0 | `-e shay-environments/shay-web/hermes-cli-shim/` | OK |

Upstream webui itself is **not** a pip-installable distribution (no
`[build-system]` in its pyproject.toml — pyproject only configures ruff).
It's run directly as `python server.py` from the repo directory. The
`run-shay-web.sh` script handles this by `cd`-ing into the upstream repo
and invoking the venv's python on `server.py`.

Import sanity check after installs:

```
$ .venv/bin/python -c "from hermes_cli import kanban_db; print(kanban_db.__name__)"
hermes_cli.kanban_db
```

## Smoke test

Started via `./run-shay-web.sh` (nohup, backgrounded), probed, stopped:

| Probe | Result | Meaning |
|---|---|---|
| `GET /` | **HTTP 200** | Server bound + serving the SPA shell |
| `GET /health` | **HTTP 200** | Basic health |
| `GET /api/system/health` | **HTTP 200** | API system health |
| `GET /api/health/agent` | **HTTP 200** | Agent-side health (169ms — likely a Shay gateway probe) |
| `GET /api/gateway/status` | **HTTP 200** | Gateway-mode status endpoint live |
| `GET /api/kanban/boards` | **HTTP 200** | **Critical: hermes_cli shim resolves at runtime** — webui's in-process `kanban_bridge.py` successfully imported `hermes_cli.kanban_db` and read from Shay's data |

Startup banner from the server log:
```
repo root   : /Users/famtasticfritz/famtastic/_refs/hermes-webui-v0.51
agent dir   : /Users/famtasticfritz/.shay/hermes-agent  [ok]
state dir   : /Users/famtasticfritz/.shay/webui
host:port   : 127.0.0.1:8787
config file : /Users/famtasticfritz/.shay/config.yaml  (found)
```

Verdict: **PASS**. All six probes returned 200; the hermes_cli shim is
functional at runtime; webui can read Shay's kanban data; gateway-mode is
wired and reachable.

## Open issues / follow-ups

- `HERMES_WEBUI_PASSWORD` is unset (webui emitted `[tip] No password set.
  Any process on this machine can read sessions and memory via the local
  API.`). Acceptable for local-only loopback; revisit when remote/Tailscale
  access is enabled. Tracked alongside the parallel `SHAY_DASHBOARD_TOKEN`
  work.
- Webui banner reports `agent dir : ~/.shay/hermes-agent [ok]` — there's
  a vestigial hermes-agent dir under `~/.shay`. Did not investigate
  whether it's stale; gateway-mode chat shouldn't depend on it. Worth a
  cleanup audit later but not blocking.
- Did not POST `/api/chat/start` to round-trip a real prompt through the
  gateway. All HTTP-level wiring proves out; the next session can drive
  the UI end-to-end and verify token streaming from Shay's gateway.

## Files created

- `shay-environments/shay-web/.env` *(not committed — contains config values
  acceptable to share but kept out of git by policy)*
- `shay-environments/shay-web/.env.example` *(committed)*
- `shay-environments/shay-web/run-shay-web.sh` *(committed)*
- `shay-environments/shay-web/README.md` *(committed)*
- `shay-environments/shay-web/.venv/` *(gitignored — pip-managed venv)*

## What didn't work / surprises

Nothing failed. One assumption from the task prompt needed adjustment:
upstream webui has **no** `[build-system]` in its pyproject.toml, so
`pip install -e _refs/hermes-webui-v0.51` is not a valid install path.
Instead, the runtime deps (pyyaml, cryptography) were installed from
`requirements.txt`, and `server.py` is executed in-place from the read-only
repo dir by the boot script — which matches how upstream `start.sh` /
`bootstrap.py` would invoke it. No upstream changes required.
