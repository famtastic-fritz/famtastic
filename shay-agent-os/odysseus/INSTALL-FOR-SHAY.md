# Odysseus for Shay — install + wire-up task

> **This is a task note for Shay-Shay**, written 2026-06-02 by the Claude Code
> session that installed Odysseus on Fritz's side. Fritz's instruction:
> *"have shay install it as well … spin up an Odysseus agent as well and its
> capabilities. tell shay to do the same."* Pick this up on your next run.

## What Odysseus is

A self-hosted AI workspace (chat, agent on opencode+MCP, Cookbook local model
serving, deep research, compare, documents, memory/skills via ChromaDB+fastembed,
email triage, notes/tasks, CalDAV calendar). Local-first, privacy-first. It is,
functionally, a self-hosted sibling to *you*. Full map:
`docs/odysseus/ODYSSEUS-WRITEUP.md`. Repo:
`https://github.com/pewdiepie-archdaemon/odysseus`.

## Your tasks

1. **Install your own instance** (headless/agentic — separate from Fritz's
   interactive one):
   ```bash
   bash ~/famtastic/shay-agent-os/odysseus/install-odysseus-shay.sh
   ```
   It clones to `~/odysseus-shay`, binds loopback on port **7870** (so it never
   collides with Fritz's 7860), keeps `AUTH_ENABLED=true`, and prints the temp
   admin password. Rotate it.

2. **Spin up an Odysseus agent in your OS** — mirror of the Claude Code agent
   def at `.claude/agents/odysseus.md`. Your version lives at
   `shay-agent-os/agents/odysseus.md` (already drafted — adopt/refine it). It
   should know Odysseus's capability→route table and prefer routing local-
   eligible work (local chat, local agent runs, deep research, model serving)
   to your Odysseus instance instead of cloud APIs.

3. **Bridge memory/skills.** Odysseus memory is ChromaDB + fastembed with
   import/export; your durable knowledge lives in `obsidian/Shay-Memory/` and
   skills in `shay-agent-os/skills/`. Set up a one-way export of your skill
   catalog into Odysseus so its agent can use your skills, and pull its
   memory export into a `Shay-Memory/imports/odysseus/` folder for recall.

4. **Author YOUR OWN visual tutorial.** Fritz asked for two *independent*
   tutorials — one from Claude, one from you. Claude's is at
   `docs/odysseus/tutorial-claude.html`. Write yours at
   `docs/odysseus/tutorial-shay.html` **from your own angle** (the autonomous
   agent-OS / swarm / local-model-serving operator's view — not a rewrite of
   Claude's). A Claude-drafted starter exists at that path; replace it with your
   genuine take so Fritz gets two real perspectives, not an echo.

5. **Brain trace.** This is a session — leave a trace per the Brain Sync
   Contract. Use the shared checkpoint:
   `AI_AGENT=shay BRAIN_SESSION_ID=<your-run-id> node ~/famtastic/scripts/brain/session-checkpoint.js start`
   (and `… stop` at the end). See `shay-agent-os/brain_checkpoint.py` (added
   this session) for the Python wrapper.

## Also flagged for you (separate from Odysseus)

- **The "1000-site revenue model" artifact is LOST.** Build record
  `obsidian/Shay-Memory/builds/b_d527a48c1eba0e.md` (task `t_25a5a643`,
  completed 2026-05-28) and the trace node `plan:shay:portfolio-revenue-model`
  both reference `portfolio-revenue-model.md` (~10565 bytes) — but that file
  exists in **no branch's git history**. Either recover it from your
  2026-05-28 overnight output on the host and **commit it to the brain**, or
  mark the build/trace node as `artifact-lost` so it stops creating drift.
  Fritz specifically asked whether the 1000-plan was committed — answer: your
  48h work is on `main`, but **this artifact is not**. Close the gap.
