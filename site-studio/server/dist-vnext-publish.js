'use strict';
/**
 * server/dist-vnext-publish.js — atomic publication of a vNext build artifact.
 *
 * The Operator V1 build route runs main's RecipeRunner with publish:false, so
 * the recipe's outputs land in runs/<run_id>/outputs and NOTHING has been
 * published yet. This module materializes those outputs into
 * sites/<tag>/dist-vnext without ever exposing a partially copied artifact:
 *
 *   1. validate  — the outputs dir must exist and contain the expected html
 *   2. stage     — copy outputs into sites/<tag>/.dist-vnext-<runId>-tmp
 *                  (the live dist-vnext is untouched)
 *   3. swap      — rename dist-vnext -> .dist-vnext-backup-<runId> (if any),
 *                  rename tmp -> dist-vnext (atomic on the same filesystem),
 *                  remove the backup only after the swap succeeded
 *
 * On ANY staging or swap failure the previous dist-vnext is preserved or
 * restored from its backup, temp dirs are removed, and the caller marks the
 * run publish_failed — never published.
 *
 * Boot/lazy reconciliation (reconcileDistVnextDirs) cleans up dirs abandoned
 * by a crashed process: tmp dirs are deleted, and a backup whose staged
 * counterpart never landed is restored to dist-vnext.
 *
 * TEST-ONLY failure injection: when STUDIO_VNEXT_PUBLISH_FAIL is set to
 * 'stage' or 'swap', the corresponding phase throws AFTER doing its partial
 * work, so tests exercise the real recovery paths without filesystem races.
 * The hook is inert when the env var is unset.
 */

const fs = require('fs');
const path = require('path');

const TMP_PREFIX = '.dist-vnext-';
const TMP_SUFFIX = '-tmp';
const BACKUP_PREFIX = '.dist-vnext-backup-';

// TEST-ONLY hook — see header. Returns 'stage' | 'swap' | null.
function publishFailMode() {
  const mode = process.env.STUDIO_VNEXT_PUBLISH_FAIL;
  return mode === 'stage' || mode === 'swap' ? mode : null;
}

/**
 * Minimal completeness check: the outputs dir exists, is non-empty, and
 * contains every expected page as an .html file. Expected pages default to
 * index.html (the recipe always renders it).
 */
function validateOutputs(outputsDir, expectedPages = ['index.html']) {
  if (!fs.existsSync(outputsDir) || !fs.statSync(outputsDir).isDirectory()) {
    return { ok: false, reason: 'outputs_missing' };
  }
  const entries = fs.readdirSync(outputsDir);
  if (entries.length === 0) {
    return { ok: false, reason: 'outputs_empty' };
  }
  const missing = expectedPages.filter((page) => !entries.includes(page));
  if (missing.length > 0) {
    return { ok: false, reason: 'outputs_incomplete', missing };
  }
  return { ok: true };
}

/**
 * Atomically publish workspaceRoot/outputs into distVnextDir.
 * Throws on any failure after restoring the previous artifact; the live
 * dist-vnext is never left partially copied.
 */
function publishDistVnextAtomic({ workspaceRoot, distVnextDir, runId, expectedPages }) {
  const outputsDir = path.join(workspaceRoot, 'outputs');
  const siteDir = path.dirname(distVnextDir);
  const tmpDir = path.join(siteDir, `${TMP_PREFIX}${runId}${TMP_SUFFIX}`);
  const backupDir = path.join(siteDir, `${BACKUP_PREFIX}${runId}`);

  const validation = validateOutputs(outputsDir, expectedPages);
  if (!validation.ok) {
    const err = new Error(`outputs failed validation: ${validation.reason}${validation.missing ? ` (missing: ${validation.missing.join(', ')})` : ''}`);
    err.reason = validation.reason;
    throw err;
  }

  // Stage: copy into a sibling temp dir. The live dist-vnext is untouched.
  fs.mkdirSync(siteDir, { recursive: true });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  try {
    fs.cpSync(outputsDir, tmpDir, { recursive: true });
    if (publishFailMode() === 'stage') {
      throw new Error('STUDIO_VNEXT_PUBLISH_FAIL=stage (test hook)');
    }
    // The staged artifact must be complete before any swap is attempted.
    const stagedValidation = validateOutputs(tmpDir, expectedPages);
    if (!stagedValidation.ok) {
      throw new Error(`staged artifact failed validation: ${stagedValidation.reason}`);
    }
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }

  // Swap: only after the staged artifact is complete.
  let swapped = false;
  try {
    if (fs.existsSync(distVnextDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
      fs.renameSync(distVnextDir, backupDir);
    }
    if (publishFailMode() === 'swap') {
      throw new Error('STUDIO_VNEXT_PUBLISH_FAIL=swap (test hook)');
    }
    fs.renameSync(tmpDir, distVnextDir);
    swapped = true;
  } catch (err) {
    // The swap partially happened (or never started): put the previous
    // complete artifact back and drop the staged one.
    if (!swapped && fs.existsSync(backupDir) && !fs.existsSync(distVnextDir)) {
      fs.renameSync(backupDir, distVnextDir);
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }

  // Success: the new artifact is live; the backup is now disposable.
  fs.rmSync(backupDir, { recursive: true, force: true });
  return { published: true, distDir: distVnextDir };
}

/**
 * Reconcile abandoned staging/backup dirs under one site dir. Safe to call at
 * boot or lazily before the next publication:
 *   - `.dist-vnext-*-tmp`  -> staged artifacts that never swapped; delete
 *   - `.dist-vnext-backup-*` with no dist-vnext -> a swap started but the new
 *     artifact never landed; restore the backup to dist-vnext
 *   - `.dist-vnext-backup-*` WITH a dist-vnext -> the swap landed but the
 *     process died before removing the backup; delete the stale backup
 */
function reconcileDistVnextDirs(siteDir) {
  if (!fs.existsSync(siteDir)) return { restored: [], removed: [] };
  const restored = [];
  const removed = [];
  const distVnextDir = path.join(siteDir, 'dist-vnext');
  for (const entry of fs.readdirSync(siteDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(siteDir, entry.name);
    if (entry.name.startsWith(TMP_PREFIX) && entry.name.endsWith(TMP_SUFFIX)) {
      fs.rmSync(full, { recursive: true, force: true });
      removed.push(entry.name);
    } else if (entry.name.startsWith(BACKUP_PREFIX)) {
      if (!fs.existsSync(distVnextDir)) {
        fs.renameSync(full, distVnextDir);
        restored.push(entry.name);
      } else {
        fs.rmSync(full, { recursive: true, force: true });
        removed.push(entry.name);
      }
    }
  }
  return { restored, removed };
}

module.exports = {
  validateOutputs,
  publishDistVnextAtomic,
  reconcileDistVnextDirs,
};
