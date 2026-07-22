# Milestones B–F Proof Report

**Date:** 2026-07-22
**Branch:** codex/proof-mode-content-injection
**Test run:** `npx vitest run` — 260/260 passed

---

## Milestone B — Bootstrap / Config

**Workers:** `repo-bootstrap-runner.js`, `config-scaffold-runner.js`

**Proof:**
- `RepoBootstrapRunner` writes `package.json`, `.gitignore`, `README.md`, `src/.gitkeep` to `staging/`
- `package.json` name derived from `buildRequest.site_tag`
- Second run is idempotent (no throws)
- `ConfigScaffoldRunner` writes `netlify.toml`, `.env.template`, `.env.example` to `staging/`
- Returns `deploy_target: 'netlify'` and staging URL template
- Tests: `milestone-b.test.js` — 6/6 pass

---

## Milestone C — Architecture, Sitemap, Content, Build

**Workers:** `architecture-decider-runner.js`, `sitemap-planner-runner.js`, `page-copy-runner.js`, `design-token-runner.js`, `js-behavior-runner.js`, `page-builder-runner.js`, `shared-assets-runner.js`, `assembly-runner.js`

**Proof:**
- `ArchitectureDeciderRunner` deterministically resolves single-page/multi-page/hybrid/auto from `architecture_preference`
- `SitemapPlannerRunner` generates 1 page for single-page, ≥4 pages (home, services, about, contact) for multi-page
- `PageCopyRunner` maps `required_sections` to structured ContentPackets with hero heading, services list, about copy, CTA, footer
- `DesignTokenRunner` derives color palette from brand.mood (professional/energetic/natural/luxury), writes `css/tokens.css` with CSS custom properties
- `JsBehaviorRunner` generates `nav.js`, `smooth-scroll.js`, `section-observer.js` (single-page only), `form-enhance.js` (when contact form present)
- `PageBuilderRunner` produces valid HTML5 with DOCTYPE, title, viewport, CSS link; XSS-safe via `esc()` on all content; supports both `contentPacket` (direct) and `contentPackets[]` array lookup by page_id (foreach chain)
- `SharedAssetsRunner` writes `css/styles.css` (hero, services grid, nav, forms, testimonials, CTA, footer, `@media 768px`) and `js/main.js`
- `AssemblyRunner` reads from `siteManifest.pages`, checks outputs/, returns `build_status: 'complete'|'partial'` with missing list
- Tests: `milestone-c.test.js` (12/12), `milestone-c-build.test.js` (7/7)

---

## Milestone D — Components / Media (non-blocking)

**Workers:** `component-selector-runner.js`, `custom-component-builder-runner.js`, `media-planner-runner.js`, `media-generation-runner.js`

**Proof:**
- `ComponentSelectorRunner` maps known section types to built-in components; unknown → `status: deferred`, logged in `custom_needed[]`; never throws
- `CustomComponentBuilderRunner` writes minimal HTML snippet to `staging/components/{id}.html`; never throws
- `MediaPlannerRunner` plans hero-background and service icons; `has_blocking_media` always false (non-blocking contract)
- `MediaGenerationRunner` writes SVG placeholder to `staging/images/`; returns `deferred` for generate source without throwing
- Tests: `milestone-d.test.js` — 12/12 pass

---

## Milestone E — SEO / QA / Proof

**Workers:** `seo-pack-runner.js`, `structural-qa-runner.js`, `content-qa-runner.js`, `browser-qa-runner.js`, `proof-curator-runner.js`, `gap-logger-runner.js`

**Proof:**
- `SeoPackRunner` generates per-page title (≤60 chars), description (≤155 chars), og_title, og_description, canonical URL, LocalBusiness JSON-LD schema for home page; writes `sitemap.xml` and `robots.txt`
- `StructuralQaRunner` checks: page files exist in outputs/, shared assets exist, sitemap/robots exist, DOCTYPE, title, viewport, CSS link — returns green/yellow/red status with issue list
- `ContentQaRunner` checks: business name present, no placeholder text leakage (`{{`, `lorem ipsum`, `TODO`), has heading, has content — returns status + issues
- `BrowserQaRunner` degrades gracefully when puppeteer unavailable (`SKIP_BROWSER_QA=1` or import failure) — returns `status: deferred`; when available, captures desktop+mobile screenshots, checks for console errors and blank pages
- `ProofCuratorRunner` aggregates all QA lanes into a ProofReport; writes `reports/proof-report.json`; `overall_status: green|yellow|red`
- `GapLoggerRunner` collects deferred items (missing media, unknown components, skipped browser QA) and error-severity issues into `reports/gap-log.json`
- Tests: `milestone-e.test.js` — 14/14 pass

---

## Milestone F — Deploy Preservation

**Workers:** `netlify-staging-deploy-runner.js`, `prod-deploy-router-runner.js`, `legacy-compat.js`

**Proof:**
- `NetlifyStagingDeployRunner` requires `deploy.staging_deploy: true` to proceed; uses `execFileSync` (not exec) with argument array — no shell injection; skips if flag not set
- `ProdDeployRouterRunner` requires `deploy.prod_deploy: true` AND `proofReport.overall_status !== 'red'`; blocks on red QA; skips if flag not set
- `legacy-compat.js` maps flat legacy shape (`siteName`, `siteTag`, `industry`, etc.) to canonical `BuildRequest`; passes canonical shapes through unchanged; throws on non-object input
- Tests: `milestone-f.test.js` — 7/7 pass

---

## Supporting Infrastructure

- **Registry:** `lib/site-build-registry.js` — registers all 22 workers under `deterministic` provider
- **Recipe:** `recipes/full-site-build.yaml` — 20-stage end-to-end recipe (B→C→D→E→F); foreach fanout for per-page stages; expression references chain stage outputs
- **Server Bridge:** `server-bridge.js` — `runSiteBuild(buildRequest)` entry point for Milestone G opt-in
- **Legacy Compat:** `legacy-compat.js` — normalization shim, scheduled for removal once callers migrate

---

## Gate: All milestones B–F pass

| Milestone | Workers | Tests | Status |
|-----------|---------|-------|--------|
| B | 2 | 6 | ✓ GREEN |
| C planning | 2 | 7 | ✓ GREEN |
| C content | 2 | 5 | ✓ GREEN |
| C build | 3 | 7 | ✓ GREEN |
| D | 4 | 12 | ✓ GREEN |
| E | 6 | 14 | ✓ GREEN |
| F | 3 | 7 | ✓ GREEN |
| **Total** | **22** | **58** | **✓ 260/260 full suite** |
