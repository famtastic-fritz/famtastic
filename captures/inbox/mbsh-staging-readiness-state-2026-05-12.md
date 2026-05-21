# MBSH Staging Readiness State — 2026-05-12

## Local implementation status

The MBSH cinematic page-structure implementation is complete locally in:

`/Users/famtasticfritz/famtastic-sites/mbsh-reunion`

Current branch checked during verification: `main`.

No push, production deploy, DNS change, env change, or Netlify action was performed.

## Local site repo changes

Modified files:

- `frontend/css/premiere.css`
- `frontend/js/page-sequence.js`
- `frontend/js/premiere.js`

Untracked assets that are now required by the implementation:

- `frontend/assets/premiere/wave1/`

The implementation references the Wave 1 scene assets under:

- `frontend/assets/premiere/wave1/scenes/rsvp-velvet-seat.png`
- `frontend/assets/premiere/wave1/scenes/through-years-projection-booth.png`
- `frontend/assets/premiere/wave1/scenes/memorial-candle-still.png`
- `frontend/assets/premiere/wave1/scenes/capsule-envelope-wax-seal.png`
- `frontend/assets/premiere/wave1/scenes/playlist-curtain-confetti-still.png`

## Verification completed

Commands/checks performed:

- `node --check frontend/js/page-sequence.js`
- `node --check frontend/js/premiere.js`
- required hero asset existence check
- local static server: `python3 -m http.server 4173 --directory frontend`
- browser checks on RSVP, Memorial, and Playlist after the final calibration
- browser console checks showed no JavaScript errors on checked pages
- browser visual review confirmed no obvious top-layout breakage on Playlist after the final pass

## What is ready for staging

The current local change set is ready to be converted into a staging branch commit after reviewing the diff and including the Wave 1 assets.

Recommended staging preparation commands from the MBSH repo:

```bash
cd /Users/famtasticfritz/famtastic-sites/mbsh-reunion
git status --short
git diff -- frontend/js/page-sequence.js frontend/js/premiere.js frontend/css/premiere.css
git add frontend/js/page-sequence.js frontend/js/premiere.js frontend/css/premiere.css frontend/assets/premiere/wave1/
git commit -m "feat: add cinematic page experience pass [docs]"
git checkout staging
git merge main
git push origin staging
```

Only run the branch/merge/push commands after confirming the current `main`/`staging` strategy is still desired. Earlier source truth said `origin/main` was one commit ahead of `origin/staging`, so staging may need to be brought forward carefully.

## Known gaps before production

- Production has not been touched.
- Photoreal transparent Hi-Tide Harry assets are not generated yet.
- Current billboard Harry images are intentionally hidden because prior assets had checkerboard artifacts.
- Staging mobile review still needs a real phone/device pass after deployment.
- Committee-facing review notes still need to be prepared after staging is live.
