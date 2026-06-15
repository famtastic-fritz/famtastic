- title: FAMU cruise capability-gap tooling research
- created_at: 2026-06-15T00:12:20Z
- cron_name: famu-cruise-capability-gap-tooling-research
- origin_reference: 2026-06-14 CLI conversation about FAMU cruise research capability gaps and cron-based continuation
- continuation_query: FAMU cruise research capability gaps direct quote access travel inventory API browser anti-bot research ledger continuation brief
- local_brief_path: /Users/famtasticfritz/famtastic/research-briefs/2026-06-14-famu-capability-gap-tooling-research.md
- verification_required_for_followup: true
- resume_sentence: Shay, resume the FAMU cruise capability-gap tooling research. Read the local brief, recover the linked prior context, verify you have the context, then continue.

# Executive Summary

**Observation**
- The hard part of the earlier cruise-price hunt was not generic web search. It was crossing from public consumer pages into organizer-only and seller-only lanes.
- The current Shay runtime already has strong discovery and execution primitives: Tavily-backed web search/extract, browser automation, computer-use, terminal/file/code execution, cron, delegation, session search, memory, and Obsidian/basic-memory/vault-search MCPs.
- The current Shay runtime does **not** have travel-seller credentials, cruise booking-console credentials, a cruise-specific structured API, Browserbase/Firecrawl configured, or outbound Email/SMS configured.

**Interpretation**
- The next meaningful unlock is **access + workflow**, not “more scraping.”
- The fastest practical upgrade path is:
  1. direct organizer contact lane,
  2. host-agency / advisor credential lane,
  3. seller portals for inventory and group handling,
  4. a lightweight local research ledger,
  5. only then enterprise cruise APIs or heavier browser infrastructure.

**Most important research findings**
1. **Direct manual quote access from Jade Events already exists on the live booking page.** The TravelJoy trip page explicitly says triple/quad occupancy should be handled by contacting Jade Events directly and exposes a phone number (`407.600.4565`) plus visible email text (`ewilson1911@yahoo.com`).
2. **There is a verification wrinkle on Jade’s email path.** Browser inspection showed the visible email text says `ewilson1911@yahoo.com`, but the underlying `mailto:` target resolved to `megamindzproductions@gmail.com`. That mismatch means any future outbound email must verify the correct address before sending.
3. **Public-to-seller transition is the real constraint.** Travelport Cruise & Tour, CruisingPower, Travel Leaders Cruise Complete, and Amadeus Cruise Portal are seller-side systems. The advantage comes from credentials, inventory visibility, group handling, and support—not from a public web trick.
4. **Structured cruise APIs are real, but they are not the first unlock.** Travelport Cruise Web Services and Traveltek Cruise API/CruiseConnect are the most realistic machine-readable lanes. Amadeus self-service is not the answer here and is being decommissioned in 2026 anyway.
5. **Shay already has the bones for repeatable research.** Cron, delegation, markdown artifacts, session recall, MCP-backed note search, and browser evidence capture are already present. What is missing is a standard per-run ledger schema and artifact discipline.
6. **Direct outbound communication is the cheapest missed capability.** Telegram is configured, but Email/SMS are not. For organizer clarification work, that matters more than another premium model.

# Capability Gap Matrix

