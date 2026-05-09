# Slice 5 — MBSH V2 Readiness Gate

**Status:** plan complete. MBSH V2 implementation NOT started.
**Date:** 2026-05-08
**Depends on:** Slices 1–4.

## 1. Purpose

Define the explicit gate that must pass before MBSH V2 implementation begins.
This slice produces:

- a draft MBSH V2 Intelligence Brief
- the capability truth required for MBSH V2
- component/slot candidates
- media registry candidates
- QA/proof gates
- the explicit next build action

No site code is written. No production deploy. No DNS or payment changes.

## 2. MBSH V2 Intelligence Brief (draft)

Stored at: `sites/site-mbsh-reunion/intelligence/intelligence-brief.json`
when implementation lands. Draft contents:

```json
{
  "site_tag": "site-mbsh-reunion",
  "title": "MBSH Class of '96 — 30th Reunion (V2)",
  "vertical": "reunion",
  "audience": ["alumni-1996", "alumni-plus-ones", "committee", "press"],
  "goals": [
    "drive RSVP completion before deadline",
    "showcase committee + sponsors with credibility",
    "establish on-site flow: schedule, venue, lodging, contact",
    "feel premium and personal — not generic event template"
  ],
  "must_haves": [
    "hero with reunion identity + countdown",
    "RSVP form wired to existing endpoint",
    "schedule with venue + time blocks",
    "committee bios with photos",
    "sponsor wall",
    "contact page with at least one real channel",
    "Hi-Tide Harry as visible site assistant (per memory)"
  ],
  "non_goals": [
    "ticketing/payment processing in V2",
    "live-streaming infra",
    "merchandise commerce"
  ],
  "blockers_known": [
    "real photography + bios for committee (content sourcing)",
    "sponsor logos and approvals",
    "final venue confirmation copy"
  ],
  "v1_learnings": [
    "see docs/mbsh/V2-LEARNINGS.md (P12 final reel + dirty-Harry closeout)"
  ]
}
```

## 3. Capability truth required for MBSH V2

Capability truth chips required green before MBSH V2 implementation:

| Capability | Required | Source |
|---|---|---|
| `intelligence_brief.read` | green | Slice 3 reader |
| `capability_truth.read` | green | Slice 3 reader |
| `run_ledger.append` | green | Slice 4 writer |
| `proof_packet.attach` | green | Slice 4 writer |
| `learning_candidate.capture` | green | Slice 4 writer |
| `cost.cap_at_50` | green | Slice 4 cost wiring |
| `server.modularization_path` | green | Slice 2 plan + first extraction shipped |
| `hero_layered_vocabulary` | green | famtastic-dna.md non-negotiable |
| `nav_skeleton_vocabulary` | green | famtastic-dna.md non-negotiable |
| `logo_pipeline_single_emit` | green | famtastic-dna.md |
| `post_processing_pipeline` | green | famtastic-dna.md |
| `harry_assistant_present` | yellow | memory: Hi-Tide Harry must be interactive, not decoration |
| `media_registry` | yellow | candidates listed below; not all assets sourced |
| `rsvp_endpoint_live` | yellow | exists in V1; needs V2 schema confirmation |

Yellow items are allowed at gate-open; they convert to blockers at MBSH V2
runtime if not resolved.

## 4. Component / slot candidates

Reused from MBSH V1 + new V2 needs. Pulled from the active component library
(per `STUDIO-CONTEXT.md`, total components: 6) plus skeleton additions.

Reusable as-is:
- `fam-hero-layered` (with `--bg`, `--fx`, `--character`, `--content`)
- `NAV_SKELETON` nav with `.nav-links`, `.nav-cta`, `.nav-toggle-label`,
  `.nav-mobile-menu`, `#nav-toggle`
- multi-part logo: `logo-full.svg`, `logo-icon.svg`, `logo-wordmark.svg`
- divider SVGs (wave, tilt, peak, arch)
- live countdown timer (existing component)
- CSS starburst badge (existing component)

