# Odysseus — write-up & capability map

> Source: https://github.com/pewdiepie-archdaemon/odysseus (Pages demo:
> https://pewdiepie-archdaemon.github.io/odysseus/). Captured 2026-06-02.
> Scope decision for this session: **Odysseus only, deep.** The other eight
> tools from the HexSec carousel are listed once at the bottom for the record.

## What it is, in one breath

Odysseus is a **self-hosted AI workspace** — the thing you reach for instead of
the ChatGPT/Claude web UI, except it runs on *your* hardware with *your* data.
Local-first, privacy-first, "with more jank and fun." One web app (FastAPI +
uvicorn) that bundles a chat client, an autonomous agent, a deep-research
engine, a model "cookbook," a document editor, persistent memory/skills, email
triage, notes/tasks, and a calendar. Runs at `http://127.0.0.1:7860` (native
Apple Silicon) or `:7000` (Docker).

## Why it matters for FAMtastic

It is, functionally, **a self-hosted sibling to the FAMtastic Studio + Shay
stack** — and that's exactly why it's worth running:

- **A private fallback brain.** Everything FAMtastic leans on cloud APIs for
  (chat, research, agentic runs) has a local mirror here. If an API is down,
  rate-limited, or you're working on something you don't want leaving the box,
  Odysseus covers it.
- **The same primitives we already value.** Persistent **memory + skills**
  (ChromaDB + fastembed), an **agent built on opencode** with MCP/web/files/
  shell/skills, and **deep research** (adapted from Tongyi DeepResearch). These
  map almost 1:1 onto our brain (obsidian/.wolf), our skill catalog, and the
  `deep-research` skill. Lessons and skills can flow both directions.
- **Local model serving via Cookbook.** It scans your hardware, scores models
  by VRAM fit, downloads GGUF/FP8/AWQ, and serves via vLLM/llama.cpp/Ollama.
  That's a real on-ramp to running FAMtastic builds against local models when
  you want zero marginal cost.
- **Ops surface we don't have natively.** Email triage (IMAP/SMTP), a CalDAV
  calendar, and cron-style agent-actionable tasks — useful for the acquisition/
  client-ops side (cf. the `business-landing-setup` cold-acquisition kit).

## Capability map

| Capability | What it does | FAMtastic analogue |
|---|---|---|
| **Chat** | Talk to any local model or API; trivial to add providers (vLLM, llama.cpp, Ollama, OpenRouter, OpenAI) | Studio chat / Shay chat |
| **Agent** | Hand it tools, it runs the whole task — built on **opencode**, MCP, web, files, shell, skills, memory | Shay swarm / Claude subagents |
| **Cookbook** | Scans hardware, recommends models by VRAM fit, one-click download + serve (built on `llmfit`) | *(new — no analogue)* local model serving |
| **Deep Research** | Multi-step gather→read→synthesize into a visual report (adapted from Tongyi DeepResearch) | `deep-research` skill |
| **Compare** | Blind side-by-side multi-model comparison + synthesis | *(new)* model eval |
| **Documents** | Multi-tab editor (markdown/HTML/CSV), syntax highlighting, AI edits/suggestions — you write, AI assists | Studio document flows |
| **Memory / Skills** | Persistent vector + keyword memory (ChromaDB, fastembed ONNX), import/export; agent evolves over time | `.wolf/` + obsidian brain + skills |
| **Email** | IMAP/SMTP inbox with AI triage: urgency, auto-tag, summary, reply drafts, spam | *(new)* ops |
| **Notes & Tasks** | Notes w/ reminders, todo list, cron-style agent-actionable tasks (ntfy/browser/email) | plans/ + kanban |
| **Calendar** | Local-first CalDAV sync (Radicale/Nextcloud/Apple/Fastmail), .ics import/export | *(new)* ops |
| **Extras** | Image editor, theme editor, vision+PDF uploads, web search, presets, sessions, **2FA**, PWA/mobile | scattered |

## Install (your Mac)

Apple Silicon, native (GPU-capable Cookbook):

```bash
bash ~/famtastic/scripts/odysseus/install-odysseus.sh          # clone/update + setup
bash ~/famtastic/scripts/odysseus/install-odysseus.sh --start  # …and launch it
```

Then open `http://127.0.0.1:7860`, grab the temp admin password from the
terminal, log in, change it, and add a model in **Settings**. Full options
(Docker, LAN/Tailscale, app wrapper) are in `scripts/odysseus/README.md`.

## Security posture (important — this came from a pentest community feed)

- Odysseus itself is **benign**: a self-hosted workspace, explicitly local-first
  with `AUTH_ENABLED=true` by default and loopback binding. The installer keeps
  it on `127.0.0.1` unless you opt into `ODYSSEUS_LAN=1`.
- **Do not expose port 7860/7000 to the public internet.** LAN access only over
  a trusted VPN (Tailscale), auth on.
- First-run prints a temporary admin password — rotate it immediately.
- The agent has **shell** access by design. Treat its tool permissions like you
  treat Claude Code's: scope what it can run.

## The other eight (recorded, not installed — per scope decision)

These came from the same "HexSec Community" carousel. Most are **hosted SaaS**,
not installable repos. Offensive/dual-use; sign-up tools, documented here only:

1. **HackerGPT Lite** — `hackergpt.app` — web AI for OSINT/recon (SaaS).
2. **HackerAI** — `hackerai.co` — AI pentest assistant suite (SaaS, paid tiers).
3. **AgentGPT** — `agentgpt.reworkd.ai` — browser autonomous-agent experiment; **is** OSS (reworkd/AgentGPT) if ever wanted.
4. **WormGPT-style / item 4** — (carousel slide 5 not captured).
5. **AnyRun + AI Analysis** — `app.any.run` — interactive malware sandbox w/ AI explainer (SaaS).
6. **Anthropic Claude** — `claude.ai` — already in this stack.
7. **Betterscan.io AI Code Analyzer** — via `yeschat.ai` GPT; Betterscan-CE **is** OSS (static analysis/SAST) if ever wanted.
8. **(slide 9 not captured).**

If you later want AgentGPT or Betterscan-CE actually installed, say so — both are
real repos and benign-to-defensive; I'd wire them like Odysseus.
