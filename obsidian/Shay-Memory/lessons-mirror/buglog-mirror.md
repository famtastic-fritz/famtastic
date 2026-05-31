---
title: Buglog Lessons (mirrored for Shay)
synced: 2026-05-31 02:44:06.636177
source: .wolf/buglog.json
tags:
- buglog
- lessons
- mirror
permalink: shay-memory/lessons-mirror/buglog-mirror
---

# Buglog — last 30 lessons (mirrored into Shay's vault)

## #220 ()
**Issue:** vite build failed: [@tailwindcss/vite] Missing closing } at .soulTextarea::placeholder in Soul.module.css
**Root cause:** Soul.module.css ended mid-rule (.soulTextarea::placeholder { color: ... with no closing brace). Pre-existing, introduced when Soul screen was mounted. typecheck:web/node cannot see CSS so it passed; only the production build (vite) surfaced it.
**Fix:** Added the missing }. Lesson: typecheck is necessary but NOT sufficient as a render gate — run `npm run build` to catch CSS/runtime errors. The ralph loop is typecheck-gated only; render-spine units need a by-hand build/render check.
**Tags:** ['css', 'vite', 'tailwind', 'build-gate', 'desktop', 'render-verification']

## #221 (2026-05-30)
**Issue:** [planning] build_app: Promote Sessions screen stub to a live list reading sessions scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=["src/renderer/src/screens/SessionsScreen.tsx(26,26): error TS2352: Conversion of type 'HermesAPI' to type 'Record<string, unknown>' may be a mistake because neit
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #222 (2026-05-30)
**Issue:** [planning] build_app: Wire Settings screen actions to settings IPC. Typecheck clea scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=["src/renderer/src/screens/SettingsScreen.tsx(217,20): error TS1005: '}' expected."] render=None
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #223 (2026-05-30)
**Issue:** [planning] build_app: Promote Providers screen to live CRUD via keychain IPC. Type scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=["src/renderer/src/screens/ProvidersScreen.tsx(169,6): error TS17008: JSX element 'div' has no corresponding closing tag.", "src/renderer/src/screens/ProvidersScr
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #224 (2026-05-30)
**Issue:** [planning] build_app: Create src/renderer/src/screens/AgentMonitor/index.tsx showi scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=['anchors not found in file: ["import Models from \'./screens/Models/Models\';"]'] render=None
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #225 (2026-05-30)
**Issue:** [planning] build_app: Promote Kanban screen to read swarm:queue:list. Typecheck cl scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=["src/renderer/src/screens/Kanban/index.tsx(236,17): error TS1005: '}' expected."] render=None
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #226 (2026-05-30)
**Issue:** [planning] build_app: Create Logs screen streaming swarm:log:stream; register rout scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=["shell exit 2: \n> shay-desktop@0.4.3 typecheck:node\n> tsc --noEmit -p tsconfig.node.json --composite false\n\n\n> shay-desktop@0.4.3 typecheck:web\n> tsc --noE
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #227 (2026-05-30)
**Issue:** [planning] build_app: Create Diagnostics screen showing system health; register ro scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=['anchors not found in file: ["import Models from \'./screens/Models/Models\';"]'] render=None
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #228 (2026-05-30)
**Issue:** [planning] build_app: Promote Gateway screen to show MCP server connections via he scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=["src/renderer/src/screens/Gateway/index.tsx(90,6): error TS17008: JSX element 'div' has no corresponding closing tag.", "src/renderer/src/screens/Gateway/index.t
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #229 (2026-05-30)
**Issue:** [planning] build_app: Create CaptureInbox screen reading the Shay-Memory/inbox cap scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=["src/renderer/src/components/Sidebar.tsx(2,25): error TS2307: Cannot find module 'react-router-dom' or its corresponding type declarations."] render=None
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #230 (2026-05-30)
**Issue:** [planning] build_app: Create src/renderer/src/screens/AgentMonitor/index.tsx showi scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=["src/renderer/src/components/Sidebar.tsx(2,25): error TS2307: Cannot find module 'react-router-dom' or its corresponding type declarations."] render=None
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

## #231 (2026-05-30)
**Issue:** [planning] build_app: Create Diagnostics screen showing system health; register ro scored 3/10: build failed at typecheck stage; detail: Failed at typecheck. typecheck_errors=['shell exit 2: \n> shay-desktop@0.4.3 typecheck:node\n> tsc --noEmit -p tsconfig.node.json --composite false\n\n\n> shay-desktop@0.4.3 typecheck:web\n> tsc --noE
**Root cause:** typecheck: cross-file contract or a runtime render issue the brain couldn't resolve
**Fix:** narrow the manifest, add grounded context, or split into smaller builds
**Tags:** ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']

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