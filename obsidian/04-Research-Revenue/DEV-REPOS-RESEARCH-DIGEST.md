# dev-repos-3-001 — Research Digest

Source: `/Users/famtasticfritz/Downloads/dev-repos-3-001.zip`

## Correction

This archive is not a repo collection. It is a research capture: 71 internet screenshots saved while browsing AI/dev workflow ideas.

The useful question is not “what repos are in here?” The useful question is:

> What patterns was Fritz noticing, and which ones are worth turning into a FAMtastic workflow advantage?

## The plain-English picture

You were not randomly collecting tools. You were circling one big idea:

> Modern AI development is becoming less about one chatbot and more about an operating system of agents, memory, skills, hooks, browser/dev tools, repo automation, and repeatable workflows.

That maps directly to FAMtastic. FAMtastic should not just “use AI tools.” It should learn how to orchestrate them into a site factory.

## What you found, grouped by meaning

### 1. Claude / Claude Code as a serious dev workflow layer

Examples in the screenshots:

- Claude vs Claude Code vs Claude Desktop/Cowork style comparisons
- “How to use Claude properly” guides
- Claude Code command/prompt examples
- screenshots about Claude Code running projects, opening browsers, handling commands, or using slash-command style workflows

Meaning:

Claude Code is not just another chatbot. It represents the terminal-first coding-agent pattern: the AI can read a repo, make changes, run commands, inspect failures, and iterate.

Usefulness for FAMtastic: HIGH

Why it matters:

- FAMtastic already works this way through local repo + agent sessions.
- The pattern confirms that your instinct is right: keep building durable repo instructions, project memory, plan files, skills, and proof loops.
- Claude Code, Codex, Hermes, and similar tools should be thought of as interchangeable workers inside a larger FAMtastic workflow, not as the whole system.

What to do:

- Capture best Claude Code prompt/command patterns into FAMtastic skills.
- Compare Hermes/Codex/Claude Code for specific tasks: design implementation, debugging, repo audit, visual QA.
- Do not chase every Claude trick from social media. Convert only proven patterns into repeatable recipes.

---

### 2. Agent Development Kit pattern: memory + skills + hooks + subagents + plugins

Important screenshot:

- Image 8: “The Agent Development Kit (CLAUDE.md + Skills + Hooks + Subagents + Plugins)”

Meaning:

This is one of the clearest, most useful screenshots in the archive. It describes a layered AI-agent workflow:

1. Memory/rules layer — project instructions such as CLAUDE.md
2. Skills layer — reusable task knowledge
3. Hooks/guardrails — validation before/after actions
4. Subagents — delegated specialists
5. Plugins/distribution — portable capabilities for a team

Usefulness for FAMtastic: VERY HIGH

Why it matters:

This is basically the architecture FAMtastic needs for compounding work. Your system already has parts of this:

- CLAUDE.md / AGENTS.md
- Hermes skills
- subagent delegation
- plan/audit scripts
- FAMtastic SITE-LEARNINGS.md and FAMTASTIC-STATE.md

What to do:

- Treat this as a model for the FAMtastic “operating system.”
- Make FAMtastic Studio recipes/skills first-class, not random notes.
- Add more deterministic checks before agents can claim work is done.
- Keep memory, skills, and project docs separate: memory for stable facts, skills for repeatable procedures, docs for project truth.

---

### 3. Google Skills / agent skill libraries

Important screenshot:

- Image 67 shows `https://github.com/google/skills`

Verified current repo:

- `google/skills`
- Description: “Agent Skills for Google products and technologies”
- Stars at inspection time: 8,196
- Recently active as of 2026-05-14

Meaning:

This is not social noise. This is a real repo worth studying. It suggests large companies are standardizing “skills” as installable capability packs for agents.

Usefulness for FAMtastic: HIGH

Why it matters:

FAMtastic needs its own equivalent of skills:

- site research skills
- visual QA skills
- MBSH cinematic build skills
- image generation skills
- deployment/proof skills
- cost-control skills
- prompt-refinement skills

What to do:

- Inspect `google/skills` later as a reference architecture.
- Do not blindly install everything.
- Steal the organizational pattern: skill folders, docs, examples, tool-specific instructions.

---

### 4. Personal local AI assistant with memory and multi-channel reach

Important screenshot:

- Image 64: CoPaw — “A local-first personal AI assistant with real memory and multi-channel reach.”

Meaning:

This overlaps strongly with the Shay Shay vision. CoPaw appears to position itself as a personal assistant with memory, channel integrations, skills, cron/scheduled behavior, and local/cloud deployment.

Usefulness for FAMtastic: MEDIUM-HIGH as research, not necessarily as adoption

Why it matters:

The concept is extremely relevant:

- local-first assistant
- memory under user control
- multiple channels
- extensible capabilities
- scheduled reminders / automation

But FAMtastic already has Hermes Agent and a custom Shay direction, so CoPaw may be more useful as product inspiration than as a tool to adopt.

What to do:

- Compare CoPaw’s feature list against Shay Shay/Hermes.
- Borrow UX/product ideas, not necessarily code.
- Ask: what should Shay do that generic assistants do not? Answer: understand FAMtastic sites, taste, workflow, build state, and outcomes.

---

### 5. MCP / external tool connections

Examples in the screenshots:

- Vinkius page about adding Adobe Firefly as an MCP server for Claude Code
- Mentions of external tools, APIs, databases, GitHub, etc.

Meaning:

MCP is the pattern where agents get structured access to tools: design tools, image APIs, cloud services, browsers, databases, and internal systems.

Usefulness for FAMtastic: HIGH, but needs discipline

