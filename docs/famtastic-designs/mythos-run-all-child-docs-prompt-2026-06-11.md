# Mythos Run-All Child Docs Prompt — FAMtastic Designs Only

_Last updated: 2026-06-11_

Use this prompt when Fritz wants Mythos to generate the remaining **FAMtastic Designs Foundation MVP planning docs** in one run, then allow Shay/ChatGPT/Fritz to do one larger review afterward.

This prompt is intentionally scoped to the FAMtastic Designs plan. It should **not** make Mythos do vendor capability research or web searches.

---

## Prompt

You have access to the GitHub repo:

`famtastic-fritz/famtastic`

Continue the **FAMtastic Designs Foundation MVP** planning work.

Do **not** start from scratch.

Do **not** perform broad vendor research or web searches in this run.

Do **not** spend premium-model time researching OpenAI, Anthropic, Google, AWS, gpt-oss, custom GPTs, or platform capabilities. That is a separate vendor-capability workstream and should be handled by search/research-specialized lower-cost workers using:

- `docs/famtastic-designs/vendor-capability-exhaustive-audit-execution-prompt-2026-06-11.md`
- `docs/famtastic-designs/vendor-capability-full-audit-prompt-2026-06-11.md`
- `docs/famtastic-designs/vendor-capability-full-audit-addendum-openai-gpt-oss-gpts-2026-06-11.md`

Your job here is only to generate the remaining FAMtastic Designs child planning docs from the existing strategy, patched plan, and agent specs.

Read these files first:

1. `docs/famtastic-designs/mythos-foundation-plan.md`
2. `docs/famtastic-designs/agents.md`
3. `docs/famtastic-designs/mythos-plan-patch-prompt-2026-06-11.md`
4. `docs/famtastic-designs/shay-handoff-chatgpt-review-2026-06-11.md`
5. `docs/famtastic-designs/foundation-findings.md`
6. `docs/famtastic-designs/infrastructure-inputs.md`
7. `docs/famtastic-designs/interviews/chatgpt-foundation-interview-2026-06-11.md`

Already created:

- `docs/famtastic-designs/mythos-foundation-plan.md`
- `docs/famtastic-designs/agents.md`

Now generate the remaining child docs through completion:

1. `docs/famtastic-designs/workflows.md`
2. `docs/famtastic-designs/campaigns.md`
3. `docs/famtastic-designs/backend.md`
4. `docs/famtastic-designs/email-system.md`
5. `docs/famtastic-designs/design.md`
6. `docs/famtastic-designs/pages.md`
7. `docs/famtastic-designs/roadmap.md`
8. `docs/famtastic-designs/review-packet-2026-06-11.md`

Do not block on missing secrets or account details. Use assumptions, placeholders, and missing-detail checklists.

---

## Core Rule

Every doc must be build-ready, not generic.

Every workflow, campaign, backend object, email rule, design rule, page rule, and roadmap item must connect back to at least one of these outcomes:

1. Revenue movement.
2. Proof generation.
3. Deposit/claim conversion.
4. Quality improvement.
5. Learning captured.
6. Skill created.
7. Workstream moved forward.
8. Risk reduced.

No section should end with vague “review later.” If unresolved, it must end with a concrete decision point, owner, and next action.

---

## Required `workflows.md`

Define exact step-by-step orchestration workflows for:

1. Lead discovery.
2. Lead classification.
3. Presence scan.
4. Lead scoring.
5. Proof generation.
6. Proof QA.
7. Claim Path QA.
8. Outreach send.
9. Reply handling.
10. Payment/deposit.
11. Onboarding.
12. Fulfillment.
13. Weekly campaign review.
14. Lesson-to-skill promotion.
15. Cost audit.
16. Workstream update.

For every workflow include:

- workflow id
- trigger
- responsible agents
- inputs
- outputs
- state transitions
- step-by-step execution
- decision gates
- failure handling
- retry policy
- logs written
- cost controls
- human review triggers
- completion criteria
- next workflow handoff

Add a master text diagram showing the whole proof-to-profit engine.

---

## Required `campaigns.md`

Define the four initial campaign configs:

1. Church Connect — signature campaign.
2. Nonprofits.
3. Local Services.
4. Professional Services.

For each campaign include:

