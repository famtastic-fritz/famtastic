# Live Shay Provenance Audit — 2026-06-12

> **Read-only audit.** No files modified, no commits, no merges, no restarts, no config/memory edits.
> Purpose: determine whether recent weird Shay behavior comes from `shay-platform-build`, live `~/.shay`,
> config, or another installed codebase.

## TL;DR
- The Shay you talk to on `127.0.0.1:8642` is **`~/famtastic/shay-shay`** running as an **editable pip install** (PID 41492). **`shay-shay-build` is NOT live.**
- **Three things changed recently and are the likely cause of weirdness:** (1) the **default brain was swapped to `gpt-5.4` / `openai-codex`** (config rewritten 06-11), (2) the **live code is dirty** — uncommitted hand-edits to the model-switchboard, (3) a **stale orphan Hermes gateway from `~/.hermes/hermes-agent` (PID 20003, up 7+ days)** is still running and holding the same `~/.shay/state.db` open.
- **No experimental memory/recall backend is enabled** — memory provider is still `builtin`. The weirdness is NOT from a new memory system.

---

## Answers to the 10 questions

**1. Which executable runs when I type `shay`?**
`/Users/famtasticfritz/.local/bin/shay` → symlink → `/Users/famtasticfritz/famtastic/shay-shay/.venv/bin/shay`. Its shebang is `#!/Users/famtasticfritz/famtastic/shay-shay/.venv/bin/python3` and it runs `from shay_cli.main import main`. (A second `shay` exists at `/usr/local/bin/shay` but `.local/bin` wins on PATH.)

**2. Which Python package/path is live Shay importing from?**
All from `~/famtastic/shay-shay`:
- `run_agent` → `/Users/famtasticfritz/famtastic/shay-shay/run_agent.py`
- `shay_constants` → `/Users/famtasticfritz/famtastic/shay-shay/shay_constants.py`
- `shay_cli` → `/Users/famtasticfritz/famtastic/shay-shay/shay_cli/__init__.py`
Installed as **editable** (`shay-shay 0.13.0`, `Editable project location: /Users/famtasticfritz/famtastic/shay-shay`, via `__editable__.shay_shay-0.13.0.pth`).

**3. Is live Shay using shay-shay / shay-shay-build / another path?**
- ✅ **`/Users/famtasticfritz/famtastic/shay-shay`** — YES (live; editable install; gateway cwd; gateway.lock argv).
- ❌ `/Users/famtasticfritz/famtastic/shay-shay-build` — NO (inert build worktree; not imported, not running).
- ⚠️ **Another codebase IS running:** `/Users/famtasticfritz/.hermes/hermes-agent` (the upstream Hermes agent, PID 20003, python 3.11) — see §3/§8.

**4. What branch is the live codebase on?**
`shay-shay` → **`main`** (last commit `de06082 fix: image-to-text fallback for text-only brains`). `shay-shay-build` → `shay-platform-build` (not live).

**5. Is the live codebase dirty?**
**YES — significantly.** `~/famtastic/shay-shay` has uncommitted modifications:
- `shay_cli/commands.py`, `shay_cli/model_switch.py`, `shay_cli/models.py`, `shay_constants.py`, `tools/registry.py` (model-switchboard area, ~42 lines changed) — and `PERSONA.md`, `SOUL.md` (repo copies).
- Untracked: `THINKING-LOG.md`, `model_fix_summary.md`, `research/`, several new `skills/`, `tinker-atropos/`, `tools/github_obsidian_ingest.py`.
Because it's an editable install, these edits **are** the live code (after the last restart).

**6. Are any live runtime files modified locally / recently?**
- `~/.shay/config.yaml` — **modified 2026-06-11 14:10** (brain + providers changed).
- `~/.shay/memories/MEMORY.md` — **modified 2026-06-12 13:49**; `USER.md` — **2026-06-12 16:12** (actively changing).
- `~/.shay/SOUL.md` (2026-06-06 17:48) and `PERSONA.md` (2026-06-06 18:02) — **runtime identity files NOT recently changed** (the `M SOUL.md`/`M PERSONA.md` in git are the *repo* copies under `shay-shay/`, different files from the runtime ones).

**7. Is config pointing to a new memory provider / recall backend / experimental feature?**
**No.** `memory.provider: builtin` (line 393); `honcho: {}` empty (429); no vector/experimental recall backend. The memory layer is unchanged.

**8. Is `SHAY_RECALL_BACKEND` or any memory env var set?**
**No.** Live gateway env (PID 41492) exposes only `SHAY_HOME=/Users/famtasticfritz/.shay`. No `SHAY_RECALL_BACKEND`, no memory/recall override. (Shell also has `HERMES_HOME=/Users/famtasticfritz/.shay` — relevant to the orphan Hermes process.)

**9. Is the running gateway old code, new code, or an editable install?**
**Editable install of `shay-shay` @ `main`** (PID 41492, owns `:8642`, gateway.lock argv = `…/shay-shay/shay_cli/main.py gateway run --replace`). It is NOT the `shay-shay-build` rewrite. Because editable + dirty tree, the running code = `main` **plus the uncommitted edits** that were present at its last restart.

