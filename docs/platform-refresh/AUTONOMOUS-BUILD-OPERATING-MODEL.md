# Autonomous Build Operating Model

**Parent:** `STUDIO-PLATFORM-REFRESH-V2.md`
**Status (locked):** Long-running autonomous builds are **core architecture** in Platform Refresh v2, not a side feature.
**Proof:** the MBSH P0 → P13 + audit + Final Reel hotfix arc, ~24 hours of guarded-autonomous agent work that produced a production launch.

---

## 1. The thesis

FAMtastic's leverage is one operator running many sites. The way that operator wins is by **letting agents carry long objectives** while staying inside guardrails the operator authored. This document defines those guardrails as the **Autonomous Build Operating Model**.

The model is not new — MBSH already ran on it. This doc names every load-bearing piece of that run so the next site (shipping company test, MBSH V2 iteration, anything) inherits it without re-discovery.

---

## 2. The contract: every autonomous build declares these nine things

A build is autonomous-ready only when its kickoff packet contains all nine. The packet is a JSON/YAML object stored in `plans/<plan-id>/run-contract.json` and referenced from the plan registry.

```yaml
run_contract:
  # 1. Scoped objective — what changes in the world after this run
  objective: "Premiere theme experience with character integration, ship to mbsh96reunion.com"
  scope_in:
    - "Visual + interaction layer"
    - "Section archetypes, components, character placement"
    - "Asset generation + alpha cleanup"
    - "Form + footer + chevron behavior"
  scope_out:
    - "Backend endpoints (already shipped)"
    - "Custom domain DNS (Fritz-only)"
    - "Payment processing (decision deferred)"

  # 2. Branch isolation — where the work happens
  branch:
    base: "staging"
    work: "feat/premiere-theme"
    merge_target: "staging then main"

  # 3. Assigned agent — who runs it (and which surface)
  assigned_agent:
    surface: "claude-code"
    runner: "Claude"
    reviewer: "Fritz on phone walks"
    coordinator: "AGENT-COORDINATION.md scope-lock claim"

  # 4. Expected outputs — what proof the run must produce
  expected_outputs:
    - "Working staging deploy"
    - "Pass closeout per pass at docs/sites/<site>/closeouts/PASS-N-CLOSEOUT.md"
    - "RUN-STATE.md updated each pass"
    - "DECISION-LOG.md appended for every R-numbered decision"
    - "COVERAGE-MATRIX.md updated"
    - "V2-LEARNINGS-AND-PATTERNS.md at run-end"

  # 5. Stop conditions — when the run halts
  stop_conditions:
    hard:
      - production_deploy
      - dns_or_domain_change
      - payment_or_auth_change
      - secret_bearing_config_change
      - destructive_file_delete
      - parallel_write_scope_conflict
      - expensive_media_or_api_generation       # over threshold
    soft:
      - explicit_fritz_pause
      - failed_proof_checkpoint
      - capability_unavailable_no_fallback
      - cost_threshold_warning
      - smoke_test_red_below_threshold

  # 6. Required proof checkpoints — where the agent must pause and verify
  proof_checkpoints:
    - "P0 baseline commit + smoke before any P1 change"
    - "Per-pass DOM probe + screenshot proof in /proofs/"
    - "Per-pass closeout document"
    - "Pre-staging-deploy fingerprint verify (curl markers)"
    - "Pre-production smoke checklist (12 items)"

  # 7. Status update cadence — how often the agent reports
  cadence:
    pass_complete: "closeout + RUN-STATE update + push to staging"
    fritz_review_window: "after every staging push"
    silent_run_max: "one full pass (no silent multi-pass auto-merge)"

  # 8. Cost / usage guardrails — when the agent must ask
  cost_guardrails:
    media_generation_per_run: { soft: $5, hard: $15 }
    video_generation_per_run: { soft: $10, hard: $25 }
    cumulative_run_cap:       { soft: $25, hard: $50 }
    netlify_build_minutes:    { soft: 60, hard: 120 }
    on_breach: "create approval in Approval Center; pause"

  # 9. Final handoff report — what closes the run
  handoff_report:
    sections:
      - "Production URL + commit deployed"
      - "Smoke results"
      - "Rollback point + recipe"
      - "Remaining post-launch backlog"
      - "Learnings extracted into V2 doc"
    delivered_at: "after production smoke"
```

If any of the nine fields is missing, the build is **not autonomous-ready** — it goes through a manual-mode plan instead.