- campaign key
- positioning
- target persona
- buyer roles
- pain points
- money/value angle
- qualified lead signals
- lead search queries
- geography rules
- proof level defaults
- required proof blocks
- forbidden claims
- personalization facts allowed
- outreach angles
- email templates/draft patterns
- proof page blocks
- offer ladder
- claim path
- booking vs pay-now rules
- fulfillment complexity
- starter scope
- upsell paths
- metrics
- review triggers
- first 25-lead test plan

Use the corrected geography:

```text
Primary: Port St. Lucie, Fort Pierce, Stuart, Treasure Coast, Palm Beach County
Secondary: Fort Lauderdale, Broward County, Miami, Miami-Dade County
Expansion: Florida statewide
Atlanta/Southeast only with specific strategic reason
```

---

## Required `backend.md`

Define build-ready backend specs for:

- Lead
- Campaign
- Proof
- PreviewPage
- Contact
- Client
- Package
- Payment
- OnboardingForm
- EmailEvent
- Workstream
- LessonLearned
- ReusableSkill
- AgentTaskLog

For each object include:

- purpose
- fields
- data types
- indexes
- relationships
- status values
- events
- admin actions
- validation rules
- API endpoints
- migration notes
- hosted plane vs orchestration plane location

Also include:

- PHP/MySQL hosted plane plan
- SQLite orchestration plane plan
- sync worker plan
- GoDaddy DB evaluation criteria
- migration seam to Neon/Supabase if needed
- auth/security model
- admin dashboard minimum views

---

## Required `email-system.md`

Define:

- email identities
- inbox vs automated sender separation
- Resend setup
- GoDaddy/Workspace mailbox setup
- DNS records: SPF, DKIM, DMARC
- compliant footer requirements
- physical mailing address placeholder
- unsubscribe/suppression handling
- bounce/complaint handling
- seven send-gates
- warm-up schedule
- reply routing
- templates
- follow-up rules
- webhook handling
- event tracking
- stop-loss thresholds
- launch-blocking checklist

No secrets.

---

## Required `design.md`

Define:

- FAMtastic definition
- FAM capitalization logic
- old logo reference rules
- temporary text/logo treatment
- color logic
- typography direction
- spacing/grid
- immersive design principles
- motion rules
- 3D rules
- performance rules
- accessibility/reduced-motion rules
- component system
- CTA rules
- proof card rules
- dashboard visual rules
- campaign visual differentiation
- forbidden cookie-cutter patterns

Remember:

- The site is an immersive digital showroom.
- It is not a normal site with a 3D hero.
- It should feel non-cookie-cutter throughout.
- Logo redesign is a separate workstream.

---

## Required `pages.md`

Define:

- route map
- public pages
- campaign pages
- private preview pages
- claim pages
- forms
- admin routes
- navigation rules
- footer rules
- SEO/meta rules
- route protection/noindex rules
- page creation rules
- section/component rules
- CTA hierarchy
- content hierarchy
- required page data fields
- page acceptance checklist

---

## Required `roadmap.md`

Turn the plan into an executable roadmap:

- 7-Day Cash Sprint
- 14-Day Deposit Push
- 30-Day Foundation MVP
- Phase 2 automation depth
- Phase 3 marketplace/app/GPT lane

For every item include:

- owner/agent
- dependency
- launch-blocking or non-blocking
- expected output
- acceptance criteria
- risk
- fallback
- revenue impact

---

## Required `review-packet-2026-06-11.md`

At the end, create a review packet with:

- files created/updated
- assumptions made
- unresolved decisions for Fritz
- risks introduced
- places you deviated from the plan and why
- build order recommendation
- what should be reviewed first
- what can proceed without review
- exact next prompt for Shay/ChatGPT

---

## Review Strategy

Yes, run all remaining FAMtastic Designs plan files to completion.

Then stop and allow one larger review.

Do not ask Fritz questions during the run unless the missing answer would radically change the whole architecture. Otherwise make the strongest reasonable assumption, label it, and keep moving.

---

## Commit Requirement

Save all files and commit/push to `origin/main`.

Use a commit message like:

`docs: generate FAMtastic Designs child planning docs`

After pushing, report:

- commit SHA
- files created/updated
- assumptions made
- unresolved decisions
- recommended next review order
