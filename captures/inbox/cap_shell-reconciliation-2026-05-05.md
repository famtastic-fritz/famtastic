# Shell Reconciliation Session — 2026-05-05

Source for the chat-capture pipeline. Distills the lessons from the Workbench shell reconciliation discovery.

## Do-not-repeat: every UI plan must pin the exact mount-target file path

Today's Ops dashboard MVP shipped to `index.html` because the plan specification said "mounts into the existing Workbench shell" without naming the file. The subagent guessed `index.html`. The canonical Foundation lives at `site-studio/public/workbench-foundation.html`. Do not repeat: every UI plan must reference an exact absolute path for its mount target, never a noun phrase.

## Anti-pattern: declaring a shell frozen canonical without a cutover plan creates drift

The Workbench Foundation was declared "frozen canonical" in `docs/STUDIO-UI-FOUNDATION.md` on 2026-05-04. No migration plan was attached. The next day, a new feature shipped into the legacy shell because that's where the working APIs lived. Anti-pattern: freeze plus working-old plus no-cutover equals duplicate-implementation drift the next day. A freeze without a cutover plan is decorative.

## Vendor-fact: workbench-foundation.html has 6 of 7 domains as empty rooms

The canonical Foundation renders 7 domain icons but only Sites and Plans are wired to live data. Brain, Components, Media, Intel, Admin all render UI shells but `buildXBench()` returns empty content. Logs and Approvals bottom panels show hardcoded fake entries. Right-rail Tools render pod containers but never populate. This is the operational reality of the canonical Foundation as of 2026-05-05.

## Learning: working architecture can diverge from locked architecture

When the locked design doesn't match what works, the next agent will follow whichever surface produces value. Today the canonical Foundation was locked, but `index.html` had every working API behind it — so today's Ops dashboard correctly went to where the wires were. This is not a violation; it's gravity. The fix is not to discipline the agent; it's to either wire the canonical or update the lock.

## Rule: the Workbench Foundation R3 says Shay is never a left-nav domain

Per `docs/STUDIO-UI-FOUNDATION.md` Section 1 R3: Shay is ambient, not a nav item. Domains are things; Shay is the air. The current `index.html` left rail violates R3 with a Shay tab. Any future shell work must not add Shay as a top-level domain entry. Workshop UI is fine; making it a tab is not.

## Gap: Studio serves index.html as / by default; workbench-foundation.html is reachable but not the default

`site-studio/server.js` mounts `express.static(public/)` and does not override GET `/`. Browsers receive `index.html` as the default landing page. `workbench-foundation.html` is reachable at its explicit URL but no redirect, feature flag, or migration logic exists. The default-shell cutover is listed as remaining work in the foundation closeout packet but no task records exist for it.

## Decision: research-only assessment shipped, three reconciliation paths documented

Decided to ship a research-only assessment doc + a side-by-side viewer instead of a code merge. Three paths described and not chosen: Foundation wins (port everything in, deprecate index.html), index.html wins (rewrite the locked rules to match reality), Hybrid (Foundation as roadmap, index.html as live, gradual migration). Decision deferred to Fritz after observing both shells through the side-by-side viewer at `http://localhost:3334/shell-compare.html`.
