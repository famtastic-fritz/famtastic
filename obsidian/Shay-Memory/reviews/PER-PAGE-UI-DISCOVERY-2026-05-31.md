---
title: PER-PAGE-UI-DISCOVERY-2026-05-31
type: note
permalink: shay-memory/reviews/per-page-ui-discovery-2026-05-31
---

# Shay Desktop — Per-Page UI Discovery & Evaluation

**Date:** 2026-05-31
**Scope:** READ-ONLY, per-page discovery + UX evaluation of all 19 manifest screens (plus the planned Inbox/Interview surfaces) in `shay-desktop-electron`, through a **CLI-parity + UX-quality** lens.
**Method:** Static read of `src/renderer/src/screens/*` and `manifest.ts`; full enumeration of `~/.local/bin/shay --help` and every relevant sub-help; cross-reference against `reviews/PAGES-AND-CLI-MAP-2026-05-31.md`; reference patterns from `~/famtastic/_refs/hermes-webui` (the real Hermes/Nous web UI — vanilla-JS, Python-served, claims "full CLI parity") and Claude Desktop.

## Core principle applied throughout
**If the `shay` CLI can DO it, the desktop page for that domain should let you DO it — not merely view or toggle it.** A page that only lists/toggles items the CLI can also edit/configure/lifecycle-manage is a *parity gap*, not a finished page. The two worst offenders by this test are **Skills** (CLI has 13 subcommands incl. `config`, `tap`, `snapshot`, `update`, `audit`; desktop does install/uninstall/view only) and **Kanban** (rich CLI + rich component that is *dead-wired to a `<div>` placeholder*).

A note that frames everything below: hermes-webui's entire thesis is **"everything you can do from a terminal, you can do from this UI."** Shay Desktop has a *more polished shell* than hermes-webui but is *further from CLI parity* on a per-page basis. The gap is not the shell — it's that most screens stopped at "list + one action."

---

# PART 1 — Per-page sections

State legend: **WIRED** (real IPC + meaningful actions), **PARTIAL** (real backend, thin/read-only), **STUB** (placeholder rendered; real component exists but unimported), **PLACEHOLDER** (synthetic/fake data).

---

## Chat — `cli: chat`  · domain: chat
1. **Purpose.** Primary agent conversation surface: streaming responses, tool-call progress, attachments, model + toolset selection per turn.
2. **CLI capabilities.** `shay chat` (interactive), `-z/--oneshot`, `-m/--model`, `--provider`, `-t/--toolsets`, `--resume/-r`, `--continue/-c`, `--skills/-s`, `--worktree`, `--yolo`, `--pass-session-id`, `--tui`.
3. **Current desktop capability.** Send/abort, streaming chunk/done/error/tool-progress/usage events, model picker, toolset toggles, drag/stage attachments, slash commands, reads soul/memory for context. ~20 API calls. Richest screen in the app.
4. **PARITY GAPS.** Minor: no in-chat **per-turn skill preload** picker (`--skills`), no **worktree** toggle for isolated runs, no explicit `--provider` override surfaced separately from model. No `--resume by title` affordance from inside chat (lives in Sessions).
5. **UX evaluation.** Strong. This is the one screen that is genuinely Claude-Desktop-class. The only structural weakness vs hermes-webui is that Shay scatters model/profile/toolset controls; hermes-webui consolidates **model + profile + workspace into a persistent composer footer** with a **circular context ring** showing token usage at a glance — a better always-visible pattern than menu-buried togglers.
6. **Recommendation.** Adopt hermes-webui's **composer footer**: model + profile + workspace + skills-preload chips + a live context/token ring inline with the input. Add a `--worktree` "isolated run" toggle for power users.

---

