# FAMtastic Designs — Orchestration Workflows

_Created: 2026-06-11 · Child doc #2 of `mythos-foundation-plan.md` (§34) · Agents referenced are specified in `agents.md`; backend objects in `backend.md`_

Every workflow below is an executable specification: trigger → steps → gates → handoff. Shared policies (RETRY-STD, RETRY-BUILD, ESC-STD, LOG-STD, LESSON-STD) are defined in `agents.md` §0.3. Every workflow run gets a `parent_workflow_id`; every agent step writes an AgentTaskLog row. Outcome linkage (run-all prompt core rule) is stated per workflow.

## Master Diagram — the Proof-to-Profit Engine

```text
                    ┌────────────────────────── OUTBOUND ──────────────────────────┐
 [WF-01 Discover] → [WF-02 Classify] → [WF-03 Scan] → [WF-04 Score] ──┐
                                                                      ▼
                  INBOUND                                   [WF-05 Proof Generation]
 /preview form → (WF-02..04 fast path, L2 default) ─────────►        │
                                                                      ▼
                                                            [WF-06 Proof QA] ──fail──► regenerate/park
                                                                      ▼ pass
                                  [WF-07 Claim Path QA]◄─── gate: must be GREEN before any send
                                                                      ▼
                                                            [WF-08 Outreach Send]
                                                              │ 7 gates + calibration review
                                            ┌─────────────────┼───────────────────┐
                                            ▼                 ▼                   ▼
                                     [WF-09 Reply]      click tracking      follow-ups (≤2)
                                            ▼                 ▼
                                       call/quote      /p/<slug> → /claim/<slug>
                                            └────────┬────────┘
                                                     ▼
                                            [WF-10 Payment/Deposit]
                                                     ▼
                                            [WF-11 Onboarding] → [WF-12 Fulfillment] → launch + care loop
                    ───────────────────────────────────────────────────────────────
 CONTINUOUS:  [WF-13 Weekly Campaign Review]  [WF-14 Lesson→Skill]  [WF-15 Cost Audit]  [WF-16 Workstream Update]
              (every workflow feeds events → metrics → lessons → skills → better configs → back into WF-01..12)
```

---

## WF-01 — Lead Discovery

- **Outcome linkage:** proof generation pipeline supply; revenue movement upstream.
- **Trigger:** nightly cron per active campaign; manual top-up command.
- **Responsible agents:** Lead Discovery (primary).
- **Inputs:** campaign config (categories × geography ladder ring), Places quota state, dedupe index.
- **Outputs:** RawLead batch → Leads queue.
- **State transitions:** — (creates Lead `new` in WF-02).
- **Steps:** (1) load active campaigns + current geography ring (Primary: Port St. Lucie/Fort Pierce/Stuart/Treasure Coast/Palm Beach Co.); (2) expand query matrix; (3) Places/directory pulls with field masks; (4) normalize; (5) dedupe vs index; (6) emit RawLeads; (7) record quota spend.
- **Decision gates:** quota guard (stop at envelope, never overspend); ring-advance gate (expand to Secondary geography only when Primary yield < 20 new leads/campaign/week).
- **Failure handling:** API errors → RETRY-STD; quota exhaustion → stop + notify (not an error).
- **Retry policy:** RETRY-STD.
- **Logs:** AgentTaskLog per batch; quota ledger.
- **Cost controls:** field masks mandatory; ≤ $5/wk Places envelope (BUDGET-ALERT at 2×).
- **Human review triggers:** none.
- **Completion criteria:** target queue depth reached (default 50 unclassified/campaign) or quota envelope hit.
- **Handoff:** WF-02 (nightly batch).

## WF-02 — Lead Classification

