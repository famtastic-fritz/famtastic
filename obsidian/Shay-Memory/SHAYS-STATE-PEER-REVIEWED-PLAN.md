---
title: SHAYS-STATE-PEER-REVIEWED-PLAN
type: note
permalink: shay-memory/shays-state-peer-reviewed-plan
---

# FAMtastic + Shay — Greenfield Architecture (Peer-Reviewed Plan)

> **Mandate:** Designed as if nothing exists today. This is the architecture we would build
> from scratch, engineered specifically so that (a) every lesson in our memory stores and
> (b) every recurring failure in `.wolf/buglog.json` (273 entries) is structurally prevented —
> not patched after the fact. Author: architect pass (Opus). Reviewed: adversarial pass
> (Sonnet — different model than author, per our own REQ-09). Produced via a bounded
> research → architect → peer-review → revise loop, run cheaply.

- **Date:** 2026-06-08
- **Status:** POST–INITIAL-RESEARCH DRAFT. One adversarial peer-review pass folded in (Sonnet vs Opus). **Awaiting Shay's own review** before any build decision. The four blocking decisions in §6 are intentionally OPEN — not yet decided.
- **Companion inputs:** `SHAYS-CURRENT-STATE-BEFORE.md` (before-baseline), `SHAYS-STATE-INTERNAL-REVIEW.md`, `SHAYS-STATE-GEMINI-REVIEW.md`, failure-mining of `.wolf/buglog.json` + `memory/` + `obsidian/Shay-Memory/learnings/`.

---

## 0. First principles (why the old system failed, stated as design law)

Every failure we logged traces to one of seven *structural absences*. The greenfield design exists to make each one impossible:

| # | Structural absence (root cause) | Design law that replaces it |
|---|---|---|
| 1 | No shared spine — capabilities and the agent don't share a contract | **Everything is a registered citizen of one kernel.** Nothing runs except through the kernel's contracts. |
| 2 | Three brains, no single routing authority | **One brain. One router.** Surfaces are thin clients; no surface owns a model. |
| 3 | Memory fragmented across silos, retrieval-gated | **Memory is a service, not files.** One canonical store; everyone reads/writes through one API; relevant memory is *pushed* into context, not waited on. |
| 4 | Contracts were decorative (schemas unvalidated, DoD self-attested, state in module scope) | **Contract-first, verified at every boundary, by a different actor than the author.** |
| 5 | External tools called ad-hoc (shell corruption, wrong CWD, key leaks) | **One hardened adapter per external tool. Business code never touches a shell or raw HTTP.** |
| 6 | No cost/context governance | **Budget is a first-class runtime constraint, metered per request.** |
| 7 | "What works" and "what's documented" drift silently | **One source of truth per fact, with a reconciliation record and divergence detection.** |

The guiding external truth (2026 agent-systems consensus): *the LLM call is ~5% of the work; the other 95% is orchestration, tools, memory, permissions, observability, and routing.* This plan is mostly about that 95%.

---

## 1. The system in one picture

```
┌──────────────────────────────────────────────────────────────────────┐
│  SURFACES (thin clients — zero brain logic, zero memory logic)         │
│  phone · desktop(Electron) · web · CLI(fam-hub) · MCP                  │
└───────────────┬──────────────────────────────────────────────────────┘
                │  one protocol (gateway API)
┌───────────────▼──────────────────────────────────────────────────────┐
│  SHAY = the agent component (a citizen of the kernel)                  │
│   • Gateway (single entry)   • Brain Router (single routing authority) │
│   • Agent loop + Tools       • Context Budget Manager                  │
│   • ONE "capability tool" → calls the Capability Registry              │
└───────────────┬───────────────────────────────┬──────────────────────┘
                │                                 │
┌───────────────▼─────────────┐   ┌───────────────▼──────────────────────┐
│  FAMTASTIC KERNEL (the base) │   │  UNIFIED MEMORY FABRIC (a service)    │
│   • Identity/Config (1 SoT)  │   │   • One canonical store (SQL+vector+  │
│   • Capability Registry      │   │     entity graph, validity windows)   │
│   • Contract/Schema Registry │   │   • Tiered: T0 in-context … T3 reflect│
│   • Event Bus (append-only)  │   │   • Importance scoring + decay        │
│   • Credential Vault         │   │   • Push-on-relevance injection       │
└───────────────┬─────────────┘   └───────────────────────────────────────┘
                │  uniform Capability contract (manifest + typed invoke)
┌───────────────▼──────────────────────────────────────────────────────┐
│  CAPABILITIES (drop-in; discovered, not hardcoded)                     │
│  Site Studio · Media Studio · Email · Idea Pipeline · <future…>        │
└───────────────┬──────────────────────────────────────────────────────┘
                │  every external call goes through…
┌───────────────▼──────────────────────────────────────────────────────┐
│  HARDENED ADAPTER LAYER (one adapter per external tool)                │
│  Claude CLI · Gemini · Netlify · GitHub · GoDaddy/cPanel · muapi       │
└────────────────────────────────────────────────────────────────────────┘

  CROSS-CUTTING: Delivery & Verification pipeline (DoD gate, run by a
  separate actor) · Observability & Cost Governance (event bus + per-
  request cost/latency/context metering).
```

