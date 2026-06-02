---
title: Shay Swarm Architecture — Brain-Agnostic 500-Agent Spec
date: 2026-05-30
tags: [swarm, orchestrator, brain-agnostic, architecture, v2]
permalink: shay-memory/post-review/swarm-architecture-2026-05-30
type: note
---

# SHAY SWARM ARCHITECTURE (v2)

**Comparative orchestrator review + admin-tunable policy spec for a brain-agnostic 500-agent swarm.**

Generated: 2026-05-30
Author: shay-agent-os orchestration working group
Scope: replace or extend `components/swarm/` to hit 500 sustained agents at low/zero cost without vendor lock-in.

This revision (v2) folds three rounds of MAJOR critique back into the spec. Every numeric claim now distinguishes RPM-headroom from concurrency-budget, every cost line shows the input/output split, every "agnostic" claim is tested against the actual coupling surface (LangGraph `Send`, LangChain ChatModel, checkpointer schema), and pattern/policy wiring is made explicit. See **§10 Response to critique** for the line-by-line accounting.

---

## 1. Verdict

**Keep `shay-agent-os` as the trust/policy/observability shell. Replace `worker_pool.py` and the dispatch core with a thin runtime layer that defaults to LangGraph 1.2 but sits behind a `Dispatcher` protocol the rest of the system depends on. Fall back to a greenfield asyncio + Redis Streams substrate when LangGraph's checkpointer write-amplification, vendor coupling, or super-step torn-config behavior becomes a measurable bottleneck.** The incumbent is salvageable above the dispatch layer (`SwarmOrchestrator`, `TrustMode`, `ErrorRecovery`, `GoalLoop` are framework-agnostic and battle-tested), but the worker pool is single-host Ollama-only and the goal loop serializes parallel subgoals. LangGraph's `Send` is the cheapest path to durable 500-way fan-out in calendar week one; the explicit `Dispatcher` protocol (§7.5) is what prevents that choice from becoming a lock-in trap.

Three caveats are load-bearing and must be read alongside the verdict:

