# FAMtastic Studio — Setup and Configuration

## Last Updated: 2026-04-09T15:41:52.000Z
## Machine: Fitzgeralds-MacBook-Pro.local

> **Disaster recovery document.** If the machine dies, this is everything needed
> to rebuild from scratch. Follow the Quick Start section in order.

---

## Quick Start (New Machine)

```bash
# 1. Install Homebrew (if not present)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Install core tools
brew install node git python uv

# 3. Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# 4. Clone the repo
git clone git@github.com:famtastic-fritz/famtastic.git ~/famtastic
cd ~/famtastic

# 5. Install Studio dependencies
cd site-studio && npm install && cd ..

# 6. Install the fam-hub CLI
chmod +x scripts/fam-hub
ln -sf ~/famtastic/scripts/fam-hub ~/.famtastic-bin/fam-hub
# Add to PATH in ~/.zshrc:
#   export PATH="$HOME/.famtastic-bin:$PATH"

# 7. Set environment variables (add to ~/.zshrc)
export ANTHROPIC_API_KEY="..."      # console.anthropic.com
export GEMINI_API_KEY="..."         # aistudio.google.com
export NETLIFY_AUTH_TOKEN="..."     # app.netlify.com/user/applications
export GITHUB_TOKEN="..."           # github.com/settings/tokens
export PINECONE_API_KEY="..."       # app.pinecone.io
export MAGIC_API_KEY="..."          # 21st.dev/magic

# 8. Install Claude Code plugins (see Plugins section below)
claude plugins install @claude-plugins-official/frontend-design
claude plugins install @claude-plugins-official/feature-dev
claude plugins install @claude-plugins-official/code-review
claude plugins install @claude-plugins-official/commit-commands
claude plugins install @claude-plugins-official/security-guidance
claude plugins install @claude-plugins-official/github
claude plugins install @claude-plugins-official/agent-sdk-dev
claude plugins install @claude-plugins-official/playwright
claude plugins install @paddo-tools/gemini-tools
claude plugins install @openai-codex/codex

# 9. Add MCP servers (see MCP section below)
claude mcp add magic "npx -y @21st-dev/magic@latest" -e MAGIC_API_KEY=$MAGIC_API_KEY
claude mcp add plugin:playwright:playwright "npx @playwright/mcp@latest"
claude mcp add plugin:github:github --transport http https://api.githubcopilot.com/mcp/
claude mcp add famtastic "node mcp-server/server.js" --cwd ~/famtastic
claude mcp add lighthouse-mcp "npx lighthouse-mcp"
claude mcp add ps-mcp "uv run --python /opt/homebrew/bin/python3.13 --with fonttools --with python-socketio --with mcp --with requests --with websocket-client --with numpy --with pillow --refresh ~/famtastic/tools/adb-mcp/mcp/ps-mcp.py"

# 10. Start Studio
fam-hub site start
```

---

## MCP Servers

| Name | Install Command | Purpose | Status |
|------|----------------|---------|--------|
| magic | `npx -y @21st-dev/magic@latest` | UI component generation via 21st.dev | Connected |
| plugin:github:github | `https://api.githubcopilot.com/mcp/` (HTTP) | GitHub API — issues, PRs, repos | Connected |
| plugin:playwright:playwright | `npx @playwright/mcp@latest` | Browser automation + testing | Connected |
| famtastic | `node mcp-server/server.js` | FAMtastic local tools — site state, suggestions | Connected |
| lighthouse-mcp | `npx lighthouse-mcp` | Lighthouse performance audits | Connected |
| ps-mcp | `uv run ... ~/famtastic/tools/adb-mcp/mcp/ps-mcp.py` | Photoshop + Firefly via Adobe | Failed (PS must be open) |
| pr-mcp | `uv run ... ~/famtastic/tools/adb-mcp/mcp/pr-mcp.py` | Premiere Pro via Adobe | Failed (PR must be open) |

**Note:** ps-mcp and pr-mcp require the respective Adobe app to be open. They will show "Failed to connect" otherwise — this is expected.

---

