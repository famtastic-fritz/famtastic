---
title: brain-routing-native-gemini-2026-06-03
type: note
permalink: shay-memory/learnings/brain-routing-native-gemini-2026-06-03
---

# Brain routing fix — native free Gemini primary + local Ollama fallback (2026-06-03)

Shay went fully offline: primary `deepseek-v4-pro` via OpenRouter hit the OpenRouter
**daily limit** (HTTP 403 "Key limit exceeded"), AND the fallback was `google/gemini-2.5-flash`
routed *through the same OpenRouter key* — so the whole chain collapsed at once. The direct
`GEMINI_API_KEY` (Google AI Studio free tier) in `~/.shay/.env` was sitting unused.

## Fix applied (`~/.shay/config.yaml`, backup taken first)
- **Primary:** `gemini-2.5-flash` via provider `gemini`, base_url
  `https://generativelanguage.googleapis.com/v1beta` (native Google free tier).
- **Fallback (`fallback_model:`):** `hermes3:latest` via provider `ollama`,
  base_url `http://localhost:11434/v1` (local, zero-cost, always-available).
- `auth.json` `active_provider` -> `gemini`. Then `shay gateway restart`.

## Key lesson — route Gemini NATIVELY, not via OpenRouter
Using `provider: openrouter` with a `google/...` model ID shares the OpenRouter key's
daily cap and dies when it's exhausted. The **native** `gemini` provider uses the free-tier
key directly and sidesteps that cap entirely. Free-tier "gate" in code only WARNS during the
interactive `shay model` picker — runtime allows free tier fine (handles 429 quota gracefully).
The `custom` provider's aliases include `ollama`/`local`; it needs no API key, only a base_url.

## Verification
- Direct probe of the key on `gemini-2.5-flash` -> HTTP 200.
- `shay profile` -> `Model: gemini-2.5-flash (gemini)`.
- `shay fallback list` -> Primary gemini -> fallback hermes3 via ollama.
- Live `shay -z` turn replied cleanly with no provider error.

## Brain switchboard (`/model <name>`) — naming convention
Fritz's chosen convention (abbreviated-explicit). Defined in `~/.shay/config.yaml`
`model_aliases:` (each pins model+provider+base_url; catalog resolution bypassed —
built-in vendor aliases resolve against the *current* provider's catalog and fail
across vendors).

**`cost-route-vendor-model[-mode]`**
- **cost:** `free` | `paid` | `sub` | `local`
- **route (the pipe):** `ntv` (native free endpoint) | `api` (vendor metered API) |
  `openr` (OpenRouter) | `oauth` (subscription backend) | `olm` (local Ollama)
- **vendor:** `gem`, `antr`, `xai`, `oai`, `dseek`, `kimi`, …
- **model:** `flash`, `pro`, `sonnet`, `grok`, …
- **mode (optional 5th slot):** `-think` | `-fast` | `-max`

Every new brain MUST follow this. Add one = a `model_aliases:` block + `shay gateway restart`.

| Command | Brain | Status |
|---|---|---|
| `/model free-ntv-gem-flash` | gemini-2.5-flash (Google native) | FREE — the default ✅ |
| `/model free-ntv-gem-pro` | gemini-2.5-pro (Google native) | FREE, ~100 rpd ✅ |
| `/model sub-oauth-oai-codex` | gpt-5.3-codex (openai-codex OAuth) | needs `shay login --provider openai-codex` |
| `/model paid-api-antr-sonnet` | claude-sonnet-4-5 (Anthropic API) | needs Anthropic credits ($0 balance 2026-06-03) |
| `/model paid-openr-xai-grok` | x-ai/grok-4.3 (OpenRouter) | pay-per-use, daily-capped |
| `/model local-olm-hermes3` | hermes3:latest (Ollama) | FREE / offline (weak at tools) ✅ |

**`paid-gemini` deliberately NOT added:** a `DirectAlias` carries no api_key, so every
gemini alias shares the one free `GEMINI_API_KEY` — a "paid" lane would behave identically
to free. Real paid Gemini needs billing enabled on the Google project OR a second
billing-enabled key wired as its own provider. Add when that key exists.