- **Outcome linkage:** quality improvement (right campaign = right proof); cost control (batch).
- **Trigger:** nightly batch after WF-01; immediate fast-path for inbound form leads.
- **Responsible agents:** Lead Classifier.
- **Inputs:** RawLead batch; campaign definitions; existing-lead index.
- **Outputs:** typed `Lead` records (status `new`), classification_confidence.
- **State transitions:** RawLead → Lead `new`.
- **Steps:** (1) assemble Batch API job (Haiku, structured outputs, shared cached prefix); (2) submit nightly; (3) collect results by morning; (4) confidence < 0.7 → T3 second pass; (5) still < 0.7 → `category=other` + flag; (6) write Leads; (7) merge-dupe proposals to admin.
- **Decision gates:** schema validation (hard — invalid rows requeue once then park).
- **Failure handling:** batch failure → fall back to rules-only classifier (degraded, flagged), never blocks the pipeline.
- **Retry policy:** RETRY-STD per item; one batch resubmit.
- **Logs:** AgentTaskLog per batch + per-flag; Lead `created` events.
- **Cost controls:** Batch −50% + cached prefix; ≤ $0.002/lead.
- **Human review triggers:** weekly 20-lead misroute audit (Fritz or Quality Reviewer sample).
- **Completion criteria:** every RawLead is a Lead or a parked flag.
- **Handoff:** WF-03 for Leads in active campaigns.

## WF-03 — Presence Scan

- **Outcome linkage:** proof generation (facts), risk reduction (truthfulness rule depends on it).
- **Trigger:** Lead reaches `new` in an active campaign; rescan on 30-day-old facts before any send.
- **Responsible agents:** Presence Scanner.
- **Inputs:** Lead urls + scan policy (site, GBP/Places, public FB, church livestream/giving checks).
- **Outputs:** ScanFindings (facts-with-sources + signals[] + coverage).
- **State transitions:** Lead `new → scanned`.
- **Steps:** (1) fetch site (mobile+desktop checks, CTA presence, freshness heuristics); (2) GBP completeness from Places fields; (3) public social recency; (4) vertical-specific checks (church: livestream/giving/events present?); (5) emit facts each with source_url+timestamp; (6) map signals (§7 qualified-lead list); (7) record coverage (what was uncheckable).
- **Decision gates:** facts-only gate — anything not directly observed is excluded; unreachable site recorded as a *finding*.
- **Failure handling:** RETRY-STD; partial coverage is acceptable and recorded.
- **Retry policy:** RETRY-STD.
- **Logs:** AgentTaskLog; Lead `scanned`.
- **Cost controls:** ≤ $0.02/lead; skip rescans inside 30-day freshness window.
- **Human review triggers:** none directly (audited via send rejections).
- **Completion criteria:** ScanFindings persisted with ≥ 1 fact or explicit zero-presence finding.
- **Handoff:** WF-04 (nightly batch).

## WF-04 — Lead Scoring

- **Outcome linkage:** deposit conversion (effort goes where money is likeliest).
- **Trigger:** nightly batch over `scanned` leads; rescore on new facts or weights version bump.
- **Responsible agents:** Lead Scorer.
- **Inputs:** Lead + ScanFindings + campaign weights (versioned).
- **Outputs:** Score {value, reason_codes, proof_level_rec, weights_version}; Lead `scored`.
- **State transitions:** Lead `scanned → scored`.
- **Steps:** (1) batch Haiku scoring with strict schema; (2) reason codes mandatory; (3) proof level: L1 default, L2 ≥ 70 or inbound; (4) score ≥ 80 or `timeline=now` → notify Fritz; (5) write scores.
- **Decision gates:** distribution sanity check (alert if stdev collapses — everything ~75 means drift).
- **Failure handling:** fallback static weight formula (pure code).
- **Retry policy:** RETRY-STD.
- **Logs:** AgentTaskLog; Lead `scored` + reason codes.
- **Cost controls:** batched, ≤ $0.002/lead.
- **Human review triggers:** monthly score-vs-outcome audit.
- **Completion criteria:** all scanned leads scored; high-value notifications sent.
- **Handoff:** WF-05 for leads above proof threshold (default: top N per campaign per night within build-cap budget).

