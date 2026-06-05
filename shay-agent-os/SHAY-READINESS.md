# Shay Readiness — what she needs to be fully functional

> **The authority is her own built-in `shay doctor`** (run it on the Mac;
> `shay doctor --fix` auto-fixes what it can). This doc interprets that output and
> prioritizes the fixes. (An earlier version of this file described a
> Rowboat+Ollama+Redis stack — that's the separate **Shay Desktop/Web/Workspace**
> Electron surface in `AGENTS.md`, NOT the `shay` CLI agent. Corrected 2026-06-04
> from a real `shay doctor` run.)

## Her real architecture (from `shay doctor`)
A **Python `shay` CLI agent**: Python 3.13 venv, OpenAI SDK, installed at
`~/.local/bin/shay`, runtime home `~/.shay/` (cron, sessions, logs, skills,
memories, SOUL.md). Brain = a **cloud provider you authenticate** (Gemini / Codex /
Nous / MiniMax / OpenRouter), not a local Ollama model.

## Good news after the restore
The backup restored her cleanly: `~/.shay` intact (SOUL.md, skills, memories, cron
all ✓), CLI installed and symlinked correctly, core tools loaded (browser, terminal,
file, memory, delegation, image_gen, tts, kanban, etc.). She is **structurally
healthy** — `MEMORY.md`/`USER.md`/`state.db` "missing" is normal (created on first
use). She just isn't *authenticated* yet.

## What she actually needs — in priority order

### 🔴 CRITICAL — authenticate a brain provider
`shay doctor` shows **no provider logged in** (Nous, Codex, Gemini, MiniMax all
⚠ not logged in). Without one, she can't think. You said the brain is **Gemini Pro**
— so:
```
shay auth          # log into Google Gemini OAuth (your chosen brain)
# or: shay setup    # guided key/provider configuration
```
This is the single thing standing between "restored" and "functional."

### 🟠 HIGH (this is your research capability) — web-search keys
Her `web` tool is dark: missing `EXA_API_KEY`, `TAVILY_API_KEY`, `FIRECRAWL_API_KEY`,
`PARALLEL_API_KEY`. **This is why she can't do new research right now.** Add at least
one (Tavily has an easy free tier; Firecrawl/Exa also work) via `shay setup` or
`~/.shay/.env`. Restores the research/gap-analysis ability you care about.

### 🟡 NICE-TO-HAVE
- `GITHUB_TOKEN` in `~/.shay/.env` — lifts the 60 req/hr Skills-Hub limit
- `config.yaml` — optional; defaults are fine
- `OPENROUTER_API_KEY` — only if you want the `moa` multi-model tool

### ⚪ SKIP unless you specifically want it
- `tinker-atropos` install — RL/model-training submodule; ignore unless training
- `discord` / `spotify` / `homeassistant` / `vision` / `video` — optional integrations

## The restore-to-functional sequence
```
shay doctor              # see current state
shay auth                # 🔴 authenticate Gemini (the brain)
shay setup               # 🟠 add a web-search key (Tavily/Exa/Firecrawl)
shay doctor --fix        # auto-fix the rest
cd ~/famtastic && git checkout main && git pull   # latest code/brain/skills
```
When `shay doctor` shows the providers ✓ and `web` no longer flags missing keys,
she's fully back — brain online and research restored.
