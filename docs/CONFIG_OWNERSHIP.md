# Config Ownership — FAMtastic Agent‑Hub

**Policy:** All configuration files for *agents, tools, routers, or adapters* are **owned by this repo**. The Hub creates, migrates, validates, and installs configs to the correct runtime locations. Platform never stores configs; it only calls Hub scripts.

## Scope
- Agent adapters (Claude/OpenRouter, etc.)
- Model/router configs (e.g., LiteLLM)
- Local tools/agents (e.g., Dyad, indexers, retrievers) when they expose a config file

## Canonical vs Runtime
- **Canonical (versioned)**: `config/<component>/...` in this repo.
- **Runtime (installed/symlinked)**: XDG paths
  - Config: `~/.config/famtastic/agent-hub/<component>/...`
  - Data:   `~/.local/share/famtastic/agent-hub/...`
  - State:  `~/.local/state/famtastic/agent-hub/...`

Hub scripts install the canonical file to runtime (prefer symlink, fallback copy) and set env pointers (e.g., `CJ_LITELLM_CONFIG`).

## Secrets
- Secrets live **encrypted in‑repo**: `secrets/*.enc.yaml` via **SOPS/age**.
- Resolution order: **SOPS (repo) → ENV → OS keychain → Component config**.
- The age **private key** is never committed; default path: `~/.config/famtastic/agent-hub/keys/age.txt`.

## Responsibilities
- **Create** minimal default configs when absent.
- **Migrate** legacy configs into `config/<component>/...`.
- **Validate** against schema (when available) during CI or `scripts/doctor`.
- **Install** to runtime and persist env pointers.
- **Update** on repo changes (pre‑commit hooks or `scripts/config-claim`).
- **Document** per‑component "how to run" in `README.md` sections.

## Change Process
PRs that add/modify configs must:
1. Place the config under `config/<component>/...`
2. Update `scripts/config-claim` with the component's runtime path/pointer
3. If secrets are needed, update `.sops.yaml` and `secrets/agents.enc.yaml` (encrypted)
4. Provide a smoke command (`scripts/<component>-smoke`) if possible

## PR Checklist
- [ ] Config lives under `config/<component>/...`
- [ ] Runtime install covered in `scripts/config-claim`
- [ ] Secrets added/rotated via SOPS (no plaintext)
- [ ] Smoke test added/updated
- [ ] README "Config ownership" section still accurate

## Examples
- **LiteLLM**: canonical at `config/litellm/cj-litellm.yaml` → installed to `~/.config/famtastic/agent-hub/litellm/cj-litellm.yaml` with `CJ_LITELLM_CONFIG` set.
- **Future agents**: use `config/<agent>/config.yaml` + `scripts/<agent>-serve` and `scripts/<agent>-smoke`.