## Claude Code Plugins

| Plugin | Source | Purpose | Status |
|--------|--------|---------|--------|
| frontend-design | claude-plugins-official | UI component generation | Enabled |
| feature-dev | claude-plugins-official | Feature development workflow | Enabled |
| code-review | claude-plugins-official | Code review commands | Enabled |
| commit-commands | claude-plugins-official | Commit helpers | Enabled |
| security-guidance | claude-plugins-official | Security review hooks | Enabled |
| github | claude-plugins-official | GitHub integration | Enabled |
| agent-sdk-dev | claude-plugins-official | Agent SDK development | Enabled |
| playwright | claude-plugins-official | Playwright testing | Enabled |
| gemini-tools | paddo-tools | Gemini visual analysis + image gen | Enabled |
| codex | openai-codex | Codex review commands | Enabled |

---

## Environment Variables Required

| Variable | Purpose | Where to Get | Status |
|----------|---------|-------------|--------|
| ANTHROPIC_API_KEY | Claude API access | console.anthropic.com | Not set |
| GEMINI_API_KEY | Gemini CLI + API | aistudio.google.com | ✅ Set |
| NETLIFY_AUTH_TOKEN | Deploy to Netlify | app.netlify.com/user/applications | Not set |
| GITHUB_TOKEN | GitHub MCP auth | github.com/settings/tokens | Not set |
| PINECONE_API_KEY | Vector DB for research | app.pinecone.io | Not set |
| PERPLEXITY_API_KEY | Research queries | perplexity.ai/settings/api | Not set |
| PIXELPANDA_API_KEY | Image processing | pixelpanda.ai/dashboard | Not set |
| MAGIC_API_KEY | UI component generation (21st.dev) | 21st.dev/magic | Not set |
| GSAP_LICENSE_KEY | GSAP scroll animations | greensock.com/club | Not set |
| GOOGLE_AI_STUDIO_KEY | Imagen + Veo generation | aistudio.google.com | Not set |
| LEONARDO_API_KEY | Alternative image generation | app.leonardo.ai/api-access | Not set |
| SITE_TAG | Override active site at Studio startup | Set in shell | Optional |
| STUDIO_PORT | Studio server port (default 3334) | Set in shell | Optional |
| PREVIEW_PORT | Preview server port (default 3335) | Set in shell | Optional |
| CLAUDE_BIN | Override claude binary path | Set in shell | Optional |

---

## Third-Party Accounts and Subscriptions

| Service | Plan | Monthly Cost | Renewal | Notes |
|---------|------|-------------|---------|-------|
| Claude Code | Max | $100 | Monthly | Primary brain — subscription covers all claude CLI usage |
| Netlify | Free | $0 | — | All sites deployed under fss- naming convention |
| GitHub | Free | $0 | — | famtastic-fritz/famtastic |
| Pinecone | Free | $0 | — | Index: famtastic-intelligence (Phase 4 required) |
| Pixelixe | Paid | $12 | Month 7 cancel decision | Brand assets — evaluation |
| PixelPanda | Credits | $10 loaded | Per use | Image processing — evaluation |
| Perplexity | Credits | $50 loaded | Per use | Research intelligence module |
| Google AI Studio | Credits | $25 loaded | Per use | Imagen + Veo media generation |
| Leonardo.ai | Credits | $5 loaded | Per use | Alternative image generation — evaluation |
| Adobe CC | Included | — | Annual | Firefly via ps-mcp; Photoshop + Premiere |
| GSAP | Commercial | $150 | Annual | Scroll animations (Session 6) |

---

## Pinecone Configuration

- **Index name:** famtastic-intelligence
- **Embedding model:** text-embedding-3-small
- **Vector type:** Dense
- **Dimensions:** 1536
- **Namespace strategy:** one namespace per business vertical (e.g., `retail`, `services`, `food`)
- **Seeding:** Phase 4 script `scripts/seed-pinecone` seeds from existing site briefs

---

## Dependency Versions

