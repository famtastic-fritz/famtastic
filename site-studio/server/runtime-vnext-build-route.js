'use strict';
/**
 * server/runtime-vnext-build-route.js
 *
 * Operator-facing HTTP route for runtime-vnext deterministic Site Studio builds,
 * ported from feature/site-studio-runtime-vnext-closeout and adapted to main's
 * modular runtime-vnext (lib/runner.js RecipeRunner + server-bridge-style output
 * sync).
 *
 * POST /api/site-studio/build-vnext
 *
 * Body:
 *   {
 *     "siteTag": "site-demo",              // REQUIRED — no ambient fallback
 *     "pages": ["index.html", "about.html"],
 *     "siteName": "Demo Business",
 *     "brief": "A warm landing page for ..." // optional; persisted to spec
 *   }
 *
 * The siteTag must be explicit (body, query, or path via req.ctx). The route
 * never falls back to the server's ambient TAG: an Operator V1 mutation must
 * name its site or be answered 400.
 *
 * GET /api/site-studio/build-vnext/status?run_id=<id> returns the persisted run
 * row (400 without run_id, 404 for an unknown id) so the UI can poll build state
 * over HTTP without a WebSocket.
 *
 * Response:
 *   {
 *     "success": true,
 *     "project_id": "project_...",
 *     "run_id": "run_...",
 *     "recipe_id": "deterministic-site-build-v1",
 *     "recipe_version": "1.0.0",
 *     "site_tag": "site-demo",
 *     "publish_dir": "/abs/path/to/sites/site-demo/dist-vnext",
 *     "files": ["index.html", "about.html"]
 *   }
 *
 * ADAPTATIONS vs the feature version:
 *   - Main's RecipeRunner.publish() targets sites_root/<tag>/dist and takes no
 *     publishDir, so this route runs with publish:false and then syncs
 *     workspace outputs into sites/<tag>/dist-vnext itself — mirroring
 *     runtime-vnext/server-bridge.js syncOutputsToSiteDist but targeting
 *     dist-vnext. server-bridge's legacy dist behaviour is untouched.
 *   - Concurrency guard is an IN-PROCESS per-site set. The feature's persisted
 *     SQLite build_locks table depended on the feature's migration framework,
 *     which does not exist on main; no lock table is ported.
 *   - No WebSocket broadcasts (not needed for the V1 HTTP contract).
 */

const fs = require('fs');
const path = require('path');

const { loadProjectContext } = require('../runtime-vnext/lib/project-context');
const { createRunContext } = require('../runtime-vnext/lib/run-context');
const { loadAndResolve } = require('../runtime-vnext/lib/recipe-resolver');
const { RecipeRunner } = require('../runtime-vnext/lib/runner');
const { EventBus } = require('../runtime-vnext/lib/event-bus');
const { registry } = require('../runtime-vnext/lib/model-runner-registry');
const { DeterministicToolRunner } = require('../runtime-vnext/families/deterministic-tool-runner');
const { siteTagOr400 } = require('../lib/request-context');
const { isValidPageName } = require('./validators');
const vnextDb = require('../runtime-vnext/state/db');

/**
 * Mirror of runtime-vnext/server-bridge.js syncOutputsToSiteDist, but the
 * publish target is the V1 artifact tree (dist-vnext), never the legacy dist.
 */
function syncOutputsToDistVnext({ workspace_root, dist_vnext_dir }) {
  const outputsDir = path.join(workspace_root, 'outputs');
  if (!fs.existsSync(outputsDir)) return { synced: false, reason: 'outputs_missing', distDir: dist_vnext_dir };

  fs.mkdirSync(path.dirname(dist_vnext_dir), { recursive: true });
  fs.rmSync(dist_vnext_dir, { recursive: true, force: true });
  fs.cpSync(outputsDir, dist_vnext_dir, { recursive: true });

  return { synced: true, distDir: dist_vnext_dir };
}

// In-process per-site build guard. A second concurrent build for the SAME site
// is refused with 409; different sites may build concurrently. This replaces
// the feature's persisted build_locks row (see header note).
const buildsInProgress = new Set();