**10. (mapped) Likely cause** — see §8 below.

---

## Report

**1. Live executable path:** `~/.local/bin/shay` → `~/famtastic/shay-shay/.venv/bin/shay` (venv python 3.13).

**2. Live import path:** `~/famtastic/shay-shay/` (`run_agent.py`, `shay_constants.py`, `shay_cli/`) via editable install `shay-shay 0.13.0`.

**3. Live repo/worktree:** `~/famtastic/shay-shay` (gateway PID 41492 cwd + lock). A separate **`~/.hermes/hermes-agent`** gateway (PID 20003) is *also* running but does **not** own `:8642`.

**4. Live branch:** `main` (`de06082`). Build worktree on `shay-platform-build` is dormant.

**5. Is `shay-platform-build` actually live? → NO.** Nothing imports or runs it; the running gateway is the `shay-shay` editable install. **The new TS platform is not implicated in the weirdness.**

**6. Did live `~/.shay` files change recently? → YES, partially.**
- config.yaml: 06-11 (brain swapped to `gpt-5.4`/`openai-codex`; providers changed).
- MEMORY.md (06-12) + USER.md (06-12): actively written.
- SOUL.md / PERSONA.md (runtime): unchanged since 06-06 (identity intact at runtime).

**7. Experimental memory/retrieval flags enabled? → NO.** `memory.provider: builtin`; no recall-backend env or config. Not a memory-system regression.

**8. Likely causes of recent weirdness (ranked):**
1. **Default brain changed to `gpt-5.4` via `openai-codex`** (ChatGPT Codex backend; config 06-11). If Codex is rate-limited / not authed, responses degrade or fail. Compounded by a **malformed provider** `google-antigravity` throwing `unknown config keys ignored: auth_provider` on essentially every request (errors.log, 06-12, many times).
2. **Uncommitted live edits to the model-switchboard** (`model_switch.py`, `models.py`, `commands.py`, `tools/registry.py`, `shay_constants.py`) — unreviewed behavior changes running via the editable install (note the untracked `model_fix_summary.md`, consistent with someone repeatedly re-pointing the default brain).
3. **Stale orphan Hermes gateway** — `~/.hermes/hermes-agent` (PID 20003, **up 7+ days**, python 3.11) is still running and holds `~/.shay/state.db`, `gateway.lock`, and `gateway.log` open *alongside* the live Shay gateway (both use `~/.shay`). Even though only PID 41492 owns `:8642`, two agents sharing one SQLite state + lock invites contention / stale writes.
4. **Config/provider churn** — config.yaml was rewritten 06-11; the default-brain and providers shifted; a new `google-antigravity` provider block is malformed.
5. **Security posture (not "weirdness" but worth noting):** `SHAY_REDACT_SECRETS=false` (secret redaction OFF — keys can appear in chat/logs) and the API server has **no auth key** (all requests accepted).

**9. What to check next (no fixes applied):**
- **Brain health:** confirm whether `gpt-5.4`/`openai-codex` is actually answering or erroring (Codex was usage-limited recently). If capped, the default brain should move back to a working lane (e.g. GLM or local Ollama). — *highest-leverage check.*
- **The malformed `google-antigravity` provider** (`auth_provider` key) — remove or fix; it warns on every request.
- **Review the uncommitted model-switchboard edits** (`git -C ~/famtastic/shay-shay diff shay_cli/model_switch.py shay_cli/models.py shay_cli/commands.py`) — decide intentional vs revert; they're unreviewed and live.
- **The orphan `~/.hermes/hermes-agent` gateway (PID 20003)** — confirm whether it's supposed to be running; if not, it should be stopped (two gateways on one `~/.shay` is a latent conflict). *Do not stop without confirmation.*
- **Patch-tool error** at 06-12 16:46 (`Could not find a match for old_string`) — a tool call failed mid-session; check if recurring.
- **Decide on secret redaction + API-server auth** if this gateway is reachable beyond localhost.

---

## Evidence (key facts)
- `:8642` LISTEN → PID **41492** (`shay_cli.main gateway run --replace`, cwd `~/famtastic/shay-shay`).
- `~/.shay/gateway.lock` → `{"pid": 41492, "kind": "shay-gateway", "argv": ["…/shay-shay/shay_cli/main.py","gateway","run","--replace"]}` (lock mtime 06-11 14:47).
- Second gateway: PID **20003**, `…/.hermes/hermes-agent/venv/bin/hermes gateway run`, elapsed **7d 09h**, `~/.shay/state.db` open.
- config.yaml head: `model: { default: gpt-5.4, provider: openai-codex, base_url: https://chatgpt.com/backend-api/codex }`.
- errors.log (06-12, repeating): `providers.google-antigravity: unknown config keys ignored: auth_provider`.
- editable install marker: `…/.venv/lib/python3.13/site-packages/__editable__.shay_shay-0.13.0.pth`.

*Audit performed read-only. No remediation applied.*
