# SHAY — Own-Ecosystem Build Brief (master prompt)

> Hand this to a capable build agent (or a cheap swarm). It captures everything we
> learned across the command-center work and turns it into a fresh, owned, themeable,
> extendable ecosystem — **no hermes branding, hermes as a *source* not a dependency.**
> It is phased and proof-gated on purpose: an agent that tries to one-shot this will
> fail. Each phase ends with *live* verification, not "it compiles."

---

## ROLE & MISSION
You are building **Fritz's own AI-agent ecosystem from scratch**, called **Shay**. It is
a **self-bootstrapping unit**: a generator CLI (`shay`) that **scaffolds, migrates, and
updates** the whole ecosystem (CLI + desktop + dashboards), where every surface is a
**synced client of one core** — a window, never an island.

- **Hermes is a SOURCE, not a dependency.** You may read/borrow patterns from the
  hermes-agent / hermes-webui / hermes-workspace repos, but you take **no runtime
  dependency** on them and you keep that source in a clearly-separated `reference/`
  folder. **Strip every "hermes" name, icon, and string** — this is Shay.
- **Own repo**, not inside the famtastic monorepo (the monorepo's stale-checkout churn
  is one of the things we're escaping). New, clean git history.

## READ FIRST — the learnings (do NOT generate anything until you've internalized these)
These hold the architecture, the bugs already solved, and Fritz's standing preferences:
- `obsidian/00-FAMtastic-Core/COMMAND-CENTER-EVENT-SPINE.md` — the event spine (one activity nerve)
- `obsidian/00-FAMtastic-Core/KANBAN-CONSOLIDATION-BUILD-PACKET.md` — the one job store + dispatcher facts
- `obsidian/00-FAMtastic-Core/COMMAND-CENTER-UX-SPEC.md` — one model · scaled views · ≤5 tabs · no cram-the-desktop
- `.wolf/cerebrum.md` — User Preferences + Do-Not-Repeat (esp. "decide+advise", "seen before served", cost routing)
- `.wolf/buglog.json` — bugs already solved (compression ctx-floor, swallowed kanban `--status`, import cycle, multi-writer locks). DON'T repeat them.
- `shay-agent-os/config/shay-aux-compression.fix.yaml` — the aux-model context-floor fix

## PHASE 0 — cheap deep research (ruflo loop), THEN decide tooling
Run a **cheap, fan-out research loop on free/local models** (Ollama / free OpenRouter /
Gemini Flash — NEVER the premium brain for this). Adversarially verify every claim
(half of "latest greatest" is hype). Produce `docs/TOOLING-DECISIONS.md` answering:
- **CLI framework / TUI:** best current stack for an extensible agent CLI (e.g. Python
  Typer/Click vs Node; Ink/Textual for TUI). Pick one, justify.
- **Desktop shell:** Electron vs **Tauri** (smaller/native) vs web-PWA. Decide by
  tradeoff (bundle size, native APIs, themeability, build pain), not hype.
- **Local model serving:** Ollama vs alternatives; concurrency reality on a single Mac
  (we learned: ~4-parallel, VRAM-bound, NOT rate-limited — design around that).
- **Memory/RAG:** tiered hot-cache + on-device semantic recall (fastembed/sqlite-vec
  style) — what's current and cheap.
- **Plugin/extension architecture:** manifest + registration patterns for a component
  ecosystem (the future "component studio / mediation").
- **Self-update mechanism:** how the ecosystem updates itself + deliberately syncs from
  the hermes *source* (manual, not continuous).
**Gate:** output the decisions doc + a phased plan. Get a thumbs-up before Phase 1.

## NON-NEGOTIABLE ARCHITECTURE (bake these in — they're hard-won)
- **One brain** — a gateway with an **OpenAI-compatible** API. Every surface chats
  through it. The job dispatcher lives **inside** the gateway (don't spawn a separate
  daemon — we learned that).
- **One home** — a single config/data root (`~/.shay` or your rename) holding memory,
  the job DB, the event spine, sessions, skills. Every surface points here via one env
  var, defaulted on **every** entry path (not just one).
- **One job store** — a kanban-style SQLite DB with a lane `status` field. **All writes
  go through the CLI write path** (lifecycle events + dispatcher pickup), **never raw
  INSERT** (that bug cost us a day: 200-OK-but-no-row). Set a **valid initial status**
  and an **assignee** or the dispatcher silently skips it. Open sqlite with
  `PRAGMA busy_timeout` (multi-writer: CLI + desktop + phone + dispatcher all write).
  Use an **idempotency key** so retries don't double-create.
- **One event spine** — append-only JSONL, **flock-safe**, schema =
  `{id,timestamp,type,agentId,message,severity,source,meta?}`. Every state change
  emits. Surfaces tail it for a live feed. This is the "reflects everywhere" nerve.
- **Surfaces are thin clients** — a `core/` layer (gatewayClient, jobStoreClient,
  eventSpine tailer, home/config) that EVERY surface imports. Generate this once,
  correct; stamp it into every surface. No surface owns its own brain or data.
- **Multi-writer + verify discipline:** feature-flag risky cutovers (default off);
  verify **cross-surface parity for real** (create on desktop → shows + dispatches on
  phone + board → runs to done); one commit per logical change; adversarial review gate
  before any wiring/brand change.

## BUILT-IN FEATURES (Fritz's must-haves)
- **`shay doctor` (+ `--fix`)** — the authority on health. Checks: gateway up, home
  wired, DB reachable + busy_timeout, models reachable, memory under cap, event spine
  writable, each surface's config. `--fix` auto-repairs the safe ones. This is built in
  from day one, not bolted on.
- **Dashboards (ops view)** — agents/health, the kanban **board** (lanes from the one
  store), and the live **feed** (the spine). Desktop = multi-pane; phone = ≤5 tabs;
  same data, scaled. (Reuse the UX spec — don't cram the desktop onto the phone.)
- **Memory — tiered, with a knob.** A small always-in-prompt **hot cache** (char-limit
  is a config value; default it generously since modern context is cheap) holding only
  the non-negotiables, PLUS **unbounded on-device semantic recall** (the vault) queried
  on demand. Include a **promotion** path: when the hot cache fills, promote durable
  entries to the vault and evict — so it never hits the save/evict wall we saw at 99%.
- **Models — subscription/flat-first, cap→fallback.** Order brains: flat-rate/sub
  first, metered last, **local Ollama as the $0 floor**. A cap returns 429 → downshift,
  never silent billing. Bulk/worker work delegates OFF the premium brain. Respect
  single-Mac Ollama concurrency (~4-parallel) — don't dump a swarm on it.
- **Updates — self-update + deliberate source-sync.** `shay update` updates the
  ecosystem; a separate `shay sync-source` pulls *chosen* improvements from the hermes
  reference on purpose (never an automatic dependency bump).
- **Themeable + extendable** — light/dark + theme tokens; a **component/extension
  contract** (a manifest + a `register()` hook) so future components (component studio,
  mediation, new surfaces) plug in without forking core.

## COMMAND & SETTINGS UX — rethink it, don't port the sprawl
The hermes CLI is a flat sea of ~50 commands that mixes three things; **do not inherit
that.** Separate by purpose:
- **CLI = DOING.** A *small* set of daily verbs (chat, dispatch, `doctor`) + lifecycle
  (`init/migrate/update`). That's the human surface.
- **Config = ONE declarative source of truth.** The config file IS the settings. Any
  setting command is thin sugar that edits the file + re-validates — it must NOT keep a
  parallel copy of state (that two-sources-of-truth drift is what caused a real
  defaults-override-then-nuke incident). `doctor` validates the file is coherent.
- **Settings = a UI/TUI pane**, not a verb-per-knob. Put settings (models, fallbacks,
  memory, MCP, keys) in the **dashboard** (visual, whole-picture, validated on save)
  and a TUI screen for headless. Nobody should memorize `fallback add …` to switch a
  brain — they should see a form.
- **Agent-internal verbs are hidden/namespaced** (e.g. `shay _internal kanban claim`).
  The kanban worker verbs (claim/heartbeat/runs/dispatch) are for the dispatcher, NOT
  the human — keep them off the top-level surface.
- **Fluff test:** drop any command that (a) duplicates the config/UI, (b) is
  agent-internal, or (c) exists only because hermes shipped it. "Hermes had it" is not
  a reason to keep it in Shay.

## THE GENERATOR LIFECYCLE (the "self-bootstrapping unit")
`shay init <surface>` (desktop|dashboard|cli) → scaffolds a surface **pre-wired** with
the `core/` clients. `shay migrate` → moves/settles settings + data on upgrade.
`shay config` → edit the one home's settings. `shay doctor` → verify. So the whole
ecosystem stands up from the CLI, and new surfaces are one command, always synced.

## OUT OF SCOPE (now)
- **Android** — Fritz wants a clean fresh start; the existing phone PWA stays as-is for
  now, NOT regenerated. Don't build native Android in this pass.
- **No hermes branding** anywhere (names, icons, strings, bundle ids).

## DELIVERABLE & PROOF
Deliver **Phase 0 research + a phased plan FIRST**. Then build phase by phase, each
ending in **live proof** (doctor green; cross-surface parity demonstrated; not "it
compiled"). Never claim done without the proof. Cheap models for bulk; premium brain
only for design/judgment. Capture every new learning back into the brain as you go.
