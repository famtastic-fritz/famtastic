---
title: memory-lifecycle-design-2026-05-31
type: design
permalink: shay-memory/research/memory-lifecycle-design-2026-05-31
tags:
- shay
- memory
- lifecycle
- compaction
- carry-forward
- dreaming
- consolidation
- reflection
- l0-l3
- design
status: design-only-not-implemented
---

# Shay Memory Lifecycle — capture / save+compact / dream / recall (2026-05-31)

> **Research + design only. Nothing here is built.** This is the coherent four-stage
> lifecycle, grounded in the code and docs that already exist (verified this session),
> mapped to the standard 5-type cognitive memory taxonomy, sharing the backbone of the
> anti-drift + cross-agent layers (NOT a new silo), with an honest buildable-now vs
> needs-graph-backend split and a ralph-style build story.
>
> Frame (Fritz): (1) auto context save + auto-compact to memory/a file; (2) as it saves,
> compact and AUTO-INSERT the relevant context into the NEXT session (warm-start);
> (3) "auto dream" — the equivalent of sleep/dreaming (offline memory consolidation).

---

## 0. The one-sentence design

Shay already **captures** (compressor working memory) and already **distills nightly**
(`reflect.py`), but the compactor's rich session summary is **discarded instead of saved**,
the nightly pass is **extractive not generative**, and the next session **warm-starts from
nothing** — so the lifecycle is three-quarters present and disconnected; this design wires
the four stages into one loop on the **extension points that already exist in the code**
(`ContextEngine.on_session_end`, `MemoryProvider.on_session_end` / `on_pre_compress` /
`prefetch`, the cross-agent SessionStart `additionalContext` hook, and the `reflect.py`
documented swap point), with **zero new memory store**.

---

## 1. Grounded reality — what actually exists today (verified this session)

### 1a. CAPTURE already exists — the compressor IS working memory

- **`context.engine: compressor`** (verified `~/.shay/config.yaml:326-327`). The active
  engine is `ContextCompressor` in `shay-shay/agent/context_compressor.py`.
- **`compression:` block** (verified `~/.shay/config.yaml:141-146`): `enabled: true`,
  `threshold: 0.5`, `target_ratio: 0.2`, `protect_last_n: 20`, `hygiene_hard_message_limit: 400`.
  The ABC defaults (`context_engine.py:59-61`) are `threshold_percent: 0.75`,
  `protect_first_n: 3`, `protect_last_n: 6`; the compressor's own `__init__` default is
  `threshold_percent=0.50`, `protect_last_n=20` (matches config).
