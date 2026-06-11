# Mythos Plan Patch Prompt — FAMtastic Designs Foundation MVP

_Last updated: 2026-06-11_

Use this prompt to have Mythos revise `docs/famtastic-designs/mythos-foundation-plan.md` without starting over. This patch prompt reflects ChatGPT/CJ's review after Shay hit her session limits and Fritz asked for the plan to be tightened.

---

## Prompt to Mythos

You have access to the GitHub repo:

`famtastic-fritz/famtastic`

Do **not** start from scratch.

Your job is to patch and tighten the existing plan:

`docs/famtastic-designs/mythos-foundation-plan.md`

Read these files first:

1. `docs/famtastic-designs/mythos-master-prompt-v2.md`
2. `docs/famtastic-designs/mythos-foundation-plan-review-handoff-2026-06-11.md`
3. `docs/famtastic-designs/mythos-foundation-plan.md`
4. `docs/famtastic-designs/interviews/chatgpt-foundation-interview-2026-06-11.md`
5. `docs/famtastic-designs/foundation-findings.md`
6. `docs/famtastic-designs/infrastructure-inputs.md`
7. `docs/famtastic-designs/shay-handoff-chatgpt-review-2026-06-11.md`

Then revise `docs/famtastic-designs/mythos-foundation-plan.md` in place or create a clearly marked revised version if you prefer:

`docs/famtastic-designs/mythos-foundation-plan-v3.md`

If you create v3, explain why and leave the original untouched.

---

## Mission

The current plan is structurally strong. Keep it.

Do **not** rewrite the whole thing. Patch it with the corrections below.

The goal is to preserve the existing plan while making it more aligned with Fritz's real constraints:

- funds are needed now;
- the build cannot become a generic agency funnel;
- FAMtastic Designs must be automation-first, not manual-first;
- the existing fam-hub / Site Studio / factory pipeline should be incorporated, but it must not become the brain of the system;
- the system must be a trackable agent swarm with clear methodology, not just a list of agent names;
- the site must be an immersive foundation, not just a landing page and not merely a normal site with a 3D hero;
- the first markets should reflect Fritz's real geography and market instincts.

---

## Required Corrections

### 1. Keep factory-as-backend, but strengthen the generator boundary

The plan's A1 decision is correct: use the existing fam-hub / Site Studio / factory pipeline as the v1 proof-generation worker because it already exists and can produce site proofs cheaply.

But the factory must not be the orchestration brain.

Patch the plan so the Proof Engine owns:

- campaign selection;
- lead classification;
- scan facts;
- lead scoring;
- proof level decision;
- claim strategy;
- personalization rules;
- outreach rules;
- QA gates;
- event tracking;
- lesson capture;
- skill creation.

The factory/site studio should only execute proof/site generation behind a boundary.

Strengthen the current `generate_proof()` boundary.

Current concept:

```text
generate_proof(lead, campaign, scan_findings) → ProofArtifact
```

Revise it to require a more explicit input/output contract.

Required input contract:

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

Required output contract:

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

Add this principle explicitly:

> Site Studio / fam-hub is a generation worker. The FAMtastic Proof Engine is the orchestrator.

---

### 2. Confirm stack decision: Option A architecture, Option B launch discipline

Keep the plan's Option A stack:

- Next.js App Router;
- React Three Fiber / drei;
- GSAP / motion layer;
- Tailwind or equivalent component styling;
- Vercel for the immersive showroom;
- static factory output for proof previews;
- GoDaddy PHP/MySQL as the hosted plane if it passes evaluation;
- local orchestration first, VPS later.

But patch the sequencing language to say:

> Architecture: Option A. Launch discipline: Option B.

Meaning:

- use the proper Next.js/component foundation from the start;
- ship Tier-1 immersion first;
- do not wait for the full 3D entry scene before collecting deposits;
- use motion, scroll, workflow visuals, proof cards, and dashboard visuals to create immersive experience while the R3F scene matures;
- do not downgrade to a throwaway landing page.

The MVP should remain a **FAMtastic Designs Foundation MVP**, not a landing page.

---

### 3. Patch geography / first-market targeting

The current plan's suggested outreach geography incorrectly points toward metro Atlanta.

Replace it.

Fritz's real default geography should be:

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

- Fritz is based in the Port St. Lucie / Treasure Coast area.
- Fort Lauderdale and Miami are major South Florida markets with strong potential for churches, nonprofits, professional services, and local businesses.
- The first geographic plan should reflect the region Fritz can credibly understand and reference.

Update the Missing Details Checklist and campaign lead-discovery assumptions accordingly.

---

### 4. Keep Church Connect as the signature campaign

The plan is right to run 3-4 campaigns in parallel. Do not put all eggs in one basket.

However, Church Connect should remain the distinctive FAMtastic thesis, not just one equal card among four.

Patch campaign language so:

- Church Connect is the signature campaign / flagship proof of differentiation.
- Local services remain the proven fast-cash lane.
- Nonprofits are a close cousin to churches.
- Professional services are the higher-ticket authority lane.

Do not bury Fritz's gut insight: churches collect money weekly, and FAMtastic can show how digital giving, streaming, events, member access, visitor follow-up, and mobile connection can support giving, attendance, and engagement.

