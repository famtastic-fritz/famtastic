---
title: anti-drift-system-design-2026-05-31
type: design
permalink: shay-memory/research/anti-drift-system-design-2026-05-31
tags:
- shay
- anti-drift
- traceability
- reconcile
- design
- track-graph
status: design-only-not-implemented
---

# Anti-Drift System Design for Shay (2026-05-31)

> **Design only. Do NOT implement from this doc without the build story being tasked.**
> This is the spec + a ralph-style build story. Nothing here has been built.

## 0. The problem in one sentence

Shay's biggest owed deliverable (the **Agent OS port / W5**) drifted silently — the
plan was authored (W5.0 `done`) but **no build tasks were ever created**, and nobody
noticed for weeks. The **exact same failure** produced today's "missed capabilities"
crisis: `capability-map-2026-05-31.md` flagged ~13 ADOPT-NOW items, the adopt-plan
silently dropped 6 (rlm-rs, TencentDB, TurboVec, graphify, verification loops,
interview engine), and flat-markdown recall could not surface the drop.

This is the textbook **goal-drift-through-omission** failure (the literature calls it
`GD_inaction` — passive abandonment of a goal-consistent action) combined with a
**broken trace graph** (recommendation→plan→task→build→status links never created).
The fix is the same one requirements-traceability research lands on: an **enforced
trace graph + a reconcile loop that flags missing links** ("orphan nodes"). See
§9 for prior art.

## 1. Root cause (grounded in the vault + the live systems)

There are **two** independent causes, and both must be fixed:

### Cause A — memory has no graph link between plan → task → build → status
`missed-capabilities-impact-map-2026-05-31.md` says it directly:

> "flat-markdown memory with no graph/link layer. Because recall is file-grep, not
> semantic+linked, Shay can't connect 'capability-map recommended X' → 'adopt-plan
> executed Y' → 'X was silently dropped.' That is *exactly* how rlm-rs / TencentDB /
> TurboVec got missed."

The Shay vault (`~/famtastic/obsidian/Shay-Memory`) is L0→L3 layered markdown
(`_system/MEMORY-SCHEMA-L0-L3.md`), retrieved by grep/FTS/Smart-Connections. A
recommendation in `capability-map-2026-05-31.md` and a card on the `agentos` board
have **no edge between them**. Nothing can answer "which ADOPT-NOW items have no
fulfilling task?" because the question requires a join across two silos that share
no keys.

### Cause B — the only drift detector covers the wrong universe
`~/famtastic/scripts/plans/audit.js` is solid but scoped to the **website-factory**
flat-file plan system only:
- It reads `plans/registry.json` (`active_parent_ids[]`) and `tasks/tasks.jsonl`.
- It flags: active plan + 0 open tasks (drift), conflicts (registry vs closeout),
  orphan tasks (task → unknown plan).
- It **does not see** the Shay desktop/AI-OS workstreams at all. Those live in a
  **completely different place**: SQLite kanban boards at
  `~/.shay/kanban/boards/{agentos,deskbuild,research}/kanban.db`, plus the Shay plans
  in `~/.shay/plans/*.md` and the Obsidian research vault.

So the W5 stall was **invisible to audit.js by construction** — W5 was never a
famtastic flat-file plan; it was a kanban card (`t_e860c4b0`, board `agentos`).

### Cause C (the stale-card variant) — built ≠ tracked
The `deskbuild` board shows **9 cards stuck in `triage`** (W1.1–W1.6, W6, W7,
W-Models). But `.wolf/cerebrum.md` "Shay Desktop UI sprint" (2026-05-31) records that
much of this UI **was actually built** (7 skills minted, Soul/Models screens mounted,
render-spine fixes shipped). The board never advanced the cards. This is the inverse
drift: **work happened, status didn't move** → the board lies in the other direction,
inflating the perceived backlog and hiding what's genuinely undone.

