---
title: Buglog Lessons (mirrored for Shay)
synced: 2026-06-15 15:16:44.099057
source: .wolf/buglog.json
tags:
- buglog
- lessons
- mirror
permalink: shay-memory/lessons-mirror/buglog-mirror
---

# Buglog — last 30 lessons (mirrored into Shay's vault)

## #232 ()
**Issue:** window.hermesAPI undefined at runtime; renderer uses it 190x
**Root cause:** preload exposeInMainWorld('hermes', hermesAPI) but renderer + index.d.ts reference window.hermesAPI. Naming mismatch → all 190 legacy IPC calls hit undefined.
**Fix:** Also expose under 'hermesAPI' key (dual-expose). Verified at runtime: window.hermesAPI=object, 35 methods. Found by Phase 2 launch smoke.
**Tags:** ['electron', 'preload', 'hermesAPI', 'ipc', 'phase2', 'runtime']

## #233 (2026-05-31)
**Issue:** [planning] build_app: Create src/renderer/src/screens/AgentMonitor/index.tsx showi scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=['could not derive anchored edits after 3 tries; last raw[:160]=\'{"edits":[{"anchor":"import { useEffect, useState } from \\\'react\\\'\\\\n\\\\ninterface AgentH
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** FIXED: generated preload bindings for all 140 typed methods — 96 bound to real main channels (83 invoke + 13 events), 44 graceful stubs for unimplemented backends. QA gate (.ralph/qa_gate.mjs contract-check + visual_qa.py vision judge, npm run qa) now PASSES: 0 missing, 0 console errors. Remaining: real backends for the 44 stubbed features (tracked) + cosmetic CSS.
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #234 (2026-05-31)
**Issue:** [planning] build_app: Create Diagnostics screen showing system health; register ro scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=['could not derive anchored edits after 3 tries; last raw[:160]=\'{"edits":[{"anchor":"import { useEffect, useState } from \\\'react\\\'\\\\n\\\\ninterface Diagno
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #233 ()
**Issue:** Desktop runtime: window.hermesAPI.onChatChunk/listModels 'is not a function' — many IPC methods typed but not implemented
**Root cause:** index.d.ts declares ~140 HermesAPI methods (the contract the renderer + all screens trust) but the preload implements ~92 keys, ~35 resolve at runtime. The typed interface is AHEAD of the implementation. typecheck passes (types claim the methods exist); jsdom render-gate passes (Proxy stub answers any method); only a real Electron launch exposes it. So '20/20 screens' compile+build+boot but are NOT functional — they call IPC methods that don't exist.
**Fix:** FIXED: generated preload bindings for all 140 typed methods — 96 bound to real main channels (83 invoke + 13 events), 44 graceful stubs for unimplemented backends. QA gate (.ralph/qa_gate.mjs contract-check + visual_qa.py vision judge, npm run qa) now PASSES: 0 missing, 0 console errors. Remaining: real backends for the 44 stubbed features (tracked) + cosmetic CSS.
**Tags:** ['electron', 'preload', 'ipc', 'typed-vs-implemented', 'runtime', 'scaffolded-not-functional', 'phase2']

## #234 (2026-05-31)
**Issue:** [planning] useSyncExternalStore getSnapshot MUST return a cached/stable reference scored 9/10: Settings crashed with React #185 (Maximum update depth)
**Root cause:** getSettingsDirtyIds() returned new Set(dirtyGroups) every call -> useSyncExternalStore loops forever
**Fix:** Cache the snapshot; rebuild only when underlying data changes; return the stable ref
**Tags:** ['react', '#185', 'useSyncExternalStore', 'desktop', 'planning', 'self-learning']

## #235 (2026-05-31)
**Issue:** [planning] Dead-wiring: a real screen sits unimported behind a placeholder div scored 9/10: Kanban/Gateway/Diagnostics rendered <div>Kanban</div> while full 991/260-line impls existed unimported
**Root cause:** screenRegistry referenced inline placeholder consts; hand-maintained routing drifted from real screens
**Fix:** Import the real screen; a typed screen manifest makes this a compile error not a silent stub
**Tags:** ['routing', 'dead-wire', 'desktop', 'screenRegistry', 'planning', 'self-learning']

## #236 (2026-05-31)
**Issue:** [planning] Scan multi-line ipcMain.handle( registrations, not just single-line scored 8/10: Generated preload bindings stubbed 4+ real methods (add-memory-entry etc.) -> Memory editor broken
**Root cause:** channel-name grep required quote on same line as ipcMain.handle(; multi-line calls were missed
**Fix:** Parse with newline-tolerant regex/AST; verify generated bindings against runtime, never trust the scan
**Tags:** ['ipc', 'preload', 'codegen', 'desktop', 'planning', 'self-learning']

## #237 (2026-05-31)
**Issue:** [planning] Chat chrome must be screen-scoped, not global scored 8/10: Mode pills + New session + Pinned/Recents showed on every screen after chat became one of 19
**Root cause:** Original 'app = chat' framing promoted chat controls to the global shell
**Fix:** Gate chat-specific chrome on navView==='chat'; keep navigator+profile global
**Tags:** ['ia', 'ux', 'desktop', 'chat', 'planning', 'self-learning']

## #238 (2026-05-31)
**Issue:** [planning] Default to the designed dark theme; system->light renders flat white scored 7/10: App looked 'terrible/white' — defaulted to system theme on a light-mode Mac
**Root cause:** ThemeProvider default 'system'; tokens import + naming compat were also off
**Fix:** Default 'dark'; import tokens.css; alias legacy var names to canonical tokens
**Tags:** ['theme', 'css', 'desktop', 'planning', 'self-learning']

## #239 (2026-05-31)
**Issue:** [planning] Degrade gracefully on a missing IPC handler — never show raw errors scored 7/10: Settings showed raw 'No handler registered for shay:settings:get'
**Root cause:** service only swallowed NotImplemented, not missing-handler errors
**Fix:** Treat 'No handler registered' as NotImplemented -> fall through to defaults
**Tags:** ['ipc', 'ux', 'error-handling', 'desktop', 'planning', 'self-learning']

## #240 (2026-05-31)
**Issue:** [planning] 'Done' = runs + reachable + looks right + usable, not 'compiles' scored 10/10: Many units shipped 'done' while broken/white/unreachable; all passed typecheck
**Root cause:** Gates tested compile layer, below where failures lived; self-attested green
**Fix:** Require launch + runtime-contract + vision>=8 + nav-reachable + adversarial review as loop gates
**Tags:** ['process', 'qa', 'definition-of-done', 'do-not-repeat', 'planning', 'self-learning']

## #241 (2026-05-31)
**Issue:** [planning] Vision QA is the missing gate — blind gates can't see broken/ugly UI scored 9/10: White/unstyled/error screens passed typecheck+build+jsdom repeatedly
**Root cause:** No gate could SEE the rendered pixels
**Fix:** Add a vision-model screenshot judge (visual_qa) as a required gate; launch-test catches dead bridges
**Tags:** ['qa', 'vision', 'desktop', 'do-not-repeat', 'planning', 'self-learning']

## #242 (2026-05-31)
**Issue:** [planning] Swarm whole-file rewrite truncates large files; use it only for small/new files scored 6/10: multi_file_code_job had local brains rewrite 4 CSS files; SettingsShell (356L) was truncated mid-rule at line 211 (orphan '.'), ChatTabsRow (308L) silently dropped its trailing rule; typecheck:web PASSED on the truncated file — only the vite/postcss BUILD caught the broken CSS
**Root cause:** Local-brain (Gemini/Ollama) output length cap truncates whole-file regeneration of files beyond ~250 lines; typecheck does not parse CSS the way the bundler does — CSS truncation is invisible to it
**Fix:** Route whole-file swarm rewrites ONLY to small (<250L) or brand-new files; StatusBar (51L) and a new Providers stylesheet succeeded; For larger files use surgical_patch (anchored) not full rewrite, or section-by-section synthesis; ALWAYS run the real build (not just typecheck) as the gate after CSS edits; add brace-balance + line-count-delta sanity checks
**Tags:** ['swarm', 'multi_file_code_job', 'truncation', 'css', 'build-gate', 'do-not-repeat', 'planning', 'self-learning']

## #243 (2026-05-31)
**Issue:** [planning] Free LLM tiers have hard caps — track them, route by capability not just cost scored 8/10: Assumed 'free' models = unlimited; OpenRouter :free shares a 20 req/min + 200 req/day cap across ALL :free models on the key; Cerebras free = 1M tok/day but 8K ctx; Hermes/Nous Portal 'free' is free-for-subscribers, not truly free
**Root cause:** Free tiers are rate/volume/context-capped, not unlimited; a single shared quota throttles a multi-lane swarm
**Fix:** Treat free models as capability/tooling-specific picks for specific builds/research, not sustained swarm load; Spread lanes across providers (OpenRouter+Cerebras+Groq+NVIDIA-NIM+Google) so no single quota throttles; Add a per-model/provider FREE-LIMIT COUNTER: track req/min, req/day, tokens/day vs each tier's cap; surface 'near limit' + 'exhausted'; integrate with credential-pool rotation + low-funds notification
**Tags:** ['models', 'free-tier', 'rate-limits', 'quota', 'registry', 'do-not-repeat', 'planning', 'self-learning']

## #244 (2026-05-31)
**Issue:** [planning] Two-level nav IA: icon rail + per-domain secondary nav beats a flat screen list scored 8/10: 19 screens were dumped flat under a 'SCREENS' label; design mistake papered over with CSS
**Root cause:** Flat nav doesn't scale; Claude Desktop uses a two-level model
**Fix:** Typed manifest (ScreenId/DomainId) as single source of truth; DomainRail + SecondaryNav derive from it; Record<ScreenId> registry makes drift a compile error
**Tags:** ['desktop', 'nav', 'IA', 'manifest', 'planning', 'self-learning']

## #245 (2026-05-31)
**Issue:** [planning] A kanban worker lane = a profile; one profile = no parallelism scored 9/10: Every card showed @default; assumed boards gave parallelism
**Root cause:** Dispatcher routes by assignee→profile on disk; cards to non-existent profiles are silently dropped
**Fix:** Create specialist profiles (researcher/builder/reviewer/orchestrator) as lanes; assign cards per lane; --max concurrency; spread free models across providers (shared :free caps)
**Tags:** ['kanban', 'swarm', 'profiles', 'do-not-repeat', 'planning', 'self-learning']

## #246 (2026-05-31)
**Issue:** [planning] Local-brain whole-file rewrite truncates files >~250 lines; build gate is the backstop scored 9/10: Gemini swarm truncated SettingsShell mid-rule; typecheck passed on truncated CSS
**Root cause:** Output token cap truncates large whole-file regen; typecheck doesn't parse CSS like the bundler
**Fix:** Route large existing files to surgical_patch not full rewrite; cap new files <=250 lines; ALWAYS run npm build as a gate, not just typecheck
**Tags:** ['swarm', 'truncation', 'gates', 'do-not-repeat', 'planning', 'self-learning']

## #247 (2026-05-31)
**Issue:** [planning] Desktop must DO what the CLI does — per-item detail-drawer carrying full CLI verbs scored 8/10: Pages stopped at 'list + one verb' (Skills toggles only vs 14 CLI subcommands)
**Root cause:** Read-only mirrors miss CLI-parity; users expect to act
**Fix:** Build a reusable DetailDrawer/CliVerbPanel template; every weak page wires its full CLI verb set
**Tags:** ['desktop', 'cli-parity', 'template', 'planning', 'self-learning']

## #248 (2026-05-31)
**Issue:** [planning] Verify the packaged artifact + real window, not just the dev build / vision model scored 7/10: Reported app fine via Playwright on out/, then a zombie window showed white screen; vision gave false 'cut off' positives
**Root cause:** dev build != packaged app; stale instances mislead; vision model hallucinates defects
**Fix:** Screencapture the real packaged window for OS-chrome checks; trust own eyes over vision text; kill stale instances before judging
**Tags:** ['qa', 'verification', 'do-not-repeat', 'planning', 'self-learning']

## #249 (2026-05-31)
**Issue:** [planning] build_app: Add an '+ Add Provider' flow to the Providers screen (src/re scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=["src/renderer/src/screens/Providers/AddProviderModal.tsx(204,6): error TS17008: JSX element 'div' has no corresponding closing tag.", 'src/renderer/src/screens/P
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #250 (2026-05-31)
**Issue:** [planning] build_app: Create a new Insights screen (src/renderer/src/screens/Insig scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=["src/renderer/src/screens/Insights/Insights.tsx(2,17): error TS2307: Cannot find module '@mui/material/Box' or its corresponding type declarations.", 'src/render
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #251 (2026-05-31)
**Issue:** [planning] build_app: Create an Inbox screen (src/renderer/src/screens/Inbox/Inbox scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=['src/renderer/src/screens/Inbox/Inbox.tsx(200,13): error TS1109: Expression expected.'] render=None
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #252 (2026-05-31)
**Issue:** [planning] Fritz OK to spend credits on builds — use DeepSeek/Kimi as a mid-tier build brain; aspire to 300-agent swarm scored 8/10: Build lane was Gemini-only (free) which thrashes on render-spine UI; Claude is proven but capped
**Root cause:** No mid-tier build brain between free-Gemini and capped-Claude
**Fix:** Build-lane brain ladder: try Kimi-k2.6 (best open agentic+vision) / DeepSeek-v4-flash (reasoning, 1M ctx) on OpenRouter FIRST, escalate to Claude only on repeated block. Fritz is OK spending some OpenRouter credits on builds.; Enables CROSS-VENDOR same-task redundancy for real (Claude+Kimi+DeepSeek = uncorrelated errors = high-value); 300-agent swarm is achievable: no hard ceiling exists; spread the 300 across OpenRouter(deepseek/kimi/free)+Cerebras+Groq+NVIDIA-NIM+Ollama so no single rate-cap throttles. Goal aspiration.
**Tags:** ['models', 'build-lane', 'deepseek', 'kimi', 'swarm-scale', 'standing-preference', 'planning', 'self-learning']

## #253 (2026-05-31)
**Issue:** [planning] Full-context Claude build-agent beats build_app for screens; QA swarm catches IPC channel mismatches scored 9/10: build_app loop blocked on every full screen (truncated context, hallucinated MUI); models:list had no handler (channel mismatch) — passed typecheck+build but threw at runtime
**Root cause:** build_app's per-file context window is too small for full screens; typecheck/build don't catch missing-runtime-IPC-handler; only a navigated render+console-error sweep does
**Fix:** For real screen builds, spawn a full-context Claude build-agent (full repo read, gate-before-commit) — it shipped 5 screens clean where build_app blocked 5; QA = navigated Playwright-electron sweep (domain-first nav) + console/page-error capture + vision judge; this caught the models:list mismatch; Vision model over-flags ellipsis truncation — weight functionality (0 console errors) over vision style nitpicks; fix shared nav/label width once
**Tags:** ['build-agent', 'qa', 'ipc', 'do-not-repeat', 'desktop', 'planning', 'self-learning']

## #shay-compression-ctx-floor (2026-06-06T01:04:02.158420)
**Issue:** Failed to initialize agent: Auxiliary compression model qwen3:14b context (40,960) is below the minimum 64,000 required for compression.
**Root cause:** Shay auto-summarizes/compresses context when the window fills using an AUX model. The configured compression model qwen3:14b is served by Ollama at its default num_ctx 40,960, which is under the compressor hard floor of 64,000 → agent init aborts. Recurs because ~/.shay/config.yaml is runtime (not git-tracked) and resets on nuke/reinstall, dropping any prior override.
**Fix:** Point compression at a big-context local model already installed: set auxiliary.compression.model: hermes3:latest (131K native ctx) and context_length: 131072. Robust alternative (keep qwen3): set auxiliary.compression.context_length: 65536 AND ensure Ollama serves qwen3 with num_ctx>=65536. Durable restore snippet tracked at shay-agent-os/config/shay-aux-compression.fix.yaml; apply after any ~/.shay reset.
**Tags:** ['shay', 'compression', 'context-window', 'aux-model', 'config', 'recurring', 'ollama']

## #bug-274 (2026-06-08T13:57:39.448685Z)
**Issue:** Streaming failed after partial delivery, not retrying: The read operation timed out (Shay gateway, glm-5.1 via Z.AI). Long answers truncated to a few-hundred-char stub.
**Root cause:** Stream httpx read timeout is a flat 120s for cloud providers (SHAY_STREAM_READ_TIMEOUT default, run_agent.py:7774). GLM-5.1 is a reasoning model; on long outputs the gap between streamed tokens exceeds 120s, triggering ReadTimeout. On stream timeout the code logs 'not retrying' and does NOT fail over to fallback_providers (codex/ollama/gemini), so one slow reasoning gap kills the whole turn with no recovery. Worse for longer answers.
**Fix:** Immediate: raise read timeout for the glm provider (per-provider request timeout override, or SHAY_STREAM_READ_TIMEOUT=600 in the gateway launchd env) + restart gateway. Durable: on stream stall, fail over to next provider instead of 'not retrying'; size read/idle timeout to provider class (reasoning models get a longer idle budget) and detect true stalls via heartbeat, not a flat read timeout.
**Tags:** ['shay', 'gateway', 'streaming', 'timeout', 'glm', 'z.ai', 'failover', 'reasoning-model', 'brain-router']

## #bug-275 (2026-06-08T14:26:53.919966Z)
**Issue:** web_extract LLM summarization failed: Gemini HTTP 404 models/glm-5.1 is not found for API version v1beta (43 occurrences).
**Root cause:** auxiliary.web_extract was provider:auto with empty model. 'auto' resolved to the Gemini endpoint but passed the global default model id 'glm-5.1', which is not a Gemini model -> 404. Same latent risk in other auto+empty entries (vision needs a vision model so keep auto; kanban_decomposer/profile_describer share the risk).
**Fix:** Pinned auxiliary.web_extract to local ollama hermes3:latest (base_url http://localhost:11434/v1), matching compression/session_search. Zero-cost, no endpoint/key mismatch. Restart gateway to apply.
**Tags:** ['shay', 'config', 'auxiliary', 'web_extract', 'gemini', '404', 'model-provider-mismatch', 'ollama']

## #bug-276 (2026-06-08T22:08:05.960879Z)
**Issue:** agent.auxiliary_client: resolve_provider_client: unknown provider 'ollama' | root: Fallback to ollama failed: provider not configured. Whole agent call dies after paid providers exhausted (glm 429, groq 401, cerebras 400).
**Root cause:** model_aliases (local-olm-*) and fallback_providers referenced provider:ollama, but 'ollama' was never defined in the top-level providers: dict. resolve_provider_client resolves named providers via _get_named_custom_provider which reads providers:; no built-in ollama in PROVIDER_REGISTRY (resolve_provider('ollama')->'custom'), so without a providers: entry it logs 'unknown provider' and returns (None,None).
**Fix:** Added ollama to providers: in ~/.shay/config.yaml (base_url http://localhost:11434/v1, key_env OLLAMA_API_KEY, api_mode chat_completions). load_config caches on (mtime,size) so the edit auto-invalidates — no gateway restart. Ollama needs no key; resolver substitutes 'no-key-required'. Verified end-to-end through Shay's resolved client.
**Tags:** ['shay', 'config', 'ollama', 'fallback', 'provider-resolution', 'unknown-provider', 'local-model']

## #bug-277 (2026-06-08T22:08:05.960879Z)
**Issue:** HTTP 400: messages.N.assistant.reasoning_content: property 'messages.N.assistant.reasoning_content' is unsupported (provider=custom base_url=https://api.cerebras.ai/v1 model=llama-3.3-70b).
**Root cause:** reasoning_content carries chain-of-thought and is REQUIRED by thinking providers (GLM/z.ai, DeepSeek V4, Kimi) which 400 if it's omitted on replayed tool-call turns, so Shay bakes it into persisted history. Strict OpenAI-compat backends (Cerebras, Groq, Mistral, Fireworks) reject the unknown field with 400. Existing strip only fired for non-string values; no provider-aware strip existed. Cerebras resolves via the generic 'custom' provider path, so name-only detection misses it.
**Fix:** Added AIAgent._provider_rejects_reasoning_content() (matches provider name {cerebras,groq,mistral,fireworks} AND base_url host). Strip reasoning_content for those providers at both api_message build sites after _copy_reasoning_content_for_api. Works during fallback (self.provider/base_url updated in place; api_messages rebuilt each attempt). 83 reasoning/custom-provider tests pass; thinking-provider echo-back unaffected.
**Tags:** ['shay', 'run_agent', 'reasoning_content', 'cerebras', 'groq', 'strict-openai-compat', '400', 'thinking-mode']

## #bug-278 (2026-06-08T22:42:56.063386Z)
**Issue:** HTTP 400 exceed_context_size_error: request (12690 tokens) exceeds the available context size (4096 tokens) ... n_ctx:4096. Then: 'Context length exceeded: max compression attempts (3) reached.' Shay stepped down 131072->128000 (too slowly) and gave up.
**Root cause:** Ollama.app launches llama-server with -c 4096 (its default) regardless of the model's trained max. OLLAMA_CONTEXT_LENGTH was unset. Shay's query_ollama_num_ctx reads the GGUF max (131072) from /api/show, NOT the runtime -c, so Shay thought it had 131k, never compressed below 4k, and every real prompt (Shay's SOUL+PERSONA baseline alone is ~7k tokens) 400'd. Same root cause made qwen3 'feel too small' earlier — it was the 4096 ceiling, not the 41k model limit. Hardware limit: 16GB RAM caps a local 8B context to ~16-32k; 131k KV would need ~17GB.
**Fix:** Enabled flash-attn + q8_0 KV-cache quantization on the Ollama server (launchctl setenv OLLAMA_FLASH_ATTENTION=1, OLLAMA_KV_CACHE_TYPE=q8_0) so 32k KV fits in ~2GB instead of ~4GB; restarted Ollama.app. Created model variants hermes3-32k / deepseek-r1-32k / qwen3-32k with 'PARAMETER num_ctx 32768' baked in (Modelfile FROM base — shares weights). num_ctx in the Modelfile makes BOTH Ollama load at 32k AND query_ollama_num_ctx report 32768 (it reads Modelfile params), so Shay's compression threshold is correct for the brain AND every fallback. Pointed config model.default + fallback_providers at the -32k variants and set model.context_length:32768. Verified: llama-server loads -c 32768 + q8_0 K/V + flash-attn on; a 15k-token prompt that previously 400'd now succeeds. NOTE: the KV-quant env is launchctl-session-scoped (resets on reboot); persistence via a login LaunchAgent was proposed but NOT installed (needs Fritz approval). num_ctx variants DO persist.
**Tags:** ['shay', 'ollama', 'context-window', 'num_ctx', 'kv-cache-quant', 'q8_0', '16gb-ram', 'config', '400', 'exceed_context_size']