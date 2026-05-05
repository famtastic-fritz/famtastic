# MBSH Media / Story Assets Verification — 2026-05-04

Task: `task-2026-05-04-028`  
Scope: `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2` plus MBSH docs/briefs.  
Write boundary: this proof artifact only.

## 2026-05-05 Update

**Resolved for launch-safe generated/derivative media.** The seven referenced
`frontend/assets/story/*.jpg` files now exist in the v2 deploy repo, and
rights/provenance are documented at
`/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/story/RIGHTS-MANIFEST.md`.

Proof:

- `/Users/famtasticfritz/famtastic/proofs/mbsh-story-assets-2026-05-05.json`
- `/Users/famtasticfritz/famtastic/proofs/mbsh-story-assets-2026-05-05.png`

This closes the missing-file launch blocker for `task-2026-05-04-028`. Future
archival/crowd-sourced replacement media still needs its own attribution and
approval log.

## Original 2026-05-04 Verdict

**Blocked for complete story/gallery/media readiness.** The v2 site has verified brand, mascot, and hero/background media assets, and those assets are wired into the hero, shared footer/header marks, chatbot, RSVP, ticket, and 404 surfaces. However, the active Story and Through the Years gallery/timeline markup references seven `frontend/assets/story/*.jpg` files that do not exist in v2. The story directory is intentionally empty except for `.gitkeep`, and `.gitignore` excludes story still image work, so these visuals will render blank/broken until generated/copied and committed or otherwise deployed.

## Current Assets Found

### Brand mark

- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/brand-mark/brand-mark.png`
  - 1024x1024 PNG, 2,251,854 bytes, md5 `a4c5f2d34e8e0aba8bb6a64a410ff4c0`.
  - Matches canonical `/Users/famtasticfritz/famtastic-sites/mbsh-reunion/frontend/assets/brand-mark/brand-mark.png`.
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/brand-mark/round-02-candidate-01-PROMOTED.png`
  - 1024x1024 PNG, 2,251,854 bytes, md5 `a4c5f2d34e8e0aba8bb6a64a410ff4c0`.
  - Same bytes as `brand-mark.png`.

### Mascot pose library

All ten Hi-Tide Harry PNGs exist under `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/mascot/` and match the canonical repo by md5:

- `01-wave-hello.png` — 1024x1536, md5 `316c2cb7043b79a5d7390778a52e2b9c`.
- `02-thumbs-up.png` — 1024x1535, md5 `5a548796d1a7fb609702c8aa3266ee62`.
- `03-thinking.png` — 1024x1536, md5 `0d122f1df7ed97870e097bde92f13a5c`.
- `04-excited-cheer.png` — 1024x1536, md5 `eb7a3a6417b3eb6cbbe88680dde8095a`.
- `05-disappointed.png` — 1024x1536, md5 `cf929cebf87a5b8beddc4a6e8ece1294`.
- `06-listening.png` — 1024x1536, md5 `1d21c571bd4f59cfa7c46d033a82e15c`.
- `07-confirming.png` — 1024x1536, md5 `7b778683027d5f63944e3061d3362044`.
- `08-pointing.png` — 1024x1536, md5 `8eb6ccd3bc2637345af8459e8b4547ca`.
- `09-confused.png` — 1024x1536, md5 `5d6afd7f20ff3732d65e670da11d1e52`.
- `10-running.png` — 1024x1536, md5 `a6671f4fa557f2aaa4a8584df93cc051`.

### Background videos

All five MP4 loops exist under `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/backgrounds/`, are H.264 832x480, about 5.03 seconds each, and match canonical by md5:

- `01-yearbook-pages.mp4` — 3,335,505 bytes, md5 `f03b01c0ab5a5269b6e6ea8f9f689f16`.
- `02-rebuilt-school-push-in.mp4` — 4,209,210 bytes, md5 `8eca86410e2621e8ea1232006b624adb`.
- `03-vhs-to-modern-transition.mp4` — 4,960,435 bytes, md5 `44f5ffc61924c488ddce69effd99dee9`.
- `04-red-silver-mascot-energy.mp4` — 7,247,922 bytes, md5 `664bc5224ff345cf0a7c57571e68b331`.
- `05-dancefloor-confetti.mp4` — 5,856,397 bytes, md5 `dab436a0bc26687189ddd6975a8d84f7`.

### Empty / placeholder media folders

- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/story/.gitkeep` — only file in `assets/story`.
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/audio/.gitkeep` — no audio assets.
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/icons/.gitkeep` — no icon assets beyond inline SVG/nav markup.
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/uploads/approved/memories/.gitkeep` and `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/uploads/approved/sponsors/.gitkeep` — no approved uploaded media currently in repo.

## Story / Gallery / Mascot / Media Coverage

### Story section coverage

Implemented markup exists in `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/index.html`:

- `assets/story/then-1996-hallway.jpg` at the "In 1996, we walked these halls" moment.
- `assets/story/now-miami-beach.jpg` at the "Thirty years later" moment.
- `assets/brand-mark/brand-mark.png` for the "Forever" moment.

Coverage state: **partially wired, missing image files.** The brand-mark moment will render; both image-backed Story moments point to nonexistent files.