| Need | What exists now in Shay | Current gap | Pragmatic fill now | Strong long-term fill |
|---|---|---|---|---|
| 1) Direct manual quote access from Jade Events | Browser can open the live TravelJoy page and the Eventbrite organizer contact form; web extract/search already work | No configured outbound Email/SMS lane; no saved organizer-outreach workflow | Use TravelJoy’s live phone/email instructions and Eventbrite’s contact form workflow; configure Shay Email next | Maintain direct organizer contact packet + CRM workflow in Tern/TravelJoy + Email gateway |
| 2) Direct cruise inventory / agency booking access | Browser/browser-computer-use can reach seller portals; search can locate portals and requirements | No host-agency / advisor credentials; no portal logins | Join a host agency or other low-friction advisor path to obtain shared IATA/CLIA-style credentials and portal access | Maintain seller stack across CruisingPower, Travel Leaders Cruise Complete, Travelport Cruise & Tour, Amadeus Cruise Portal, OneSource, etc. |
| 3) Structured travel API access | Generic web extraction exists; browser can inspect UI flows | No cruise-specific machine-readable inventory API; no enterprise agreements | Do **not** start here first unless seller-side access is already live | Travelport Cruise Web Services and/or Traveltek Cruise API / CruiseConnect |
| 4) Auto-logging research ledger with timings and evidence snapshots | Cron, file tools, markdown briefs, session store, MCP recall, browser evidence capture | No single standard JSONL/SQLite schema per research run | Write one brief + one run ledger file + screenshot/trace folder per run | Formal research-run ledger service feeding vault + kanban + review packets |
| 5) Better atomized subagent swarm for repo/business research | Delegation already enabled; kanban dispatch exists; child concurrency already high | Default routing/packets can still be too chunky and evidence-light | Use narrow worker roles, lane IDs, local artifacts, and a reviewer lane | Hyperparallel atomic swarm with durable telemetry and captain/reviewer closure |
| 6) Direct outbound communication channel for organizer clarification | Telegram is configured; browser can reach contact forms; computer-use is available in Shay | Email, SMS, Signal, WhatsApp, and Slack are not configured | Configure Email in Shay first; optionally use browser contact forms immediately | Add Email + CRM + optional iMessage/SMS lane for faster human-in-the-loop escalation |

# What Exists Now in Shay

## Verified live environment inventory

**Tooling already enabled**
- `web` — live web search + extraction.
- `browser` — browser automation.
- `terminal` + `file` + `code_execution` — local automation, parsing, transforms, and artifact creation.
- `vision` — image analysis capability is enabled in Shay, though this session’s browser-vision attempt hit a local model/runtime failure.
- `memory` + `session_search` — recall and continuity support.
- `delegation` — subagent fan-out is enabled.
- `cronjob` — scheduled research jobs already exist and run.
- `messaging` — cross-platform messaging exists, but platform coverage matters.
- `computer_use` — enabled in the Shay runtime on macOS.

**MCP servers already live**
- `obsidian`
- `basic-memory` (read-focused allowlist)
- `vault-search`

**Browser/web posture already present**
- Tavily is configured as the current search backend.
- Browser engine is `auto`.
- `allow_private_urls: true` is enabled.
- Local browser runs are working, but Browserbase/residential proxy support is not configured right now.

**Delegation/swarm posture already present**
- Delegation is configured against local Ollama.
- `max_concurrent_children: 50`
- `max_spawn_depth: 2`
- `orchestrator_enabled: true`
- Kanban dispatch is enabled in the gateway.

**Research continuity posture already present**
- Cron infrastructure is active.
- Session store + session search exist.
- Obsidian/basic-memory/vault-search provide durable file-backed continuity.
- Research briefs can be written locally inside the repo and re-opened later.

## What is missing right now

**Outbound channels missing for organizer follow-up**
- Email: not configured
- SMS: not configured
- Signal/WhatsApp/Slack: not configured

**Browser/extraction vendor layers missing**
- Browserbase: not configured
- Firecrawl: not configured
- Browser Use: not configured

**Travel-business access missing**
- No host-agency / advisor credentials verified in this runtime
- No CruisingPower login
- No Travelport Cruise & Tour login
- No Travel Leaders Cruise Complete login
- No cruise-specific API contract or token

# External Tools/Services to Consider

## A. Direct quote / organizer access

### 1. The organizer’s own live booking stack (already partially exposed)
- **TravelJoy booking page** is already the best immediate quote-access surface for this cruise.
- It explicitly routes triple/quad occupancy to direct manual handling.
- It exposes direct phone/email contact on-page.
- **Why it matters:** This is the shortest path to obtaining policy clarifications and occupancy-specific manual quotes without recreating the public-price hunt.

### 2. Eventbrite organizer contact flow
- Eventbrite’s help center explicitly says attendees without tickets can go to the event page, select **Contact**, then **Contact the organizer**, fill out the form, and submit.
- I verified the Jade Events organizer profile exposes a **Contact** button and that the contact dialog reaches a name/email/reason/message form.
- **Why it matters:** This is a compliant browser-automatable clarification lane available right now.