New for V2:
- `committee-grid` slot — 6–12 cards, photo + name + role + class memory
- `sponsor-wall` slot — logo grid, tiered (presenting, gold, supporter)
- `schedule-block` slot — day → time → location triplets, expandable
- `rsvp-form` slot — wraps existing endpoint, adds dietary + plus-one fields
- `harry-assistant` overlay — interactive, context-aware (per memory)
- `gallery-then-now` slot — paired V1 → V2 photos, optional

## 5. Media registry candidates

Tracked at `sites/site-mbsh-reunion/media/registry.json` (registry shape
already used by FAMtastic). Required slots:

- hero_bg (image or video, 1920+ wide)
- committee_photos[12] (square crops, ≥600px)
- sponsor_logos[] (SVG preferred, PNG fallback)
- venue_photo (landscape, ≥1600px)
- mascot/identity art (Hi-Tide Harry variants)
- og:image / favicon set (auto-derived from logo)

Source plan: import from V1 `site-mbsh96reunion` build where available;
flag missing items as Slice 5 non-blockers, source before MBSH V2 launch.

## 6. QA / proof gates (must pass at MBSH V2 build close)

Each gate writes a Proof Packet entry per Slice 4 contract.

| Gate | Proof kind | Target |
|---|---|---|
| route smoke (Slice 2 §3) | `route_smoke` | all 200 |
| Studio test suite | `test_run` | exit 0 |
| build pipeline ran via `runPostProcessing` | `pipeline_event` | every page |
| logo pipeline emitted three SVGs | `file_exists` | `logo-full/icon/wordmark.svg` |
| no inline `style=` in generated HTML | `lint_result` | 0 hits |
| BEM hero double-dash present | `lint_result` | matches `--bg/--fx/--character/--content` |
| nav skeleton class names match | `lint_result` | matches NAV_SKELETON vocab |
| accessibility audit | `a11y_run` | WCAG 2.1 AA pass on hero, nav, RSVP |
| Lighthouse perf | `lighthouse` | perf ≥ 85 mobile, ≥ 95 desktop |
| Hi-Tide Harry interactive check | `screenshot` + `dom_assert` | visible, focusable, responds |
| visual layout verifier | `screenshot` | header/hero/contain pass |
| responsive verifier | `screenshot` | 375 / 768 / 1280 |
| console health | `console_log_scan` | 0 errors, 0 404s |

## 7. Stop conditions for MBSH V2 implementation start

Do **not** start MBSH V2 implementation if any of these are true:

- any green-required capability in §3 is yellow or red
- Slice 2 first extraction has not landed (server modularization path
  unproven)
- the V2 brief in §2 has not been written to the site's intelligence dir
- no Run Ledger run-id has been issued for the V2 build
- cost cap is already exceeded on the site

## 8. Next build action (explicit)

> Land Slice 2 Phase 1 step 1 extraction (`site-studio/server/validators.js`),
> verify B1–B9 baseline, then implement Slice 3 reader module with the four
> `/api/intelligence/*` routes and hook Studio's Intelligence panel to render
> from Slice 1 fixtures. Once green, write the MBSH V2 brief from §2 to
> `sites/site-mbsh-reunion/intelligence/intelligence-brief.json` and open a
> Run Ledger for `site-mbsh-reunion`. MBSH V2 implementation begins only
> after that ledger exists and §3 capability truth is satisfied.

## 9. Acceptance for this slice (planning-only)

- this document exists with §2–§8 populated
- references Slice 1 contracts and Slice 2/3/4 plans
- no production/DNS/payment/destructive action taken
- `RUN_STATUS.md` updated

## 10. Non-blockers logged

- Real V2 photography, sponsor approvals, and venue copy are content tasks,
  not engineering blockers; they convert to blockers only at launch.
- Lighthouse and a11y MCP tools are available locally per the deferred tool
  list; they will run as part of the V2 proof packet without paid calls.
