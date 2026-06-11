# FAMtastic Designs — Campaign Configurations

_Created: 2026-06-11 · Child doc #3 of `mythos-foundation-plan.md` (§34) · Campaign objects per `backend.md`; workflows per `workflows.md`_

Four campaigns, one shared Proof Engine. Each campaign below is the build spec for its `Campaign` config record (versioned as `campaign_config_version`). **Hierarchy:** Church Connect is the signature campaign; Local Services is the fast-cash lane; Nonprofits is the church-cousin; Professional Services is the high-ticket authority lane.

## Shared Geography Rules (all campaigns)

```text
Primary:   Port St. Lucie, Fort Pierce, Stuart, Treasure Coast, Palm Beach County
Secondary: Fort Lauderdale, Broward County, Miami, Miami-Dade County
Expansion: Florida statewide
Atlanta/Southeast only with a specific strategic reason (Fritz decision)
```

Ring-advance rule (WF-01): expand to Secondary only when Primary yield < 20 new leads/campaign/week. Local credibility line available in Primary outreach: Fritz is Treasure Coast-based.

## Shared Forbidden Claims (all campaigns)

- No invented metrics ("will increase giving 40%") — directional framing only ("built to make giving easier").
- No claims about the prospect not traceable to a `ScanFindings` fact.
- No fake personalization, no "I was just driving by," no implied prior relationship.
- No guarantees of rankings, traffic, or revenue.
- No disparagement of their current provider/site beyond observed facts.

## Shared Personalization Facts Policy

`source_facts_allowed_for_personalization` = facts from the lead's own ScanFindings only (site state, GBP state, social recency, livestream/giving presence, reviews count/rating, observed CTA gaps). Anything else is forbidden. Enforced structurally at WF-05 (proof) and WF-08 gate 3 (outreach).

---

## 1. Church Connect — Signature Campaign

| Field | Value |
|---|---|
| **campaign_key** | `church_connect` |
| **Positioning** | Your church already gathers support weekly. Let's make giving, streaming, events, and member connection easier all week. (NOT "churches need websites.") |
| **Target persona** | Pastor / ministry leader of a small-to-mid church (≈40–400 attendance) with outdated/no site, messy streaming, or giving friction |
| **Buyer roles** | Pastor (vision), trustee/deacon board (approval), church admin/media volunteer (operator), sometimes a sponsoring member (funder) |
| **Pain points** | Outdated/no site; livestream scattered across personal YouTube/Facebook; giving = cash/check/CashApp chaos; visitors never followed up; events by word-of-mouth; members can't find anything midweek |
| **Money/value angle** | Churches collect money weekly — easier giving + recurring giving + special campaigns compounds every single week; visitor follow-up grows attendance which grows giving |
| **Qualified lead signals** (weights v1) | no site (25) · outdated site (20) · no online giving found (20) · streaming on personal account (15) · no event calendar (10) · active FB but no site (15) · GBP missing/poor (10) · visitor page absent (5) |
| **Lead search queries** | Places: `church`, `ministry`, `iglesia`, `baptist church`, `AME church`, `church of god in christ`, `non-denominational church` × geography ring; directory: county church directories, denomination district listings |
| **Geography rules** | Shared ladder; note Primary ring has dense small-church coverage in Fort Pierce/Port St. Lucie |
| **Proof level defaults** | L1 teaser (giving + livestream + welcome blocks); L2 for score ≥ 70 or any reply; L3 only post-call |
| **Required proof blocks** | Giving button (placeholder processor) · livestream hub (their actual YouTube/FB embedded if found) · event calendar · visitor welcome + plan-a-visit · prayer request form · ministries strip · member-access teaser |
| **Forbidden claims (additional)** | No theological language beyond what their own materials use; no implied endorsement; no pressure framing around tithing |
| **Personalization facts allowed** | Shared policy + their service times, livestream platform, denomination AS STATED on their own materials |
| **Outreach angles** | A1 streaming-chaos: "your services are on [observed platform] — here's one home for watching, giving, and events." A2 no-giving: "members can already find you — observed — but there's no way to give online." A3 no-site: "your church is active on [FB] but has no online home for visitors to land." |
| **Email template pattern** | Respect-first opener citing one observed fact → one-sentence vision (week-round ministry, not Sunday-only) → proof link ("we already built a preview of what this could look like for [Church Name]") → soft CTA (look + book a call) → Fritz local line in Primary ring |
| **Proof page blocks** | §11 standard + giving-impact framing + "what your members see midweek" walkthrough |
| **Offer ladder** | Founding Church Connect setup ($199 flexible deposit + $99/mo) → Church Growth System ($499–$999 setup, giving+events+follow-up) → Digital Ministry Platform (custom: member access, paid/free event access, automation) |
| **Claim path** | **Book-a-call FIRST** (committee dynamics); pay-now available but secondary; pastor-paid deposit with church reimbursement supported; sponsor/donor-funded setup supported |
| **Booking vs pay-now** | Call-first default; pay-now only on explicit "ready now" replies |
| **Fulfillment complexity** | HIGH — phase features: site+giving link+stream embed first; member access/paid events later |
| **Starter scope** | 5-page site (home/visit/watch/give/connect) + giving link integration + livestream embed + visitor follow-up form + 1 revision round |
| **Upsell paths** | Recurring giving setup → event registration → member portal → automated visitor follow-up → church app experience → FAMtastic Hosting (domain/email) |
| **Metrics** (extra) | giving-link clicks on proofs; call-booked rate; committee cycle time |
| **Review triggers** | ALL sends human-reviewed through calibration + stricter cycle (sensitive category); any reply mentioning doctrine/money sensitivities → Fritz |
| **First 25-lead test plan** | 25 churches in Primary ring: 10 no-site, 8 outdated-site-with-streaming, 7 no-giving; L1 proofs; A1/A2/A3 angles split ~evenly; measure click + call-booked by angle; review at 25 sends before scaling |