### 3. Tern / TravelJoy as ongoing group-trip CRM layers
- **TravelJoy**: CRM, itineraries, payments, automated tasks/reminders, group trip management.
- **Tern**: all-in-one travel-advisor platform with forms, workflow triggers, audit trail, commission visibility, and a large cruise database.
- **Why they matter:** If FAMU cruise work turns into recurring travel-business ops, these are operational homes for quotes, payments, follow-up, and paper trail.

## B. Direct cruise inventory / booking access

### 4. Host-agency path (fastest seller-access unlock)
The pragmatic path is to borrow access before trying to become an enterprise travel tech company on day one.

Examples worth evaluating:
- **Outside Agents** — low-friction host-agency option with tooling/support and a cruise-heavy orientation in its market reputation.
- **Cruise Brothers / CruisingFree** — cruise-specific host path with Travel Leaders ecosystem overlap.
- **Nexion / Travel Leaders-affiliated host paths** — strong access to TLN tooling and training.

**Why this matters:** A host agency can provide the shared accreditation / supplier identity that opens advisor portals without waiting to earn your own direct agency standing first.

### 5. CruisingPower (Royal Caribbean / Celebrity / Silversea)
- Travel-professional portal for Royal Caribbean-family brands.
- Intended for travel professionals, not public consumers.
- Search-result descriptions and advisor-facing guidance consistently position it as the booking/training/tool portal once you have an advisor identity.

### 6. Travel Leaders Network — Cruise Complete
- Web-based cruise comparison and booking tool.
- Side-by-side comparisons of cruise lines, ships, itineraries, and pricing.
- Real-time cabin availability, pricing, deck plans, itinerary maps, and stateroom images.
- Client-ready quotes and confirmations.

### 7. Travelport Cruise & Tour / Cruise Web Services
- Travelport Cruise & Tour login page is explicitly an **Agent Login** with account creation.
- Travelport Cruise Web Services officially support **shop, book, modify, and cancel** via a single normalized API and include group functionality.
- This is a real seller/integration lane, not a consumer hack.

### 8. Amadeus Cruise Portal / OneSource / similar seller consoles
- Amadeus Cruise Portal is positioned as a cruise booking engine for travel sellers with broad cruise content.
- OneSource is positioned as a travel-advisor center for specific cruise brands.
- These are useful if the business commits to a real seller workflow, not just ad-hoc consumer shopping.

## C. Structured travel data / API layer

### 9. Travelport Cruise Web Services
**Best fit when:** you need a serious, structured, booking-capable API and are already inside travel-seller rails.
- Supports shop/book/modify/cancel.
- Normalizes across multiple vendors.
- Includes group functionality and booking-file creation for agency reporting.

### 10. Traveltek Cruise API / CruiseConnect
**Best fit when:** you need machine-readable cruise inventory, pricing, itinerary, cabin availability, and booking retrieval.
- Public product descriptions emphasize real-time pricing, availability, and booking workflow support.
- This looks like a strong future fit for a reusable cruise search/quote engine.

### 11. Amadeus reality check
- Amadeus self-service developer APIs do **not** solve cruise access here.
- Public Amadeus materials point to flights/hotels/transfers/experiences for self-service, not cruise.
- Public reporting indicates the self-service portal is being decommissioned in 2026 while enterprise APIs remain.
- Translation: Amadeus is adjacent travel infrastructure, but it is not the clean first answer for this cruise problem.

### 12. Duffel reality check
- Duffel is strong for flights and adjacent air booking infrastructure.
- It is **not** a cruise inventory answer.
- Translation: useful later for full trip packaging, but irrelevant to the immediate cruise-lane gap.

## D. Browser / extraction / anti-bot improvements

### 13. Browserbase
**Why it helps:** remote browser sessions, stronger agent identity tooling, more reliable web interaction than pure local runs when sites get defensive.
**When to buy:** only if travel sites start breaking the current local browser lane repeatedly.

### 14. Firecrawl
**Why it helps:** AI-ready scraping and extraction pipeline that is faster to operationalize than hand-rolled parsers for many content pages.
**When to buy:** when the bottleneck is extraction cleanup and repeatable document/page ingestion, not seller credentials.