## Sessions — `cli: sessions`  · domain: chat
1. **Purpose.** Browse/search/resume session history.
2. **CLI capabilities.** `sessions {list, export, delete, prune, stats, rename, browse}`.
3. **Current desktop capability.** `listCachedSessions`, `searchSessions`, `syncSessionCache`, resume (lifts `currentSessionId`). List + full-text search + resume.
4. **PARITY GAPS.** Missing **rename**, **export** (JSONL), **delete**, **prune** (delete old), and **stats** (store statistics). The CLI has a complete management surface; the desktop is read+resume only — ~5 of 7 verbs absent.
5. **UX evaluation.** Functional but a dead-end: you can find a session but can't curate the store. hermes-webui session panel exposes **projects, tags, and rename/delete inline** plus session content search; Claude Desktop offers rename + delete + star from a hover row menu.
6. **Recommendation.** Add a per-row hover menu (rename inline, delete with confirm, export-to-JSONL), a bulk "Prune older than N days" action, and a small **stats header** (count, size, oldest) sourced from `sessions stats`. Borrow hermes-webui's project/tag grouping so the list scales.

---

## Profiles (Agents) — `cli: profile`  · domain: agents
1. **Purpose.** Manage multiple isolated Shay instances (profiles).
2. **CLI capabilities.** `profile {list, use, create, delete, show, alias, rename, export, import, install, update, info}` — 11 verbs, including **distribution install from git URL** and **update (re-pull, preserve user data)**.
3. **Current desktop capability.** `createProfile`, `deleteProfile`, `listProfiles`, `setActiveProfile`. 4 of 11 verbs.
4. **PARITY GAPS.** Missing **show/info** (distribution manifest: version, requirements, source), **alias** (wrapper scripts), **rename**, **export/import** (archive portability), and the entire **distribution lifecycle** (`install` from git, `update`). The profile system is clearly a distributable-agent platform in the CLI; the desktop treats it as a flat name list.
5. **UX evaluation.** This page massively under-uses its domain. Profiles are the unit of multi-agent identity (they back Kanban assignees and gateway routing), yet the page can't show what a profile *is* or where it came from.
6. **Recommendation.** A profile **detail drawer**: identity (alias/rename), distribution manifest (`info`), export/import buttons, and an "Install distribution from git URL" action with an Update button when a newer version exists. This is the closest Shay has to an "agent marketplace" surface — Claude Desktop has no equivalent, so this is a differentiation opportunity.

---

## Agent Monitor — (no `cli` mapping)  · domain: agents
1. **Purpose.** Live heartbeat view of running agents.
2. **CLI capabilities.** No dedicated `monitor` command. The real telemetry sources are `kanban heartbeat` / `kanban runs` / `kanban watch` (live `task_events` stream), `gateway status`, and `status`.
3. **Current desktop capability.** Polls `isRemoteMode()` every 5s and synthesizes **one fake "gateway" row** (`status: remoteMode ? running : idle`). Inline-styled table, hardcoded hex colors.
4. **PARITY GAPS.** Essentially total — it shows no real agents. There is a genuine telemetry source (`kanban runs`/`watch`, per-profile gateway status) it doesn't touch.
5. **UX evaluation.** This is the weakest screen in the app after the two stubs — a **PLACEHOLDER masquerading as a feature**. It also violates the project's CSS rule (inline styles, raw hex).
6. **Recommendation.** Wire it to the real sources: one row per **profile** (from `profile list`) showing its gateway status + current kanban run (`runs`/`heartbeat`) + last-seen. Subscribe to `kanban watch` event stream for live updates instead of a 5s probe. If a real multi-agent telemetry channel doesn't exist yet, this page should be **merged into Kanban as a "Runs" tab** rather than shipped as a fake.

---