## 2. Nonprofits

| Field | Value |
|---|---|
| **campaign_key** | `nonprofits` |
| **Positioning** | Your mission needs a clearer donation, volunteer, and event path. |
| **Target persona** | Executive director / founder of a community org (food bank, youth program, recovery ministry, animal rescue, veterans org) with weak digital presence |
| **Buyer roles** | ED/founder (decider), board (approval on larger spends), volunteer coordinator (operator), major donor (influencer) |
| **Pain points** | Donation friction (PayPal-link-buried); volunteer signup by phone tag; no event registration; credibility gap vs grant funders; impact invisible online |
| **Money/value angle** | Easier donations + recurring donors + grant-credibility; volunteer hours are money |
| **Qualified lead signals** (weights v1) | no donate button (25) · no site (20) · outdated (15) · events-no-registration (15) · FB-only (15) · GBP weak (10) |
| **Lead search queries** | Places: `nonprofit organization`, `food bank`, `community center`, `youth organization`, `animal rescue`, `veterans organization` × ring; directories: county nonprofit registries, United Way partner lists |
| **Geography rules** | Shared ladder |
| **Proof level defaults** | L1; L2 ≥ 70/inbound |
| **Required proof blocks** | Donate flow (placeholder) · volunteer signup · event registration · impact-story block · sponsor/funder credibility strip · mission hero |
| **Forbidden claims (additional)** | No fabricated impact numbers; use their stated mission language only |
| **Personalization facts allowed** | Shared policy + stated mission/programs from their own materials |
| **Outreach angles** | A1 donate-friction: "wanted to support [org] online — couldn't find the donate path." A2 events: "your [observed event] deserves easy signup." A3 credibility: "funders look you up — here's what they could see instead." |
| **Email template pattern** | Mission-respect opener with observed fact → value line (clearer path = more support) → proof link → soft CTA |
| **Proof page blocks** | §11 standard + donation-path walkthrough + volunteer-flow preview |
| **Offer ladder** | Nonprofit Growth Proof ($199 + $50/mo, discounted/sponsored tier) → Donation & Events System ($499 setup) → custom (member/donor portals, grant-friendly invoicing) |
| **Claim path** | Book-a-call default (board dynamics); pay-now for small orgs ready to move |
| **Booking vs pay-now** | Call-first ≥ $499; pay-now allowed on starter |
| **Fulfillment complexity** | MEDIUM-HIGH (donation processor + events phased) |
| **Starter scope** | 4-page site (home/mission/donate/get-involved) + donate link + volunteer form + 1 revision round |
| **Upsell paths** | Recurring donors → event registration → newsletter/follow-up automation → sponsor pages → Hosting cross-sell |
| **Metrics (extra)** | donate-click rate on proofs; volunteer-form engagement |
| **Review triggers** | Sensitive-category: calibration + stricter cycle like churches |
| **First 25-lead test plan** | 25 orgs Primary ring: 12 no-donate-path, 8 events-no-registration, 5 FB-only; angles split; review at 25 |

