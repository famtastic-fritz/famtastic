# MBSH Premiere — Deferred Assets & Fallbacks

**Tracks:** every asset/pose that was NOT generated this run, with the explicit fallback in use
**Source of truth:** Design Map §3 + V3 §4 pose register
**Updated:** 2026-05-07 (P1 paused; image-gen capability check completed)

---

## Image-generation toolchain status (real fallback chain)

Per `IMAGE-GEN-CAPABILITY-CHECK.md` (2026-05-07):

| Order | Provider | Status | Reason / Fix |
|---|---|---|---|
| 1 | **Gemini / nano-banana (PRIMARY)** | ✅ **READY** (rotated 2026-05-07 17:26 UTC) | New key tested HTTP 200; model reply `OK`. P3 raster generation cleared to start. |
| 2 | OpenAI DALL-E / `gpt-image-1` (backup 1) | ❌ Unavailable | No `OPENAI_API_KEY` configured (not needed unless Gemini regresses) |
| 3 | Adobe Firefly (backup 2) | ❌ Unavailable | `firefly_client_id` + `firefly_client_secret` empty in studio-config (not needed unless Gemini regresses) |
| 4 | Canva MCP (backup 3) | ❓ Unknown | Plugin registered (`mcp__plugin_marketing_canva__*`); OAuth + image-gen scope unverified (not needed unless Gemini regresses) |
| 5 | Local / manual (backup 4) | ⚠️ Manual only | `ffmpeg` present (video, not gen); no ImageMagick; no local diffusion model |
| 6 | CSS / SVG / existing-pose (FINAL) | ✅ Active | Documented per-asset below; ships today |

**Pass 3 status:** unblocked. Generation can begin per the priority order at the bottom of this doc the moment the build run resumes.

---

## P3 generation queue — Harry poses (Gemini ready)

| File | Pose | Used by | Fallback in use | Acceptable? |
|---|---|---|---|---|
| `11-peeking.png` | Peek from edge | Story-Now (2.1.3); Through-Years eras (2.4.2-2.4.3) | `06-listening.png` slid in from edge | M risk — degrades V3-feel for Story-Now; tolerable for era cards |
| `12-clipboard.png` | Holding clipboard | Through-Years Add-a-Memory (2.4.7); Capsule writing (2.6.1) | `03-thinking.png` | Tolerable |
| `13-ticket-stub.png` | Holding ticket stub | RSVP success (2.2.3) | `02-thumbs-up.png` | Tolerable; ticket-stub graphic still flips |
| `14-wax-stamping.png` | Stamping wax seal | Capsule submit success (2.6.2) | `02-thumbs-up.png` | Tolerable; wax animation still fires |
| `15-seated-usher.png` | Seated in cinema seat | RSVP page header (2.2.1) | `06-listening.png` | Acceptable — listening reads as attentive |
| `16-conducting.png` | Conducting | Playlist (2.7.1, 2.7.2) | `04-excited-cheer.png` | Acceptable — energy matches |
| `17-respectful.png` | Standing respectfully | Home Forever section | `06-listening.png` | Tolerable |
| `18-presenting.png` | Presenting board | Tickets page header (2.3.1) | `08-pointing.png` | Tolerable |
| `19-pointing-down.png` | Pointing down | Various form-below moments | `08-pointing.png` rotated via CSS | Acceptable |
| `20-pointing-across.png` | Pointing across | RSVP What to Expect (2.2.4); Capsule prompts (2.6.3) | `08-pointing.png` mirrored | Acceptable |
| `21-pride-celebrate.png` | Pride celebrate | Story-Forever (2.1.4) | `04-excited-cheer.png` | M risk — cheer is less reverent for legacy |
| `22-walk-frame.png` | Walking | Tickets tier hover (2.3.2); home cross-section walks | No walk; pose-swap in place | Acceptable on mobile; degrades desktop |
| `23-salute.png` | Salute | Home footer (2.1.7); Era 2026 (2.4.6); Tickets tiers | `02-thumbs-up.png` | Tolerable |

**Net assessment:** 13 poses missing. **9 fallbacks acceptable**. **3 fallbacks tolerable but degrade specific moments** (Story-Now peek, Story-Forever pride, walk transitions). **1 acceptable per-page.**

P3 priority generation order (Gemini ready as of 2026-05-07 17:26 UTC):
1. `11-peeking.png` (highest visual impact — Story-Now is a hero moment)
2. `21-pride-celebrate.png` (Forever legacy moment)
3. `13-ticket-stub.png` (RSVP success is high-traffic)
4. `14-wax-stamping.png` (Capsule submit)
5. Remaining 9 — order doesn't matter much

---

## P3 generation queue — Backdrops (Gemini ready)

| File | Page | Fallback in use | Acceptable? |
|---|---|---|---|
| `bg-rsvp.jpg` | RSVP | CSS gradient (Miami dusk-style) | Tolerable |
| `bg-tickets.jpg` | Tickets | CSS gradient (red carpet style) | Tolerable |
| `bg-through-years.jpg` | Through-Years | Existing `02-rebuilt-school-push-in.mp4` looped (per R4) | Acceptable — actually upgrade |
| `bg-capsule.jpg` | Capsule | CSS gradient (wood + parchment) | Tolerable |
| `bg-playlist.jpg` | Playlist | CSS gradient (spotlight pools) | Acceptable — CSS handles spotlights well |

---

## P3 generation queue — Raster brand assets (Gemini ready)

| File | Use | Fallback in use | Acceptable? |
|---|---|---|---|
| `velvet-curtain.png` | Curtain rise wipe | CSS scarlet gradient | Acceptable |
| `tier-{platinum,gold,silver,bronze}.png` | Patron tier medallions | CSS foil-shimmer sweep on hover | Tolerable |
| `brand-mark-foil.png` | Story-Forever silver-foil | Existing `brand-mark.png` + CSS sheen overlay | Acceptable |

---

## Deferred SVG components (P2 wiring, not blocked)

These are Pass-1-eligible but were deferred to P2 wiring since they're tightly coupled to page integration:

| File | Use | Status | Reason for deferral |
|---|---|---|---|
| Cinema countdown leader | RSVP, Through-Years intro | Component pending | Easier to build alongside page wiring than in isolation |
| Envelope+letter SVG | Capsule | Component pending | Same reason |
| Wax seal SVG (upgrade from CSS) | Capsule submit | Component pending | Same reason |
| Clipboard SVG | Through-Years Add a Memory | Component pending | Same reason |
| Moon SVG | Memorial header | Component pending | Same reason |

These will land in P2 alongside the page they serve.

---

## Re-generation priority (Gemini ready — execute in this order on P3 start)

1. `11-peeking.png` (Story-Now hero moment)
2. `21-pride-celebrate.png` (Forever legacy moment)
3. `13-ticket-stub.png`, `14-wax-stamping.png` (unique success states)
4. `tier-platinum.png`, `tier-gold.png`, `tier-silver.png`, `tier-bronze.png` (visual upgrade)
5. `bg-rsvp.jpg`, `bg-tickets.jpg`, `bg-capsule.jpg` (page-defining backdrops)
6. Remaining poses + `velvet-curtain.png` + `brand-mark-foil.png`

---

## Note on R4 (Through-Years backdrop)

V2 plan missed the existing 5 production MP4s in `assets/backgrounds/`. `02-rebuilt-school-push-in.mp4` (slow camera push) is a perfect fit for Through-Years page backdrop, already in the repo, rights-cleared. Surfacing this is an UPGRADE over generating a new image. P2 will wire this.