## Skills — `cli: skills`  · domain: agents  ⚠ HIGH-LEVERAGE
1. **Purpose.** Discover, install, and manage skills (from skills.sh, GitHub, ClawHub, registries).
2. **CLI capabilities.** `skills {browse, search, install, inspect, list, check, update, audit, uninstall, reset, publish, snapshot, tap, config}` — **14 subcommands.** Critically: `config` = *interactive enable/disable of individual skills*; `tap` = manage skill **sources/registries**; `snapshot` = export/import skill config; `check`/`update`/`audit` = update lifecycle; `reset` = clear user-modified tracking; `inspect` = preview before install; `publish` = push to a registry.
3. **Current desktop capability (`Skills.tsx`, 433 lines).** Two tabs (Installed / Browse), search, category pills (browse only), a detail modal showing `SKILL.md` via `AgentMarkdown`, **install**, **uninstall**, refresh. That's it: `listBundledSkills`, `listInstalledSkills`, `getSkillContent`, `installSkill`, `uninstallSkill`.
4. **PARITY GAPS — the canonical example.** Desktop exposes ~4 of 14 CLI verbs. Missing:
   - **`config` (enable/disable individual skills)** — the single most important miss. The CLI lets you turn a skill on/off without uninstalling; the desktop forces uninstall/reinstall. This is the exact "CLI can edit, desktop can only add/remove" failure the brief calls out.
   - **`update`/`check`/`audit`** — no "updates available" badge, no update button. Installed skills silently go stale.
   - **`tap`** — no UI to add a skill source/registry (skills.sh, a GitHub org, ClawHub). The Browse tab is implicitly locked to bundled sources.
   - **`snapshot`** — no export/import of skill config (portability across machines/profiles).
   - **`inspect`** — desktop's detail modal is close, but it's view-of-installed; no pre-install dry-run preview from a remote source.
   - **`reset`/`publish`** — no surface for editing a bundled skill then resetting, or publishing an authored skill.
   - **No editing.** You cannot edit `SKILL.md` in-app even though it's the agent's most-edited artifact. (Soul.md gets a full editor; skills get read-only markdown.)
   - **No curator integration** (see Curator gap below) — no view of which skills the background curator has archived/pinned.
5. **UX evaluation.** The card grid is clean and accessible (good keyboard/aria), but it's a **store browser bolted onto a non-editor**. It treats skills as immutable packages when the CLI treats them as a living, configurable, editable, source-pluggable library. This is the page that most under-uses its potential.
6. **Recommendation.** Promote Skills to a real management surface:
   - **Per-skill enable/disable toggle** on each card (back with `skills config`) — *separate from* install/uninstall, mirroring how Tools already does enable/disable.
   - **Edit `SKILL.md` in-app** (reuse the Soul editor component) with a Reset button (`skills reset`).
   - An **"Updates" affordance**: badge installed skills with available updates (`skills check`), one-click `update`, plus `audit`.
   - A **Sources panel** (`skills tap` add/remove) so Browse can pull from arbitrary registries — this is what makes Browse meaningful.
   - A **Curator strip** (pinned/archived/restore) — see Curator.
   - **Reference:** hermes-webui's skills story is "self-improving skills, no marketplace to browse" — its panel is search + `SKILL.md` preview, intentionally lighter. Claude Desktop has no skill manager. So this is a place Shay can *lead*, but only if it becomes an editor + configurator, not a thinner store than hermes-webui.

---

## Persona (Soul) — `cli: soul`  · domain: agents
1. **Purpose.** Edit the agent's `SOUL.md` persona document.
2. **CLI capabilities.** read / write / reset soul.
3. **Current desktop capability.** `readSoul`, `writeSoul`, `resetSoul` — full read/write/reset editor.
4. **PARITY GAPS.** None of consequence. This is the parity model the rest of the app should imitate.
5. **UX evaluation.** Good — a real editor for a real artifact. (Ironically, Skills should *be* this.)
6. **Recommendation.** Add version/diff + a "revert to default" preview before reset. Otherwise leave as the reference pattern.

---

