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
### Phase 1 — Stabilize (today)
1. **Recover persona** — find the persona file, restore alongside SOUL.
2. **Reconnect memory** — restore the prior sqlite-vec + fastembed recall wiring, point at
   `~/famtastic/obsidian/`, rebuild the index. (Reconnect, not rebuild.)
3. **Git-back identity** — commit SOUL + persona into the famtastic repo (`obsidian/01-Shay/`)
   so a future nuke = `git restore`, not a loss. (Optionally merge AI-Boss-Mode directives in.)

### Phase 2 — Monetize (next)
- Pick ONE concrete revenue play (the Agent-OS-Build doc's "AI Revenue Rescue Sprint" — home
  services, $5k offer — is the most concrete near-term play already in the brain). Put Shay on it.
- NOTE: there is **no literal "1000 sites" list** — that's the north-star vision (1,000 products
  @ $100/mo), not a deliverable.

## Parked (not now)
- GUI command center (desktop / Electron workspace / web-ui) — pick ONE direction LATER.
- Retire `~/agentic-os/` (third-party clone) and the dead `.hermes` soul stubs.
