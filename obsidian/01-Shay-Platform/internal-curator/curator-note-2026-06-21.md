---
permalink: famtastic/01-shay-platform/internal-curator/curator-note-2026-06-21
---

Generated: 2026-06-21

Sources:
- /Users/famtasticfritz/.local/share/famtastic/gaps.jsonl
- /Users/famtasticfritz/.local/share/famtastic/intelligence-promotions.json
- /Users/famtasticfritz/famtastic/obsidian/01-Shay-Platform/gap-research/latest-gap-research.md
- /Users/famtasticfritz/famtastic/obsidian/Shay-Memory/research/github-bookmarks-report-latest.md
- session_search: "platform-conversation-context" OR "media-prompt-handoff" OR "proactive-gap-escalation-order" OR GoDaddy OR cPanel OR JJ BA OR video background

# Internal Curator Note

## New Observations
- **Observation:** `intelligence-promotions.json` now exists and contains 5 promoted findings, but all 5 are still `status: pending`; promotion exists, closure does not.
- **Observation:** `gaps.jsonl` currently holds 13 rows: 7 `open`, 2 `verified`, 2 `normalized`, 1 `noise`, and 1 `stale`.
- **Observation:** The most repeated buckets are still `platform-conversation-context` (3), `shay-desk-ui-kinks` (3), and `video-background` (2).
- **Observation:** The only fresh June gap is still `godaddy-cpanel-access`, and the gap text itself already encodes the expected escalation order (`detect_gap -> ... -> escalate_to_fritz_last`).
- **Observation:** `video-background` was reclassified to proof-closeout state, which means repo truth appears to say the capability exists while the ledger still reads like a missing feature.
- **Observation:** A new promoted cleanup finding now exists for `media-prompt-handoff`; this is a signal that malformed gap logging is no longer just a site/platform issue — it has reached Media Studio intake too.
- **Observation:** GitHub bookmarks still lean heavily toward agent-orchestration (93 unique URLs) over business-income (15), while the strongest money-linked artifacts remain payments/reseller rails such as Authorize.net and related commercial tooling.

## Interpretations
- **Interpretation:** Shay's self-learning loop improved one layer since the last curator pass — promotions are now inspectable — but the loop is still weak at the last mile because nothing in the promotion ledger shows `verified`, `deferred`, or `rejected` outcomes yet.
- **Interpretation:** The dominant recurring problem is misrouting, not raw lack of capability. Platform talk, media handoffs, client briefs, and priority interrupts are still falling into gap logging shapes that were meant for actual capability failures.
- **Interpretation:** The `video-background` bucket looks like a closure-discipline problem, not a build-from-zero problem.
- **Interpretation:** Fritz's curiosity stream is still outrunning his cash stream. Research appetite keeps feeding orchestration and website-builder exploration, but the stable money signals keep pointing back to reseller/payment activation.
- **Interpretation:** `billing-usage-visibility` is old but still open, which suggests observability tied to spend/revenue remains important and easy to postpone unless turned into an explicit automation lane.

## Repeating Gaps
- **Routing/classification gap:** distinguish platform/orchestration, media handoff, client brief, and priority-interrupt turns before they hit generic gap logging.
- **Promotion closeout gap:** promoted findings are being created without a clear state transition into implementation, verification, defer, or reject.
- **Proof-closeout gap:** capabilities that already appear proven in repo truth remain open in the ledger.
- **UI friction gap:** `shay-desk-ui-kinks` is still a 3-hit bucket and remains unresolved in the promotion ledger.
- **Revenue observability gap:** billing/API usage visibility is still open and still relevant to Fritz's efficiency-first hierarchy.

## Candidate Automations
- **Promotion-state closer:** a worker that scans `intelligence-promotions.json` for long-pending findings and forces a next state: `implementation-task`, `verified`, `deferred`, or `reject-as-noise`.
- **Conversation-type gate before gap logging:** classify turns into `site-build`, `platform-work`, `media-intake`, `brief-intake`, or `priority-interrupt` before any capability row is written.
- **Proof/ledger reconciler:** when a gap is tagged `needs-operational-closeout` or has high proof confidence, automatically queue a proof pass and propose closure wording.
- **Revenue telemetry bootstrapper:** create the minimum billing/API usage watcher so cost visibility stops living as a remembered need.
- **Desk-friction bundler:** turn repeated Shay Desk complaints into one execution-shaped remediation packet instead of letting them sit as separate legacy rows.

## Escalations Worth Building
- **Media Studio intake wrapper:** structured handoff for provider target, asset type, source prompt, references/uploads, consistency mode, and deliverable.
- **Pre-escalation routing wrapper for hosting/auth/vendor work:** make “internal proof first, Fritz last” executable instead of doctrinal only.
- **Reseller/payment activation lane:** treat payment rails and reseller reactivation as a protected income stream, not a side note inside broader orchestration research.
- **Gap-log hygiene pass:** operational closeout for `video-background`, plus cleanup/backfill for malformed legacy rows after the routing gate exists.

## What To Ignore
- Single malformed `capability_id` strings from legacy rows should not drive roadmap by themselves once their bucket is known.
- High volume in agent-orchestration bookmarks should not be mistaken for execution priority; it mostly reflects exploration pressure.
- The age of many legacy gap rows should not be read as resolved state; stale and solved are different.
- Duplicate phrasing inside the same bucket should not be counted as multiple independent product requests.

## Stable Preference / Environment Fact Worth Capturing Explicitly
- **Recommendation:** Capture as durable preference: Fritz wants escalation to him only after internal routing, repo truth, capability proof, and vendor fact surfaces are exhausted.
- **Recommendation:** Capture as durable preference: income-linked work should be converted into a resumable brief early or it will keep resurfacing as ambient context instead of shipping.
- **Recommendation:** Capture as stable environment fact: `intelligence-promotions.json` is now a live truth surface and should be treated as required curator input on every maintenance run.
- **Recommendation:** Capture as stable environment fact: the current curator signals say routing/typing errors are a bigger system drag than missing feature volume right now.