## Models — `cli: model`  · domain: agents
1. **Purpose.** Manage the model catalog and default model/provider.
2. **CLI capabilities.** `model` (interactive default picker); related `fallback {list, add, remove, clear}` (fallback chain tried on primary failure).
3. **Current desktop capability.** `addModel`, `updateModel`, `removeModel`, `listModels`, `setEnv` (keys). Full CRUD on the catalog + set default.
4. **PARITY GAPS.** The **fallback chain** (`fallback add/remove/clear`, ordered) is not clearly editable here or on Providers — it's the main miss in the models/providers cluster.
5. **UX evaluation.** Solid CRUD. The fallback chain is a power feature with no home.
6. **Recommendation.** Add an ordered, drag-reorderable **Fallback Chain** editor (add via the same picker as default, remove, clear) either here or on Providers.

---

## Providers — `cli: auth`  · domain: agents
1. **Purpose.** Provider configuration + pooled credentials.
2. **CLI capabilities.** `auth {add, list, remove, reset, status, logout, spotify}` (pooled creds + exhaustion reset); plus top-level `login`/`logout`.
3. **Current desktop capability.** get/set config + model config, `getCredentialPool`/`setCredentialPool`, env, add model.
4. **PARITY GAPS.** Reads/sets the pool as a blob, but no **per-credential add/remove/reset/status** and no **exhaustion-clear** (`auth reset`) UI. No per-credential label/index management. Spotify PKCE auth unsurfaced.
5. **UX evaluation.** Pool-as-opaque-blob hides the most operationally useful thing: *which credential is rate-limited right now.*
6. **Recommendation.** A **credential pool table**: one row per credential (label, provider, status incl. **exhausted** badge, last-used), with add / remove / **reset-exhaustion** per row. Surface `login`/`logout` per provider here.

---

## Schedules — `cli: cron`  · domain: agents
1. **Purpose.** Cron job management (scheduled autonomous runs).
2. **CLI capabilities.** `cron {list, create, edit, pause, resume, run, remove, status, tick}`.
3. **Current desktop capability.** create / list / pause / resume / remove / trigger (`createCronJob`, `listCronJobs`, `pauseCronJob`, `resumeCronJob`, `removeCronJob`, `triggerCronJob`).
4. **PARITY GAPS.** Missing **edit** (must delete+recreate), no **scheduler status** card (`cron status` — is the scheduler even running?), no per-job **output history** view.
5. **UX evaluation.** Good coverage, near-parity. hermes-webui's cron viewer auto-loads each job's **last output `.md`** inline under the job — a strong pattern Shay lacks (you can schedule but not see results).
6. **Recommendation.** Add inline **edit**, a **scheduler-running** status pill, and per-job **last-output** preview (borrow hermes-webui `loadCronOutput`). This is also the natural home for a unified "what ran while I was away" feed.

---

## Kanban — `cli: kanban`  · domain: agentos  ⚠ HIGH-LEVERAGE
1. **Purpose.** Durable SQLite-backed multi-profile collaboration board; tasks claimed atomically, can depend on each other, executed by named profiles in isolated workspaces.
2. **CLI capabilities.** ~30 subcommands: `init, boards (list/create/rm/switch/show/rename), create, list, show, assign, reclaim, reassign, diagnostics, link, unlink, claim, comment, complete, edit, block, unblock, archive, tail, dispatch, watch, stats, notify-subscribe/list/unsubscribe, log, runs, heartbeat, assignees, context, specify, gc`. This is the deepest domain in the whole CLI.
3. **Current desktop capability.** A **fully-built 991-line `Kanban.tsx`** exists with: 6-column board (Triage/To-do/Ready/Running/Blocked/Done), **HTML5 drag-and-drop** between columns, create board + create task (assignee, priority, skills, body), task **detail panel** with comments + events + runs + parents/children, **dispatch** (one dispatcher pass), **specify**, **block/unblock**, **archive**, **reclaim**, board switching, 6s polling.
4. **PARITY GAPS — but the real problem is wiring.** Per `PAGES-AND-CLI-MAP`, `App.tsx`'s `screenRegistry` renders an **inline `<div>Kanban</div>` placeholder** — the real component is **never imported** (a third read-only `index.tsx` swarm view also exists, triple-redundancy). So today's *shipped* parity is **zero**; the *built-but-dark* component already covers most verbs. Even once wired, gaps remain: no **link/unlink** dependency editor in UI, no **reassign**, no **stats** dashboard, no **board rename/archive/delete**, no **watch** live-event stream (it polls), no **gc**, no **edit** of completed-task results, no **notify-subscribe** management.
5. **UX evaluation.** Two layers of weakness:
   - **Fatal:** the board is dead-wired — the single highest-leverage one-line fix in the app (import `Kanban/Kanban.tsx`, delete the inline stub + redundant `index.tsx`).
   - **Even when live, it under-delivers as a board.** It's a status-column DnD with a detail drawer, but it doesn't visualize the thing that makes Shay's kanban special: **dependencies (a DAG), per-profile assignees as swimlanes, and live run telemetry.** It's a Trello clone over a system that is really an autonomous multi-agent work queue.