## WF-05 — Proof Generation

- **Outcome linkage:** proof generation (the product mechanic itself).
- **Trigger:** scored lead selected for proofing (engine nightly selection); inbound form lead (priority lane, L2); regeneration request from WF-06.
- **Responsible agents:** Proof Generator (drives the boundary); factory as worker.
- **Inputs:** ProofRequest (full §10 contract: lead_snapshot, campaign_config_version, proof_level, allowed facts, required blocks, forbidden claims, policies, requester, reason).
- **Outputs:** ProofArtifact (full §10 contract); Proof record.
- **State transitions:** Proof `queued → generating → qa_review` (or `rejected` on hard failure).
- **Steps:** (1) engine assembles + validates ProofRequest; (2) write spec.json from request only; (3) invoke factory headlessly (proven invocation rules: tmpdir cwd, `--tools ""`, printf pipe, fence strip); (4) `runPostProcessing()` — no exceptions; (5) deploy dist → previews host; (6) screenshot pass (desktop+mobile); (7) assemble ProofArtifact (manifest, facts_used, claims_made, costs, rollback path); (8) engine validates facts ⊆ allowed + claims vs forbidden — fail here = structural fabrication catch → regenerate once, then park.
- **Decision gates:** request-completeness gate; facts/claims validation gate; cap-utilization gate (pause queue at 80% subscription cap, notify).
- **Failure handling:** RETRY-BUILD ladder; cap exhaustion → explicit pause + notify (never silent).
- **Retry policy:** RETRY-BUILD (retry same spec → regenerate spec once → park).
- **Logs:** AgentTaskLog with cost_actual + wall-time; Proof state events.
- **Cost controls:** subscription lane ≈ $0 marginal; L1 ≤ 8 min, L2 ≤ 25 min wall-clock; nightly build quota per campaign.
- **Human review triggers:** none (WF-06 is the gate).
- **Completion criteria:** valid ProofArtifact in `qa_review`, or parked with failure_reason_enum.
- **Handoff:** WF-06 immediately.

## WF-06 — Proof QA

- **Outcome linkage:** quality improvement; risk reduction (nothing broken reaches a prospect).
- **Trigger:** Proof enters `qa_review`.
- **Responsible agents:** Quality Reviewer; Brand/Voice Guardian (copy surfaces).
- **Inputs:** ProofArtifact + qa_policy version.
- **Outputs:** qa_checklist_result; Proof `ready` | flagged | `rejected` (+ regeneration_reason).
- **State transitions:** `qa_review → ready` (pass) | back to WF-05 (regenerate) | `rejected` (park).
- **Steps:** (1) structural checks from manifest; (2) content checks (name everywhere, no placeholders, claims ⊆ facts, logo rule); (3) screenshot vision pass (mobile renders, no broken images); (4) voice spot-check on hero/CTA copy; (5) binary verdict with evidence per fail.
- **Decision gates:** ALL checklist items binary pass → `ready`; any fail → flag with evidence; ≤ 1 regeneration per proof before human park.
- **Failure handling:** reviewer error → RETRY-STD; disputes → T4 one-shot arbitration.
- **Retry policy:** RETRY-STD (review itself); RETRY-BUILD governs regeneration.
- **Logs:** AgentTaskLog; checklist result stored on Proof.
- **Cost controls:** ≤ $0.04/proof.
- **Human review triggers:** every flag → Fritz queue (mobile digest).
- **Completion criteria:** Proof is `ready`, regenerating, or parked-with-evidence.
- **Handoff:** WF-08 (outbound) or direct delivery (inbound confirmation email links the proof when ready).

## WF-07 — Claim Path QA