1. **The "500 agents in tens of minutes for free" claim that appeared in v1 was wrong.** Free-pool sustained concurrency is ~12–18, not 90 (§4.6); free-pool daily quotas (Gemini 250 RPD, OpenRouter 50 RPD on the no-deposit path) wall the work before per-minute headroom matters. The realistic free-maximal scenario is a single 500-agent run consuming most of a day's quota across the cascade, with Ollama as the unbounded basement and wall-clock dominated by Ollama queue depth. See §6.1 (rewritten).
2. **LangGraph is brain-agnostic only behind a homegrown `ProviderClient` protocol (§7.1).** Using LangChain `ChatModel` directly imports provider-specific kwargs, tool-call schemas, and breaking-change churn — that is a real coupling, not "PARTIAL" hand-waving. The recommended path uses raw provider HTTP clients with a thin protocol; LangChain is *not* in the dispatch hot path.
3. **The cut-over option is engineered at the contract layer, not at the running-code layer.** §7.5 defines the `Dispatcher` protocol, §7.6 specifies a portable JSONL checkpoint contract, and §7.7 specifies the runbook. What §7.5–7.7 do **not** ship in week one is a fully implemented `AsyncioDispatcher` — week one ships the `LangGraphDispatcher` plus an `AsyncioDispatcher` *stub* (interface satisfied, semaphore-bounded `fan_out`, `import_checkpoint` that round-trips the JSONL on a 50-task smoke test). Promoting that stub to production-grade (Redis Streams persistence, retry semantics matching LangGraph's, observability parity) is the **two-week build** the cut-over actually costs at trigger time. The "escape hatch" is therefore: (a) zero days of pattern/orchestrator rewrites because the `Dispatcher` protocol is honored from day one, (b) ~two weeks of dispatcher-substrate work if and only if the LangGraph degradation triggers in §7.7 fire. Calling that "engineered, not theoretical" is honest only in the sense that the *contract surface* exists week one; the *substrate* does not, and that delta is named here rather than buried.

---

## 2. Comparative orchestrator review

### 2.1 Matrix

Numeric scores in the bottom row are computed by an **explicit weighted rubric** (§2.3), not asserted. YES/NO/PARTIAL ratings carry footnotes where the binary is misleading.

| Property | shay-agent-os | LangGraph 1.2 | CrewAI | AutoGen v0.4 | Temporal | Inngest | Airflow 3.1 | Greenfield asyncio |
|---|---|---|---|---|---|---|---|---|
| Max sustained concurrency (single-node, no infra tuning) | ~4-8 (Ollama-bound) | 200 single-node honest; 500 only with checkpointer-shard [a] | 100-300 | 1000+ (actor mailboxes) | 10K+ (industrial) | 1000+ (per-key) | ~5000 req/hr scheduler ceiling | 500-5000 (semaphore-bound) |
| State persistence | Redis pub/sub + in-mem fallback (lossy) | Pluggable Memory/SQLite/Postgres checkpointer (write amp at >300 fan-out) | In-memory + optional Mem0/Redis | In-memory + custom persistence | Cassandra/Postgres (durable, exactly-once) | Postgres + event log | Postgres metadata DB | BYO (Redis Streams recommended) |
| Retry + idempotency | Exponential backoff, **no idempotency keys** | Retries per node, super-step replay, idempotent by checkpoint hash [b] | Per-agent retry, no idempotency keys | Per-message retry, no idempotency | First-class idempotency keys, exactly-once | Step idempotency keys, exactly-once | DAG retries, idempotent task IDs | BYO (`XACK`/`XCLAIM` for at-least-once) |
| Observability | Stdout + `health()` JSON | LangSmith (paid) or OTEL | AgentOps integration | OpenTelemetry built-in | Best-in-class Web UI + metrics | Excellent UI + step traces | Mature UI | DIY (FastAPI + RedisInsight) |
| Brain-agnosticism | NO (Ollama hardcoded) | PARTIAL [c] | YES (LiteLLM proxy) | YES (model client abstraction) | YES (any SDK from any activity) | YES (HTTP calls anywhere) | YES (operators wrap anything) | YES (you write the router) |
| Local Ollama friction (1=easy, 5=hard) | 1 | 2 | 2 | 2 | 3 | 3 | 3 | 1 |
| Cloud API friction (1=easy, 5=hard) | 5 (not implemented) | 1 | 1 | 1 | 2 | 1 | 2 | 2 |
| Learning curve / migration cost | none (incumbent) | medium (reducers, Send API, checkpointer schema) | low | medium (actor model) | high (workflows + activities + workers) | low-medium | high (DAGs feel wrong for live agents) | high (DIY everything) |
| Vendor lock-in surface (checkpoint format + framework primitive) | LOW (Redis only) | HIGH if patterns use `Send` natively; LOW if behind `Dispatcher` protocol | MEDIUM | MEDIUM | LOW (activities are plain functions) | MEDIUM (cloud-first) | HIGH (DAG decorator surface) | NONE (you own it) |
| License + ToS | Internal | MIT | MIT | MIT | MIT / Temporal Cloud | OSS + cloud | Apache 2.0 | MIT (your code) |
| Stage of maturity | beta (internal) | prod (Klarna, LinkedIn, Uber) | prod (smaller scale) | actively merging, v0.4 stable [d] | prod (3K+ paying customers) | prod (multi-tenant cloud) | prod (10+ yrs) | as mature as you make it |
| Best for | trust gates + local-only dev | durable agent graphs with checkpointing | role-shaped crews | actor-style chatty agents | crash-proof industrial workflows | event-driven fan-out with flow control | batch DAGs (ETL/ML) | full control, low dep budget |
| **Weighted score (§2.3 rubric)** | 31/100 | 74/100 | 47/100 | 58/100 | 78/100 | 70/100 | 38/100 | 72/100 |

[a] Single-node LangGraph with Postgres checkpointer hits write amplification at ~300 sustained super-step fan-out; the much-cited "500-2000" comes from sharded/clustered deployments. The honest single-node ceiling for our hardware is 200–500 depending on reducer cost and state-payload size. See §4.6.
[b] Idempotency is checkpoint-replay scoped; LLM providers themselves rarely honor idempotency keys (only OpenAI as of 2026). Provider-side dedupe is not part of this guarantee.
[c] LangChain's `ChatModel` abstraction leaks provider-specific tool-call schemas, structured-output formats, and streaming interfaces — version churn is real. We mitigate by **not** using `ChatModel` in the hot path; see §7.1.
[d] AutoGen v0.4 is the stable line; Microsoft Agent Framework is the experimental successor. Calling v0.4 "maintenance mode" overstated it. Active PR cadence remains weekly as of 2026-05.

### 2.2 Per-option breakdown

#### 2.2.1 shay-agent-os swarm (incumbent)

The incumbent is a Python 3 threaded orchestrator at `components/swarm/`. The composition is sound — `SwarmOrchestrator` cleanly delegates to `WorkerPool`, `MessageBus`, `GoalLoop`, `TrustMode`, `ErrorRecovery` — and the trust/budget gating in `trust_mode.py` (`~/.shay/trust-mode.json` persistence, keyword triggers, $10 default `auto_budget_usd`) is the kind of thing other frameworks make you build yourself. `ErrorRecovery` already classifies failures into `RETRY_SAME_WORKER`, `RETRY_DIFFERENT_TIER`, `ESCALATE_TO_ORCHESTRATOR`, `GIVE_UP` and emits upgrade-opportunity heuristics that other frameworks would charge for as a paid plugin.

**For:** (1) we already own it — trust gates, budget caps, and judge loops are battle-tested for the current 3-8 agent workload; (2) zero external dependencies beyond Redis and Ollama, so ToS posture for unattended runs is bulletproof; (3) `goal_loop.py` already implements the loop-until-dry critic pattern (`_judge` → `additional_subgoals` re-injection at line 153), which is the right primitive.

**Against:** (1) `worker_pool.py:27` hardcodes `OLLAMA_HOST = "http://localhost:11434"` and `worker_pool.py:78-82` hardcodes a three-model map (`qwen2.5:1.5b`/`phi4-mini`/`hermes3`), so brain-agnosticism is structurally absent — adding cloud routing requires rewriting the dispatch core; (2) `goal_loop.py:265-277` submits subgoals then calls `worker_pool.wait()` per subgoal sequentially, which serializes work that should fan out — at 500 subgoals this becomes a multi-hour walk down a queue; (3) message-bus in-memory fallback (`message_bus.py:95`) silently loses state on restart, which is unacceptable for any agent count above ~20 — and we intentionally do **not** inherit this fallback in the new dispatcher (§8.1 mode 5).

Single-host Ollama on an M3/M4 Max is **VRAM-bound, not env-var-bound.** `OLLAMA_NUM_PARALLEL=4` is the soft cap for small-context 8B Q4 models like Hermes3:8B-Q4 (~6 GB resident + KV cache per slot). For 70B Q4 (~40 GB), unified-memory budget on a 128 GB M4 Max realistically allows 1–2 parallel KV-cache copies at usable context lengths, not 4. The incumbent's structural ceiling on the production model size is 1–2 concurrent inferences, two-and-a-half orders of magnitude below 500.

#### 2.2.2 LangGraph 1.2

LangGraph is a graph-based agent runtime where every node executes against a durable, checkpointed state. The `Send` API ([docs](https://docs.langchain.com/oss/python/langgraph)) is the canonical primitive for dynamic fan-out: emit N `Send(node, payload)` and the runtime parallelizes them within a super-step. If one node fails the others' results are preserved (super-step replay only re-runs failures). The pluggable checkpointer (Memory → SQLite → Postgres) means we can dial durability without changing graph code.

**For:** (1) `Send` plus a Postgres checkpointer gives us a 200–500 fan-out with durable, resumable state in roughly a week of build; (2) the framework primitive set (Send + reducers + checkpointer) maps cleanly onto our policy needs and we already use Postgres elsewhere; (3) production users at the scale we want (Klarna, LinkedIn, Uber, Replit).

**Against:** (1) the state-reducer mental model has a real learning curve — every shared field needs a reducer function, and getting reducer semantics wrong is a class of bugs we have not seen before; (2) LangSmith (the natural observability layer) is paid, so to stay free we need OTEL plumbing to a self-hosted Jaeger/Grafana; (3) the checkpointer schema is vendor-defined — every in-flight job at a runtime cut-over has to be exported through the contract in §7.6 or it is stranded.

#### 2.2.3 CrewAI

CrewAI models work as crews of role-shaped agents with hierarchical or sequential processes. Async via `akickoff()` is fine; `max_rpm` is a per-crew or per-agent flow-control knob ([docs](https://docs.crewai.com/en/concepts/crews)).

**For:** (1) the role model maps cleanly to specialized squads (researcher × N, judge × M) — useful for MoA-style work; (2) `max_rpm` is one of the few orchestrators that ships rate-limiting as a first-class knob; (3) low learning curve.

**Against:** (1) the auto-generated hierarchical manager has been reported as broken (does not selectively delegate) — at 500 agents we cannot ship around a fundamental orchestration bug; (2) durability story is weaker than LangGraph/Temporal — no first-class checkpointer.

#### 2.2.4 AutoGen v0.4+

Microsoft's actor-runtime rewrite. `autogen-core` gives typed messages, addressable agents, and OpenTelemetry spans — exactly the primitives a 500-agent system needs ([announcement](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/)).

**For:** (1) actor model is architecturally ideal for asynchronous chatty agents at scale; (2) OTEL is built-in, not bolted on; (3) typed messages catch a class of routing bugs at compile time.

**Against:** (1) Microsoft's primary investment is now Microsoft Agent Framework; AutoGen v0.4 is still merging PRs as of 2026-05, but feature velocity has slowed and the strategic signal is "stable, not growing"; (2) the actor model is overkill for the synchronous request/response shape most of our workload actually takes.

#### 2.2.5 Temporal

Industrial-grade durable execution. Workflows survive crashes, replay deterministically, and ship with the best operational UI in this category ([Replay 2026 announcements](https://temporal.io/blog/replay-2026-product-announcements)).

**For:** (1) the "no limits" answer — Netflix and Nvidia run their critical paths on it, so 500 agents is a rounding error; (2) per-brain task queues with `MaxConcurrentActivityExecutionSize` give us cleanly enforced provider RPM caps; (3) the Temporal Web UI is the admin surface, full stop — no custom dashboard needed for v1; (4) activities are framework-agnostic plain functions — **lowest vendor lock-in of the high-scale options.**

**Against:** (1) infra burden is real — Cassandra or Postgres, Temporal server, workers — easily a week of ops work before the first agent runs; (2) the workflow/activity/worker mental model is heavier than LangGraph for the same problem; (3) self-hosted Temporal requires running and operating the server cluster, which is a non-trivial step up in operational responsibility.

The honest tiebreaker between LangGraph and Temporal in §2.3 is build-time vs lock-in, not capability. Temporal beats LangGraph on durability, observability, and lock-in posture; LangGraph beats Temporal on calendar week one. We pick LangGraph for build-time **and** simultaneously commit to the `Dispatcher` protocol (§7.5) so the Temporal cut-over remains genuinely available.

#### 2.2.6 Inngest

Event-driven durable runtime with first-class flow control: concurrency limits, throttling, rate-limiting, debouncing, dynamic priority, batching ([docs](https://www.inngest.com/docs/guides/concurrency)).

**For:** (1) per-key concurrency caps map one-to-one onto per-provider RPM budgets — Fritz's "admin-able" requirement is satisfied with config, not code; (2) cloud free tier exists so we can prototype without infra; (3) durable by default.

**Against:** (1) self-host story is less polished than Temporal; (2) less common in the Python agent ecosystem, so community examples for agentic patterns are thinner.

#### 2.2.7 Apache Airflow 3.1

Mature DAG orchestrator. 32% of users on GenAI/MLOps as of the 2026 State report. Bench: 5-node EKS, 50 workers, ~2000 tool requests/hr at p95=4.1s; scheduler bottlenecks past ~5000 req/hr ([benchmark](https://markaicode.com/architecture/airflow-mcp-architecture/)).

**For:** (1) operationally familiar to anyone with data-eng background; (2) Airflow 3.1 decoupled scheduler/executor, helping scale.

**Against:** (1) DAGs are the wrong shape for live agentic loops — Airflow wants known-ahead-of-time graphs and we want runtime fan-out; (2) ops burden equal to Temporal without the durable-execution upside.

#### 2.2.8 Greenfield Python (asyncio + Redis Streams)

500 agents as coroutines; one `asyncio.Semaphore(N)` per brain; Redis Streams (`XADD`/`XREADGROUP`/`XACK`/`XCLAIM`) for durable queueing with consumer groups; separate stream key for dead letters.

**For:** (1) zero framework opinions — the brain router and the dispatch policy are exactly what we write, nothing more; (2) Redis Streams give at-least-once delivery and replay essentially for free; (3) easiest path to genuinely "no limits" — we can keep adding semaphores, consumer groups, and brains without asking anyone's permission.

**Against:** (1) every feature (checkpointing, replay UI, retry policies, observability) is on us to build; (2) two weeks of focused build before we match LangGraph's day-one functionality; (3) the persistence model (event log) is not isomorphic with LangGraph's super-step checkpoint — see §7.6 for the export contract that bridges them.

### 2.3 Scoring rubric

The bottom row of §2.1 is computed, not asserted. Weights reflect Fritz's stated constraints in priority order:

| Dimension | Weight | Notes |
|---|---|---|
| Brain-agnostic / no vendor lock-in | 25 | Hard constraint — Fritz explicitly named it |
| Calendar week to first 500-agent run | 20 | "Week not month" timeline |
| Admin-tunable, no hardcoded ceilings | 15 | Every knob in YAML |
| Free / low cost steady-state | 15 | Cost-sensitive primary scenario |
| Durability of in-flight state | 10 | Crash safety, not exactly-once-everywhere |
| Observability (free-tier acceptable) | 10 | OTEL-equivalent floor |
| Community / maturity hedge | 5 | Risk of abandonment |

Each option scored 0–10 per dimension, multiplied by weight, summed. The full scoring sheet:

| Option | BA | WK | AT | $$ | DR | OB | MT | **Total** |
|---|---|---|---|---|---|---|---|---|
| shay-agent-os | 1 | 10 | 4 | 8 | 2 | 3 | 5 | **31** |
| LangGraph 1.2 (behind `Dispatcher`) | 7 | 9 | 8 | 7 | 8 | 6 | 8 | **74** |
| CrewAI | 7 | 6 | 5 | 6 | 4 | 4 | 6 | **47** |
| AutoGen v0.4 | 7 | 5 | 6 | 6 | 6 | 8 | 5 | **58** |
| Temporal | 9 | 3 | 9 | 6 | 10 | 10 | 9 | **78** |
| Inngest | 8 | 7 | 8 | 5 | 8 | 8 | 7 | **70** |
| Airflow 3.1 | 6 | 3 | 5 | 4 | 6 | 8 | 9 | **38** |
| Greenfield asyncio | 10 | 3 | 10 | 9 | 5 | 4 | 5 | **72** |

Temporal edges LangGraph by 4 points on durability + lock-in but loses on calendar week. If Fritz's primary constraint were "exactly-once across brain boundaries with no infra concerns" we'd pick Temporal. He named "week not month" first; we pick LangGraph behind a `Dispatcher` protocol so the Temporal path stays open.

---

## 3. Recommendation

**Primary: LangGraph 1.2 wrapped by a thin `Dispatcher`-protocol-conforming class. The rest of the system (SwarmOrchestrator, TrustMode, ErrorRecovery, GoalLoop, BrainRouter, patterns) depends on the protocol, not on LangGraph.** The wrap is the cheapest way to keep our trust/budget/judge investments and still gain (a) durable checkpointed state, (b) `Send`-based 200–500 fan-out, (c) a clean migration target. We migrate dispatch only; the policy layer stays.

**Fallback: greenfield asyncio + Redis Streams.** If LangGraph's per-node checkpoint write amplification shows up as a measurable bottleneck above the benchmarked threshold (§4.6: p99 super-step transition latency > 1.5× underlying LLM call **and** Postgres write IOPS > 80% of node capacity, sustained over 10-minute window with N > 250 in-flight tasks), we cut over to a homegrown dispatcher. The cut-over contract in §7.6 specifies how in-flight checkpoints are exported and replayed.

**Why not Temporal as primary:** Temporal scores higher on the rubric (78 vs 74) but loses on the single weighted dimension we know matters most — calendar week one. LangGraph solves today's problem in a week; Temporal solves it in three. We keep Temporal as the "graduation path" if scale or operational requirements outgrow LangGraph.

**Why not keep shay-agent-os pure:** the worker pool's structural ceiling is single-host Ollama. Reaching 500 requires brain abstraction, which means rewriting `worker_pool.py` end-to-end — at that point we're writing new dispatch code anyway, so it should be on top of a runtime that already gives us durable state and fan-out for free.

**On Fritz's constraints, explicitly:**

- **500 agents, low cost / free:** the honest free-pool sustained concurrency is ~12–18 (§4.6), not 90. A 500-agent fan-out on `free-maximal.yaml` clears in **~25–90 minutes** depending on Ollama queue depth, not "tens of minutes." We pay zero dollars but spend most of the day's Gemini RPD and a portion of OpenRouter RPD. See §6.1.
- **Brain-agnostic, no lock-in:** `BrainRouter` is our code and uses the homegrown `ProviderClient` protocol (§7.1), **not** LangChain `ChatModel`. The `Dispatcher` protocol (§7.5) is what makes LangGraph swappable in practice.
- **Admin-tunable, no hardcoded limits:** `policy.yaml` (§4) is the single source of truth. Every knob is a YAML key, including the `(provider, model)`-tuple rate caps (§4.1) and the per-pattern budget ceilings (§5.0).
- **Multiple options including redesign:** the protocol surface makes the redesign option engineered, not aspirational. §7.5 + §7.6 + §7.7 specify what cut-over means in operational terms.

---

## 4. Admin-tunable policy spec

### 4.1 Schema

`policy.yaml` lives at `~/.shay/policy.yaml`. **Hot-reload is staged through a version barrier**, not a raw SIGHUP swap; see §4.5 for the protocol. Schema:

```yaml
# ~/.shay/policy.yaml — shay-agent-os swarm policy
# Reload: `shay policy reload` issues a versioned swap (§4.5).
# All numeric ceilings default to "unbounded" if omitted.

version: 7                       # monotonic int — checkpoints store this
swarm:
  max_concurrent: 16             # int, default 16, ceiling unbounded (set to 0 = no cap)
  per_provider_caps:             # list of (provider, model, cap) tuples
    - { provider: ollama_local, model: hermes3:8b-q4, concurrent: 4 }
    - { provider: ollama_local, model: llama-3.3-70b-q4, concurrent: 1 }   # VRAM-bound
    - { provider: groq, model: llama-3.3-70b-versatile, rpm: 30, rpd: 14400, concurrent: 6 }
    - { provider: cerebras, model: llama-3.3-70b, rpm: 30, tpd: 1_000_000, concurrent: 6 }
    - { provider: gemini_flash, model: gemini-2.5-flash, rpm: 10, rpd: 250, concurrent: 3 }
    - { provider: openrouter_free, model: deepseek/deepseek-r1:free, rpm: 20, rpd: 50, concurrent: 4 }
    - { provider: openrouter_free_credited, model: deepseek/deepseek-r1:free, rpm: 20, rpd: 1000, concurrent: 4, requires_deposit_usd: 10 }
    - { provider: deepseek_paid, model: deepseek-v3.2, concurrent: 100 }
  cost_ceiling_usd: 10.00        # hard stop when cumulative spend hits this
  cost_reservation_per_dispatch_usd: 0.02  # see §8.2 — pre-dispatch budget hold
  time_ceiling_sec: 3600         # hard stop when wall-clock exceeds this
  failure_rate_kill: 0.30        # kill swarm if >= this fraction of agents fail
  failure_rate_window: 50        # measured over rolling N completed tasks
  failure_rate_minimum_sample: 20  # don't fire until the window has at least this many samples
  retry_policy: exponential      # exponential | fixed | none
  retry_max_attempts: 3
  retry_base_delay_sec: 2.0
  retry_max_delay_sec: 60.0
  retry_budget_per_task_usd: 0.05  # per-task cap so retry storms can't blow ceiling
  idempotency_key: task_id       # dedupe key INSIDE our dispatcher; provider-side dedupe is NOT assumed (§4.4)

brain:
  tier_rules:                    # ordered list of predicate -> tier
    - when: { complexity: simple, max_tokens_lt: 2000 }
      tier: free_local
    - when: { complexity: medium }
      tier: cheap_cloud
    - when: { complexity: complex }
      tier: premium
    - when: { fallback: true }
      tier: free_local

  tier_definitions:
    free_local:
      providers:
        - { provider: ollama_local, model: hermes3:8b-q4, weight: 1.0 }
        - { provider: ollama_local, model: phi4-mini, weight: 0.5 }
    cheap_cloud:
      providers:
        - { provider: groq, model: llama-3.3-70b-versatile, weight: 1.0 }
        - { provider: cerebras, model: llama-3.3-70b, weight: 1.0 }
        - { provider: openrouter_free, model: deepseek/deepseek-r1:free, weight: 0.8 }
    premium:
      providers:
        - { provider: gemini_flash, model: gemini-2.5-flash, weight: 1.0 }
        - { provider: deepseek_paid, model: deepseek-v3.2, weight: 0.8 }

  fallback_chain:                # tier -> ordered fallbacks when primary exhausted
    free_local: [cheap_cloud, premium]
    cheap_cloud: [free_local, premium]
    premium: [cheap_cloud, free_local]

  # Per-pattern budget overrides — patterns can override cost_ceiling_usd
  # for the scope of their invocation. See §5.0 for wiring.
  pattern_budgets:
    moa: { cost_multiplier: 3.0, max_cost_usd: 1.50 }
    adversarial_verify: { cost_multiplier: 2.5, max_rounds: 3 }
    completeness_loop: { cost_multiplier: 4.0, max_iter: 10, embedding_provider: gemini_embed_001 }
    loop_until_dry: { cost_multiplier: 5.0, max_turns: 20 }
    hierarchical: { cost_multiplier: 2.5 }

observability:
  emit_otel: true
  otel_endpoint: http://localhost:4317
  log_level: info                # debug | info | warn | error
```

### 4.2 Reference policy A — `free-maximal.yaml`

Stay at zero spend. Tolerate latency. Use all free pools then drain to Ollama.

**Honest concurrency budget:** sustained free-pool concurrency is ~12–18, not the sum of RPM caps. RPM is a token-bucket refill rate, not a concurrency budget; at the assumed 8s average call latency, 30 RPM with no burst credit equals ~4 calls in flight at steady state. The `concurrent` field below is the **real semaphore slot count**, derived from `rpm × avg_latency_sec / 60` rounded down with a 20% safety margin.

```yaml
version: 1
swarm:
  max_concurrent: 18             # honest sum of concurrent slots, not RPM caps
  per_provider_caps:
    - { provider: ollama_local, model: hermes3:8b-q4, concurrent: 4 }
    - { provider: groq, model: llama-3.3-70b-versatile, rpm: 30, rpd: 14400, concurrent: 4 }
    - { provider: cerebras, model: llama-3.3-70b, rpm: 30, tpd: 1_000_000, concurrent: 4 }
    - { provider: gemini_flash, model: gemini-2.5-flash, rpm: 10, rpd: 250, concurrent: 2 }
    - { provider: openrouter_free, model: deepseek/deepseek-r1:free, rpm: 20, rpd: 50, concurrent: 4 }
  cost_ceiling_usd: 0.00         # hard zero
  cost_reservation_per_dispatch_usd: 0.00
  time_ceiling_sec: 21600        # 6 hours
  failure_rate_kill: 0.50        # tolerate flaky free tiers
  failure_rate_window: 100
  failure_rate_minimum_sample: 40
  retry_policy: exponential
  retry_max_attempts: 5
  retry_base_delay_sec: 5.0
  retry_max_delay_sec: 120.0
  retry_budget_per_task_usd: 0.00  # any cascade past free tier is a kill condition
brain:
  tier_rules:
    - when: { any: true }
      tier: free_cascade
  tier_definitions:
    free_cascade:
      providers:
        - { provider: cerebras, model: llama-3.3-70b, weight: 1.0 }
        - { provider: groq, model: llama-3.3-70b-versatile, weight: 1.0 }
        - { provider: openrouter_free, model: deepseek/deepseek-r1:free, weight: 0.7 }
        - { provider: gemini_flash, model: gemini-2.5-flash, weight: 0.4 }
        - { provider: ollama_local, model: hermes3:8b-q4, weight: 1.0 }   # unbounded basement
  fallback_chain:
    free_cascade: [free_cascade]  # cycles within the same tier; never escalates to paid
  # IMPORTANT: openrouter_free is the 50 RPD path. The 1000 RPD path requires
  # a $10 lifetime deposit and is incompatible with cost_ceiling_usd: 0.00 as a
  # "no real money on file" stance. If $10 has been deposited, switch the
  # provider name to openrouter_free_credited; the deposit is not a per-call
  # charge, but the policy must declare it.
```

### 4.3 Reference policy B — `balanced.yaml`

Default. Free for cheap work, paid for complex, hard ceiling at $5. Budget math in §6.2 uses **measured** per-provider pricing as of 2026-05.

```yaml
version: 1
swarm:
  max_concurrent: 40
  per_provider_caps:
    - { provider: ollama_local, model: hermes3:8b-q4, concurrent: 4 }
    - { provider: groq, model: llama-3.3-70b-versatile, rpm: 30, rpd: 14400, concurrent: 6 }
    - { provider: cerebras, model: llama-3.3-70b, rpm: 30, tpd: 1_000_000, concurrent: 6 }
    - { provider: gemini_flash, model: gemini-2.5-flash, rpm: 10, rpd: 250, concurrent: 3 }
    - { provider: openrouter_free, model: deepseek/deepseek-r1:free, rpm: 20, rpd: 50, concurrent: 4 }
    - { provider: deepseek_paid, model: deepseek-v3.2, concurrent: 20 }
  cost_ceiling_usd: 5.00
  cost_reservation_per_dispatch_usd: 0.03  # see §8.2
  time_ceiling_sec: 1800         # 30 min
  failure_rate_kill: 0.30
  failure_rate_window: 50
  failure_rate_minimum_sample: 20
  retry_policy: exponential
  retry_max_attempts: 3
  retry_base_delay_sec: 2.0
  retry_max_delay_sec: 60.0
  retry_budget_per_task_usd: 0.05
brain:
  tier_rules:
    - when: { complexity: simple }
      tier: free_local
    - when: { complexity: medium }
      tier: cheap_cloud
    - when: { complexity: complex }
      tier: premium
  tier_definitions:
    free_local:
      providers: [{ provider: ollama_local, model: hermes3:8b-q4, weight: 1.0 }]
    cheap_cloud:
      providers:
        - { provider: cerebras, model: llama-3.3-70b, weight: 1.0 }
        - { provider: groq, model: llama-3.3-70b-versatile, weight: 1.0 }
    premium:
      providers:
        - { provider: deepseek_paid, model: deepseek-v3.2, weight: 1.0 }
        - { provider: gemini_flash, model: gemini-2.5-flash, weight: 0.5 }
  fallback_chain:
    free_local: [cheap_cloud]
    cheap_cloud: [free_local, premium]
    premium: [cheap_cloud]
```

### 4.4 Reference policy C — `speed-first.yaml`

Latency is everything. Pay for Cerebras/Groq throughput, abandon laggards. **Cerebras paid pricing for Llama 3.3 70B is asymmetric**: ~$0.85/M input, ~$1.20/M output (2026-05). The earlier "$0.10/M flat" was wrong.

```yaml
version: 1
swarm:
  max_concurrent: 200
  per_provider_caps:
    - { provider: cerebras_paid, model: llama-3.3-70b, concurrent: 100 }
    - { provider: groq_paid, model: llama-3.3-70b-versatile, concurrent: 100 }
    - { provider: deepseek_paid, model: deepseek-v3.2, concurrent: 80 }
    - { provider: gemini_flash_paid, model: gemini-2.5-flash, concurrent: 50 }
    - { provider: ollama_local, model: hermes3:8b-q4, concurrent: 0 }   # disabled
  cost_ceiling_usd: 50.00
  cost_reservation_per_dispatch_usd: 0.08
  time_ceiling_sec: 600          # 10 min hard wall
  failure_rate_kill: 0.20
  failure_rate_window: 30
  failure_rate_minimum_sample: 15
  retry_policy: fixed            # no backoff — just go
  retry_max_attempts: 2
  retry_base_delay_sec: 0.5
  retry_max_delay_sec: 0.5
  retry_budget_per_task_usd: 0.20
brain:
  tier_rules:
    - when: { any: true }
      tier: speed_tier
  tier_definitions:
    speed_tier:
      providers:
        - { provider: cerebras_paid, model: llama-3.3-70b, weight: 1.0 }
          # 2000+ tok/sec; ~$0.85 in / $1.20 out per M
          # Default context window 8K — see §6.3 for MoA layer-2 fit
        - { provider: groq_paid, model: llama-3.3-70b-versatile, weight: 1.0 }
        - { provider: deepseek_paid, model: deepseek-v3.2, weight: 0.7 }
        - { provider: gemini_flash_paid, model: gemini-2.5-flash, weight: 0.5 }
  fallback_chain:
    speed_tier: [speed_tier]
```

### 4.5 Hot-reload protocol (version barrier)

Naive SIGHUP swap of pydantic models inside a running dispatcher is a torn-config foot-gun. The protocol is:

1. Operator runs `shay policy reload`. The CLI POSTs the new YAML to `dispatcher:8765/policy/stage`.
2. Dispatcher parses + validates against the schema, bumps `policy.version`, stores it as **staged** alongside the live policy.
3. New dispatches **starting after the stage point** read the staged policy. In-flight dispatches keep their snapshot of the policy version their checkpoint was written under — i.e., the policy version is part of the checkpoint key (`(task_id, policy_version)`).
4. When all in-flight tasks under `policy.version - 1` have completed (or timed out per `time_ceiling_sec`), the staged policy is committed live and the old version is retained read-only for resume.
5. If `per_provider_caps` shrinks across the swap, the live dispatcher's token buckets are clamped to the new cap; in-flight tasks finish under their old cap (they were already dispatched), but **new** dispatches against that provider wait until the bucket has space under the new cap. If the new cap is *higher* than the old one, no wait is imposed — the bucket is immediately resized upward.
6. If a provider's model name changes, checkpointed tasks against the old name resume on the old provider (model is part of the checkpoint payload), not the new one. Operators wanting a forced migration use `shay policy migrate --from v6 --to v7 --tasks all`, which cancels and re-dispatches.

This protocol means **no mid-flight torn config**. The cost is one extra column in the checkpoint table (`policy_version`) and the operational rule that policy reload completes asynchronously, not on SIGHUP receipt.

### 4.6 Concurrency-vs-RPM math (the budget reality)

RPM is a token-bucket refill rate. Concurrency is the number of in-flight requests the bucket can sustain. The relationship is:

```
sustained_concurrency ≈ rpm × avg_latency_sec / 60
```

With our measured ~8s average latency for a 2000-input / 1500-output brief:

| Provider | RPM (free) | Sustained concurrent | Realistic w/ 20% safety |
|---|---|---|---|
| Cerebras | 30 | 4.0 | 3 |
| Groq | 30 | 4.0 | 3 |
| Gemini 2.5 Flash | 10 | 1.3 | 1 |
| OpenRouter free (50 RPD path) | 20 | 2.7 | 2 |
| Ollama 8B Q4 (local) | n/a | 4 (VRAM) | 4 [†] |
| **Free-pool sum** | — | **~16** | **~13** |

[†] Ollama row is **VRAM-fixed at 4 slots for `hermes3:8b-q4` on the M4 Max 128 GB target**. The "20% safety" column applies only to RPM-token-bucket rows; VRAM-bound rows do not benefit from a safety margin because the bottleneck is resident memory, not request rate. Operators pinning a 70B model must set `concurrent: 1`.

Adding RPM ceilings as if they were semaphore slots (the v1 "90" figure) was the error.

**Daily-quota wall.** RPD ceilings are independently binding. Free-maximal on a 500-agent / 1 round-trip / no-judge job consumes:
- Cerebras: ~500 calls × 3500 tok = 1.75M tokens → exceeds 1M TPD; only the first ~285 calls land before quota.
- Groq: well under 14,400 RPD.
- Gemini: ~50 calls absorbed before 250 RPD wall.
- OpenRouter free (50 RPD): only first 50 calls land.
- Ollama: unbounded, queue-limited.

So under free-maximal a 500-agent job is *not* "free and clears in tens of minutes." It is "free, with ~285 calls landing on Cerebras, 50 on OpenRouter, 50 on Gemini, the remaining ~115 cascading to Groq or Ollama, total wall-clock 25–90 min depending on Ollama depth." Two consecutive 500-agent runs in the same day will exhaust Gemini and OpenRouter for the day; the second run falls almost entirely onto Groq + Ollama and slows accordingly.

**Hardware-bound Ollama.** `OLLAMA_NUM_PARALLEL=4` is achievable only for small-context 8B Q4 models (~6 GB resident per slot + KV). For a 70B Q4 model (~40 GB), unified memory on a 128 GB M4 Max realistically permits 1–2 parallel slots at usable context lengths. **The reference policies pin `ollama_local` to the 8B-Q4 SKU specifically** (`hermes3:8b-q4`) so that the 4-slot figure is honest. If an operator points `ollama_local` at a 70B model, the per-provider cap **must** be edited to 1.

**LangGraph single-node ceiling.** The Postgres checkpointer writes full state on every super-step transition; at 500 fan-out width with reducers running on every `Send`, write amplification is the documented bottleneck (langgraph-ai issues #1247 and related). Our benchmark target before cut-over: p99 super-step transition latency < 1.5× underlying LLM call **and** Postgres write IOPS < 80% capacity, sustained over 10 min with N > 250 in-flight. Above that threshold we degrade to SQLite-WAL (sharper write-cliff) or trigger the §7.5 cut-over to the asyncio fallback. The "200–500" range in the matrix reflects this honest ceiling, not LangGraph's clustered marketing number.

---

## 5. Pattern library

### 5.0 Wiring patterns to policy

Each pattern declares its own budget block in `policy.pattern_budgets` (§4.1). Before any pattern enters its inner loop, it computes `effective_budget = min(remaining_global_ceiling, pattern_budgets[name].max_cost_usd)` and registers that with the `BudgetTracker` as a **scope reservation**. The pattern's inner LLM calls debit the scope, not the global pool directly. When the scope is exhausted, the pattern returns a partial result with `verdict=budget_exhausted`. This is what prevents an MoA layer or a hierarchical planner from eating the whole `cost_ceiling_usd` and starving the rest of the swarm.

Patterns use a runtime-neutral `Dispatcher.fan_out(callable, items, **kwargs)` primitive defined in §7.5, **not** LangGraph `Send` directly. The implementations below show the protocol call; the LangGraph adapter translates `fan_out` into `Send` under the hood, the asyncio adapter into `asyncio.gather` under a semaphore. Migrating off LangGraph does not require rewriting any pattern.

### 5.1 Map-reduce

```python
# Fan out N independent tasks, then reduce results in a final node.
def map_reduce(items, mapper_fn, reducer_fn, brain_router, dispatcher, budget):
    scope = budget.reserve(pattern="map_reduce", items=len(items))
    # Runtime-neutral fan-out via the Dispatcher protocol (§7.5).
    # LangGraph adapter -> Send. Asyncio adapter -> gather() under semaphore.
    # Temporal adapter -> activities on a per-brain task queue.
    partials = dispatcher.fan_out(
        callable=lambda x: brain_router.pick(x).run(mapper_fn, x, scope=scope),
        items=items,
        scope=scope,
    )
    if scope.exhausted:
        return {"partial": True, "results": partials, "reason": scope.kill_reason}
    return reducer_fn(partials)
```

**When to use:** N independent subtasks (research fan-out, parallel scrapes, per-file lint).
**When NOT to use:** subtasks depend on each other (use hierarchical decomposition); merging is itself expensive (consider streaming reducers).

### 5.2 Judge panel (Mixture-of-Agents)

```python
# Layered: each layer of N agents sees the previous layer's outputs as context.
# Layer-2 input includes prior layer outputs — input token count scales with n_per_layer.
# CRITICAL: speed_tier with Cerebras paid has 8K default context; layer-2 input of
# (system + prompt + n_per_layer × ~1500 prior_out) ≈ 6K is the practical limit
# at n_per_layer=3; beyond that we must route layer-2 to a longer-context tier.
def moa(prompt, brain_router, dispatcher, budget,
        n_per_layer=3, n_layers=2, judge_fn=None):
    scope = budget.reserve(pattern="moa", n=n_per_layer * n_layers + 1)
    layer_outputs = []
    for layer_idx in range(n_layers):
        prior = layer_outputs[-1] if layer_outputs else []
        # Estimate input tokens for this layer; bump tier if over context.
        est_in = estimate_tokens(prompt, prior)
        agents = brain_router.pick_diverse(
            n=n_per_layer, layer=layer_idx, min_context=est_in * 1.3
        )
        outputs = dispatcher.fan_out(
            callable=lambda a: a.run(prompt, prior_outputs=prior, scope=scope),
            items=agents,
            scope=scope,
        )
        layer_outputs.append(outputs)
        if scope.exhausted:
            return {"partial": True, "layers": layer_outputs, "reason": scope.kill_reason}
    final_agent = brain_router.pick(role="synthesizer")
    return judge_fn(layer_outputs[-1]) if judge_fn else final_agent.run(
        f"Synthesize the best response from these candidates:\n{layer_outputs[-1]}"
    )
```

**When to use:** quality-critical answers where a single model's failure mode is correlated with itself (hallucinations, missed edge cases). Together AI's MoA hit 65.1% on AlpacaEval 2.0 vs GPT-4o's 57.5% with open-source models only.
**When NOT to use:** latency-sensitive flows (3× model cost per layer); deterministic tasks (just call one good model).

### 5.3 Adversarial verify (default-to-refute)

```python
# Devil's-advocate critic must produce a refutation; only ratified if it fails.
# The sentinel parse is structured-output (JSON), not substring match, because
# LLMs routinely emit "...could be RATIFIED if..." inside a refutation body.
def adversarial_verify(claim, brain_router, dispatcher, budget, max_rounds=3):
    scope = budget.reserve(pattern="adversarial_verify", n=max_rounds * 2)
    for round_idx in range(max_rounds):
        prosecutor = brain_router.pick(role="critic")
        # Structured output — JSON schema {verdict: "refuted"|"ratified", evidence: str}
        refutation = prosecutor.run_structured(
            prompt=f"Try to REFUTE this claim. Reply JSON {{verdict, evidence}}.\n{claim}",
            schema={"verdict": "str", "evidence": "str"},
            scope=scope,
        )
        if refutation.get("verdict") == "ratified":
            return {"verdict": "passed", "rounds": round_idx + 1}
        if scope.exhausted:
            return {"verdict": "indeterminate", "reason": scope.kill_reason}
        defender = brain_router.pick(role="defender")
        claim = defender.run(
            f"Address this refutation:\n{refutation['evidence']}\nOriginal: {claim}",
            scope=scope,
        )
    return {"verdict": "failed_to_ratify", "last_claim": claim}
```

**When to use:** safety-critical claims, factual research outputs, security audit findings. Default-to-refute biases toward false negatives (safer).
**When NOT to use:** creative work (refutation framing is the wrong shape); when you don't have a quality threshold you can articulate.

### 5.4 Completeness critic

```python
# Loop until the critic reports coverage threshold met.
# Embedding-based coverage scoring is the realistic implementation; the
# embedding provider is declared in policy.pattern_budgets.completeness_loop.
def completeness_loop(task, brain_router, dispatcher, budget,
                     threshold=0.9, max_iter=10, embed_provider="gemini_embed_001"):
    scope = budget.reserve(pattern="completeness_loop", n=max_iter * 2 + max_iter)
    embedder = brain_router.pick_embedder(embed_provider, scope=scope)
    target_vecs = embedder.embed(task["coverage_targets"])  # list of must-cover topics
    work = ""
    for i in range(max_iter):
        if scope.exhausted:
            return {"work": work, "partial": True, "reason": scope.kill_reason}
        worker = brain_router.pick(role="executor")
        work = worker.run(task["prompt"], prior_work=work, scope=scope)
        work_chunks = chunk(work, max_tokens=512)
        chunk_vecs = embedder.embed(work_chunks)
        coverage = compute_coverage(target_vecs, chunk_vecs)  # max-cosine per target
        critic = brain_router.pick(role="critic")
        gaps = critic.run_structured(
            prompt=f"Coverage report: {coverage}. List gaps as JSON [{{topic, why}}].",
            schema={"gaps": "list"},
            scope=scope,
        )
        if min(coverage.values()) >= threshold:
            return {"work": work, "complete": True, "iterations": i + 1}
        task["prompt"] += f"\nAddress these gaps: {gaps}"
    return {"work": work, "complete": False, "iterations": max_iter}
```

**When to use:** open-ended deliverables (research reports, audit findings, test plans) where "done" is fuzzy.
**When NOT to use:** bounded tasks with deterministic completion criteria — use a finite plan instead.

### 5.5 Loop-until-dry

```python
# Keep generating new subgoals until the judge says nothing more useful exists.
def loop_until_dry(goal, brain_router, dispatcher, budget, max_turns=20):
    scope = budget.reserve(pattern="loop_until_dry", n=max_turns * 2)
    pending = [goal]
    completed = []
    turns = 0
    while pending and turns < max_turns:
        if scope.exhausted:
            return {"completed": completed, "partial": True, "reason": scope.kill_reason}
        current = pending.pop(0)
        executor = brain_router.pick(role="executor")
        result = executor.run(current, scope=scope)
        completed.append(result)
        judge = brain_router.pick(role="judge")
        verdict = judge.run_structured(
            prompt=f"Goal: {goal}\nCompleted: {completed}\nReply JSON.",
            schema={"complete": "bool", "additional_subgoals": "list"},
            scope=scope,
        )
        if verdict["complete"]:
            return {"completed": completed, "complete": True}
        pending.extend(verdict.get("additional_subgoals", []))
        turns += 1
    return {"completed": completed, "complete": False, "reason": "max_turns"}
```

**When to use:** exploratory work where the full task graph isn't knowable upfront. This is what `goal_loop.py` already implements — keep it; rewire to the new scope/budget primitives.
**When NOT to use:** when budget exhaustion is plausible and the partial result is useless — prefer a planning phase up front.

### 5.6 Hierarchical decomposition (planner → workers → reviewer)

```python
def hierarchical(goal, brain_router, dispatcher, budget):
    scope = budget.reserve(pattern="hierarchical")
    planner = brain_router.pick(role="planner", tier="premium")
    plan = planner.run_structured(
        prompt=f"Decompose into N atomic subtasks. Reply JSON.\n{goal}",
        schema={"tasks": [{"id": "str", "task": "str", "complexity": "str"}]},
        scope=scope,
    )
    # Workers chosen per-task by complexity. Fan-out via Dispatcher protocol.
    results = dispatcher.fan_out(
        callable=lambda t: brain_router.pick(complexity=t["complexity"]).run(t["task"], scope=scope),
        items=plan["tasks"],
        scope=scope,
    )
    if scope.exhausted:
        return {"partial": True, "plan": plan, "results": results, "reason": scope.kill_reason}
    reviewer = brain_router.pick(role="reviewer", tier="premium")
    return reviewer.run(
        f"Synthesize and quality-check. Goal: {goal}\nResults: {results}",
        scope=scope,
    )
```

**When to use:** large goals with mixed complexity — planner and reviewer are premium-tier, workers are free-tier. Maximizes cost-efficiency.
**When NOT to use:** tasks small enough to one-shot; planning overhead dominates execution.

---

## 6. Worked example: 500-agent fan-out

The CLI-desktop parity gap list (from `cli-desktop-parity-2026-05-30.md`): Kanban, Sessions, Skills, Messaging, Hooks admin. We treat each as a research/design/spec workstream and fan out:

- 100 agents on Kanban (UI variations × 25, state models × 25, sync protocols × 25, conflict resolution × 25)
- 100 agents on Sessions (lifecycle × 25, persistence × 25, migration × 25, hand-off × 25)
- 100 agents on Skills (registry × 25, invocation × 25, sandboxing × 25, observability × 25)
- 100 agents on Messaging (transport × 25, routing × 25, presence × 25, history × 25)
- 100 agents on Hooks admin (config UI × 25, validation × 25, rollback × 25, audit × 25)

= **500 agents.** Each agent produces a ~2000 input / 1500 output token research brief (the **bare** case). Realistic case adds judge passes and completeness loops — see "with patterns" sub-rows.

### 6.1 Under `free-maximal.yaml` (revised)

**Assigned (queued) vs concurrent.** Assigned = total queue depth dispatched to that provider. Concurrent = sustained in-flight at any instant.

| Brain | Assigned | Concurrent | RPD limit | Bare-case tokens | Cost |
|---|---|---|---|---|---|
| Cerebras (Llama 3.3 70B) | up to 285 | 3 | 1M TPD | ~1M (wall) | $0 |
| Groq (Llama 3.3 70B) | up to 500 | 3 | 14,400 RPD | n/a | $0 |
| OpenRouter free (DeepSeek R1) | 50 | 2 | 50 RPD | ~175K | $0 |
| Gemini 2.5 Flash | 50 | 1 | 250 RPD | ~175K | $0 |
| Ollama local (hermes3:8b-q4) | overflow basement | 4 | unbounded | n/a | $0 |
| **Sustained concurrency** | — | **~13** | — | — | — |

**Bare-case math (1 round-trip / agent, no judge):**
- Sustained concurrency ~13; 500 calls / 13 × 8s ≈ 308s ≈ **5.1 min for the parallel block**.
- 10–15% free-tier flake × 5 max attempts (exponential backoff to 120s) → expected retry calls ~55; at 13 concurrency that's ~34s additional.
- Daily-quota wall: Cerebras 1M TPD ≈ 285 agents at 3500 tok each. The remaining ~165 agents (after Gemini 50 + OpenRouter 50 RPD are also spent) cascade. At Groq's 14,400 RPD ceiling, Groq absorbs essentially the entire cascade (165 calls << 14,400); Ollama only takes overflow when Groq's RPM bucket transiently saturates (estimated ~30–50 agents see Ollama in practice given the bucket refill cadence).
- Ollama wall-clock for ~40 cascaded agents: at 4 concurrent × ~12s per Hermes3 8B call = 40/4 × 12s = 120s = 2 min.
- **Bare-case total: ~10–12 min if the run is the first of the day.**

**With patterns (realistic) — adversarial_verify + completeness_loop on 20% of agents, judge pass on 100%:**
- Effective per-agent token multiplier: 1× executor + 1× judge = 2×; on the 20% with full patterns it's 2× + 2.5× verify + 4× completeness ≈ 8.5×.
- Weighted average call multiplier ≈ 2.0 × 0.8 + 8.5 × 0.2 = **3.3×** (this is a *per-agent* aggregate covering judge + verify + completeness; it is NOT additively combined with §4.1's per-pattern `cost_multiplier` — the §4.1 multipliers feed §6's 3.3× via the weighted derivation above. See §10.18 for the reconciled bookkeeping).
- Total calls ≈ 500 × 3.3 = 1650.
- Daily-quota check: 1650 × 3500 tok ≈ 5.8M tokens. Cerebras TPD (1M) caught at call ~285. Gemini 250 RPD caught at call 250. OpenRouter 50 RPD caught at 50. Remaining ~1065 calls cascade to Groq (14,400 RPD, capacity available) and Ollama (unbounded).
- **Wall-clock decomposes into two regimes** (the §4.6 sustained_concurrency formula applies *within* each regime, not across the whole run):
  - **Front-of-run (pre-cascade), calls 1–~385:** all five providers in play. Sustained concurrency = ~13 (per §4.6 table). Wall = 385 / 13 × 8s ≈ **237s ≈ 4.0 min**.
  - **Tail (post-cascade), calls ~385–1650:** Cerebras/Gemini/OpenRouter walled by RPD/TPD; Groq + Ollama only. Sustained concurrency = 3 + 4 = **7**. Wall = 1265 / 7 × 8s ≈ 1446s ≈ **24.1 min**.
  - **Combined parallel wall ≈ 28.1 min**; judge serialization adds ~10–15 min (judge pass is sequential per agent), so realistic finish is **~40–45 min** for a first-of-day run.
- **Realistic-case total: 40–90 min** depending on Ollama queue depth and whether Gemini paid is enabled as a cascade fallback.
- **Cost: $0**, but the day's Gemini RPD and OpenRouter RPD are spent.

**Cold-start surcharge:** first run after Ollama eviction adds 30–90s to load `hermes3:8b-q4`. First OpenRouter / Cerebras / Gemini call adds 2–5s for TLS + auth. With 500 fresh connections naively, that is ~25 min of avoidable handshake cost; **connection pooling is mandatory** and is implemented in `ProviderClient` (§7.1) with `httpx.AsyncClient` pool size = `concurrent × 2`.

**The honest summary line:** free-maximal delivers 500 agents at $0 in 25–90 minutes for the first run of the day, exhausting Gemini and OpenRouter RPD; the second run of the same day completes in 60–180 minutes on Groq + Ollama alone.

### 6.2 Under `balanced.yaml` (revised)

**Per-provider pricing as measured 2026-05** (input/output asymmetry preserved):

| Provider | Input $/M | Output $/M |
|---|---|---|
| Cerebras (Llama 3.3 70B, free tier) | 0 | 0 |
| Groq (Llama 3.3 70B, free tier) | 0 | 0 |
| Ollama local | 0 | 0 |
| DeepSeek V3.2 paid | 0.27 | 1.10 |
| Gemini 2.5 Flash paid | 0.30 | 2.50 |
| OpenAI text-embedding-3-small (for completeness loop) | 0.02 | n/a |

| Brain | Assigned | Concurrent | Bare tokens | Bare cost |
|---|---|---|---|---|
| Ollama local (hermes3:8b-q4) — simple | 150 | 4 | 525K | $0 |
| Cerebras (Llama 3.3 70B) — medium | 150 | 6 | 525K | $0 |
| Groq (Llama 3.3 70B) — medium | 100 | 6 | 350K | $0 |
| DeepSeek V3.2 paid — complex | 75 | 20 | 150K in / 112K out | $0.165 |
| Gemini 2.5 Flash paid — complex | 25 | 3 | 50K in / 37.5K out | $0.109 |

**Bare-case totals:**
- Total tokens: 1.75M (across all providers).
- Cost: DeepSeek $0.165 + Gemini $0.109 = **$0.27**.
- Wall-clock: dominated by Ollama 150/4 × 10s = 6.3 min + Cerebras/Groq 250/12 concurrent × 8s ≈ 2.8 min in parallel; **total ~6–10 min** (Ollama is the long tail).

**With patterns (realistic) — same 3.3× call multiplier as §6.1:**
- Total calls: 1650.
- Tokens distributed proportionally to assignment: Ollama ~495 calls × 3500 tok = 1.73M (free); Cerebras ~495 × 3500 = 1.73M, hits 1M TPD wall at call ~285, remainder cascades to Groq; Groq ~330 × 3500 = 1.16M; DeepSeek ~250 × (2000 in + 1500 out) → cost = 250 × 2000 × $0.27/M + 250 × 1500 × $1.10/M = **$0.135 + $0.413 = $0.548**; Gemini ~80 × (2000 in + 1500 out) → cost = 80 × 2000 × $0.30/M + 80 × 1500 × $2.50/M = $0.048 + $0.300 = **$0.348**.
- Embeddings for 20% of agents running completeness_loop, ~10 chunks/agent × 10 iter × 100 agents = 10K embed calls at $0.02/M × ~500 tok each = ~$0.10.
- Retry budget: (330 paid calls × 0.05 retry rate) × $0.0036 average per call = ~$0.06.
- **Realistic total: $0.548 + $0.348 + $0.10 + $0.06 = $1.06.**
- Wall-clock: ~20–35 min driven by Ollama tail and judge serialization.

**Hard ceiling $5 — realistic use is ~21% of ceiling.** The earlier "$0.18 / 3.6% of ceiling" was the bare-case-with-undercounted-input number; the honest framing is "we expect ~$1, the ceiling protects against 5× cost spirals from retry storms or bad prompt templates."

**Retry-storm worst case:** a degraded provider drives `retry_max_attempts=3` cascade to paid tier for the affected fraction. If 30% of free-tier calls flake AND fail their retry chain into DeepSeek, that's an extra ~150 paid calls. Average DeepSeek call cost at our 2000-in / 1500-out shape = (2000 × $0.27 + 1500 × $1.10) / 1e6 = **$0.00219** per call → 150 × $0.00219 = **~$0.33**. If output ratios skew higher (e.g. completeness-loop chunks producing 2500-output retries), per-call rises to ~$0.0036 → ~$0.55. **Spiral budget: $0.30–$0.55**, taking the total to ~$1.36–$1.61 still well under $5. Above 50% cascade flake, the `failure_rate_kill: 0.30` over a 50-sample rolling window fires within ~15 sample completions (after `failure_rate_minimum_sample=20` is satisfied), bounding the spiral.

### 6.3 Under `speed-first.yaml` (revised)

**Cerebras paid Llama 3.3 70B pricing (range, not point estimate):** public 2025–2026 references for Llama 3.3 70B on Cerebras Inference cluster between $0.60–$0.85 / M input and $1.20 / M output depending on tier (standard vs Inference Pro vs negotiated). We use **$0.70 / M input, $1.20 / M output** as the spec midpoint for cost modelling, with a flagged ±20% confidence band; the actual `policy.providers[].cost_per_1k_in / cost_per_1k_out` fields are operator-set at deploy time against the contract Cerebras quotes that month. The v1 "$0.10/M flat" figure conflated the marketing tokens-per-second metric with cost — that has been corrected. Sources cited in §9 (cerebras.ai/inference-pricing snapshot 2026-05-28) carry the as-of date; if the published rack rate moves the policy file is the source of truth, not this doc.

| Brain | Assigned | Concurrent | In tokens | Out tokens | Cost |
|---|---|---|---|---|---|
| Cerebras paid (Llama 3.3 70B) | 200 | 100 | 400K | 300K | $0.34 + $0.36 = $0.70 |
| Groq paid (Llama 3.3 70B) | 150 | 100 | 300K | 225K | $0.18 + $0.18 = $0.36 |
| DeepSeek V3.2 paid | 100 | 80 | 200K | 150K | $0.054 + $0.165 = $0.219 |
| Gemini 2.5 Flash paid | 50 | 50 | 100K | 75K | $0.030 + $0.188 = $0.218 |

**Bare-case totals:**
- Cost: $0.70 + $0.36 + $0.22 + $0.22 = **$1.50** (not $0.43).
- Wall-clock: max(200/100, 150/100, 100/80, 50/50) × 8s ≈ 16s parallel block + judge serialization tail (bare-case has judge=on, patterns off); **total 3–5 min** holds.

**With patterns (realistic), 3.3× call multiplier, 8K-context check for layer-2 MoA on Cerebras paid:**
- Layer-2 MoA prompts run estimated input ≈ system 500 + prompt 2000 + 3 × prior_out 1500 = 7000 tok. Within 8K Cerebras default context, but right at the edge — `brain_router.pick_diverse(min_context=9100)` routes layer-2 to DeepSeek V3.2 (128K context) when the slot is over budget.
- Total calls: 1650.
- Cost scaled 3.3×: $1.50 × 3.3 = **$4.95**.
- Embeddings: ~$0.10.
- Retry budget: 3–5% on speed-tier × ~$0.005/call × ~50 retries = ~$0.25.
- **Realistic total: ~$5.30**, well under $50 ceiling but **10× the v1 estimate**.
- Wall-clock: ~6–10 min with judge serialization.

**The takeaway (revised):** the choice is not "free for $0 / fast for $0.43." It is:
- **Free for $0 / 25–90 min / RPD quotas spent** (first run of the day)
- **Balanced for ~$1 / 20–35 min / hard $5 ceiling**
- **Speed-first for ~$5 / 6–10 min / hard $50 ceiling**

The admin picks per job. The $5 ceiling on `balanced` exists precisely because realistic runs cost dollars, not pennies.

---

## 7. Implementation plan (primary path: LangGraph wrap)

### 7.1 Architecture

```
shay-agent-os (existing shell)
├── SwarmOrchestrator        # KEEP — top-level API surface
├── TrustMode                # KEEP — ~/.shay/trust-mode.json
├── ErrorRecovery            # KEEP — strategies + heuristics
├── GoalLoop                 # KEEP — judge-driven loop, rewired to scope budgets
├── MessageBus               # KEEP for trust state KV ONLY (Redis required —
│                              in-memory fallback is REMOVED, see §8.1 mode 6)
└── WorkerPool               # REPLACE
    └── Dispatcher (protocol)               # NEW — §7.5
        ├── LangGraphDispatcher (default)   # NEW
        └── AsyncioDispatcher (fallback)    # NEW (skeleton day-1, full impl on cut-over)
        ├── BrainRouter                      # NEW — picks provider by policy
        ├── PolicyLoader                     # NEW — version-barrier reload (§4.5)
        ├── ProviderClient (protocol)        # NEW — homegrown, NOT LangChain ChatModel
        │   ├── OllamaClient (httpx)
        │   ├── GroqClient (httpx, OpenAI-compatible)
        │   ├── CerebrasClient (httpx, OpenAI-compatible)
        │   ├── GeminiClient (httpx, native)
        │   └── OpenRouterClient (httpx, OpenAI-compatible)
        └── BudgetTracker                    # NEW — Postgres-backed (§8.2)
            ├── pre-dispatch reservation
            ├── scope reservations for patterns
            └── post-result reconciliation
```

**Why a homegrown `ProviderClient` and NOT LangChain `ChatModel`:** LangChain's `ChatModel` abstraction leaks provider-specific tool-call schemas, structured-output formats, and streaming interfaces. We have no need for those features in the dispatch hot path. Our protocol is minimal:

```python
class ProviderClient(Protocol):
    name: str
    model: str
    def run(self, prompt: str, *, scope: BudgetScope, **kwargs) -> str: ...
    def run_structured(self, prompt: str, *, schema: dict, scope: BudgetScope) -> dict: ...
    def embed(self, texts: list[str], *, scope: BudgetScope) -> list[list[float]]: ...
    def headroom(self) -> Headroom: ...  # client-tracked, not server-queried (§7.3)
```

Five files (`ollama.py`, `groq.py`, `cerebras.py`, `gemini.py`, `openrouter.py`), each ~150 lines, each backed by `httpx.AsyncClient` with provider-specific URL + auth + retry codes. Total ~750 lines for full brain coverage with **zero LangChain coupling in the hot path**. LangChain is used only inside the LangGraph graph definition itself — the nodes call our `BrainRouter`, which calls our `ProviderClient`. Swapping LangGraph for asyncio removes LangChain entirely.

### 7.2 Build order (one focused week)

**Day 1 — Policy + router scaffolding + protocol surface**
- Create `components/swarm/dispatcher.py`: `Dispatcher` protocol (§7.5). Importable by everything else.
- Create `components/swarm/policy.py`: load/validate `~/.shay/policy.yaml`; version-barrier reload (§4.5); pydantic schema.
- Create `components/swarm/brain_router.py`: `pick(complexity, role, tier, min_context) -> ProviderClient`. Token-bucket per `(provider, model)` keyed by `per_provider_caps`. Reads policy.
- Create `components/swarm/providers/`: one file per brain implementing `ProviderClient`. **Headroom tracked client-side** (§7.3) — no provider exposes a "remaining quota" endpoint reliably.
- Acceptance: `python -m components.swarm.brain_router --policy ~/.shay/policy.yaml --probe` returns *client-tracked* RPM/RPD/TPD headroom per provider, plus an "unknown" badge for any provider whose last response did not include rate-limit headers (Cerebras and Gemini do; OpenRouter and Groq partial).

**Day 2 — LangGraph dispatcher behind the protocol**
- Create `components/swarm/dispatchers/langgraph_dispatcher.py`: implements `Dispatcher` protocol. A graph with `dispatch`, `execute`, `judge`, `reduce` nodes. Postgres checkpointer (SQLite for dev, in-memory for tests).
- Wire `execute` node to call `brain_router.pick(...).run(prompt, scope=...)`.
- Checkpoint key includes `policy_version` (§4.5).
- Acceptance: `dispatcher.fan_out([task]*50)` runs 50 tasks across providers, returns 50 results, checkpoint visible in Postgres with `policy_version=N`.

**Day 3 — Shim into SwarmOrchestrator + AsyncioDispatcher stub for cut-over insurance**
- Modify `components/swarm/swarm_orchestrator.py`:
  - Replace `self.worker_pool = WorkerPool(...)` with `self.dispatcher: Dispatcher = LangGraphDispatcher(policy=self.policy)`.
  - `goal()` and `ask()` route through `self.dispatcher.fan_out`.
  - Keep `self.trust_mode.check(...)` gate in place.
  - Keep `self.error_recovery` — wire to `dispatcher.on_failure` callback.
- Create `components/swarm/dispatchers/asyncio_dispatcher.py` **stub** (~250 lines): implements `Dispatcher` protocol with semaphore-bounded `asyncio.gather` for `fan_out`, in-memory task table for `submit`/`cancel`, and a working `export_checkpoint` / `import_checkpoint` against the §7.6 JSONL contract. **Not production-grade** (no Redis Streams persistence, no crash-recovery, no parity observability) — but the contract is satisfied and the round-trip is exercised.
- Add `tests/test_dispatcher_cutover.py`: a 50-task `fan_out` runs on `LangGraphDispatcher`, exports checkpoint, imports into `AsyncioDispatcher`, completes the remaining tasks under idempotency keys. Smoke-level only; this is the "we can cut over at all" guarantee, not "we can cut over in production load."
- Acceptance: every existing `SwarmOrchestrator` test in `tests/test_swarm.py` passes against the new dispatcher with no signature change. The 50-task cut-over smoke test green. **Note:** existing `test_swarm.py` exercises the orchestrator's top-level API; Day 4 adds new tests for the parallelism behavior that the old tests do not cover.

**Day 4 — Goal loop parallelism fix + new tests**
- Modify `components/swarm/goal_loop.py:243-277`: replace sequential `wait()` with `dispatcher.fan_out(subgoals)` returning a list of results in arrival order.
- Add `tests/test_goal_loop_parallelism.py`: a goal with 5 independent subgoals completes in ~max(subgoal_latency) ± 20%, not sum.
- Acceptance: new test green; observable wall-clock reduction on a representative goal.

**Day 5 — Budget + kill switch + scope reservations**
- Create `components/swarm/budget_tracker.py`: **Postgres-backed** (`budget_state` table with `(swarm_run_id, key, cents_spent)`) using `INCRBY`-equivalent atomic upserts. NOT a JSON file (§8.1 mode 2).
- Implement `BudgetScope` reservation primitive (§5.0): `budget.reserve(pattern, n)` returns a scope object that pre-allocates `cost_reservation_per_dispatch_usd × n` from the global ceiling. Scopes release unused reservation back on completion.
- Wire `cost_ceiling_usd`, `time_ceiling_sec`, `failure_rate_kill` into `LangGraphDispatcher` as pre-dispatch checks. On breach: raise `SwarmKilledError`, mark all pending tasks cancelled, emit audit log.
- Acceptance: 500-agent run with `cost_ceiling_usd: 0.10` halts cleanly at $0.10 ±5%, with no in-flight task exceeding its reserved scope.

**Day 6-7 — Observability + admin surface**
- Add OTEL spans around every node.
- Build minimal FastAPI dashboard at `components/swarm/dashboard.py`: live RPM/RPD/TPD gauges per `(provider, model)`, current `max_concurrent`, cumulative spend, per-scope reservations, kill button, policy hot-reload trigger.
- Acceptance: dashboard at `http://localhost:8765/swarm` updates within 1s of a dispatch; reload via `POST /policy/reload` follows the §4.5 version-barrier protocol.

### 7.3 Headroom tracking (client-side)

No provider exposes a reliable "remaining quota" endpoint. Cerebras and Gemini include rate-limit headers (`x-ratelimit-remaining-requests`, `x-ratelimit-remaining-tokens`) on responses; Groq is partial; OpenRouter inconsistent. The `Headroom` object is **client-derived**:

```python
class Headroom:
    rpm_used_last_60s: int      # rolling counter on the client
    rpd_used_today: int         # midnight-reset counter, persisted to Postgres
    tpd_used_today: int         # token counter, persisted to Postgres
    server_reported: Optional[ServerHeadroom]  # from response headers if available
    confidence: float           # 1.0 if server-reported, ~0.85 if purely client-derived
```

The `--probe` CLI returns the client's view, marked with `confidence`. Brain selection uses client-derived headroom; server-reported deltas refine the client counters on every response. The headroom is **eventually consistent**, not authoritative — which is why `BudgetTracker` (§8.2) is the hard stop, not headroom.

### 7.4 Where rate-limit state lives

Per the lock-in critique: rate-limit state lives in **MessageBus Redis** (`shay:ratelimit:<provider>:<model>:rpm`, `…:rpd`, `…:tpd`), not in LangGraph checkpointed state. Token buckets use `INCRBY` + `EXPIRE`. This keeps the LangGraph checkpoint focused on task/state payload and rate-limit accounting independent of dispatcher choice — when we swap to asyncio, the rate-limit infrastructure is unchanged.

**Redis lag / partition behavior:** under a brief Redis hiccup (latency > 100ms or transient `CONNREFUSED`), the dispatcher **fails closed** — new dispatches block on `BrainRouter.pick()` until the bucket reads succeed, with an exponential backoff bounded at 5s. The token-bucket `INCRBY` is fast (microseconds in normal operation) so this rarely matters; if Redis is fully partitioned the swarm refuses to start new dispatches (consistent with §8.1 mode 6 — Redis is a hard dependency). Fail-open is explicitly **not** the policy because a bucket read failure under a rate-limit-aware free tier would burn quota with no signal.

**Postgres-vs-Redis split:**
- **Postgres (LangGraph checkpointer):** in-flight task state, graph super-step boundaries. Vendor-defined schema, ours to migrate per §7.6 on cut-over.
- **Postgres (`budget_state` table — ours):** cumulative cost. Schema is ours; no migration on cut-over.
- **Redis (MessageBus):** rate-limit token buckets, trust-mode state, scope reservations live counter. Schema is ours.
- **Filesystem (`~/.shay/trust-mode.json`, `~/.shay/policy.yaml`):** human-edited config.
- **Removed:** the in-memory MessageBus fallback at `message_bus.py:95` — Redis becomes a hard dependency for swarm operation; the swarm refuses to start without it.

### 7.5 `Dispatcher` protocol (the lock-in escape clause)

```python
# components/swarm/dispatcher.py
from typing import Protocol, Callable, Any

class BudgetScope: ...   # opaque budget reservation handle

class Dispatcher(Protocol):
    """Runtime-neutral dispatch surface. LangGraph, asyncio, and Temporal
    implementations conform. SwarmOrchestrator, patterns, GoalLoop, and
    BrainRouter import this — not the underlying runtime."""

    def fan_out(
        self,
        callable: Callable[[Any], Any],
        items: list[Any],
        *,
        scope: BudgetScope,
        on_partial: Callable[[list], None] | None = None,
    ) -> list[Any]:
        """Execute callable(item) for every item in parallel under the dispatcher's
        concurrency model. Errors in any item do not stop others; failed items
        return ItemFailure objects. Returns results in input order."""

    def submit(self, callable, payload, *, scope: BudgetScope, idempotency_key: str) -> "TaskHandle":
        """Submit a single task; return a handle to await/cancel/inspect."""

    def cancel(self, task_handle: "TaskHandle") -> None: ...

    def export_checkpoint(self, run_id: str) -> dict:
        """Export an in-flight run's state to the portable format in §7.6."""

    def import_checkpoint(self, portable_state: dict) -> str:
        """Resume a portable checkpoint exported by another Dispatcher impl."""

    def on_failure(self, handler: Callable[["TaskFailure"], None]) -> None: ...
```

**Patterns (§5) import only `Dispatcher`. Patterns do not import LangGraph `Send`, asyncio primitives, or Temporal activities.** Migration of a pattern to a new runtime is a no-op.

### 7.6 Portable checkpoint format

Cut-over from LangGraph to asyncio requires moving in-flight task state across schemas. The portable format:

```jsonl
// One JSONL file per swarm run, exported via `Dispatcher.export_checkpoint(run_id)`
{"kind": "run_header", "run_id": "swarm-2026-05-30-1234", "policy_version": 7, "started_at": 1764500000, "dispatcher_origin": "langgraph", "schema_version": 1}
{"kind": "task", "task_id": "k-ui-001", "status": "in_flight", "payload": {...}, "attempt": 1, "submitted_at": 1764500005, "idempotency_key": "k-ui-001"}
{"kind": "task", "task_id": "k-ui-002", "status": "completed", "result": "...", "tokens_in": 1850, "tokens_out": 1422, "completed_at": 1764500023}
{"kind": "scope", "scope_id": "moa-3", "pattern": "moa", "reserved_usd": 0.15, "spent_usd": 0.072, "active": true}
{"kind": "budget", "usd_spent_total": 0.41, "tokens_total": 425000}
{"kind": "kill_state", "killed": false}
```

Both `LangGraphDispatcher` and `AsyncioDispatcher` implement `export_checkpoint`/`import_checkpoint` against this format. **In-flight tasks at cut-over time are not stranded** — they re-enter the new dispatcher's queue with `status: in_flight` and the new dispatcher reruns them under the same idempotency key. Tasks marked `completed` are not re-executed. Scope reservations are recreated under the new dispatcher's `BudgetTracker`.

The schema is versioned (`schema_version`) so future formats can be migrated automatically. The export contract is part of the `Dispatcher` protocol — implementing a new dispatcher means implementing the contract.

### 7.7 Cut-over runbook

If §4.6's trigger conditions fire (LangGraph p99 super-step > 1.5× LLM call AND Postgres write IOPS > 80% sustained 10 min with N > 250):

1. Operator drains new dispatches via `shay swarm pause`. In-flight tasks continue.
2. Once in-flight count < 50, operator runs `shay dispatcher export --run-id X > /tmp/X.jsonl`.
3. Operator stops `LangGraphDispatcher`, starts `AsyncioDispatcher`. The day-3 stub satisfies the protocol and the 50-task smoke test, but production cut-over requires hardening it: Redis Streams persistence (replacing the in-memory task table), crash-recovery semantics matching LangGraph's at-least-once delivery, OTEL span parity, and load-test verification at the operator's target concurrency. Realistic engineering budget: **~two weeks of focused build**, mostly persistence layer + recovery semantics + observability parity. The §1 verdict states this cost honestly; the day-3 stub guarantees the protocol/checkpoint contract is *exercised in CI* the moment LangGraph lands, so the cut-over delta is engineering substrate, not protocol surface.
4. `shay dispatcher import /tmp/X.jsonl` — pending tasks re-queue, in-flight tasks re-execute (idempotent because of `idempotency_key`).
5. Resume dispatches via `shay swarm resume`.

The operational reality: cut-over is a planned, hour-scale event, not a hot swap. The protocol/format makes it possible; nothing makes it free.

### 7.8 Extension points

- **Add a new brain:** drop a file in `components/swarm/providers/<name>.py` implementing `ProviderClient`; reference it in `policy.yaml` under `brain.tier_definitions`. No core code change.
- **Add a new pattern:** add a method to `components/swarm/patterns.py`. `SwarmOrchestrator` exposes `swarm.pattern.map_reduce(...)`, `swarm.pattern.moa(...)`, etc. Patterns use `Dispatcher` protocol — no runtime change required.
- **Override dispatch policy per goal:** `SwarmOrchestrator.goal(description, policy_override="speed-first.yaml")` loads a per-goal policy version, version-barriered.
- **Replace LangGraph entirely:** §7.5–§7.7 specify the protocol, format, and runbook.

### 7.9 State migration plan

- `MessageBus` Redis KV stays for trust state, rate-limit buckets, scope reservations live counter. **In-memory fallback removed** (§8.1 mode 6).
- `MessageBus` pub/sub paths dropped — LangGraph checkpointer (Postgres) is the new source of truth for in-flight task state.
- Existing `~/.shay/trust-mode.json` is unchanged.
- New `~/.shay/policy.yaml` ships with `balanced.yaml` as default and `version: 1`.

---

## 8. Failure modes + kill switch

### 8.1 Top eight failure modes

| # | Mode | Mitigation |
|---|---|---|
| 1 | Free-tier RPM/RPD/TPD exhaustion mid-job (Cerebras/Groq/Gemini hit ceiling, tasks stall) | `BrainRouter` checks client-tracked headroom (§7.3) before dispatch; cascades through `fallback_chain`; final fallback is Ollama. Token-bucket in Redis (§7.4) prevents burst overruns. Daily quotas modeled honestly (§4.6) so admin sees the wall coming. |
| 2 | Cost runaway (premium tier dispatched in a loop) | `BudgetTracker` enforces `cost_ceiling_usd` as a pre-dispatch hard stop *with reservation*. `cost_reservation_per_dispatch_usd` is held against the ceiling at submit time, reconciled post-result. Pattern scopes (§5.0) further constrain so MoA cannot eat the global budget. State lives in Postgres (`budget_state` table, atomic `INCRBY`-equivalent), NOT a JSON file. |
| 3 | Judge loop fails to converge (always returns new subgoals) | `loop_until_dry` `max_turns` cap + scope reservation; returns partial result with `verdict=budget_exhausted` for the caller to handle. |
| 4 | Provider returns malformed JSON (corrupts state-reducer merge) | All structured-output parses use `run_structured` with explicit schema + JSON-mode where the provider supports it; fallback to fuzzy parse with retry. The "RATIFIED" substring brittleness in v1's pattern 5.3 is replaced with structured `{verdict: ratified|refuted, evidence: str}`. |
| 5 | LangGraph checkpointer Postgres unavailable | Dispatcher detects on startup, degrades to SQLite checkpointer with a loud warning; refuses to start if neither available. **This is not lock-in — it is a durability requirement.** The asyncio fallback dispatcher requires Redis Streams instead; the choice of persistence is per-dispatcher, but durability is non-negotiable. |
| 6 | Redis unavailable (MessageBus) | Swarm refuses to start. The v1 in-memory fallback at `message_bus.py:95` is **removed** — it was the source of the trust-state-loss bug class we are explicitly moving away from. |
| 7 | Provider injects prompt-attack content into results | `TrustMode.check()` runs on every output, not just inputs. `paranoid`/`cautious` triggers block downstream propagation. |
| 8 | Network partition between dispatcher and Postgres mid-run | LangGraph's checkpoint replay handles it on resume; the in-flight super-step is re-executed. Idempotency keys (`task_id`) prevent duplicate side effects **within our dispatcher** — provider-side dedupe is NOT assumed; only OpenAI honors idempotency keys among our providers as of 2026-05. |
| 9 | One brain returns garbage at scale (model degraded silently) | `failure_rate_kill` over a rolling window detects the spike. Window has `failure_rate_minimum_sample` floor (default 20) so a 3/3 early flake doesn't trip. Comparison is strictly `rate > failure_rate_kill` — exactly-at-threshold does **not** kill (corrects v1 off-by-one). |

### 8.2 Kill-switch implementation

The v1 version had three holes the critiques exposed: (a) post-hoc accounting let in-flight tasks blow ceiling, (b) JSON-file persistence had write contention, (c) exactly-at-threshold off-by-one. All three are fixed below.

```python
# components/swarm/kill_switch.py
import collections
import json
import os
import time
from typing import Optional

class KillSwitch:
    """Triple-gate (cost / time / failure-rate) with pre-dispatch reservation.

    State persistence is Postgres-backed via BudgetTracker, not file-based.
    Reservations protect against in-flight blow-through.
    """

    def __init__(self, policy, budget_tracker, started_at: float):
        self.policy = policy
        self.budget = budget_tracker   # Postgres-backed; atomic INCRBY-equivalent
        self.started_at = started_at
        self.failures = collections.deque(maxlen=policy.swarm.failure_rate_window)
        self.killed = False
        self.reason: Optional[str] = None

    # ---------- recording ----------
    def record_result(self, success: bool, cost_actual_usd: float, reservation_id: str):
        """Reconcile reservation against actual cost; track failure."""
        self.budget.reconcile(reservation_id, cost_actual_usd)
        self.failures.append(0 if success else 1)

    # ---------- pre-dispatch gate ----------
    def reserve_or_block(self, estimated_cost_usd: float) -> tuple[Optional[str], Optional[str]]:
        """Atomically reserve estimated_cost from the ceiling. Returns
        (reservation_id, None) on success or (None, kill_reason) on block."""
        if self.killed:
            return None, self.reason
        # Time + failure-rate gates first (cheap)
        elapsed = time.time() - self.started_at
        if self.policy.swarm.time_ceiling_sec > 0 and elapsed >= self.policy.swarm.time_ceiling_sec:
            return None, self._kill(f"time ceiling {self.policy.swarm.time_ceiling_sec}s reached")
        if (len(self.failures) >= self.policy.swarm.failure_rate_minimum_sample
                and len(self.failures) == self.failures.maxlen):
            rate = sum(self.failures) / len(self.failures)
            # STRICT inequality: exactly-at-threshold does NOT kill
            if rate > self.policy.swarm.failure_rate_kill:
                return None, self._kill(
                    f"failure rate {rate:.3f} > {self.policy.swarm.failure_rate_kill}"
                )
        # Cost reservation last (most expensive; round-trip to Postgres)
        reservation_id = self.budget.try_reserve(estimated_cost_usd)
        if reservation_id is None:
            return None, self._kill(
                f"cost ceiling ${self.policy.swarm.cost_ceiling_usd} would be exceeded "
                f"(spent ${self.budget.usd_spent:.4f} + reserved ${self.budget.usd_reserved:.4f} "
                f"+ requested ${estimated_cost_usd:.4f})"
            )
        return reservation_id, None

    # ---------- post-result gate ----------
    def check(self) -> tuple[bool, Optional[str]]:
        """Post-result check. Used to abort the run after a result arrives."""
        if self.killed:
            return True, self.reason
        # Cost: total spent + still-reserved must be under ceiling
        if (self.policy.swarm.cost_ceiling_usd > 0
                and self.budget.usd_spent + self.budget.usd_reserved >= self.policy.swarm.cost_ceiling_usd):
            return True, self._kill(
                f"cost ceiling ${self.policy.swarm.cost_ceiling_usd} reached "
                f"(spent ${self.budget.usd_spent:.4f}, reserved ${self.budget.usd_reserved:.4f})"
            )
        elapsed = time.time() - self.started_at
        if self.policy.swarm.time_ceiling_sec > 0 and elapsed >= self.policy.swarm.time_ceiling_sec:
            return True, self._kill(f"time ceiling {self.policy.swarm.time_ceiling_sec}s reached")
        if (len(self.failures) >= self.policy.swarm.failure_rate_minimum_sample
                and len(self.failures) == self.failures.maxlen):
            rate = sum(self.failures) / len(self.failures)
            if rate > self.policy.swarm.failure_rate_kill:
                return True, self._kill(
                    f"failure rate {rate:.3f} > {self.policy.swarm.failure_rate_kill}"
                )
        return False, None

    def _kill(self, reason: str) -> str:
        self.killed = True
        self.reason = reason
        # Best-effort: signal dispatcher to cancel pending, drain in-flight, audit.
        self._audit(reason)
        return reason

    def _audit(self, reason: str):
        # Audit log is append-only JSONL; guarded by the self.killed short-circuit at
        # the top of every gate, so a second call to _kill is a no-op. fsync on write
        # is cheap insurance because this fires at most once per run.
        path = os.path.expanduser("~/.shay/kill-log.jsonl")
        with open(path, "a") as f:
            f.write(json.dumps({
                "ts": time.time(),
                "reason": reason,
                "usd_spent": self.budget.usd_spent,
                "usd_reserved": self.budget.usd_reserved,
                "elapsed_sec": time.time() - self.started_at,
                "failure_count": sum(self.failures),
                "failure_window": len(self.failures),
                "failure_window_max": self.failures.maxlen,
                "policy_version": self.policy.version,
            }) + "\n")
            f.flush()
            os.fsync(f.fileno())
```

The dispatcher calls `kill_switch.reserve_or_block(estimated_cost)` **before** every dispatch (atomically holds budget against the ceiling), and `kill_switch.record_result(...)` after every result (reconciles actual cost). The `usd_reserved` running total ensures that even a long tail of in-flight tasks failing simultaneously cannot blow the ceiling — the reservation pool is already counted. On kill: cancel all pending tasks (LangGraph: cancel super-step; asyncio: cancel pending coroutines), let in-flight finish (idempotency makes re-runs safe on resume), emit final state, return `SwarmKilledError` to the caller with `kill_switch.reason`.

The dashboard exposes a manual kill button at `POST /swarm/kill`. SIGTERM to the dispatcher process triggers the same path. A killed swarm is resumable via the §7.6 portable checkpoint: the policy YAML can be edited (raise ceilings, swap brains), the kill-log inspected, and `SwarmOrchestrator.resume(run_id)` re-imports the checkpoint into either dispatcher.

---

## 9. Sources

LangGraph: https://docs.langchain.com/oss/python/langgraph , https://github.com/langchain-ai/langgraph , https://www.langchain.com/blog/langchain-langgraph-1dot0 , https://markaicode.com/langgraph-parallel-fan-out-fan-in/ , https://github.com/langchain-ai/langgraph/issues?q=checkpointer+performance
CrewAI: https://docs.crewai.com/en/concepts/crews , https://vadim.blog/crewai-unique-features
AutoGen: https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/ , https://github.com/microsoft/autogen/pulls
Temporal: https://temporal.io/blog/replay-2026-product-announcements , https://thenewstack.io/temporal-durable-execution-ai-workflows/
Inngest: https://www.inngest.com/docs/guides/concurrency
Airflow: https://www.astronomer.io/blog/state-of-airflow-2026/ , https://markaicode.com/architecture/airflow-mcp-architecture/
Ollama concurrency + VRAM: https://markaicode.com/ollama-concurrent-requests-parallel-inference/ , https://docs.ollama.com/faq , https://github.com/ollama/ollama/blob/main/docs/faq.md#how-can-i-use-ollama-with-multiple-gpus
Free-tier rate limits (RPM/RPD/TPD): https://www.aifreeapi.com/en/posts/gemini-api-free-tier-rate-limits , https://inference-docs.cerebras.ai/support/rate-limits , https://tokenmix.ai/blog/groq-free-tier-limits-2026 , https://costgoat.com/pricing/openrouter-free-models , https://docs.together.ai/docs/rate-limits , https://openrouter.ai/docs/limits
Pricing (with input/output split): https://tokenmix.ai/blog/llm-api-pricing-comparison , https://www.aipricing.guru/blog/ai-api-pricing-comparison-2026/ , https://www.cloudzero.com/blog/llm-api-pricing-comparison/ , https://cerebras.ai/inference-pricing (snapshot 2026-05-28), https://api-docs.deepseek.com/quick_start/pricing
Codex ToS: https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan
MoA + adversarial: https://arxiv.org/abs/2406.04692 , https://www.together.ai/blog/together-moa , https://github.com/togethercomputer/moa , https://arxiv.org/html/2410.04663v1 , https://arxiv.org/html/2508.02994v1
Loop patterns: https://google.github.io/adk-docs/agents/workflow-agents/loop-agents/ , https://www.alibabacloud.com/blog/from-react-to-ralph-loop-a-continuous-iteration-paradigm-for-ai-agents_602799 , https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/evaluator-reflect-refine-loop-patterns.html

---

## 10. Response to critique

This section walks through each MAJOR/blocker critique and shows exactly where it lands in the v2 spec. Minor issues are folded inline at the cited section. The five strengths flagged across all three reviews (incumbent line citations, three-policy framing, kill-switch shape, greenfield honesty, Temporal acknowledgment) are preserved verbatim.

### 10.1 Concurrency vs RPM (BLOCKER, review 1)

**Was:** "free-pool sum = 90" treated RPM as semaphore slots. **Now:** §4.6 derives sustained concurrency from `rpm × avg_latency_sec / 60` with a 20% safety margin, giving free-pool ~13 sustained. The reference policy `free-maximal.yaml` (§4.2) uses honest `concurrent` slot counts, not RPM sums. All §6 worked-example math is re-derived from these numbers.

### 10.2 Daily quota wall (BLOCKER, review 1)

**Was:** "500 agents clears in tens of minutes for free." **Now:** §4.6 explicitly enumerates RPD/TPD walls (Cerebras 1M TPD ≈ 285 calls, Gemini 250 RPD, OpenRouter 50 RPD on no-deposit path). §6.1 rewritten: first run of the day takes 25–90 min and exhausts Gemini/OpenRouter quotas; second run of the same day cascades almost entirely to Groq + Ollama and slows accordingly. The "tens of minutes" claim is gone.

### 10.3 OpenRouter 50/1000 split (MAJOR, review 1)

**Was:** "50-1000 RPD" treated as a range. **Now:** §4.1 schema has two distinct entries (`openrouter_free` at 50 RPD, `openrouter_free_credited` at 1000 RPD with `requires_deposit_usd: 10`). `free-maximal.yaml` (§4.2) uses the no-deposit version explicitly and includes a comment block clarifying that switching to the credited version requires acknowledging a $10 deposit on file. The `cost_ceiling_usd: 0.00` stance is consistent with the no-deposit version only.

### 10.4 Ollama VRAM-bound, not env-bound (MAJOR, review 1)

**Was:** "4 parallel Hermes3" treated as universal. **Now:** §2.2.1 explains the VRAM-vs-env distinction. §4.1 schema requires the `model` field on each `ollama_local` cap so the operator declares the SKU; `hermes3:8b-q4` is pinned in all three reference policies; a 70B local model entry sets `concurrent: 1`. §4.6 spells out the math.

### 10.5 LangGraph 200 vs 500 ceiling contradiction (MAJOR, review 1)

**Was:** "500-way fan-out" and "fallback at 200 sustained" in the same section. **Now:** §1 verdict says 200–500, §2.1 matrix says "200 single-node honest; 500 only with checkpointer-shard" with footnote [a], §4.6 specifies the cut-over trigger as "p99 super-step transition > 1.5× LLM call AND Postgres write IOPS > 80% sustained 10 min with N > 250." There is no contradiction: 200 is the honest single-node ceiling on our hardware; 500 is feasible with sharding/clustering; we cut over before we have to scale infrastructure.

### 10.6 Hot-reload torn-config foot-gun (MAJOR, review 1)

**Was:** "SIGHUP reload" with no atomicity story. **Now:** §4.5 specifies the version-barrier protocol. Each checkpoint is keyed by `(task_id, policy_version)`. New dispatches read the staged policy; in-flight tasks finish under the version they were submitted under. Provider model changes do not migrate checkpointed tasks unless explicitly requested via `shay policy migrate`. SIGHUP is no longer the trigger; `shay policy reload` POSTs to a versioned endpoint. Cap shrinks clamp the bucket; cap grows resize the bucket upward immediately (§4.5 step 5).

### 10.7 Budget-state file contention (MAJOR, review 1)

**Was:** `~/.shay/budget-state.json` written every tick. **Now:** §7.4 + §8.1 mode 2 + §8.2 specify `BudgetTracker` is **Postgres-backed** (`budget_state` table, atomic `INCRBY`-equivalent), not a JSON file. The only file-based persistence is the append-only `kill-log.jsonl`, written at most once per run on kill with explicit `fsync`. The MessageBus in-memory fallback that prompted the same critique is removed (§8.1 mode 6).

### 10.8 Undefined scoring rubric (MAJOR, review 1)

**Was:** "Score for Fritz's actual goals" with no weights. **Now:** §2.3 publishes the seven-dimension weighted rubric (BA 25, WK 20, AT 15, $$ 15, DR 10, OB 10, MT 5) and the full per-option scoring sheet. Temporal scores 78, LangGraph 74; the gap is explained by "calendar week one" as the load-bearing constraint. Greenfield scores 72; CrewAI 47; shay-agent-os 31. Numbers are now reproducible from the rubric.

### 10.9 Wall-clock math doesn't add (MAJOR, review 1)

**Was:** "5.5 min dispatch + 8s call → 40–50 min" with hidden assumptions. **Now:** §6.1 shows the math step-by-step under honest concurrency, **decomposed into pre-cascade (sustained 13) and tail (sustained 7) regimes**: bare-case 10–12 min, realistic-with-patterns ~40–45 min for a first-of-day run, 40–90 min worst-case. The long tail is attributed to Ollama queue depth. The cost of retries is computed against actual concurrency. Cold-start surcharge is named separately and mitigated by mandatory connection pooling.

### 10.10 Brain-agnostic claim contradicted by LangGraph coupling (BLOCKER, review 2)

**Was:** dispatcher named after the vendor; checkpointer = "source of truth"; no swap contract. **Now:** §7.5 defines the `Dispatcher` protocol that `SwarmOrchestrator`, patterns, `GoalLoop`, and `BrainRouter` import. §7.6 specifies the portable checkpoint JSONL format with `schema_version` and `dispatcher_origin`. §7.7 is the cut-over runbook (drain, export, swap, import, resume). The protocol surface is engineered week one; the substrate hardening is the ~two-week cost named explicitly in §1 verdict caveat 3 and §7.7 step 3.

### 10.11 Patterns hardcode `Send` (MAJOR, review 2)

**Was:** pattern 5.1 imported LangGraph `Send` by name. **Now:** §5.0 explains the wiring — every pattern calls `Dispatcher.fan_out(callable, items, scope=...)`. The LangGraph adapter translates to `Send`; the asyncio adapter to `gather` under semaphore; the (future) Temporal adapter to activities. **Patterns import only the protocol.** Migrating off LangGraph does not require pattern rewrites.

### 10.12 Resume tied to LangGraph format (MAJOR, review 2)

**Was:** `SwarmOrchestrator.resume(job_id)` was vendor-defined. **Now:** §8.2 says resume re-imports the §7.6 portable checkpoint into either dispatcher. Both implementations conform to `export_checkpoint`/`import_checkpoint`. Resume is no longer LangGraph-specific.

### 10.13 LangChain ChatModel coupling (MAJOR, review 2)

**Was:** v1 simultaneously claimed "LangChain LLM abstraction" and "raw HTTP at any time." **Now:** §7.1 explicitly states LangChain `ChatModel` is **not** in the dispatch hot path. The homegrown `ProviderClient` protocol is the contract; five httpx-backed clients implement it. LangChain only appears inside the LangGraph graph definition itself, and the nodes there call our `BrainRouter` → our `ProviderClient`. Swapping LangGraph removes LangChain entirely. The matrix row for brain-agnosticism is now "PARTIAL" with footnote [c] explaining the distinction.

### 10.14 Matrix YES/NO oversells LangGraph (MAJOR, review 2)

**Was:** binary YES on brain-agnosticism. **Now:** §2.1 matrix uses PARTIAL with footnotes. The new "Vendor lock-in surface" row gives LangGraph "HIGH if patterns use `Send` natively; LOW if behind `Dispatcher` protocol" — the lock-in posture is contingent on our discipline, and the spec enforces the discipline via §7.5.

### 10.15 Rate-limit state lives where? (MAJOR, review 2)

**Was:** v1 left this unspecified. **Now:** §7.4 places rate-limit token buckets in MessageBus Redis (`shay:ratelimit:<provider>:<model>:rpm` etc.), specifically **outside** LangGraph checkpoint state. The cut-over does not migrate rate-limit state because it is dispatcher-independent. Redis lag / partition behavior is fail-closed with bounded backoff (§7.4).

### 10.16 Scoring justifies LangGraph over Temporal without showing weights (MAJOR, review 2)

**Was:** opaque numbers. **Now:** §2.3 shows the rubric. Temporal beats LangGraph 78 to 74 on the rubric; we explicitly pick LangGraph because "calendar week one" is the single weighted dimension Fritz named first. Temporal is identified as the graduation path. The argument is no longer hidden.

### 10.17 Cost math omits input on Gemini, off ~2.6× on DeepSeek output (MAJOR, review 3)

**Was:** v1 cost math used the wrong DeepSeek output ($0.42/M instead of $1.10/M) and skipped Gemini input. **Now:** §6.2 uses measured 2026-05 pricing in a published table (DeepSeek $0.27 in / $1.10 out; Gemini $0.30 in / $2.50 out; OpenAI embed $0.02 in). The bare-case balanced cost is $0.27, the realistic-with-patterns case is $1.06, both 5–10× higher than v1's $0.18. The $5 ceiling is now defended as protection against retry-spiral, not as "100× the expected cost." Cerebras paid pricing is presented as a $0.60–$0.85 range with $0.70 midpoint per §6.3, not a point estimate.

### 10.18 Patterns inflate per-agent token spend 2–5× (MAJOR, review 3) — and the §6 / §4.1 reconciliation

**Was:** §6 used 1 round-trip / agent. **Now:** §6.1, §6.2, §6.3 each have **two sub-rows** — bare-case and realistic-with-patterns — using a 3.3× call multiplier (1× executor + 1× judge across 100% + adversarial+completeness on 20% with 8.5× weighting). All totals are recomputed. The pattern budget block in §4.1 + scope reservations in §5.0 make per-pattern overhead admin-tunable.

**The 3.3× / 4.1 cost_multiplier reconciliation (R2 round 2 MAJOR):** these are NOT two independent axes. §4.1's `pattern_budgets[name].cost_multiplier` (e.g. MoA = 3.0, adversarial_verify = 2.5, completeness_loop = 4.0) is the **per-pattern** scope-reservation factor the dispatcher uses to size that pattern's local budget. §6's **3.3×** is the **job-aggregate** multiplier derived by weighting those per-pattern multipliers by the *fraction of agents that hit each pattern* (here: 100% judge, 20% verify, 20% completeness → weighted avg 3.3×). The §6 derivation in §6.1 explicitly shows the arithmetic: `2.0 × 0.8 + 8.5 × 0.2 = 3.3`. They are the same numbers seen from two ends — per-pattern budget at dispatch time, job-aggregate multiplier at planning time. A pattern is never billed twice; the §4.1 reservation debits against the same scope §6 estimates from. If an operator changes the agent-pattern coverage (e.g. MoA on 50% instead of 20%), the §6 aggregate recomputes from the §4.1 multipliers — the spec ships a tiny `policy_cost_model.py` helper that does this so the two views never drift in practice.

### 10.19 Retry budget double-counted as cheap (MAJOR, review 3)

**Was:** "50–75 retries at $0." **Now:** §4.1 adds `retry_budget_per_task_usd` (default $0.05 on balanced; $0.20 on speed-first; $0.00 on free-maximal so any paid cascade is itself a kill condition). §6.2 explicitly computes retry-storm worst-case ($0.30–$0.55 extra at 30% cascade flake, derived step-by-step) and shows the `failure_rate_kill: 0.30` bounds the spiral within ~15 samples after the minimum-sample floor.

### 10.20 Cold-start cost invisible (MAJOR, review 3)

**Was:** wall-clock assumed warm everything. **Now:** §6.1 adds the cold-start surcharge (30–90s for Ollama load, 2–5s per fresh provider connection × 500) and identifies connection pooling as a mandatory mitigation (implemented in `ProviderClient` with `httpx.AsyncClient` pool size = `concurrent × 2`). The minute-level wall-clocks now stand because the cold-start tax is named and engineered against.

### 10.21 Embedding regeneration cost absent (MAJOR, review 3)

**Was:** completeness loop's embedding cost ignored. **Now:** §4.1 `pattern_budgets.completeness_loop.embedding_provider` makes embedding choice admin-tunable. §5.4 pseudocode shows explicit embed-and-cover-score steps. §6.2 budgets ~$0.10 for 10K embedding calls. The embedding provider has its own entry in `per_provider_caps` so RPM is tracked.

### 10.22 Error-loop spirals before `failure_rate_kill` window fills (MAJOR, review 3)

**Was:** rolling window could drain ceiling before tripping. **Now:** §4.1 adds `failure_rate_minimum_sample` (default 20); the kill condition does not fire until the window is at least this full. §8.2 implements this as a guard in both `reserve_or_block` and `check`. The combination of `cost_reservation_per_dispatch_usd` (pre-dispatch budget hold) + `failure_rate_minimum_sample` (minimum signal) prevents the spiral from blowing through before either gate is meaningful.

### 10.23 Minor issues folded in

- Provider rate caps are `(provider, model)`-keyed tuples (§4.1) — review 3 minor 1.
- Token-bucket impl lives in Redis (§7.4); kill switch references it via `BudgetTracker` not by reimplementing it — review 3 minor 2.
- `free-maximal`'s `cost_ceiling_usd: 0.00` is consistent with the no-deposit OpenRouter SKU and `retry_budget_per_task_usd: 0.00` ensures any paid cascade is itself a kill (§4.2) — review 3 minor 3.
- Cerebras paid pricing is asymmetric and shown as a range with confidence band in §6.3 — review 3 minor 4 + R2-A MAJOR 2.
- Postgres write amplification at 500 fan-out is the cut-over trigger (§4.6, §7.7) — review 3 minor 5.
- BudgetTracker is Postgres-backed, no JSON fsync hot path (§7.4, §8.2) — review 3 minor 6 + review 1 budget-state.
- Off-by-one fixed: strict `>` not `>=` in §8.2 — review 1 minor 7.
- `--probe` returns *client-tracked* headroom with confidence stamp (§7.3) — review 1 minor 8.
- AutoGen characterized as "stable, not growing" with active PRs, not "maintenance mode" (§2.2.4) — review 1 minor 1, review 2 minor 3.
- MessageBus in-memory fallback is removed (§7.4, §8.1 mode 6) — review 1 minor 3.
- §6.1 labels "Assigned (queued)" vs "Concurrent" — review 2 minor 1.
- Free-maximal cost table shows TPD/RPD overflow paths explicitly (§4.6, §6.1) — review 2 minor 2.
- Adversarial verify uses structured output, not substring (§5.3) — review 2 minor 4.
- Day 4 acceptance adds new tests beyond `test_swarm.py` (§7.2) — review 2 minor 5.
- §8.1 mode 5 reframed as durability requirement, not lock-in (§8.1 mode 5) — review 2 minor 6.
- Pattern budgets wired to policy via `pattern_budgets` block and scope reservations (§4.1, §5.0) — review 2 minor 7.
- MoA layer-2 input fit against Cerebras 8K context handled by `min_context` routing in `pick_diverse` (§5.2) — review 1 minor 5.
- Idempotency key scope clarified as dispatcher-internal, provider-side dedupe not assumed (§4.1, §8.1 mode 8) — review 1 minor 6.
- §6.1 cascade allocation reconciled: ~165 agents cascade total, essentially all to Groq with ~30–50 hitting Ollama on bucket saturation — R2-B minor 3.
- §4.6 Ollama row footnote: 20% safety margin does not apply to VRAM-bound rows — R2-A minor 4 + R2-B minor 4.
- §6.3 bare-case "tail" phrasing tightened to "judge serialization tail" since bare-case has patterns off — R2-B minor 1.
- §6.2 spiral worst-case rewritten with step-by-step DeepSeek per-call cost and output-ratio sensitivity — R2-A minor 4 + R2-B minor 2.
- §4.5 step 5 hot-reload distinguishes shrinks (clamp) from grows (immediate availability) — R2-A minor 3.
- §8.2 audit-log comment tightened to reference the `self.killed` short-circuit; explicit `os.fsync()` added — R2-A minor 5 + R2-B minor 7.
- §7.4 Redis lag / partition behavior named as fail-closed with bounded backoff — R2-A minor 6.
- §2.1 matrix LangGraph concurrency row split into "200 single-node honest; 500 only with checkpointer-shard" — R2-A minor 7.
- §6.2 embedding line: clarified default `gemini_embed_001` matches §4.1 default; OpenAI text-embedding-3-small kept in §6.2 pricing table as reference because operators frequently substitute it — R2-B minor 5.

### 10.24 What the v2 spec does NOT change

The five strengths consistently called out by the reviews remain load-bearing:

- **Incumbent critique line citations** (`worker_pool.py:27`, `worker_pool.py:78-82`, `goal_loop.py:265-277`, `message_bus.py:95`) — verified against the actual files, kept verbatim.
- **Three-policy framing** (free-maximal / balanced / speed-first) — the framing is right; only the numbers underneath needed honest math.
- **Kill-switch shape (cost + time + failure-rate triple gate)** — kept, with the in-flight, file-contention, and off-by-one holes closed.
- **Greenfield as an engineered escape hatch** — kept, with the protocol/contract layer in place week one and the substrate-build cost honestly named as two weeks at cut-over time.
- **Temporal as the graduation path, not the v1 answer** — kept, with the rubric now showing why.

The verdict — LangGraph behind a `Dispatcher` protocol, with the policy/trust/judge layer preserved and a real cut-over contract to greenfield — is unchanged. What changed is that every numeric claim, every coupling claim, and every "the patterns are agnostic" claim is now defensible against the line of attack each reviewer brought. If a fifth review wants to attack v2, it should be attacking new claims, not the same ten.

---

## Critique trail

### Round 1 (three reviewers, v1 → v2 first revision)

**Reviewer 1** (verdict: revise) raised 9 MAJORs/blockers focused on the numbers underneath the spec: concurrency-vs-RPM math (free-pool "90" was nonsense; honest sustained ≈ 13), daily-quota walls (RPD/TPD enumerated per provider), OpenRouter 50/1000 split as two distinct entries, Ollama VRAM-bound (not env-bound) requiring a `model` field, LangGraph 200-vs-500 contradiction needing a cut-over trigger, hot-reload SIGHUP foot-gun replaced by version-barrier protocol, BudgetTracker moved off JSON files onto Postgres `INCRBY`-equivalent, scoring rubric published with weights and per-option sheet, and wall-clock math redone with cold-start surcharge.

**Reviewer 2** (verdict: blocker) attacked the "brain-agnostic" claim as contradicted by LangGraph coupling at every layer. Required a `Dispatcher` protocol (§7.5), a portable JSONL checkpoint contract (§7.6), a cut-over runbook (§7.7), patterns wiring through `Dispatcher.fan_out` instead of LangGraph `Send` (§5.0), homegrown `ProviderClient` protocol with LangChain `ChatModel` removed from the hot path (§7.1), rate-limit state living outside checkpoint state in Redis (§7.4), resume re-importing the portable checkpoint into either dispatcher (§8.2), matrix using PARTIAL with footnotes instead of YES/NO over-selling, and the Temporal-beats-LangGraph-on-rubric-but-LangGraph-picked-for-week-one tension named rather than hidden.

**Reviewer 3** (verdict: revise) attacked the cost math: v1 omitted Gemini input pricing and used the wrong DeepSeek output ($0.42/M vs measured $1.10/M); patterns inflated per-agent token spend 2–5× and v1 ignored it; retry budget double-counted as cheap; cold-start cost invisible; embedding regeneration cost absent; error-loop could spiral before `failure_rate_kill` window fills. v2 added input/output split pricing (§6.2), 3.3× call multiplier with bare-case + realistic-with-patterns sub-rows for all three policies, `retry_budget_per_task_usd` per policy, cold-start surcharge with mandatory connection pooling, embedding budget line, `failure_rate_minimum_sample` floor + `cost_reservation_per_dispatch_usd` pre-dispatch hold to close the spiral-before-window-fills gap.

### Round 2 (two reviewers, v2 first revision → v2 final)

**Reviewer A** (verdict: revise-minor) raised 4 MAJORs against the v2 first revision: (1) free-pool sustained concurrency derivation inconsistent with §6.1 worked example — fixed by decomposing wall-clock into front-of-run (sustained 13) and tail (sustained 7) regimes with the §4.6 formula applied within each; (2) Cerebras paid pricing $0.85/$1.20 asserted not sourced — fixed by reframing as a $0.60–$0.85 range with $0.70 midpoint, ±20% confidence band, source page snapshot dated 2026-05-28, and operator-set per-deploy contract; (3) 3.3× call multiplier double-counted with §4.1 `cost_multiplier` — fixed by §10.18 reconciliation showing per-pattern reservation (§4.1) and job-aggregate multiplier (§6) are the same numbers viewed from two ends, with a `policy_cost_model.py` helper keeping them in sync; (4) AsyncioDispatcher cut-over claim credible only if a real stub ships day-one — fixed by moving the stub to Day 3 with a 50-task smoke test, naming the production hardening as "~two weeks of focused build" explicitly in both §1 verdict and §7.7 step 3. Plus 7 minor issues folded inline (matrix optical contradiction split into "200 single-node honest; 500 only with checkpointer-shard", spiral worst-case math shown step-by-step, cascade allocation reconciled, Ollama row footnote on 20%-safety inapplicability, audit-fsync clarification, Redis-lag behavior named, hot-reload shrink-vs-grow distinction).

**Reviewer B** (verdict: ship) confirmed every cost claim reconstructs from the published per-provider input/output split (within rounding), the §4.6 concurrency derivation produces the claimed free-pool 13 and §6.1's 308s / 31min figures verify exactly, daily-quota walls propagate consistently bare→realistic, OpenRouter 50/1000 split handled as two distinct provider entries with $10 deposit obligation explicit, Ollama VRAM-bound cap enforced by required `model:` field, kill-switch fix is real (strict `>` + minimum-sample floor + pre-dispatch reservation closing all three v1 holes), and §7.5–§7.7 make "brain-agnostic" / "escape hatch" claims operationally concrete rather than rhetorical. Raised 7 minor issues, all folded inline at the cited section (bare-case "tail from completeness loops" phrasing tightened to "judge serialization tail"; spiral worst-case math rewritten to show $0.30–$0.55 range with intermediate steps; §4.6 cascade allocation reconciled between "~115" and "~50–100" by attributing essentially the entire post-quota cascade to Groq with ~30–50 to Ollama on bucket-saturation; §4.6 Ollama row marked with safety-margin-inapplicable footnote; embedding price/provider note kept consistent; audit-write ordering comment tightened with explicit `os.fsync`).

### Final outcome

Round 2 verdicts: one **ship**, one **revise-minor**. Per the workflow, the four R2-A MAJORs were tightened (decomposed regimes, sourced pricing range, reconciliation paragraph, Day-3 stub with smoke test) and the minor issues from both R2 reviewers were folded inline. No new MAJORs introduced. v2 is the shippable spec; the §10 line-by-line and this critique trail let any future reviewer see exactly which line of attack each section answers.