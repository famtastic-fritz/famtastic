# Legacy Authority Audit (Milestone H)

**Date:** 2026-07-22
**Scope:** Identify legacy code in `server.js` that will be superseded by `runtime-vnext` and document the de-authorization path.

---

## Summary

`server.js` is a ~20,000-line monolith containing the original Site Studio build engine. The runtime-vnext pipeline is now feature-equivalent for the deterministic build path. Full cutover follows the gate sequence below.

---

## Legacy Build Entry Points (to be superseded)

| Function / Route | Line (approx) | Status |
|---|---|---|
| `runAutonomousBuild()` | ~10,200 | Active — Claude-dependent; non-agnostic |
| `POST /api/autonomous-build` | 10214 | Active — routes to legacy engine |
| `runBuildVerification()` | 15787 | Active — post-build check in legacy path |
| `buildSiteQualityFlowContext()` | 45 | Active — quality flow in legacy path |
| Legacy HTML generation inline in tool handlers | scattered | Active |

---

## Runtime-vnext Replacement Coverage

| Legacy concern | vnext worker | Status |
|---|---|---|
| Repo/config bootstrap | repo-bootstrap, config-scaffold | ✓ Done |
| Architecture decision | architecture-decider | ✓ Done |
| Sitemap generation | sitemap-planner | ✓ Done |
| Page copy / content | page-copy | ✓ Done |
| Design tokens / CSS | design-token, shared-assets | ✓ Done |
| JS behavior | js-behavior | ✓ Done |
| HTML page generation | page-builder | ✓ Done |
| Build assembly / manifest | assembly | ✓ Done |
| Components (non-blocking) | component-selector, custom-component-builder | ✓ Done |
| Media (non-blocking) | media-planner, media-generation | ✓ Done |
| SEO pack | seo-pack | ✓ Done |
| Structural QA | structural-qa | ✓ Done |
| Content QA | content-qa | ✓ Done |
| Browser QA | browser-qa | ✓ Done (deferred gracefully) |
| Proof / gap log | proof-curator, gap-logger | ✓ Done |
| Netlify staging deploy | netlify-staging-deploy | ✓ Done |
| Prod deploy gate | prod-deploy-router | ✓ Done |

**Not yet covered (intentional deferral):**
- LLM-powered content generation (page-copy-runner is deterministic from spec data; generative variant needs an LLM runner adapter)
- Image generation via paid providers (media-generation-runner returns `deferred` for `source_type: generate`)
- Live Playwright visual regression (browser-qa-runner has the hook; Playwright not installed)
- Per-site customization beyond the spec schema (logo injection, custom font, etc.)

---

## De-Authorization Gate Sequence

These steps must happen in order before the legacy build path can be retired:

1. **[DONE]** runtime-vnext achieves feature parity for deterministic builds (Milestones B-F, 260/260 tests)
2. **[DONE]** `POST /api/vnext-build` operator path wired in `server.js` behind `FAMTASTIC_USE_RUNTIME_VNEXT=1`
3. **[ ]** End-to-end integration test: run full recipe, verify `outputs/` contains valid HTML site
4. **[ ]** Shadow-run: run both legacy and vnext on the same spec, diff outputs, confirm parity
5. **[ ]** Flip the default: make vnext the default path, legacy opt-in via flag
6. **[ ]** Remove legacy build functions from `server.js` (with shadow-run diff as proof)
7. **[ ]** Archive legacy engine code in `server.js.legacy` before deletion

---

## Known Legacy Tech Debt NOT in scope for this milestone

- The 20k-line `server.js` itself is a known architectural debt item
- The inline CSS generation scattered through Claude tool handlers
- The `fulfillment-ledger.js` state model (parallel to vnext's SQLite state)

These are tracked in `SITE-LEARNINGS.md` Known Gaps and deferred to a dedicated refactor session.