- **Outcome linkage:** deposit conversion (the path money travels); risk reduction.
- **Trigger:** before first-ever send (launch gate); after ANY change to claim pages, payment links, booking, onboarding form, or confirmation flow; weekly smoke run.
- **Responsible agents:** deterministic test runner + Quality Reviewer (visual pass); Fritz walks it once at launch.
- **Inputs:** a staging proof slug + test payment mode.
- **Outputs:** ClaimPathResult (pass/fail per hop) — stored; **sends are blocked while latest result ≠ GREEN.**
- **State transitions:** engine flag `claim_path_ok` true/false (global send precondition, enforced in sender choke point alongside the 7 gates).
- **Steps:** walk every hop: (1) proof page renders (mobile+desktop) → (2) claim page renders with trust block, terms/scope/revision limits, what's-included, fallback rail visible → (3) pay (test mode) AND book-a-call link → (4) confirmation page + receipt email → (5) /start onboarding reachable + submittable → (6) admin status change visible → (7) Fritz notification received.
- **Decision gates:** every hop must pass; any fail blocks sends globally.
- **Failure handling:** fail → named hop + owner notified; sends stay blocked.
- **Retry policy:** rerun on fix; no auto-retry.
- **Logs:** ClaimPathResult history; AgentTaskLog.
- **Cost controls:** deterministic; ≈ $0.
- **Human review triggers:** launch walk-through by Fritz (once); any persistent red > 4h.
- **Completion criteria:** GREEN across all 7 hops.
- **Handoff:** unblocks WF-08.

## WF-08 — Outreach Send

- **Outcome linkage:** revenue movement (the click that becomes the deposit).
- **Trigger:** Proof `ready` + lead eligible + warm-up capacity available + `claim_path_ok` GREEN.
- **Responsible agents:** Outreach Writer → Brand/Voice Guardian → Compliance/Deliverability Checker → sender choke point.
- **Inputs:** Lead + ProofArtifact + ScanFindings facts + campaign angle + template family + contact.
- **Outputs:** sent email + EmailEvent rows; Proof `sent`.
- **State transitions:** Proof `ready → sent`; Lead `proofed → contacted`.
- **Steps:** (1) Writer drafts (facts-cited, single CTA, ≤150 words); (2) Voice Guardian pass/edit; (3) Compliance Checker runs the 7 gates (deterministic first, content gate second); (4) **calibration review routing:** first 5 per campaign / high-value / flagged → Fritz queue; others proceed post-calibration; (5) sender choke point sends via Resend from previews@ within warm-up caps; (6) EmailEvent `send` written; (7) follow-up slots scheduled (day-3, day-10, ≤ 2 total, cancel on reply/claim).
- **Decision gates:** all 7 gates; warm-up cap (≤20/day wk1, ≤50/day wk2); stop-loss breaker (bounce >5% or complaint >0.1%/24h → auto-pause + page Fritz); calibration routing.
- **Failure handling:** any gate fail → park with named gate (never silent drop); send API failure → RETRY-STD then park.
- **Retry policy:** RETRY-STD on transport only; never on compliance.
- **Logs:** AgentTaskLog per draft/check/send; EmailEvents.
- **Cost controls:** draft ≤ $0.05 (T3) / $0.01 (T2 L1 lane); checker ≤ $0.005.
- **Human review triggers:** calibration set, parks, high-value, sensitive flags.
- **Completion criteria:** sent + tracked, or parked with reason.
- **Handoff:** WF-09 on reply; WF-10 on claim; follow-up scheduler otherwise.

## WF-09 — Reply Handling

