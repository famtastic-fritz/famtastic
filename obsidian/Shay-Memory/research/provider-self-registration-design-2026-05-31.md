---
title: provider-self-registration-design-2026-05-31
type: note
permalink: shay-memory/research/provider-self-registration-design-2026-05-31
---

# Provider Self-Registration Design — Shay adds & authenticates new providers herself

Date: 2026-05-31
Status: design (read-only research; one doc, no code changes)
Goal: Shay should REGISTER and AUTHENTICATE new inference providers herself —
api-key, device-code OAuth, and custom OpenAI-compatible `base_url` endpoints —
from both the CLI and the desktop Providers page, without hand-editing
`config.yaml` or `auth.json`.

All paths below are absolute.

---

## 1. Provider types supported today

### Source of truth
`shay-shay/shay_cli/auth.py` → `PROVIDER_REGISTRY: Dict[str, ProviderConfig]`
(declared at `auth.py:149`). Each entry is a `ProviderConfig` dataclass
(`auth.py:132`) with an `auth_type` field. The four auth types in play:

1. **`api_key`** — the large majority. Token resolved from env vars
   (`api_key_env_vars` tuple) or the credential pool. Examples: `anthropic`,
   `gemini`, `zai`, `kimi-coding`, `minimax`, `deepseek`, `xai`, `nvidia`,
   `huggingface`, `ollama-cloud`, `lmstudio`, etc. Base URL can be overridden
   per provider via `base_url_env_var` (e.g. `GLM_BASE_URL`, `KIMI_BASE_URL`).
   Resolution: `_resolve_api_key_provider_secret()` (`auth.py:537`).

2. **`oauth_device_code`** — Nous Portal only (`nous`, `auth.py:150`).
   Full RFC 8628 device-authorization flow against `portal.nousresearch.com`.
   Implemented by `_nous_device_code_login()` (`auth.py:5029`): requests a
   device code (`_request_device_code`), shows `verification_uri_complete` +
   `user_code`, polls (`_poll_for_token`), then mints an agent key via
   `refresh_nous_oauth_from_state()`. Persisted by
   `persist_nous_credentials()` (`auth.py:3484`); mirrored to a shared store
   (`_read_shared_nous_state` / `_nous_shared_store_path`) so other profiles
   can one-tap import.

3. **`oauth_external`** — reuses another CLI's already-minted OAuth tokens
   rather than running a browser flow inside Shay:
   - `openai-codex` (`auth.py:159`): OpenAI device-code flow,
     `_codex_device_code_login()` (`auth.py:4562`) against
     `auth.openai.com/codex/device`, token exchange at `CODEX_OAUTH_TOKEN_URL`.
   - `qwen-oauth` (`auth.py:165`): reads the Qwen CLI's credentials and
     refreshes them — `resolve_qwen_runtime_credentials()` (`auth.py:1682`),
     `_qwen_cli_auth_path()` (`auth.py:1540`), token URL
     `chat.qwen.ai/api/v1/oauth2/token`.
   - `google-gemini-cli` (`auth.py:171`): PKCE via
     `agent/google_oauth.py::run_gemini_oauth_login_pure`.

4. **`oauth_minimax`** — `minimax-oauth` (`auth.py:266`), user-code grant via
   `resolve_minimax_oauth_runtime_credentials()` (`auth.py:4977`).

Plus non-pool special types: `external_process` (`copilot-acp`), `aws_sdk`
(`bedrock`).

### Custom OpenAI-compatible endpoints (the "base_url" path)
Two distinct mechanisms exist:

- **Singleton `custom` provider** — `resolve_provider()` returns `"custom"`
  (`auth.py:1411`); `config.yaml` carries `model.provider: custom` +
  `model.base_url`. Local aliases (`ollama`, `vllm`, `llama.cpp`) map to
  `custom` (`auth.py:1391`). One endpoint at a time.

- **Named `custom_providers[]`** — a list in `config.yaml`. Each entry is a
  dict `{ name, base_url, api_key?, provider_key?, ... }` (iterated by
  `agent/credential_pool.py::_iter_custom_providers`, `credential_pool.py:286`).
  Each named entry gets a credential pool keyed `custom:<normalized-name>`
  (`CUSTOM_POOL_PREFIX = "custom:"`, `credential_pool.py:81`;
  `get_custom_provider_pool_key()` at `credential_pool.py:312`). This is the
  proper multi-endpoint mechanism and the one a "register a new
  OpenAI-compatible provider" flow should target.

