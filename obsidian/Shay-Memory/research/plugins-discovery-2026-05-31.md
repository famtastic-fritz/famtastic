---
title: plugins-discovery-2026-05-31
type: note
permalink: shay-memory/research/plugins-discovery-2026-05-31
---

# Plugins Discovery — Shay/Hermes + Desktop

> Read-only research, 2026-05-31. Ranked, categorized list of plugins and MCP servers worth adding to the Shay (Hermes-agent, NousResearch) runtime and the desktop (Claude Code / Claude Desktop). Sources cited inline. Local paths are under `/Users/famtasticfritz/.shay/hermes-agent/`.

## 0. How Shay plugins work (the install surface)

Source: `website/docs/user-guide/features/built-in-plugins.md`, `website/docs/user-guide/features/plugins.md`, `website/docs/user-guide/features/mcp.md`.

**Plugin discovery** — `PluginManager` scans four sources, later wins on name collision:
1. Bundled — `<repo>/plugins/<name>/`
2. User — `~/.shay/plugins/<name>/`
3. Project — `./.shay/plugins/<name>/` (needs `SHAY_ENABLE_PROJECT_PLUGINS=1`)
4. Pip entry points — `shay_agent.plugins`

**Enable / disable** (all plugins ship opt-in / disabled):
```bash
shay plugins list                 # discover, show enabled/bundled
shay plugins enable <name>        # e.g. disk-cleanup, observability/langfuse, spotify
shay plugins disable <name>
shay tools                        # interactive wizard (installs deps + edits config)
```
Or in `~/.shay/config.yaml`:
```yaml
plugins:
  enabled:
    - disk-cleanup
```
Plugin kinds: `hooks`, `backend` (tools), `standalone`, `image backend`, `dashboard tab`. Memory providers (`plugins/memory/*`) and context engines (`plugins/context_engine/*`) are single-select and configured via `shay memory setup` / `context.engine`, NOT via `plugins.enabled`.

**MCP servers** are configured separately in `~/.shay/config.yaml` under `mcp_servers:` (stdio `command`/`args`/`env` or HTTP `url`/`headers`). Requires `uv pip install -e ".[mcp]"`. Per-server tool filtering is supported. CLI parity: Claude Desktop / Claude Code use the same `command`/`args`/`env` shape, so every MCP below installs on both surfaces.

---

## 1. Already shipped in Shay (bundled, opt-in)

Source: `plugins/` directory + `built-in-plugins.md`. These exist already — enable as needed, no new install.

| Plugin | Kind | What it adds | Enable |
|---|---|---|---|
| `disk-cleanup` | hooks + slash cmd | Auto-tracks/cleans ephemeral test/temp/cron files in `$SHAY_HOME` & `/tmp/shay-*`; `/disk-cleanup` cmd | `shay plugins enable disk-cleanup` |
| `observability/langfuse` | hooks | Per-turn / LLM / tool tracing + cost to Langfuse | `shay tools` → Langfuse, or `shay plugins enable observability/langfuse` |
| `spotify` | backend (7 tools) | Playback/queue/search/playlists via Web API + PKCE | `shay auth spotify` then enable |
| `google_meet` | standalone | Join Meet, live-caption transcription, optional realtime duplex audio, post-meeting notes | `shay plugins enable google_meet` |
| `teams_pipeline` | standalone | MS Teams transcript-first meeting summaries via Graph | enable |
| `kanban/dashboard` | dashboard tab | Multi-agent dispatcher board (already in your kanban setup work) | auto |
| `hermes-achievements` | dashboard tab | Steam-style badges from session history | auto |
| `image_gen/{openai,openai-codex,xai}` | image backend | Alt image backends to FAL | enable per-backend |
| Memory providers | provider | `byterover`, `hindsight`, `holographic` (local SQLite+FTS5), `honcho`, `mem0`, `openviking`, `retaindb`, `supermemory` | `shay memory setup` |
| MCP skills | bundled/optional skills | `mcp-native-mcp`, optional `fastmcp`, `mcporter` (build/run MCP servers) | skill |

**Takeaway:** the local-first `holographic` memory provider and `disk-cleanup` are the lowest-friction wins already in-tree. For dev/Drupal/browser/GitHub the gaps are filled by MCP servers (Section 2).

---

## 2. MCP servers worth adding (ranked)

All install via `mcp_servers:` in `~/.shay/config.yaml` (Shay) and the identical block in `~/Library/Application Support/Claude/claude_desktop_config.json` / Claude Code `.mcp.json` (desktop). Ranking weights: relevance to your dev/Drupal/site-factory work, reliability, breadth.

### P0 — install first (dev core)

**1. Context7** — up-to-date, version-specific library docs injected at generation time. #1 server on MCP.Directory by ~2x. Kills stale-API hallucination for Drupal/React/Remotion/Tailwind work.
```yaml
mcp_servers:
  context7:
    command: npx
    args: ["-y", "@upstash/context7-mcp", "--api-key", "YOUR_KEY"]
```
Free key at context7.com/dashboard. Source: https://www.npmjs.com/package/@upstash/context7-mcp , https://github.com/upstash/context7
Note: Shay already ships a `context7` skill under `plugins/oh-my-claude` on the desktop side — the MCP server is the runtime backend.

**2. GitHub (official)** — PRs, issues, repo management without leaving the agent. 27K stars, GitHub-maintained. Complements existing Shay `skills/github/*` skills.
```yaml
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: "***" }
```
Source: https://github.com/modelcontextprotocol/servers

