# FAMtastic Designs — Email System

_Created: 2026-06-11 · Child doc of mythos-foundation-plan.md (§34 item 5)_

This is the build-ready specification for all email infrastructure in the Foundation MVP. It is the operating environment for the Compliance/Deliverability Checker (agents.md §2.8) and the Outreach Writer (agents.md §2.7). Everything here unblocks day-1 DNS work (Cash Sprint day 1, plan §31).

**Domain assumption:** `famtasticdesigns.com` is owned or acquirable via the GoDaddy reseller account. **Decision point D1** — confirm domain + DNS state before Wave 1 day 2. Owner: Fritz. Next action: check the reseller account; if unavailable, fall back to a domain Fritz already holds and 301 later.

**No secrets in this doc — ever.** Env-var placeholders only (plan §25):

```bash
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
DATABASE_URL=
GODADDY_API_KEY=
GODADDY_API_SECRET=
```

---

## 1. Email Identities (plan §14 — reproduce exactly)

| Address | Purpose | Sender display | System |
|---|---|---|---|
| `hello@famtasticdesigns.com` | Human-facing general | FAMtastic Designs | GoDaddy/Workspace inbox |
| `fritz@famtasticdesigns.com` | Personal outreach + replies | Fritz at FAMtastic Designs | GoDaddy/Workspace inbox |
| `previews@famtasticdesigns.com` | Proof delivery/outreach | FAMtastic Designs | Resend (replies route to fritz@) |
| `billing@famtasticdesigns.com` | Payment/receipts | FAMtastic Designs Billing | Resend |
| `notify@famtasticdesigns.com` | System notifications (to Fritz) | FAMtastic Notify | Resend |
| `support@famtasticdesigns.com` | Support (Wave 3) | FAMtastic Support | GoDaddy inbox |

**Hard rules:**

- Friendly display names always — e.g. `Fritz at FAMtastic Designs <fritz@famtasticdesigns.com>`.
- **Never** `agent@` or robotic senders on first contact.
- Reply-To on every automated send points at a monitored human inbox (`fritz@` for outreach/proof delivery, `hello@` for general).

## 2. Inbox vs Automated Sender Separation

Two planes, deliberately separated so reputation problems never cross:

| Plane | Addresses | Sends via | Receives via |
|---|---|---|---|
| **Human inboxes** | hello@, fritz@, support@ (W3) | GoDaddy/Workspace webmail/IMAP (manual) | Real mailboxes |
| **Automated senders** | previews@, billing@, notify@ | Resend API (`RESEND_API_KEY`) | No mailbox — Reply-To routes to human plane |

Within the automated plane, a second separation: **transactional (billing@, notify@) is isolated from outreach (previews@)** so receipts and system mail never share outreach reputation. If Resend plan limits allow, use separate sending subdomains or at minimum separate from-addresses with distinct tracking; outreach volume discipline (§11) applies only to previews@.

## 3. Resend Setup

The Resend key exists (plan §24) — verify the domain on day 1.

1. Add domain `famtasticdesigns.com` in the Resend dashboard → Domains.
2. Resend issues DKIM CNAME/TXT records + an SPF include — add them at GoDaddy DNS (§5).
3. Verify domain; status must read **Verified** before any send.
4. Create API key, store as `RESEND_API_KEY` in `.env.local` (gitignored) and the platform vault (`platform/vault/vault.sh`) — never in the repo.
5. Configure the webhook endpoint (§15) and store the signing secret as `RESEND_WEBHOOK_SECRET`.
6. Confirm plan limits (daily/monthly send caps) and record them in `vendor-capability-matrix.md` — they bound the warm-up ceiling, not the other way around.

All automated sends go through the existing PHP Resend pattern (`mbsh-reunion/backend/resend.php` reference) or the Resend SDK from the pipeline — but **only** via `pipeline/lib/sender.py` for outreach (§9).

## 4. GoDaddy / Workspace Mailbox Setup

**Decision point D5** — GoDaddy mailbox vs Google Workspace for human inboxes. Default: **GoDaddy** (already paid). Owner: Fritz. Next action: provision on day 1; switch to Workspace only if GoDaddy mailbox provisioning proves worse (plan §22).