### Pooled-credential model (`shay auth add/list/status`)
`shay-shay/shay_cli/auth_commands.py`:
- `auth_add_command()` (`auth_commands.py:161`) is the registration entry.
  For `api_key`: prompts/accepts a key, builds a `PooledCredential`
  (`source=SOURCE_MANUAL`), `pool.add_entry()`. For OAuth-capable providers
  (`_OAUTH_CAPABLE_PROVIDERS = {anthropic, nous, openai-codex, qwen-oauth,
  google-gemini-cli, minimax-oauth}`, `auth_commands.py:36`) it dispatches to
  the matching device-code / external-OAuth helper in `auth.py` and stores the
  returned tokens as a pooled OAuth entry.
- `auth_list_command()` (`auth_commands.py:401`) iterates
  `PROVIDER_REGISTRY ∪ {openrouter} ∪ list_custom_pool_providers()`.
- `auth_status_command()` (`auth_commands.py:473`) → `get_auth_status()`
  (`auth.py:4036`).
- `auth_remove_command()` (`auth_commands.py:428`) + suppression markers.
- Storage: `auth.json` `credential_pool` (per-provider lists) via
  `write_credential_pool()` (`auth.py:1128`) and provider `providers{}` state
  via `_save_provider_state()` (`auth.py:1044`); strict 0600 perms,
  cross-process flock (`auth.py:857`+).

**Key fact:** `auth_add_command` already supports api-key + every OAuth flow
for any provider in `PROVIDER_REGISTRY`, plus custom pools. The CLI can already
register and authenticate providers end-to-end. The registry is also
auto-extended at import from `plugins/model-providers/<name>/` (`auth.py:419`).

---

## 2. The gap

### CLI gap (small)
The CLI can authenticate any *known* provider and any *named* custom provider.
What it cannot do in one command is **define a brand-new OpenAI-compatible
provider** (write a new `custom_providers[]` entry to `config.yaml`) and
authenticate it in a single step — today you must hand-add the
`custom_providers` block to `config.yaml` first, then run
`shay auth add custom:<name>`. There is no `shay provider register` /
`shay auth add --base-url <url> --name <name>` that creates the config entry.
For genuinely new *named OAuth* providers (e.g. a new device-code portal),
there is no data-driven path at all — each OAuth provider is hardcoded into
`PROVIDER_REGISTRY` + a bespoke `_*_device_code_login()` function.

### Desktop gap (large — this is the real blocker)
The desktop **cannot authenticate any OAuth/device-code provider at all**, and
cannot register a new custom OpenAI-compatible provider.

Evidence:
- `shay-desktop-electron/src/renderer/src/screens/Providers/Providers.tsx`
  only does three things: (a) edit `model.provider/model/base_url` via
  `setModelConfig`; (b) edit flat env-var API keys via `setEnv`; (c) add/remove
  **api-key-only** pool entries via `getCredentialPool`/`setCredentialPool`
  (`Providers.tsx:174` `handleAddPoolKey`). There is no OAuth button, no
  device-code UI, no "add provider" form, no custom-endpoint registration.
- The provider list is a **hardcoded dropdown**:
  `shay-desktop-electron/src/renderer/src/constants.ts` `PROVIDERS.options`
  (`constants.ts:17`) — only `auto, openrouter, anthropic, openai, google, xai,
  nous, qwen, minimax, custom`. It is not derived from `PROVIDER_REGISTRY`, so
  most CLI providers (deepseek, kimi, zai, nvidia, huggingface, ollama-cloud,
  …) are invisible in the desktop. Adding a new provider means editing this
  array.
- `setModelConfig` (`shay-desktop-electron/src/main/config.ts:434`) only writes
  the singleton `model.base_url`. There is **no `custom_providers[]` writer**
  anywhere in `config.ts` (grep confirms zero matches).
- `setCredentialPool` (`config.ts:744`) writes plain `{key,label}` entries to
  `auth.json` `credential_pool` — it never runs an OAuth flow, never mints a
  Nous agent key, never produces an `auth_type: oauth` pooled credential.