**3. Filesystem** — Anthropic reference server, sandboxed read/write/search within configured dirs. Safer than raw shell for repo work; per-dir boundaries.
```yaml
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/Users/famtasticfritz/famtastic"]
```
Source: https://github.com/modelcontextprotocol/servers

### P1 — dev/web high value

**4. Playwright (Microsoft)** — 3 browser engines, 22 tools, codegen, network mocking. Browser automation + visual verification for the site factory (pairs with your existing OpenWolf designqc and lighthouse-mcp). 28.5K stars.
```yaml
  playwright:
    command: npx
    args: ["-y", "@playwright/mcp@latest"]
```
Source: https://github.com/microsoft/playwright-mcp , Builder.io best-of list https://www.builder.io/blog/best-mcp-servers-2026

**5. Drupal MCP** — turns a Drupal site into an MCP server (tools/resources/prompts exposed to Claude/Cursor). Two modules: `mcp` (client/bridge, created 2024-11, updated 2026-01) and `mcp_server` (official PHP MCP SDK, OAuth 2.1, Tool API plugin discovery, backed by Lullabot/Acquia/Omedia, updated 2026-04). Directly relevant if any FAMtastic/MBSH property runs Drupal.
- Module: https://www.drupal.org/project/mcp_server
- Docs: https://drupalmcp.io/en/ , https://mcp-77a54f.pages.drupalcode.org/
- Devsite: https://www.thedroptimes.com/66132/turn-your-drupal-site-mcp-server-ai-tools-claude-and-cursor

**6. Memory (knowledge-graph, Anthropic reference)** — persistent entities/relations/observations across sessions, MCP-native. An alternative/complement to Shay's in-tree memory providers when you want the *desktop* (Claude Code) to share long-term project memory the same way Shay does.
```yaml
  memory:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-memory"]
```
Source: https://github.com/modelcontextprotocol/servers

### P2 — situational

**7. PostgreSQL / Supabase MCP** — DB introspection + queries if/when a site backs onto Postgres. Source: best-of lists below.
**8. Bright Data MCP** — web scraping / SERP / structured data feeds; you already have the `brightdata-plugin` skill family on the desktop — the MCP server is the runtime. Good for competitive-intel and research seeding.
**9. Sequential-thinking MCP** — structured multi-step reasoning; already present on desktop via `oh-my-claude` plugin.

Aggregate ranking sources:
- https://github.com/modelcontextprotocol/servers (canonical reference set)
- https://github.com/tolkonepiu/best-of-mcp-servers (weekly-ranked list)
- https://mcp.directory/blog/top-10-most-popular-mcp-servers (real usage data)
- https://www.builder.io/blog/best-mcp-servers-2026
- https://dev.to/jangwook_kim_e31e7291ad98/top-15-mcp-servers-every-developer-should-install-in-2026-n1h

> Operational note from the corpus: keep ~5–6 MCP servers active at once to avoid tool-surface slowdown. Use Shay's per-server tool filtering to trim.

---

## 3. Agent / skill plugins from the corpus

Source: `optional-skills/` and `skills/` in the Hermes repo (already vendored — enable, don't install).

| Skill group | Path | Adds | Priority |
|---|---|---|---|
| MCP authoring | `optional-skills/mcp/fastmcp`, `optional-skills/mcp/mcporter` | Build/run your own MCP servers (FastMCP) and discover/proxy others (mcporter) | P1 — enables wrapping FAMtastic services as MCP |
| GitHub workflow | `skills/github/{github-pr-workflow,github-code-review,github-issues,github-repo-management,codebase-inspection}` | Full GH lifecycle as agent skills | P0 — pair with GitHub MCP |
| Software-dev | `skills/software-development/{systematic-debugging,test-driven-development,subagent-driven-development,plan,spike,requesting-code-review,node-inspect-debugger,python-debugpy}` | Debugging + TDD + planning loops | P1 |
| Autonomous agents | `skills/autonomous-ai-agents`, `optional-skills/autonomous-ai-agents` | Multi-agent orchestration patterns (aligns with your swarm-patterns research) | P1 |
| Research | `skills/research`, `optional-skills/research` | Research harness skills (parallels desktop `deep-research`) | P2 |
| Creative/media | `skills/{creative,media,gifs,diagramming}` incl. `creative-blender-mcp`, `creative-touchdesigner-mcp` | Media + diagram generation; Blender/TouchDesigner via MCP | P2 (media-studio adjacent) |
| Note-taking | `skills/note-taking` | Obsidian-style capture (aligns with this Shay-Memory vault) | P2 |
| DevOps | `skills/devops`, `optional-skills/devops` | Deploy/infra automation | P2 |

ACP (Agent Client Protocol) registry exists at `acp_registry/agent.json` and `acp_adapter/` — Shay can be driven as/with external ACP agents, an additional extension surface beyond plugins/MCP.

---

## 4. Recommended adoption order

1. **Enable now (zero install):** Shay `disk-cleanup`; pick a memory provider (`holographic` for local-first); enable `skills/github/*` and `skills/software-development/*`.
2. **P0 MCP on both Shay + desktop:** Context7, GitHub, Filesystem.
3. **P1:** Playwright MCP; FastMCP/mcporter skills to wrap FAMtastic Studio/Data-Center services as MCP servers; Drupal MCP *if* a property runs Drupal.
4. **P2 as needs arise:** Postgres/Supabase, Bright Data, memory KG on desktop.

Keep active MCP count ≤6; use Shay per-server tool filtering.