---

## 2. Layer-by-layer specification

### L0 — FAMtastic Kernel (the base spine) — makes "FAMtastic is the base" literally true
A small shared core that **everything depends on and registers into**. Not a folder of co-located projects — a runtime spine.
- **Identity & Config service** — the single source of truth for paths, the active context (current site tag, current user), and feature flags. Exposes one `getActiveContext()` read dynamically at use-time (kills the TAG/SITE_TAG class, REQ-04). No module-scope copies.
- **Capability Registry** — see L1.
- **Contract/Schema Registry** — every cross-boundary payload (config, spec, capability I/O, memory records) has a runtime schema (Zod for Node, Pydantic for Python). Validation happens at the boundary; a required field that fails is an **error**, never a silent empty/fallback (REQ-05). Schemas are the contract; unwired settings simply don't exist in them (kills the "6 dead settings" problem).
- **Event Bus** — one append-only event log every component emits to (started/succeeded/failed/cost). This is the substrate for observability, the DoD gate, and memory ingestion.
- **Credential Vault** — the only place secrets live; adapters request creds by name. No `GET /api/settings` ever returns a raw key (redactor enforced).

> **Why this shape:** today Shay can only touch FAMtastic by `cd`-ing into the repo. With a kernel, Shay (and fam-hub, and any surface) reach every capability through one typed contract. New capabilities written tomorrow are reachable the day they register — that is what "base for everything, current and future" requires.

### L1 — Capability Registry & the Capability contract — how Shay acts across all of FAMtastic
Every capability (Site Studio, Media, Email, Idea Pipeline, …) implements **one uniform interface**:
- a **manifest**: `{ name, actions[], input/output schema per action, auth needs, cost class, side-effects }`
- a typed **`invoke(action, input) → output`** entry point.

Capabilities are **discovered from their manifests, not hardcoded**. The kernel exposes them through one internal API. Shay reaches them through a **single "capability tool"** in her tool registry — so "Shay acts on your behalf across all of FAMtastic" becomes: she calls a typed contract, never a raw shell. `fam-hub` becomes a thin CLI over the *same* registry (so CLI and agent can never drift). **The existing `shay-agent-os/bridges/site_bridge.py` is the prototype of this contract** — it already wraps `fam-hub site …`; we promote it from an orphan into the first registered Capability and wire it to the gateway.

### L2 — Shay (the agent component) — one brain, many thin surfaces
Shay is a first-class kernel citizen, not a gitignored neighbor.
- **Gateway (single entry).** Every surface — phone, desktop, web, CLI, MCP — is a *thin client* of the gateway. No surface contains brain logic or memory logic. (Kills the 3-brains split: today `shay-phone/server.py` and `shay-agent-os/brain_client.py` each re-implement model calls; they become gateway clients.)
- **Brain Router (single routing authority, REQ-02).** One config, one router: **subscription/flat-rate brains first → free-tier direct keys → metered pay-per-token last.** Each provider declares cap type (weekly/daily/rpm/tpd) and live exhaustion state. On 429/400 it advances to the next provider, logs it, and **does not bill the metered fallback by mistake.** Per-call deadline (30–60s) → failover. This is the one part of today's system that already works well (the `~/.shay/config.yaml` switchboard) — we keep it and make it the *only* router.
- **Context Budget Manager (REQ-07).** Hard token budget at prompt-build time. Skills/memory/history selected by `always_include` allowlist + relevance up to a cap; lowest-priority trimmed before dispatch; context size logged per request. (Kills the 48-occurrence context-bloat → weekly-quota cascade.)
- **Agent loop + tools** — the existing ~80 tools, plus the one capability tool (L1).