Why it matters:

FAMtastic eventually needs tool connections:

- image generation
- screenshot analysis
- browser inspection
- deployment
- analytics
- GitHub
- maybe design tools
- maybe CMS/Notion/Airtable-like idea banks

Risk:

MCP can become tool clutter fast. Every connection adds setup, security, and maintenance burden.

What to do:

- Add MCP/tools only when they support a defined FAMtastic workflow.
- Prioritize tools that close loops: inspect → build → verify → publish → measure → learn.
- Avoid installing novelty MCP servers just because they look cool.

---

### 6. Claw / OpenClaw / GitHub-claw style ideas

Visible in screenshots:

- Several social posts mention “Claw Code” or similar terms.
- A GitHub search found `liyupi/github-claw`, described as using GitHub as an AI-agent workspace with long-term memory, skills, GitHub Actions automation, and vibe-coding support.

Verified current repo:

- `liyupi/github-claw`
- Stars at inspection time: 51
- Description includes GitHub-based AI agent, memory, skills, UI/UX, image generation, SEO, GitHub Actions, Copilot agent, vibe coding.

Meaning:

This appears to be a workflow concept/tooling direction, not something you already have installed in this ZIP.

Usefulness for FAMtastic: MEDIUM as research

Why it matters:

The idea of using GitHub as an agent coordination/workspace layer is relevant. FAMtastic already uses repo docs, plans, changelogs, and agent coordination. GitHub Actions or issue-based workflows could later help automate parts of the factory.

Risk:

Small/new repos can be noisy. Do not migrate your workflow around this unless it proves useful.

What to do:

- Treat “Claw/OpenClaw/GitHub-claw” as research, not a required adoption path.
- Extract ideas: GitHub as memory, skills, action automation, agent task queues.
- Keep FAMtastic’s own workflow as the source of truth.

---

### 7. AI dev-tool market landscape: v0, Lovable, Bolt, Replit, Cursor-like flows, etc.

Examples in screenshots:

- Tool comparison cards
- “ChatGPT vs Grok vs Gemini vs Claude vs Perplexity” style graphics
- no-code/low-code/AI web app builder mentions
- demos of tools generating apps or code from prompts

Meaning:

These are useful for orientation, but many are marketing-heavy.

Usefulness for FAMtastic: MEDIUM

Why it matters:

FAMtastic should understand the market, but not become dependent on every trendy tool. The goal is not to collect builders. The goal is to build a repeatable site factory with taste, memory, measurement, and improvement loops.

What to do:

- Use these as competitive/reference research.
- Ask: “What can this tool do faster or cheaper than our current workflow?”
- Only adopt if it improves one concrete step: research, concepting, image generation, implementation, visual QA, deployment, analytics, or learning capture.

---

### 8. Prompting cheat sheets and social-media tips

Examples in screenshots:

- Claude secret codes
- “30 must know terms in Claude”
- prompting tips
- “how to use Claude properly”
- leaked prompts / command tricks

Meaning:

These are mixed quality. Some may contain useful vocabulary, but many are engagement bait.

Usefulness for FAMtastic: LOW-MEDIUM individually, MEDIUM as pattern material

Why it matters:

A single viral prompt is not a workflow. But repeated patterns can become useful:

- better task framing
- role/context/output structure
- evaluation checklists
- “ask the model to inspect before building” style practices

What to do:

- Do not collect prompts blindly.
- Convert only successful prompt patterns into FAMtastic skills or templates.
- Test any prompt against real FAMtastic tasks before keeping it.

## What I would tell you that you found

You found early evidence of the next workflow layer for FAMtastic:

1. Agent-native development is becoming normal.
2. The winning pattern is not one model/tool; it is a system of memory, skills, hooks, subagents, plugins, and external tools.
3. Your FAMtastic direction is aligned with this trend.
4. The danger is tool-chasing. The opportunity is turning these ideas into a disciplined FAMtastic operating model.

## Priority ranking

### Study first

1. Agent Development Kit pattern — memory + skills + hooks + subagents + plugins
2. Google Skills repo — real example of skill-pack architecture
3. Claude Code workflow patterns — terminal-first coding agent behavior
4. CoPaw / local assistant concepts — inspiration for Shay Shay

### Study later

5. MCP tool directories / Vinkius-style tool connectors
6. GitHub-claw / Claw-style GitHub agent workflows
7. v0/Lovable/Bolt/Replit comparisons

### Treat carefully

8. Viral prompts, “secret codes,” leaked prompts, vague tool hype

## Recommended way to portray this to Fritz

Do not present it as “71 screenshots.” Present it as a research map:

### Title

“AI Dev Workflow Research: What You Were Really Collecting”

### Sections

1. The big pattern: AI development is becoming agent operating systems
2. The stack: memory, skills, hooks, subagents, plugins, MCP/tools
3. What is directly useful for FAMtastic
4. What is interesting but not urgent
5. What is probably social-media noise
6. Recommended experiments

### Tone

Clear, calm, no jargon dump. The point is to reduce confusion, not prove expertise.

### Best framing

“You weren’t behind. You were noticing the right things, but the internet presents them as a flood of names. The real value is the pattern underneath.”

## Concrete next experiments

1. Inspect `google/skills` and summarize its structure.
2. Compare that structure to Hermes skills and FAMtastic needs.
3. Create a FAMtastic “skill architecture” note:
   - site research skill
   - visual QA skill
   - prompt improvement skill
   - cinematic hero skill
   - deployment proof skill
4. Pick one workflow to improve first: probably visual QA or site recipe capture.
5. Put everything else in a research backlog, not the active build path.
