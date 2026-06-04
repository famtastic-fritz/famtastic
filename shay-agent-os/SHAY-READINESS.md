# Shay Readiness — what she needs to be fully functional

> After a reinstall + backup restore, run **`bash shay-agent-os/doctor.sh`** on the
> Mac. It checks every item below and prints ✓/✗ with a fix. This doc explains the
> *why*. Everything here runs on Fritz's Mac — it can't be verified from a cloud
> session.

Shay Agent OS is a Rowboat fork (Electron + React 19). She needs **4 layers** live:

## 1. Core CLIs
- **`shay`** — her gateway CLI (used by `launch-agent.py`: `shay --provider … chat`).
  If missing after reinstall, re-link the binary and check your shell PATH.
- **node / npm / git** — standard toolchain.

## 2. Services (must be running)
- **Redis** — the inter-agent message bus. `redis-cli ping` must return `PONG`.
  Fix: `brew services start redis`. Without it, agents can't talk to each other.
- **Ollama** + 3 worker models — `hermes3` (general), `qwen2.5:1.5b` (fast),
  `phi4-mini` (review). A reinstall can wipe pulled models. Fix:
  `ollama pull hermes3 qwen2.5:1.5b phi4-mini`.

## 3. Runtime home `~/.shay` (this is what the backup restores)
The actual "her" lives here, not in the repo:
- **`SOUL.md`** — persona + governance (A3: SOUL governs persona).
- **gateway** — the always-on service she talks through.
- **skills / kanban / cron** — her capabilities, boards, scheduled jobs.
If the backup didn't restore these, she'll run but be "lobotomized" — no persona,
no boards, no scheduled work. **This is the #1 thing to verify after a restore.**

## 4. Code + brain on `main`
- **Repo on `main`, pulled current.** She runs off `main`. If she's behind, she
  can't see merged work — that's the exact "Claude said / Shay can't find it" bug we
  hit. Fix: `git checkout main && git pull`.
- **Skills present:** `humanize-writing`, `ask-claude`, `gap-analysis`,
  `logo-transparent` (all merged to main now).
- **Brain wiring:** `obsidian/` present, `brain_checkpoint.py` + `session-checkpoint.js`
  so every run leaves a trace.

## 5. Brain model decision (changed!)
Her brain model is now **Gemini Pro** (was `ollama hermes3`). Confirm the Gemini
provider is configured **and keyed** in her provider settings. The local Ollama
models are now worker-lane only. `ask-claude` is wired so she can escalate hard
calls to Claude regardless of brain.

## The 60-second restore sequence
```bash
cd ~/famtastic && git checkout main && git pull        # latest code + brain + skills
brew services start redis                              # message bus
ollama pull hermes3 qwen2.5:1.5b phi4-mini             # worker models (if wiped)
bash shay-agent-os/doctor.sh                           # verify everything green
```
When `doctor.sh` is all ✓, run a smoke agent and confirm a heartbeat lands in
`shay-agent-os/logs/`. Then she's fully back.

## Most likely culprits after *this* restore
1. **`~/.shay` not fully restored** (SOUL/gateway/skills) — verify first.
2. **Repo behind `main`** — we just merged 30+ commits; `git pull`.
3. **Ollama models wiped** — re-pull.
4. **Gemini provider not re-keyed** — re-add the key.