- A **Phase 5 OAuth surface is fully typed but NOT wired**:
  `shay-desktop-electron/src/preload/auth-domain.ts` declares
  `beginOAuth/finishOAuth/pollOAuth/addCredential/listCredentials/...` over
  channels `shay:auth:beginOAuth` etc., and `exposeAuthDomain()` mounts
  `window.shayAuthRpc`. There is an `admin/auth/AuthPage.tsx` +
  `admin/auth/OAuthLoginDialog.tsx` + `services/auth-service.ts` that consume
  it. **But the main process registers none of those channels** — grep for
  `shay:auth:beginOAuth` in `src/main/` returns nothing. The only registered
  auth handlers are the Phase 0 scaffold in
  `shay-desktop-electron/src/main/domains/auth.ts`, every method of which
  `throw new Error("NotImplemented: auth.<method>")` (`auth.ts:58,61`). So the
  desktop OAuth UI exists, is reachable in the admin area, and dies on the
  first call.

**Bottom line:** Shay cannot, from the desktop, add + authenticate a NEW
provider that needs OAuth (e.g. Nous Portal / Qwen Portal) or define a new
OpenAI-compatible `base_url` provider, without a human editing `config.yaml`.
From the CLI she can do almost all of it; only "create a new named custom
endpoint in one shot" and "register a wholly new OAuth portal" are missing.

---

## 3. Design — "Add Provider" flow on the desktop Providers page

The cleanest, lowest-risk design is **make the desktop drive the Python CLI**,
because `auth_add_command` already implements every flow correctly (device
code, external OAuth, api-key, custom pools) with correct token refresh and
file locking. The desktop should not reimplement OAuth in TypeScript; it should
become a thin UI over `shay auth`. This also keeps `auth.json`/`config.yaml`
single-writer (the Python side), avoiding the dual-writer hazard that already
exists between `config.ts` and `auth.py`.

### 3.1 New main-process domain: wire the Phase 5 channels to the CLI
Implement the already-declared channels from
`src/preload/auth-domain.ts` in a new `src/main/domains/auth-pool.ts` (leave the
Phase 0 `auth.ts` scaffold alone, as its header asks). The desktop already
spawns the hermes Python via `HERMES_PYTHON` + `hermesCliArgs()` in
`src/main/hermes.ts:684`; reuse that to run `shay` subcommands and parse
output. Register:

- **`shay:auth:listProviders`** → run a new read-only CLI command
  `shay providers list --json` (see 3.4) that emits `PROVIDER_REGISTRY` +
  `custom_providers` + which are authenticated (from `auth_list_command`'s
  data). This replaces the hardcoded `PROVIDERS.options` array so newly
  registered providers appear automatically. Until that CLI command exists,
  derive from `getCredentialPool()` + a static fallback.

- **`shay:auth:addCredential`** `{provider, method:"api-key", apiKey, label}`
  → `shay auth add <provider> --type api-key --api-key <key> --label <label>`
  (non-interactive; `auth_add_command` already reads `args.api_key`,
  `auth_commands.py:195`). Returns the new `CredentialRecord`.

- **`shay:auth:beginOAuth`** `{provider, method:"oauth"|"device-auth", label}`
  → spawn `shay auth add <provider> --type oauth --no-browser` as a *streaming*
  child process. Parse stdout for the device-code prompt
  (`_nous_device_code_login` prints "Open: <url>" + "enter code: <code>",
  `auth.py:5084`; codex prints the URL + user_code, `auth.py:4602`). Return
  `{flowId, url, userCode, pollIntervalMs}` to the renderer. Keep the child
  process handle in a `Map<flowId, ChildProcess>`.

- **`shay:auth:pollOAuth`** `{flowId}` → report whether the spawned child has
  printed its success line ("Saved … OAuth device-code credentials" /
  "Added … OAuth credential", `auth_commands.py:308/333`) and exited 0. On
  success return the `CredentialRecord`; while running return `pending`.

- **`shay:auth:finishOAuth`** — for setup-token/paste flows, write the pasted
  value to the child's stdin. For device-code Nous/codex, no input is needed
  (the user approves in the browser) so `finishOAuth` is a no-op confirmation.

- **`shay:auth:cancelOAuth`** `{flowId}` → kill the child process.

- **`shay:auth:removeCredential`** → `shay auth remove <provider> <target>`.

The renderer side already exists (`services/auth-service.ts` prefers
`window.shayAuthRpc`, `auth-service.ts:125`; `OAuthLoginDialog.tsx` renders the
device-code URL/code). So wiring the main handlers + a real
`OAuthBeginResult`/`pollOAuth` makes the existing admin OAuth UI live.