**List cleanup:** built-in vendor shortcuts (gpt/grok/opus/kimi/… ~21 of them) can't be
hidden via config. Trimmed at source in the editable fork: `shay_cli/commands.py`
`_model_completions()` no longer iterates `MODEL_ALIASES` — picker shows ONLY config
`model_aliases:`. Committed (`fix(cli): trim /model picker to configured brains`,
05f4e17) so `shay update` (git pull) keeps it. `shay -m <name>` still resolves built-ins.

Switch THREE ways (same `DIRECT_ALIASES` resolution):
1. In chat: `/model <name>` (tab-autocompletes, shows model+provider).
2. Per-run: `shay -m <name> -z "..."`.
3. Permanent default: edit `model:` block + `shay gateway restart`.
Gateway caches aliases at startup — restart after editing `model_aliases:`.

## Status bar + switch confirmation show the ALIAS (source change)
The TUI status-bar chip and the `/model` confirmation box used to show the raw
resolved model id (`gemini-2.5-flash`) — not the alias the user picked. Fixed in the
editable fork `cli.py` (commit `ffe7080`):
- `_get_status_bar_snapshot()` now reverse-maps `(model, provider) → alias` via new
  helper `ShayCLI._alias_for_model()` and shows the alias as `model_short`, so the chip
  ALWAYS matches the `/model` selection — even at startup (default reverse-maps to
  `free-ntv-gem-flash`). Falls back to model id if no alias matches (model-only fallback
  covers provider canonicalization, e.g. ollama→custom).
- Both switch-confirmation paths (`_apply_model_switch_result` typed `/model`, and the
  dropdown-picker handler) headline the alias, show the model id beneath, and **replace
  the per-token `$/M` rate card** with an honest tier+limit line via new helper
  `ShayCLI._tier_usage_note()`: free → daily request cap (~250 flash / ~100 pro,
  per the repo free-tier gate), sub → "covered by your plan", local → "$0", paid →
  "metered". The `$/M` figures were confusing because they're list price regardless of
  the key's actual (free) tier.
- These are CLI/TUI-only; a fresh `shay chat` loads the new cli.py (no gateway restart).

## Reasoning mode suffix (`-think` / `-fast` / `-max`)
The optional 5th naming slot now actually changes reasoning effort (commit `0140473`,
cli.py `_handle_model_switch`): a mode suffix on a known alias is stripped, the base
alias is switched, and reasoning effort is applied like `/reasoning` (session, or saved
with `--global`). Mapping: `-fast`→`minimal`, `-think`→`high`, `-max`→`xhigh`. Guard:
suffix only stripped when the base is a known alias (`_is_known_alias`), so real model
ids ending in those tokens are untouched. Examples: `/model free-ntv-gem-pro-think`,
`/model free-ntv-gem-flash-fast`, `/model paid-api-antr-sonnet-max`. Note: this `-fast`
= light/no *thinking* (reasoning), distinct from the built-in `/fast` (paid priority speed).

## Resilient fallback chain
`~/.shay/config.yaml` `fallback_providers` is now a 2-tier chain: `gemini-2.5-flash`
(native) → `hermes3:latest` (Ollama). So whatever the primary is, it degrades to a
capable free brain first, then local. (While the default is gemini-flash the first tier
is a near-noop; it becomes meaningful once Codex is the default.)

## Codex default — scheduled for Jun 7 (subscription messages exhausted)
As of 2026-06-03 the Codex subscription is **out of messages** until **Jun 7, 2026,
11:21 AM** (ChatGPT banner). Switching the default to Codex now is pointless (every call
fails → fallback) and it isn't authed yet. So:
- `openai-codex` auth: added via `shay auth add openai-codex --type oauth` (browser; NOT
  `shay login`, which is removed). **DONE 2026-06-03** — credential `openai-codex-oauth-1`
  (oauth/device_code) is in the pool, `shay auth status openai-codex` = logged in. So the
  Jun 7 gate passes and the switch WILL fire.
- A **launchd one-shot** `com.famtastic.shay-codex-switch` (plist in `~/Library/LaunchAgents/`,
  script `~/.shay/scripts/switch-to-codex.sh`) fires **Jun 7 11:25 AM**: it flips the
  `model:` block to `gpt-5.3-codex`/`openai-codex` (api_mode `codex_responses`), restarts
  the gateway, and self-unloads. SAFE: it only switches if `openai-codex` is authed (else
  stays on gemini + logs), backs up config first, and the rewrite is line-scoped
  (`(?m)`, NOT DOTALL — DOTALL devoured the whole file in testing) so model_aliases /
  fallback survive. Log: `~/.shay/logs/codex-switch.log`.

