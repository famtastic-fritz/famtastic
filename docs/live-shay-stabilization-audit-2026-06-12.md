# Live Shay Stabilization Audit — 2026-06-12

> **Read-only.** No files modified, no config edits, no model switch, no processes stopped, no restart,
> no commits/merges. Live repo audited: `/Users/famtasticfritz/famtastic/shay-shay` (NOT `shay-shay-build`).
> Focused on the four likely weirdness causes from the prior provenance audit. **No fixes applied.**

## Headline (revised from provenance audit)
The single biggest factor is **an in-progress, uncommitted model-switchboard refactor running live** (editable install). The default Codex brain is actually **healthy and authenticated** — only intermittently flaky from upstream "servers overloaded" retries. So the weirdness is mostly **half-finished model-routing changes + a broken experimental provider**, not a dead brain.

---

## Task 1 — Default model / provider configuration
- **Default model:** `gpt-5.4`
- **Provider:** `openai-codex`
- **Base URL:** `https://chatgpt.com/backend-api/codex`
- **Context:** 131072
- **Auth source:** OAuth — **OpenAI Codex ✓ logged in** (`~/.shay/auth.json`, refreshed 2026-06-04). Not an API key (OpenAI API key is *not* set; Codex uses the ChatGPT OAuth login).
- **Points to Codex/OpenAI?** **Yes** — the OpenAI Codex (ChatGPT) backend.

## Task 2 — Is the default brain healthy?
**Yes, it is answering** (verified from logs + `shay status`, no live model probe needed):
- `shay status` → `Model: gpt-5.4 · Provider: OpenAI Codex · OpenAI Codex ✓ logged in`.
- `agent.log` shows successful turns through 2026-06-12 17:39 (e.g. `API call #4 … finish_reason=stop`, 91–99% cache hits, latency 1.8–11.6s) and live context-compression running.
- **Caveat — transient flakiness:** `errors.log` shows intermittent `error=Our servers are currently overloaded. Please try again later.` with automatic retries (06-12 12:50, 13:09×2, 13:49). These are upstream OpenAI overloads, **not** auth failures or a usage cap — they self-recover on retry but can cause occasional stalls/latency.
- **Safe health command used:** `shay status` (read-only component status; does not switch models or call inference). Deeper option *not* run to avoid provider probes: `shay doctor` (checks config + dependencies).

## Task 3 — Malformed `google-antigravity` provider
- **File:** `~/.shay/config.yaml` (lines ~42–46).
- **Block:**
  ```
  google-antigravity:
    name: Google Antigravity (OAuth)
    base_url: https://daily-cloudcode-pa.sandbox.googleapis.com
    auth_provider: google-gemini-cli      # <- bad key
    api_mode: chat_completions
  ```
- **Bad key/value:** `auth_provider: google-gemini-cli`.
- **Why it fails validation:** the provider schema doesn't recognize `auth_provider`, so it's dropped — logged every config load as `providers.google-antigravity: unknown config keys ignored: auth_provider` (seen repeatedly in `errors.log` on 06-12). With the key ignored and **no `key_env`**, the provider has **no usable auth**.
- **Active or just present?** **Present AND referenced** — two model aliases route to it: `sub-ntv-gem-pro31` (`gemini-3.1-pro-preview`) and `sub-oauth-gem-pro3` (`gemini-3-pro-preview`). It is **not** the default brain, so it only fires if one of those Gemini aliases is selected — in which case it would **fail auth**. It also spams the config-load warning regardless.

## Task 4 — Dirty live code (`git status --short`, editable install → live)
```
 M PERSONA.md            (repo copy of identity doc; runtime ~/.shay/PERSONA.md is separate + intact)
 M SOUL.md               (repo copy; runtime intact)
 M shay_cli/commands.py
 M shay_cli/model_switch.py
 M shay_cli/models.py
 M shay_constants.py
 M tools/registry.py
 M shay_shay.egg-info/*   (build metadata)
?? THINKING-LOG.md, model_fix_summary.md, research/, tinker-atropos/,
?? tools/github_obsidian_ingest.py, skills/creative/*, skills/research/*, skills/design-vision-review/
```
Classification (no secrets diffed — these files contain none):

| File | Role | Change |
|---|---|---|
| `shay_cli/model_switch.py` | **model routing** | `target_provider = pdef.slug` → `pdef.id` (a provider-resolution/"slug bug" fix — real routing behavior change) |
| `shay_cli/models.py` | **model routing / catalog** | adds a `custom:poe` brain catalog (Poe API: claude-fable-5, gpt-5.5/5.4, o3, gemini-3.x, grok-4.3, …) |
| `shay_cli/commands.py` | **commands / model picker** | adds `model_autocomplete_aliases` + `restrict_to_preferred` to limit the picker list |
| `shay_constants.py` | **constants** | adds `from __future__ import annotations` (trivial) |
| `tools/registry.py` | **tool registry** | adds `from __future__ import annotations` (trivial) |
| `PERSONA.md` / `SOUL.md` | identity (repo copies) | modified in repo; **runtime ~/.shay copies unchanged since 06-06** |

**Interpretation:** this is an **active model-switchboard refactor** — slug→id routing fix, plus wiring new brains (Poe, Google Antigravity), plus picker UX. It is **live (editable install), uncommitted, and half-finished** (the Antigravity auth was never completed). The untracked `model_fix_summary.md` corroborates deliberate model-system work. The two trivial `__future__` imports are harmless.

