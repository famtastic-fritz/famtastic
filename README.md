# Famtastic Agent-Hub (Epic 2)


Owns adapters, router/config, and installers for agents. Writes local sources to:
`~/.local/share/famtastic/agent-hub/sources/<agent>/<tag>.jsonl`


> Legacy fallback (read-only): `~/.codex/sources/<agent>/<tag>.jsonl`


The Platform repo reads those to build canonical artifacts on its side (compose + manifests + summaries).


## Quickstart
```bash
# optional: installers (jq OR node)
./scripts/agents setup


# write a sample source for claude
./adapters/claude/cj-get-convo-claude latest-convo --demo


# reconcile + compose (can also be called by Platform pre-commit)
./scripts/cj-reconcile-convo latest-convo
./scripts/cj-compose-convo latest-convo
```

## Secrets

Store provider keys in the OS vault under label `agents:<provider>`.

Examples (macOS Keychain):
```bash
./scripts/agents secrets set openai
./scripts/agents secrets list
```

## Catalog

`agents/catalog.json` declares providers and agent adapters. Platform reads this via its pointers.
