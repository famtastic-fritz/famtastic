# FAMtastic Designs — Agent Operating Specifications

_Created: 2026-06-11 · Child doc #1 of `mythos-foundation-plan.md` (§34) · Required by `mythos-plan-patch-prompt-2026-06-11.md` correction 8_

This document defines every agent in the FAMtastic Designs swarm as an **operating unit**, not a role. Each spec answers: what may this agent decide, what may it never decide, exactly how does it work, what does it cost, how does it fail, and what trace does it leave.

**Governing principle (from the plan, §10):**

> Site Studio / fam-hub is a generation worker. The FAMtastic Proof Engine is the orchestrator.

No agent below delegates funnel decisions to the factory. The factory builds what it is told to build via the `ProofRequest → ProofArtifact` contract.

---

## 0. Shared Infrastructure (applies to every agent)

### 0.1 AgentTaskLog — the universal task record

Every agent task writes exactly one AgentTaskLog row (orchestration plane, extends `~/.config/famtastic/studio.db`). This is what makes the swarm trackable: which agent did this, what model/tool, why was it weak, did quality improve, what lesson/skill came out.

```text
AgentTaskLog = {
  task_id,                  // uuid
  parent_workflow_id,       // ties task to a workflows.md run
  agent_name,
  campaign_key,             // null for non-campaign tasks
  lead_id,                  // null where N/A
  proof_id,                 // null where N/A
  model_or_tool,            // exact id, e.g. "claude-haiku-4-5", "fam-hub-factory", "places-api"
  cost_estimate,
  cost_actual,
  input_refs,               // pointers, never blobs
  output_refs,
  decision_summary,         // 1-2 sentences, human-readable
  confidence,               // 0.0-1.0 where the agent self-scores; null for deterministic
  qa_result,                // pass | fail | flagged | n/a
  failure_reason,           // enum + free text; null on success
  fallback_used,            // bool + which fallback
  human_review_required,    // bool + trigger name
  lesson_candidate,         // bool — Librarian sweeps these
  skill_candidate,          // bool
  created_at,
  completed_at
}
```

### 0.2 Routing tiers (from plan §19/§20)

- **T1** — flat-rate subscription lanes (Claude Code CLI / factory, Codex weekly-capped, Gemini CLI). Always preferred where capable. Cap-aware: a 429/limit **must** trigger explicit fallback + `fallback_used=true`; silent paid-lane flips are forbidden.
- **T2** — cheap API: Haiku 4.5 (+ structured outputs, + Batch −50% for non-urgent bulk).
- **T3** — mid API: Sonnet 4.6.
- **T4** — premium: Opus 4.8. Architecture, escalations, high-value final review only. Every T4 call logs an escalation reason.

### 0.3 Standard policies (referenced by name below)

- **RETRY-STD:** 1 retry on transient failure (timeout/5xx/parse), same model, jittered backoff. 2nd failure → fallback model/tool once. 3rd failure → park with `failure_reason`, notify queue. Never retry a *compliance* failure — park immediately.
- **RETRY-BUILD:** for factory builds — 1 retry on build failure with same spec; 2nd failure → regenerate spec from ProofRequest (one time); 3rd → park. Never bypass `runPostProcessing()` on any path.
- **ESC-STD:** escalate one tier (T2→T3, T3→T4) when: 2 distinct-prompt failures, confidence < 0.6 on a gating decision, or output flagged twice for the same defect class in 7 days.
- **LOG-STD:** AgentTaskLog row (0.1) + domain events on the owning object (Lead/Proof/EmailEvent state transitions per plan §13).
- **LESSON-STD:** write `lesson_candidate=true` on: any park, any fallback use, any human rejection, any QA fail, and any notable success (first deposit from a new angle, etc.). The Librarian sweeps candidates daily.
- **BUDGET-ALERT:** Cost Auditor alerts when an agent exceeds 2× its per-task budget or its weekly envelope.

### 0.4 Decision authority matrix (summary)

| Decision | Owner | Never decided by |
|---|---|---|
| Campaign selection / config | Campaign Strategist (Fritz approves changes) | Factory, writers |
| Lead score + proof level | Lead Scorer / Engine rules | Factory, Outreach Writer |
| What facts may be used in personalization | Presence Scanner output + Engine policy | Outreach Writer (consumes only) |
| Whether a send happens | Compliance Checker gates + review model | Outreach Writer, Proof Generator |
| Pricing shown on a proof | Pricing Recommender (rules) + Fritz for custom | Factory |
| Anything involving secrets | No agent — vault + choke points only | All agents |

---

## 1. Planning & Design Agents

### 1.1 Strategy Architect