1. Provision `hello@` and `fritz@` mailboxes in the GoDaddy account (support@ deferred to Wave 3).
2. Set display names: "FAMtastic Designs" (hello@), "Fritz at FAMtastic Designs" (fritz@).
3. Add both to Fritz's mail client (phone + desktop) — fritz@ is the monitored reply inbox and must be checked daily during Waves 1–2.
4. Note the GoDaddy mail SPF include and DKIM selector — both must coexist with Resend's records in §5.

## 5. DNS Records — SPF / DKIM / DMARC

All literal values below are **placeholders** — replace with the exact values issued by GoDaddy mail setup and the Resend dashboard. SPF must include **both** GoDaddy mail and Resend; DKIM keys for **both** systems.

```dns
; --- SPF (one record only — never two SPF TXT records on the same host)
famtasticdesigns.com.  TXT  "v=spf1 include:secureserver.net include:_spf.resend.com ~all"

; --- DKIM for Resend (values copied from Resend dashboard after adding the domain)
resend._domainkey.famtasticdesigns.com.  TXT  "p=RESEND_DKIM_PUBLIC_KEY_PLACEHOLDER"
; (Resend may instead issue CNAMEs, e.g.:)
; resend._domainkey.famtasticdesigns.com.  CNAME  resend._domainkey.PLACEHOLDER.resend.com.

; --- DKIM for GoDaddy mail (selector per GoDaddy mail setup)
godaddy._domainkey.famtasticdesigns.com.  TXT  "p=GODADDY_DKIM_PUBLIC_KEY_PLACEHOLDER"

; --- DMARC (start at p=none with rua reporting)
_dmarc.famtasticdesigns.com.  TXT  "v=DMARC1; p=none; rua=mailto:notify@famtasticdesigns.com; fo=1; adkim=r; aspf=r"
```

**DMARC ladder (launch-blocking sequence):**

| Stage | Policy | Condition to advance |
|---|---|---|
| 1 (day 1) | `p=none` + `rua` reporting to notify@ | — |
| 2 | `p=quarantine` | 2 clean weeks of DMARC reports (no legitimate-source failures) |
| 3 (later) | `p=reject` | Sustained clean reports after quarantine; not an MVP requirement |

**Verification (day 1, before any send):** `dig TXT famtasticdesigns.com`, `dig TXT _dmarc.famtasticdesigns.com`, `dig TXT resend._domainkey.famtasticdesigns.com`; Resend dashboard shows Verified; send a probe to a Gmail seed address and confirm SPF/DKIM/DMARC all `pass` in the "Show original" headers. SPF/DKIM/DMARC verified is **launch-blocking** (plan §36).

## 6. Compliant Footer Requirements (CAN-SPAM, plan §27)

Every outreach and proof-delivery email carries this footer. The sender system injects it — the Outreach Writer leaves footer/opt-out slots empty by contract (agents.md §2.7 methodology step 5).

```html
<div class="email-footer">
  <p>FAMtastic Designs · {{PHYSICAL_MAILING_ADDRESS}}</p>
  <p>You're receiving this because {{REASON_FOR_OUTREACH}}.</p>
  <p><a href="{{UNSUBSCRIBE_URL}}">Unsubscribe</a> — one click, honored immediately and permanently.</p>
</div>
```

Requirements (all enforced by send-gate 7):

- Accurate header/from — the from-address and display name truthfully identify FAMtastic Designs.
- Non-deceptive subject line.
- Physical postal address present (§7).
- Visible, working unsubscribe, honored immediately and permanently.
- No harvested-via-prohibited-means lists; no purchased lists (plan §25).
- **Truthfulness rule (stronger than the law):** every claim in the body traceable to a scan fact; directional language only ("could help increase giving"), never invented metrics ("will increase giving 40%").
- **Email-only channel:** no SMS (TCPA risk), no automated DMs, no scraping behind logins.
- **Geography assumption A4:** US-only outreach at MVP; geography filter enforced upstream (CASL/GDPR rules are stricter if Canada/EU prospects enter).

Transactional mail (receipts, notify digests) also carries the address + identity lines; unsubscribe link required on anything marketing-adjacent (onboarding nudges, monthly reports include a preference link).

## 7. Physical Mailing Address Placeholder

`{{PHYSICAL_MAILING_ADDRESS}}` is currently **unresolved** (plan §32 open item) and is **launch-blocking** (plan §36: "physical mailing address placeholder/solution in compliant footer"). Options: Fritz's business address, a UPS Store mailbox, or a virtual-address service.