- **Outcome linkage:** deposit conversion (replies are the warmest path); learning captured (best-message data).
- **Trigger:** inbound email to fritz@/hello@ matched to a contacted lead; webhook/poll on monitored inbox.
- **Responsible agents:** deterministic matcher + T2 intent tagger; Fritz for substance (custom replies are a defined human-review category).
- **Inputs:** inbound message + lead/proof context.
- **Outputs:** Lead `replied`; tagged intent (interested / question / not-now / opt-out / other); queued human action with context card.
- **State transitions:** Lead `contacted → replied`; opt-out → Contact suppressed immediately.
- **Steps:** (1) match sender → contact/lead; (2) intent tag (T2, conservative); (3) **opt-out intent → suppress instantly, confirm, stop all follow-ups** (gate, not judgment); (4) cancel pending follow-ups on any reply; (5) build context card (proof link, score, facts, draft talking points) → Fritz mobile queue; (6) record outcome after Fritz acts.
- **Decision gates:** opt-out auto-gate; everything substantive routes to human (Wave 1–2).
- **Failure handling:** unmatched sender → hello@ triage queue.
- **Retry policy:** RETRY-STD on tagging only.
- **Logs:** AgentTaskLog; EmailEvent; Lead events.
- **Cost controls:** ≤ $0.005/reply tag.
- **Human review triggers:** every non-opt-out reply (by design — replies are gold).
- **Completion criteria:** reply suppressed/answered/scheduled with outcome recorded.
- **Handoff:** WF-10 (claim/quote) or campaign learning via WF-13.

## WF-10 — Payment / Deposit

- **Outcome linkage:** revenue movement — the primary metric.
- **Trigger:** Stripe webhook; Cash App/manual confirmation; quote acceptance.
- **Responsible agents:** Payment/Onboarding Router (deterministic).
- **Inputs:** payment/booking event + proof/claim binding.
- **Outputs:** Payment record; Client created; Proof `claimed`; receipts; notifications.
- **State transitions:** Proof `clicked → claimed`; Lead `replied/contacted → claimed → client`.
- **Steps:** (1) verify signature; (2) idempotency dedupe on external_id; (3) create Payment + Client; (4) Proof → `claimed` (stops expiry + follow-ups); (5) receipt email (billing@); (6) trigger WF-11; (7) notify Fritz (loud — money events page immediately); (8) daily reconcile job sweeps for missed events.
- **Decision gates:** signature gate; unknown event shape → park; amount-mismatch → park.
- **Failure handling:** anomalies park + page; replay-safe by construction.
- **Retry policy:** queue-retry with dedupe.
- **Logs:** Payment events; AgentTaskLog.
- **Cost controls:** $0 (no LLM).
- **Human review triggers:** every anomaly; daily money digest.
- **Completion criteria:** money event reconciled to records + client exists + onboarding fired.
- **Handoff:** WF-11.

## WF-11 — Onboarding

- **Outcome linkage:** deposit→fulfillment conversion; support-burden reduction.
- **Trigger:** WF-10 completion.
- **Responsible agents:** Payment/Onboarding Router (kick) + Fulfillment Task Planner (on completion); nudges automated.
- **Inputs:** Client + package + proof manifest.
- **Outputs:** OnboardingForm record (sent→partial→complete); collected assets/answers.
- **State transitions:** Client `onboarding`; OnboardingForm `sent → partial → complete`.
- **Steps:** (1) welcome email with /start link (previews@/billing@); (2) form collects brand assets, business facts, domain preference (reseller route), campaign-specific answers; (3) partial saves; (4) nudges at 48h/96h (max 2); (5) 7-day stall → Fritz queue; (6) complete → WF-12.
- **Decision gates:** asset-completeness gate before fulfillment starts (missing logo/photos → targeted ask, not stall).
- **Failure handling:** stalled onboarding tracked as blocker, surfaces in WF-16.
- **Retry policy:** n/a (human-paced).
- **Logs:** OnboardingForm events; AgentTaskLog for nudges.
- **Cost controls:** ≈ $0.
- **Human review triggers:** 7-day stalls; unusual asset/scope requests.
- **Completion criteria:** form complete OR Fritz-approved proceed-with-gaps.
- **Handoff:** WF-12.

## WF-12 — Fulfillment