| Tool | Version | Install |
|------|---------|---------|
| Node.js | v24.14.0 | brew install node |
| Python | 3.9.6 (system) | brew install python@3.13 |
| uv | 0.11.3 | brew install uv |
| Claude Code CLI | 2.1.97 | npm install -g @anthropic-ai/claude-code |
| Git | System | brew install git |

**Note:** ps-mcp and pr-mcp require Python 3.13 at `/opt/homebrew/bin/python3.13`. The `--python` flag in the uv command locks to this path.

---

## FAMtastic-Specific Configuration

### studio-config.json
Location: `~/.config/famtastic/studio-config.json`

Key settings:
```json
{
  "model": "claude-sonnet-4-5",
  "plan_mode": true,
  "brainstorm_profile": "balanced",
  "studio_port": 3334,
  "preview_port": 3335
}
```

### Data Directories
```
~/.local/share/famtastic/            — runtime data
  agent-hub/
    convos/                         — per-tag conversation JSONL
    sources/                        — raw JSONL from agent runs
```

### Shared Paths
```
~/.famtastic-bin/                   — fam-hub CLI symlink
~/.local/share/famtastic/           — runtime data
~/.config/famtastic/                — user config
```

---

## Known Setup Gotchas

- **ps-mcp requires Photoshop to be open** — it will show "Failed to connect" in `claude mcp list` when Photoshop is closed. This is expected behavior, not a broken install.
- **ps-mcp fonttools cold start** — on first run after a long idle, add `--refresh` flag. Already included in the install command above.
- **Static Express routes must be registered before parameterized ones** — `/api/research/verticals` must come before `/api/research/:filename` or the parameterized route intercepts it.
- **TAG not process.env.SITE_TAG** — In server.js functions, `TAG` is the mutable runtime variable for the current site. `process.env.SITE_TAG` is only read at startup. Never use `process.env.SITE_TAG` inside running code.
- **CLAUDE.md integrity check** — On session start, Claude Code reads CLAUDE.md. The `<!-- studio-context-include -->` marker + `@STUDIO-CONTEXT.md` line should be present. If missing, run `fam-hub site start` to re-inject.
- **Nested Claude Code sessions** — `spawnClaude()` in server.js strips all `CLAUDE_*` env vars and runs from `os.tmpdir()` to prevent "nested session" errors from Claude Code CLI.
- **library.json shape** — Always `{ version, components[], last_updated }`. Extract `.components` — never treat the root object as an array.

---

## fam-hub Commands Reference

```bash
fam-hub site new <tag>          # Create new site
fam-hub site start [tag]        # Start Studio server
fam-hub site build <tag>        # Build site pages
fam-hub site deploy <tag>       # Deploy to Netlify

fam-hub idea capture            # Capture a new idea
fam-hub idea triage             # Triage ideas
fam-hub idea blueprint <id>     # Generate blueprint

fam-hub agent run <brain> <tag> "prompt"   # Run agent
fam-hub agent status [tag]                 # Show agent stats
fam-hub agent logs <tag> [brain]           # Tail agent logs

fam-hub admin health            # System health check
```

---

## Architecture Overview

```
~/famtastic/
├── site-studio/           — Studio server (Express + WebSocket)
│   ├── server.js          — Main server (~11,400+ lines)
│   ├── lib/               — Shared modules
│   │   ├── studio-events.js        — Event bus
│   │   ├── studio-context-writer.js — STUDIO-CONTEXT.md generator
│   │   └── brain-injector.js       — Per-brain context injection
│   └── public/            — Studio UI (HTML/CSS/JS)
├── sites/                 — Per-site files (spec.json, dist/, etc.)
├── components/            — Shared component library
├── agents/                — Agent catalog and scaffolding
├── adapters/              — Brain adapter scripts (claude/gemini/codex)
├── scripts/               — CLI scripts (fam-hub, agents, etc.)
├── mcp-server/            — FAMtastic MCP server
├── tools/                 — Adobe MCP tools (ps-mcp, pr-mcp)
└── tests/                 — Test suites
```

---

*This document is maintained by `scripts/update-setup-doc` and updated automatically when configuration changes.*