**Decision point:** choose the address solution. Owner: Fritz. Next action: pick and set the value as a single config key (`EMAIL_PHYSICAL_ADDRESS` in the hosted API config) before Cash Sprint day 4 (first outreach send). Gate 7 fails closed if the value is empty.

## 8. Unsubscribe / Suppression Handling

- Unsubscribe link → hosted endpoint (PHP API, mbsh-reunion pattern): one click sets `Contact.opt_out=true`, `suppression_reason=unsubscribe`, status `unsubscribed` — no confirmation friction.
- Add `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers on all outreach sends.
- **The suppression list is permanent — never pruned** (plan §25). Restoration is an explicit admin action only (Contact admin: suppress/restore, plan §13) and never automatic.
- Suppression sources: unsubscribe click, hard bounce, complaint, manual admin suppress, reply containing opt-out language (parked for Fritz to confirm, then suppressed).
- Gate 4 checks the suppression list on **every** send; gate errors default to FAIL/park.

## 9. The Seven Send-Gates (plan §14 — verbatim, hard requirement)

> **The seven-gate send rule (hard requirement — enforced in `pipeline/lib/sender.py`, the single choke point):** no outreach leaves without (1) source recorded, (2) reason-for-outreach recorded, (3) personalized context present, (4) suppression check, (5) duplicate check (no contact emailed twice in 30 days without a reply), (6) deliverability check (syntax/MX/disposable), (7) compliance check (§27: accurate from/subject, physical address, working opt-out). Any gate fails → draft parked for review, never silently dropped.

Implementation notes (agents.md §2.8):

| # | Gate | Check | Type |
|---|---|---|---|
| 1 | Source recorded | `Lead.source` present on the draft's lead | deterministic |
| 2 | Reason-for-outreach recorded | reason field present and non-empty | deterministic |
| 3 | Personalized context present | `personalization_facts_used` ⊆ `source_facts_allowed_for_personalization` and non-empty | deterministic + Haiku content check |
| 4 | Suppression check | Contact not on the permanent suppression list | deterministic |
| 5 | Duplicate check | no send to this contact in the last 30 days without a reply | deterministic (send history) |
| 6 | Deliverability check | syntax valid, MX resolves, not a disposable domain | deterministic |
| 7 | Compliance check | accurate from/subject, physical address present, working opt-out link | deterministic + Haiku subject-accuracy check |

- `sender.py` is structurally the **only** code path that can send outreach — no bypass exists.
- **Gates default to FAIL on any error** (lookup timeout, missing field, DNS hiccup) → draft parked with the named gate. Never retried into a pass; never silently dropped.
- Every park goes to Fritz's review queue (notify@ digest + admin queue).
- Output is the `GateResult` record (agents.md §2.8) logged with the EmailEvent.

## 10. Reply Routing

- All outreach/proof-delivery sends from `previews@` set `Reply-To: Fritz at FAMtastic Designs <fritz@famtasticdesigns.com>`.
- fritz@ is the monitored inbox — Fritz works it daily during Waves 1–2 (plan §37 commitment 1); this is **launch-blocking** ("reply routing to a monitored inbox", plan §36).
- A reply from a contact: (a) stops the follow-up sequence for that proof immediately, (b) resets the 30-day duplicate clock context (gate 5 allows re-contact after a reply), (c) sets `Lead.status=replied`. Wave 1: Fritz marks replies manually in admin; Wave 2: a reply-detection sweep assists.
- billing@ receipts set `Reply-To: hello@`; notify@ is one-way to Fritz.
- Opt-out language in a reply → park for Fritz → suppress (§8).

## 11. Warm-Up Schedule

Cold-start the domain gently (plan §14). Outreach (previews@) only — transactional volume (billing@/notify@) is not counted against these caps but stays naturally low.

| Day | Max outreach sends | Notes |
|---|---|---|
| 1–2 | 0 | DNS propagation, Resend verification, seed-address header checks |
| 3 | 10 | First proof batch sends — all Fritz-calibrated (first 5 per campaign) |
| 4 | 15 | |
| 5–7 | 20/day | Week-1 ceiling: **≤ 20/day** |
| 8–10 | 30/day | Only if metrics clean (bounce < 5%, complaints < 0.1%, no spam-folder reports from seeds) |
| 11–14 | 50/day | Week-2 ceiling: **≤ 50/day** |
| 15+ | scale gradually | Increase ~25%/week **only on clean metrics**; any stop-loss event resets to the prior week's cap |

Caps are enforced in code at the sender (daily counter per identity), not by convention. Mixed-quality lists never go out during warm-up — gate 6 plus hand-picked Cash Sprint leads keep early bounces near zero.

## 12. Stop-Loss Thresholds

> **Bounce > 5% OR complaint > 0.1% in any 24h window → engine auto-pauses outreach and pages Fritz** (plan §27).

- Computed continuously from EmailEvent rows (rolling 24h window, per-identity and overall).
- Auto-pause = sender refuses all outreach sends (transactional unaffected); state visible in admin; resume is a manual Fritz action after diagnosis.
- Page = immediate notify@ email + the loudest available channel (same posture as payment anomalies).
- The Analytics Tracker also flags stop-loss **proximity** (≥ 80% of threshold) on the weekly scorecard before it trips.

## 13. Templates

All templates: footer/opt-out slots injected by the send system (§6); personalization slots filled only from `source_facts_allowed_for_personalization`; first-touch ≤ 150 words, single CTA (agents.md §2.7).

| # | Template | Purpose | From | Trigger (plan §24) |
|---|---|---|---|---|
| 1 | Proof delivery | "Your FAMtastic preview is ready" + private link | previews@ (Reply-To fritz@) | proof `ready` + send approved |
| 2 | Cold outreach | Campaign-specific first touch, per-campaign pattern slots | previews@ (Reply-To fritz@) | engine schedule, warm-up limited, 7-gate checked |
| 3 | Follow-up 1 | Day-3 value-add nudge | previews@ (Reply-To fritz@) | proof `sent` + unclicked, day 3 |
| 4 | Follow-up 2 | Day-10 last-call before proof expiry | previews@ (Reply-To fritz@) | proof `sent` + unclaimed, day 10 |
| 5 | Inbound confirmation | "Your FAMtastic preview is being built — link within 24h" | previews@ | /preview form submit |
| 6 | Receipt | Payment confirmation | billing@ | Stripe/Cash App event |
| 7 | Onboarding welcome | Welcome + /start link | billing@ (or previews@) | claim/payment confirmed |
| 8 | Onboarding nudge | Finish your /start form | previews@ | onboarding form partial at 48h / 96h |
| 9 | Monthly performance report | Client stats (visits, calls/clicks, form fills) | previews@ | cron, monthly per client |
| 10 | System notify digest | Flags, parks, deposits → Fritz | notify@ | engine events (batched digest) |

### 13.1 Proof delivery

```text
From: Fritz at FAMtastic Designs <previews@famtasticdesigns.com>
Reply-To: fritz@famtasticdesigns.com
Subject: {{business_name}} — your preview is ready