---

## 3. The MBSH proof of each contract field

Every field above corresponds to something MBSH actually did.

| Field | MBSH evidence |
|---|---|
| Objective | "Premiere theme experience" stated in `MBSH-PREMIERE-BUILD-LEDGER.md` |
| Branch isolation | `feat/premiere-theme` → `staging` → `main` |
| Assigned agent | Claude Code session, AGENT-COORDINATION.md scope lock |
| Expected outputs | Pass closeouts P0–P13, audit doc, V2 doc, run-state, decision log |
| Stop conditions (hard) | Held: production deploy paused for explicit Fritz approval at P7 staging and again at P13 |
| Stop conditions (soft) | Triggered: P1 paused for Fritz on D4/D5/D8; Gemini key expired pause; Netlify build credit pause |
| Proof checkpoints | Pre-P0 baseline `1386d17`; per-pass commits; pre-prod smoke; production smoke |
| Cadence | One pass = one closeout + push; Fritz reviewed each on phone |
| Cost guardrails | Implicit, not enforced. Only failure: Netlify build-credit silent skip burned six pushes before detection. **This is the gap Platform Refresh v2 closes.** |
| Handoff report | Production launch report |

The model worked. The only field MBSH did not enforce was cost guardrails — that's the one Platform Refresh v2 hardens.

---

## 4. Pause classes (what makes the agent stop)

Three classes, each with a different recovery path.

### 4.1 Hard stops (always pause; require Fritz)

The seven `hard_stop_conditions` from `plans/registry.json`:

1. `production_deploy`
2. `dns_or_domain_change`
3. `payment_or_auth_change`
4. `secret_bearing_config_change`
5. `destructive_file_delete`
6. `parallel_write_scope_conflict`
7. `expensive_media_or_api_generation` (over threshold)

When triggered: agent creates an Approval Center item, writes a pause note to RUN-STATE, and stops. Fritz unblocks via Approval Center.

### 4.2 Soft stops (pause; agent may proceed with annotation)

- **Explicit Fritz pause** (in chat or note)
- **Failed proof checkpoint** (smoke red, screenshot fails, fingerprint missing)
- **Capability unavailable + no fallback** (e.g., Gemini key expired and there is no alternate route)
- **Cost threshold warning** (soft cost guardrail breached)
- **Smoke test red below threshold**

When triggered: agent surfaces the issue with a recommended fix, waits for Fritz unless an explicit "auto-recover" rule applies, then either resumes or escalates to hard stop.

### 4.3 Coordination pauses (pause; agent may continue after coordination)

- **Scope-lock conflict** with another agent's branch (per `AGENT-COORDINATION.md`)
- **Plan supersession** in flight
- **Capability registry change** mid-run

When triggered: agent runs `node scripts/agent-checkin.js`, reads the conflicting branch, either negotiates the merge or picks a different scope.

---

## 5. The autonomy ladder

Not every build runs at the same autonomy level. Five named modes:

| Mode | Description | When to use | MBSH analogue |
|---|---|---|---|
| `manual` | Fritz pairs with the agent, every change reviewed | First-of-its-kind work; high stakes | The initial design map authoring (P-1 / V2 / V3 plan) |
| `assisted` | Agent proposes, Fritz approves each batch | Brand-defining or destructive moments | The brand foil, character canon decisions |
| `guarded-autonomous` | Agent runs with checkpoints; pauses on hard stops + soft stops; resumes after Fritz acks | The default for most builds | **MBSH P0 → P7** |
| `guarded-autonomous-to-completion` | Same as above, but agent runs through to *staging* without per-pass acks; only pauses on hard stops, soft stops, or end-of-arc | Sites following an established pattern | **MBSH P8 → P13** |
| `cost-bounded-batch` | Agent runs many small jobs in parallel, capped by cost; results queue for review | Asset generation, batch competitor scans | The 21-asset P3 generation |

Every plan declares its initial mode. Mode can be raised mid-run (Fritz: "ok, run to completion") but cannot drop without an explicit pause.

---

## 6. Proof checkpoints — what counts as proof

Proof is the heart of the model. An autonomous run that produces no proof is not running guarded; it's running blind.

Five proof types, all required at the moments specified:

| Type | What it is | When required |
|---|---|---|
| **Commit fingerprint** | git SHA + diff stats + commit message | Every pass |
| **DOM probe** | `preview_eval` JSON of relevant selectors and computed styles | Every pass that changes UI |
| **Screenshot** | mobile + desktop, saved under `/proofs/<site>/<pass>/...` | Every pass that changes UI |
| **Smoke checklist** | a 1–N item list curl/probe verification | Pre-staging-push, pre-production-merge |
| **Closeout document** | what landed · why · what's deferred · what's next | End of every pass |

If any one of these is missing for a pass, the pass is **not closed** and the run cannot advance.

---

## 7. The resume contract

A run may pause at any time. When it resumes (in the same chat, a fresh chat, or after a context reset), the agent reads:

1. `plans/<plan-id>/run-contract.json` — the nine fields
2. `docs/sites/<site>/RUN-STATE.md` — last heartbeat, current pass, next action
3. `docs/sites/<site>/closeouts/PASS-N-CLOSEOUT.md` — last completed pass
4. `docs/sites/<site>/DECISION-LOG.md` — rolling decisions
5. `docs/sites/<site>/COVERAGE-MATRIX.md` — what's done vs deferred

If those five reads cannot reconstruct the run state, the run is unsafe to resume — the agent escalates to manual mode and asks Fritz.

The MBSH `RUN-STATE.md` includes an explicit *Resume contract* section. This is the canonical pattern. Every site's run-state inherits it.

---

## 8. Cost / usage guardrails (handoff to API-COST-USAGE-GOVERNANCE.md)

Cost is its own deliverable. The summary here:

- Agents must consult Capability Truth Layer **before** invoking any provider that the manifest tags `costly` or `approval_required`.
- A pre-flight cost estimate is required for media/video/long-context generation.
- A running cost meter is appended to the run state on every provider call.
- Soft thresholds warn; hard thresholds pause and create an Approval Center item.
- Monthly cost budget rolls up across all runs.

Detail: see `API-COST-USAGE-GOVERNANCE.md`.

---

## 9. Dangerous-action gates

Some actions cannot be auto-allowed regardless of mode. They always require Fritz:

| Action | Why |
|---|---|
| Production deploy | Public-facing |
| DNS / domain change | External authority |
| Payment / auth change | Financial / account safety |
| Secret-bearing config change | Credential leakage risk |
| Destructive file delete (rm -rf, branch -D, reset --hard) | Lost work risk |
| Parallel-write scope-lock conflict | Multi-agent collision |
| Expensive media/API over threshold | Cost safety |
| Brand-kit change | Brand integrity |
| Schema migration | Data integrity |

Each maps to an Approval Center item. None can be bypassed by raising the autonomy mode.

---

## 10. Final handoff report

The end-of-run document is required for every autonomous build. Contents:

1. **Production URL + commit deployed**
2. **Smoke results** — checklist with pass/fail for each item
3. **Rollback point** — pinned commit + recipe to revert
4. **Remaining post-launch backlog** — explicitly listed (today, this is captured in the V2 doc)
5. **Learnings extracted** — the V2 patterns doc, with section-level anchors

If a run completes without a handoff report, the run is **incomplete** even if the site is live. The V2 backlog and learnings live nowhere else.

---

## 11. Why this is core architecture, not a side feature

Three reasons:

1. **Volume.** One operator running many sites cannot personally handhold every pass. The leverage is in agents carrying long objectives. Without this model, leverage collapses.
2. **Quality.** MBSH demonstrated that guarded-autonomous produces higher-quality output than manual-mode bursts because every pass closes with proof, every decision is logged, and every learning is extracted.
3. **Compounding.** The pattern itself is a compounding asset. The next site inherits the closeout pattern, the run-state pattern, the decision log, the coverage matrix, the V2 backlog format. Without this model, every site re-invents.

The model is core. Every other Platform Refresh v2 deliverable inherits from it.

---

## 12. What this doc locks

- Autonomous builds are **first-class architecture** in Platform Refresh v2.
- Every autonomous build declares the **nine-field run contract**.
- Three pause classes (hard / soft / coordination) with explicit triggers.
- Five autonomy modes (manual / assisted / guarded-autonomous / GA-to-completion / cost-bounded-batch).
- Five proof types that must accompany each pass.
- Five-document **resume contract** (run-contract, RUN-STATE, closeouts, decision log, coverage matrix).
- Nine **dangerous-action gates** that always require Fritz.
- A required **final handoff report** at the end of every run.

This is the operating model. Plan Registry Reconciliation maps existing plans onto it.