### Live-system facts that constrain the design (verified this session)
- **Kanban store:** SQLite, one DB per board under `~/.shay/kanban/boards/<slug>/kanban.db`.
  `tasks` table columns include `id, title, body, status, assignee, created_at,
  started_at, completed_at, result`. Statuses seen: `triage, todo, ready, running,
  blocked, done`. Tables: `tasks, task_links (parent_id/child_id), task_comments,
  task_events, task_runs`. CLI: `shay kanban --board <slug> {list,show,stats,
  diagnostics,comment,edit,link,...}`.
- **`task_links`** already exists (parent→child *within* kanban). There is **no**
  cross-system edge type (kanban card → vault note → famtastic plan).
- **famtastic plans:** flat files. `plans/registry.json` + `plans/<id>/plan.json` +
  `plans/<id>/closeouts/<date>-<verdict>.json` + `tasks/tasks.jsonl`. Closeout schema
  in `plans/CLOSEOUT-SCHEMA.md` (verdicts: completed | needs_tasking | parked |
  superseded | checkpoint_complete).
- **Cron / scheduling:** the **gateway** runs the scheduler (`shay gateway start`;
  the kanban daemon is deprecated and folded into the gateway). Jobs live in
  `~/.shay/cron/jobs.json`. `shay cron create <schedule> --no-agent --script <name>
  --deliver telegram` runs a script under `~/.shay/scripts/` and **delivers stdout
  verbatim** (classic watchdog pattern — already used by `context_daemon.py`,
  `curator_autorun.sh`). `.sh`→bash, everything else→Python. This is the reconcile hook.
- **Desktop surface:** `shay dashboard` (web, port 9119) + the Electron Shay Desktop.
  Both can render a new read-only JSON endpoint or a generated markdown panel.
- **`~/.shay` is a git repo** — a reconcile script + ledger committed there is tracked.
- **`shay kanban diagnostics`** exists but currently reports board-internal health only
  (stale claims, circuit-breaker trips). It does **not** do cross-system reconcile.

## 2. Design goal

A **Drift Reconciler** that maintains one cross-system **trace graph**
(recommendation → plan → task → build → status), detects the two orphan classes that
caused the misses, surfaces drift automatically (periodic reconcile + dashboard +
notify), extends `audit.js`'s coverage to the Shay universe, and closes the
built-but-triage stale-card gap. It must **tie into the planned graphify/TencentDB
memory backend** so it is not yet another silo — but it must also **work today** on
flat files (graph backend is an upgrade, not a prerequisite).

## 3. The trace graph data model

One node type with a `kind`, and one edge type with a `rel`. Nodes are addressable by
a stable, content-derived **TRACE ID** so the same artifact gets the same node across
reconcile runs (idempotent, per the dynamic-CRUD standing rule in MEMORY.md).

### Node kinds
| kind | source of truth (today) | example | natural key |
|---|---|---|---|
| `recommendation` | vault note headings/rows flagged ADOPT-NOW (`capability-map-*.md`, impact-map) | "Adopt rlm-rs" | `rec:<vault-permalink>#<slug>` |
| `plan` | `~/.shay/plans/*.md` front-matter + famtastic `plans/registry.json` | master-plan W5 | `plan:<source>:<id>` |
| `task` | kanban card (`kanban.db.tasks`) OR famtastic `tasks/tasks.jsonl` | `t_e860c4b0` W5.0 | `task:<board>:<id>` / `task:fam:<task_id>` |
| `build` | git commit / file artifact / proof-ledger entry | commit `4e1b871`, proof file | `build:<repo>:<sha>` / `build:proof:<id>` |
| `status` | derived (not stored) — see §5 | `fulfilled`/`drifted` | n/a (computed) |