6. **Recommendation.**
   - Step 0: **wire the real component** (immediate).
   - Then make it a *control plane*, not a Trello: **swimlanes by assignee/profile**, a **dependency graph** view (link/unlink edges), a **live event stream** tab (`watch`/`tail` instead of 6s poll), a **stats header** (per-status/per-assignee counts, oldest-ready age from `stats`), **board management** (rename/archive/switch in a board switcher), and **reassign**. Claude Desktop has no analog; the closest reference is a CI/agent-orchestration board — lean into "autonomous work queue," not "task list."

---

## Tools — `cli: mcp` (manifest) / really `tools`  · domain: agentos
1. **Purpose.** Enable/disable toolsets (and MCP tools) per platform.
2. **CLI capabilities.** `tools {list, enable, disable}` (built-in toolsets + `server:tool` MCP notation, per-platform); separately `mcp {serve, add, remove, list, test, configure, login}`.
3. **Current desktop capability.** `getToolsets`, `setToolsetEnabled`, `listMcpServers` (read-only). Toggle toolsets on/off; *list* MCP servers.
4. **PARITY GAPS.** The `tools` half is good. The **`mcp` half is read-only** — no add/remove/test/login/configure for MCP servers. Per-platform tool scoping (CLI/Telegram/Discord separately) may not be exposed.
5. **UX evaluation.** Decent for toolsets; MCP is the extensibility story and it's view-only — a major gap given MCP's centrality.
6. **Recommendation.** Split into two clear regions or a sibling **MCP** screen: full server lifecycle (add via discovery, remove, **test connection**, **login** for OAuth servers, **configure** per-tool selection). Add per-platform columns to the toolset toggles.

---

## Gateway — `cli: gateway`  · domain: agentos  ⚠ STUB
1. **Purpose.** Messaging gateway control (Telegram/Discord/WhatsApp + 10+ platforms); also hosts the kanban dispatcher.
2. **CLI capabilities.** `gateway {run, start, stop, restart, status, install, uninstall, list, setup, migrate-legacy}`; plus `whatsapp setup`, `slack` manifest, and `pairing` (who may DM the agent).
3. **Current desktop capability.** A real `Gateway.tsx` (260 lines): start/stop, status, per-platform enable toggle, env config — **but `screenRegistry` renders `<div>Gateway</div>`; the real component is unimported** (third `index.tsx` MCP-list variant also exists).
4. **PARITY GAPS.** Shipped parity = zero (stub). Even when wired: no **restart**, **install/uninstall** (service lifecycle), **migrate-legacy**, **per-profile gateway list** (`gateway list`), guided **whatsapp/slack setup**, or **pairing** approval (security-sensitive: who can talk to the agent).
5. **UX evaluation.** Same dead-wire class as Kanban. The platform-toggle component is fine but incomplete vs the operational surface (service install + pairing).
6. **Recommendation.** Wire the real component; add **service lifecycle** (install/uninstall/restart), **per-profile status list**, guided **platform setup wizards** (WhatsApp QR, Slack manifest), and a **Pairing** sub-panel (pending/approved users, approve/revoke) — the latter is invisible access control today.

---

