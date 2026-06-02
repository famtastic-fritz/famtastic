---
title: cross-agent-context-layer-2026-05-31
type: design
permalink: shay-memory/research/cross-agent-context-layer-2026-05-31
tags:
- shay
- agents
- context-awareness
- preload
- hooks
- memory
- single-source-of-truth
- design
status: design-only-not-implemented
---

# Universal Cross-Agent Context-Awareness Layer (2026-05-31)

> **Research + design only. Nothing here is built.** This is the spec, the verified
> mechanism facts per surface, the reuse-before-generate inventory, and a ralph-style
> build story. Implement only after the build story is tasked.
>
> Frame (Fritz): **"fix all agents, not just Shay."** The goal is ONE source of truth
> that orients *any* agent surface — Claude Code, Codex, Gemini CLI, Cowork, and Shay's
> own sub-agents — on (a) the system (what FAMtastic/Shay is, the repos, current state)
> and (b) HOW to be context-aware (where recall lives, what to read before acting,
> reuse-before-generate).

---

## 0. The problem in one sentence

Every agent surface is oriented by a **different, hand-maintained file** (or by nothing
at all), so the orientation drifts surface-to-surface; one surface (Gemini) is
**completely uncovered**; and the one hook that's supposed to inject "system map +
recall path" at startup **injects nothing into the model's context window** — it only
writes disk state and stderr. The result is exactly the failure the prior research
named: drift-through-omission, and recall-by-grep instead of recall-by-link. The fix is
the same shape the anti-drift design landed on — **one generated source of truth + a
reconcile/emit step + a runtime recall path tied to the graph-memory spine.**

---

## 1. Grounded reality — what actually exists today (verified this session)

### 1a. Per-surface preload mechanisms (verified against the live machine)

| Surface | How it ingests standing context TODAY | Verified file/mechanism | State |
|---|---|---|---|
| **Claude Code** | `CLAUDE.md` with `@-imports` (`@famtastic-dna.md`, `@STUDIO-CONTEXT.md`) + a `SessionStart` hook | `~/famtastic/CLAUDE.md`; `.claude/settings.json` → `.wolf/hooks/session-start.js` | CLAUDE.md works; **hook injects nothing to context** (see 1c) |
| **Codex / Cursor** | `AGENTS.md` (top-level) and `.cursorrules` | `~/famtastic/AGENTS.md` exists (196 tok, points to AGENT-STARTUP-CONTRACT.md); **no `.cursorrules` anywhere** (verified absent) | Partial — AGENTS.md is thin |
| **Gemini CLI** | `GEMINI.md` (+ `activate_skill`) | **NO `GEMINI.md` exists anywhere** under `~/famtastic` or `~/.shay` (verified) | **UNCOVERED** |
| **Cowork** | Reads `CLAUDE.md` / `AGENTS.md` like Claude Code (plugin surface) | same files as Claude Code | Inherits CLAUDE.md/AGENTS.md |
| **Shay sub-agents** | `prompt_builder.build_context_files_prompt()` assembles the system prompt | `shay-shay/agent/prompt_builder.py` | Works, and is the convergence point — see 1b |

**The load-bearing discovery (Shay sub-agents already read the shared files).**
`shay-shay/agent/prompt_builder.py:1513 build_context_files_prompt()` uses a
**first-match-wins priority chain** and loads **only ONE** project-context file:

```
1. .shay.md / SHAY.md   (walk to git root)
2. AGENTS.md / agents.md (cwd only)        ← currently the match in ~/famtastic
3. CLAUDE.md / claude.md (cwd only)
4. .cursorrules / .cursor/rules/*.mdc
```

plus `SOUL.md` from `SHAY_HOME` (`~/.shay/SOUL.md`, verified present, 2719 bytes),
which is **always** loaded as the identity slot. Each source is capped at
`CONTEXT_FILE_MAX_CHARS = 20_000` and run through `_scan_context_content()` (a
prompt-injection scanner). **There is no `.shay.md` in `~/famtastic`** (verified
absent), so Shay's chain currently falls through to **`AGENTS.md`** — meaning
**AGENTS.md is already the de-facto shared orientation file that Shay's own sub-agents
read.** That is the single most important fact for this design: a generated `AGENTS.md`
emits to Codex, Cursor, Cowork **and** Shay sub-agents at once.