## Task 5 — Orphan Hermes gateway
- **PID:** `20003`
- **Command:** `…/python@3.11 …/.hermes/hermes-agent/venv/bin/hermes gateway run`
- **Uptime:** ~**7 days 9 hours**.
- **Files/locks held:** `~/.shay/state.db` (multiple fds: 10u/13u/28u), `state.db-wal`, `state.db-shm`, and `~/.shay/gateway.lock` (fd 15u). The lock *content* names PID 41492 (the live Shay took the lock via `--replace`), but 20003 still holds the file descriptors open.
- **Touching `~/.shay/state.db`?** **Yes — multiple open handles** (a second process on the same SQLite DB + WAL).
- **Owns any active port?** **No.** It is **not** in the listening set; `:8642` is owned by the live Shay (PID 41492). 20003 serves no traffic.
- **Safe to stop later?** **Likely yes** — it's a stale duplicate from the older `~/.hermes` install, serves no port, and was superseded. Risk is only that it has `state.db` open with WAL; **back up `state.db` first**, then stopping it *reduces* risk (removes a second writer / lock-holder on the shared DB).

---

## Likely root-cause ranking (final)
1. **In-progress, uncommitted model-switchboard refactor (live editable code)** — `model_switch.py` routing change + new Poe/Antigravity brains + picker changes, running live and half-finished. Most likely source of behavioral weirdness.
2. **Malformed `google-antigravity` provider** — referenced by 2 Gemini aliases, broken auth, warns every load; fails if those aliases are selected. (Part of the same unfinished refactor.)
3. **Orphan Hermes gateway (PID 20003)** — second process holding `~/.shay/state.db` + lock fds; no port. Latent state contention/corruption risk; possible intermittent state weirdness.
4. **Default brain Codex/`gpt-5.4`** — authenticated and answering; only **transient upstream overloads** cause occasional retries/latency. Working, not broken — lowest cause.

## What can be fixed safely (NOT applied)
- **Repair/remove the `google-antigravity` block** — delete the `auth_provider` line and add a valid `key_env`, OR remove the two `…gem-pro…` aliases that point at it. Stops the warning spam and prevents auth-fail if selected. *(config edit)*
- **Stop the orphan Hermes gateway (PID 20003)** — removes the second `state.db` writer/lock-holder. *(process stop; no port impact)*
- **Resolve the dirty working tree** — review the model-switchboard diff and **commit if intentional** (it reads as a deliberate slug→id fix + brain additions) or **stash if accidental**. Needs human judgment — do **not** blind-revert.
- **(Optional, preference not fix)** If the Codex overloads are disruptive, set the default brain to a stable lane (Z.AI/GLM key is present, or local Ollama). The current default works.

## What needs backup first
- `~/.shay/config.yaml` — before any config edit.
- `~/.shay/state.db` (+ `-wal`, `-shm`) — before stopping PID 20003. *(A 2026-06-09 snapshot exists at `~/shay-backups/pre-cutover-20260609-172840/`; take a fresh one — state has changed since.)*
- The dirty working tree — `git stash` or commit before any restart, so the model-switchboard edits aren't lost.

## Exact recommended next prompt (for applying fixes)
> Apply the Shay stabilization fixes in this order, with backups, on the LIVE repo `~/famtastic/shay-shay` and `~/.shay`:
> 1. Back up first: copy `~/.shay/config.yaml` and `~/.shay/state.db`(+wal/shm) to `~/shay-backups/stabilize-<timestamp>/`; verify `~/.shay/SOUL.md` + `PERSONA.md` present.
> 2. In `~/.shay/config.yaml`, fix the `google-antigravity` provider: remove the invalid `auth_provider:` key and either add a valid `key_env:` or remove the two aliases `sub-ntv-gem-pro31` and `sub-oauth-gem-pro3` that reference it. Show me the diff before saving.
> 3. Review `git -C ~/famtastic/shay-shay diff shay_cli/model_switch.py shay_cli/models.py shay_cli/commands.py` and tell me whether to commit (intentional refactor) or stash (accidental) — do not auto-decide.
> 4. Stop the orphan Hermes gateway PID 20003 (`~/.hermes/hermes-agent`) only after the state.db backup; confirm it's not serving `:8642` first.
> 5. Only then, if needed, restart the live Shay gateway and re-run `shay status` to confirm green. Keep the default brain as-is unless I say otherwise.

## "Do not touch" list
- `/Users/famtasticfritz/famtastic/shay-shay-build` — inert build worktree; NOT live; leave alone.
- `~/.shay/SOUL.md`, `~/.shay/PERSONA.md` — runtime identity; verified intact; do not edit.
- `~/.shay/memories/MEMORY.md`, `~/.shay/memories/USER.md` — live memory; do not edit.
- The live gateway **PID 41492 / `127.0.0.1:8642`** — do not kill; restart only intentionally, after backups.
- `shay_cli/model_switch.py` change — **review, do not blind-revert** (the slug→id fix may be required).
- OpenAI Codex auth (`~/.shay/auth.json`) — valid/logged-in; do not touch.
- `~/.hermes/` install — do not delete; only the *process* (PID 20003) is a stop candidate.

*Audit performed read-only. No remediation applied.*