### 3.2 Add Provider modal on the Providers page
Add an **"+ Add Provider"** button on
`src/renderer/src/screens/Providers/Providers.tsx`. It opens a modal with a
3-way method selector, mirroring the CLI's interactive
`_interactive_add()` branch (`auth_commands.py:588`):

1. **Pick provider** — a searchable list sourced from `listProviders()`
   (no longer the hardcoded `PROVIDERS.options`). Include an
   **"Other / Custom endpoint…"** option at the bottom.

2. **Method**, auto-selected from the provider's `auth_type` (mirror
   `auth_add_command`'s default: OAuth for the OAuth-capable set, else
   api-key; `auth_commands.py:173`), but user-overridable for OAuth-capable
   providers (as the CLI does, `auth_commands.py:594`):
   - **API key**: one password input + optional label → `addCredential`.
   - **OAuth / device-code**: a "Sign in" button → `beginOAuth`; render the
     `OAuthLoginDialog` showing the verification URL (clickable, opens in the
     OS browser) and `userCode`, then poll `pollOAuth` until complete. This
     covers Nous Portal, OpenAI Codex, Qwen Portal, Gemini, MiniMax with zero
     new flow logic — they already exist in `auth.py`.
   - **Custom base_url**: see 3.3.

3. On success, refresh the credential-pool list (`getCredentialPool`) and the
   provider dropdown.

### 3.3 Custom OpenAI-compatible base_url registration
For "Other / Custom endpoint…", collect `{ name, base_url, api_key }` and:

1. Persist a `custom_providers[]` entry in `config.yaml`. Add a new CLI command
   `shay providers add-custom --name <n> --base-url <u> [--api-key <k>]` in the
   Python layer (writes the list entry the way `_iter_custom_providers`
   expects, `credential_pool.py:303`) and call it from the desktop — rather
   than teaching `config.ts` to mutate the YAML list (it has no list-aware
   writer and a naive write would clobber sibling entries; the config code even
   warns about this at `shay_cli/config.py:2622`). The Python `save_config`
   round-trips the full document safely.
2. Then `shay auth add custom:<normalized-name> --type api-key --api-key <k>`
   to seat the key in the `custom:<name>` pool (`auth_commands.py:163` already
   accepts `custom:` prefixed providers).
3. The new endpoint now resolves through `get_custom_provider_pool_key()`
   (`credential_pool.py:312`) and appears in `auth list` /
   `list_custom_pool_providers()`.

This gives Shay arbitrary OpenAI-compatible endpoints (new OpenAI-compatible
servers, self-hosted gateways, regional mirrors) with per-endpoint keys and no
hand-editing.

### 3.4 New read-only CLI helper (enables data-driven UI)
Add `shay providers list --json` emitting, per provider:
`{ id, name, auth_type, authenticated, base_url, env_vars, is_custom }`,
assembled from `PROVIDER_REGISTRY` (`auth.py:149`) + `custom_providers` +
`auth_list_command` pool data. The desktop consumes this for both the model
dropdown and the Add-Provider list, so a provider added via plugin
(`plugins/model-providers/<name>/`, auto-registered at `auth.py:419`) shows up
without any TypeScript edit. This closes the "hardcoded `PROVIDERS.options`"
half of the desktop gap.

### 3.5 Why CLI-driven over native TS OAuth
- `auth.py` already handles device-code polling, token refresh skew, Nous
  agent-key minting, shared-store mirroring, suppression markers, 0600 perms,
  and cross-process flock. Reimplementing in Electron main risks divergence and
  credential-store corruption (two writers).
- The desktop already shells out to the same Python for chat
  (`hermes.ts:684`), so the dependency and process model already exist.
- Single source of truth: every surface (CLI, desktop, future web) funnels
  registration through `shay auth` / `shay providers`.

---

## 4. Worked example — adding "Step-3.7-Flash via Nous Portal" through the flow

Step-3.7-Flash is served on the Nous Portal inference API, so it is **not a new
provider type** — it is a *model* under the existing `nous`
`oauth_device_code` provider (`PROVIDER_REGISTRY["nous"]`, `auth.py:150`,
inference `inference-api.nousresearch.com/v1`). The flow:

1. **Open Providers → "+ Add Provider".** Pick **Nous Portal** from the
   `listProviders()` list. Method auto-selects **OAuth / device-code** (Nous is
   in `_OAUTH_CAPABLE_PROVIDERS`).