Hi {{first_name_or_role}},

The preview we built for {{business_name}} is ready. It's private, live,
and clickable — not screenshots:

{{preview_url}}

It shows {{one_line_from_proof_blocks — e.g. "your giving page, event
registration, and visitor welcome flow"}}.

{{cta_line — e.g. "Take a look — if it fits, claiming it takes two minutes."}}

— Fritz
[FOOTER INJECTED BY SENDER]
```

### 13.2 Cold outreach (per-campaign pattern slots)

```text
From: Fritz at FAMtastic Designs <previews@famtasticdesigns.com>
Reply-To: fritz@famtasticdesigns.com
Subject: {{non_deceptive_subject — references the observed fact or the preview}}

Hi {{first_name_or_role}},

{{OBSERVED_SPECIFIC — one fact from personalization_facts_used, cited from
the scan. e.g. "I noticed {{business_name}}'s site doesn't work on mobile" /
"your livestream link on Facebook points to a stream from last year"}}

{{CAMPAIGN_ANGLE — the §9 sharpened angle slot:
  church:        "Your church already gathers support weekly. Let's make
                  giving, streaming, events, and member connection easier
                  all week."
  nonprofit:     "Your mission needs a clearer donation, volunteer, and
                  event path."
  local_service: "Turn local searches into calls, bookings, and jobs."
  professional:  "One serious client can pay for the whole system."}}

{{BRIDGE_TO_PROOF — "So we built you a preview — your {{org_type}},
already transformed: {{preview_url}}"}}

{{SINGLE_CTA — "Want the full preview?" (L1) / "Take a look and tell me
what I got wrong." }}

— Fritz
[FOOTER INJECTED BY SENDER — includes reason-for-outreach line]
```

### 13.3 Follow-up 1 (day-3 nudge — value-add, never nagging)

```text
Subject: One thing I'd add to {{business_name}}'s preview

Hi {{first_name_or_role}},

{{NEW_VALUE — one additional observation or idea not in the first email,
grounded in scan facts. e.g. "Your reviews are strong — the preview now
shows them on the homepage where searchers actually see them."}}

The preview is still live here: {{preview_url}}

— Fritz
[FOOTER INJECTED BY SENDER]
```

### 13.4 Follow-up 2 (day-10 last-call before expiry)

```text
Subject: {{business_name}}'s preview comes down {{expiry_date}}

Hi {{first_name_or_role}},

Quick heads-up — the preview we built for {{business_name}} expires
{{expiry_date}}. After that the link comes down.

If it's useful, claiming it keeps it (and makes it yours):
{{claim_url}}
{{call_option_line — for church/nonprofit: "or grab 15 minutes and we'll
walk through it together: {{booking_url}}"}}

Either way — no hard feelings, and no more emails about this one.

— Fritz
[FOOTER INJECTED BY SENDER]
```

### 13.5 Inbound confirmation

```text
From: FAMtastic Designs <previews@famtasticdesigns.com>
Reply-To: fritz@famtasticdesigns.com
Subject: Your FAMtastic preview is being built

Hi {{first_name_or_business}},

Got your request. Your preview is being built now — you'll have a private
link within 24 hours.

While you wait: {{the_famtastic_way_url}} explains how this works.

— FAMtastic Designs
[FOOTER INJECTED BY SENDER]
```

### 13.6 Receipt

```text
From: FAMtastic Designs Billing <billing@famtasticdesigns.com>
Reply-To: hello@famtasticdesigns.com
Subject: Receipt — {{package_name}} ({{amount}})

Payment received: {{amount}} for {{package_name}} on {{date}}.
Reference: {{payment_external_id}}

What happens next: {{onboarding_line — "check your inbox for your welcome
email and /start link."}}

[FOOTER INJECTED BY SENDER]
```

### 13.7 Onboarding welcome + nudges

```text
Subject: Welcome — let's build {{business_name}}'s real site

You claimed it. Now we make it yours.

Step 1: {{start_url}} — upload your logo and photos, confirm your details
(about 10 minutes, save-and-return anytime).

What happens after: {{fulfillment_summary — content finalize → domain →
launch → tracking dashboard}}.

— Fritz
[FOOTER INJECTED BY SENDER]
```

Nudges (48h/96h, only while form is `partial`): `Subject: {{completed_pct}}% done — almost there` + remaining-items list + `{{start_url}}`.

### 13.8 Monthly performance report

```text
Subject: {{business_name}} — your {{month}} numbers

Visits: {{visits}} · Calls/clicks: {{cta_clicks}} · Form fills: {{form_fills}}
{{campaign_specific_metric — giving clicks / bookings / donations}}

{{one_insight_line — from real data only; numbers come from SQL, never generated}}

— Fritz
[FOOTER INJECTED BY SENDER — includes preferences link]
```

### 13.9 System notify digest (to Fritz)

```text
From: FAMtastic Notify <notify@famtasticdesigns.com>
To: {{FRITZ_NOTIFY_TARGET}}
Subject: [FAMtastic] {{n_parks}} parked · {{n_flags}} flags · {{n_deposits}} deposits

PARKED DRAFTS ({{n_parks}}): {{list: contact, campaign, failed_gate}}
QA FLAGS ({{n_flags}}): {{list: proof_id, failed_items}}
DEPOSITS ({{n_deposits}}): {{list: business, package, amount}}
DELIVERABILITY: bounce {{bounce_24h}}% · complaints {{complaint_24h}}% ·
sends today {{sent_today}}/{{warmup_cap}}
Admin queue: {{admin_url}}
```

## 14. Follow-Up Rules (plan §24)

- **Maximum 2 touches** after the first send: day-3 nudge (template 13.3), day-10 last-call before proof expiry (template 13.4). Then silence — the proof expires courteously (revive form on the expired page, plan §11).
- **Value-add framing, never nagging:** each follow-up must contain something new (an observation, an added preview element) — "did you see my email?" is forbidden.
- Sequence stops immediately on: reply, click→claim, unsubscribe, bounce, complaint, suppression.
- Follow-ups pass all seven gates again (suppression/duplicate state may have changed since touch 1).
- Follow-up sends count against warm-up caps.

## 15. Webhook Handling (plan §24)

Resend webhooks → hosted PHP endpoint (mbsh-reunion pattern: validate + rate-limit) → `EmailEvent` rows.

- **Events consumed:** `delivered`, `opened`, `clicked`, `bounced`, `complained` (plus `sent` from our own send call).
- **Verify** the webhook signature (`RESEND_WEBHOOK_SECRET`) before processing.
- **Idempotent:** dedupe on the Resend event id — webhook retries are a known double-count bug class; replays are no-ops.
- **Append-only:** EmailEvent is an immutable log with no status field (deliberate, plan §13) — lifecycle state lives on Contact (suppression) and Proof (sent/clicked).
- **Auto-suppression:** `bounced` (hard) → Contact status `bounced` + permanent suppression; `complained` → Contact `suppressed`, `suppression_reason=complaint`, permanent. Soft bounces logged; 3 soft bounces on one contact → treat as hard.
- `clicked` on a proof link → Proof transitions `sent → clicked` + Fritz notify for hot leads.
- Unknown event shapes park for review (same posture as the Payment Router, agents.md §2.11).

## 16. Event Tracking

- Every send writes an EmailEvent (`type=send`) with: contact_id, proof_id, identity (from), template, resend_id.
- Webhook events append further rows keyed to the same resend_id.
- Open/click rates per campaign feed the §26 weekly scorecard (leads found → proofs sent → open → click → reply → deposit funnel); numbers come from SQL only — never LLM-generated.
- Proof page views/claims are first-party DB events (plan §26), complementing email events.
- The orchestration-plane sync worker pulls hosted EmailEvents down on schedule (plan §13) so the engine's gates (duplicate check, stop-loss) operate on current data.
- DMARC `rua` reports land at notify@ — reviewed weekly during the ladder (§5).

## 17. Launch-Blocking Checklist (aligned with plan §36)

No outreach send happens until every item checks:

- [ ] **D1 resolved** — famtasticdesigns.com confirmed/acquired, DNS control verified
- [ ] **SPF verified** — single TXT record including both GoDaddy mail and Resend; probe send passes
- [ ] **DKIM verified** — keys live for both Resend and GoDaddy mail; probe send passes
- [ ] **DMARC live** — `p=none` + `rua=mailto:notify@`; ladder schedule recorded
- [ ] **Resend domain Verified** in dashboard; `RESEND_API_KEY` in vault/.env.local only
- [ ] **Identities created** — hello@, fritz@ mailboxes live; previews@, billing@, notify@ configured in Resend with correct display names and Reply-To
- [ ] **Suppression/unsubscribe honored** — one-click endpoint live, List-Unsubscribe headers on, suppression permanent, gate 4 wired
- [ ] **Physical-address placeholder solved** — `EMAIL_PHYSICAL_ADDRESS` set; footer renders it; gate 7 fails closed when empty
- [ ] **Reply routing to a monitored inbox** — Reply-To → fritz@ on all outreach; fritz@ on Fritz's phone; daily review committed
- [ ] **Seven gates enforced in `pipeline/lib/sender.py`** — the only send path; error-defaults-to-FAIL verified by test
- [ ] **Bounce/complaint webhooks wired** — EmailEvent rows + auto-suppression confirmed with a test event
- [ ] **Stop-loss live** — thresholds computed, auto-pause + page-Fritz path tested
- [ ] **Warm-up caps enforced in code** — day counter per identity; week-1 ceiling 20/day
- [ ] **Privacy/terms basics published** on famtasticdesigns.com (footer links resolve)

## 18. Open Decision Points

| Item | Default | Owner | Next action |
|---|---|---|---|
| D1 — domain/DNS state of famtasticdesigns.com | assume owned/acquirable | Fritz | Check reseller account before Wave 1 day 2; fallback domain + 301 if not |
| D5 — GoDaddy mailbox vs Google Workspace | GoDaddy (already paid) | Fritz | Provision day 1; revisit only if provisioning fails |
| Physical mailing address | none yet (launch-blocking) | Fritz | Choose business address / UPS box / virtual address; set config key before day 4 |
| Resend plan limits | unknown | Fritz | Read plan caps day 1; record in vendor-capability-matrix.md |
| Resend domain verification status | unverified | Fritz | Start verification day 1 (Cash Sprint table) |
| Booking tool for call-first paths | Cal.com free tier (plan §32) | Fritz | Create account + link before day 2 claim-path QA |
