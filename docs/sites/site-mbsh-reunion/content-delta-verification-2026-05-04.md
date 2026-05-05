# MBSH Content Delta Verification — 2026-05-04

## Verdict

**The v2 site covers the V1 page architecture and most core copy, but launch content remains incomplete.** The seven required public pages exist, the cinematic identity is present, the RSVP/tickets/sponsor/capsule/playlist/memorial scaffolds are implemented, and the footer/compass/chatbot are repeated across pages. The unresolved deltas are mostly launch-data and content-readiness items: final date/venue/payment values, missing story/gallery media, placeholder playlist ID, empty In Memory content, no seeded attendee/sponsor/memory data, and backend runtime proof.

## V1 Pages vs Current v2

| V1 requirement | Current v2 state | Evidence |
|---|---|---|
| Home | Present with hero, video background, brand mark, Harry, Story, event details, previews, compass, chatbot, footer | `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/index.html` |
| RSVP | Present with countdown, progressive form, honeypot, timestamp, consent, success state | `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/rsvp.html` |
| Tickets + sponsors | Present with ticket cards, sponsor tiers, sponsor modal, empty sponsor wall | `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/tickets.html` |
| Through the Years | Present with five-era timeline and memory form | `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/through-years.html` |
| Memorial | Present with hidden/empty-state behavior | `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/memorial.html` |
| Capsule | Present with time-capsule form and success state | `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/capsule.html` |
| Playlist | Present with Spotify embed placeholder and suggestion form | `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/playlist.html` |

## Content Deltas

1. **Date mismatch / committee lock:** V1 source says Saturday, July 12, 2026 is assumed pending confirmation. Current public config renders `October-November 2026 - Miami Beach (date confirmed by committee, coming soon)`, while backend capsule cron still targets July 12 through the default send date. The site needs one committee-approved value before launch.
2. **Venue placeholder:** V1 expects venue templating until locked. Current site correctly says venue announcement coming soon.
3. **Payment placeholder:** Ticket and sponsor CTAs are intentionally disabled/inquiry-based. PayPal is not live.
4. **Story imagery missing:** Home Story and Through the Years reference seven missing `frontend/assets/story/*.jpg` files. See `docs/sites/site-mbsh-reunion/media-story-assets-verification-2026-05-04.md`.
5. **Playlist placeholder:** `playlist.html` contains `PLACEHOLDER_ID`; no real Spotify playlist ID is wired.
6. **In Memory content empty:** Memorial page is structurally present but has no committee-curated names.
7. **Who’s Coming social proof absent:** RSVP backend/feed exists, but no seeded or live attendee data is present.
8. **Sponsor wall empty:** Sponsor wall structure and backend feed exist, but no approved sponsors are seeded.
9. **Audio/voice optional assets not wired:** Harry voice/TTS remains future scope.
10. **Official school medallion vs commissioned mark:** V1 later clarifies to use the commissioned 30+100 mark, not official medallion IP. v2 follows the commissioned-mark direction.

## What Is Strong

- The seven-page structure is complete.
- The MBSH scarlet/silver cinematic direction is implemented.
- Hi-Tide Harry appears as the hero/chatbot/RSVP/tickets/error personality layer.
- Forms include honeypot + form-loaded timestamp.
- Committee contact and FAMTastic footer credit are present.
- Backend endpoints exist for the interactive content path.

## Remaining Content Closure Checklist

- Decide one canonical reunion date display and sync frontend config, countdown, capsule send date, and FAQ answer.
- Add or generate the seven missing story/timeline images, or retarget markup to existing approved assets.
- Replace `PLACEHOLDER_ID` with the real Spotify playlist embed ID.
- Seed initial sponsor/attendee/memory/In Memory data or keep explicit empty-state launch messaging.
- Run production smoke tests once backend config and deploy access exist.

## Reusable Platform Gap

Studio needs a **brief-to-deploy content delta checker** that compares required pages, config placeholders, media references, backend endpoints, and seeded-data expectations before a site can be marked launch-ready.