- **Mission:** make the small number of decisions that shape everything else — architecture changes, offer strategy, roadmap re-sequencing — from real metrics, not vibes.
- **Allowed to decide:** proposals for architecture/offer/roadmap changes; experiment designs.
- **Not allowed to decide:** unilateral adoption — every output is a proposal until Fritz approves. Never touches sends, pricing on live proofs, or campaign configs directly.
- **Inputs:** weekly scorecard, cost audit, workstream states, lessons digest, plan docs.
- **Output schema:** `StrategyProposal = { context, options[≤3], recommendation, expected_impact, risks, reversibility, decision_needed_by }`.
- **Methodology:** (1) read scorecard + cost audit; (2) diff against plan assumptions A1–A5; (3) identify the single highest-leverage decision; (4) draft ≤3 options with one recommendation; (5) log + queue for Fritz.
- **Best model/tool:** T4 Opus. **Fallback:** T3 Sonnet draft flagged `fallback_used`.
- **Cost budget:** ≤ $1.50/task; ≤ 2 tasks/week (≈ $3/wk envelope).
- **Quality checklist:** options grounded in cited metrics · recommendation states reversibility · no scope creep into Phase-2 lanes · respects project boundaries (Hosting/Thoughts separate).
- **Failure modes:** plausible-but-wrong strategy from stale data; recommending rebuilds of things that exist.
- **Retry/escalation:** RETRY-STD; no higher tier exists — failure parks to Fritz.
- **Human review triggers:** all output (low frequency, high stakes).
- **Logs:** LOG-STD. **Metrics:** proposals accepted %, impact of accepted proposals vs `expected_impact`.
- **Lessons/Skills:** LESSON-STD; skill output = decision-frameworks that repeat (e.g., "campaign kill/scale rubric").

### 1.2 Brand/Voice Guardian

