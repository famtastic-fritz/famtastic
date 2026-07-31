'use strict';
/**
 * lib/deploy-runner.js — the deploy subprocess runner.
 *
 * Extracted from server.js's runDeploy so the completion path is testable
 * without booting the server. Behaviour contract:
 *
 *  - SITE AUTHORITY IS EXPLICIT. `runDeploy(ws, env, ctx)` takes the site in
 *    `ctx.siteTag`, captured by the route BEFORE dispatch. The completion
 *    handler reads and writes only that site's spec — a site switch (or a
 *    second site with a different ambient tag) cannot receive the state. The
 *    no-ctx form falls back to `getTag()` once, at dispatch time, for the
 *    legacy WebSocket chat path.
 *
 *  - THE ARTIFACT IS dist-vnext. The spawn injects SITE_DEPLOY_SOURCE_DIR
 *    (default 'dist-vnext') so scripts/site-deploy ships the V1 build
 *    artifact. The script's own default remains legacy 'dist'.
 *
 *  - THE TARGET IS IMMUTABLE. When ctx carries a captured Netlify site id
 *    (ctx.siteId, captured by the route BEFORE dispatch), the spawn receives
 *    SITE_DEPLOY_SITE_ID + SITE_DEPLOY_IMMUTABLE_TARGET=1 and the script
 *    deploys to EXACTLY that id, never re-deriving it from spec.json. The
 *    script reports the actual id back via `[deploy] site-id-used: <id>`; the
 *    persisted record carries both captured_site_id and actual_site_id_used,
 *    and any mismatch fails the deployment with site_id_mismatch.
 *
 *  - THE PROVIDER IS IMMUTABLE TOO. When ctx carries a captured provider
 *    (ctx.provider, captured by the route BEFORE dispatch the same way), the
 *    spawn also receives SITE_DEPLOY_PROVIDER and the immutable script path
 *    uses it verbatim — never spec.deploy_provider, config defaults, or CLI
 *    autodetect. The script reports it back via `[deploy] provider-used: <p>`;
 *    the record carries captured_provider and actual_provider_used, and any
 *    missing marker or mismatch fails the deployment with provider_mismatch
 *    (fail closed — drift is never persisted as success).
 *
 *  - THE IN-PROGRESS GUARD KEYS ON site+env, not on a single global flag, so
 *    two different sites (or the same site to two envs) do not block each
 *    other while a duplicate dispatch for the same site+env 409s.
 *
 *  - COMPLETION PERSISTENCE DOES NOT DEPEND ON ANY WS CLIENT. When ctx carries
 *    a deploymentId, the durable record (lib/deploy-jobs, inside the site's
 *    spec.json) is updated dispatched → running → succeeded/failed with the
 *    proof URL / error, regardless of whether ws.send succeeds. The legacy
 *    spec.environments[env] / deployed_url / deploy_history fields are written
 *    exactly as before — existing readers depend on them.
 */

const path = require('path');
const { upsertDeployment } = require('./deploy-jobs');

// Parse deploy stderr for known failure patterns and return a user-facing message.
function parseDeployStderr(stderr) {
  if (!stderr) return null;
  const s = stderr.toLowerCase();
  if (/not\s+(?:logged\s+in|authorized|authenticated)|login\s+required|netlify\s+login/.test(s))
    return 'Netlify is not logged in. Run "netlify login" in a terminal.';
  if (/network|enotfound|econnrefused|etimedout|getaddrinfo/.test(s))
    return 'Network error reaching Netlify. Check your connection and retry.';
  if (/site\s+id|site_id|no\s+site\s+specified/.test(s))
    return 'Netlify site ID is missing or invalid. Set NETLIFY_SITE_ID or run "netlify link".';
  if (/permission\s+denied|EACCES/i.test(stderr))
    return 'Permission denied running the deploy script. Check file permissions on scripts/site-deploy.';
  if (/quota|rate\s+limit/.test(s))
    return 'Netlify rate limit or quota exceeded. Try again later.';
  return null;
}

