---
title: Refresh-Ready — Famtastic-Agent-Hub (Epic 2)
version: v0.2
updated: 2025-09-21
status: planned
---


- Writes local sources to `~/.local/share/famtastic/agent-hub/sources/<agent>/<tag>.jsonl`
- Reconcile/compose build canonical artifacts in the Platform repo
- Secrets label: `agents:<provider>` in OS vault
- Needs jq OR node (installers optional)
- Catalog in `agents/catalog.json` (Platform reads via pointers)


### XDG Paths (preferred)
- **Config:** `~/.config/famtastic/agent-hub/`
- **Data (sources):** `~/.local/share/famtastic/agent-hub/sources/`
- **State (locks):** `~/.local/state/famtastic/agent-hub/locks/`


**Legacy compatibility:** `~/.codex/{sources,locks}` still read as fallback; no writes there.


**What this gives you**


Clean, standardized locations that match intent: config vs data vs state. Same behavior on macOS/Linux. Platform just needs pointers and can keep doing doctor checks and pre-commit reconcile calls.


**Ownership**


Agent-Hub owns installs and adapters, and writes to the right places. Platform composes canonicals.