- **Mission:** every word that leaves the system sounds FAMtastic — bold, street-smart-corporate, respectful in faith contexts — and the FAM logic is never violated.
- **Allowed to decide:** pass/fail on copy; line edits.
- **Not allowed to decide:** message strategy, offers, facts (can't add claims), send timing.
- **Inputs:** draft copy + campaign_key + `source_facts_allowed_for_personalization`.
- **Output schema:** `VoiceReview = { verdict: pass|fail, edited_copy?, violations[], sensitivity_flags[] }`.
- **Methodology:** (1) checklist pass (below); (2) for church/nonprofit: respect screen (no theological overreach, no manipulation framing); (3) minimal edits over rewrites; (4) fail → back to writer with named violations.
- **Best:** T3 Sonnet. **Fallback:** T2 Haiku checklist-only mode (edits disabled, pass/fail only).
- **Cost budget:** ≤ $0.03/review; envelope scales with send volume.
- **Quality checklist:** FAM capitalization correct · definition never mocked · no cookie-cutter agency phrasing · claims ⊆ allowed facts · church/nonprofit respect screen · CTA language matches claim_cta_policy.
- **Failure modes:** over-blocking (kills good copy), rubber-stamping, style drift over time.
- **Retry/escalation:** RETRY-STD; ESC-STD to T4 only for brand-defining copy (homepage, signature campaign page).
- **Human review triggers:** every `sensitivity_flag`; any fail/pass disagreement with Quality Reviewer.
- **Logs:** LOG-STD. **Metrics:** rejection rate, post-edit human-rejection rate (should → 0), drift audit monthly.
- **Lessons/Skills:** LESSON-STD; skill output = the living voice checklist (versioned).

### 1.3 UX/Site Architect

- **Mission:** turn briefs into page compositions that convert — section order, CTA logic, flow — within the §7 page rules.
- **Allowed to decide:** section composition, CTA placement, internal linking for new pages.
- **Not allowed to decide:** new route classes, nav changes (Fritz), brand rules, backend contracts.
- **Inputs:** page brief, design.md rules, component library inventory, campaign config.
- **Output schema:** `PageSpec = { route, purpose, persona, primary_cta, sections[{component, content_brief}], metadata, reduced_motion_plan }`.
- **Methodology:** (1) confirm route class + rules; (2) compose from existing components first (reuse-before-generate); (3) every page ends in a CTA band; (4) write content briefs per section; (5) hand to build with mobile + reduced-motion notes.
- **Best:** T3 Sonnet. **Fallback:** T1 Claude Code session.
- **Cost budget:** ≤ $0.10/page spec.
- **Quality checklist:** composes from library · CTA band present · metadata block complete · mobile/reduced-motion plan present · no orphan sections.
- **Failure modes:** spec drift from design system; inventing components that exist.
- **Retry/escalation:** RETRY-STD; ESC-STD for novel page patterns.
- **Human review triggers:** any new page *pattern* (not instances).
- **Logs:** LOG-STD. **Metrics:** spec→build rework rate, page conversion once live.
- **Lessons/Skills:** LESSON-STD; skill output = page-pattern templates.

### 1.4 Immersive/3D Design Planner

- **Mission:** design showroom scenes that wow without breaking the perf/accessibility guardrails (§6).
- **Allowed to decide:** scene composition, motion storyboards, asset budgets within the perf budget.
- **Not allowed to decide:** the perf budget itself (plan-fixed: LCP < 2.5s, Lighthouse ≥ 80 mobile), launch sequencing (Option-B discipline is fixed), brand rules.
- **Inputs:** brand DNA, page spec, perf budget, device matrix.
- **Output schema:** `ScenePlan = { scene_id, narrative_beats[], assets[{type, poly/size budget}], interaction_model, fallback_still, reduced_motion_behavior, est_bundle_kb, build_steps[] }`.
- **Methodology:** (1) start from the Proof-to-Profit transformation narrative; (2) storyboard beats; (3) budget every asset; (4) define the static first-paint + reduced-motion fallback **before** the fancy version; (5) hand build steps to implementation.
- **Best:** T4 Opus (novel creative). **Fallback:** T3 Sonnet.
- **Cost budget:** ≤ $1.00/scene plan; scenes are rare.
- **Quality checklist:** fallback still defined · bundle estimate ≤ budget · reduced-motion path complete · ends at a CTA · narrative matches campaign/brand.
- **Failure modes:** over-scoped scenes blowing the perf budget; gimmick over conversion.
- **Retry/escalation:** RETRY-STD; failure parks to Fritz with options.
- **Human review triggers:** every scene plan before build.
- **Logs:** LOG-STD. **Metrics:** shipped-scene Lighthouse delta, scroll-depth/CTA engagement on scene pages.
- **Lessons/Skills:** LESSON-STD; skill output = reusable scene/motion modules ("engine to build more scenes").

---

## 2. Engine Agents (the 24/7 loop)

### 2.1 Lead Discovery

- **Mission:** keep each active campaign's queue stocked with candidate organizations from the primary geography (Treasure Coast/Palm Beach → Broward/Miami-Dade → FL statewide).
- **Allowed to decide:** which query variants to run within campaign config; daily pull volume within quota.
- **Not allowed to decide:** geography changes, campaign selection, lead quality (downstream), any contact attempt.
- **Inputs:** campaign config (categories, geography ladder), quota state, dedupe index.
- **Output schema:** `RawLead = { name, category_guess, location, place_id?, urls{site?, fb?, gbp?}, phone?, rating?, review_count?, discovered_via, discovered_at }`.
- **Methodology:** (1) expand campaign categories × geography into Places/directory queries; (2) pull with field masks (cost control); (3) normalize; (4) dedupe against `store.py` index (place_id, then fuzzy name+location); (5) emit RawLeads; (6) record quota spend.
- **Best:** T1 deterministic scripts + Google Places API (extend `pipeline/agents/scout.py`). **Fallback:** directory/chamber list parsing with T2 Haiku extraction.
- **Cost budget:** API quota envelope set in config (default ≤ $5/week Places spend); LLM ≈ $0.
- **Quality checklist:** zero dupes emitted · required fields present · geography within active ladder ring · quota recorded.
- **Failure modes:** dupes/junk flooding the queue; quota burn on unmasked fields; geography drift.
- **Retry/escalation:** RETRY-STD on API errors; quota exhaustion → stop + notify (never overspend).
- **Human review triggers:** none (downstream gates protect).
- **Logs:** LOG-STD + Lead `created` events. **Metrics:** leads/day per campaign, dupe rate caught downstream (should be ~0), cost per 100 leads.
- **Lessons/Skills:** LESSON-STD; skill output = per-vertical query recipes.

### 2.2 Lead Classifier

- **Mission:** turn RawLeads into typed Leads — campaign assignment, normalization, dedupe confirmation.
- **Allowed to decide:** campaign_key assignment, field normalization, duplicate merge proposals.
- **Not allowed to decide:** scores, proof levels, suppression overrides.
- **Inputs:** RawLead batch, campaign definitions, existing-lead index.
- **Output schema:** structured-output-enforced `Lead` (plan §13 fields) + `classification_confidence`.
- **Methodology:** (1) nightly batch (Batch API, −50%); (2) Haiku + strict schema classifies campaign + normalizes; (3) confidence < 0.7 → second pass T3; still < 0.7 → `category=other`, flagged; (4) write Leads, status `new`.
- **Best:** T2 Haiku, batched, structured outputs. **Fallback:** deterministic rules (keyword/category tables) — degraded but never blocked.
- **Cost budget:** ≤ $0.002/lead (batched); alert at 2×.
- **Quality checklist:** schema-valid 100% · confidence recorded · no campaign defaulting without flag.
- **Failure modes:** misroutes (the historical #1 classifier bug class — common words triggering wrong intent).
- **Retry/escalation:** RETRY-STD; ESC-STD per-item to T3 on low confidence.
- **Human review triggers:** weekly 20-lead misroute audit sample.
- **Logs:** LOG-STD. **Metrics:** misroute rate from audits (< 5%), batch completion latency, cost/lead.
- **Lessons/Skills:** LESSON-STD; skill output = classification rubric updates (versioned with campaign_config_version).

### 2.3 Presence Scanner

- **Mission:** establish the *observed facts* about a lead's web presence — the only facts personalization may ever use.
- **Allowed to decide:** which sources to check (within policy), fact extraction.
- **Not allowed to decide:** what the facts *mean* (Scorer), what to say about them (Writer). Never invents a fact.
- **Inputs:** Lead urls, scan policy (sources: website, GBP/Places data, public Facebook page, livestream presence for churches).
- **Output schema:** `ScanFindings = { facts[{type, value, source_url, observed_at}], signals[], screenshots?, scan_coverage }` — every fact carries its source.
- **Methodology:** (1) fetch site (if any) → mobile + desktop checks, CTA presence, last-updated heuristics; (2) Places/GBP completeness; (3) public socials recency; (4) church-specific: livestream/giving link presence; (5) emit facts-with-sources; (6) map to the §7 qualified-lead signals.
- **Best:** T2 fetch + Haiku extraction (structured). **Pilot alternate:** OpenAI web search tool (experiment #4 decides). **Fallback:** manual checklist queue.
- **Cost budget:** ≤ $0.02/lead scanned.
- **Quality checklist:** every fact has source_url + timestamp · no inference presented as fact · coverage recorded (what wasn't checkable).
- **Failure modes:** hallucinated findings → false personalization (the credibility killer upstream).
- **Retry/escalation:** RETRY-STD; unreachable site is a *finding*, not a failure.
- **Human review triggers:** none directly; its facts are audited whenever a send is rejected for accuracy.
- **Logs:** LOG-STD + Lead `scanned`. **Metrics:** facts/lead, downstream personalization-accuracy rejections traced to scans (target 0).
- **Lessons/Skills:** LESSON-STD; skill output = per-vertical scan checklists (church scan ≠ barber scan).

### 2.4 Lead Scorer

- **Mission:** rank leads 0–100 with reason codes so proof effort goes where money is likeliest.
- **Allowed to decide:** score + reason codes + recommended proof level (L1 default; L2 ≥ 70).
- **Not allowed to decide:** weight changes (Strategist proposes, Fritz approves), suppression, sends.
- **Inputs:** Lead + ScanFindings + campaign signal weights (versioned).
- **Output schema:** structured `Score = { value, reason_codes[], proof_level_rec, weights_version }`.
- **Methodology:** (1) nightly batch; (2) Haiku applies weighted signals (no-website, outdated, not-mobile, no-CTA, FB-only, weak GBP, good-reviews-weak-web, active, events-no-conversion, local fit); (3) reason codes mandatory; (4) score ≥ 80 or `timeline=now` → Fritz notification.
- **Best:** T2 Haiku, batched, structured. **Fallback:** static weight formula (pure code).
- **Cost budget:** ≤ $0.002/lead (batched).
- **Quality checklist:** reason codes present · weights_version recorded · distribution sanity (not everything 75).
- **Failure modes:** score inflation/drift vs actual outcomes.
- **Retry/escalation:** RETRY-STD.
- **Human review triggers:** monthly score-vs-outcome audit (do 80s deposit more than 50s?).
- **Logs:** LOG-STD + Lead `scored`. **Metrics:** deposit rate by score band (the only validation that matters).
- **Lessons/Skills:** LESSON-STD; skill output = weight-tuning proposals with evidence.

### 2.5 Campaign Strategist

- **Mission:** tune angles, offers, and signal weights per campaign from weekly results; keep the signature-campaign thesis honest with data.
- **Allowed to decide:** proposed config changes (drafts).
- **Not allowed to decide:** applying config changes (Fritz approves), budget changes, new campaigns.
- **Inputs:** weekly scorecard per campaign, best/worst messages, lessons digest.
- **Output schema:** `ConfigChangeProposal = { campaign_key, change, evidence, expected_effect, rollback }` → new `campaign_config_version` on approval.
- **Methodology:** (1) weekly compare across the 4 campaigns; (2) identify the single weakest conversion step per campaign; (3) propose one change each (not five); (4) small-sample guard: no proposal on < 20 sends of evidence.
- **Best:** T3 Sonnet. **Fallback/escalation:** T4 if stuck two cycles.
- **Cost budget:** ≤ $0.25/week.
- **Quality checklist:** evidence cited · one change per campaign per cycle · rollback stated · sample-size guard respected.
- **Failure modes:** overreacting to noise; burying the church thesis prematurely.
- **Retry/escalation:** RETRY-STD; ESC-STD.
- **Human review triggers:** every proposal.
- **Logs:** LOG-STD + Campaign config version bumps. **Metrics:** proposal acceptance rate, post-change metric deltas.
- **Lessons/Skills:** LESSON-STD; skill output = per-vertical playbooks.

### 2.6 Proof Generator

- **Mission:** drive the generator boundary — assemble ProofRequests and shepherd factory builds to valid ProofArtifacts.
- **Allowed to decide:** spec assembly details within the ProofRequest, retry/regenerate per RETRY-BUILD.
- **Not allowed to decide:** proof level (Scorer), facts (Scanner), claims (policy), QA verdicts, sends. **The factory decides nothing about the funnel.**
- **Inputs:** ProofRequest (plan §10 contract — lead_snapshot, campaign_config_version, proof_level, allowed facts, required blocks, forbidden claims, policies).
- **Output schema:** ProofArtifact (plan §10 contract — manifest, source_facts_used, claims_made, screenshots, costs, rollback path, failure_reason_enum).
- **Methodology:** (1) validate ProofRequest completeness; (2) write `spec.json` from request (never from live DB); (3) invoke factory headlessly (`unset CLAUDECODE`, `--tools ""`, printf-pipe, fence-strip — the proven invocation rules); (4) `runPostProcessing()` always; (5) deploy dist → previews host; (6) screenshot pass (desktop+mobile); (7) assemble ProofArtifact incl. claims/facts extraction; (8) engine validates facts ⊆ allowed before `qa_review`.
- **Best:** T1 fam-hub factory (flat-rate). **Fallback:** RETRY-BUILD ladder, then park — no API-lane fallback for builds (cost discipline).
- **Cost budget:** ≈ $0 marginal (subscription); cap-utilization tracked; L1 ≤ 8 min wall-clock, L2 ≤ 25 min.
- **Quality checklist:** artifact contract complete · facts ⊆ allowed · no forbidden claims · screenshots present · rollback path recorded · postprocessing ran.
- **Failure modes:** cap exhaustion silently stalling the queue (must surface as explicit park + notify); spec drift; logo-rule violations.
- **Retry/escalation:** RETRY-BUILD; cap exhaustion → pause queue + notify, never silent.
- **Human review triggers:** none directly (QA gate follows).
- **Logs:** LOG-STD + Proof `queued→generating→qa_review` transitions with cost_actual. **Metrics:** build success rate, QA pass rate, wall-time, cap utilization.
- **Lessons/Skills:** LESSON-STD; skill output = per-vertical spec templates (church proof spec, local-service proof spec).

### 2.7 Outreach Writer

- **Mission:** write the personalized, signal-grounded first-touch (and follow-up) drafts that earn the click.
- **Allowed to decide:** wording, structure, subject lines — within tone/claim policies.
- **Not allowed to decide:** recipients, send timing, facts (uses `source_facts_allowed` only), offers (Pricing Recommender), whether it sends.
- **Inputs:** Lead + ProofArtifact (claims_made, preview_url) + ScanFindings facts + campaign angle + template family.
- **Output schema:** `OutreachDraft = { subject, body, personalization_facts_used[], campaign_key, template_family, follow_up_slot }`.
- **Methodology:** (1) pick the campaign's sharpened angle (§9 table); (2) open with one *observed* specific (fact-cited); (3) bridge to the proof link as the value; (4) one CTA; (5) opt-out + footer slots left to the send system; (6) every personalization listed in `personalization_facts_used` for gate-checking.
- **Best:** T3 Sonnet (first-touch, L2+, church/professional). **Fallback:** T2 Haiku for L1 teaser class (experiment #6 validates).
- **Cost budget:** ≤ $0.05/draft (T3), ≤ $0.01 (T2).
- **Quality checklist:** zero unlisted personalization · no forbidden claims · campaign-appropriate tone · ≤ 150 words first-touch · single CTA · subject non-deceptive.
- **Failure modes:** generic/mismatched pitch; fact drift (saying "your outdated site" to a no-site lead).
- **Retry/escalation:** RETRY-STD; ESC-STD to T4 only for score ≥ 85 leads.
- **Human review triggers:** calibration-first model — first 5 per campaign, high-value, all flags.
- **Logs:** LOG-STD. **Metrics:** reply rate and click rate by template_family × model tier (drives experiment #6), human rejection rate.
- **Lessons/Skills:** LESSON-STD; skill output = personalization recipes per signal type (the "best message" library).

### 2.8 Compliance/Deliverability Checker

- **Mission:** be the unbribable gate — nothing sends unless all seven gates pass.
- **Allowed to decide:** pass/park. Parks are final until a human releases them.
- **Not allowed to decide:** content fixes (back to Writer), suppression-list edits (admin action), gate definitions.
- **Inputs:** OutreachDraft + Contact + suppression list + send history + DNS/identity state.
- **Output schema:** `GateResult = { verdict: pass|park, gates: {source, reason, personalization, suppression, duplicate, deliverability, compliance} each pass|fail+detail }`.
- **Methodology:** deterministic checks first (suppression, duplicate-30d, MX/syntax/disposable, identity DNS health, footer address+opt-out present), then T2 Haiku checklist for content compliance (subject accuracy, claim grounding vs `personalization_facts_used`). All 7 must pass. Any fail → park with named gate. **Runs inside/at `pipeline/lib/sender.py` — the single choke point.**
- **Best:** deterministic code + T2 Haiku. **Fallback:** deterministic-only mode (content gate then auto-parks for human).
- **Cost budget:** ≤ $0.005/check.
- **Quality checklist:** the gate result IS the checklist; zero sends bypass it (enforced structurally — no other code path can send).
- **Failure modes:** false-pass (worst case → compliance incident); config drift letting a gate default to pass. Gates default to **fail** on any error.
- **Retry/escalation:** none — errors park. Never retries itself into a pass.
- **Human review triggers:** every park.
- **Logs:** LOG-STD + EmailEvent rows. **Metrics:** park rate by gate, false-pass incidents (must stay 0), bounce/complaint rates vs stop-loss thresholds.
- **Lessons/Skills:** LESSON-STD; skill output = gate-rule refinements (versioned).

### 2.9 Quality Reviewer

- **Mission:** run the binary proof checklist (plan §10) on every ProofArtifact before it can be sent.
- **Allowed to decide:** pass/flag per checklist; regeneration requests with reason.
- **Not allowed to decide:** checklist contents (versioned policy), sends, design taste beyond the checklist.
- **Inputs:** ProofArtifact (incl. screenshots + manifest) + qa_policy version.
- **Output schema:** `qa_checklist_result = { version, items[{name, pass|fail, evidence}], verdict: pass|flag, regeneration_reason? }`.
- **Methodology:** (1) structural checks from manifest (blocks present, CTA/claim link, logo rule); (2) content checks (business name everywhere, no placeholder text, claims ⊆ facts); (3) screenshot pass — mobile renders, no broken images; (4) any fail → flag with evidence; clean → pass.
- **Best:** T3 Sonnet (vision pass on screenshots). **Fallback:** T2 Haiku structural-only + auto-flag for human visual check.
- **Cost budget:** ≤ $0.04/proof.
- **Quality checklist:** binary items only (no 0–10 scores — standing rule) · evidence per fail · checklist version recorded.
- **Failure modes:** rubber-stamping; vision misses on subtle breakage.
- **Retry/escalation:** RETRY-STD; disputes (Writer/Generator disagrees) → T4 one-shot arbitration.
- **Human review triggers:** every flag goes to Fritz's queue.
- **Logs:** LOG-STD + Proof `qa_review→ready|rejected`. **Metrics:** flag rate, post-pass human rejection rate (target → 0), defect classes over time.
- **Lessons/Skills:** LESSON-STD; skill output = checklist version upgrades from recurring defect classes.

### 2.10 Pricing/Package Recommender

- **Mission:** map proof + signals → the recommended package and the full transformation path shown on the preview page.
- **Allowed to decide:** which standard package to recommend; deposit amount within the package's defined range.
- **Not allowed to decide:** package definitions/pricing (Fritz), custom quotes (Fritz), discounts.
- **Inputs:** Lead score + campaign + ScanFindings complexity markers + package catalog.
- **Output schema:** `PackageRec = { package_id, deposit, monthly?, flat?, upsell_path[], rationale }`.
- **Methodology:** rules table first (campaign × complexity → package); T2 only for edge mapping; systems-tier markers (giving, member access, e-com) always route to call-first.
- **Best:** T2 structured. **Fallback:** rules table only.
- **Cost budget:** ≤ $0.002/rec.
- **Quality checklist:** package exists in catalog · systems-tier → call-first · upsell path present (the upsell is showing everything).
- **Failure modes:** under-pricing systems deals; recommending pay-now to committee-decision orgs.
- **Retry/escalation:** RETRY-STD; uncertainty → call-first (safe default).
- **Human review triggers:** every custom-quote route.
- **Logs:** LOG-STD. **Metrics:** claim rate by recommended package, custom-quote conversion.
- **Lessons/Skills:** LESSON-STD; skill output = offer-mapping table refinements.

### 2.11 Payment/Onboarding Router

- **Mission:** turn payment/booking events into correct records, statuses, and onboarding kicks — idempotently.
- **Allowed to decide:** nothing judgmental — pure deterministic routing.
- **Not allowed to decide:** anything requiring judgment (anomalies park).
- **Inputs:** Stripe webhooks, Cash App/manual confirmations, booking events.
- **Output schema:** Payment record + Client creation + Proof `claimed` + onboarding email trigger + Fritz notification.
- **Methodology:** verify webhook signature → dedupe on external_id (idempotency) → create/update records → fire onboarding flow → notify. Unknown event shapes park.
- **Best:** deterministic code (no LLM). **Fallback:** n/a — failures park to manual reconcile.
- **Cost budget:** $0.
- **Quality checklist:** idempotent (replay-safe) · signature verified · every money event reconciles to a record.
- **Failure modes:** double-processing webhooks; missed events during downtime (reconcile job covers).
- **Retry/escalation:** queue-retry with dedupe; anomaly → park + notify immediately (money = loudest alerts).
- **Human review triggers:** every anomaly; daily money-event digest.
- **Logs:** LOG-STD + Payment events. **Metrics:** reconciliation mismatches (target 0), webhook-to-record latency.
- **Lessons/Skills:** LESSON-STD.

### 2.12 Fulfillment Task Planner

- **Mission:** every claim instantly becomes a complete, ordered build checklist (Workstream) so nothing falls through after money arrives.
- **Allowed to decide:** task list composition from templates; sequencing.
- **Not allowed to decide:** scope changes (Fritz), pricing, timelines promised to clients.
- **Inputs:** Client + ProofArtifact + package includes + onboarding form state.
- **Output schema:** fulfillment `Workstream` with ordered tasks (plan §16 checklist), owners, deadline drafts.
- **Methodology:** template per package → adjust from proof manifest (what exists vs what's promised) → flag custom items for Fritz → create Workstream + first next-action.
- **Best:** T2. **Fallback:** raw template (no adjustment).
- **Cost budget:** ≤ $0.01/claim.
- **Quality checklist:** all package includes mapped to tasks · domain/DNS task present · tracking-setup task present · handoff email task present.
- **Failure modes:** missing tasks → fulfillment gaps → refunds/reputation.
- **Retry/escalation:** RETRY-STD; custom scope → Fritz.
- **Human review triggers:** complex/custom scope flags.
- **Logs:** LOG-STD. **Metrics:** fulfillment cycle time, post-launch issue count traced to missing tasks.
- **Lessons/Skills:** LESSON-STD; skill output = fulfillment checklist versions per package.

---

## 3. Operations Agents

### 3.1 Analytics/Results Tracker

- **Mission:** the weekly per-campaign scorecard and the six §26 questions, with numbers that are never LLM-generated.
- **Allowed to decide:** report composition, anomaly highlighting.
- **Not allowed to decide:** strategy responses (Strategist), metric definitions (plan-fixed).
- **Inputs:** orchestration DB + hosted-plane events + Resend webhooks + payment records.
- **Output schema:** weekly `Scorecard` per campaign (all §26 metrics) + cross-campaign compare + anomalies[].
- **Methodology:** SQL computes every number → T2 Haiku writes connective prose only → anomalies (stop-loss proximity, cost spikes, conversion cliffs) flagged on top.
- **Best:** deterministic SQL + T2 prose. **Fallback:** raw tables, no prose.
- **Cost budget:** ≤ $0.05/week.
- **Quality checklist:** every number traceable to a query · prose contains no number not in the tables · six questions answered.
- **Failure modes:** LLM-invented numbers (structurally prevented); silent metric-pipeline breakage (freshness check required).
- **Retry/escalation:** RETRY-STD; data-pipeline failure → raw-table fallback + alert.
- **Human review triggers:** Fritz reads weekly (10 min).
- **Logs:** LOG-STD. **Metrics:** report delivered on schedule, anomalies caught before humans noticed.
- **Lessons/Skills:** LESSON-STD.

### 3.2 Workstream Manager

- **Mission:** no workstream sits `active` with no next action; blockers surface loudly.
- **Allowed to decide:** nudges, staleness flags, rollup composition.
- **Not allowed to decide:** priorities (Fritz/Strategist), closing workstreams (closeout discipline applies).
- **Inputs:** Workstream table + plans-system state (`scripts/plans/audit.js` output).
- **Output schema:** staleness report + blocker escalations + next-action nudges.
- **Methodology:** daily sweep → stale `active` (no action 48h) nudged → blockers > 24h escalated → weekly rollup feeds the scorecard.
- **Best:** T2. **Fallback:** n/a (simple).
- **Cost budget:** ≤ $0.02/day.
- **Quality checklist:** zero silent-stale workstreams · every blocker has an owner.
- **Failure modes:** nag fatigue (batch nudges, don't spam); stale state mirroring.
- **Retry/escalation:** RETRY-STD; blocker > 72h → Fritz directly.
- **Human review triggers:** blocker escalations.
- **Logs:** LOG-STD. **Metrics:** mean blocker age, stale-workstream count (target 0).
- **Lessons/Skills:** LESSON-STD.

### 3.3 Lessons/Skills Librarian

- **Mission:** sweep `lesson_candidate` flags into Lesson records; propose promotions to Reusable Skills; keep the loop compounding.
- **Allowed to decide:** lesson record composition, promotion *proposals*, dedupe/retire of noise lessons.
- **Not allowed to decide:** skill publication (Fritz approves), code changes.
- **Inputs:** AgentTaskLog candidates, QA fails, human rejections, claim successes.
- **Output schema:** `LessonLearned` records (plan §13) + `SkillPromotionProposal = { name, trigger, steps, source_lessons[], owner_agent }`.
- **Methodology:** daily sweep → cluster candidates by root cause → write lessons with **Why/How-to-apply** → promotion bar: recurred (or will), written trigger+steps, measurable saving → proposals to Fritz weekly. Promoted skills land as real artifacts (`.claude/skills/` or `pipeline/` modules), honoring the existing memory homes (cerebrum/buglog for code lessons).
- **Best:** T3 Sonnet. **Fallback:** T2 capture-only (no clustering).
- **Cost budget:** ≤ $0.10/day.
- **Quality checklist:** every lesson has root cause + application · no duplicate lessons · promotions meet the bar.
- **Failure modes:** noise burying signal; lessons that never become behavior.
- **Retry/escalation:** RETRY-STD.
- **Human review triggers:** all promotions.
- **Logs:** LOG-STD. **Metrics:** lessons→skills conversion rate, repeat-incident rate for lessoned classes (should fall).
- **Lessons/Skills:** recursive — its own process improvements are skills.

### 3.4 Cost Auditor

- **Mission:** every dollar and every cap accounted; routing kept honest.
- **Allowed to decide:** alerts, routing-change *proposals*.
- **Not allowed to decide:** routing changes (Strategist/Fritz), budget envelopes (Fritz).
- **Inputs:** AgentTaskLog costs, provider usage exports, subscription-cap status, BUDGET-ALERT events.
- **Output schema:** weekly cost audit (cost/proof, cost/deposit, per-agent, per-model, escalation rate) + threshold alerts.
- **Methodology:** reconcile logged costs to provider invoices monthly → alert: cost/proof > $1.00, any agent > 2× envelope, escalation rate > 10%, cap utilization > 80% → propose routing fixes with evidence (rule: weak output → fix harness before upgrading model).
- **Best:** deterministic + T2 prose. **Fallback:** raw export.
- **Cost budget:** ≤ $0.05/week.
- **Quality checklist:** reconciles to invoices · every alert actionable · cap status always current.
- **Failure modes:** missing a silent paid-lane flip (its #1 job is catching exactly this).
- **Retry/escalation:** RETRY-STD; cap-breach imminent → immediate notify, not weekly.
- **Human review triggers:** threshold alerts.
- **Logs:** LOG-STD. **Metrics:** invoice-vs-log variance (< 5%), alert lead time before breaches.
- **Lessons/Skills:** LESSON-STD; skill output = routing-rule updates.

### 3.5 Repo/Docs Writer

- **Mission:** documentation reflects reality, always — SITE-LEARNINGS, CHANGELOG, plan child docs, known gaps.
- **Allowed to decide:** doc wording, gap phrasing.
- **Not allowed to decide:** what counts as done (evidence required), removing known gaps without proof closed.
- **Inputs:** session results, AgentTaskLog digests, shipped artifacts.
- **Output schema:** docs: commits (CHANGELOG entries, SITE-LEARNINGS updates, child-doc revisions).
- **Methodology:** end-of-wave sweep → document what was *built*, never what was planned (Rule 4) → known-gaps section updated every wave → commit with `docs:` prefix, human-clean messages.
- **Best:** T1 Claude Code. **Fallback:** T3 Sonnet if cap hit.
- **Cost budget:** ≈ $0 (subscription).
- **Quality checklist:** file paths/function names included (actionable) · gaps honest · no planned-as-built drift.
- **Failure modes:** documenting intentions as facts.
- **Retry/escalation:** RETRY-STD.
- **Human review triggers:** docs commits reviewed in normal flow.
- **Logs:** LOG-STD. **Metrics:** doc-reality drift findings per audit (target 0).
- **Lessons/Skills:** LESSON-STD.

---

## 4. Cross-Agent Answers (the trackability contract)

The swarm exists so these questions are always answerable from AgentTaskLog + domain events:

| Question | Answered by |
|---|---|
| Which agent did this? | `agent_name` on the task row tied to the proof/lead/send |
| Which model/tool did it use? | `model_or_tool` (+ `fallback_used`) |
| What did it cost? | `cost_actual` per task; rollups by Cost Auditor |
| What did it miss / why was output weak? | `qa_result` + `failure_reason` + flag evidence |
| What failed? | parks + `failure_reason_enum` + buglog for code classes |
| What improved after changing the model/tool? | metrics keyed by `model_or_tool` (e.g., reply rate by writer tier — experiment #6) |
| What reusable skill/workflow was created? | `skill_candidate` → Librarian → published Skill records |

**Next doc:** `workflows.md` — the 13 workflows that string these agents together (see plan §34, revised order).
