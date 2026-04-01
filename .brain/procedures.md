# Repeatable Procedures

## New site build (proven end-to-end process)
1. Design brief approval → template build (header/nav/footer/shared CSS)
2. Extract template artifacts (_nav.html, _footer.html, styles.css)
3. All pages build in true parallel with template context injected
4. Post-processing: extract slots → reapply mappings → blueprint + SEO → reconcile orphans → applyLogoV → CSS swap or legacy sync → fixLayoutOverflow
5. runBuildVerification (5 file checks): slot attrs, CSS coherence, cross-page consistency, head dependencies, logo + layout
6. If verification fails: autoTagMissingSlots → re-verify → commit
7. Stock photos: fill_stock_photos intent → fetchFromProvider → 3-provider chain
8. Deploy: site-deploy → Netlify → update spec.json with deployed_url

## Adding a new feature to server.js
1. Check .wolf/buglog.json for related past bugs before starting
2. Check .wolf/cerebrum.md Do-Not-Repeat section
3. Implement with error handling and null safety (follow existing patterns)
4. Export any pure functions for unit testing
5. Add unit tests before committing
6. Update SITE-LEARNINGS.md and CHANGELOG.md
7. Regenerate FAMTASTIC-STATE.md if architecture changed
