# Shay Handoff — ChatGPT/CJ Review Took Over While Shay Was At Session Limit

_Date: 2026-06-11_

## Context

Shay reached session limits while reviewing the FAMtastic Designs Foundation MVP plan. ChatGPT/CJ took over the review using the same strategic logic that had been built through the interview and repo docs.

This note captures the decisions and corrections made after reviewing:

- `docs/famtastic-designs/mythos-foundation-plan-review-handoff-2026-06-11.md`
- `docs/famtastic-designs/mythos-foundation-plan.md`
- `docs/famtastic-designs/mythos-master-prompt-v2.md`
- `docs/famtastic-designs/interviews/chatgpt-foundation-interview-2026-06-11.md`
- `docs/famtastic-designs/foundation-findings.md`
- `docs/famtastic-designs/infrastructure-inputs.md`

A patch prompt was created for Mythos at:

`docs/famtastic-designs/mythos-plan-patch-prompt-2026-06-11.md`

---

## High-Level Verdict

The Mythos plan is strong and should **not** be restarted.

The correct action is:

> Keep the plan, patch it, then generate the child docs needed for execution.

The plan is structurally complete, but several corrections are needed before treating it as build-ready:

1. The existing fam-hub / Site Studio / factory pipeline should be reused, but only as a generation worker, not as the orchestration brain.
2. The generator boundary must be strengthened before build execution.
3. The stack decision should be Option A architecture with Option B launch discipline.
4. The geography should be corrected to Port St. Lucie / Treasure Coast / South Florida, not metro Atlanta.
5. Church Connect should remain the signature campaign, while 3-4 categories still run in parallel.
6. The 7-Day Cash Sprint needs missing trust/claim/payment/reply handling pieces added.
7. The plan should reduce Fritz-review bottlenecks and follow automation-first with human exception handling.
8. `agents.md` must be generated next with full per-agent methodology, not just agent names.

---

## Key Decisions Made During This Review

### 1. Do not start over

The plan has enough structure to build from. Restarting would waste momentum.

Action:

- Patch `mythos-foundation-plan.md`, or create `mythos-foundation-plan-v3.md` if preserving the current version is cleaner.

---

### 2. Factory / Site Studio / fam-hub should be used, but not as the brain

Fritz confirmed Site Studio/fam-hub has a pipeline and should be incorporated into the flow, but he has concerns:

- current flow may not be efficient enough;
- it does not yet feel like a true agent swarm;
- it should be part of the system, not the whole system.

Decision:

> Site Studio / fam-hub is a generation worker. The FAMtastic Proof Engine is the orchestrator.

The Proof Engine owns:

- campaign selection;
- lead classification;
- scan facts;
- lead scoring;
- proof level decisions;
- claim strategy;
- personalization rules;
- outreach rules;
- QA gates;
- event tracking;
- lesson capture;
- skill creation.

The factory/site studio executes proof/site generation behind a swappable boundary.

---

### 3. Strengthen `generate_proof()`

The current boundary is directionally correct but too thin.

Patch should require:

```text
ProofRequest = {
  lead_snapshot,
  campaign_key,
  campaign_config_version,
  proof_level: L1 | L2 | L3,
  scan_findings,
  source_facts_allowed_for_personalization,
  required_blocks,
  forbidden_claims,
  asset_policy,
  tone_policy,
  claim_cta_policy,
  expiration_policy,
  qa_policy,
  requester_agent,
  request_reason
}
```

and:

```text
ProofArtifact = {
  proof_id,
  generator_id,
  generator_version,
  campaign_config_version,
  pages,
  page_map,
  dist_path,
  preview_url,
  proof_manifest,
  source_facts_used,
  claims_made,
  cta_map,
  qa_checklist_result,
  screenshot_paths,
  mobile_snapshot_paths,
  build_log,
  cost_estimate,
  cost_actual,
  rollback_or_delete_path,
  regeneration_reason,
  failure_reason_enum
}
```

Reason:

- The engine needs traceability.
- Every claim must connect to a source fact.
- Weak outputs need failure reasons.
- Rebuilds/regenerations need a reason.
- QA needs artifacts to inspect.

---

### 4. Stack decision: Option A architecture, Option B launch discipline

Decision:

> Architecture: Option A. Launch discipline: Option B.

Meaning:

- Use Next.js / React / R3F / GSAP / component foundation from the start.
- Use Vercel for the immersive showroom unless Mythos has a strong reason not to.
- Ship Tier-1 immersion first: motion, scroll, workflow visuals, proof cards, dashboard visuals.
- Do not wait for the full R3F 3D entry scene to collect deposits.
- Do not downgrade to a disposable landing page.

This preserves the non-cookie-cutter foundation while keeping the cash sprint alive.

---

### 5. Geography correction

The previous plan's default geography pointing to metro Atlanta was wrong for Fritz's real base.

Correct default:

```text
Primary:
- Port St. Lucie
- Fort Pierce
- Stuart
- Treasure Coast
- Palm Beach County

Secondary:
- Fort Lauderdale
- Broward County
- Miami
- Miami-Dade County

Expansion:
- Florida statewide
- Atlanta / Southeast only if there is a specific strategic reason later
```

Reason:

- Fritz is based in Port St. Lucie / Treasure Coast.
- Fort Lauderdale and Miami are major South Florida markets.
- These areas make sense for churches, nonprofits, professional services, and local businesses.

---

### 6. Church Connect remains the signature campaign

Decision:

- Run 3-4 campaigns in parallel.
- Do not put all eggs in one basket.
- But Church Connect should remain the distinctive FAMtastic thesis.

Church logic:

- churches collect money weekly;
- digital giving, events, streaming, member access, and visitor follow-up can support real money/engagement paths;
- this is less generic than the overused lawn-care/barber agency target list.

Campaign hierarchy:

1. Church Connect — signature campaign / differentiation.
2. Nonprofits — close cousin to churches.
3. Local Services — proven fast-cash lane.
4. Professional Services — higher-ticket authority lane.

---

### 7. Campaign angles sharpened

Use these as the next `campaigns.md` seed:

| Campaign | Better angle | First proof should show | Offer |
|---|---|---|---|
| Church Connect | Your church already gathers support weekly. Let’s make giving, streaming, events, and member connection easier all week. | Giving button, livestream hub, event registration, visitor follow-up, prayer request, member access | Founding Church Connect setup + flexible deposit |
| Nonprofits | Your mission needs a clearer donation, volunteer, and event path. | Donate, volunteer, event signup, sponsor credibility, impact story | Nonprofit Growth Proof + donation/event setup |
| Local Services | Turn local searches into calls, bookings, and jobs. | Click-to-call, booking, reviews, service areas, before/after gallery | Claim your local business proof |
| Professional Services | One serious client can pay for the whole system. | Authority homepage, consultation CTA, lead magnet, booking, credibility blocks | Professional Authority Site |

---

### 8. Cash Sprint needs claim-path QA

Before outreach sends, the claim path must work:

```text
proof page → claim page → pay/book → confirmation → onboarding/start → admin status change → Fritz notification
```

Missing pieces that need to be patched into the plan:

- trust proof / credibility block;
- “Why FAMtastic / Why Fritz / Why this is real” block;
- clear claim terms;
- scope limits;
- revision limits;
- what happens after deposit;
- what is and is not included;
- book-a-call path for churches/nonprofits/professional services;
- reply routing;
- monitored inbox / reply handling;
- payment fallback clarity;
- compliant footer with physical mailing address placeholder;
- privacy/terms basics;
- success confirmation flow after payment.

---

### 9. Fritz review bottleneck should be reduced

The prior plan implied Fritz reviews the first 50 sends and all church sends. That is too much for Fritz's reality.

Patch to:

```text
Wave 1:
- Fritz reviews the first 5 sends per campaign.
- Fritz reviews high-value church/system leads.
- Fritz reviews anything flagged by QA, compliance, sensitive-language, uncertainty, or high-risk gates.
- AI quality review handles normal cases after calibration.

Wave 2:
- Fritz reviews flags/exceptions only.
- Auto-send remains blocked until graduation criteria are met.

Wave 3:
- Auto-send allowed only for L1 low-risk proofs that pass all gates and meet confidence thresholds.
- Church/nonprofit may keep a stricter review cycle longer if data shows risk.
```

This better reflects Fritz's automation-first requirement.

---

### 10. Launch-blocking changes

Add to launch-blocking:

- deposit path works end-to-end;
- booking link works for churches/nonprofits/professionals;
- claim terms / scope limits are visible;
- proof links private, fast, and mobile-correct;
- seven send-gates enforced;
- SPF/DKIM/DMARC verified;
- suppression/unsubscribe honored;
- physical mailing address placeholder/solution for compliant footer;
- privacy/terms basics;
- reply routing to monitored inbox;
- QA checklist gating sends;
- core metrics captured;
- mobile-friendly review queue or review digest for Fritz;
- Lighthouse performance threshold on public pages.

Non-blocking:

- 3D entry scene polish;
- proof gallery breadth;
- auto-send;
- admin UI polish;
- monthly report automation;
- deeper routing experiments;
- full client portal.

---

### 11. `agents.md` must be generated next and must be operational

The existing plan has a good agent map, but it is not enough for execution.

`agents.md` must define every agent as an operating unit:

- Agent name.
- Mission.
- What it is allowed to decide.
- What it is not allowed to decide.
- Inputs.
- Output schema.
- Step-by-step methodology.
- Best model/tool.
- Cheaper fallback model/tool.
- Cost budget.
- Quality checklist.
- Failure modes.
- Retry rules.
- Escalation triggers.
- Human review triggers.
- Logs/events it must write.
- Metrics that prove it worked.
- Lesson Learned triggers.
- Reusable Skill output after success.

Shared task log schema:

```text
AgentTaskLog = {
  task_id,
  parent_workflow_id,
  agent_name,
  campaign_key,
  lead_id,
  proof_id,
  model_or_tool,
  cost_estimate,
  cost_actual,
  input_refs,
  output_refs,
  decision_summary,
  confidence,
  qa_result,
  failure_reason,
  fallback_used,
  human_review_required,
  lesson_candidate,
  skill_candidate,
  created_at,
  completed_at
}
```

Purpose:

Fritz must be able to answer:

- Which agent did this?
- What model/tool did it use?
- Why was output weak?
- What should replace it?
- Did quality improve?
- What lesson did we learn?
- What skill/workflow should be created?

---

## Files Created During This Handoff

ChatGPT/CJ created:

`docs/famtastic-designs/mythos-plan-patch-prompt-2026-06-11.md`

This is the prompt Mythos should pull in and execute to patch the plan.

---

## Recommended Next Move for Shay

When Shay returns:

1. Pull latest `origin/main`.
2. Read this handoff.
3. Have Mythos execute:

```text
docs/famtastic-designs/mythos-plan-patch-prompt-2026-06-11.md
```

4. Do not restart the plan.
5. Patch the plan, then create `agents.md` as the next child doc.
6. After `agents.md`, generate the other child docs in build order.

---

## Final CJ Note

Same brain, same direction: do not let this become a pretty plan with no engine. The next real unlock is operationalizing the swarm and claim path.

The plan is strong. Patch it. Then build.
