# Hosting Surface Audit + Production Remediation Plan

Date: 2026-06-19
Status: active
Owner: Fritz + Shay

## Purpose
Stop the long-running split-host drift, preserve every live surface, and move the FAMtastic production stack onto an intentional architecture instead of historical leftovers.

## Goal
Create one authoritative production map, one safe cutover order, and one cleanup path that improves efficiency without losing any live asset.

## Grounded current-state matrix

| Domain | Live IP | Runtime / Server | Current observed role | Notes |
|---|---:|---|---|---|
| famtasticinc.com | 107.180.51.234 | Apache | legacy brand/root host | Title: `Famtastic Fritz` |
| famtastichosting.com | 107.180.51.234 | Apache | active hosting facelift | Title: `FAMtastic Hosting — Premium WordPress & Web Hosting` |
| www.famtastichosting.com | 107.180.51.234 | Apache | same as apex | No redirect detected |
| famtasticdesigns.com | 132.148.233.159 | Apache + Drupal/PHP | live Designs domain, still old stack | Title: `Home | FAMtastic Designs`, `x-generator: Drupal 10` |
| www.famtasticdesigns.com | 132.148.233.159 | Apache + Drupal/PHP | same as apex | No redirect detected |
| famtasticthoughts.com | 107.180.51.234 | Apache | parked/legacy Thoughts surface | Empty title in current response |
| mbsh96reunion.com | 75.2.60.5 | Netlify | live reunion frontend | Title: `MBSH Class of ’96 — 30th Reunion` |
| api.mbsh96reunion.com | 107.180.51.234 | Apache | active backend/API surface | Current root page title resolves like `Famtastic Fritz` |

## Redirect / forwarding truth

`famtastichosting.com` is NOT currently forwarding at the host level.

Verified:
- `https://famtastichosting.com` -> `200 OK`
- `http://famtastichosting.com` -> `200 OK`
- `https://www.famtastichosting.com` -> `200 OK`
- No HTTP `Location` redirect
- No HTML meta refresh found
- No JS redirect found
- Page HTML does not contain `store.famtastichosting.com` or `famtasticinc.com` as a redirect target

Best current explanation if behavior differs by device/browser:
- stale browser cache/history/session behavior, not an active live domain forward

## Verified local deploy truth

### FAMtastic Hosting
From `obsidian/02-Income/FAMtastic-Hosting-Session-2026-06-11.md`:
- Apache docroot: `/home/nineoo/public_html/famtastichosting.com/`
- Node app root: `/home/nineoo/public_html/famtastichosting.com/site/`
- Node listener: `127.0.0.1:3001`
- Current architecture is Apache static shell + Node proxied app
- This surface already has a real deploy path and real server-side app state

### FAMtastic Designs
From `sites/site-famtastic-designs/docs/DEPLOY-RUNBOOK.md` plus duplicate-path audit on 2026-06-19:
- Canonical source: `/Users/famtasticfritz/famtastic/sites/site-famtastic-designs`
- Live domain was already cut over to the static marketing site on 2026-06-19
- Duplicate legacy tree still exists at `famtastic-sites/famtastic-designs`, but it is not safe to delete blindly because it is a dirty nested repo with unique `apps/web` and artifact history
- The canonical tree now owns deploy-truth docs, but the static-export build lane still needs to be migrated into it

## Critical findings

1. There are at least two real production hosting surfaces:
   - `107.180.51.234` = old central cPanel/shared-host world
   - `132.148.233.159` = separate GoDaddy host currently serving Designs

2. `famtastichosting.com` is not the current redirect problem. The live host is serving the facelift directly.

3. `famtasticdesigns.com` is the biggest production misalignment right now.
   - The canonical new code is ready.
   - The live domain still points at old Drupal.
   - This is pure host/docroot/control-plane misalignment.

4. `api.mbsh96reunion.com` still depends on the old `107.180.51.234` world even though the frontend is on Netlify.

5. `famtasticinc.com` is functioning as a legacy root/utility surface, but right now it also creates ambiguity because multiple things smell like they grew around it instead of being intentionally placed.

## Ruthless efficiency classification

| Surface | Keep | Why |
|---|---|---|
| famtasticdesigns.com | YES | primary income/product front door |
| famtastichosting.com | YES | active hosting facelift / reseller-facing surface |
| mbsh96reunion.com | YES | live client site |
| api.mbsh96reunion.com | YES | active backend dependency |
| famtasticthoughts.com | YES, preserve first | strategic Thoughts studio seed, but currently underused |
| famtasticinc.com | MAYBE / needs decision | likely becomes platform/backend/admin root OR legacy redirect/archive |