## Free OpenRouter experimental brains + the `shay-add-brain` skill
Added 3 free-tier OpenRouter brains (all confirmed tool-calling via OpenRouter's
`supported_parameters`): `free-openr-qwen-coder` (qwen/qwen3-coder:free, coding/1M ctx),
`free-openr-nv-nemotron` (nvidia/nemotron-3-super-120b-a12b:free, reasoning),
`free-openr-gem-gemma4` (google/gemma-4-31b-it:free, general/262K). **LIVE as of 2026-06-03** — added a 2nd OpenRouter credential ("FREE-lane key", #2) to
the pool; pool credential #1 (env OPENROUTER_API_KEY) is 403/daily-capped so #2 serves
everything. Verified: `free-openr-gem-gemma4` answered "BRAIN OK" through Shay.
NOTE: the added key is NOT free-tier — OpenRouter reports `is_free_tier: false` with a
**$5 spend limit** (credits-enabled, capped). Free models run $0 against it; the $5 cap is
a built-in runaway guard. `free-openr-qwen-coder` 429'd transiently (mobbed model, not the key).
Shay routes ALL openrouter traffic through one shared pool — it can NOT pin a key per
alias. So `paid-openr-xai-grok` shares this $5-capped key (Fritz chose to keep grok in
Shay; worst case it spends the $5 then stops). True per-key isolation would need grok
removed from Shay or a separate provider entry (not natively supported cleanly).
Note: OpenRouter rate limits are per-ACCOUNT, so a 2nd key on the SAME account doesn't
double quota — a 2nd account does; either way use one key as the free-experiment lane.
Mistral has NO free developer API tier (Vibe Free is consumer-only). Groq/Cerebras free
tiers exist but their exact limits were unverifiable in research — check dashboards before relying.

Added `free-openr-kimi-k2` (moonshotai/kimi-k2.6:free) on 2026-06-03 via the
`shay-add-brain` skill — answers clean (frontier-class, 262K ctx, tools). CORRECTION to
earlier research: Kimi K2.6 IS available free on OpenRouter now (has a `:free` variant
with tools); the "paid-only" claim was stale. CONVERSELY, DeepSeek has **no `:free`
variant on OpenRouter as of 2026-06-03** — don't add `deepseek-*:free`, it 404s. Always
check the live catalog (`curl openrouter.ai/api/v1/models`) for `:free` + `tools` before
adding. HF PRO ($9/mo) gives only **$2/mo** inference credits (free tier $0.10) — NOT
worth it for running brains; `:free` OpenRouter models + Gemini free tier beat it.

**Convention fix:** the OpenRouter route token is **`openr`** everywhere (not `or`). The
three free brains were briefly mis-added as `free-or-*` and corrected to `free-openr-*`.

**New skill `shay-add-brain`** (`~/.claude/skills/shay-add-brain/`, script
`scripts/add_brain.py`): adds any model to the switchboard in one command — derives the
cost-route-vendor-model alias, edits config (idempotent, comment-preserving), checks
OpenRouter tool-calling support + key health, restarts the gateway, and probes that the
brain answers. First of several skills capturing this session's lessons. Embodies the
model-tiering norm: deterministic work in a script = zero model cost per use.

## Caveat
Free tier has a lower ceiling (~250 rpd for flash). On heavy days she may 429 and drop to
local Hermes. Consider wiring a paid tier back as a middle fallback if sustained load returns.
Related: [[free-tier-caps-note-2026-05-31]].

## 2026-06-05 — Full roster wired + picker fix (14 brains)

Wired Fritz's complete model roster into `~/.shay/config.yaml` `model_aliases:`
(14 brains) and fixed two `/model` crashes + the picker. Default stays
**gemini-2.5-pro** (Anthropic direct is 429-capped, so it is NOT the default —
avoids fail-then-fallback on every call).

### Two crashes fixed (committed to shay-shay repo, gitignored at ~/famtastic/shay-shay)
- `fix(model): repair /model TypeError crash` (3075af5): `switch_model()` passed
  `user_providers=/custom_providers=/api_key_env_vars=` into keyword-only
  `resolve_runtime_provider(*, requested, ...)` (TypeError every /model). Also
  `determine_api_mode(final_model, target_provider, base_url)` was a 3-arg call
  into a 2-arg `(provider, base_url)` fn with provider in the wrong slot. Both
  leftovers from the model-selection rewrite. Aligned to real signatures.
- `fix(cli): /model picker reads switchboard` (529cd8a): `_model_completions()`
  read `model.aliases` (legacy key) so configured brains never autocompleted;
  now reads top-level `model_aliases:` — the SAME source the resolver
  (`_load_direct_aliases`/`DIRECT_ALIASES`) uses. Picker is now self-documenting
  (`model (provider)` meta).

### The 14 brains (all switch with no exception; verified via switch_model)
| /model alias | model | provider | status |
|---|---|---|---|
| `free-ntv-gem-pro` | gemini-2.5-pro | gemini | DEFAULT ✅ (free, ~100 rpd cap) |
| `free-ntv-gem-pro31` | gemini-3.1-pro-preview | gemini | ✅ free tier |
| `sub-api-antr-sonnet` | claude-sonnet-4-6 | anthropic | switches; 429-capped now |
| `sub-cop-antr-sonnet` | claude-sonnet-4.6 | copilot | ✅ SEPARATE Claude bucket |
| `sub-oauth-oai-codex` | gpt-5.4 | openai-codex | ✅ oauth in pool |
| `local-olm-qwen3` | qwen3:14b | ollama | ✅ (needs 65536 ctx override — see below) |
| `local-olm-gemma4` | gemma4:latest | ollama | ✅ 131K ctx |
| `local-olm-hermes3` | hermes3:latest | ollama | ✅ 131K — probed "BRAIN OK" |
| `local-olm-dseek-r1` | deepseek-r1:latest | ollama | ✅ 131K ctx |
| `free-openr-qwen-coder` | qwen/qwen3-coder:free | openrouter | switches; NEEDS KEY |
| `free-openr-kimi-k2` | moonshotai/kimi-k2.6:free | openrouter | switches; NEEDS KEY |
| `paid-openr-xai-grok` | x-ai/grok-4.3 | openrouter | switches; NEEDS KEY |
| `free-groq-llama` | llama-3.3-70b-versatile | groq | switches; NEEDS KEY |
| `free-cerebras-llama` | llama-3.3-70b | cerebras | switches; NEEDS KEY |

### Where to paste the missing free keys (exact locations)
- **OpenRouter** (3 brains): `shay auth add openrouter --api-key <key>` (pool),
  OR add `OPENROUTER_API_KEY=<key>` to `~/.shay/.env`.
- **Groq**: add `GROQ_API_KEY=<key>` to `~/.shay/.env` (wired via
  `providers.groq.key_env` in config.yaml), then `shay gateway restart`.
- **Cerebras**: add `CEREBRAS_API_KEY=<key>` to `~/.shay/.env` (wired via
  `providers.cerebras.key_env`), then `shay gateway restart`.

### Hardware + gotchas
- **MiniMax SKIPPED**: this Mac is **16GB RAM**; MiniMax M2 MoE (~25GB) exceeds it
  (task gate: skip <32GB). Not pulled, not wired.
- **64K context gate** (`run_agent.py:2281`, MINIMUM_CONTEXT_LENGTH): `qwen3:14b`
  advertises only 40,960 ctx → would crash on a real turn. Fixed with a per-model
  `custom_providers` override (base_url-matched) `context_length: 65536` so it is
  runnable (probed "BRAIN OK"). deepseek-r1/gemma4/hermes3 are 131K — fine.
- **Fallback chain** is 5-tier, every lane represented, local tail is `hermes3:latest`
  (131K — NOT qwen3, which would trip the 64K gate if the chain degraded to it):
  gemini-2.5-pro → copilot sonnet → gemini-3.1-pro-preview → codex gpt-5.4 → hermes3.
- **Copilot creds**: env `GITHUB_TOKEN` is a classic `ghp_*` PAT (unsupported by
  Copilot API); the OAuth `gh auth token` credential (#1) is what makes
  `sub-cop-antr-sonnet` work. A fine-grained PAT or `gh auth login` device flow
  also works if the OAuth token lapses.
