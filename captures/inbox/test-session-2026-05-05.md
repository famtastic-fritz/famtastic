# Test Session Transcript — 2026-05-05

This is a synthetic transcript distilling the day's chat session for end-to-end pipeline verification.

## Vendor fact: Netlify and git linking

Netlify cannot link a project to a Git repository via API. The `netlify api updateSite` call can rename a project, change build settings, and modify deploy hooks, but it does not expose project-to-repo linking. The "Connect to Git" flow requires the vendor UI. This is a vendor fact about Netlify's API surface confirmed by today's attempt to repoint the mbsh-reunion-staging project programmatically.

## Decision: single Netlify project per site, not two

We decided on one Netlify project per site over the earlier two-project model. Netlify's native branch deploys handle staging — push to the staging branch and Netlify serves it at <tag>--staging.netlify.app. The production branch (main) serves the custom domain. Chose this over a separate <tag>-staging Netlify project because it's simpler, native to how Netlify is built, and there is less to manage.

## Rule: sites never commit to Studio history

Sites must never commit to the Studio repo history. Each site lives at ~/famtastic-sites/<tag>/ as its own git repo. The Studio repo at ~/famtastic/ has a /sites/ gitignore entry. Today we found 25 leaked site files that predated this gitignore and removed them with git rm --cached. Going forward, every site has its own remote on github.com/famtastic-fritz/<tag>.

## Bug pattern: cowork ghost-session silent failure

Bug pattern: cowork session was reported as running by the cowork orchestrator but produced zero status log entries and zero commits over 80 minutes. Root cause unconfirmed but likely: cowork worked in an isolated worktree without pushing, or skipped the handshake protocol entirely, or the session never actually started despite verbal confirmation. Fix going forward: bold the handshake protocol as the literal first action in cowork handoffs and add a 60-second timeout with auto-restart if the start event never lands.

## Anti-pattern: hardcoded counts in plan acceptance criteria

Anti-pattern: writing acceptance criteria like "448 stale legacy-queue jobs render in Stale Debt drawer" is wrong — it bakes a transient inventory snapshot into the plan as if it were a contract. Real current inventory should be read from a snapshot script (docs/ops/inventory-YYYY-MM-DD.json) and never hardcoded. Today's adversarial review caught this in the ops-workspace-gui plan.

## Learning: adversarial review loops are valuable but bounded

Learning from today: a 3-round adversarial review loop on a plan caught real issues each round (10 critical issues round 1, 4 critical round 2, 1 cosmetic round 3) and converged. Keep the default cap at 3 rounds. Stop conditions need to be: ship-as-is, OR no new architectural issues, OR cap reached.

## Do-not-repeat: do not skip handshake protocols

Do not repeat the cowork ghost-session pattern. When delegating to a fresh agent session, the handshake confirmation must be the literal first instruction in the handoff document, bolded, and include a deadline (60 seconds). If the handshake doesn't land, the orchestrator must treat the agent as dead and pivot, not wait.

## Gap: no Netlify ↔ GitHub link automation

Gap: Netlify's git linking still requires the vendor UI. We need an "assisted-manual capability" pattern that opens the deep-link URL and polls the API to detect completion. The pattern should generalize to Resend domain verify, GoDaddy DNS confirmation, Stripe webhook setup, and other vendor flows that don't have programmatic equivalents.

## Preference: date-based release tags for sites, semver for the platform

Preference: site release tags use date-based scheme (vYYYY.MM.DD-HHMM) because sites change on event dates and tag legibility matters more than feature semantics. The hub repo uses semver (v2.0.1 today) because it's library/platform code with feature decisions.