## Capture (Inbox) — `cli: capture` (NOT a real CLI command)  · domain: agentos  ⚠ PARTIAL
1. **Purpose.** View captured inbox items (quick-capture thoughts/notes).
2. **CLI capabilities.** **None** — `shay capture` is not a CLI subcommand (verified: invalid choice). The data lives under the `inbox` key of `memory`. So this is a *desktop-only* surface with no CLI mirror to reach parity against — and consequently its actions must be designed, not copied.
3. **Current desktop capability (`CaptureInbox/index.tsx`, 62 lines).** Reads `inbox` out of `readMemory()` and renders a read-only list. Inline styles. No add, no triage, no clear, no edit.
4. **PARITY GAPS.** N/A against CLI; but it's a dead-end view with no actions at all.
5. **UX evaluation.** Near-placeholder. An inbox you can't act on is just a log. Also violates the CSS-in-files rule (inline styles).
6. **Recommendation.** Either (a) make it a real inbox: **add capture, edit, triage → (promote to kanban task / promote to memory / dismiss), clear** — i.e. the Cowork/Things-style capture→triage flow; or (b) fold it into **Memory** as an "Inbox" section. Given it has no CLI backing, decide whether it earns its own nav slot.

---

## Office — (no `cli`; backed by `claw`)  · domain: agentos
1. **Purpose.** OpenClaw "claw3d" 3D workspace control.
2. **CLI capabilities.** `claw` (OpenClaw migration); the claw3d runtime is desktop-managed (`claw3d*` IPC family).
3. **Current desktop capability.** setup, start-all/stop-all, status, set port + ws url, view logs, setup-progress events, open external. WIRED.
4. **PARITY GAPS.** Largely self-contained; `claw migrate` lives in Settings. OK.
5. **UX evaluation.** Fine for a runtime-control panel; niche.
6. **Recommendation.** Low priority. Ensure logs/status match the Studio panel's pattern for consistency.

---

## Studio — (no `cli`; FAMtastic-specific)  · domain: agentos
1. **Purpose.** FAMtastic Site Studio control (launchd-managed server + live preview).
2. **CLI capabilities.** FAMtastic-side, not `shay` CLI. (`fam-hub site *` is the analog.)
3. **Current desktop capability.** start/stop, set port + preview port, view logs, open external, status poll. WIRED (correctly imports `Studio/Studio.tsx`, not the dead `index.tsx` pipeline runner).
4. **PARITY GAPS.** N/A to `shay`. Note the launchd rule: this should *control* the launchd service, never spawn a manual `node server.js`.
5. **UX evaluation.** Good control panel.
6. **Recommendation.** Low priority; confirm start/stop routes through launchd (`launchctl`) per the non-negotiable Studio rule, not a raw process spawn.

---

## Settings — `cli: config`  · domain: system
1. **Purpose.** App + connection + maintenance settings (de-facto catch-all).
2. **CLI capabilities.** `config {view, edit}`; plus the maintenance commands it hosts: `doctor`, `dump`, `debug`, `backup`, `import`, `update`, `version`, `claw migrate`, `uninstall`, `checkpoints`, `computer-use`, `plugins`, `hooks`.
3. **Current desktop capability.** Connection mode (local/remote/ssh) + SSH test, locale, version/update, backup/dump/import, claw migrate, doctor, devtools, privacy, tts, connectors, account, plugins domains. Very broad.
4. **PARITY GAPS.** Acts as the overflow bin for many CLI commands but several remain absent app-wide: **`checkpoints`** (status/prune/clear disk usage), **`hooks`** (shell-hook allowlist — security-sensitive), **`computer-use`** (cua-driver install/status), and full **`plugins`** lifecycle as a real screen. `config edit` (raw YAML editor) isn't exposed.
5. **UX evaluation.** Functional but becoming a junk drawer; security-relevant surfaces (hooks, pairing, checkpoints) are buried or missing.
6. **Recommendation.** Extract a **Security** group (Hooks allowlist, Pairing, Checkpoints) and a **Maintenance** group (backup/import/dump/doctor/update/computer-use). Add a raw **`config edit`** YAML view for power users. Don't keep growing the catch-all.

