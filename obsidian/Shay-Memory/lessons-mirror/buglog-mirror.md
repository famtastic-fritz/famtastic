---
title: Buglog Lessons (mirrored for Shay)
synced: 2026-06-01 06:44:19.908272
source: .wolf/buglog.json
tags:
- buglog
- lessons
- mirror
permalink: shay-memory/lessons-mirror/buglog-mirror
---

# Buglog — last 30 lessons (mirrored into Shay's vault)

## #232 (2026-05-31)
**Issue:** [planning] build_app: Promote Providers screen to live CRUD via keychain IPC. Type scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=["src/renderer/src/screens/Providers/index.tsx(193,6): error TS17008: JSX element 'div' has no corresponding closing tag.", "src/renderer/src/screens/Providers/in
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #233 (2026-05-31)
**Issue:** [planning] build_app: Create CaptureInbox screen reading the Shay-Memory/inbox cap scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=["shell exit 2: \n> shay-desktop@0.4.3 typecheck:node\n> tsc --noEmit -p tsconfig.node.json --composite false\n\n\n> shay-desktop@0.4.3 typecheck:web\n> tsc --noE
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** FIXED: generated preload bindings for all 140 typed methods — 96 bound to real main channels (83 invoke + 13 events), 44 graceful stubs for unimplemented backends. QA gate (.ralph/qa_gate.mjs contract-check + visual_qa.py vision judge, npm run qa) now PASSES: 0 missing, 0 console errors. Remaining: real backends for the 44 stubbed features (tracked) + cosmetic CSS.
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #234 (2026-05-31)
**Issue:** [planning] build_app: Promote Providers screen to live CRUD via keychain IPC. Type scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=["src/renderer/src/screens/Providers/index.tsx(210,6): error TS17008: JSX element 'div' has no corresponding closing tag.", 'src/renderer/src/screens/Providers/in
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #235 (2026-05-31)
**Issue:** [planning] build_app: Create src/renderer/src/screens/AgentMonitor/index.tsx showi scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=["shell exit 2: \n> shay-desktop@0.4.3 typecheck:node\n> tsc --noEmit -p tsconfig.node.json --composite false\n\n\n> shay-desktop@0.4.3 typecheck:web\n> tsc --noE
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #236 (2026-05-31)
**Issue:** [planning] build_app: Create Diagnostics screen showing system health; register ro scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=["shell exit 2: \n> shay-desktop@0.4.3 typecheck:node\n> tsc --noEmit -p tsconfig.node.json --composite false\n\n\n> shay-desktop@0.4.3 typecheck:web\n> tsc --noE
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #231 ()
**Issue:** Electron app: 'Unable to load preload script ... module not found: node:fs' — window.hermesAPI/shay never exposed at runtime
**Root cause:** preload/domains.ts imports buildPreloadBindings (value) from main/domains/* which co-locate node:fs main-process code; electron-vite bundles node:fs into the sandboxed preload (sandbox:true), which cannot load it. Latent since the domains refactor (Desk Phase 5); undetected because nothing launched the real app — typecheck/build/jsdom all pass.
**Fix:** sandbox:false on main window (contextIsolation kept). TODO clean: split buildPreloadBindings into fs-free preload-safe modules, restore sandbox:true. Found by the Phase 2 Playwright electron launch smoke (.ralph/electron-smoke.mjs).
**Tags:** ['electron', 'preload', 'sandbox', 'node:fs', 'ipc-bridge', 'phase2']

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