## 3. Local Services — Fast-Cash Lane

| Field | Value |
|---|---|
| **campaign_key** | `local_services` |
| **Positioning** | Turn local searches into calls, bookings, and jobs. |
| **Target persona** | Owner-operator: lawn care, cleaning, pressure washing, barbers/salons, trainers, detailers, handyman/contractors |
| **Buyer roles** | Owner (sole decider — fastest cycle of the four) |
| **Pain points** | Invisible on Google; FB-only presence; missed calls = lost jobs; no booking; competitors look bigger |
| **Money/value angle** | Direct: searches → calls → booked jobs, trackable; one extra job/month pays for the site |
| **Qualified lead signals** (weights v1) | no site (25) · GBP missing/weak (20) · FB-only (20) · good reviews weak web (15) — prime: proof shows what their reputation deserves · no booking/CTA (10) · not mobile-friendly (10) |
| **Lead search queries** | Places: `lawn care`, `cleaning service`, `pressure washing`, `barber shop`, `hair salon`, `personal trainer`, `auto detailing`, `handyman` × ring |
| **Geography rules** | Shared ladder; service-area framing ("serving Port St. Lucie & the Treasure Coast") in proofs |
| **Proof level defaults** | L1 (the factory sweet spot — proven verticals); L2 ≥ 70/inbound |
| **Required proof blocks** | Click-to-call (their real number) · booking CTA · reviews strip (their real rating/count) · service areas map block · before/after gallery slots · services grid |
| **Forbidden claims (additional)** | No competitor comparisons; no review-count promises |
| **Personalization facts allowed** | Shared policy + rating/review count + observed service list |
| **Outreach angles** | A1 invisible: "searched [service] in [city] — you didn't come up; here's what could." A2 reputation: "[4.8★, 120 reviews] and no website — your reputation deserves a home." A3 FB-only: "your FB page works hard; own your real home online." |
| **Email template pattern** | Direct, short (≤120 words), one observed fact → proof link → claim CTA (pay-now friendly) |
| **Proof page blocks** | §11 standard + "what a searcher sees now vs after" split |
| **Offer ladder** | Claim Your Local Proof ($199 + $50/mo) → Local Launch ($499 flat) → Bookings & Reviews System ($999, booking + review-request automation) |
| **Claim path** | **Pay-now FIRST** (deposit link on proof page); call optional |
| **Booking vs pay-now** | Pay-now default ≤ $499; call ≥ $999 |
| **Fulfillment complexity** | LOW — factory does this in its sleep (proven: barber/lawn/cleaning builds in DNA log) |
| **Starter scope** | 3-page site (home/services/contact) + click-to-call + GBP-link + contact form + 1 revision round |
| **Upsell paths** | Booking → review-request automation → missed-call text-back → monthly report care plan → Hosting |
| **Metrics (extra)** | call-click rate on proofs; time-to-deposit (expect fastest) |
| **Review triggers** | Standard calibration only (first 5) — lowest-risk category |
| **First 25-lead test plan** | 25 leads Primary ring: 10 good-reviews-no-site (highest hypothesis), 8 FB-only, 7 weak-GBP; A2 weighted; expect first deposit of the whole engine here; review at 25 |

