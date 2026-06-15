---
title: VAULT-INDEX
type: note
permalink: famtastic/00-famtastic-core/vault-index
---

# FAMtastic Vault Index
*Last updated: 2026-05-29*

This vault is the single source of truth for all FAMtastic knowledge, plans, and captured conversations.

---

## Folder Map

| Folder | What lives here |
|---|---|
| 00-FAMtastic-Core | Foundation docs — build principles, onboarding briefs, complete prompts |
| 01-Shay | Shay CLI, Desk, plugins, architecture decisions |
| 02-Site-Studio | Studio build plans, phase docs, architecture |
| 03-MBSH | Everything MBSH reunion — planning, design, execution, vibe docs |
| 04-Research-Revenue | Research digests, revenue plans, market research, GoDaddy, crons |
| 05-Captures | Intake notes from web sessions, ChatGPT, Telegram — tagged to projects |
| 05-Captures/archive | Historical captures, superseded plans |
| 00-Inbox | Unprocessed drops — anything dumped here gets triaged |

---

## The 4 Active Work Buckets

### 1. Shay (CLI + Desk + Plugins)
Index: [[01-Shay/SHAY-STATUS]]
Sub-topics: Runtime, Desktop, MCP/Plugins

### 2. Site Studio
Index: [[02-Site-Studio/STUDIO-STATUS]]
Sub-topics: Build engine, Component library, Phase 0-5

### 3. MBSH Reunion
Index: [[03-MBSH/MBSH-STATUS]]
Sub-topics: Site, Design, Characters, Hero images, Deploy

### 4. Research + Revenue
Index: [[04-Research-Revenue/REVENUE-STATUS]]
Sub-topics: Morning crons, GoDaddy, client pipeline, market research

---

## How Captures Work

When you have a session anywhere (Claude Web, ChatGPT, Telegram, CLI) and want to save it:
1. Drop the raw text into a new note in 05-Captures/
2. Add frontmatter: source, date, project tags
3. Shay will extract decisions, ideas, actions, and file them to the right bucket

Or: paste the raw convo into Shay and say "capture this to [bucket]" — she'll do it automatically.

---

## Tagging Convention

Every capture note uses these tags in frontmatter:
- `project:` shay | studio | mbsh | revenue | core
- `source:` claude-web | chatgpt | telegram | cli | manual
- `site:` mbsh.com | famtastic.com | [any site slug]
- `status:` inbox | processed | archived