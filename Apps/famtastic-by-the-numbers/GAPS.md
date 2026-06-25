# FAMtastic By the Numbers — Gap Log

Date: 2026-06-25
Status: live-paypal purchase proof complete; launch-proof bugfix pass applied

## Proof that ran
- Local MySQL runtime provisioned with Homebrew and started via `brew services start mysql`
- Local DB bootstrap:
  - `npm run db:bootstrap-local`
- Schema migration:
  - `set -a && source ./.env && set +a && npm run migrate`
- Schema verification:
  - `set -a && source ./.env && set +a && npm run verify-db`
  - Observed: JSON proof showing `premium_checkout_sessions`, `premium_purchases`, and `premium_unlocks`
- Live config preflight:
  - `set -a && source ./.env && set +a && npm run verify-paypal-config`
  - Observed: `{ "ok": true, "ready": true, "paypalEnv": "live", "paypalClientIdPresent": true }`
- Health/config proof:
  - `curl -s http://127.0.0.1:4174/api/health`
  - Observed: `{"ok":true,"app":"famtastic-by-the-numbers","premiumPriceCents":100,"paymentMode":"live","persistenceMode":"mysql"}`
  - `curl -s http://127.0.0.1:4174/api/config`
  - Observed: runtime config with support email `hello@famtasticdesigns.com`, product name `FAMtastic By the Numbers Premium Unlock`, CTA label `Unlock premium for $1`, `paypalEnv=live`, and `paymentMode=live`
- Live order creation preflight:
  - `POST /api/paypal/create-order`
  - Observed: live PayPal order id returned plus approval URL, without completing capture
- Legacy browser proof retained from pre-live lane:
  - `set -a && source ./.env && set +a && npm run smoke`
  - Observed previously under mock mode: MySQL-backed unlock, reload persistence, restore flow, and return-lane handling all passed
  - `set -a && source ./.env && set +a && npm run smoke:local`
  - Observed previously under mock mode: local proof regression passed

## Live purchase proof that closed the web-proof gap
1. Fritz completed one real $1 PayPal purchase
- Observation: the live browser flow completed successfully and Fritz confirmed the return landed back in the app.
- Interpretation: the live payment rail is now proven end-to-end in the real browser path, not just by preflight or mock-capture proof.
- CLI workaround: none needed.
- Suggested GUI fix: complete. Follow-on polish should focus only on UX bugs like layout collisions, not payment-proof uncertainty.

2. Post-purchase persistence and restore behavior also proved out
- Observation: Fritz confirmed premium remained active after the live purchase flow and that the app worked after the final buy.
- Interpretation: the MySQL-backed unlock persistence and return/reload/restore behavior are now validated in the real-money lane.
- CLI workaround: none needed.
- Suggested GUI fix: complete for closeout scope.

3. Mobile hero badge overlap bug was discovered during live validation and fixed
- Observation: the `Soul Urge` floating badge in the home-page hero card could overlap wording on narrower layouts.
- Interpretation: payment proof is complete, but the live acceptance pass exposed a real mobile presentation bug.
- CLI workaround: none.
- Suggested GUI fix: fixed in `styles.css` by increasing mobile hero-card spacing and repositioning the floating badges under the `@media (max-width: 900px)` rules.

## Product gaps that remain intentionally deferred
2. Compatibility engine is still heuristic, not full-chart/timing depth
- Observation: `app.js` still uses the current compatibility and premium narrative system rather than a full-chart timing engine.
- Interpretation: acceptable for current V1/V2 truth, not a reason to block web proof.
- CLI workaround: none needed for closeout.
- Suggested GUI fix: expand compatibility to combine Life Path, Expression, Soul Urge, Personality, and timing overlays with explicit confidence boundaries.

3. Premium interpretation depth can outrun the underlying scoring model
- Observation: deep profile, compatibility deep dive, and year map still depend on the current modern/Pythagorean ruleset plus lightweight heuristics.
- Interpretation: premium copy must stay disciplined so confidence does not exceed the model.
- CLI workaround: keep premium copy configurable.
- Suggested GUI fix: tie each premium narrative block to visible underlying signals.

4. Daily guidance is still lightweight
- Observation: `buildDailyGuidance()` still derives from Personal Year + current date and static meaning/tension copy.
- Interpretation: valid early guidance layer, not a richer forecasting system.
- CLI workaround: none.
- Suggested GUI fix: add month/day cycle layers and clearer sequencing.

5. No alternate lineage mode yet
- Observation: the app remains explicitly modern Western / Pythagorean-first in README and code.
- Interpretation: lineage separation doctrine is still correct, but alternate modes are future work.
- CLI workaround: none.
- Suggested GUI fix: add alternate lineage modes as clearly separated systems.

## Delivery truth
- Verified app path: `/Users/famtasticfritz/famtastic/apps/famtastic-by-the-numbers`
- Verified closeout env template: `/Users/famtasticfritz/famtastic/apps/famtastic-by-the-numbers/.env.closeout.example`
- Verified operator checklist: `/Users/famtasticfritz/famtastic/apps/famtastic-by-the-numbers/OPERATOR-CLOSEOUT-CHECKLIST.md`
- Verified MySQL schema and runtime: pass
- Verified live PayPal config preflight: pass
- Verified live order creation preflight: pass
- Remaining blocker to final web proof: Fritz's real $1 PayPal purchase and post-return persistence confirmation