### Through the Years / gallery coverage

Implemented markup exists in `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/through-years.html`:

- `assets/story/era-1926-1959.jpg`
- `assets/story/era-1960-1979.jpg`
- `assets/story/era-1980s.jpg`
- `assets/story/era-1996.jpg`
- `assets/story/era-2026.jpg`

Coverage state: **wired, missing image files.** The page structure and five-era labels exist, but all five background images are absent from v2.

### Mascot coverage

Mascot usage is present and backed by files:

- Hero: `frontend/index.html` uses `assets/mascot/01-wave-hello.png`.
- Chatbot bubble/panel across pages: multiple HTML files use `assets/mascot/06-listening.png` and `assets/mascot/01-wave-hello.png`.
- RSVP: `frontend/rsvp.html` uses `assets/mascot/08-pointing.png`.
- Tickets: `frontend/tickets.html` uses `assets/mascot/10-running.png`.
- 404: `frontend/404.html` uses `assets/mascot/09-confused.png`.

Coverage state: **good for current UI.** Only five of the ten available poses are visibly used in the current pages; the rest are present for future states.

### Background / motion coverage

- Home hero preloads and uses `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/backgrounds/05-dancefloor-confetti.mp4`.
- Other four background loops exist but are not referenced by current HTML/CSS/JS.

Coverage state: **hero motion covered; extra loops staged but unused.**

### Memory / sponsor user-upload media coverage

- Memory submission in `frontend/through-years.html` accepts optional JPG/PNG/WebP photo uploads.
- Sponsor inquiry in `frontend/tickets.html` accepts optional JPG/PNG/WebP logo uploads.
- Backend docs and code route pending uploads outside web root, then approved uploads to configured approved paths.
- No approved memory photos or sponsor logos are present in the repo.

Coverage state: **submission/approval pipeline exists, but no current public gallery/user-upload media is seeded.**

## Rights / Approval State Found

- Brand mark: approval is discoverable. `docs/sites/site-mbsh-reunion/cowork-audit-001/06-media-recipes.md` and `08-brand-mark-evaluation.md` describe round 2 candidate 01 as promoted; v2 carries `round-02-candidate-01-PROMOTED.png` and an identical `brand-mark.png`.
- Mascot: docs describe Hi-Tide Harry as original IP. `docs/sites/site-mbsh-reunion/HI-TIDE-HARRY-CHARACTER-SHEET.md` says the character is original and not derived from existing IP. The media recipe says poses 1-5 have explicit approval and poses 6-10 have implicit approval by landing/use, with no separate sign-off doc.
- Background videos: v2 README states the loops are Leonardo background loops and md5-verified copies from canonical. No separate license/rights artifact was found in v2 beyond that provenance statement.
- Story stills: canonical repo contains `then.png`, `now.png`, rejected candidates, `selection-notes.md`, and `generation-log.json` under `/Users/famtasticfritz/famtastic-sites/mbsh-reunion/frontend/assets/story/`. Those notes say promoted Then/Now stills were selected and intentionally avoid real MBSH building photography. v2 does **not** contain those promoted files and references different `.jpg` filenames.
- Real archival / classmate photography: planning docs name Florida Memory, Flashback Miami, yearbooks, Instagram, Facebook, and crowd-sourced classmate photos as future sources. No rights clearance, permissions log, source attribution list, or approved archival photo set was found in v2.
- User-uploaded sponsor/memory media: consent language exists in frontend forms, and backend/admin approval paths exist. No approved uploaded media exists locally.

## Gaps / Blockers

1. Missing Story image files referenced by `frontend/index.html`:
   - `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/story/then-1996-hallway.jpg`
   - `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/story/now-miami-beach.jpg`
2. Missing Through the Years image files referenced by `frontend/through-years.html`:
   - `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/story/era-1926-1959.jpg`
   - `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/story/era-1960-1979.jpg`
   - `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/story/era-1980s.jpg`
   - `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/story/era-1996.jpg`
   - `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/story/era-2026.jpg`
3. `.gitignore` explicitly ignores `frontend/assets/story/*.png` and `frontend/assets/story/*.jpg`, with only `.gitkeep` unignored. That explains why story still work may be present elsewhere but absent from v2 deployable files.
4. Canonical Story stills exist as `then.png` and `now.png`, not the `.jpg` names v2 references. Either the files need to be renamed/copied into v2, or the HTML must point at the promoted canonical filenames in a deployable asset path.
5. The V1 brief/planning docs expect archival/crowd-sourced gallery content, but v2 has no approved archival gallery asset set and no rights/attribution manifest.
6. The mascot target in planning is 25 poses minimum for chatbot use; v2 has 10 poses. Current UI is covered, but the full target library is incomplete.

## Final Assessment

The media foundation is credible but not shippable as a complete story/gallery experience. Brand mark, mascot poses, and hero motion are present, verified against canonical hashes, and used in live markup. The blocking issue is the missing `assets/story` image set: the Story and Through the Years surfaces are structurally implemented but currently point to absent media. Rights/approval are strongest for the promoted brand mark and original-IP mascot; weakest for archival/crowd-sourced gallery content, where no approval or attribution artifact was found.