### 15. Apify / Bright Data (optional escalation, not first purchase)
**Why they help:** hardened scraping environments and proxy layers.
**Why they are not first:** they solve access friction on public sites, but they do not grant seller credentials or organizer authority. Do not buy proxy horsepower before fixing the actual authority gap.

### 16. Playwright traces / screenshots / evidence artifacts
**Why they help:** reproducible proof, screenshots, snapshots, and traces for later review.
**Best use here:** capture booking-wall behavior, contact-form availability, and seller-portal gates as artifacts instead of relying on memory.

## E. Reference products worth copying (adopt / reject)

### Travel Leaders Cruise Complete
**Adopt**
- Side-by-side cruise comparison
- Real-time cabin availability/pricing
- Client-ready quote/confirmation outputs

**Reject**
- Keeping the value trapped inside a closed UI with no local evidence artifact or export discipline

### TravelJoy / Tern
**Adopt**
- Forms + workflow automation
- Group-trip management
- Audit trail and task/reminder discipline
- A single operational home for client/organizer interactions

**Reject**
- Letting critical quote facts live only inside vendor UI instead of mirrored into local research briefs and ledgers

### Browserbase / Playwright traces
**Adopt**
- Browser session durability
- Evidence-first debugging and review
- Human-reviewable traces/screenshots

**Reject**
- Treating browser infrastructure as a substitute for seller credentials

# Cheapest/Fastest Path

1. **Use the access already exposed on the live TravelJoy page.** For this class of investigation, direct organizer routing already exists: phone + email + triple/quad manual-quote instruction.
2. **Use Eventbrite contact flow as the browser-safe fallback.** It is compliant, visible, and already verified live.
3. **Configure Shay Email next.** This is the cheapest missing capability with the highest practical upside for organizer clarification work.
4. **Join a host-agency / advisor path before buying APIs.** That gets you into CruisingPower / TLN / Travelport-style seller lanes far faster than an enterprise integration project.
5. **Stand up a tiny research ledger before the next rush job.** One markdown brief + one JSONL run ledger + a screenshots folder is enough.
6. **Only buy Browserbase/Firecrawl if current public-page extraction becomes the real bottleneck.** Right now it is not the primary bottleneck.

# Strongest Long-Term Path

Build a small FAMtastic travel-research stack with five layers:

1. **Seller identity layer**
   - Host agency or equivalent advisor identity
   - CLIA / IATAN path when justified

2. **Seller portal layer**
   - CruisingPower
   - Travel Leaders Cruise Complete
   - Travelport Cruise & Tour
   - Amadeus Cruise Portal / other supplier consoles as needed

3. **Structured data layer**
   - Travelport Cruise Web Services and/or Traveltek Cruise API / CruiseConnect
   - Keep air APIs separate; do not conflate flight infrastructure with cruise inventory

4. **Ops / CRM layer**
   - TravelJoy or Tern for forms, outreach, tasks, payments, group workflows, and paper trail

5. **Shay research spine**
   - local markdown brief
   - JSONL or SQLite research ledger
   - screenshot / trace artifacts
   - narrow worker swarm + reviewer lane
   - continuity rules for next-session pickup

That stack turns “we hunted a quote once” into “we built a reusable travel-business capability.”

# Recommended Next Moves

1. **Create an organizer-outreach packet** for future cruise/group research:
   - sailing/date
   - occupancy count
   - cabin priority order (interior → oceanview → balcony)
   - questions about group code / party-pass rules / transfer options / taxes / final-pay dates
   - desired response channel

2. **Enable Email in Shay** so organizer clarification does not depend on browser forms every time.

3. **Run a short host-agency comparison** against 3–4 candidates with these columns:
   - startup cost / ongoing cost
   - cruise focus
   - CLIA / IATAN path
   - access to CruisingPower / Travel Leaders / Travelport / supplier portals
   - commission split
   - CRM / automation support
   - speed to first live booking

4. **Get one seller-console lane live** before buying any API:
   - first choice: CruisingPower or Travel Leaders Cruise Complete via a host path
   - second choice: Travelport Cruise & Tour / Travelport seller lane

