'use strict';
/**
 * lib/deploy-jobs.js — durable deployment job records.
 *
 * A deployment job is persisted INSIDE the owning site's spec.json, under
 * `spec.deployments[deployment_id]`, written through the atomic writeSpec
 * (temp + rename). It survives a process restart, unlike the WebSocket stream
 * which is best-effort only.
 *
 * Record shape:
 *   {
 *     deployment_id: 'dep_<ts>_<rand>',
 *     site_tag:      owning site (authority — captured at dispatch),
 *     env:           'staging' | 'production',
 *     provider:      'netlify',
 *     site_id:       netlify site id when known (captured at dispatch),
 *     captured_provider:   provider captured before dispatch (V1 immutable),
 *     actual_provider_used: provider the subprocess reported deploying with
 *                           (`[deploy] provider-used:` marker), else null,
 *     captured_site_id:   id captured before dispatch (V1 immutable target),
 *     actual_site_id_used: id the subprocess reported deploying to
 *                           (`[deploy] site-id-used:` marker), else null,
 *     status:        'dispatched' | 'running' | 'succeeded' | 'failed',
 *     url:           proof URL once known, else null,
 *     error:         failure message once known, else null,
 *     created_at / updated_at: ISO timestamps,
 *   }
 *
 * RESTART RECONCILIATION: a record left in `dispatched`/`running` by a dead
 * process would otherwise look eternally running. reconcileInterruptedDeployments
 * marks those `failed` with an `interrupted` error; server.js calls it once at
 * boot before the port opens.
 */

const fs = require('fs');
const crypto = require('crypto');

const DEPLOY_STATUS = ['dispatched', 'running', 'succeeded', 'failed'];

function newDeploymentId() {
  return `dep_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Upsert a deployment record into the site's spec.json via the atomic
 * writeSpec. Returns the merged record, or null when the site has no readable
 * spec (nothing to persist into).
 */
function upsertDeployment(readSpec, writeSpec, siteTag, deploymentId, patch) {
  const spec = readSpec(siteTag);
  if (!spec || typeof spec !== 'object') return null;
  spec.deployments = spec.deployments && typeof spec.deployments === 'object'
    ? spec.deployments
    : {};
  const existing = spec.deployments[deploymentId] || {};
  const record = {
    ...existing,
    ...patch,
    deployment_id: deploymentId,
    site_tag: siteTag,
    updated_at: new Date().toISOString(),
  };
  spec.deployments[deploymentId] = record;
  writeSpec(spec, { siteTag, source: 'deploy' });
  return record;
}

/**
 * Locate a deployment record by id, scanning every site's spec.json under
 * sitesRoot. The record itself carries site_tag, but a status client only
 * knows the id — the scan is what makes GET /api/deploy-status work with
 * nothing but the deployment_id, including after a restart.
 *
 * @returns {{ siteTag: string, record: object }|null}
 */
function findDeployment({ sitesRoot, readSpec }, deploymentId) {
  if (!deploymentId || !sitesRoot) return null;
  let entries;
  try {
    entries = fs.readdirSync(sitesRoot, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    let spec;
    try {
      spec = readSpec(entry.name);
    } catch {
      continue;
    }
    const record = spec && spec.deployments && spec.deployments[deploymentId];
    if (record) return { siteTag: entry.name, record };
  }
  return null;
}

/**
 * Mark every `dispatched`/`running` deployment record under sitesRoot as
 * `failed` with an `interrupted` error. Run once at boot: any such record
 * belongs to a process that is no longer alive to complete it.
 *
 * @returns {{ reconciled: number, sites: string[] }}
 */
function reconcileInterruptedDeployments({ sitesRoot, readSpec, writeSpec }) {
  const result = { reconciled: 0, sites: [] };
  let entries;
  try {
    entries = fs.readdirSync(sitesRoot, { withFileTypes: true });
  } catch {
    return result;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    let spec;
    try {
      spec = readSpec(entry.name);
    } catch {
      continue;
    }
    const deployments = spec && spec.deployments;
    if (!deployments || typeof deployments !== 'object') continue;
    let dirty = false;
    for (const record of Object.values(deployments)) {
      if (record && (record.status === 'dispatched' || record.status === 'running')) {
        record.status = 'failed';
        record.error = 'interrupted: server restarted before this deployment completed';
        record.updated_at = new Date().toISOString();
        dirty = true;
        result.reconciled += 1;
      }
    }
    if (dirty) {
      try {
        writeSpec(spec, { siteTag: entry.name, source: 'deploy-reconcile' });
        result.sites.push(entry.name);
      } catch (err) {
        console.error(`[deploy] boot reconcile failed for ${entry.name}: ${err.message}`);
      }
    }
  }
  return result;
}

module.exports = {
  DEPLOY_STATUS,
  newDeploymentId,
  upsertDeployment,
  findDeployment,
  reconcileInterruptedDeployments,
};