### L3 — Unified Memory Fabric — "aware of everything," memory-optimized
The centerpiece. Built to 2026 best practice: **memory is a dedicated component separate from the context window, accessed as a service.**
- **One canonical store, hybrid by purpose:** durable facts in SQL (ACID, auditable) + semantic recall via a vector index + a light entity/relationship graph. Every record indexed by `(user, session, agent, source, importance, validity-window)` (Zep-style validity windows so superseded facts expire instead of lying).
- **Memory as a service, not files (REQ-08).** All components READ and WRITE through one Memory API. **No component reads raw memory files.** A fact written once is therefore visible to every surface — this is what kills the silo problem that made "hours of lessons invisible to the assistant."
- **Tiered:**
  - **T0 — always-in-context:** tiny, curated identity + active-context, **budget-enforced** (today's MEMORY.md/USER.md, but the 2.5KB user sub-cap currently *overflows* — the fabric makes overflow a managed eviction, not a hand-edited note).
  - **T1 — working/session:** recent turns, full-text searchable.
  - **T2 — semantic recall:** vector + entity retrieval, **pushed into context on relevance** at each turn within budget — so Shay doesn't have to *decide* to search to be "aware."
  - **T3 — consolidated/reflective:** nightly L0→L3 consolidation (we already run `reflect.py`; it becomes the fabric's consolidator).
- **Importance scoring + temporal decay (best practice: "not remembering everything is a feature").** Low-relevance memories decay; high-relevance persist; superseded facts close their validity window.
- **Ingestion adapters, then retire the silos.** The legacy stores (`.brain/`, `memory/`, `.wolf/`, `captures/`, `second-brain/`) become **one-time ingestion sources** that flow INTO the fabric and are then retired — *not* perpetually mirrored (today's 30-min launchd mirror is a smell; migrate, don't mirror forever).

### L4 — Hardened Adapter Layer (external tools) — REQ-01, REQ-13
Exactly **one adapter per external tool** (Claude CLI, Gemini, Netlify, GitHub, GoDaddy/cPanel, muapi). Each adapter owns: serialization (**always `printf '%s'`, never `echo`**), CWD enforcement (**`os.tmpdir()` for Claude subprocess** — never repo root, or CLAUDE.md hijacks output to 0 bytes), credential selection (from the vault), output parsing (**strip ``` fences**), error normalization, and process lifecycle (PID registered to its caller, killed on disconnect — kills zombie subprocesses). For vendor-UI-only operations (**Netlify Git-linking, Resend domain verify**), the adapter exposes a first-class **"assisted-manual" flow**: open the deep-link, poll the API for completion, surface a structured "waiting on you" state — never claim it's automated, never silently fail.

### L5 — Delivery & Verification pipeline (the Definition-of-Done gate) — REQ-06, REQ-09, REQ-11, REQ-12
The single largest *process* failure class was "done claimed, not actually working." The gate makes "compiles" ≠ "done":
- **Mandatory gate, run by a separate actor (CI or a different agent), never the author:** typecheck → build → launch real app → contract check (every typed method exists at runtime) → render each touched screen → vision score ≥ 8 → nav-reachability.
- **Adversarial review is hard-blocked to a different model than the author** (REQ-09) and signed with the reviewer model ID. (We just used this very rule to peer-review *this plan*.)
- **Benchmark-before-plan (REQ-12):** a passing benchmark is an *input* to planning; if none exists, building it is task #1.
- **`LOCKED.json` reconciliation (REQ-11):** records the verified-working state of each subsystem with a proof (test-run id / vision score / human approval); hash-divergence between locked state and code raises an alert before the next build.

### Cross-cutting — Observability, Cost Governance, and Contract discipline
- **Observability/cost:** every gateway and capability call logs cost, latency, context-size, provider, and cap-state to the event bus. Caps tracked per provider. This is the "95%" made visible.
- **Construction-time safety (REQ-03, REQ-10):** session state lives on the connection object (created on connect, destroyed on close) — never module scope. A `safeAsync` wrapper + lint rule (no unawaited async in handlers) + mandatory `?.` on external payloads make the 33 missing-try/catch and 20 null-access bugs *unwritable*, not just fixed.

---

## 3. Requirement traceability (every lesson → where it lives in the design)

| Req / Lesson (source) | Design element that prevents recurrence |
|---|---|
| REQ-01 shell/CLI corruption, wrong CWD, fences | L4 Hardened Adapter Layer |
| REQ-02 quota collapse, OpenRouter billing leak | L2 Brain Router (sub-first, cap-aware failover) |
| REQ-03 WS state persistence, zombie procs | Cross-cutting: connection-scoped state + PID lifecycle |
| REQ-04 TAG/SITE_TAG confusion | L0 `getActiveContext()` single SoT |
| REQ-05 decorative schemas, dead settings | L0 Contract/Schema Registry (validate-at-boundary) |
| REQ-06 "done" not verified | L5 DoD gate (separate actor) |
| REQ-07 context bloat → quota | L2 Context Budget Manager |
| REQ-08 cross-surface memory silos | L3 Memory-as-a-service, one canonical store |
| REQ-09 same-model review theater | L5 different-model adversarial gate |
| REQ-10 missing error handling / null access | Cross-cutting: safeAsync + lint + `?.` by construction |
| REQ-11 working vs locked drift | L5 `LOCKED.json` + divergence detection |
| REQ-12 benchmark after planning | L5 benchmark-before-plan gate |
| REQ-13 vendor-UI-only ops faked | L4 assisted-manual flow |
| Pillar: FAMtastic = base | L0 Kernel + L1 Capability Registry |
| Pillar: Shay = own component acting across FAMtastic | L2 Shay citizen + capability tool over L1 |
| Pillar: aware of everything + memory-optimized | L3 Unified Memory Fabric |
| Anti-pattern: multiple sources of truth | L0 schema registry + L3 single store + L5 LOCKED.json |

---

## 4. Build sequence — cheapest, highest-leverage first
*(Revised after peer review — the original order inverted the kernel and the memory fabric; corrected below.)*

Ordered so each phase ships value alone, reuses what works, and never depends on a later phase. (Both adversarial reviewers independently said: *wire what exists before building new.*)

- **Phase −1 — Prerequisite safety (hours).** Resolve the `rowboat-base` ~1.3GB broken gitlink (a live hazard any build could read), and take a full backup of `~/.shay/` (`state.db`, `memories/`, vault) so all migration is reversible. *No new behavior — just stop the bleeding before surgery.*
- **Phase 0 — Kernel skeleton (small, days).** The foundation everything depends on: Credential Vault (typed secret access), Contract/Schema Registry, and Event Bus (append-only JSONL with typed emit). **No Capability Registry yet.** These are small modules, not platforms. *Result: any component can validate its I/O and emit events.*
- **Phase 1 — Memory Fabric MVP** (now buildable correctly — vault/schema/event-bus exist). Stand up the Memory API over the existing vault + SQLite/vector index. **Write-shims first:** redirect every legacy writer (`.brain/`, `memory/`, etc.) to the Memory API and make the silos **read-only on Day 1** — this is what actually prevents the silo regression during the build window, not the API merely existing. Migrate `state.db`/MEMORY.md/USER.md with a read-through fallback so **Shay stays functional throughout**. *Result: "Shay aware of everything," with no degraded window.*
- **Phase 2 — One brain.** Point `shay-phone` and `shay-agent-os` at the gateway; delete their duplicate model code; formalize the Brain Router with cap tracking + deadlines; define gateway transport + supervised lifecycle (below). *Result: 3 brains → 1.*
- **Phase 3 — Capability Registry + Shay wiring.** Define the Capability contract; register Site Studio (wrap existing); promote `site_bridge.py` into Shay's capability tool. *Result: Shay acts across FAMtastic through a contract; "FAMtastic is the base" becomes real.*
- **Phase 4 — Hardening.** Adapter layer; solo-grade DoD gate (below); observability/cost metering; construction-time safety wrappers. *Result: the bug classes become unwritable.*
- **Phase 5 — Consolidation.** Retire the now-migrated silos for good; repo hygiene (untrack node_modules/pyc/logs); collapse the two dueling canonical docs into one. *Result: bloat and drift gone.*

---

## 5. What we deliberately do NOT build (anti-scope)
- No second desktop app (the Swift `shay-desktop` is retired; Electron is the surface).
- No new brain implementation — ever. Surfaces are clients.
- No bespoke vector DB — use a proven embedded store (sqlite-vec) or a managed memory framework (Mem0/Zep-class) rather than hand-rolling.
- No perpetual mirror syncs — migrate legacy stores once, then retire them.
- No config UI for unwired features — if it's not in the schema, it doesn't exist.
- No `.ralph/` autonomous-loop infra for this design work (it would not be "cheap").

---

## 6. Blocking decisions for you (must be made before the relevant phase)
*(Reprioritized after peer review — these are the build-blocking ones; lower-stakes questions moved to the backlog at the end.)*

1. **Git topology of `shay-shay` (blocks Phase 2/3).** Does `shay-shay` get absorbed into the FAMtastic repo, or stay a separate repo that registers with the kernel over a local socket? This decides whether "Shay is a FAMtastic component" is architecturally true or only metaphorical. *Recommend: keep it a separate repo but make it a registered kernel citizen via a local socket — avoids a painful history merge while still wiring it in.*
2. **Schema authority format (blocks Phase 0).** The kernel spans Node (Zod) and Python (Pydantic); two hand-maintained validators WILL drift. Pick one language-neutral source — **JSON Schema** (recommend), Protobuf, or OpenAPI — and generate both validators from it.
3. **Memory store choice (blocks Phase 1).** Embedded (sqlite-vec, zero infra, local-first) vs managed (Mem0/Zep-class). *Recommend embedded* — fits your local-first posture. Decide the **re-embedding strategy** here too: pin the embedding model, version every vector with its model id, and plan a background re-embed when the model changes (else months of memories silently go stale).
4. **`state.db` migration window (blocks Phase 1).** How does the live 70MB FTS5 history DB get absorbed without data loss, and what does Shay use *during* the migration? *Recommend: read-through fallback (new API reads old DB until backfill completes), with the Phase −1 backup as rollback.*

**Backlog (non-blocking):** which 2nd capability after Site Studio (Email/Media/Idea); Shay autonomy trust tiers (observe→propose→auto-apply) — these belong in the Shay component spec, not the architecture decision.

---

## 7. Peer-review disposition (what the review changed)

This plan was reviewed adversarially by a different model than the author (Sonnet vs Opus — our own REQ-09). The review could not fault the seven design laws or the requirement traceability, but it caught real engineering errors that are now fixed above:

| Review finding (severity) | Disposition |
|---|---|
| **Phase 0 dependency inversion** — memory fabric needs kernel's vault/schema/event-bus (CRITICAL) | **Fixed.** Reordered: Kernel skeleton is now Phase 0; Memory Fabric is Phase 1. |
| **"One canonical store" doesn't kill silos — migration does** (HIGH) | **Fixed.** Phase 1 now leads with *write-shims*: legacy stores go read-only Day 1, not Day 5. |
| **Gateway is an underspecified single point of failure; transport undefined** (HIGH) | **Accepted.** Decision added: define gateway transport per surface (local HTTP for CLI/web with a direct-library bypass when the gateway is down; WS for phone/desktop; stdio shim for MCP) + a supervised lifecycle (health endpoint, launchd restart policy). Folded into Phase 2. |
| **DoD gate is aspirational for a solo dev — no CI exists** (MED-HIGH) | **Fixed.** Solo-grade gate: a local pre-push hook runs typecheck + build + contract check (fast, cheap, every push); the vision-score + different-model adversarial review are *manually invoked* for significant changes only. What gets skipped is documented, not pretended. |
| **Two-language kernel understated; schema drift** (MED) | **Fixed.** Promoted to blocking decision #2 (one neutral schema source → generate both validators). |
| **Missing: `state.db` migration risk / rollback** | **Fixed.** Phase −1 backup + Phase 1 read-through fallback; blocking decision #4. |
| **Missing: vector re-embedding / embedding lock-in** | **Fixed.** Folded into blocking decision #3 (version vectors by model id, background re-embed). |
| **Missing: `shay-shay` git topology** | **Fixed.** Promoted to blocking decision #1. |
| **`rowboat-base` deferred to cleanup but is a live hazard** | **Fixed.** Moved to Phase −1 prerequisite. |

**Residual risks accepted (not yet designed):** the gateway-as-SPOF is mitigated (supervision + CLI bypass) but not eliminated — a wedged gateway still degrades interactive use; and the solo DoD gate trades rigor for practicality, so content-level regressions can still slip when the manual adversarial step is skipped under pressure.

---

## 8. Review log (who has reviewed this plan)
- **2026-06-08 — Adversarial peer review (Sonnet, different model than Opus author):** done; findings folded into §4/§6/§7.
- **Pending — Shay's review:** Shay (the gateway agent) to review this plan from her own vantage as the system being rebuilt. Her notes get appended here.
- **Optional/later — Codex adversarial pass:** deferred (Codex usage limit; resets Jun 10).

> This is a living plan. It stays POST–INITIAL-RESEARCH until the four blocking decisions in §6 are made. Nothing here is committed to build yet.

---

*Saved to root + vault (`obsidian/Shay-Memory/SHAYS-STATE-PEER-REVIEWED-PLAN.md`). Built from `SHAYS-CURRENT-STATE-BEFORE.md` + failure-mining of 273 buglog entries + 2026 agent-systems best practice + one adversarial peer-review pass. Awaiting Shay's review.*