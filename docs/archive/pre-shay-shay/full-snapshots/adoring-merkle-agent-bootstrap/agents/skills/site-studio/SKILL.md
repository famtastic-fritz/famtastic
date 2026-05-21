---
name: site-studio
description: Launch Site Studio for a site tag — opens chat UI + live preview in browser
user-invocable: true
---

Launch FAMtastic Site Studio for the given site tag.

1. Parse the site tag from $ARGUMENTS (e.g., "clean-pools" becomes "site-clean-pools")
2. If no tag provided, ask the user for one
3. Run: `cd ~/famtastic && ./scripts/site-chat "site-$TAG"`
4. This starts the Studio server (port 3334) and preview server (port 3333), then opens the browser

If the user wants to create a new site, use `fam-hub site new <tag>` instead.
If the user wants to brainstorm, suggest `/brainstorm <tag>` instead.
