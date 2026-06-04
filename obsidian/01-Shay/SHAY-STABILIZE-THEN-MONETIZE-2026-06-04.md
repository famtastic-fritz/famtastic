# Shay: Stabilize → Monetize (decision 2026-06-04)

> Conclusion of a long debugging session with Fritz. Captures the diagnosis, the
> decision, and the finite plan. Companion to SHAY-BRAIN-ARCHITECTURE.md + SHAY-MODEL-LANDSCAPE.md.

## What was actually wrong (diagnosis)
- **"Agent OS" = Fritz's CLI→GUI command-center push**, explored from FIVE forks at once:
  hermes-desktop→Shay Desktop, `outsourc-e/hermes-workspace`→"Shay Workspace" (Electron),
  `nesquena/hermes-webui`, open-webui, `EKKOLearnAI/hermes-web-ui`. Each repo shipped its own
  SOUL/persona template → **that's the source of the fragmented soul/persona files.**
- A long autonomous agent run (the agent-os work) **burned the Codex subscription.**
- **Three codebases:** `~/famtastic/shay-shay/` (HER repo, June 3, **what's running** — newest),
  `~/famtastic/shay-agent-os/` (swarm pipeline, tracked in famtastic), `~/agentic-os/`
  (a **third-party clone** of `modimihir07/agentic-os`, NOT Fritz's work — ignore/delete).
- **SOUL:** recovered. Runtime `~/.shay/SOUL.md` = canonical `~/famtastic/shay-shay/SOUL.md`
  (17.5KB, 215-line "Hey Shay-Shay" letter), byte-identical. A second **"AI Boss Mode"** persona
  (2.7KB, in `~/.shay.backup.20260604/`) holds operating directives (get-paid, pipeline thinking,
  visual-learner, check-existing-assets) likely NOT in the letter → merge candidate.
- **PERSONA file** (separate from SOUL, contains "black sista" identity + more) → recover.
- **Memory:** runtime config has `memory_enabled: true, memory_char_limit: 2200` and **ZERO vault/MCP
  wiring** → she can't read the brain. BUT **she was wired properly at one point**
  (June-2 note: *sqlite-vec + fastembed + "recall rewire"* — all local). So this is a **RECONNECT,
  not a rebuild.** June-2 work + 13 session notes survive in `obsidian/05-Captures/sessions/2026-06-02/`.
- **Memory is 100% local by design:** corpus = obsidian vault (git-backed); index = on-device
  fastembed + sqlite-vec; no external/cloud data source (Pinecone is site-studio only, unrelated).

## The decision (Fritz, 2026-06-04): "3 and 1"
**Stabilize Shay, THEN pivot to money. Park the entire GUI command-center rework.**
Real driver: *Fritz needs revenue now*; the tooling spiral kept pulling him off it.

## The finite plan
### ROOT CAUSE (found 2026-06-04): config-precedence override
Hermes/Shay loads config in layers — **persisted overrides (`workspace-overrides.json`) → env
(`HERMES_HOME`/`SHAY_HOME`) → `active_profile` / `mcp-overlay.json` → base `config.yaml`**. A higher
layer kept overriding Fritz's edits to base `config.yaml` → "changes didn't stick" → frustration →
**she nuked herself.** This is ALSO why SOUL reverted. One root cause, every symptom. The last task
before the nuke: configure + optimize all 5 memory types — which failed because the config wouldn't
persist. **Fix the precedence FIRST or everything reverts again.**

### The 5 memory types (from `MEMORY-SCHEMA-L0-L3.md`)
L0 raw (logs/transcripts) · L1 episodic (session/day summaries) · L2 semantic (durable facts) ·
L3 reflective (identity/constraints) · + working memory (the 2,200-char live buffer = 5th).
Local: sqlite-vec + fastembed, picked up via the obsidian + basic-memory MCP servers. No external source.

### Phase 1 — Stabilize (today)
1. **Fix config override FIRST** — find which layer wins (env home / active_profile / mcp-overlay),
   edit THERE so changes persist. Without this, steps 2-4 revert.
2. **Configure + optimize the 5 memory types** at the winning layer.
3. **Reconnect memory** — restore sqlite-vec + fastembed wiring + basic-memory/obsidian MCP →
   `~/famtastic/obsidian/`, rebuild the index. (Reconnect, not rebuild — she was wired before.)
4. **Recover persona** — find the persona file ("black sista" + more), restore alongside SOUL.
5. **Git-back identity** — commit SOUL + persona + the working memory config into the repo
   (`obsidian/01-Shay/`) so a future nuke = `git restore`, not a loss.

### Phase 2 — Monetize (next)
- Pick ONE concrete revenue play (the Agent-OS-Build doc's "AI Revenue Rescue Sprint" — home
  services, $5k offer — is the most concrete near-term play already in the brain). Put Shay on it.
- NOTE: there is **no literal "1000 sites" list** — that's the north-star vision (1,000 products
  @ $100/mo), not a deliverable.

## GUI / phone — corrected understanding (2026-06-04)
- **The GUI command center is DONE + wired** (Fritz confirms) — the web UI (hermes webui on
  `127.0.0.1:8787`) / workspace. Not a sprawling unfinished project. Needs only "final wiring."
- **Fritz's real phone goal** = "work like Claude Code from my phone — answer build questions,
  brainstorm, dispatch builds." That is the Claude-Code-on-phone experience = **a web UI in the
  phone browser talking to a remote agent.** He does NOT need the native app to get it.
- **Fast path to phone:** expose the EXISTING Shay web UI to his phone over **Tailscale/tunnel**
  (hours, free, no App Store). That IS the "final wiring."
- **The native iOS/Android app** (`plans/shay-phone-app/PLAN.md`, status: proposal awaiting
  approval) = weeks + App Store. **PARK it.** The web-UI-over-Tailscale path delivers the
  experience now.
- **Dependency:** surfaces (web UI / phone) are windows onto the runtime. A surface over a runtime
  whose config won't stick + memory isn't wired = a broken Shay on a nice screen. **Fix the runtime
  (override + memory) FIRST**, then expose the surface.

## Parked (not now)
- Native phone app build (`shay-phone-app`) — use web-UI-over-Tailscale instead, for now.
- Retire `~/agentic-os/` (third-party clone) and the dead `.hermes` soul stubs.
