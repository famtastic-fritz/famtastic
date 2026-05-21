# MBSH Super Vibe Coder Implementation Report — 2026-05-12

## Status

Implementation pass completed locally in `/Users/famtasticfritz/famtastic-sites/mbsh-reunion` and verified in the local browser server. The repo is ready for staging preparation, but no push, Netlify deploy, DNS change, or production change was performed.

## What changed in the site repo

Edited files:

- `frontend/js/page-sequence.js`
- `frontend/js/premiere.js`
- `frontend/css/premiere.css`

Existing untracked Wave 1 assets are now referenced by the implementation and must be included when preparing the staging branch:

- `frontend/assets/premiere/wave1/scenes/rsvp-velvet-seat.png`
- `frontend/assets/premiere/wave1/scenes/through-years-projection-booth.png`
- `frontend/assets/premiere/wave1/scenes/memorial-candle-still.png`
- `frontend/assets/premiere/wave1/scenes/capsule-envelope-wax-seal.png`
- `frontend/assets/premiere/wave1/scenes/playlist-curtain-confetti-still.png`
- `frontend/assets/premiere/wave1/manifest.json`
- `frontend/assets/premiere/wave1/wave1-scenes-contact-sheet.jpg`

## Implemented experience system

### Page sequence / scene truth

`frontend/js/page-sequence.js` is now the richer canonical experience map. Each page carries:

- scene number
- scene location
- mini-marquee scene title
- hero title
- hero kicker
- hero subcopy
- hero image
- page mood
- usher / Where Next copy

The canonical scene sequence is:

1. Home — The Premiere
2. RSVP — Lock Your Seat
3. Tickets — Box Office
4. Through the Years — Memory Reel
5. In Memory — In Memory
6. Time Capsule — Seal the Future
7. Playlist — The Soundtrack

### Interior layered heroes

`frontend/js/premiere.js` now upgrades each interior `.page-header` into an experience hero at runtime. The hero uses layered DOM structure:

- image layer
- dark wash layer
- projector beam layer
- grain/dust layer
- marquee bulb layer
- content card layer

The current implementation uses available assets and CSS motion; it does not require new paid generation.

### Mini marquee scene markers

Interior pages now receive a mini-marquee Scene Marker directly below the hero. It shows only:

- `SCENE NN`
- page scene title

This matches Fritz’s locked decision: simple mini marquee, not a full script label.

### Note from Usher as configurable info panel

The Note from Usher now injects after the hero + scene marker instead of after the first content section. This makes the page order:

Hero → Scene Marker → Note from Usher → Pre/Main/Post → Where Next

The Note remains slide/card based and page-configurable through the `BILLBOARD` map in `premiere.js`. It preserves the same transition behavior across desktop and mobile.

Important: existing illustrated Harry billboard images were hidden because several carry baked checkerboard artifacts. The voice/panel system remains; photoreal transparent Harry should replace those later.

### Page slot / height grammar

`premiere.js` now assigns `data-page-slot` and `data-height` to existing sections so the experience grammar is machine-readable without rewriting every HTML file.

Examples:

- RSVP countdown = pre / third
- RSVP form = main / content
- Memorial list = main / large
- Capsule form = main / content
- Where Next = where-next / large

### Form and interaction wow-factor

`premiere.css` adds a shared theatrical treatment for RSVP, sponsor, memory, capsule, playlist, ticket cards, tracklist, memorial empty state, and timeline poster:

- gold-edged frames
- dashed ticket/envelope inner borders
- stronger field focus glow
- animated CTA shine
- page-specific motion restraint/intensity
- chatbot bubble marquee-ring treatment

This upgrades the forms visually without changing backend behavior.

## Page-by-page outcome

### Home

Kept stable as the opening act. The home billboard stale copy was corrected from “Nine reels” to “Seven scenes.”

### RSVP

Now opens with a layered velvet-seat hero, `SCENE 02 / LOCK YOUR SEAT` mini marquee, Note from Usher in the right order, countdown as pre, form as main, and upgraded form framing/focus/CTA treatment.

### Tickets

Now opens with a Box Office hero, canonical `SCENE 03 / BOX OFFICE` marker, trust/purchase clarity copy, restrained animation, and stronger ticket/sponsor card treatment.

### Through the Years

Now opens with projection-booth hero, `SCENE 04 / MEMORY REEL`, corrected Note copy that no longer implies a fully live filmstrip, and the memory form is treated as the main contribution sequence.

### In Memory

Now opens with memorial candle hero, `SCENE 05 / IN MEMORY`, restrained/reverent styling, and Note copy that no longer implies a submission form exists. Memorial remains dignity-first.

### Time Capsule

Now opens with envelope/wax-seal hero, `SCENE 06 / SEAL THE FUTURE`, date-safe copy, and the form is framed as a seal-the-message ritual.

### Playlist

Now opens with curtain/confetti hero, `SCENE 07 / THE SOUNDTRACK`, clearer Spotify-placeholder copy, and the page gets the wildest allowable motion through equalizer-style CSS treatment.

## Verification performed

- `node --check frontend/js/page-sequence.js`
- `node --check frontend/js/premiere.js`
- Confirmed required hero assets exist.
- Ran local static server: `python3 -m http.server 4173 --directory frontend`
- Browser-checked:
  - `rsvp.html`
  - `tickets.html`
  - `through-years.html`
  - `memorial.html`
  - `capsule.html`
  - `playlist.html`
- Browser console showed no JavaScript errors during checked pages.
- Visual review performed on RSVP and calibrated spacing/Note panel after first pass.

## Known remaining items before staging push

1. The Wave 1 asset folder is still untracked and must be added when staging is prepared.
2. The current Harry assets in billboard slides are hidden because of checkerboard artifacts. Photoreal transparent Harry assets remain a future enhancement.
3. The implementation uses JS runtime upgrade of existing headers instead of rewriting each HTML page. This was the fastest safe path to every page and keeps blast radius low.
4. Backend/payment/date questions remain unchanged.
5. No staging branch push has happened yet.

## How the decisions were made

The pass used the FAMtastic Studio decision ladder:

1. Identify each page’s emotional job.
2. Decide what the visitor should understand without reading a paragraph.
3. Match image, motion, copy, and form treatment to that page’s emotional job.
4. Use layered DOM/CSS before spending more asset budget.
5. Preserve functionality/readability over decorative motion.
6. Keep mobile guidance and movement linear-first with free navigation always available.

## What would make this easier next time

FAMtastic Studio should have a structured “experience map” generator that takes:

- page name
- emotional job
- functional job
- scene title
- hero recipe
- Harry role/tier
- note slides
- animation tier
- mobile guidance

and emits the page-sequence config, hero scaffold, note-panel config, asset prompts, and staging checklist automatically.

## How Shay could help next time

Shay should act as the live vibe producer:

- watch for locked creative decisions in chat
- update the page map as Fritz speaks
- detect stale copy against current implementation
- keep a visible “what is decided / what is still open” panel
- preview each page against its emotional job
- warn when a page drifts back into generic website structure

## Future reusable prompt shape

“Build this as a FAMtastic controlled movie experience: define the page emotional map, create layered heroes, mini marquee scene markers, configurable usher notes, section-slot movement grammar, page-specific form wow, and stage-safe assets. Use CSS/layered DOM before expensive generation. Save the vibe trail and ship staging-ready.”