function createDeployRunner(deps) {
  const {
    readSpec,
    writeSpec,
    invalidateSpecCache,
    checkNetlify,
    spawn,
    hubRoot,
    listPages,
    loadSettings,
    appendConvo,
    studioEvents,
    STUDIO_EVENTS,
    syncSiteRepo,
    getTag,
    sitesRoot,
  } = deps;

  for (const [name, value] of Object.entries({
    readSpec, writeSpec, checkNetlify, spawn, hubRoot, appendConvo, getTag,
  })) {
    if (!value) throw new Error(`createDeployRunner: missing required dep '${name}'`);
  }

  // Keys are `${siteTag}:${env}` — the guard is per site+env, not global.
  const inProgress = new Set();

  function isDeployInProgress(siteTag, env) {
    if (siteTag) return inProgress.has(`${siteTag}:${env || 'staging'}`);
    return inProgress.size > 0;
  }

  /**
   * @param ws   best-effort WebSocket-ish sink ({ send }) — may be a shim; every
   *             send is guarded and persistence never depends on it.
   * @param env  'staging' | 'production'
   * @param ctx  { siteTag?, deploymentId?, sourceDir?, siteId?, provider? } —
   *             explicit site authority captured by the dispatcher. Without ctx
   *             the legacy ambient path is preserved (operator's tag, captured
   *             once here).
   */
  async function runDeploy(ws, env, ctx = {}) {
    env = env || 'staging';
    const siteTag = ctx.siteTag || getTag();
    const deploymentId = ctx.deploymentId || null;
    const sourceDir = ctx.sourceDir || 'dist-vnext';
    const capturedSiteId = ctx.siteId || null;
    const capturedProvider = ctx.provider || null;
    const progressKey = `${siteTag}:${env}`;
    const envLabel = env.charAt(0).toUpperCase() + env.slice(1);

    if (inProgress.has(progressKey)) {
      try { ws.send(JSON.stringify({ type: 'status', content: 'Deploy already in progress.' })); } catch {}
      return;
    }
    console.log(`[deploy] starting env=${env} tag=${siteTag} deployment=${deploymentId || 'none'} source=${sourceDir}`);

    // IMMUTABLE TARGET (V1 path): the HTTP route captures the provider AND the
    // Netlify site id before dispatch. Without both there is no immutable
    // target to bind to — fail BEFORE dispatch (the route answers 412; this is
    // the defense-in-depth runner-side mirror). Auto-create/autodetect stay
    // available only on the legacy script path.
    if (deploymentId && (!capturedSiteId || !capturedProvider)) {
      const missing = !capturedSiteId ? 'no_netlify_site_id' : 'no_deploy_provider';
      const msg = `${envLabel} deploy failed: no immutable deploy target is configured for ${siteTag} (${env}) — ${missing}. The V1 deploy path binds provider and site id immutably and will not auto-create or autodetect one.`;
      console.log(`[deploy] ${missing} tag=${siteTag} env=${env}`);
      try { ws.send(JSON.stringify({ type: 'error', content: msg })); } catch {}
      appendConvo({ role: 'assistant', content: msg, at: new Date().toISOString() }, siteTag);
      upsertDeployment(readSpec, writeSpec, siteTag, deploymentId, {
        status: 'failed', env, provider: capturedProvider || 'netlify', site_id: capturedSiteId,
        captured_provider: capturedProvider, actual_provider_used: null,
        captured_site_id: capturedSiteId, actual_site_id_used: null,
        error: missing,
      });
      return;
    }

    // Layer 2 — Preflight BEFORE taking the in-progress slot.
    // If the preflight fails, the slot stays free and the user can retry.
    let netlify;
    try {
      netlify = await checkNetlify();
    } catch (probeErr) {
      netlify = { ok: false, reason: 'other', details: probeErr.message };
    }
    if (!netlify || !netlify.ok) {
      const detail = (netlify && netlify.details) || 'Netlify is not configured.';
      console.log(`[deploy] preflight failed reason=${(netlify && netlify.reason) || 'other'} details=${detail}`);
      try { ws.send(JSON.stringify({ type: 'error', content: `${envLabel} deploy failed: ${detail}` })); } catch {}
      appendConvo({ role: 'assistant', content: `${envLabel} deploy preflight failed: ${detail}`, at: new Date().toISOString() }, siteTag);
      if (deploymentId) {
        upsertDeployment(readSpec, writeSpec, siteTag, deploymentId, {
          status: 'failed', env, provider: capturedProvider || 'netlify', site_id: capturedSiteId,
          error: `preflight: ${detail}`,
        });
      }
      return;
    }

    inProgress.add(progressKey);
    const args = [path.join(hubRoot, 'scripts', 'site-deploy'), siteTag, '--prod', '--env', env];
    // Immutable target handoff: when provider + site id were captured before
    // dispatch, pass them verbatim so the subprocess deploys with EXACTLY them
    // (validated in the script) and never re-derives the target from
    // spec.json / config defaults / CLI autodetect.
    const deployEnv = { ...process.env, SITE_DEPLOY_SOURCE_DIR: sourceDir };
    if (capturedSiteId) {
      deployEnv.SITE_DEPLOY_SITE_ID = capturedSiteId;
      deployEnv.SITE_DEPLOY_IMMUTABLE_TARGET = '1';
      if (capturedProvider) deployEnv.SITE_DEPLOY_PROVIDER = capturedProvider;
    }
    if (sitesRoot) deployEnv.SITE_DEPLOY_SITES_ROOT = sitesRoot;
    let child;
    try {
      child = spawn(args[0], args.slice(1), {
        env: deployEnv,
        cwd: hubRoot,
      });
    } catch (spawnErr) {
      // Synchronous spawn failure (rare — usually surfaces via 'error' event)
      inProgress.delete(progressKey);
      try { ws.send(JSON.stringify({ type: 'error', content: `${envLabel} deploy failed to start: ${spawnErr.message}` })); } catch {}
      if (deploymentId) {
        upsertDeployment(readSpec, writeSpec, siteTag, deploymentId, {
          status: 'failed', env, provider: capturedProvider || 'netlify', site_id: capturedSiteId,
          error: `spawn: ${spawnErr.message}`,
        });
      }
      return;
    }

    if (deploymentId) {
      upsertDeployment(readSpec, writeSpec, siteTag, deploymentId, {
        status: 'running', env, provider: capturedProvider || 'netlify', site_id: capturedSiteId,
        captured_provider: capturedProvider, actual_provider_used: null,
        captured_site_id: capturedSiteId, actual_site_id_used: null,
      });
    }

    let output = '';
    let stderrBuf = '';
    let settled = false;
    const settle = () => {
      if (settled) return false;
      settled = true;
      inProgress.delete(progressKey);
      return true;
    };

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
      try { ws.send(JSON.stringify({ type: 'status', content: chunk.toString().trim() })); } catch {}
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderrBuf += text;
      const trimmed = text.trim();
      console.error('[deploy]', trimmed);
      if (trimmed) try { ws.send(JSON.stringify({ type: 'status', content: trimmed })); } catch {}
    });

    // Layer 3 — Spawn error handler (executable not found, permission denied, etc.)
    child.on('error', (err) => {
      if (!settle()) return;
      const msg = err && err.code === 'ENOENT'
        ? `${envLabel} deploy failed: deploy script not found at scripts/site-deploy.`
        : `${envLabel} deploy failed to launch: ${err.message}`;
      try { ws.send(JSON.stringify({ type: 'error', content: msg })); } catch {}
      appendConvo({ role: 'assistant', content: msg, at: new Date().toISOString() }, siteTag);
      if (deploymentId) {
        upsertDeployment(readSpec, writeSpec, siteTag, deploymentId, {
          status: 'failed', env, provider: capturedProvider || 'netlify', site_id: capturedSiteId, error: msg,
        });
      }
    });

    // Layer 4 — Exit code handling with stderr pattern parsing
    child.on('close', (code) => {
      if (!settle()) return;
      const urlMatch = output.match(/https:\/\/[^\s]+/);
      // Immutable target verification: the script reports the ACTUAL site id it
      // passed to the Netlify CLI on stderr as `[deploy] site-id-used: <id>`,
      // and the ACTUAL provider it ran with as `[deploy] provider-used: <p>`.
      const markerMatch = stderrBuf.match(/^\[deploy\] site-id-used: (\S+)\s*$/m);
      const actualSiteId = markerMatch ? markerMatch[1] : null;
      const providerMarkerMatch = stderrBuf.match(/^\[deploy\] provider-used: (\S+)\s*$/m);
      const actualProvider = providerMarkerMatch ? providerMarkerMatch[1] : null;
      const immutableTarget = !!capturedSiteId;
      const immutableProvider = immutableTarget && !!capturedProvider;
      // The record carries BOTH captured and actual values: the ones captured
      // before dispatch and the ones the subprocess reports using (falling
      // back to the captured ones only on the legacy path, where no markers
      // are emitted).
      const actualSiteIdUsed = actualSiteId || capturedSiteId || null;
      const actualProviderUsed = actualProvider || capturedProvider || null;
      let immutableError = null;
      if (code === 0 && immutableTarget) {
        if (!actualSiteId) {
          immutableError = 'deploy exited 0 on the immutable path but the script reported no site-id-used marker — the actual deploy target cannot be proven';
        } else if (actualSiteId !== capturedSiteId) {
          immutableError = `site_id_mismatch: captured ${capturedSiteId} before dispatch but the script deployed to ${actualSiteId}`;
        }
      }
      if (code === 0 && immutableProvider && !immutableError) {
        if (!actualProvider) {
          immutableError = 'deploy exited 0 on the immutable path but the script reported no provider-used marker — the actual deploy provider cannot be proven';
        } else if (actualProvider !== capturedProvider) {
          immutableError = `provider_mismatch: captured ${capturedProvider} before dispatch but the script deployed with ${actualProvider}`;
        }
      }
      if (code === 0 && urlMatch && !immutableError) {
        if (typeof invalidateSpecCache === 'function') invalidateSpecCache(siteTag);
        const spec = readSpec(siteTag);
        if (!spec.environments) spec.environments = {};
        spec.environments[env] = {
          ...(spec.environments[env] || {}),
          provider: capturedProvider || spec.deploy_provider || (typeof loadSettings === 'function' ? loadSettings().deploy_target : null) || 'netlify',
          // The captured id is the immutable truth on the V1 path — a spec
          // that drifted after dispatch must not rewrite the target record.
          site_id: capturedSiteId || spec.environments?.[env]?.site_id || spec.netlify_site_id || null,
          url: urlMatch[0],
          deployed_at: new Date().toISOString(),
          state: 'deployed',
        };
        spec.deployed_url = urlMatch[0];
        spec.deployed_at = spec.environments[env].deployed_at;
        spec.state = 'deployed';

        spec.deploy_history = spec.deploy_history || [];
        spec.deploy_history.push({
          version: spec.deploy_history.length + 1,
          deployed_at: spec.environments[env].deployed_at,
          environment: env,
          url: urlMatch[0],
          fam_score: spec.fam_score || null,
          lighthouse: spec.lighthouse_score || null,
          pages: (typeof listPages === 'function' ? (listPages(siteTag) || []).length : 0),
        });
        // Durable job record, written in the SAME atomic spec write.
        if (deploymentId) {
          spec.deployments = spec.deployments && typeof spec.deployments === 'object' ? spec.deployments : {};
          spec.deployments[deploymentId] = {
            ...(spec.deployments[deploymentId] || {}),
            deployment_id: deploymentId,
            site_tag: siteTag,
            env,
            provider: capturedProvider || 'netlify',
            site_id: spec.environments[env].site_id,
            captured_provider: capturedProvider,
            actual_provider_used: actualProviderUsed,
            captured_site_id: capturedSiteId,
            actual_site_id_used: actualSiteIdUsed,
            status: 'succeeded',
            url: urlMatch[0],
            error: null,
            updated_at: new Date().toISOString(),
          };
        }
        writeSpec(spec, { siteTag, source: 'deploy' });

        if (studioEvents && STUDIO_EVENTS) {
          studioEvents.emit(STUDIO_EVENTS.DEPLOY_COMPLETED, { tag: siteTag, url: urlMatch[0], env });
        }
        try { ws.send(JSON.stringify({ type: 'assistant', content: `${envLabel} deploy complete!\n\nURL: ${urlMatch[0]}` })); } catch {}
        try { ws.send(JSON.stringify({ type: 'deploy-updated', env, url: urlMatch[0] })); } catch {}
        appendConvo({ role: 'assistant', content: `${envLabel} deploy succeeded: ${urlMatch[0]}`, at: new Date().toISOString() }, siteTag);
      } else if (code === 0) {
        const failMsg = immutableError || 'deploy exited 0 but no proof URL was captured';
        try { ws.send(JSON.stringify({ type: 'error', content: `${envLabel} deploy failed: ${failMsg}` })); } catch {}
        try { ws.send(JSON.stringify({ type: 'assistant', content: `${envLabel} deploy completed. Check the output above for the URL.` })); } catch {}
        appendConvo({ role: 'assistant', content: `${envLabel} deploy failed: ${failMsg}`, at: new Date().toISOString() }, siteTag);
        if (deploymentId) {
          upsertDeployment(readSpec, writeSpec, siteTag, deploymentId, {
            status: 'failed', env, provider: capturedProvider || 'netlify', site_id: capturedSiteId,
            captured_provider: capturedProvider, actual_provider_used: actualProviderUsed,
            captured_site_id: capturedSiteId, actual_site_id_used: actualSiteIdUsed,
            error: failMsg,
          });
        }
      } else {
        // Non-zero exit — parse stderr for a specific reason; fall back to generic message.
        const specific = parseDeployStderr(stderrBuf);
        const msg = specific
          ? `${envLabel} deploy failed: ${specific}`
          : `${envLabel} deploy failed with exit code ${code}. Check the output above for details.`;
        try { ws.send(JSON.stringify({ type: 'error', content: msg })); } catch {}
        appendConvo({ role: 'assistant', content: msg, at: new Date().toISOString() }, siteTag);
        if (deploymentId) {
          upsertDeployment(readSpec, writeSpec, siteTag, deploymentId, {
            status: 'failed', env, provider: capturedProvider || 'netlify', site_id: capturedSiteId, error: msg,
          });
        }
      }

      // Auto-sync site repo after successful deploy
      if (code === 0 && typeof syncSiteRepo === 'function') {
        const freshSpec = readSpec(siteTag);
        if (freshSpec.site_repo?.path) {
          const targetBranch = env === 'production' ? 'main' : 'staging';
          try { ws.send(JSON.stringify({ type: 'status', content: `Syncing site repo (${targetBranch})...` })); } catch {}
          syncSiteRepo(ws, freshSpec, targetBranch);
        }
      }
    });
  }

  return { runDeploy, isDeployInProgress };
}

module.exports = { createDeployRunner, parseDeployStderr };
