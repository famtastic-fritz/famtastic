---
title: efficiency-future-map-2026-05-31
type: report
permalink: shay-memory/research/efficiency-future-map-2026-05-31
---

# Master Efficiency & Future-Capability Map (2026-05-31)

Synthesis of 12 efficiency-lens scans (token-context, memory-retrieval,
long-context-build, verification-qa, cost-routing, concurrency-swarm,
caching-recompute, ipc-dataflow, startup-runtime, process-bookkeeping,
skills-capability, data-knowledge) across `shay-shay`, `shay-agent-os`,
and `shay-desktop-electron`. Capability names refer to the ADOPT-NOW
items in `capability-map-2026-05-31.md`: **rlm-rs** (long-context),
**TencentDB Agent Memory / TurboVec / graphify** (memory backend),
**council-of-high-intelligence / autoloop** (verification),
**rtk / caveman / token-optimizer** (context-hygiene), and the
**$/energy cost telemetry** added this session.

---

## Biggest realization

**Truncation, cap-burn, the same-model review hole, and the silently-dropped
capabilities are not four problems — they are one problem wearing four masks,
and the same four capabilities (memory backend, rlm-rs, verification council,
rtk) dissolve all of them.** Every mask traces to the same root the impact-map
named: *flat, char-capped, ungrounded context with no link layer.* The pipeline
literally tells the brain to give up on large files (`pipeline.py:1169` emits
`[TRUNCATED — file exceeds 24000 chars; only anchor within the shown region]`),
then spends capped Claude budget on repair calls that *structurally cannot
succeed* because the dropped brace lives past the `[:16000]` window
(`pipeline.py:652`). The anti-truncation tool `synthesize_sections` already
exists (`pipeline.py:1478`) but is wired only to docs, never to code. The cost
governor `cost_telemetry.py` was built this session but has **zero production
callers** (`routing.cost_aware` defaults False) — and the swarm can't even see
it because `brain_client.py` is deliberately stdlib-only and reads
`policy.get('judge_brain')`, a key that **exists in no YAML**, so every
"auto" verify/judge call silently force-routes to the most expensive brain.
The single highest-leverage move is not a new build — it is connecting things
that already exist: a one-file `fan_out` parallelization, a one-key YAML typo
fix, a ~10-line port of `prompt_caching.py` across the venv wall, and a
content-budget seam that swaps `[:N]` for rlm-rs everywhere at once. Concurrency
*is* the cap-burn fix; memory *is* the gap-detection fix; the work is mostly
rewiring, not inventing.

---

## Part 1 — Top 15 efficiency opportunities (ranked by leverage)

