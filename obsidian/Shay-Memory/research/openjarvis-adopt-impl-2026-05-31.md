---
title: openjarvis-adopt-impl-2026-05-31
type: note
permalink: shay-memory/research/openjarvis-adopt-impl-2026-05-31
---

# OpenJarvis ADOPT-NOW implementation — Shay-Shay

> Date: 2026-05-31
> Both features are CLEAN-ROOM (no OpenJarvis code copied; Apache-2.0 but stack
> mismatch). Built on Shay-Shay's existing usage-accounting + curator subsystems.
> Constraint honored: no edits to `~/.shay/config.yaml`, gateway not touched.

---

## Feature 1 — $/energy + cost telemetry as a routing metric

### What already existed (reused, not rebuilt)
- `agent/usage_pricing.py` — `normalize_usage()`, `estimate_usage_cost()`,
  `get_pricing_entry()` (official-docs snapshot + provider models-API pricing).
- `run_agent.py` (~line 13015) — already persists per-call estimated cost +
  token deltas into the `sessions` table (`estimated_cost_usd`,
  `billing_provider`, `model`, token columns).
- `agent/insights.py` `InsightsEngine` — already does per-model cost breakdown.

### What was added
- **NEW FILE `agent/cost_telemetry.py`**:
  - `energy_weight(model, provider, base_url, api_key)` — coarse relative
    energy weight (1.0 = average) derived from the model's blended $/1k-token
    rate as a proxy (no hosted-GPU wattmeter available). Light models < 1.0,
    heavy > 1.0, clamped to [0.25, 4.0]. Local/unknown routes → neutral 1.0.
  - `request_cost(model, usage, ...)` → `RequestCost` (cost + energy in one).
  - `daily_cost_summary(db, days)` — rolling daily $ spend grouped by day,
    model, and provider, read from the session DB. The queryable summary.
  - `cost_routing_score(model, *, quality_score, ..., config)` — OPTIONAL
    routing scorer: `quality_score / energy_weight`. **Gated OFF by default**
    via `routing.cost_aware` (default False) — returns `quality_score`
    unchanged until opted in. Inert hook; nothing calls it to mutate routing.
  - `budget_status(db, config)` / `get_daily_budget_usd()` — low-funds signal:
    today's spend vs a soft `routing.daily_budget_usd` (default 0 = disabled).
    This is the number the existing low-funds notification surface can consume.
- **`agent/insights.py`** — `InsightsEngine.generate()` now includes a
  `cost_telemetry` section (new `_compute_cost_telemetry()` delegating to
  `daily_cost_summary`). Best-effort; never breaks `/insights`.

---

## Feature 2 — trace-driven (metric-grounded) Curator

### What already existed (reused)
- `agent/curator.py` `run_curator_review()` builds a candidate list via
  `_render_candidate_list()` that already shows `use/view/patches/activity/
  last_activity` per skill and injects it into `CURATOR_REVIEW_PROMPT`.
- `tools/skill_usage.agent_created_report()` — lifecycle counters.
- `InsightsEngine.skills.top_skills` — windowed per-skill load/edit counts.

### What was added (all in `agent/curator.py`, additive)
- `is_trace_grounded()` — reads `curator.trace_grounded` (default False).
- `CURATOR_TRACE_GROUNDING_PREAMBLE` — preamble that teaches the LLM how to
  read the measured-evidence columns and explicitly keeps the existing
  umbrella-consolidation rules (e.g. "use=0 is absence of evidence, not a
  reason to prune").
- `_trace_evidence_by_skill(days=30)` — pulls windowed `win_loads` / `win_edits`
  from `InsightsEngine` and a coarse per-skill `win_cost` (skill's share of
  window skill-actions × window total spend from Feature 1's
  `daily_cost_summary`). Best-effort; failures fall back to counters-only.
- `_render_candidate_list(trace_grounded=False)` — when True, appends
  `win_loads / win_edits / win_cost` columns to each row (base columns
  unchanged; backward compatible when off).
- `_llm_pass()` — when `trace_grounded`, prepends the preamble to
  `CURATOR_REVIEW_PROMPT` and renders the trace-augmented candidate list.
  When off, behavior is byte-identical to before.

---

## New config keys (SAFE DEFAULTS, added to `DEFAULT_CONFIG` in `shay_cli/config.py`)

| Key | Default | Effect |
|---|---|---|
| `routing.cost_aware` | `False` | When True, `cost_routing_score()` is active. Off = no routing change. |
| `routing.daily_budget_usd` | `0` | `0` disables the low-funds/budget signal; > 0 enables `budget_status()`. |
| `curator.trace_grounded` | `False` | When True, curator review receives trace evidence. Off = unchanged review. |

No `~/.shay/config.yaml` was edited. The runtime deep-merge in `load_config()`
supplies these defaults at read time; the operator can persist/edit them later.

---

## Files changed
- `agent/cost_telemetry.py` — NEW.
- `agent/insights.py` — added `cost_telemetry` section to `generate()`.
- `agent/curator.py` — trace-grounded review (gate, preamble, evidence builder,
  candidate-list arg, prompt assembly).
- `shay_cli/config.py` — `routing.*` and `curator.trace_grounded` defaults.
- `tests/agent/test_cost_telemetry.py` — NEW (16 tests).
- `tests/agent/test_curator_trace_grounded.py` — NEW (8 tests).

## Test results
- `tests/agent/test_cost_telemetry.py` + `tests/agent/test_curator_trace_grounded.py`
  — **22 passed**.
- Regression: `test_curator.py` + `test_insights.py` + `test_curator_run.py`
  — **108 passed**.
- Broader `tests/shay_cli -k config` — 531 passed, 1 failed
  (`test_skin_engine.py::test_get_color_with_fallback` — PRE-EXISTING, unrelated
  color-skin assertion; confirmed failing with my changes stashed).

## What the operator must flip ON post-restart (one restart picks up code)
All three are opt-in; nothing changes until set in `~/.shay/config.yaml`:
1. `routing.cost_aware: true` — to let a router consult `cost_routing_score()`.
   (Note: the scorer is exposed but not yet wired into a live router call site —
   it is an available signal, per the task. Wiring it into provider selection
   is a follow-up.)
2. `routing.daily_budget_usd: <N>` — to arm the low-funds/budget signal.
3. `curator.trace_grounded: true` — to feed the curator measured trace evidence.

## Known gaps / follow-ups
- `cost_routing_score()` is an available, tested scoring hook but is not yet
  called from the provider-selection path (left inert by design; wiring it is
  a deliberate operator-gated follow-up).
- `win_cost` is a proportional estimate (no per-skill billing exists); flagged
  as coarse in the prompt with `?` when the route has no known pricing.
- `energy_weight` is a $-derived proxy; real hosted-GPU watt data is not
  available, so local models get a neutral (not zero) weight.