---

## Memory — `cli: memory`  · domain: system
1. **Purpose.** Configure external memory provider + edit built-in memory entries.
2. **CLI capabilities.** `memory {setup, status, off, reset}` (providers: honcho, openviking, mem0, hindsight, holographic, retaindb, byterover; only one external at a time; built-in MEMORY.md/USER.md always on).
3. **Current desktop capability.** read memory, add/update/remove entries, discover providers, write user profile, get/set env + config, open external. Full CRUD — one of the richest screens.
4. **PARITY GAPS.** Essentially none; arguably exceeds the CLI (CRUD on entries). Could add an explicit **provider `off`** and **`reset`** (erase built-in) with confirmation.
5. **UX evaluation.** Strong — second only to Chat. Reference pattern alongside Soul.
6. **Recommendation.** Add explicit provider enable/off toggle + reset-with-confirm. Surface the Capture inbox here if Capture is folded in.

---

## Logs — `cli: logs` / `doctor`  · domain: system
1. **Purpose.** View app/hermes logs + run doctor.
2. **CLI capabilities.** `logs {view, filter}`; `doctor`; `dump`; `debug` (upload logs).
3. **Current desktop capability.** `getConfig`, `getHermesVersion`, `isRemoteMode`, `isSshTunnelActive`, `runHermesDoctor`, `verifyInstall`. WIRED.
4. **PARITY GAPS.** Log **filtering/levels** and `debug` (upload-for-support) flow are thin/unclear.
5. **UX evaluation.** Adequate.
6. **Recommendation.** Add level/source filters + a "Send to support" (`debug`) button.

---

## Diagnostics — `cli: status`  · domain: system
1. **Purpose.** Health/connectivity diagnostics.
2. **CLI capabilities.** `status` (all components); `doctor`; `verify`.
3. **Current desktop capability.** `window.shay.diagnostics` domain + doctor/verify. WIRED.
4. **PARITY GAPS.** Could absorb a real **component status grid** (`status`) and the missing telemetry that Agent Monitor fakes.
5. **UX evaluation.** Good bones; overlaps Logs and the fake Agent Monitor.
6. **Recommendation.** Make this the single **System Health** hub: component status grid + checkpoints disk usage + scheduler/gateway running-state, absorbing Agent Monitor's intent honestly.

---

# PART 2 — Planned / not-yet-built screens

These appear in the brief ("planned Inbox/Interview") and in roadmap intent. They are not in `manifest.ts`'s `ScreenId` union today.

## Inbox (planned)
- **Likely purpose.** A unified "what happened while I was away" feed: cron outputs, completed kanban runs, gateway messages awaiting reply, capture items, pairing requests.
- **CLI sources to parity against.** `cron` last-outputs, `kanban runs`/`watch`, `gateway` messages, `pairing list` (pending), Capture `inbox`.
- **Recommendation.** This is the highest-value *new* screen: it's the async heartbeat of an always-on agent and has no good home today (Agent Monitor fakes part of it). Model it on an email-style triage inbox (Cowork inbox / Things). Distinct from Capture (which is *input*); Inbox is *output + requests-for-attention*.

## Interview (planned)
- **Likely purpose.** Guided onboarding/persona-elicitation that writes SOUL.md / USER.md / memory from a conversational Q&A (a richer cousin of the Setup flow).
- **CLI sources.** `setup` wizard, `soul` write, `memory` setup/write.
- **Recommendation.** Build it as a flow screen (like Setup), not a nav screen. Output should land in Soul + Memory (which already have editors), giving immediate "parity" by reusing existing wired surfaces.

---

# PART 3 — Cross-cutting findings