## 4. Professional Services — Authority Lane

| Field | Value |
|---|---|
| **campaign_key** | `professional` |
| **Positioning** | One serious client can pay for the whole system. |
| **Target persona** | Tax preparers, consultants, realtors, insurance agents, coaches, niche repair specialists |
| **Buyer roles** | The professional (decider); office manager (operator) |
| **Pain points** | Looks smaller than they are; referral-dependent; no booking/lead capture; thin credibility vs big-firm competitors |
| **Money/value angle** | Average client value is high — a site that lands ONE client pays for itself multiple times |
| **Qualified lead signals** (weights v1) | no site (20) · outdated (20) · no booking (20) · good reviews weak web (15) · active-no-conversion-flow (15) · not mobile (10) |
| **Lead search queries** | Places: `tax preparation`, `accountant`, `insurance agency`, `real estate agent`, `business consultant`, `life coach`, `appliance repair` × ring |
| **Geography rules** | Shared ladder; professional density higher in Palm Beach/Broward — Secondary ring may open earlier here (Strategist proposal allowed at week 2) |
| **Proof level defaults** | L1 polished (authority aesthetic); L2 ≥ 65 (slightly lower bar — higher ticket justifies) |
| **Required proof blocks** | Authority homepage (credentials/years/designations from observed materials) · consultation CTA · lead-magnet slot · booking block · credibility strip (reviews/affiliations) · services/specialties |
| **Forbidden claims (additional)** | No credential inflation; licensure language only as observed |
| **Personalization facts allowed** | Shared policy + stated credentials/specialties from their own materials |
| **Outreach angles** | A1 authority-gap: "clients check you out before they call — here's what they find vs what they could." A2 booking: "your next client wants to book a consult at 9pm — there's no way to." A3 peer-tone: consultative, professional-to-professional |
| **Email template pattern** | Consultative, slightly longer ok (≤150 words), peer voice, observed fact → proof → consult CTA |
| **Proof page blocks** | §11 standard + client-journey walkthrough (search → trust → book) |
| **Offer ladder** | Professional Authority Site ($499–$999 flat) → Authority + Lead System ($999+, booking/lead magnet/follow-up) → custom (client portals — also the future sales-team branded-portal pattern) |
| **Claim path** | Hybrid: pay-now on flat tiers; call for custom |
| **Booking vs pay-now** | Either; consult-CTA prominent |
| **Fulfillment complexity** | MEDIUM (content/credibility polish takes human time) |
| **Starter scope** | 4-page site (home/about-credentials/services/contact-booking) + consult form + 1 revision round |
| **Upsell paths** | Lead magnet + follow-up sequence → client portal → review automation → Hosting |
| **Metrics (extra)** | consult-booked rate; average package value (expect highest) |
| **Review triggers** | Standard calibration; score ≥ 85 leads get T4 final-pass outreach review |
| **First 25-lead test plan** | 25 leads Primary+early-Secondary: 10 no-booking, 8 outdated, 7 good-reviews-weak-web; measure consult-booked + package value; review at 25 |

---

## Cross-Campaign Operations

- **Weekly compare (WF-13):** same §26 scorecard for all four; the six questions decide kill/fix/scale at day 14/30. Signature-campaign fairness: church decisions use a committee-lag-adjusted window (45 days, not 30).
- **Config versioning:** any field above changes only via ConfigChangeProposal → Fritz approval → `campaign_config_version` bump; proofs/outreach always record the version that produced them.
- **100-lead opening sprint:** the four 25-lead test plans together are Sprint Days 3–7 supply (hand-picked per WF-01 + Fritz's local knowledge, including his few personal-network candidates in Local Services).
- **Open decision (owner: Fritz, next action: Sprint Day 1):** D-C1 — confirm the church denominational mix to prioritize in Primary ring (his local knowledge beats query heuristics); D-C2 — confirm Spanish-language outreach in/out of scope for v1 (Treasure Coast/Miami rings have significant Spanish-first orgs; assumption: OUT for v1, English-only, revisit at expansion).