2. **Click "Sign in".** Desktop calls `beginOAuth("nous","device-auth")`, which
   spawns `shay auth add nous --type oauth --no-browser`. That runs
   `_nous_device_code_login()` (`auth.py:5029`) → `_request_device_code` against
   `portal.nousresearch.com`. Main parses the printed
   `verification_uri_complete` + `user_code` and returns them as
   `OAuthBeginResult`.
   - If a shared Nous credential already exists, `auth_add_command` offers a
     one-tap import (`auth_commands.py:254`) — the desktop can pre-check via
     `_read_shared_nous_state` and skip straight to import.

3. **Approve in browser.** `OAuthLoginDialog` shows the URL (opens in the OS
   browser) and code. The user approves on Nous Portal.

4. **Poll to completion.** Desktop polls `pollOAuth(flowId)`. The CLI's
   `_poll_for_token` returns, `refresh_nous_oauth_from_state()` mints the agent
   key, `persist_nous_credentials()` (`auth.py:3484`) writes the pooled OAuth
   credential + provider state and mirrors to the shared store. CLI prints
   `Saved nous OAuth device-code credentials: "<label>"` (`auth_commands.py:308`);
   main detects the success line + exit 0 and returns the `CredentialRecord`.

5. **Select the model.** In the model section set provider **nous** and model
   `Step-3.7-Flash` (the exact model id Nous exposes) via `setModelConfig`
   (`config.ts:434`), writing `model.provider: nous` + `model.default:
   Step-3.7-Flash` to `config.yaml`. No `base_url` needed — `nous` carries its
   own `inference_base_url`, and the portal can override it at mint time
   (`auth.py:5109`).

6. **Done.** `resolve_provider()` picks `nous` (active provider with valid
   creds, `auth.py:1354` priority #1); runtime resolution refreshes the agent
   key automatically. Shay never touched `config.yaml` or `auth.json` by hand.

If instead Step-3.7-Flash were offered on a *new* OpenAI-compatible endpoint,
Shay would use the **Custom base_url** branch (3.3): name it, paste the
endpoint URL + key, and it is registered as a `custom_providers[]` entry with
its own `custom:<name>` key pool — again with no manual file editing.

---

## File reference index
- `shay-shay/shay_cli/auth.py` — `PROVIDER_REGISTRY` (`:149`), `ProviderConfig`
  (`:132`), `_nous_device_code_login` (`:5029`), `_codex_device_code_login`
  (`:4562`), `resolve_qwen_runtime_credentials` (`:1682`),
  `resolve_minimax_oauth_runtime_credentials` (`:4977`),
  `persist_nous_credentials` (`:3484`), `get_auth_status` (`:4036`),
  `write_credential_pool` (`:1128`), `resolve_provider` (`:1354`).
- `shay-shay/shay_cli/auth_commands.py` — `auth_add_command` (`:161`),
  `_OAUTH_CAPABLE_PROVIDERS` (`:36`), `auth_list_command` (`:401`),
  `auth_status_command` (`:473`), `_interactive_add` (`:588`).
- `shay-shay/agent/credential_pool.py` — `CUSTOM_POOL_PREFIX` (`:81`),
  `_iter_custom_providers` (`:286`), `get_custom_provider_pool_key` (`:312`),
  `list_custom_pool_providers` (`:342`).
- `shay-desktop-electron/src/renderer/src/screens/Providers/Providers.tsx` —
  live Providers UI; `handleAddPoolKey` (`:174`), api-key-only pool add.
- `shay-desktop-electron/src/renderer/src/constants.ts` — hardcoded
  `PROVIDERS.options` (`:17`).
- `shay-desktop-electron/src/main/config.ts` — `setModelConfig` (`:434`),
  `getCredentialPool` (`:737`), `setCredentialPool` (`:744`); no
  `custom_providers` writer.
- `shay-desktop-electron/src/main/domains/auth.ts` — Phase 0 scaffold,
  `NotImplemented` (`:58`).
- `shay-desktop-electron/src/preload/auth-domain.ts` — typed-but-unwired
  Phase 5 OAuth surface (`beginOAuth` etc.), `exposeAuthDomain` (`:230`).
- `shay-desktop-electron/src/renderer/src/services/auth-service.ts` (`:125`),
  `src/renderer/src/admin/auth/AuthPage.tsx`, `.../OAuthLoginDialog.tsx` —
  existing renderer OAuth UI awaiting live handlers.
- `shay-desktop-electron/src/main/hermes.ts` — `HERMES_PYTHON` spawn pattern
  (`:684`) to reuse for driving `shay auth`.