- **Outcome linkage:** revenue retention + MRR ("Grow It" promise); proof-gallery + lessons supply.
- **Trigger:** onboarding complete (or approved proceed-with-gaps).
- **Responsible agents:** Fulfillment Task Planner (checklist) → factory via WF-05-style build requests (production tier) → Quality Reviewer → Fritz handoff.
- **Inputs:** Client + ProofArtifact + package includes + onboarding answers.
- **Outputs:** launched production site; tracking installed; fulfillment Workstream completed.
- **State transitions:** Client `onboarding → active`; fulfillment Workstream `planned → active → done`.
- **Steps:** (1) Planner spawns Workstream from package template adjusted by proof manifest; (2) upgrade proof with real assets (surgical edits through Studio, `runPostProcessing` always); (3) domain/DNS via GoDaddy reseller; (4) deploy production; (5) wire forms/giving/booking embeds; (6) QA checklist (production version); (7) launch handoff email + dashboard link; (8) enroll in monthly performance report; (9) proof-gallery candidate (with permission); (10) lessons logged.
- **Decision gates:** production QA gate; client-approval gate before DNS cutover.
- **Failure handling:** blocked tasks surface via WF-16; scope creep → Fritz.
- **Retry policy:** RETRY-BUILD for builds; human-paced otherwise.
- **Logs:** Workstream task events; AgentTaskLog.
- **Cost controls:** subscription lane builds; fulfillment hours tracked per package (feeds fulfillment-complexity metric).
- **Human review triggers:** scope changes; pre-cutover approval; final launch sign-off (Wave 1–2).
- **Completion criteria:** site live on client domain + tracking verified + handoff sent + Workstream closed with lessons.
- **Handoff:** care loop (monthly reports); WF-13 metrics; WF-14 lessons.

## WF-13 — Weekly Campaign Review

- **Outcome linkage:** learning captured; revenue steering (kill/fix/scale decisions).
- **Trigger:** weekly cron (Mon 07:00 ET).
- **Responsible agents:** Analytics Tracker (scorecard) → Campaign Strategist (proposals) → Fritz (decisions).
- **Inputs:** full event log week; per-campaign metrics (§26 list); cost audit.
- **Outputs:** scorecard + cross-campaign compare + ≤ 1 ConfigChangeProposal per campaign.
- **State transitions:** Campaign config version bumps on approved proposals.
- **Steps:** (1) SQL computes every §26 metric per campaign; (2) six §26 questions answered; (3) anomalies flagged; (4) Strategist drafts proposals (sample-size guard ≥ 20 sends); (5) Fritz approves/rejects (10-min read); (6) approved changes versioned + applied; (7) day-14/day-30 kill-fix/scale rules executed on schedule.
- **Decision gates:** numbers-from-SQL-only; sample-size guard; signature-campaign fairness (churches judged on a committee-lag-adjusted window).
- **Failure handling:** data-pipeline failure → raw tables + alert; review still happens.
- **Retry policy:** RETRY-STD.
- **Logs:** scorecard archived; proposals + decisions recorded.
- **Cost controls:** ≤ $0.30/week total.
- **Human review triggers:** the review IS the human touchpoint.
- **Completion criteria:** scorecard delivered + decisions recorded + configs versioned.
- **Handoff:** config changes → WF-01..08 next cycle; lessons → WF-14.

## WF-14 — Lesson-to-Skill Promotion

- **Outcome linkage:** skill created; quality improvement compounding.
- **Trigger:** daily Librarian sweep of `lesson_candidate` flags; weekly promotion review.
- **Responsible agents:** Lessons/Skills Librarian → Fritz (promotion approval).
- **Inputs:** AgentTaskLog candidates, QA fails, rejections, claim successes.
- **Outputs:** LessonLearned records; SkillPromotionProposals; published ReusableSkills (real artifacts: `.claude/skills/` or `pipeline/` modules).
- **State transitions:** Lesson `logged → promoted | retired`; Skill `draft → active`.
- **Steps:** (1) sweep + cluster by root cause; (2) write lessons (Why/How-to-apply); (3) dedupe/retire noise; (4) promotion bar check (recurs, written trigger+steps, measurable saving); (5) weekly proposals to Fritz; (6) approved → publish artifact + version; (7) owning agent's prompts/configs updated to reference the skill.
- **Decision gates:** promotion bar; code-lesson routing (cerebrum/buglog homes respected).
- **Failure handling:** RETRY-STD.
- **Retry policy:** RETRY-STD.
- **Logs:** Lesson/Skill records; AgentTaskLog.
- **Cost controls:** ≤ $0.10/day.
- **Human review triggers:** all promotions.
- **Completion criteria:** zero unswept candidates > 48h; promoted skills actually wired into agent behavior.
- **Handoff:** improved configs/prompts feed every other workflow.

