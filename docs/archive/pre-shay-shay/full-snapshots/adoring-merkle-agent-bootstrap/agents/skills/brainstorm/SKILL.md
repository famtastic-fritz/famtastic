---
name: brainstorm
description: Start a brainstorm session for a site — no HTML output, pure ideation
user-invocable: true
---

Start a FAMtastic brainstorm session for the given site tag.

1. Parse the site tag from $ARGUMENTS (e.g., "clean-pools" becomes "site-clean-pools")
2. If no tag provided, list available sites with `fam-hub site list` and ask which one
3. Run: `cd ~/famtastic && ./scripts/site-brainstorm "site-$TAG"`
4. This launches an interactive terminal brainstorm — no HTML is generated, just ideas

The brainstorm session:
- Loads project context (brief, decisions, previous session summaries)
- Saves session summaries on exit for cross-session continuity
- User can type "summary" to save mid-session
- User types "done" to exit