5. **Add a local research-run ledger pattern** before the next time-boxed investigation.
   Recommended minimum schema per row:
   - `run_id`
   - `lane_id`
   - `started_at`
   - `ended_at`
   - `duration_sec`
   - `model/provider`
   - `tool`
   - `query_or_url`
   - `artifact_path`
   - `finding`
   - `confidence`
   - `blocker`
   - `followup_required`

6. **Use a narrower swarm packet next time.** Suggested worker roles:
   - `organizer-contact worker`
   - `seller-portal inventory worker`
   - `API reality-check worker`
   - `browser-evidence worker`
   - `business-model / host-agency worker`
   - `captain-synthesis reviewer`

7. **For any future session:** read this brief first, recover the linked prior context, and verify the context before continuing. Do not restart from memory.

# Evidence / Sources

## Local / live-system evidence gathered in this run
- `shay tools list` — verified enabled toolsets include web, browser, terminal, file, code execution, vision, skills, memory, session search, delegation, cronjob, messaging, and computer_use; MCP servers include obsidian, basic-memory, and vault-search.
- `shay status --all` — verified Telegram configured; Email/SMS/Signal/WhatsApp/Slack not configured; Browserbase/Firecrawl not configured; gateway running.
- `shay cron list --all` — verified cron infrastructure is real and this research job exists as a scheduled item.
- `~/.shay/config.yaml`
  - browser config around lines 119–126
  - memory/delegation config around lines 397–415
  - curator config around lines 427–437
  - cron/kanban config around lines 515–520
- Prior local artifact: `/Users/famtasticfritz/famtastic/research/famu-rattler-cruise-2026-price-brief.md`

## Browser-verified pages during this run
- **TravelJoy booking page**: `https://traveljoy.com/bookings/mWGSk7S9NQz1tsM6LRSMJKah`
  - Verified live text routing triple/quad occupancy to direct Jade Events contact
  - Verified visible phone `407.600.4565`
  - Verified visible email text `ewilson1911@yahoo.com`
  - Verified underlying `mailto:` mismatch to `megamindzproductions@gmail.com` (needs follow-up verification)
- **Eventbrite organizer page**: `https://www.eventbrite.com/o/37819142743`
  - Verified live **Contact** button on organizer profile
  - Verified contact dialog and name/email/reason/message form path
- **Travelport Cruise & Tour login**: `https://www.travelportcruiseandtour.com/`
  - Verified live seller-side agent login page with create-login path

## Web / doc sources
- Eventbrite Help Center — Contact the event organizer: `https://www.eventbrite.com/help/en-us/articles/647151/how-to-contact-the-event-organizer/`
- Travelport Cruise Web Services Introduction: `https://support.travelport.com/webhelp/GWS/Content/Cruise_Web_Service/Cruise_Intro.htm`
- Travel Leaders Network booking tools / Cruise Complete: `https://www.travelleadersnetwork.com/booking-tools`
- TravelJoy platform page: `https://www.traveljoy.com/`
- Tern platform page: `https://www.tern.travel/`
- IATAN accreditation page: `https://www.iatan.org/en/accreditation/become-accredited`
- Amadeus self-service developer portal / decommission note: `https://developers.amadeus.com` and related search-result evidence gathered in this run
- Amadeus Cruise Portal product page: `https://amadeus.com/en/travel-sellers/products/amadeus-cruise-portal`
- Traveltek Cruise API / CruiseConnect: `https://www.traveltek.com/travel-api-provider/cruise-api`, `https://www.traveltek.com/products/cruiseconnect`
- Browserbase docs: `https://docs.browserbase.com/introduction/what-is-browserbase`
- Firecrawl docs: `https://www.firecrawl.dev/docs`
- Playwright Trace Viewer docs: `https://playwright.dev/docs/trace-viewer`
- CLIA membership page / advisor-accreditation context: `https://trade.cruising.org/north-america-membership`
- Additional accreditation overview used as context: `https://www.altexsoft.com/blog/travel-agency-accreditation`

## Confidence / caution notes
- High confidence on current Shay-tool inventory and live browser checks.
- High confidence that organizer contact routes are already exposed.
- Medium confidence on some vendor positioning that came from public search-result descriptions where direct extraction was thin; future follow-up should re-verify live.
- High confidence that the next unlock is seller access + communication workflow, not more consumer scraping.