## WF-15 — Cost Audit

- **Outcome linkage:** risk reduced (silent spend), cost-per-proof metric integrity.
- **Trigger:** weekly cron; immediate on BUDGET-ALERT or cap > 80%.
- **Responsible agents:** Cost Auditor.
- **Inputs:** AgentTaskLog costs; provider usage exports; subscription-cap status.
- **Outputs:** weekly audit (cost/proof, cost/deposit, per-agent, per-model, escalation rate); alerts; routing proposals.
- **State transitions:** —.
- **Steps:** (1) roll up logged costs; (2) monthly invoice reconciliation (< 5% variance bar); (3) threshold checks (cost/proof > $1.00, agent > 2× envelope, escalation > 10%, cap > 80%); (4) routing-fix proposals with evidence (harness-first rule); (5) feed scorecard.
- **Decision gates:** alert thresholds; cap-imminent → immediate page (not weekly).
- **Failure handling:** missing provider data → raw export fallback + flag.
- **Retry policy:** RETRY-STD.
- **Logs:** audit archive; AgentTaskLog.
- **Cost controls:** self-costed ≤ $0.05/week.
- **Human review triggers:** every alert.
- **Completion criteria:** audit delivered; alerts acknowledged; variance within bar.
- **Handoff:** proposals → WF-13/Strategy Architect.

## WF-16 — Workstream Update

- **Outcome linkage:** workstream moved forward (the business-build tracker).
- **Trigger:** daily sweep; event-driven on blocker set/cleared.
- **Responsible agents:** Workstream Manager.
- **Inputs:** Workstream table; plans-system audit output.
- **Outputs:** nudges; blocker escalations; weekly rollup into scorecard.
- **State transitions:** Workstream status hygiene (`active` requires next_action).
- **Steps:** (1) sweep all workstreams; (2) stale `active` (48h no action) → batched nudge to owner; (3) blockers > 24h → escalate; > 72h → Fritz direct; (4) closeout discipline check (no zero-task actives); (5) weekly rollup.
- **Decision gates:** staleness thresholds.
- **Failure handling:** n/a (reporting workflow).
- **Retry policy:** RETRY-STD.
- **Logs:** Workstream events; AgentTaskLog.
- **Cost controls:** ≤ $0.02/day.
- **Human review triggers:** escalations only.
- **Completion criteria:** zero silent-stale workstreams.
- **Handoff:** blockers → owners; rollup → WF-13.

---

## Cross-Workflow Rules

1. **No send without:** WF-06 pass + WF-07 GREEN + all 7 gates + warm-up capacity + calibration routing honored.
2. **Every state transition** on Lead/Proof/Payment writes its domain event AND ties to a `parent_workflow_id` — the funnel is replayable.
3. **Inbound priority lane:** form leads skip the nightly cadence — classify/scan/score immediately, L2 proof queued same-day, confirmation email promises 24h.
4. **Stop-loss supremacy:** the WF-08 breaker pauses WF-08 only; WF-01..06 keep stocking the queue so recovery is instant.
5. **Open decision (owner: Fritz, next action: answer during Sprint Day 1):** monitored-inbox polling mechanism for WF-09 (GoDaddy IMAP poll vs forward-to-webhook) — D-WF1 in `review-packet-2026-06-11.md`.