## Production remediation strategy

### Rule 1 — Preserve before cleanup
No destructive cleanup until each surface has:
- current backup location
- canonical repo/source path
- intended future role
- verified live smoke test after any change

### Rule 2 — Fix revenue-facing misalignment before architecture beautification
Priority order:
1. `famtasticdesigns.com`
2. `famtastichosting.com`
3. `api.mbsh96reunion.com`
4. `famtasticthoughts.com`
5. `famtasticinc.com`

### Rule 3 — One domain, one declared job
Every domain must end this process as one of:
- primary site
- storefront/facelift
- API/backend
- redirect-only
- archive/legacy

## Safe execution order

### Wave 0 — Inventory lock
Before changes:
- backup current live content on `132.148.233.159` for Designs
- backup current live content/config on `107.180.51.234` for Hosting/Thoughts/API if touched
- write final domain -> host -> role inventory

### Wave 1 — Ship Designs for real
Objective:
Replace old Drupal live surface with the prepared modern static export on `132.148.233.159`

Steps:
1. authenticate to the actual host behind `132.148.233.159`
2. archive current live Drupal docroot
3. upload/export new static build
4. smoke-test:
   - `/`
   - `/contact`
   - `/services`
   - `/the-famtastic-way`
   - `/serve/nonprofits`
   - `/gallery`
5. only after live verification, mark old local Drupal tree as losing directory

### Wave 2 — Confirm Hosting is the right live face
Objective:
Make `famtastichosting.com` intentional, not accidental

Steps:
1. verify current server content matches intended facelift build
2. verify whether old reseller/store links still leak where they should not
3. verify cache headers / canonical tags / domain consistency
4. document the exact deploy command and source repo as canonical
5. if desired, add explicit redirect policy between `www` and apex so behavior is deterministic

### Wave 3 — Stabilize the MBSH split stack
Objective:
Make frontend/backend split explicit and documented

Steps:
1. confirm `mbsh96reunion.com` frontend stays on Netlify
2. confirm `api.mbsh96reunion.com` remains on `107.180.51.234` for now
3. verify TLS/cert expiry runbook for API surface
4. decide whether backend stays there or migrates later

### Wave 4 — Clarify Thoughts
Objective:
Preserve the domain, then decide if it stays parked, redirects, or becomes active

Steps:
1. snapshot current host contents
2. identify canonical future repo/home
3. decide live placeholder vs active build vs redirect-only

### Wave 5 — Decide what `famtasticinc.com` is
Objective:
Kill ambiguity at the root

Possible futures:
- platform/admin/backend root
- company/about root
- redirect to another flagship domain
- legacy utility surface retained but clearly documented

## Highest-value change to make first
The first high-leverage production move is NOT DNS reshuffling.
It is:
- complete authenticated cutover of `famtasticdesigns.com` from old Drupal to the already-prepared modern build on `132.148.233.159`

Why:
- source truth already exists
- build already succeeds
- live domain already exists
- this closes the biggest public-facing mismatch immediately

## Changes explicitly NOT recommended yet
- Do not repoint `famtasticdesigns.com` DNS to `107.180.51.234` just because that host is familiar. The live-host identity rule says public DNS beats cPanel appearance.
- Do not delete any cPanel addon-domain or docroot just because it looks stale.
- Do not retire `famtasticinc.com` until its exact future role is decided.
- Do not migrate MBSH backend during the Designs fix lane.

## Blockers

Current hard blocker for Wave 1:
- authenticated write access to the actual host/docroot behind `132.148.233.159`

Current blocker for deeper consolidation:
- no verified SSH/cPanel access path has been exercised yet for the `132.148.233.159` surface in this run

## Proof used for this audit
- live DNS resolution checks
- live HTTP/HTTPS header checks
- live title extraction from each public domain
- `obsidian/02-Income/FAMtastic-Hosting-Session-2026-06-11.md`
- `sites/site-famtastic-designs/docs/DEPLOY-RUNBOOK.md`
- `plans/three-lines-pipeline-2026-06-09.md`
- `godaddy-reseller-ops` skill references, especially live-host identity guidance

## Recommended immediate next action
1. get into the real `132.148.233.159` hosting surface
2. backup live Drupal docroot
3. cut over `famtasticdesigns.com`
4. then do host-by-host cleanup from a position of shipped truth, not speculation