Status is **derived, never stored** — same discipline as `site-studio/lib/ops-freshness.js`
(cerebrum Ops rule #1: "Freshness is derived, never stored"). One derivation function,
no parallel copies.

### Edge relations (`rel`)
- `fulfilled_by` : recommendation → plan, plan → task, task → build
- `supersedes` / `superseded_by` : plan → plan (mirrors closeout `moved_to[]`)
- `blocks` / `blocked_by` : task → task (mirrors kanban `task_links` + `blocked`)
- `evidence_for` : build → task (proof/commit backing a task)

A complete healthy chain: `recommendation --fulfilled_by--> plan --fulfilled_by-->
task --fulfilled_by--> build`. **Any chain that dead-ends before `build` (for an
ADOPT-NOW rec) or before `task` (for an active plan) is drift.**

### Physical storage (today, flat-file)
A single append-only edge ledger + a rebuildable node snapshot, both in the vault so
basic-memory/Obsidian index them with zero config change (same trick the L0–L3 schema
uses):

```
~/famtastic/obsidian/Shay-Memory/_system/trace/
  nodes.jsonl        # one line per node: {trace_id, kind, title, source, ref, first_seen, last_seen}
  edges.jsonl        # one line per edge: {from, to, rel, source, asserted_by, at}
  reconcile-<date>.md  # human-readable drift report (the dashboard/notify artifact)
```

Edges are **asserted** three ways:
1. **Explicit** — a human/agent writes `link: [task:agentos:t_e860c4b0]` into a plan's
   front-matter, or runs `shay kanban link`, or names a `rec:` id in a closeout packet's
   new `fulfills[]` field (schema addition, §7).
2. **Heuristic** — the reconciler matches by shared W-number / slug / title token
   (e.g. card "W5.0" ↔ master-plan "W5"; rec "Adopt rlm-rs" ↔ research card
   "Adopt rlm-rs (Recursive Language Models)"). Heuristic edges carry
   `asserted_by: "heuristic"` and a `confidence` so they can be promoted/demoted.
3. **Git-mined** — `build` nodes link to `task` nodes when a commit message or proof
   entry names a task id / W-number (the §9 "60% of commits link to issues" problem —
   we make the linking cheap and reviewable rather than mandatory).

### Physical storage (after graphify/TencentDB lands)
The exact same `{from, to, rel}` triples become graph edges in the memory backend.
`nodes.jsonl`/`edges.jsonl` become the **import format** (and the offline fallback).
This is the anti-silo guarantee: **design the edges now in the shape the graph backend
will consume**, so adopting graphify is a loader, not a rewrite. (TencentDB
Identity/Experience/Persona tiers hold the *semantic* recall; the trace graph holds the
*structural* recall. They are complementary, not competing.)

## 4. The two drift detectors (the heart of it)

### Detector 1 — "plan node with no fulfilling task/build node"
For every `plan` node whose source marks it **active/owed** (famtastic
`active_parent_ids[]`, OR a `~/.shay/plans/*.md` with `status: active|live`, OR a kanban
card not in a terminal status):
- Walk `fulfilled_by` edges downward.
- **DRIFT if** the chain dead-ends at `plan` with no `task` child, **or** at a `task`
  that is `triage|todo|ready|blocked` with no `build`/proof and no recent activity.
- This is exactly the W5 case: `agentos` board has one card (W5.0 "author plan") `done`,
  and **zero** child build cards. The reconciler flags `plan:shay:W5` as
  `drifted (no fulfilling build task)`.

### Detector 2 — "capability flagged ADOPT-NOW but never tasked"
For every `recommendation` node with verdict containing `ADOPT-NOW`:
- Require a `fulfilled_by` edge to a `plan` **and** onward to a `task`.
- **DRIFT if** no path reaches a non-terminal-or-completed `task`.
- This catches the 6 silently-dropped items. Parse `ADOPT-NOW` rows out of
  `capability-map-2026-05-31.md` (the `| ... | ADOPT-NOW | ... |` table rows) and the
  impact-map's numbered priority list; match each against tasks; report unmatched.

### Detector 3 — "built-but-triage" (closes Cause C, the stale-card problem)
For every `task` node in a **non-terminal** kanban status (`triage|todo|ready`):
- Look for evidence the work is actually done: a `build` node linked to it (git commit
  naming its W-number), a proof-ledger entry, **or** a vault note / cerebrum entry
  asserting it shipped (e.g. cerebrum's "Shay Desktop UI sprint" naming W-Models/Soul).
- **STALE if** evidence of completion exists but status ≠ `done`.
- Output is a **reconcile suggestion**, not an auto-mutation: `shay kanban --board
  deskbuild complete t_f3b814d8  # evidence: commit <sha> mounts Models screen`.
  Fritz (or an approved agent) confirms. Auto-completing on heuristic alone would be the
  inverse failure — see the cerebrum "no self-attest 'done'" rule. The reconciler
  *proposes*; a human/explicit signal *disposes*.

(Detector 3 also runs the reverse: a `done` card with no build evidence at all →
`status-without-proof` warning, the "claimed done but isn't" gap from CLAUDE.md Rule 2.)

## 5. Surfacing drift automatically

### 5a. Periodic reconcile (the cron hook)
Add `~/.shay/scripts/drift_reconcile.py` and register it with the **gateway scheduler**
(NOT a separate launchd — the gateway already owns cron):

```
shay cron create "0 8 * * *" --no-agent --script drift_reconcile.py \
  --deliver telegram --name drift-reconciler --workdir ~/famtastic
```

`--no-agent` = the script IS the job, stdout delivered verbatim (zero LLM tokens —
respects the cap-burn lesson in MEMORY.md `project_codex_subscription_capped`). It runs
08:00 daily (one hour before the existing `intelligence-loop` 09:00 Mon/Wed/Fri, and
ahead of the 09:00 model-discovery job). **Empty stdout = silent** (watchdog convention),
so a clean reconcile sends nothing; drift sends a crisp Telegram with the orphan list.

The script:
1. Rebuilds `nodes.jsonl` from all four sources (vault recs, both plan stores, both task
   stores, git/proof for builds).
2. Re-asserts heuristic + git-mined edges; preserves explicit edges.
3. Runs Detectors 1–3.
4. Writes `_system/trace/reconcile-<date>.md` (the durable, vault-indexed report).
5. Prints a one-screen summary to stdout (only if non-empty) for Telegram delivery.

### 5b. Dashboard panel
`shay dashboard` (port 9119) and the Electron desktop both read a new read-only endpoint
**`GET /api/drift`** served by the gateway web server
(`~/.shay/hermes-agent/hermes_cli/web_server.py`). It returns the snapshot-envelope shape
the Ops contract already mandates (cerebrum Ops rule #2):
`{ snapshot_version, generated_at, source_ledgers[], record_count, data: { drift[],
stale[], status_without_proof[], healthy_chains[] } }`. A "Drift" tile renders three
lists: **Owed but un-tasked** (Detector 1+2), **Built but not closed** (Detector 3),
**Done but unproven**. Each row links to the source note/card. No write actions in v1 —
it surfaces; the human acts via `shay kanban`/closeout.

### 5c. Morning briefing integration
`~/.shay/scripts/morning_digest.py` (the 07:30 `morning-command-center` job) gains a
**"Drift watch"** section that reads the latest `reconcile-<date>.md` and front-loads
the worst N orphans. This guarantees drift cannot pile up unseen between manual checks —
it is in Fritz's face every morning, exactly where the W5 stall would have been caught.

## 6. Extending / replacing audit.js to cover Shay workstreams + kanban

**Recommendation: extend, don't replace.** `audit.js` is correct for the famtastic
flat-file universe and is referenced by the CLAUDE.md Plan Closeout Rule. Add a sibling
that covers the Shay universe, then a thin unifier so one command reports both.

### New files
- `~/famtastic/scripts/plans/audit-shay.js` — read-only. Mirrors `audit.js`'s shape but
  reads:
  - `~/.shay/kanban/boards/*/kanban.db` (via `sqlite3` or `better-sqlite3`) → tasks per
    board, statuses, `task_links`, `task_events` (for last-activity recency).
  - `~/.shay/plans/*.md` front-matter (`status`, optional `link:` edges).
  - vault ADOPT-NOW recs.
  Reports the same four classes scoped to Shay: drift (active plan / owed rec with no
  fulfilling task), stale (task with no `task_events` in N days), built-but-triage,
  conflicts. **Exit code 0 = clean, 2 = drift** — identical contract to `audit.js`, so
  CI/cron treat them the same.
- `~/famtastic/scripts/plans/audit-all.js` — runs `audit.js` + `audit-shay.js`, merges
  via the shared trace graph (`_system/trace/*.jsonl`), prints a unified report, and is
  the single entry point the CLAUDE.md rule points to. Exit 2 if **either** is dirty.
- `~/.shay/scripts/drift_reconcile.py` — the cron-delivered watchdog (§5a). Thin wrapper:
  it shells `node audit-all.js --json`, formats the orphan list, writes the vault report,
  prints summary. (Python because cron scripts run via Python by default and the gateway
  ergonomics expect it; the *logic* lives in the Node audit so there's one source of truth.)

### Shared library (single derivation, no parallel copies)
- `~/famtastic/scripts/plans/lib/trace-graph.js` — the **only** place that builds nodes,
  asserts edges, and derives `status`. Both `audit-shay.js` and `audit-all.js` import it.
  This honors the cerebrum Ops rule #1 (freshness/status derived in exactly one library)
  and the root-cause finding in cerebrum: "Five independent state readers… is a state
  architecture problem." One reader for the trace graph, period.

### CLAUDE.md rule update (design note, not done here)
The Plan Closeout Rule becomes: *run `node scripts/plans/audit-all.js` at session end*
(covers both universes), and the **Shay kanban boards are now in scope** — a card that is
`triage` while a build proves it shipped is a closeout violation, resolved by
`shay kanban complete` + (optionally) a closeout packet.

## 7. Closing the loop: making links cheap to create (so they actually get made)

Detection without easy linking just relocates the toil. Three low-friction assertions:
1. **Closeout schema gains `fulfills[]`** — add to `plans/CLOSEOUT-SCHEMA.md` packet:
   `"fulfills": ["rec:capability-map-2026-05-31#rlm-rs", "plan:shay:W5"]`. When a
   closeout lands, the reconciler ingests these as explicit `fulfilled_by` edges. This
   makes "did we actually deliver the thing we were asked to?" a structural property of
   every closeout.
2. **Plan front-matter `link:`** — `~/.shay/plans/*.md` and famtastic `plan.json` may
   carry `link: [rec:..., task:...]`. Authoring a plan in response to a recommendation
   means adding one line.
3. **`shay kanban specify`/`link`** — when a card is created from a rec or a plan, add a
   `task_comment` of the form `fulfills: rec:<id>` (the reconciler reads `task_comments`).
   Cheap, in-tool, no new surface.

The reconciler **infers** edges when these are missing (heuristic + git-mining), so the
system is useful on day one with zero back-filling — explicit links just upgrade
confidence and silence false positives.

## 8. Buildable-now vs needs-the-graph-backend-first (honest split)

### Buildable NOW (flat-file reconcile — no new infra, no graph DB)
- `nodes.jsonl` / `edges.jsonl` in `_system/trace/` (plain JSONL, vault-indexed).
- `lib/trace-graph.js`, `audit-shay.js`, `audit-all.js` (Node, read-only, sqlite3 for
  kanban DBs which already exist).
- `drift_reconcile.py` + `shay cron create … --no-agent` (the scheduler is live).
- `reconcile-<date>.md` report + morning-digest "Drift watch" section.
- Detectors 1–3 (heuristic + git-mining edges).
- This fully closes the W5-class and the built-but-triage gaps **today**. Everything in
  §3–§6 except semantic edge inference is flat-file-achievable.

### Needs the graph memory backend (graphify/TencentDB) FIRST — deferred
- **Semantic** edge inference (rec ↔ task when wording diverges and no shared
  W-number/slug exists). Today's heuristic matcher will miss paraphrased links; a vector/
  graph backend with embeddings closes that gap. Until then, explicit `fulfills[]`
  (§7.1) is the workaround.
- **Cross-session "why did this drop?" provenance queries** ("show every rec that lost
  its task and when") at scale — trivial as graph traversal, clunky as repeated JSONL
  scans once the ledger is large.
- **Unified semantic+structural recall** (the TencentDB tiers holding identity/experience
  alongside the structural trace edges). The JSONL ledger is explicitly designed as the
  **import format** for that backend (§3), so this is an upgrade path, not a throwaway.

**Honest bottom line:** the part that actually caused the misses — *no detector ran over
the Shay universe, and no link existed between rec and task* — is **100% buildable now**
with flat files and the existing gateway cron. The graph backend makes it *smarter*
(catches paraphrased drift, scales provenance) but is **not** required to stop the
bleeding. Build the flat-file reconciler first; adopt graphify as the loader later.

## 9. Prior art (kept practical)

- **Goal drift through omission** (`GD_inaction`) — the formal name for "agent passively
  abandons a goal-consistent action," i.e. the silent W5 drop. Long-horizon agents are
  *most* vulnerable on scheduled background tasks and across multi-session continuity,
  which "requires durable goal and state files" — precisely the trace ledger here.
  (arXiv 2505.02709 "Evaluating Goal Drift in Language Model Agents"; Zylos goal-persistence
  research.)
- **Requirements traceability** — Trace Creation / Maintenance / Integrity; "Trace Link
  Completion" = filling missing links is the named sub-task our reconciler performs. Field
  finding: **only ~60% of commits link to their issue** without enforced linking — which
  is *why* §7 makes linking cheap + the reconciler mines git rather than mandating tags.
  (arXiv 2405.10845; ReqToCode arXiv 2603.13999 "traceability as a structural property of
  the codebase" — mirrors our `fulfills[]`-in-closeout idea.)
- **Orphan-node detection** — unlinked nodes lacking relationships to structured data;
  detect-and-allocate is the standard graph remedy. Detectors 1–2 are orphan-node finders.
  (arXiv 2310.14093.)
- **Real-time agent failure detection** — monitor across steps for anomalies incl. goal
  drift (Partnership on AI, 2025). Our daily reconcile + morning-digest is the
  poor-man's-but-sufficient version: periodic structural check rather than per-step
  monitoring, appropriate for a single-operator system.

## 10. Ralph-style build story (loop-until-dry; design only — task before building)

> Ralph = one focused loop, each pass leaves the tree green, surgical edits over regen,
> two-gate verification. Honor cerebrum: surgical-patch for existing files; never
> self-attest "done"; reconciler *proposes* status changes, humans dispose.

**STORY-0 — Spike the readers (read-only, prove the joins).** Write `lib/trace-graph.js`
that loads: kanban DBs (sqlite3), `~/.shay/plans/*.md`, famtastic `registry.json` +
`tasks.jsonl`, and the ADOPT-NOW rows from `capability-map-2026-05-31.md`. **Gate:** prints
node counts per kind matching reality (e.g. agentos=1 task, deskbuild=9, 13 recs). No
writes.

**STORY-1 — Detector 2 first (it's the live wound).** Implement "ADOPT-NOW with no task."
**Gate:** it must independently re-derive the 6 dropped items named in the impact-map
(rlm-rs, TencentDB, TurboVec, graphify, verification loops, interview engine). If it
doesn't reproduce the known-bad list, the matcher is wrong — fix before proceeding.

**STORY-2 — Detector 1 (owed plan, no build task).** **Gate:** flags `plan:shay:W5`
(agentos: plan done, zero build children) and stays silent on plans that *do* have open
tasks. Reproduce the W5 stall from cold data.

**STORY-3 — Detector 3 (built-but-triage).** Mine git + cerebrum for completion evidence.
**Gate:** flags ≥1 deskbuild card that cerebrum's UI-sprint entry proves shipped (e.g.
W-Models / Soul screen), and emits a `shay kanban complete …` suggestion — but performs
**no** mutation.

**STORY-4 — Edge ledger + idempotent rebuild.** Write `nodes.jsonl`/`edges.jsonl`;
re-running yields identical content (content-derived TRACE IDs; dynamic-CRUD rule).
**Gate:** two consecutive runs → zero diff.

**STORY-5 — `audit-shay.js` + `audit-all.js`.** Wrap detectors in the exit-0/2 contract.
**Gate:** `audit-all.js` exits 2 today (drift exists), names the W5 + 6-drop + stale
cards; a synthetic all-linked fixture exits 0.

**STORY-6 — Cron watchdog.** `drift_reconcile.py` shells `audit-all.js --json`, writes
`reconcile-<date>.md`, prints summary only if non-empty. Register via
`shay cron create "0 8 * * *" --no-agent --script drift_reconcile.py --deliver telegram`.
**Gate:** manual `shay cron run drift-reconciler` (or `shay cron tick`) delivers a real
Telegram listing the W5 drift; a clean fixture delivers nothing.

**STORY-7 — Surfaces.** `GET /api/drift` (snapshot envelope) in the gateway web server +
a Drift tile on `shay dashboard` + "Drift watch" in `morning_digest.py`. **Gate:**
dashboard tile and morning brief both show the same orphan list as the CLI; numbers match
(single derivation).

**STORY-8 — Cheap linking.** Add `fulfills[]` to CLOSEOUT-SCHEMA, `link:` to plan
front-matter, `fulfills:` task-comment convention; reconciler ingests explicit edges and
demotes the matching heuristic warnings. **Gate:** asserting one explicit `fulfills` edge
for a previously-flagged rec removes it from the drift list on the next run.

**STORY-9 — Close the real backlog (using the tool on itself).** Run the reconciler; for
each true orphan, ship the right artifact: `needs_tasking` closeout / new kanban build
cards for W5 + the 6 dropped adopts; `shay kanban complete` for the genuinely-built
deskbuild cards. **Gate:** `audit-all.js` exits 0 — and the Agent OS port finally has
build tasks. This is the whole point: the system's first job is to fix the drift that
motivated it.

**Deferred (needs graph backend):** semantic edge inference, scaled provenance queries,
graphify/TencentDB import of the JSONL ledger. Task these only after STORY-0–9 are green
and graphify is actually adopted.

## 11. File/script manifest (what to add — nothing built yet)

| Path | Type | Status |
|---|---|---|
| `~/famtastic/scripts/plans/lib/trace-graph.js` | shared reader/derivation (the ONLY one) | to add |
| `~/famtastic/scripts/plans/audit-shay.js` | Shay-universe audit (exit 0/2) | to add |
| `~/famtastic/scripts/plans/audit-all.js` | unified entry point | to add |
| `~/.shay/scripts/drift_reconcile.py` | gateway-cron watchdog | to add |
| `~/famtastic/obsidian/Shay-Memory/_system/trace/nodes.jsonl` | node snapshot (rebuilt) | to add |
| `~/famtastic/obsidian/Shay-Memory/_system/trace/edges.jsonl` | edge ledger (append + explicit) | to add |
| `~/famtastic/obsidian/Shay-Memory/_system/trace/reconcile-<date>.md` | drift report (vault-indexed) | generated |
| `GET /api/drift` in `~/.shay/hermes-agent/hermes_cli/web_server.py` | read-only endpoint | to add |
| Drift tile in `shay dashboard` UI + Electron | surface | to add |
| "Drift watch" section in `~/.shay/scripts/morning_digest.py` | surface | to edit |
| `fulfills[]` in `~/famtastic/plans/CLOSEOUT-SCHEMA.md` | schema addition | to edit |
| cron job `drift-reconciler` (`~/.shay/cron/jobs.json`) | schedule | to register |
| CLAUDE.md Plan Closeout Rule → point at `audit-all.js`, add kanban scope | doc | to edit |

## 12. Known gaps this design itself opens (record honestly, per CLAUDE.md Rule 3)
- Heuristic edge matching will produce **false negatives** on paraphrased rec↔task pairs
  until the graph backend lands; explicit `fulfills[]` is the manual mitigation.
- Detector 3's "built" evidence from cerebrum/git is **probabilistic** — it proposes,
  never auto-closes; a wrong proposal is a 1-click dismiss, but it is noise until tuned.
- Two task stores (kanban SQLite + famtastic `tasks.jsonl`) remain separate physical
  stores; the trace graph **joins** them but does not **merge** them. Full unification is
  out of scope and arguably undesirable (different lifecycles).
- The reconciler reads `~/.shay` from a famtastic-rooted script; if `~/.shay` paths move,
  the readers need updating (low risk — paths are stable, launchd-managed).