- **The dominant defect is "list + one action."** Most screens stop at viewing items the CLI can fully lifecycle-manage. The two finished-feeling screens (Soul, Memory) are *editors*; the weak ones (Skills, Sessions, Profiles, Providers) are *viewers with a single verb*. The fix pattern is consistent: add a **detail drawer with the full verb set** per item.
- **Two screens ship dark (Kanban, Gateway).** Real components exist but `App.tsx` renders inline `<div>` stubs — fully-built parity is invisible to users. One-line import fixes; highest ROI in the repo.
- **Security surfaces are missing entirely.** `pairing` (who can DM the agent), `hooks` (shell-hook allowlist), and `checkpoints` (rollback/disk) have **no GUI** — invisible, security-relevant controls. hermes-webui and Claude Desktop both surface access/permission controls; Shay hides them.
- **No analytics.** `insights` (token spend, cost, tool patterns, activity trends) has no screen. A Claude-Desktop-class app is expected to show spend. Pure read-only over existing session data.
- **CSS-rule violations in the weak screens.** AgentMonitor and CaptureInbox use inline styles + raw hex, against the project's CSS-in-files rule — a tell that they were stubbed quickly.
- **Shell beats hermes-webui; parity lags it.** Shay's three-column shell, two-stage sidebar collapse, and per-section error boundaries are more polished than hermes-webui's vanilla-JS UI. But hermes-webui's *thesis* (full CLI parity) is closer to true on Skills/Sessions/Cron because it exposes edit/save/delete where Shay exposes view/toggle. Borrow hermes-webui's **composer footer + context ring** and its **cron-output-inline** pattern.

---

# PART 4 — Ranked highest-leverage page upgrades

1. **Wire Kanban + Gateway (kill the `<div>` stubs).** One-line imports each; instantly lights up the two deepest already-built domains. Delete the redundant `index.tsx` variants. *Effort: XS. Impact: huge.*
2. **Skills → real manager.** Add per-skill **enable/disable** (`config`), in-app **SKILL.md edit** (reuse Soul editor), **update/check** badges, and a **sources (`tap`)** panel. Turns the canonical parity-gap page into a leadership feature. *Effort: M. Impact: high.*
3. **Build the Inbox screen + fix Agent Monitor.** Replace the fake heartbeat with a real "what ran / who's asking" feed sourced from `cron` outputs, `kanban runs/watch`, gateway messages, and `pairing` requests. *Effort: M. Impact: high — it's the async core of an always-on agent.*
4. **Insights screen (new).** Token spend / cost / tool patterns / activity over `--days`, `--source` filters. Expected of a Claude-Desktop-class app; read-only. *Effort: M. Impact: high perceived value.*
5. **Security group: Pairing + Hooks + Checkpoints.** Surface invisible, security-relevant CLI controls. Pairing especially (DM access control). *Effort: S–M. Impact: high (trust/safety).*
6. **Sessions management.** Add rename/export/delete/prune/stats — finish the store-curation verbs. *Effort: S. Impact: medium-high.*
7. **Profiles detail drawer + distribution lifecycle.** show/info/alias/rename/export/import/install-from-git/update — unlock the "agent distribution" platform. *Effort: M. Impact: medium-high (differentiator).*
8. **MCP full management** (split from Tools): add/remove/test/login/configure. *Effort: M.*
9. **Kanban depth (post-wiring):** swimlanes by profile, dependency graph, live event stream, stats header, board management. *Effort: L. Impact: high but after #1.*
10. **Fallback chain + credential-pool table** (Models/Providers): ordered fallback editor + per-credential add/remove/reset-exhaustion. *Effort: S–M.*
11. **Cron polish:** inline edit + scheduler-status pill + last-output preview (hermes-webui pattern). *Effort: S.*
12. **Chat composer footer + context ring** (hermes-webui pattern); skills-preload + worktree toggles. *Effort: S–M; UX uplift.*

---

*Companion to `reviews/PAGES-AND-CLI-MAP-2026-05-31.md` (which carries the routing-architecture analysis and the full CLI→GUI matrix). This document is the per-page UX + parity deep-dive.*