### 1b. Persistent / recall mechanisms that already exist (reuse-before-generate baseline)

- **`.wolf/` (OpenWolf)** — `anatomy.md` (file inventory + token estimates), `cerebrum.md`
  (learnings + Do-Not-Repeat + decision log), `buglog.json` (bug history). Git-tracked,
  curated. Injected into Claude Code only via the CLAUDE.md OpenWolf section (prose
  instruction to read them), **not** auto-injected.
- **basic-memory** — wired to the vault: `~/.basic-memory/config.json` →
  `shay-memory` project at `~/famtastic/obsidian/Shay-Memory`, `semantic_search_enabled:
  true`, fastembed `bge-small-en-v1.5`. Local semantic recall over the vault exists today.
- **vault-semantic-search MCP** (`~/.shay/tools/vault-semantic-mcp/server.py`) — read-only
  FastMCP server exposing a `search_vault` semantic tool (on-device fastembed, no API key).
  Recent commit #208 records it "live in gateway via HTTP service." This is the runtime
  recall path that already works.
- **Shay in-agent memory** — `prompt_builder` carries a persistent-memory system block +
  `session_search` recall; `memory_tool.py` stores capped MEMORY/USER snapshots
  (2200/1375-char caps — the documented drop mechanism per efficiency-map #8).
- **L0→L3 reflection schema** — `_system/MEMORY-SCHEMA-L0-L3.md` + nightly `reflect.py`
  (RAW→episodic→semantic→reflective). Additive over the vault.
- **Claude Code native memory** — `~/.claude/projects/.../memory/MEMORY.md` (the auto-memory
  index shown in this session's system reminder).
- **`.mcp.json`** — Claude Code in `~/famtastic` sees exactly ONE MCP server: `famtastic`
  (read-only, 4 tools — flagged in cerebrum as needing write capability).

### 1c. The mechanism gap (verified, and it is the crux)

The `SessionStart` hook (`.wolf/hooks/session-start.js`) **never writes to stdout** (grep
confirmed: zero `stdout`/`console.log`/`additionalContext`/`hookSpecificOutput`). Claude
Code's SessionStart contract injects context into the model **only via stdout** (plain
text is appended as context, or JSON `{"hookSpecificOutput":{"hookEventName":
"SessionStart","additionalContext":"..."}}`). The current hook only: cleans `.tmp` files,
writes `_session.json`, appends a memory.md header, and emits **stderr** nudges ("learn
this session"). **Stderr is shown to the user/log, not injected into the model.** So the
orientation that *feels* automatic actually reaches Claude only through the static
CLAUDE.md `@-imports`. There is no live "current state" injection at all — `STUDIO-CONTEXT.md`
is a stale committed snapshot (dated 2026-05-31T23:14 but content is a `site-demo` stub).

### 1d. Skills audit — agent-context / persistent-memory skills (reuse-before-generate)

- `~/.shay/skills`: **162 SKILL.md files** across 87 top-level dirs. Scanned for
  `memory|context|agent|orient|recall|persist|startup|prime` — the **only** name match is
  the *category* `autonomous-ai-agents` (contains `goal-decompose`). **There is no
  agent-context, agent-orientation, or persistent-memory skill in Shay's library.** Confirmed
  gap.
- The closest existing primitives are skill-adjacent, not skills: `caveman` (token
  compression), `token-optimizer`, `system-discovery`. None orient an agent or manage
  cross-session memory.

---

## 2. Community scan — does an off-the-shelf layer already exist? (reuse-before-generate)

Verified live this session + cross-checked against the three prior research docs.

| Candidate | What it is | Verdict for THIS layer | Why |
|---|---|---|---|
| **claude-mem** (thedotmack) | "Persistent context across sessions for every agent" — 5 hooks, 4 MCP tools, SQLite+FTS5+Chroma, port-37777 worker; supports Claude Code/Codex/Gemini/Hermes | **INSTALL-BEHIND-FLAG only — do NOT base the layer on it** | Already evaluated (claude-mem-evaluation doc): **auto-writes `CLAUDE.md`** (collides with curated CLAUDE.md), captures tool I/O to **plaintext SQLite** (secrets risk), installs Bun + background worker. Largely **redundant** with `.wolf` + basic-memory + MEMORY.md. Its one net-new (auto session telemetry) is the noisiest form. |
| **SkillNet** (`api-skillnet.openkg.cn/v1/search`) | Skill registry w/ 5-D evaluations, live JSON API | **ADOPT as a discovery source** (already designed in community-gap doc) — not a context layer | Fills the *gap-discovery* half of reuse-before-generate, not orientation |
| **clawhub.ai** (`/api/v1/skills`) | OpenClaw skill/plugin marketplace, live JSON (no server search) | **ADOPT as secondary discovery source** — not a context layer | Same — discovery, not orientation |
| **mem0** | Hosted/OSS memory layer, vendor SDK | **SKIP for now** | Adds a vendor dependency + (hosted) external transmission; overlaps basic-memory + the planned TencentDB tiers. Re-evaluate only if a managed memory API is wanted. |
| **Letta / MemGPT** | Stateful agent runtime w/ self-editing memory | **SKIP for the layer; MONITOR the pattern** | It's an agent *runtime*, not a context-emit layer; adopting it means re-platforming the agent loop. The self-editing-memory *idea* informs the TencentDB Experience tier. |
| **MCP "memory" servers** (e.g. modelcontextprotocol/server-memory, knowledge-graph servers) | MCP servers exposing a memory/KG tool | **PARTIAL reuse** — pattern, not product | The *runtime recall* half is already covered by the existing `vault-semantic-search` MCP + basic-memory. A generic KG-memory MCP is the upgrade path once graphify/TencentDB lands (it becomes the import target). |

**Reuse-before-generate bottom line:** the **emit/orientation** half has no off-the-shelf
product that respects the curated-CLAUDE.md + secrets constraints — it must be a thin
generator over files Fritz already owns. The **recall** half is ~80% already built
(basic-memory + vault-semantic-search MCP); the missing piece is the **graph/link layer**
(the trace graph from the anti-drift design + TencentDB tiers), which is the deferred
backend. **Do not build a new memory store; build the emitter + wire the recall path that
exists, designed in the shape the graph backend will consume.**

---

## 3. The design — `AGENT-CONTEXT` single source of truth → per-surface emit + a real hook

### 3a. One source of truth

A single generated manifest is the **only** hand-authored-once + auto-refreshed source:

```
~/famtastic/docs/agent-startup/AGENT-CONTEXT.yaml   (the source of truth — structured)
```

It has four sections, deliberately small (each surface gets a budget-trimmed slice):

```yaml
system_map:            # WHAT the ecosystem is — stable, slow-churn
  identity: "FAMtastic + Shay …"          # one paragraph
  repos:                                    # the real repos, verified paths
    - {name: famtastic, path: ~/famtastic, role: "one repo — site/idea/agent/admin"}
    - {name: shay-shay, path: ~/famtastic/shay-shay, role: "agent core / prompt_builder"}
    - {name: shay-agent-os, path: ~/famtastic/shay-agent-os, role: "swarm pipeline"}
    - {name: .shay, path: ~/.shay, role: "runtime home: SOUL.md, kanban, cron, skills"}
  surfaces: [claude-code, codex, gemini-cli, cowork, shay-subagents]
current_state:         # generated — the live snapshot (replaces stale STUDIO-CONTEXT.md)
  generated_at: <iso>
  active_plans: <from plans/registry.json + ~/.shay/plans>
  drift: <from audit-all.js once the anti-drift reconciler lands; else "n/a">
  recent_sessions: <last N CHANGELOG entries>
recall_path:           # HOW to be context-aware at runtime
  before_acting:
    - "Check .wolf/anatomy.md before reading files"
    - "Check .wolf/cerebrum.md Do-Not-Repeat before generating"
    - "Check .wolf/buglog.json before debugging"
    - "Semantic recall: vault-semantic-search MCP `search_vault` / basic-memory"
  memory_homes:        # the verified recall surfaces, with how to query each
    - {name: vault-semantic-search, kind: mcp, tool: search_vault, scope: "Shay vault, on-device"}
    - {name: basic-memory, kind: mcp, scope: "shay-memory project (semantic)"}
    - {name: openwolf, kind: files, scope: ".wolf/{anatomy,cerebrum,buglog}"}
reuse_before_generate: # the doctrine + the discovery hooks
  doctrine: "Search/reuse before generating. Route specialized needs to the owning studio."
  discovery: ["local skills", "agentskills.io", "SkillNet", "clawhub"]   # per community-gap design
```

`AGENT-CONTEXT.yaml` is **the only file a human edits** for `system_map` /
`recall_path` / `reuse_before_generate`. `current_state` is **generated**, never
hand-edited (honors "freshness is derived, never stored" — cerebrum Ops rule #1).

### 3b. The emitter — `scripts/agents/emit-context.js`

One idempotent generator reads `AGENT-CONTEXT.yaml` + live sources and **emits per-surface
files**, each trimmed to the surface's budget and dialect. Single derivation, no parallel
copies (the cerebrum "five independent state readers" anti-pattern is the thing to avoid).

| Emitted artifact | Surface(s) | Form |
|---|---|---|
| `docs/agent-startup/AGENT-CONTEXT.generated.md` | shared include target | full rendered manifest |
| `AGENTS.md` (regenerated region) | **Codex, Cursor, Cowork, Shay sub-agents** | the load-bearing one — between `<!-- AGENT-CONTEXT:START -->` / `END` markers so hand-written rules above the markers survive |
| `GEMINI.md` (**new — closes the gap**) | Gemini CLI | Gemini-dialect orientation (system_map + recall_path + reuse), points to AGENT-CONTEXT.generated.md |
| `CLAUDE.md` `@-import` line | Claude Code, Cowork | add `@docs/agent-startup/AGENT-CONTEXT.generated.md` to CLAUDE.md once; the import does the rest |
| Shay sub-agent preamble | Shay sub-agents | **no new file needed** — Shay already reads AGENTS.md (1a). Optionally seed `~/.shay/SOUL.md` recall_path lines so the always-on identity slot carries the recall doctrine even outside `~/famtastic`. |

**Marker-region discipline** (mirrors the `.wolf`/skeleton pattern): generated content
lives strictly between markers; everything outside is human-owned and never touched. This
is how a generator can own `AGENTS.md`/`GEMINI.md` without clobbering curated rules — the
exact failure mode that disqualifies claude-mem's CLAUDE.md auto-write.

### 3c. The real SessionStart-style hook (fixes the 1c gap)

Replace the silent stderr-only behavior with **stdout context injection**, per surface:

- **Claude Code / Cowork** — extend `.wolf/hooks/session-start.js` to **print to stdout**
  a compact block: `system_map` (3 lines) + `current_state` (active plans + drift count)
  + `recall_path` (the 4 before-acting lines) + `reuse_before_generate` (1 line). Use the
  JSON `hookSpecificOutput.additionalContext` form so it's unambiguous. Keep it **small**
  (~400–600 tokens) — CLAUDE.md @-imports already carry the deep rules; the hook carries
  the **live state** that a static file can't. (This is the only way "current state" ever
  reaches the model automatically — today it does not.)
- **Codex** — Codex reads `AGENTS.md` at session start; the regenerated `AGENTS.md`
  region IS its injection. No hook API needed. (If/when Codex gains a startup hook, point
  it at `emit-context.js --surface codex --stdout`.)
- **Gemini CLI** — `GEMINI.md` is the injection (Gemini CLI auto-loads `GEMINI.md` from
  cwd/home, the same way Claude Code loads CLAUDE.md). `activate_skill` can additionally
  pull an `agent-orientation` skill (3d) on demand.
- **Shay sub-agents** — `prompt_builder` already injects AGENTS.md; the regenerated
  AGENTS.md region flows in automatically. For the runtime "current_state" freshness, add
  `current_state` to the prompt via the existing context path (it's already a file read).

**Trigger to re-emit:** the emitter runs (a) on a `shay cron` tick (cheap, `--no-agent`,
the same watchdog pattern the anti-drift design uses), and (b) opportunistically at
SessionStart if `AGENT-CONTEXT.generated.md` is older than the newest of
`{registry.json, CHANGELOG.md, AGENT-CONTEXT.yaml}` (mtime check — the cache pattern from
efficiency-map #14). This keeps `current_state` honest without a heavy daemon.

### 3d. A new skill — `agent-orientation` (closes the 1d skill gap)

Mint one skill into `~/.shay/skills/system-discovery/agent-orientation/SKILL.md` (and
mirror to `.claude/skills/` for Claude Code / `$CODEX_HOME/skills` for Codex per SkillNet's
known install paths). It does NOT duplicate the manifest — it **teaches the runtime
behavior**: "read AGENT-CONTEXT.generated.md; before acting, hit the recall_path
(search_vault / .wolf); reuse-before-generate via the discovery sources." This is the
on-demand, surface-agnostic way an agent that *wasn't* preloaded (e.g. a fresh Gemini
session in a sub-dir) becomes context-aware in one `activate_skill` call.

### 3e. How an agent becomes context-aware **at runtime** (tied to the graph recall path)

1. **Preload (passive):** the emitted per-surface file + the stdout hook give it
   `system_map` + `current_state` + `recall_path` + `reuse_before_generate` for free at t=0.
2. **Before acting (active recall):** the agent follows `recall_path`:
   - structural/curated: `.wolf/{anatomy,cerebrum,buglog}` (the do-not-repeat layer);
   - semantic: `search_vault` MCP (on-device) / basic-memory over the Shay vault;
   - **graph (when backend lands):** the trace-graph edges from the anti-drift design
     answer "what was recommended → planned → built" so recall is *linked*, not grepped.
3. **Reuse-before-generate:** before authoring a skill/component, run the GapResolver
   discovery pass (community-gap design) — local catalog first, then SkillNet/clawhub.
4. **After acting:** write back (session capture → memory-promote → cerebrum/vault), and
   — once graphify lands — assert the `fulfilled_by` edges so the next agent's recall is
   richer. This is the closed loop the prior research insists on: **recall gets cheaper
   and better with every run** (efficiency-map outside-the-box #8).

### 3f. How persistent memory is shared across surfaces

The **shared substrate is the Shay vault + its semantic index**, exposed two ways every
surface can reach:

- **As an MCP tool** (`search_vault`, basic-memory) — Claude Code, Cowork, Codex (MCP),
  Shay sub-agents, and Gemini (via MCP/`activate_skill`) all query the **same** index.
- **As files** (`.wolf/`, vault markdown) — any surface with file read.

Writes converge through the **existing** capture→promote pipeline (cerebrum "Standing
Rule — Memory Pipeline": `session-capture.js` → `memory-promote.js`), so all surfaces feed
one canonical store (`memory/INDEX.json` + `memory/<type>/<id>.md`), with backlinks into
`.wolf/cerebrum.md` and the vault. **No per-surface memory silo is created.** The
TencentDB Identity/Experience/Persona tiers + TurboVec + graphify (deferred) become the
*backend* of that same store, and the trace-graph `nodes.jsonl`/`edges.jsonl` are the
designed import format — so adopting the graph backend is a loader, not a rewrite.

---

## 4. Honest split — buildable-now vs needs-the-memory-backend

### Buildable NOW (flat files + existing MCP + existing cron — no graph DB)
- `AGENT-CONTEXT.yaml` source of truth + `scripts/agents/emit-context.js` emitter.
- Marker-region regeneration of `AGENTS.md`; **new `GEMINI.md`** (closes the uncovered
  surface); CLAUDE.md `@-import` line.
- **Real stdout SessionStart injection** in `.wolf/hooks/session-start.js` (the single
  highest-leverage fix — current state finally reaches the model).
- `current_state` generation from `plans/registry.json` + `CHANGELOG.md` (+ `audit-all.js`
  drift count *if* the anti-drift reconciler is built first; else `drift: n/a`).
- `agent-orientation` skill (runtime behavior), mirrored to the three skill paths.
- Runtime recall via the **already-live** `vault-semantic-search` MCP + basic-memory + `.wolf`.
- Reuse-before-generate discovery via the community-gap `GapResolver` design (its own task).
- This fully delivers "fix all agents, not just Shay" **today**: one edit propagates to
  all five surfaces, Gemini stops being blind, and live state stops being invisible.

### Needs the graph memory backend (graphify / TencentDB / TurboVec) FIRST — deferred
- **Linked recall** ("show the build that this recommendation drove") — needs the trace
  graph edges + a graph store. Until then, recall is semantic+curated (good) but not
  *traversable* (the anti-drift design's flat-file reconciler is the interim).
- **Durable cross-session self-model** beyond the 2200-char `memory_tool` cap — needs the
  TencentDB Experience/Persona tiers (efficiency-map #8).
- **Semantic edge inference** for reuse-before-generate when wording diverges (community-gap
  design §8) — needs embeddings over the link graph.
- **Honest bottom line:** the part that fixes the *stated* problem — every surface oriented
  from one source, Gemini covered, live state injected, recall path pointed at the existing
  semantic index — is **100% buildable now**. The graph backend makes recall *traversable*
  and self-model *durable*, but is **not required** to stop the surface-drift bleeding.

---

## 5. Ralph-style build story (loop-until-dry; design only — task before building)

> Ralph = one focused loop, each pass leaves the tree green, surgical edits over regen,
> two-gate verification, never self-attest "done." Honor cerebrum: marker-region edits
> (never clobber curated files); the emitter is the ONLY writer of generated regions;
> stdout-hook output is small and additive.

**STORY-0 — Author the source of truth (read-only spike).** Write `AGENT-CONTEXT.yaml`
with verified repo paths + the recall_path pointing at the **already-live** surfaces
(search_vault MCP, basic-memory, `.wolf`). **Gate:** every path/MCP/tool named resolves on
disk (no fabricated facts); `system_map.surfaces` matches the five real surfaces.

**STORY-1 — Emitter, AGENTS.md first (it's the multi-surface lever).** Write
`emit-context.js`; regenerate ONLY the `<!-- AGENT-CONTEXT:START/END -->` region of
`AGENTS.md`. **Gate:** re-running yields zero diff (idempotent); hand-written rules outside
the markers are byte-identical; `prompt_builder._load_agents_md` still parses it (Shay
sub-agents see the new region).

**STORY-2 — Close the Gemini gap.** Emit `GEMINI.md` (Gemini dialect). **Gate:** file
exists at `~/famtastic/GEMINI.md`, contains system_map + recall_path + reuse, points to
AGENT-CONTEXT.generated.md; a Gemini CLI session in `~/famtastic` loads it (manual check).

**STORY-3 — The real hook (the crux fix).** Make `.wolf/hooks/session-start.js` print the
compact orientation block to **stdout** via `hookSpecificOutput.additionalContext` (keep
the existing disk-state + stderr behavior). **Gate:** a Claude Code SessionStart shows the
system_map + current_state + recall_path in-context (verify via a fresh session that the
model can state the active plan count without being told); block stays <600 tokens.

**STORY-4 — Generate `current_state` (kill the stale STUDIO-CONTEXT.md).** Read
`plans/registry.json` + last N `CHANGELOG.md` entries (+ drift if `audit-all.js` exists).
**Gate:** `current_state.generated_at` is fresh on emit; mtime-guard re-emits only when a
source changed (efficiency-map #14 pattern); the rendered active-plan list matches
`registry.json` exactly.

**STORY-5 — CLAUDE.md @-import + Cowork.** Add the one
`@docs/agent-startup/AGENT-CONTEXT.generated.md` line to CLAUDE.md. **Gate:** Claude Code
and a Cowork session both surface the manifest; no duplication with the existing
`@famtastic-dna.md` / `@STUDIO-CONTEXT.md` imports (retire STUDIO-CONTEXT.md or repoint it).

**STORY-6 — `agent-orientation` skill (runtime behavior, surface-agnostic).** Mint the
skill; mirror to `.claude/skills/` and `$CODEX_HOME/skills`. **Gate:** `activate_skill`
(Gemini) / skill load (Claude/Codex) makes a *cold* agent state the recall_path and run a
`search_vault` query before acting, in a sub-dir with no preloaded file.

**STORY-7 — Wire reuse-before-generate.** Point the skill + the planner at the community-gap
`GapResolver` (its own task) so "search before build" is the default. **Gate:** a contrived
"build a PDF skill" request first surfaces an existing local/SkillNet candidate, not a
fresh generate.

**STORY-8 — Cron re-emit watchdog.** Register `emit-context.js` on a `shay cron … --no-agent`
tick. **Gate:** `shay cron run` re-emits; a clean run is a no-op diff; a changed
`registry.json`/`CHANGELOG.md` produces a fresh `current_state` and nothing else moves.

**STORY-9 — Use it on itself (close the loop).** Confirm a single edit to
`AGENT-CONTEXT.yaml` propagates to all five surfaces in one emit, and that Gemina/Codex/
Cowork/Claude/Shay-subagent each report the same system_map. **Gate:** five surfaces, one
truth, verified; update SITE-LEARNINGS.md + CHANGELOG.md + FAMTASTIC-STATE.md per the doc
rules.

**Deferred (needs graph backend):** traversable linked recall, TencentDB durable tiers,
semantic edge inference for reuse-before-generate. Task these only after STORY-0–9 are
green and graphify/TencentDB are actually adopted (per the anti-drift + tencent-adopt docs).

---

## 6. File / artifact manifest (what to add — nothing built yet)

| Path | Type | Status |
|---|---|---|
| `~/famtastic/docs/agent-startup/AGENT-CONTEXT.yaml` | source of truth (human-edited) | to add |
| `~/famtastic/docs/agent-startup/AGENT-CONTEXT.generated.md` | rendered manifest (generated) | generated |
| `~/famtastic/scripts/agents/emit-context.js` | the ONLY emitter | to add |
| `~/famtastic/AGENTS.md` (marker region) | Codex/Cursor/Cowork/Shay-subagent slice | to edit (region-only) |
| `~/famtastic/GEMINI.md` | **new — closes Gemini gap** | to add (generated) |
| `~/famtastic/CLAUDE.md` (`@-import` line) | Claude Code/Cowork wiring | to edit (one line) |
| `~/famtastic/.wolf/hooks/session-start.js` | **stdout context injection** (the crux fix) | to edit |
| `~/.shay/skills/system-discovery/agent-orientation/SKILL.md` (+ mirrors) | runtime behavior skill | to add |
| cron job `agent-context-emit` (`~/.shay/cron/jobs.json`) | re-emit watchdog | to register |
| retire/repoint `~/famtastic/STUDIO-CONTEXT.md` | stale snapshot → generated current_state | to edit |

## 7. Known gaps this design itself opens (recorded honestly, per CLAUDE.md Rule 3)
- **Surface-API drift:** Gemini CLI / Codex / Cowork startup-file conventions can change
  vendor-side; the emitter's per-surface templates must be revisited if a vendor renames
  `GEMINI.md` or changes the hook contract. (Claude Code SessionStart stdout-injection is
  the one verified-load-bearing mechanism; the others rely on auto-loaded files.)
- **First-match-wins collision in Shay:** if anyone adds a `.shay.md` to `~/famtastic`,
  Shay's `build_context_files_prompt` will load it INSTEAD of the generated `AGENTS.md`
  (chain priority). The emitter should either own `.shay.md` too, or the design must forbid
  a hand `.shay.md` in the repo root. Flag, don't silently break.
- **20k char cap:** each context source is capped at `CONTEXT_FILE_MAX_CHARS = 20_000` in
  Shay; the emitted region must stay well under that or it gets head/tail-truncated.
- **current_state freshness vs cost:** the mtime-guard re-emit avoids a daemon but means a
  session started seconds after a plan change may see a slightly stale state until the next
  tick; acceptable for a single-operator system, documented here.
- **Recall is semantic+curated, not yet traversable:** until the graph backend lands,
  "which recommendation drove which build" is answered by the flat-file anti-drift
  reconciler, not a graph query — a known interim limitation, not a regression.

## 8. Prior-art / cross-doc links
- Anti-drift trace-graph + reconcile loop + ralph build story:
  `research/anti-drift-system-design-2026-05-31.md` (the structural recall spine).
- Why memory is the meta-fix: `research/missed-capabilities-impact-map-2026-05-31.md`.
- Reuse-before-generate discovery sources (SkillNet/clawhub) + GapResolver:
  `research/community-gap-discovery-2026-05-31.md`.
- Rewired recall path + graph-as-spine + don't-build-a-new-store:
  `research/efficiency-future-map-2026-05-31.md` (#7, #8, #9, #12; outside-box #6, #8).
- Memory backend tiers + import format: `research/tencent-agent-memory-adopt-2026-05-31.md`.
- claude-mem (why NOT to base the layer on it): `research/claude-mem-evaluation-2026-05-31.md`.