/**
 * @param {object} deps
 * @param {object} deps.app
 * @param {(siteTag?: string) => object} deps.readSpec  tag-scoped spec reader
 * @param {(spec: object, options?: object) => void} deps.writeSpec  ATOMIC tag-scoped spec writer
 * @param {(siteTag: string) => string} deps.getDistVnextDir  dist-vnext path helper
 * @param {string} [deps.hubRoot]  runtime hub root (recipe fixtures + run workspaces)
 * @param {string} [deps.recipePath]
 * @param {() => number} [deps.getPreviewPort]
 */
function registerRuntimeVnextBuildRoute({ app, readSpec, writeSpec, getDistVnextDir, hubRoot, recipePath, getPreviewPort }) {
  // NOTE: server.js already mounts express.json() globally.

  // The URL that previews the exact dist-vnext artifact of an explicitly named
  // site. The preview server serves it at /vnext/<siteTag>/; legacy surfaces
  // keep the ambient dist preview.
  app.get('/api/site-studio/preview-url', (req, res) => {
    const siteTag = siteTagOr400(req, res);
    if (!siteTag) return;
    const port = typeof getPreviewPort === 'function' ? getPreviewPort() : 3333;
    res.json({
      site_tag: siteTag,
      url: `http://localhost:${port}/vnext/${siteTag}/`,
    });
  });

  // HTTP polling for run state — no WebSocket required. The run row is the
  // source of truth.
  app.get('/api/site-studio/build-vnext/status', (req, res) => {
    const runId = (req.query.run_id || req.query.runId || '').trim();
    if (!runId) {
      return res.status(400).json({ error: 'run_id_required', message: 'Pass run_id as a query parameter.' });
    }
    const run = vnextDb.getRun(runId);
    if (!run) {
      return res.status(404).json({ error: 'run_not_found', message: `Unknown run_id: ${runId}` });
    }
    const project = run.project_id ? vnextDb.getProject(run.project_id) : null;
    res.json({
      run_id: run.run_id,
      project_id: run.project_id,
      status: run.status,
      site_tag: project ? project.site_tag : null,
      recipe_id: run.recipe_id,
      recipe_version: run.recipe_version,
      started_at: run.started_at,
      ended_at: run.ended_at,
      error: run.status === 'failed' ? (run.error || null) : null,
    });
  });

  app.post('/api/site-studio/build-vnext', async (req, res) => {
    // Explicit site authority — resolved once, at request start, from req.ctx
    // (body/query/path). Traversal-shaped tags were already refused with 400 by
    // the requestContext middleware; a well-shaped tag is required here.
    const siteTag = siteTagOr400(req, res);
    if (!siteTag) return;

    // hubRoot decides fixture resolution for the recipe AND the sites root of
    // the run workspace. It must stay the site-studio dir (the recipe's
    // fixtures are relative to it); the CANONICAL site tree (spec, dist-vnext)
    // comes from server.js's path helpers below, never from
    // projectContext.sites_root.
    const resolvedHubRoot = hubRoot || path.resolve(process.cwd());

    // Resolve the FINAL page list FIRST — request pages when supplied, else
    // the persisted spec.pages, else the documented default — then validate
    // EVERY entry of the resolved list BEFORE anything is persisted
    // (spec.vnext_build_request) and BEFORE any run/recipe execution exists.
    // Page names become filesystem paths, so a malformed value — inherited
    // from spec.json just as much as supplied in the request — is a 400
    // naming the invalid entries, never a build.
    const spec = { ...(readSpec(siteTag) || {}) };
    const inputPages = Array.isArray(req.body.pages)
      ? req.body.pages
      : (Array.isArray(spec.pages) ? spec.pages : ['index.html']);
    const invalidPages = inputPages.filter((p) => typeof p !== 'string' || !isValidPageName(p));
    if (invalidPages.length > 0) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_page_name',
        invalid_pages: invalidPages.map((p) => String(p)),
        message: `Invalid page name(s): ${invalidPages.map((p) => JSON.stringify(String(p))).join(', ')}. Pages must look like 'about.html' (lowercase letters, digits, dots, hyphens, underscores; no path separators or traversal).`,
      });
    }

    // Refuse rather than queue: this route is operator-facing and synchronous,
    // and a 409 naming the conflict is more useful than a request that blocks for
    // however long another build takes.
    if (buildsInProgress.has(siteTag)) {
      return res.status(409).json({
        ok: false,
        error: 'build_in_progress',
        message: `A vNext build is already in progress for ${siteTag}. Wait for it to finish and retry.`,
      });
    }
    buildsInProgress.add(siteTag);
    try {
      // Ensure deterministic tool runner is registered for this process
      if (!registry.hasFamily('DeterministicToolRunner')) {
        registry.register('DeterministicToolRunner', 'local', new DeterministicToolRunner());
      }

      const projectContext = loadProjectContext({ siteTag, hubRoot: resolvedHubRoot });
      const { runContext } = createRunContext({
        projectContext,
        recipeId: 'deterministic-site-build-v1',
        recipeVersion: '1.0.0',
        trigger: 'operator',
        hubRoot: resolvedHubRoot,
      });

      const siteName = req.body.siteName || spec.site_name || siteTag;

      // Persist the normalized build request BEFORE running the build, so the
      // brief that produced this artifact survives with the site. writeSpec is
      // atomic (temp file + rename).
      if (typeof req.body.brief === 'string' && req.body.brief.trim() !== '' && typeof writeSpec === 'function') {
        try {
          const currentSpec = readSpec(siteTag);
          currentSpec.vnext_build_request = {
            brief: req.body.brief.trim(),
            pages: inputPages,
            site_name: siteName,
            requested_at: new Date().toISOString(),
          };
          writeSpec(currentSpec, { siteTag, source: 'vnext_build_request' });
        } catch (err) {
          console.warn(`[build-vnext] failed to persist build request brief: ${err.message}`);
        }
      }

      // Normalize pages: drop index.html, strip .html for the recipe foreach
      const recipePages = inputPages
        .filter((p) => p !== 'index.html')
        .map((p) => (typeof p === 'string' ? p.replace(/\.html$/i, '') : p));

      const publishDir = getDistVnextDir(siteTag);
      const resolvedRecipePath = recipePath
        || path.join(resolvedHubRoot, 'runtime-vnext', 'recipes', 'deterministic-site-build.yaml');
      const resolvedRecipe = loadAndResolve(resolvedRecipePath);

      const eventBus = new EventBus();
      const runner = new RecipeRunner({ registry, eventBus });
      // publish:false — main's RecipeRunner.publish() targets the legacy dist
      // tree. The V1 publish below syncs the same outputs dir into dist-vnext.
      const result = await runner.execute({
        projectContext,
        runContext,
        resolvedRecipe,
        spec: { site_name: siteName, pages: recipePages },
        publish: false,
      });

      if (result.status !== 'published') {
        return res.status(500).json({
          success: false,
          error: result.error || 'Build failed',
          run_id: runContext.run_id,
          project_id: runContext.project_id,
        });
      }

      const sync = syncOutputsToDistVnext({
        workspace_root: runContext.workspace_root,
        dist_vnext_dir: publishDir,
      });
      if (!sync.synced) {
        return res.status(500).json({
          success: false,
          error: `Build succeeded but outputs could not be published (${sync.reason})`,
          run_id: runContext.run_id,
          project_id: runContext.project_id,
        });
      }

      const files = fs.existsSync(publishDir)
        ? fs.readdirSync(publishDir).filter((f) => fs.statSync(path.join(publishDir, f)).isFile())
        : [];

      res.json({
        success: true,
        project_id: runContext.project_id,
        run_id: runContext.run_id,
        recipe_id: runContext.recipe_id,
        recipe_version: runContext.recipe_version,
        site_tag: siteTag,
        publish_dir: publishDir,
        files,
      });
    } catch (err) {
      console.error('[runtime-vnext-build-route] error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    } finally {
      // finally, not per-exit: this handler has an early 500 return, a success
      // return and a catch. A release on only some of them leaves the guard
      // held and blocks every later build for this site.
      buildsInProgress.delete(siteTag);
    }
  });
}

module.exports = { registerRuntimeVnextBuildRoute, syncOutputsToDistVnext };
