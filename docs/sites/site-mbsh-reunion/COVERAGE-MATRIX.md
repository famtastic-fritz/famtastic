# MBSH Premiere — Design Map Coverage Matrix

**Tracks:** every section in Design Map §2 against build-pass status
**Last updated:** 2026-05-07 (P1 paused for Fritz)

Legend: ✅ shipped this pass · 🟡 in progress · ⬜ pending · ⏸ deferred (with fallback) · 🚫 blocked

---

## Global components (Design Map §1)

| Component | P0 | P1 | P2 | P3 | P4 | P5 | P6 | P7 | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Z-layer architecture documented | ✅ | — | — | — | — | — | — | — | P0 — header in premiere.css/.js |
| Feature-flag mechanism | ✅ | — | — | — | — | — | — | — | Already in `body[data-premiere="on"]` |
| Premiere FX overlay | ✅ | — | — | — | — | — | — | — | Shipped V1 — kept |
| Starfield (home + memorial only) | ⬜ | ⬜ | — | — | — | — | — | — | Currently on too many pages — scope in P2 |
| Stage backdrop slot | ✅ | — | — | — | — | — | — | — | Auto-injected in `premiere.js` |
| Filmstrip frame component | — | ✅ | — | — | — | — | — | — | P1 — D4 (sandbox; awaiting Fritz approval) |
| Ribbon divider component | — | ✅ | — | — | — | — | — | — | P1 |
| Medallion-as-menu | — | ✅ | — | — | — | — | — | — | P1 — D5 (sandbox; arc-on-corner polish open) |
| Snap mechanism | — | ✅ | — | — | — | — | — | — | P1 — D8 (sandbox; iOS device test deferred to P6) |
| Harry walk/peek/celebrate vocabulary | — | ✅ | — | — | — | — | — | — | P1 (CSS classes + JS triggers) |
| Page-transition curtain (sessionStorage) | ✅ | — | — | — | — | — | — | — | Shipped V1 — kept |
| Animated typography catalog | — | — | — | — | — | ⬜ | — | — | P5 |
| Removed: top nav | — | ✅ | — | — | — | — | — | — | P1 — hidden via `[data-medallion-menu="mounted"]` |
| Removed: edge film strips | — | ✅ | — | — | — | — | — | — | P1 — hidden via same |
| Removed: "Compass" label | — | ✅ | — | — | — | — | — | — | P1 |
| Removed: .is-visible snap-in bounce | — | ✅ | — | — | — | — | — | — | P1 — no-op when `[data-snap="on"]` |

## Per-page sections (Design Map §2)

### 2.1 HOME — *The Premiere Arrival*

| Section | Status | Pass | Notes |
|---|---|---|---|
| 2.1.1 Hero | ⬜ | P1 (curtain plumbing already in place) + P2 (assets) + P5 (typography polish) | Existing assets only |
| 2.1.2 Story — Then | ⬜ | P2 (mirrored point fallback) + optional P4 | Pose 11-pointing-left missing → mirrored 08 |
| 2.1.3 Story — Now | ⬜ | P2 (listening fallback) + P4 (real peek) | Pose 11-peeking missing |
| 2.1.4 Story — Forever | ⬜ | P2 (cheer fallback + CSS sheen) + P4 (real pride pose + raster brand-foil) | Pose 21 missing, brand-foil blocked |
| 2.1.5 Event Details (marquee) | ⬜ | P1 (component already shipped) + P5 (Allura draw-on) | All assets exist |
| 2.1.6 Cards / Poster Wall | ⬜ | P1 (frame component done) + P2 (markup + typography) + P5 | D4 dependency |
| 2.1.7 Footer | ⬜ | P2 (thumbs-up fallback) + P4 (real salute) | Pose 23-salute missing |

### 2.2 RSVP — *Take Your Seat*

| Section | Status | Pass | Notes |
|---|---|---|---|
| 2.2.1 Page header | ⬜ | P2 (CSS-gradient + listening fallback) + P4 (real assets) | Pose 15 + bg-rsvp.jpg missing |
| 2.2.2 Countdown | ⬜ | P1 (cinema-leader component pending) + P2 | Decided to defer leader component to P2 wiring since it's tightly coupled to page integration |
| 2.2.3 The Form (active reel frame) | ⬜ | P1 (frame done) + P2 (thumbs-up fallback) + P4 (real ticket-stub pose) | Pose 13 missing |
| 2.2.4 What to Expect | ⬜ | P2 + optional P4 | Pose 20-pointing-across missing → mirrored 08 |
| 2.2.5 Why this night | ⬜ | P2 | Existing |