### 1. Whole-file generation/repair — kill the `[:6000]/[:16000]/[:24000]` truncation class
**Where:** `shay-agent-os/components/swarm/pipeline.py:732` (`multi_file_code_job.gen_file`, `existing[:6000]`), `:652` (`_syntax_validate_and_repair`, `src[:16000]`), `:905` (`surgical_patch` re-anchor, `text[:16000]`), `:1169` (`build_app` edit-derivation, `cur[:24000]` + explicit `[TRUNCATED]` marker).
**Capability:** rlm-rs (recursive beyond-window read) **+** `synthesize_sections` wired into the code path (it already exists at `:1478` but only `planning_loop:1585` calls it).
**Improvement:** Route any file exceeding the inline budget through an rlm-rs chunked read so the brain reasons over the *whole* file, and generate large files region-by-region (imports → types → hooks → JSX return → exports) via `synthesize_sections`, then assemble and run the existing typecheck+render gates. Ends the documented >250-line brace-drop class (TS17008/TS1005, buglog #219) that blocked H2/H4/H6–H9 and S1 (27s, 3rd repeat) — the build-rescue tax disappears at its source instead of being fought reactively by the repair net.
**Flagged by:** token-context, memory-retrieval, long-context-build, verification-qa, concurrency-swarm, caching-recompute, ipc-dataflow, startup-runtime, process-bookkeeping, data-knowledge (10/12 — the single most-cited hotspot).

### 2. Wire the dead cost governor into routing (`cost_telemetry` has zero callers)
**Where:** `shay-shay/agent/cost_telemetry.py` (`cost_routing_score`, `budget_status`, `energy_weight`, `daily_cost_summary`) — referenced only by `tests/`; `routing.cost_aware` defaults False, `routing.daily_budget_usd` defaults 0. Consumers: `run_agent.py:8542` `_try_activate_fallback`, `:13753` rate-limited branch.
**Capability:** $/energy cost telemetry + budget signal (already built this session).
**Improvement:** Feed `cost_routing_score()` into fallback selection and the model picker so the cheapest brain that clears the task's difficulty tier wins; fire `budget_status()` into the existing low-funds notification; flip `routing.cost_aware` on. The capped weekly budget becomes a deliberate spend the orchestrator can report on instead of an after-the-fact emergency.
**Flagged by:** cost-routing, token-context, process-bookkeeping.

### 3. Fix the dead-policy key mismatch in the swarm dispatcher
**Where:** `shay-agent-os/components/swarm/local_swarm_dispatcher.py:48,157-169` (`__init__`, `_should_use_cloud`, `_call_cloud`) reads `policy.get('judge_brain')` — a key that **exists in no policy YAML** (they use `brains.judge`/`brains.worker`/`cost_posture`). `_call_cloud` then sets `preferred=None` → falls back to `self._brain.preferred` = `'claude'`.
**Capability:** $/energy cost telemetry + policy-driven brain routing.
**Improvement:** Read `policy['brains']['worker'|'judge'|'verify']` and honor `cost_posture`. A `free-maximal` run then actually stays on Ollama; a `balanced` run keeps workers local. The three beautifully-written cost policies stop being dead config. Highest $-per-line-of-code change available — and it simultaneously fixes the same-model review hole (see #5) because `verify` resolves to a *distinct* brain.
**Flagged by:** cost-routing, verification-qa.

### 4. Parallelize cloud fan-out (the swarm's master serial chokepoint)
**Where:** `shay-agent-os/components/swarm/local_swarm_dispatcher.py:73` (`fan_out`, `for task in cloud_tasks: self._call_cloud(task)` — comment: "sequential for now — Phase 3 makes them truly parallel"); `asyncio_dispatcher.py` is an explicit serial stub.
**Capability:** council-of-high-intelligence (parallel multi-LLM consensus) + $/energy budget signal.
**Improvement:** Promote `AsyncioDispatcher` from stub to real `asyncio.gather()` + semaphore bounded at `max_concurrency` (already a field, =8), or wrap the cloud loop in the existing `parallel()` helper (ThreadPoolExecutor, already imported in pipeline.py). A 3-lens `adversarial_verify` or 5-attempt `judge_panel` drops from ~Nx to ~1x wall-clock. **Architectural note:** every pattern depends only on `fan_out()`, so this ONE ~40-line edit parallelizes the entire swarm at once — and is the precondition that makes a real-time council affordable.
**Flagged by:** concurrency-swarm, ipc-dataflow, verification-qa.

### 5. Enforce reviewer ≠ author with a heterogeneous council
**Where:** `pipeline.py:122` (`adversarial_verify`, all skeptics `brain='auto'`), `:169` (`judge_panel`, `brain='auto'`, `attempt[:2000]`), `:1665-1733` (`refine_to_target` — same `brain` authors, critiques, and grades); `_default_policy` sets judge=synth=`claude` (`:307`); `local_swarm_dispatcher.py:167-169` falls `brain='auto'` back to the author's brain. `visual_qa.py` is a single Gemini-Flash judge.
**Capability:** council-of-high-intelligence + autoloop, backed by graphify memory of past false-positives.
**Improvement:** Pin each skeptic/lens to a DISTINCT model family and HARD-BLOCK any verdict whose `DispatchResult.brain_used == author brain` (already stamped on the result — a 5-line structural guarantee). Require quorum to FAIL before blocking; loop until consensus stabilizes. Closes the documented same-model review hole and the QA vision false-positives (clean screens scored 3-4) that only human eyes caught. Ollama is a permanent free third seat that survives even when both Claude and Codex are simultaneously capped.
**Flagged by:** verification-qa, memory-retrieval, long-context-build, cost-routing, process-bookkeeping, data-knowledge.

### 6. Multi-judge vision QA gate (kill false-positive rollbacks)
**Where:** `shay-desktop-electron/.ralph/visual_qa.py:37-56` (single Gemini-2.5-Flash, temp 0, no resampling) + `loop.py:281-298` (`run_vision_gate` GATE 5 treats returncode≠0 as a hard block).
**Capability:** council-of-high-intelligence (multi-LLM vision consensus) + autoloop (retry-to-stability).
**Improvement:** Run each screenshot through N independent vision judges (Gemini Flash + Claude vision + a third); require majority to FAIL before blocking; a lone dissenter is advisory. Boot the contract gate 2-3× and require a stable result before PASS so boot flakiness can't decide the verdict. Use the *already-documented* false-positive screenshots as the council's regression/calibration set.
**Flagged by:** verification-qa, startup-runtime.

### 7. Back vault_search / context_loader with semantic + graph retrieval
**Where:** `pipeline.py:1883` (`vault_search` fallback = filename-only `rglob` keyword scan, `[:2000]`/`[:300]` chunks) + `:1910` (`context_loader`, each doc `[:2000]`). Depends on the `:8766` HTTP service; when down it degrades to filename-grep with no body match.
**Capability:** TurboVec (compressed semantic retrieval) + graphify (link layer) behind `context_loader`.
**Improvement:** Embed the vault once; retrieve by meaning (not filename) and pull graph-linked neighbors (the plan a recommendation spawned, the build that plan drove). Grounding becomes complete-and-linked instead of keyword-and-truncated, the localhost daemon stops being a single point of failure, and gap-detection (the meta-fix) becomes automatic. Return the load-bearing 2KB, not the first 2KB.
**Flagged by:** token-context, memory-retrieval, ipc-dataflow, startup-runtime, data-knowledge.

### 8. Replace the flat-grep memory backend (2200-char cap is the literal drop mechanism)
**Where:** `~/.shay/config.yaml:333` (`memory.provider: ''` — NO external provider active); `shay-shay/tools/memory_tool.py:118` (2200-char MEMORY / 1375-char USER caps) + `:529` (schema FORBIDS storing outcomes); desktop mirror `shay-desktop-electron/src/main/memory.ts:7-8` (same caps). Dormant plugins exist at `plugins/memory/{retaindb,hindsight,openviking}`.
**Capability:** TencentDB Agent Memory (Identity/Experience/Persona tiers) + TurboVec + graphify, registered as a `MemoryProvider` plugin (the ABC's `prefetch/sync_turn/get_tool_schemas` is the exact drop-in slot).
**Improvement:** Identity/Persona tiers replace the char-capped MEMORY/USER snapshots with unbounded tiered storage; the Experience tier becomes the legal home for the session outcomes the built-in tool refuses, so a capability recommendation persists instead of being evicted at 2200 chars. TurboVec gives semantic prefetch instead of a frozen snapshot. This is the meta-fix that would have caught the 6 dropped ADOPT-NOW items the day they were dropped.
**Flagged by:** memory-retrieval, process-bookkeeping, data-knowledge.

### 9. Typed provenance edges — make silent drops a detectable dangling-node check
**Where:** `shay-shay/shay_cli/kanban_db.py:802` (`task_links` — bare untyped parent→child DAG, no edge type/source) + `pipeline.py:1380` (`capture_planning_lesson` fires only on FAILURE) + `.ralph/prd.json` (`done` stories still carry stale `reason: build_app failed gates`).
**Capability:** graphify — typed edges over the existing kanban DAG; recommendation→plan→story→build→files as linked nodes.
**Improvement:** Add an `edge_type`/`relation` column (`derived_from`, `implements_recommendation`) and an `origin` field on tasks. Make `capture_planning_lesson` fire on SUCCESS too (the one-line change that turns the flat buglog into a graph). A nightly query lists every ADOPT-NOW recommendation with no implementing/build node — drops become structurally impossible to hide. Treat the existing kanban DB as the graph's spine rather than standing up a parallel store.
**Flagged by:** process-bookkeeping, data-knowledge, memory-retrieval, concurrency-swarm.

### 10. Compress tool output at ingest, not after it ages out
**Where:** `shay-shay/agent/context_compressor.py:224` (`_summarize_tool_result`, lossy 1-line placeholder only on prune) + `:519` (`_prune_old_tool_results`); `model_tools.py:53` (`_TOOL_ERROR_MAX_LEN=2000`); `trajectory_compressor.py:550` (`[:1500]+'...'+[-500:]`). rtk/caveman are referenced NOWHERE outside node_modules.
**Capability:** rtk (structure-preserving tool-output compression at the boundary) + token-optimizer (ghost-token stripping).
**Improvement:** Run rtk on `tool_result` content BEFORE it's appended to messages — collapse npm/tsc/vitest logs to errors+counts, dedupe grep hits, strip ANSI/whitespace. Reuse the per-tool extractors `_summarize_tool_result` already encodes (exit code for terminal, match count for search) as rtk compression schemas so ingest-time compression is tool-aware from day one. Cuts the dominant per-turn input cost during build/self-heal loops that re-feed `last_error` every iteration, and keeps the recoverable detail the 1-line placeholder destroys.
**Flagged by:** token-context, long-context-build, data-knowledge, ipc-dataflow.

### 11. Port prompt caching across the venv wall (a copy, not a build)
**Where:** `shay-agent-os/components/swarm/brain_client.py:74-95` (`_call_anthropic` sends system+messages with NO `cache_control` breakpoints), `:192-217` (`BrainChain.call`). `shay-shay/agent/prompt_caching.py` is a finished, tested 1h-prefix + rolling-window cache (~75% input reduction) the stdlib-isolated swarm cannot import.
**Capability:** Anthropic prompt caching ported into `brain_client`, validated by the $/energy cache-hit signal.
**Improvement:** Add `cache_control` markers to the system block and last message in `_call_anthropic` (and the OpenRouter path, which preserves the marker on the OpenAI wire). On the swarm's repeated-prefix profile (`judge_panel`/`adversarial_verify`/`refine_to_target` all re-send near-identical prefixes; `build_app` self-heal re-bills identical grounding up to 4× per file), this recovers ~50-75% of swarm input tokens with zero new infrastructure. Mark the stable `grounding_facts` block cacheable and pass only the error delta per iteration.
**Flagged by:** caching-recompute, token-context, concurrency-swarm.

### 12. Relevance-rank prior lessons instead of last-5-by-tag
**Where:** `pipeline.py:1455` (`prior_planning_lessons` — reads `~/.wolf/buglog.json` (272 bugs, 53 planning-tagged), filters substring `'planning'`, returns the LAST 5 chronologically; `tags=`/`limit=` params ignored by every caller) + `.ralph/loop.py:160-200` (`search_prior_art` re-greps 40 files per block).
**Capability:** TurboVec semantic top-k against the current goal/manifest + graphify (link lesson → originating run).
**Improvement:** Replace tail-5 + truncate with a semantic query: "lessons whose failure-signature is near THIS goal." A `build_app` editing App.tsx surfaces the App.tsx brace-drop lesson (buglog #219) by relevance, not luck of recency. Embed-and-dedupe the near-duplicate planning lessons into canonical entries (strictly better signal per injected token). Collapses the 3 unlinked lesson stores (buglog.json, vault mirror, MEMORY.md) into one graph-indexed source.
**Flagged by:** memory-retrieval, caching-recompute, data-knowledge, long-context-build.

### 13. Lazy-load the desktop screen registry (eager-constructs all 22 screens)
**Where:** `shay-desktop-electron/src/renderer/src/App.tsx:255` (`MainShell screenRegistry` — object literal that eagerly constructs all 22 screen elements incl. the heavy Office 3D demo on every render; 22 static imports at `:12-35`).
**Capability:** React.lazy + Suspense (long-context/context-hygiene applied to UI), render-on-demand.
**Improvement:** Convert the 22 static imports to `React.lazy()` and mount only the active screen. Code-splits Office/Studio/3D out of the first chunk, turns mount cost from O(22) to O(1), speeds first paint, and gives `build_app` a smaller render-spine to gate. Optionally add a "render-spine budget" linter so `build_app` (which edits App.tsx) can't re-introduce the eager registry.
**Flagged by:** startup-runtime.

### 14. Cache config + skills + API-surface by mtime (stop re-parsing on every call)
**Where:** `shay-shay/gateway/config.py:657` (`load_gateway_config` — ~430-line full parse + ~40 `os.environ` mutations on EVERY call, 25+ call sites; only RAW yaml is mtime-cached); `shay-desktop-electron/src/main/config.ts:221` (`readFullConfig`/`getPlatformEnabled`/`readAuthStore` re-read disk per IPC call); `pipeline.py:1747` (`list_skills`/`get_skill` `rglob` + parse ~158 SKILL.md files per call, no cache); `.ralph/loop.py:210` (`_API_CACHE` lost across venv re-exec).
**Capability:** mtime+size-keyed memoization (pattern already proven at `shay_cli/config.py:53`), promoted to a shared `@mtime_cached(path)` decorator; TurboVec skill manifest.
**Improvement:** Split `load_gateway_config` into a pure memoizable `parse_config()` + a one-time `apply_env()`; add the same mtime memo to the desktop config readers (Settings Inspector re-parses the whole config.yaml on every toggle); build a one-time skill manifest invalidated by `SKILLS_ROOT` mtime so `get_skill` is an O(1) dict lookup instead of a 158-file walk inside hot swarm loops; back `_API_CACHE` with a disk store keyed by source mtime so ralph re-runs skip re-parsing `index.d.ts`.
**Flagged by:** startup-runtime, skills-capability, caching-recompute.

### 15. Cap-aware fallback + usage-ranked skill injection (stop wasting calls into exhausted providers)
**Where:** `run_agent.py:8542` (`_try_activate_fallback` advances by static config index, never consults `agent/account_usage.py` live remaining-%); `prompt_builder.py:1014` (`_apply_skill_count_cap` — prioritizes always_include → toolset → ALPHABETICAL, ignoring `skill_usage.py`'s `.usage.json` use-counts right next door).
**Capability:** account_usage windows + $/energy signal feeding fallback; usage-grounded + TurboVec-semantic skill ranking (replacing alphabetical).
**Improvement:** Make `_try_activate_fallback` skip-ahead past any chain entry whose `account_usage` remaining-% is ~0 and proactively demote a near-cap primary before the 429 (eliminates the "fail into an exhausted provider, 429, then advance" wasted round-trips). Rank the skill cap by recency-weighted activity + TurboVec similarity to the turn's goal, not by name — same token budget, but the kept skills are the ones the turn actually uses. (Note: both Anthropic and the $100 Codex sub can be capped simultaneously — routing must be cap-aware, not cap-blind.)
**Flagged by:** cost-routing, skills-capability.

---

## Part 2 — Future Capabilities Unlocked (dependency tree)

Four foundational landings unlock everything else. The tree shows what depends on what.

```
FOUNDATION (land these four first)
│
├── A. MEMORY BACKEND  (TencentDB tiers + TurboVec + graphify)
│   ├─→ Self-auditing planning: nightly graph walk flags every ADOPT-NOW
│   │     recommendation with no build node (the 6-dropped-items meta-fix
│   │     becomes a standing invariant, not a monthly manual research pass)
│   ├─→ Relevance-ranked lessons in the build loop: prior_planning_lessons(goal=)
│   │     retrieves the failure-signature nearest THIS manifest, so the
│   │     App.tsx brace-drop stops recurring by luck of recency
│   ├─→ Persona-tier durable self-model: research-first / reviewer≠author /
│   │     render-gate doctrine survives context compression, enforced by
│   │     retrieval at decision points (not hoped-for in a 2200-char snapshot)
│   ├─→ Cross-surface unified recall: one index over sessions+vault+buglog,
│   │     queried identically from CLI session_search, the Electron
│   │     CommandPalette, AND the phone companion
│   └─→ Provenance-complete build reports: recommendation→plan→story→build→
│         outcome→lesson renders as a Data Center proof artifact from the graph
│
├── B. rlm-rs + synthesize_sections-for-code
│   ├─→ Unbounded-file autonomous build: all [:6000]/[:16000]/[:24000] caps
│   │     vanish at once; Shay refactors App.tsx / MainShell / 1000-line
│   │     screens end-to-end with NO Claude rescue (retires the 3x rescue tax)
│   ├─→ Section-streamed code generation: generate-by-region, gate-by-region →
│   │     partial-accept and resume-on-failure instead of all-or-nothing regen
│   ├─→ Whole-file semantic verification: a gate that asks "does this file still
│   │     export everything its importers need?" — impossible today because the
│   │     brain never saw the whole file
│   └─→ rlm-rs as session-resume: old turns recursively summarized so even the
│         gateway-side history load stops being O(n)
│
├── C. VERIFICATION (council + autoloop)  [needs B for non-truncated input,
│   │                                       needs #4 parallel fan_out to be affordable]
│   ├─→ Enforced reviewer≠author at the dispatcher layer (exclude_brains set;
│   │     refuses a verdict from the author brain — the rule the YAML promised
│   │     but code never delivered)
│   ├─→ Disagreement-as-signal: human/phone escalation ONLY on genuine council
│   │     split, not on every single-judge FAIL → false-positive rollbacks collapse
│   ├─→ Confidence-scored gates: each gate emits calibrated confidence from
│   │     council agreement, stored per-unit → the loop re-verifies shaky PASSes
│   └─→ Memory-aware judge panel [needs A]: each judge carries a historical
│         false-positive score; the QA gate down-weights judges that flagged
│         good screens — verification that improves itself
│
└── D. rtk / caveman / token-optimizer + cost telemetry wired in (#2,#3,#11)
    ├─→ Cost-aware tiered routing: build_app declares per-step difficulty so
    │     cheap high-volume steps (manifest decomposition, syntax-repair,
    │     re-anchor, judge) auto-route to Gemini/Ollama; only spine generation
    │     hits Claude
    ├─→ Spend-governed autonomy budgets: the all-night ralph loop gets a hard
    │     nightly $-ceiling — self-throttles to free-maximal (Ollama) when the
    │     budget crosses a threshold, resumes cloud after the daily reset
    ├─→ Token-budget-as-a-gate: ralph/goal_loop refuses to START an iteration
    │     that would exceed budget, the same way it refuses on a failed typecheck
    └─→ Compression-tier negotiation: caveman intensity (lite/full/ultra) chosen
          per worker by remaining budget — output verbosity becomes a function
          of cost pressure across the whole swarm

CONVERGENCE (require multiple foundations)
│
├── Worktree-parallel ralph swarm  [needs A graph DAG + concurrency #4]:
│     a DAG-aware loop runs N independent PRD units in N git worktrees
│     concurrently → a 30-unit overnight wave finishes in critical-path
│     depth, not O(n). The file-overlap DAG the loop needs IS the
│     recommendation→plan→build link the graph backend wants — one structure,
│     two payoffs.
│
├── Cross-run build memo ("incremental compilation for LLM builds")
│     [needs A + B + #11]: persist (goal-hash, grounding-hash) → {manifest,
│     files, gate verdicts}. A ralph re-run of an already-solved unit returns
│     the cached artifact instantly — only build what changed.
│
├── Real-time multi-brain council view  [needs #4 + ipc SSE]: the desktop
│     watches N brains deliberate live; autoloop refines within one
│     user-perceived latency window.
│
└── Cost-attributed insights  [needs A + cost telemetry]: insights.ts gains
      "recommendation→ship rate", "stale-card count", "cost-per-shipped-unit"
      — the silent drop finally shows up as a red number on the one dashboard
      a human actually looks at.
```

---

## Part 3 — Outside the Box (the most creative / non-obvious plays)

1. **One content-budget seam adopts rlm-rs everywhere at once.** The magic
   numbers (6000, 16000, 24000, 8000, 12000, 2000, 300, 1500, 3000) are smeared
   across `pipeline.py`, `goal_loop.py`, and the `run_*.py` drivers as raw
   literals. Extract them into ONE module that either returns the literal OR
   transparently swaps in an rlm-rs read when the source exceeds it. One seam
   ends truncation repo-wide and makes every future cap auditable, instead of
   chasing truncation bugs file-by-file (the 3x-repeated pain).

2. **caveman as a bidirectional token valve.** caveman is framed as *output*
   compression, but its rules (keep code/symbols/errors verbatim, drop prose)
   are a perfect rtk *input* preprocessor. Run `grounding_facts` and pasted
   file context through a caveman-style structural stripper before they enter
   any prompt — the skill that cuts worker output 75% now also defends ingest.
   The bigger token sink isn't tool output, it's the skill INSTRUCTIONS injected
   into every worker; compress the SKILL.md bodies, not just the results.

3. **Bridge the venv wall with a file, not an import.** The swarm is
   deliberately stdlib-only and can't import `shay-shay`. Have `shay-shay`
   export `~/.shay/cost-snapshot.json` (energy_weight per model +
   account_usage remaining-% + today_usd) each turn; `brain_client.py` reads it
   at startup and reorders `_CHAIN` cheapest-that-clears-the-bar. Full cost
   routing without violating the one architectural constraint that makes the
   swarm cost-blind. The same trick gives the swarm the finished
   `prompt_caching.py` logic as a copied marker.

4. **Cheapest-verifier-first council.** Invert the usual "expensive judge"
   pattern: let Ollama skeptics vote first; convene the pricey cross-model
   council ONLY on a split vote. Most claims are clearly true/false and never
   need a Claude review — you pay premium intelligence exactly at the decision
   boundary where it changes the outcome. Closes the same-model hole AND the
   QA false-positive cost at once. (First pass can even be N samples from one
   model at temp>0 — self-consistency — escalating cross-model only on disagreement.)

5. **The AsyncioDispatcher stub is a Trojan horse, not dead code.** The
   Dispatcher ABC was designed so every pattern depends ONLY on `fan_out()`.
   A single ~40-line promotion of the stub to `asyncio.gather()` + semaphore
   parallelizes the ENTIRE swarm — no orchestrator rewrites. The architecture
   already paid for this; it has just never been cashed in. And once parallel,
   pinning each skeptic to a different vendor turns the soft reviewer≠author
   rule into a hard guarantee *for free*.

6. **The ralph file-overlap DAG IS the missing memory graph.** The concurrency
   work needs a unit dependency DAG from manifest file-overlap; the gap-detection
   work needs recommendation→plan→build edges. They are the same structure.
   Build the concurrency DAG and graphify gets its first real edges as a side
   effect — one structure serves swarm throughput AND silent-drop detection.

7. **Make the drift detector prove itself on its own history.** Before trusting
   the graph reconcile query, replay THIS session's capability-map → adopt-plan
   as graph nodes and confirm the query re-derives the 6 known dropped items.
   A passing detector that re-finds the known misses is the cheapest possible
   regression test that the loop is actually closed. Pair it with a 3-line
   invariant: no story may be `status=done` with a failure-flavored `reason`
   (which would have flagged the stale prd.json doc-drift the moment it appeared).

8. **Treat the vault as a TurboVec-backed build cache.** After each successful
   `build_app`, write the (goal → grounded facts that worked) pair back as a
   graphify node. Next time a similar goal arrives, `context_loader` retrieves
   the proven grounding by similarity instead of re-grepping and re-truncating
   the whole vault — recall gets cheaper AND better with every build.

9. **Prime-once, fan-out-many.** Today N parallel reviewers each cold-build the
   same prefix. A single deliberate priming call warms the Anthropic prefix
   cache, making every subsequent lens a cache-read. This flips the economics so
   that MORE verification (more lenses, more judges, full council) becomes
   *cheaper* per marginal reviewer — caching becomes an enabler of the
   verification capability, not a competing concern.

10. **rlm-rs to AUDIT, not just generate.** Have the verification autoloop
    recursively read the entire 250+-line render-spine to confirm a new section
    actually wired in (the route is reachable, the provider is mounted) —
    catching the "compiles but dead-wire" class the typecheck gate misses, which
    pairs with the existing dead-wire-detector skill. Memory entries can also
    become POINTERS not copies: store a one-line claim + a graph link to the
    full vault note; rlm-rs expands it on demand. The 2200-char cap stops being
    a knowledge ceiling and becomes just a working-set size.

---

## Appendix — capability → where it lands (quick index)

| Capability | Primary call sites to rewire |
| :-- | :-- |
| **rlm-rs** | `pipeline.py:732,652,905,1169` (truncation), `goal_loop.py:311,372`, grounding builders in `run_*.py` `[:3000]` |
| **synthesize_sections (→code)** | `pipeline.py:1478` (exists) → wire into `multi_file_code_job:737`, parallelize the `:1495` section loop |
| **TencentDB / TurboVec / graphify** | `config.yaml:333` (`memory.provider`), `memory_tool.py:118,529`, `kanban_db.py:802`, `vault_search:1883`/`context_loader:1910`, `prior_planning_lessons:1455`, `session_search_tool.py:373` |
| **council / autoloop** | `pipeline.py:122,169,1665`, `local_swarm_dispatcher.py:167`, `visual_qa.py:37`, `goal_loop.py:303` |
| **rtk / caveman / token-optimizer** | `context_compressor.py:224,519`, `model_tools.py:53`, `trajectory_compressor.py:550`, `SHAY_SYSTEM` in `brain_client.py:38` |
| **$/energy cost telemetry** | `cost_telemetry.py` (wire callers), `run_agent.py:8542`, `local_swarm_dispatcher.py:48,157`, `brain_client.py:74` |
| **prompt caching (port)** | `brain_client.py:74-95,192-217` ← `agent/prompt_caching.py` |
| **concurrency** | `local_swarm_dispatcher.py:73`, `asyncio_dispatcher.py` (stub), `goal_loop.py:400`, `loop.py:473` |

*All line numbers as cited in the 12-lens scan reports. Verify against current
HEAD before editing — the pipeline is under active churn.*