- **It compacts mid-session with an aux model.** `ContextCompressor._generate_summary()`
  (`context_compressor.py:793`) prunes old tool results, protects head+tail, and summarizes
  the middle into a **structured handoff summary** with these exact sections (verified
  `context_compressor.py:840-893`): `## Active Task`, `## Goal`, `## Constraints &
  Preferences`, `## Completed Actions`, `## Active State`, `## In Progress`, `## Blocked`,
  `## Key Decisions`, `## Resolved Questions`, `## Pending User Asks`, `## Relevant Files`,
  `## Remaining Work`, `## Critical Context` (with an explicit "NEVER include API keys /
  tokens / passwords — write [REDACTED]" instruction). On re-compaction it **iteratively
  updates** the prior summary rather than re-summarizing from scratch.
- **This is the load-bearing discovery for stage (b):** the session memo Fritz wants
  **already gets generated** — the compressor builds it every time it fires. Today it lives
  only inside the in-memory transcript as a `[CONTEXT SUMMARY]` human turn and is **thrown
  away when the process exits**. SAVE/COMPACT is therefore mostly a *persist* problem, not a
  *generate* problem.

### 1b. The lifecycle hooks already exist (the integration surface)

`ContextEngine` (`context_engine.py:18-26, 125-147`) documents a real session lifecycle:
`on_session_start(session_id, **kwargs)` → `update_from_response(usage)` per response →
`should_compress()` → `compress()` → **`on_session_end(session_id, messages)` "called at
real session boundaries (CLI exit, /reset, gateway session expiry) — NOT per-turn."** The
compressor inherits the no-op default for `on_session_end`.

`MemoryProvider` (`memory_provider.py`) is an ABC with exactly the hooks this lifecycle
needs (verified):
- `on_session_end(messages)` — *"end-of-session fact extraction, summarization, etc.
  … only at actual session boundaries (CLI exit, /reset, gateway session expiry)"*
  (`:153-161`).
- `on_pre_compress(messages) -> str` — *"called before context compression discards old
  messages … return text to include in the compression summary prompt"* (`:202-212`).
- `prefetch(query, *, session_id) -> str` — *"recall relevant context for the upcoming
  turn … injected as context"* (`:92-104`), plus `queue_prefetch` for background recall.
- `system_prompt_block() -> str` — static recall text in the system prompt (`:83-90`).
- `sync_turn`, `on_turn_start`, `on_memory_write`, `on_delegation`, `on_session_switch`.
- The ABC's lifecycle line (`:15-22`) lists `prefetch / sync_turn / get_tool_schemas` — the
  **exact drop-in slot** the efficiency-map (#`MemoryProvider` plugin) named for the
  TencentDB backend.

`MemoryManager.on_session_end(messages)` (`memory_manager.py:392-399`) already **fans the
session-end event to the active provider** (one external provider at a time, by design).
So a provider that implements `on_session_end` is automatically invoked at session boundary.

`config.yaml` confirms the wiring is live: `context: {engine: compressor}` (`:326`),
`memory: {memory_enabled: true, user_profile_enabled: true}` (`:328` area), and
`session_reset: {mode: none, idle_minutes: 1440, at_hour: 4}` (`:471-475`) — i.e. there is a
real, configurable session-boundary concept (idle timeout + a 4am reset hour) that
`on_session_end` keys off.

### 1c. DREAM already exists in skeleton — `reflect.py` is extractive, with a documented swap point

`_system/reflect.py` (verified) runs the L0→L1→L2→L3 condensation from
`_system/MEMORY-SCHEMA-L0-L3.md`. It is **intentionally extractive** (stdlib-only, zero LLM,
safe unattended): `summarise_episode()` (`reflect.py:84-105`) emits headings + source links
only. The module docstring states the upgrade path verbatim: *"A future attended upgrade can
swap `summarise_episode` for an auxiliary-model call; the contract stays the same"*
(`reflect.py:18-20`). It writes one dated note per layer into
`reflections/{episodic,semantic,reflective}/`, is idempotent (re-run overwrites that date),
reads only L0/L1, never edits/moves a pre-existing note. The launchd plist
(`_system/ai.shay.memory-reflect.plist`) runs it **daily at 03:00** but is **NOT loaded**
(activation is an attended `cp … && launchctl load`).

The L0→L3 schema (verified `MEMORY-SCHEMA-L0-L3.md`): **L0 raw** (verbatim capture; existing
vault is L0 by default), **L1 episodic** (per-session/day summary), **L2 semantic** (durable
de-duped NL facts about Fritz/projects/decisions; seeded by `learnings/` + `MEMORY.md`/
`USER.md`), **L3 reflective** (standing constraints / identity / recurring patterns;
slow-churn; injected every session). Layer is declared by front-matter `memory_layer:` +
`memory/lN` tag — purely additive over the existing basic-memory / Obsidian vault.

### 1d. RECALL/CARRY-FORWARD — the injection point exists but injects nothing today

Per the cross-agent design (`research/cross-agent-context-layer-2026-05-31.md`, verified):
the Claude Code `SessionStart` hook (`.wolf/hooks/session-start.js`) **writes only disk
state + stderr**; it never writes stdout, so **nothing reaches the model's context**. The
fix it specifies is `hookSpecificOutput.additionalContext` (verified externally — see §3).
On the Shay side, `prompt_builder.build_context_files_prompt()` assembles the system prompt
and already reads `AGENTS.md` + `SOUL.md`; `MemoryProvider.prefetch()`/`system_prompt_block()`
are the in-agent injection slots. Recall surfaces that already work: **basic-memory** (wired
to the vault, `semantic_search_enabled: true`, fastembed `bge-small-en-v1.5`) and the
**vault-semantic-search MCP** (`~/.shay/tools/vault-semantic-mcp/server.py`, `search_vault`,
on-device, "live in gateway via HTTP service" per commit #208).

### 1e. Confirmed absence (Fritz asked to verify — confirmed)

Grep of `shay-shay/` for `session_memo`, `summarize_session`, `carry_forward`, `warm_start`,
`handoff` (as a persisted-file feature) finds **the in-memory compaction handoff summary
only** — there is **no code that writes a session summary to disk on session end, and no
code that injects a prior session's memo into the next session's context.** The
`session-checkpoints/` and `checkpoints/` dirs under `~/.shay` are the engine's snapshot
mechanism, not a semantic session memo. So stages (b) persist and (d) warm-start are
genuinely net-new wiring — but they wire **onto existing hooks**, they don't add a store.

---

## 2. The five-type memory map → where each lives in Shay (the frame Fritz named)

The standard cognitive taxonomy (Working / Episodic / Semantic / Procedural / Persona) is the
*frame*; Shay's vault expresses durable memory as L0–L3. The two line up cleanly:

| Cognitive type | What it is | Where it lives in Shay TODAY | Lifecycle stage that maintains it |
|---|---|---|---|
| **Working** | The live context window | compressor in-memory transcript (`context.engine: compressor`) | **(a) CAPTURE** — exists |
| **Episodic** | "What happened in this session/day" | `reflections/episodic/<date>.md` (L1); **NEW**: per-session memo from §3b | **(b) SAVE/COMPACT** writes it; **(c) DREAM** replays it |
| **Semantic** | Durable de-duped facts about Fritz/projects | `learnings/`, `MEMORY.md`/`USER.md`, `reflections/semantic/<date>.md` (L2) | **(c) DREAM** distills it |
| **Procedural** | How-to / standing methods / skills | `.wolf/cerebrum.md` (Do-Not-Repeat, decision log), `~/.shay/skills/*`, `.wolf/buglog.json` | **(c) DREAM** promotes recurring fixes → cerebrum/skill candidates |
| **Persona** | Stable identity / standing constraints / DNA | `~/.shay/SOUL.md` (L3), `reflections/reflective/<date>.md` (L3), `famtastic-dna.md` | **(c) DREAM** surfaces L3 candidates → **human ratifies**; **(d) RECALL** always-injects |

Key point: the lifecycle does **not** create five stores. Working = the live window;
Episodic/Semantic/Persona = the existing L1/L2/L3 vault folders + SOUL.md; Procedural = the
existing `.wolf/` curated layer. The four stages are *processes* that move information
**up** the L0→L3 ladder and **back into context** — they reuse the homes that already exist.

---

## 3. The design — one coherent lifecycle on the existing backbone

```
            ┌─────────────────────────────────────────────────────────────┐
            │                  (a) CAPTURE  — Working memory                │
            │  ContextCompressor: live transcript, prune + mid-session      │
            │  aux-model handoff summary (Active Task … Critical Context)   │
            └───────────────┬───────────────────────────────┬───────────────┘
   threshold/turn cap fires │                               │ session boundary fires
   (compress in place)      │                               │ (on_session_end)
                            ▼                               ▼
            ┌─────────────────────────────┐   ┌───────────────────────────────────┐
            │ on_pre_compress(messages)   │   │  (b) SAVE / COMPACT                │
            │ providers contribute text   │   │  persist the handoff summary as a │
            │ to the summary (already a   │   │  "session memo" → L1 episodic note│
            │ hook)                       │   │  reflections/episodic/sessions/   │
            └─────────────────────────────┘   └──────────────┬────────────────────┘
                                                              │ nightly 03:00 cron
                                                              ▼
            ┌──────────────────────────────────────────────────────────────────────┐
            │ (c) DREAM / CONSOLIDATE — reflect.py, GENERATIVE (aux model, offline)  │
            │  replay episodic → distill semantic (L2) → cross-note edges →         │
            │  prune/strengthen → reflective insights (L3, human-ratified)          │
            └──────────────┬───────────────────────────────────────────────────────┘
                           │ next SessionStart
                           ▼
            ┌──────────────────────────────────────────────────────────────────────┐
            │ (d) RECALL / CARRY-FORWARD                                             │
            │  SessionStart hook additionalContext (Claude Code/Cowork) +           │
            │  MemoryProvider.prefetch()/system_prompt_block() (Shay) inject the    │
            │  relevant session memo + consolidated L2/L3 insights, scoped to       │
            │  project/task → warm-start. Loop closes: working memory at t=0 is     │
            │  already oriented.                                                    │
            └──────────────────────────────────────────────────────────────────────┘
```

### (a) CAPTURE — Working memory (exists; no work)

The active compressor is working memory. It already protects head+tail, prunes tool noise,
and produces the structured handoff summary. The **only** capture-side note for this design:
the handoff-summary template (§1a) is *already the session-memo schema* — reuse it verbatim
in stage (b) so the memo and the in-context summary never diverge.

### (b) SAVE / COMPACT — auto-compact the session into a "session memo" → episodic (L1)

**Trigger (two, both on existing surfaces):**
1. **Session-end (primary):** `ContextEngine.on_session_end(session_id, messages)` and the
   `MemoryProvider.on_session_end(messages)` that `MemoryManager` already fans to it
   (`memory_manager.py:392`). Fires at the documented real boundaries — CLI exit, `/reset`/
   `/new`, gateway session expiry, and the `session_reset.idle_minutes`/`at_hour` timeout
   (`config.yaml:471-475`). This is the "auto context save on session end" Fritz asked for.
2. **Context-threshold (secondary, free):** when `should_compress()` fires mid-session, the
   compressor already builds/updates the handoff summary. Persist that same summary as the
   memo's *current* state on each compaction (idempotent overwrite of one file). This is
   the "as it saves" half — the memo exists even for a session that never cleanly exits.

**Compaction method (reuse, don't reinvent):**
- The **compressor's existing aux-model summary** IS the compaction. No second summarizer.
  At session end, if a current handoff summary exists, persist it; if compaction never fired
  (short session), make **one** aux-model call over the (small) transcript using the **same
  template** to produce the memo. Aux model = whatever `compression.summarization` /
  `auxiliary_client` routes to (the project's cheap summary model, e.g.
  `google/gemini-3-flash-preview` per the trajectory-compressor default — verify the live
  gateway route at build time; do not hardcode).
- Honor the template's `[REDACTED]` rule — the memo is written to the vault, so the
  secrets-scrub is mandatory, not optional.

**File/DB target (flat-file now, DB-ready):**
- Write to `~/famtastic/obsidian/Shay-Memory/reflections/episodic/sessions/<session_id>.md`
  (a new `sessions/` subfolder under the existing L1 episodic tree — additive, matches the
  schema's "new, empty-on-creation only" rule). Front-matter: `memory_layer: L1`,
  `memory/l1` tag, `session_id`, `started_at`/`ended_at`, `platform`, `project` (cwd/git
  root), `model`, plus a `memo_schema: handoff-v1` marker so the dreamer can parse sections.
- Body = the handoff-summary sections verbatim. This makes the per-session memo a
  **first-class L1 episodic note** that the existing `reflect.py` window-scan already picks
  up the same night (it scans all non-`reflections/` … wait: it *excludes* `reflections/` —
  see §6 gap). The memo is the **bridge** between the live compressor and the nightly dreamer.
- DB-ready: the front-matter + sectioned body is exactly the shape the TencentDB
  **Experience** tier and the trace-graph `nodes.jsonl` expect (per
  `tencent-agent-memory-adopt` + `anti-drift-system-design`), so the eventual loader reads
  these memos, it doesn't migrate a bespoke format.

### (c) DREAM / CONSOLIDATE — upgrade `reflect.py` extractive → generative (offline, nightly, aux model, zero user-facing cost)

This is the literal "auto dream." It runs **offline** (03:00 launchd, the plist already
exists, unloaded) so it has **zero interactive token cost to Fritz** and never blocks a
session — exactly the Letta "sleep-time compute" pattern (verified §4): turn *raw context*
into *learned context* in the background. Five sub-steps, each upgrading one `reflect.py`
function at the documented swap point (`summarise_episode` → aux call):

1. **Replay episodic (L0/L1 → richer L1).** Instead of headings-only extraction, feed the
   day's session memos + modified L0 notes to the aux model and ask for a true episodic
   narrative: what happened, what was decided, what's still open. (Swap `summarise_episode`.)
2. **Distill semantic (L1 → L2), mem0-style.** For each candidate durable fact, the dreamer
   compares against existing L2 (`learnings/` + `reflections/semantic/`) via semantic
   similarity (basic-memory / `search_vault`) and decides **ADD / UPDATE / DELETE / NOOP**
   (the verified mem0 operation set, §4) — but **annotate-only / propose**, never hard-delete
   (the schema's standing rule, `MEMORY-SCHEMA:78-91`). De-dupe is the point: stop L2 from
   accreting near-duplicates.
3. **Form cross-note associations (edges).** Emit candidate `[[wikilinks]]` between the new
   L2 facts and the L0/L1 sources + related existing notes (Obsidian-native edges, which
   basic-memory + Smart Connections already traverse). This is the *flat-file* stand-in for
   the graph backend: associations as links now, as graph edges later. Recurring fix → cite
   the `.wolf/buglog.json` entry; recurring method → cite the `.wolf/cerebrum.md` rule
   (Procedural type).
4. **Prune / strengthen (Generative-Agents importance, §4).** Score memo/L2 candidates by
   **recency × importance × relevance** (the verified Park et al. retrieval triad). High-
   score + recurring → strengthen (promote toward L3 candidate, tag `consolidated`). Low-
   score + stale → mark `prune-candidate` in front-matter (annotate, human/next-pass
   removes). Trigger reflection (step 5) only when accumulated importance crosses a threshold
   — Generative Agents reflect "two or three times a day"; for Shay, once-nightly is the
   floor, threshold-gated extra passes optional.
5. **Reflective insights (L2 → L3).** Synthesize standing patterns / "what we keep getting
   wrong" / new Persona facts into `reflections/reflective/<date>.md` **as candidates
   requiring human ratification** (schema rule, `MEMORY-SCHEMA:86-88`). Ratified L3 flows to
   SOUL.md / cerebrum / DNA — the always-injected identity slot.

**Cost discipline:** aux model only, batched once nightly, bounded input (one window of
memos + changed notes), `--dry-run` preserved from the current `reflect.py`. No interactive
calls, no gateway touch (matches the current standalone-launchd design).

### (d) RECALL / CARRY-FORWARD — warm-start the next session, scoped

At the next session start, inject the relevant compacted memo + consolidated L2/L3 insights,
**scoped to the project/task** (not the whole vault — that's the recall-by-grep failure the
prior research named):

- **Claude Code / Cowork:** extend `.wolf/hooks/session-start.js` to emit
  `hookSpecificOutput.additionalContext` (verified mechanism, §4) carrying: the **last
  session memo for this project** (Active Task + Pending User Asks + Remaining Work +
  Critical Context — the continuity-critical sections) + the **top-N consolidated L2/L3
  insights** for the cwd/project, scoped by the memo's `project` front-matter. Keep it small
  (the cross-agent design's ≤600-token budget; hard cap is 10,000 chars per the docs). This
  is the carry-forward INJECTION point Fritz named.
- **Shay's own agent:** the memo + insights ride in via `MemoryProvider.prefetch(query)` and
  `system_prompt_block()` (existing slots). `prefetch` is *already* called before each turn;
  scoping the query to the session's project + the open Active Task gives task-relevant
  warm-start without a new mechanism. The always-on Persona (SOUL.md/L3) is already the
  identity slot in `prompt_builder`.
- **Scope key:** the memo's `project` field (git root / cwd) + recency. A session opened in
  `~/famtastic/site-studio` recalls that project's last memo + that project's L2/L3, not
  MBSH's. This is the difference between warm-start and noise.

---

## 4. External patterns → which stage each maps to (verified, cited)

| Pattern | Verified fact | Maps to Shay stage |
|---|---|---|
| **Letta sleep-time compute / sleep-time agents** | A background agent runs **asynchronously** during downtime, turning **"raw context" into "learned context"** by rewriting memory blocks (identify contradictions, abstract patterns, pre-compute associations) so test-time reasoning is cheaper. [Letta blog/docs] | **(c) DREAM** — exactly the offline, zero-interactive-cost consolidation. The dreamer = Shay's sleep-time agent. |
| **MemGPT / Letta memory tiers** | Three tiers: **core** (always in-context RAM, function-edited), **recall** (searchable conversation history), **archival** (external vector store via `archival_memory_search`); the LLM moves data between in-context and out-of-context via function calls ("virtual context management"). [Letta docs] | **(a) CAPTURE** = core/recall; **(b)/(c)** = the eviction-to-archival move (memo → L1 → L2). Shay's compressor is the "virtual memory manager." |
| **Generative Agents "reflection" (Park et al. 2023)** | Memory stream scored by **recency × importance × relevance**; **reflections generated periodically when accumulated importance crosses a threshold** (~2–3×/day), synthesizing higher-level insights from raw observations. Adopted by MemGPT/Mem0/LangGraph. [arXiv 2304.03442 / ACM] | **(c) DREAM** steps 4–5 — the prune/strengthen scoring triad and the threshold-gated reflective synthesis are this, directly. |
| **mem0** | Two-phase: LLM **extracts candidate facts**, then for each fact a single LLM call decides **ADD / UPDATE / DELETE / NOOP** vs. top-k similar existing memories in a vector store — dedupe + consistency across sessions. [mem0 docs / DeepWiki] | **(c) DREAM** step 2 — the L1→L2 distill uses this ADD/UPDATE/DELETE/NOOP operation set (annotate-only for DELETE per schema). |
| **Claude Code /compact + SessionStart** | `/compact` summarizes the conversation to free the window; **SessionStart hooks inject context via `hookSpecificOutput.additionalContext`** — Claude wraps it in a system-reminder and inserts it at the hook point; capped ~10,000 chars; as of CC 2.1.0 it's silently injected. **Caveat:** open issues (#16538, #11906) report plugin-hook additionalContext not always surfacing/persisting — verify on the live CC version at build time. [Claude Code hooks docs + GH issues] | `/compact` ↔ **(b)** compaction; SessionStart additionalContext ↔ **(d)** carry-forward (the verified injection mechanism). |
| **claude-mem** (already evaluated/rejected as base) | Per `claude-mem-evaluation-2026-05-31.md`: auto-writes `CLAUDE.md` (collides with curated file), captures tool I/O to plaintext SQLite (secrets risk), installs Bun + a port-37777 worker; largely redundant with `.wolf` + basic-memory. | **Not a base** — but its *shape* (hooks → SQLite/FTS → SessionStart injection) is the same four-stage loop; Shay implements the loop on its own curated backbone instead. |

Sources: Letta — https://www.letta.com/blog/sleep-time-compute , https://docs.letta.com/guides/agents/architectures/sleeptime/ , https://www.letta.com/blog/agent-memory , https://docs.letta.com/guides/legacy/memgpt-agents-legacy/ ; Generative Agents — https://arxiv.org/abs/2304.03442 , https://dl.acm.org/doi/fullHtml/10.1145/3586183.3606763 ; mem0 — https://github.com/mem0ai/mem0 , https://deepwiki.com/mem0ai/mem0/3.3-history-and-storage-management ; Claude Code — https://code.claude.com/docs/en/hooks , https://github.com/anthropics/claude-code/issues/16538 , https://github.com/anthropics/claude-code/issues/11906 .

---

## 5. One backbone, not a new silo (shared with anti-drift + cross-agent)

This lifecycle deliberately rides the spine the prior two designs already landed on:

- **Same store:** writes converge through the **existing** capture→promote pipeline and the
  L0→L3 vault. The session memo is an L1 episodic note; consolidation writes L2/L3 notes;
  recall reads them via basic-memory / `search_vault`. **No per-stage store** — Working is
  the live window, Episodic/Semantic/Persona are the existing L1/L2/L3 folders + SOUL.md,
  Procedural is `.wolf/`.
- **Same injection point as cross-agent:** stage (d) uses the **identical** SessionStart
  `additionalContext` mechanism the cross-agent layer specifies (`cross-agent-context-layer`
  §3c). The cross-agent hook carries *system_map + current_state + recall_path*; this design
  adds the *project-scoped session memo + consolidated insights* to the **same** hook
  output. One hook, one budget, two payloads — not two hooks.
- **Same edges as anti-drift:** the cross-note links the dreamer emits (step 3) are the
  flat-file form of the anti-drift **trace graph** (`anti-drift-system-design` §). When
  graphify/TencentDB lands, the dreamer's `[[links]]` and the memos' front-matter become the
  graph loader's import format — recall goes from *linked* to *traversable* with no rewrite.
- **Same plugin slot for the backend:** the memos and consolidation are written so the
  TencentDB **Experience** tier (session outcomes) and **Persona** tier (durable self-model)
  read them directly via the `MemoryProvider` ABC (`prefetch/sync_turn/on_session_end` —
  the slot the efficiency-map named). Adopting the backend = registering a provider, not
  re-platforming.

---

## 6. Honest split — buildable NOW vs needs the graph backend

### Buildable NOW (existing hooks + aux-model cron upgrade + flat files — no graph DB)
- **(b) SAVE/COMPACT — session memo on session end.** Implement `on_session_end` on a
  thin local memory provider (or extend the compressor's `on_session_end`) to persist the
  **already-generated** handoff summary to `reflections/episodic/sessions/<session_id>.md`.
  All hooks exist (`memory_provider.py:153`, `memory_manager.py:392`, `context_engine.py:132`).
  The aux summarizer exists. This is wiring + one file write + the secrets-scrub. **Now.**
- **(c) DREAM — generative `reflect.py`.** Swap `summarise_episode` (the documented swap
  point, `reflect.py:18-20`) for an aux-model call; add the mem0 ADD/UPDATE/DELETE/NOOP
  distill (annotate-only), the recency×importance×relevance scoring, the `[[link]]` edge
  emission, and threshold-gated reflective synthesis. Load the existing plist (attended
  `cp … && launchctl load`). Offline, nightly, aux model, zero interactive cost. **Now.**
  - **Gap to fix first (verified):** `reflect.py` *excludes* the `reflections/` tree from its
    scan (`EXCLUDE_DIRS`, `reflect.py:38`) so it doesn't feed on its own output — but the
    session memos in `reflections/episodic/sessions/` would be excluded too. The dreamer must
    be taught to **read `reflections/episodic/sessions/` as input** while still excluding its
    own L2/L3 output. One-line scope change, called out so it isn't missed.
- **(d) RECALL — carry-forward via the cross-agent hook.** Add the project-scoped memo +
  insights payload to the SessionStart `additionalContext` output (Claude Code/Cowork) and to
  `MemoryProvider.prefetch()`/`system_prompt_block()` (Shay). Mechanism verified; scope key =
  memo `project` front-matter + recency. **Now** (subject to the CC additionalContext-surfacing
  caveat in §4 — verify on the live version).
- **Bottom line:** all three of Fritz's asks — auto-save+compact, auto-insert-into-next-
  session, and auto-dream — are **100% buildable now on flat files + existing hooks + the
  aux-model cron upgrade.** Nothing here requires the graph backend.

### Needs the graph backend (graphify / TencentDB / TurboVec) FIRST — deferred
- **Traversable associative recall.** The dreamer's `[[links]]` answer "what relates to what"
  as Obsidian edges (good); answering "which recommendation drove which build" as a *graph
  query* needs the trace-graph store (anti-drift) / TencentDB graphify. Interim = flat-file
  reconciler + links.
- **Scaled semantic recall + durable self-model beyond caps.** Today MEMORY/USER snapshots
  are char-capped (the efficiency-map #8 drop). Unbounded tiered storage + fast compressed
  retrieval (TurboVec) needs the backend; until then recall is fastembed over the vault
  (works, doesn't scale to 10⁵ notes).
- **Semantic edge inference when wording diverges.** Linking "recommended X" to "built X′"
  when the words differ needs embeddings over the link graph — backend work.
- **Honest bottom line:** the backend makes recall *traversable* and self-model *durable at
  scale*, and it slots in via the `MemoryProvider` ABC the memos already target — but it is
  **not required** to ship the working four-stage lifecycle.

---

## 7. Ralph-style build story (loop-until-dry; design only — task before building)

> Ralph = one focused loop, each pass leaves the tree green, surgical edits over regen,
> two-gate verification, never self-attest "done." Honor cerebrum + schema: annotate-never-
> hard-delete in the vault; the dreamer writes only into `reflections/`; `[REDACTED]` the
> secrets; reuse the existing aux summarizer and hooks — add no second summarizer, no store.

**STORY-0 — Spec + verify the surface (read-only spike).** Confirm on the live machine:
`on_session_end` fan-out fires (instrument `MemoryManager.on_session_end`), the compressor's
handoff summary is retrievable at session boundary, and the cross-agent SessionStart hook can
emit stdout `additionalContext`. **Gate:** every hook named resolves and fires; no fabricated
mechanism; CC additionalContext surfaces in a fresh session (check against issues #16538/#11906).

**STORY-1 — (b) Persist the session memo (the highest-leverage, smallest change).** Add a
thin builtin memory provider `on_session_end` (or compressor `on_session_end`) that writes the
current handoff summary to `reflections/episodic/sessions/<session_id>.md` with the
front-matter contract (§3b); run the `[REDACTED]` scrub. **Gate:** end a real session → exactly
one memo file appears, parses as valid front-matter + handoff-v1 sections, contains zero
secrets (grep for key patterns), and re-running on the same session is idempotent.

**STORY-2 — (b) Threshold-time memo refresh.** On each `should_compress()` compaction,
overwrite the same memo with the updated summary so a crashed/timed-out session still has a
memo. **Gate:** force a mid-session compaction → memo updates in place; the in-context summary
and the on-disk memo are byte-equal for the shared sections.

**STORY-3 — (c) Generative dreamer, episodic step.** Swap `reflect.py:summarise_episode` for
an aux-model call over the day's memos; **fix the `EXCLUDE_DIRS` scope** so
`reflections/episodic/sessions/` is read as input but L2/L3 output stays excluded. **Gate:**
`--dry-run` shows a real narrative (not headings); a live run writes one L1 note; re-run is
idempotent; no L2/L3 self-feeding.

**STORY-4 — (c) Semantic distill (mem0 ADD/UPDATE/DELETE/NOOP, annotate-only).** L1→L2 with
similarity check against existing L2; emit decisions as annotations, never hard-delete.
**Gate:** a contrived duplicate fact is flagged UPDATE/NOOP (not a new note); a stale fact is
marked `prune-candidate`, not removed; existing notes outside `reflections/` are byte-identical.

**STORY-5 — (c) Edges + score + reflective synthesis.** Emit `[[links]]` (step 3), score by
recency×importance×relevance (step 4), write threshold-gated L3 **candidates** requiring human
ratification (step 5). **Gate:** new L2 notes carry valid backlinks Smart Connections resolves;
L3 notes are clearly marked "requires ratification" and write nothing to SOUL.md/cerebrum
automatically.

**STORY-6 — Load the nightly cron.** Attended `cp _system/ai.shay.memory-reflect.plist
~/Library/LaunchAgents/ && launchctl load …` (03:00). **Gate:** the job runs unattended once,
logs to `/tmp/shay-memory-reflect.log`, zero interactive token cost, no gateway touch.

**STORY-7 — (d) Carry-forward injection.** Add the project-scoped memo + top-N consolidated
insights to the SessionStart `additionalContext` payload (shared with the cross-agent block)
and to `MemoryProvider.prefetch()`/`system_prompt_block()`. **Gate:** a fresh session in
project P can state P's last Active Task + Pending User Asks **without being told**, scoped
(does not surface another project's memo); payload ≤600 tokens / <10,000 chars.

**STORY-8 — Close the loop on a real two-session run.** Session 1 in project P does work and
exits → memo written; nightly dream runs → L2/L3 candidates; Session 2 in P warm-starts from
the memo + insights. **Gate:** end-to-end demonstrated on one project; update SITE-LEARNINGS.md
+ CHANGELOG.md per the doc rules; record any new gap.

**Deferred (needs graph backend):** traversable linked recall, TencentDB durable tiers +
TurboVec scaled recall, semantic edge inference. Task only after STORY-0–8 are green and
graphify/TencentDB are actually adopted.

---

## 8. File / artifact manifest (what to add/edit — nothing built yet)

| Path | Type | Stage | Status |
|---|---|---|---|
| `shay-shay/agent/` builtin provider or compressor `on_session_end` | code — persist memo | (b) | to add (uses existing hook) |
| `~/famtastic/obsidian/Shay-Memory/reflections/episodic/sessions/<id>.md` | session memo (L1) | (b) | generated |
| `~/famtastic/obsidian/Shay-Memory/_system/reflect.py` | generative upgrade (swap point) | (c) | to edit (documented swap + `EXCLUDE_DIRS` scope fix) |
| `~/Library/LaunchAgents/ai.shay.memory-reflect.plist` | nightly cron (load existing plist) | (c) | to load (attended) |
| `~/famtastic/.wolf/hooks/session-start.js` | carry-forward `additionalContext` payload | (d) | to edit (shared with cross-agent hook) |
| `MemoryProvider.prefetch()` / `system_prompt_block()` scope to project memo | code — Shay-side recall | (d) | to wire (existing slots) |
| `reflections/semantic/`, `reflections/reflective/` (L2/L3 notes) | consolidation output | (c) | generated |

## 9. Known gaps this design itself opens (recorded honestly, per CLAUDE.md Rule 3)
- **`reflect.py` self-feed scope (verified):** must read `reflections/episodic/sessions/` as
  input while excluding its own L2/L3 output — the current blanket `EXCLUDE_DIRS=reflections`
  would skip the memos. One-line fix, but a real correctness gap if missed (STORY-3 gate).
- **CC additionalContext surfacing (verified caveat):** GH issues #16538/#11906 report
  plugin SessionStart `additionalContext` not always reaching context / persisting. Stage (d)
  on Claude Code is mechanism-correct but version-sensitive — verify on the live CC build;
  the Shay-side `prefetch`/`system_prompt_block` path is the more reliable injection.
- **Session-boundary reliability:** `on_session_end` fires on CLI exit / `/reset` / gateway
  expiry / idle timeout — but a hard process kill (SIGKILL, crash) skips it. STORY-2's
  threshold-time memo refresh is the mitigation (a crashed session still has a recent memo),
  but the *final* turns of a killed session can be lost. Documented, not solved.
- **Aux-model cost/availability:** the dreamer and the short-session memo path both make aux
  calls. Per `project_codex_subscription_capped`, vendor brains can be capped; the dreamer
  must degrade gracefully to the extractive path (keep current `summarise_episode` as the
  fallback) when no aux model is reachable — never block, never crash the cron.
- **Scope-key correctness:** carry-forward scoping by `project` (git root/cwd) is heuristic;
  cross-project work in one session, or work outside any repo, needs a fallback (recency-only
  + a "no project memo" notice). Flag, don't silently inject the wrong project's memo.
- **Ratification backlog:** L3 candidates require human ratification (schema rule). If Fritz
  never ratifies, L3 candidates accrete in `reflections/reflective/` unused — the dreamer
  should surface a small "pending ratification" count at SessionStart so it doesn't pile up
  silently (mirrors the intelligence-loop PENDING-REVIEW pattern).

## 10. Prior-art / cross-doc links
- Carry-forward injection mechanism + one-source-of-truth hook:
  `research/cross-agent-context-layer-2026-05-31.md` (§3c additionalContext).
- Why memory is the meta-fix (5-type map, flat-markdown-no-graph root cause):
  `research/missed-capabilities-impact-map-2026-05-31.md`.
- Trace-graph spine + reconcile loop (the edges the dreamer emits become graph edges):
  `research/anti-drift-system-design-2026-05-31.md`.
- L0→L3 schema + extractive `reflect.py` contract + swap point:
  `_system/MEMORY-SCHEMA-L0-L3.md`, `_system/reflect.py`.
- Memory backend tiers + import format + `MemoryProvider` plugin slot:
  `research/tencent-agent-memory-adopt-2026-05-31.md`, `research/efficiency-future-map-2026-05-31.md`.
- claude-mem (why NOT to base on it): `research/claude-mem-evaluation-2026-05-31.md`.