Sharpen campaign angles:

| Campaign | Better angle | First proof should show | Offer |
|---|---|---|---|
| Church Connect | Your church already gathers support weekly. Let’s make giving, streaming, events, and member connection easier all week. | Giving button, livestream hub, event registration, visitor follow-up, prayer request, member access | Founding Church Connect setup + flexible deposit |
| Nonprofits | Your mission needs a clearer donation, volunteer, and event path. | Donate, volunteer, event signup, sponsor credibility, impact story | Nonprofit Growth Proof + donation/event setup |
| Local Services | Turn local searches into calls, bookings, and jobs. | Click-to-call, booking, reviews, service areas, before/after gallery | Claim your local business proof |
| Professional Services | One serious client can pay for the whole system. | Authority homepage, consultation CTA, lead magnet, booking, credibility blocks | Professional Authority Site |

---

### 5. Patch the 7-Day Cash Sprint

The current 7-Day Cash Sprint is close, but missing key conversion pieces between proof delivery and deposit collection.

Add a required **Claim Path QA** before outreach sends.

No proof outreach should send unless this path works:

```text
proof page → claim page → pay/book → confirmation → onboarding/start → admin status change → Fritz notification
```

Add these missing launch-blocking items:

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

Patch sprint sequence so Day 2 includes not just a shell, but a working conversion path.

Suggested revised Day 2 outcome:

```text
Claimable shell + claim path QA:
- preview/landing shell live;
- pricing/claim options visible;
- Stripe Payment Link or fallback live;
- booking link live;
- post-payment confirmation live;
- onboarding/start form or temporary onboarding intake live;
- admin status change or manual status tracker live;
- support/reply inbox confirmed.
```

---

### 6. Reduce Fritz review bottleneck

The plan currently implies Fritz reviews the first 50 sends and all church sends. That is safer, but it conflicts with Fritz's automation-first constraint and active obligations.

Patch it to a calibration-first model:

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

Keep the F → A principle: AI review first, then auto-send later once proven.

---

### 7. Move additional items into launch-blocking

Patch section 36 so launch-blocking includes:

- deposit path works end-to-end;
- booking link works for churches/nonprofits/professionals;
- claim terms / scope limits are visible;
- proof links private, fast, and mobile-correct;
- 7 send-gates enforced;
- SPF/DKIM/DMARC verified;
- suppression/unsubscribe honored;
- physical mailing address placeholder/solution for compliant footer;
- privacy/terms basics;
- reply routing to monitored inbox;
- QA checklist gating sends;
- core metrics captured;
- mobile-friendly review queue or review digest for Fritz;
- Lighthouse performance threshold on public pages.

Non-blocking can include:

- 3D entry scene polish;
- proof gallery breadth;
- auto-send;
- admin UI polish;
- monthly report automation;
- deeper routing experiments;
- full client portal.

---

### 8. Generate agents.md next with full methodology, not just agent names

The current plan has a good agent map, but it is not yet executable enough.

You must either:

1. expand the plan's agent section enough to satisfy this requirement, or
2. create the next doc immediately after patching the plan:

`docs/famtastic-designs/agents.md`

That file must define every agent as an operating unit, not just a role.

For each agent, include:

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

Also create or specify a shared agent task log schema:

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

This is critical. Fritz wants to be able to say:

- which agent did this;
- what model/tool did it use;
- why was output weak;
- what should replace it;
- did quality improve;
- what lesson did we learn;
- what skill/workflow should be created.

---

### 9. Add specific workflow methodology docs after agents.md

After `agents.md`, generate:

1. `docs/famtastic-designs/workflows.md`
2. `docs/famtastic-designs/campaigns.md`
3. `docs/famtastic-designs/backend.md`
4. `docs/famtastic-designs/email-system.md`
5. `docs/famtastic-designs/design.md`
6. `docs/famtastic-designs/pages.md`

Do not treat these as generic docs. They should be build-ready specifications.

Minimum `workflows.md` workflows:

- lead discovery;
- lead scoring;
- presence scan;
- proof generation;
- proof QA;
- claim path QA;
- outreach send;
- reply handling;
- payment/deposit;
- onboarding;
- fulfillment;
- weekly campaign review;
- lesson-to-skill promotion.

Each workflow should include:

- trigger;
- steps;
- responsible agent;
- required inputs;
- produced outputs;
- decision gates;
- failure handling;
- logs written;
- cost controls;
- human review triggers;
- completion criteria.

---

## Final Instruction to Mythos

Patch the current plan. Do not restart.

Then either:

1. update `docs/famtastic-designs/mythos-foundation-plan.md` directly, or
2. create `docs/famtastic-designs/mythos-foundation-plan-v3.md` if you want to preserve the current version.

After patching the plan, create the next build-critical child doc:

`docs/famtastic-designs/agents.md`

Make it operational, not conceptual.

Then stop and report:

- which files were changed or created;
- which assumptions were changed;
- what decisions still need Fritz;
- what should happen next.

Do not ask Fritz for secrets. Use placeholders and missing-detail checklists.