### 2.3 TICKETS — *Patrons of the Evening*

| Section | Status | Pass | Notes |
|---|---|---|---|
| 2.3.1 Page header | ⬜ | P2 (CSS gradient + pointing fallback) + P4 (real assets) | Pose 18 + bg-tickets.jpg missing |
| 2.3.2 Tickets (3 tiers) | ⬜ | P2 (CSS medallions, no walk) + P4 (real medallions + walk) | Pose 22, tier medallions blocked |
| 2.3.3 Become a Patron | ⬜ | P2 (existing) + optional P4 | Pose 23-salute missing |
| 2.3.4 Why patronage matters | ⬜ | P2 | Existing |

### 2.4 THROUGH THE YEARS — *The Trailer Reel*

| Section | Status | Pass | Notes |
|---|---|---|---|
| 2.4.1 Reel-leader countdown | ⬜ | P2 (component built when wired) | Cinema-leader inline SVG — defer to P2 wiring |
| 2.4.2 Era 1926-1959 | ⬜ | P2 (with peek fallback) + P4 | Pose 11 missing |
| 2.4.3 Era 1960s-1970s | ⬜ | P2 / P4 | Pose 11 missing |
| 2.4.4 Era 1980s | ⬜ | P2 | All exist |
| 2.4.5 Era 1996 | ⬜ | P2 | All exist |
| 2.4.6 Era 2026 | ⬜ | P2 (thumbs-up fallback) + P4 (real salute) | Pose 23 missing |
| 2.4.7 Add a Memory (clipboard) | ⬜ | P2 (with thinking fallback) + P4 | Pose 12 + clipboard SVG missing; defer to P2 wiring |

### 2.5 MEMORIAL — *In Memoriam*

| Section | Status | Pass | Notes |
|---|---|---|---|
| 2.5.1 Header | ⬜ | P2 (Allura draw-on + moon SVG) + P5 polish | Backdrop CSS-only |
| 2.5.2 Names list | ✅ | (V1 ship — keep, polish in P5) | Already done |
| 2.5.3 Add a Name | ✅ | (V1 ship) | Already done |
| 2.5.4 At the Reunion | ✅ | (V1 ship) | Already done |

### 2.6 CAPSULE — *The Letter to Yourself*

| Section | Status | Pass | Notes |
|---|---|---|---|
| 2.6.1 Header | ⬜ | P2 (gradient + thinking fallback) + P4 (real bg + with-pen pose) | Pose 12 + bg-capsule.jpg missing |
| 2.6.2 The Envelope (form) | ⬜ | P2 (with thumbs-up fallback) + P4 (real wax-stamping pose) | Pose 14 + envelope SVG missing |
| 2.6.3 What to write | ⬜ | P2 + optional P4 | Pose 20 missing → mirror |
| 2.6.4 We deliver | ⬜ | P2 | Existing |

### 2.7 PLAYLIST — *Encore*

| Section | Status | Pass | Notes |
|---|---|---|---|
| 2.7.1 Header | ⬜ | P2 (CSS gradient + cheer fallback) + P4 (real conducting pose) | Pose 16 missing |
| 2.7.2 Vinyl + Spotify | ⬜ | P2 (vinyl + placeholder iframe) + P7 (real playlist ID) | D13 — Fritz/committee |
| 2.7.3 Tracklist | ⬜ | P2 | Existing 18 tracks |
| 2.7.4 About the soundtrack | ⬜ | P2 | Existing |
| 2.7.5 Suggest a track | ⬜ | P2 | Existing |

---

## Coverage summary (post-P1)

- **Total deliverables:** 30 sections + 16 global components = 46
- **Already shipped (V1, kept):** 6 (memorial 2.5.2-2.5.4 + premiere FX + feature flag + page transition curtain + stage backdrop slot + Z-layer doc)
- **Shipped this run (P0+P1):** 12 (Z-layer + 11 P1 component + removal items)
- **Pending P2 propagation:** ~24 production page sections
- **Blocked on P3 (Gemini):** 13 Harry poses + 4 backdrop images + 3 raster brand assets

---

## Update protocol

Updated at the end of every pass. The closeout for that pass cross-references the matrix rows it touched.
