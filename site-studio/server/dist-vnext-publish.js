'use strict';
/**
 * server/dist-vnext-publish.js — atomic, crash-consistent publication of a
 * vNext build artifact.
 *
 * The Operator V1 build route runs main's RecipeRunner with publish:false, so
 * the recipe's outputs land in runs/<run_id>/outputs with the run durably at
 * 'recipe_completed' and NOTHING published yet. This module materializes those
 * outputs into sites/<tag>/dist-vnext as a DURABLE PUBLICATION TRANSACTION:
 *
 *   1. validate  — the outputs dir must exist and contain the expected html
 *   2. stage     — copy outputs into sites/<tag>/.dist-vnext-<runId>-tmp
 *                  (the live dist-vnext is untouched)
 *   3. fingerprint — sha256 over the sorted relative file paths + contents of
 *                  the staged artifact (deterministic; no timestamps)
 *   4. journal   — BEFORE any swap, durably persist a site-local publication
 *                  journal (temp file + rename):
 *                  sites/<tag>/.dist-vnext-publication-<runId>.json
 *                    { publication_mode: 'external_atomic', run_id, site_tag,
 *                      expected_fingerprint, stage_dir, backup_dir,
 *                      status: 'publishing', created_at }
 *                  The journal holds no credentials. It is the marker that
 *                  lets a later process identify WHICH run installed (or was
 *                  installing) the live artifact.
 *   5. swap      — rename dist-vnext -> .dist-vnext-backup-<runId> (if any),
 *                  rename tmp -> dist-vnext (atomic on the same filesystem)
 *   6. verify    — re-fingerprint the live dist-vnext; only when it matches
 *                  the journal's expected fingerprint may the caller persist
 *                  'published'
 *   7. cleanup   — the backup dir and the journal are removed only AFTER the
 *                  run status has been persisted by the caller
 *
 * On ANY staging or swap failure the previous dist-vnext is preserved or
 * restored from its backup, temp dirs are removed, and the caller marks the
 * run publish_failed — never published.
 *
 * Crash recovery (recoverSitePublications) is driven by the journal + the
 * fingerprint, and is IDEMPOTENT — repeated restarts converge to the same
 * final state. For each journal whose run is durably 'publishing':
 *   - live dist-vnext MATCHES the expected fingerprint
 *       -> the swap landed before the crash: mark the run 'published', remove
 *          the run's backup + staged dirs and the journal
 *   - live does NOT match, run-specific backup present
 *       -> interrupted between live->backup and staged->live: restore the
 *          backup to dist-vnext, remove the staged dir, mark 'publish_failed'
 *   - live does NOT match, no backup
 *       -> the swap never started; the live dir (when present) is the
 *          PREVIOUS artifact and is NEVER deleted: remove the staged dir,
 *          mark 'publish_failed'
 * For a journal whose run is already 'published':
 *   - live matches -> crash hit between the 'published' update and journal
 *     cleanup: remove backup/staged dirs + journal
 *   - live provably does NOT match -> the run DID publish its artifact earlier
 *     (historical fact) and the live tree was changed afterwards; be
 *     conservative: flag the mismatch (console.warn), NEVER delete the live
 *     artifact, drop the stale journal so restarts converge
 * For a journal in any other (terminal/missing) run state the publication was
 * already resolved in-process; only the journal cleanup was lost — remove it.
 * A 'publishing' run with NO journal predates this transaction (or died before
 * the journal landed); resolving it stays with the caller's legacy rule
 * (publish_failed), and legacy dir cleanup stays with reconcileDistVnextDirs.
 *
 * Boot/lazy reconciliation (reconcileDistVnextDirs) cleans up dirs abandoned
 * by a crashed process: tmp dirs are deleted, and a backup whose staged
 * counterpart never landed is restored to dist-vnext.
 *
 * TEST-ONLY failure injection: when STUDIO_VNEXT_PUBLISH_FAIL is set to
 * 'stage' or 'swap', the corresponding phase throws AFTER doing its partial
 * work, so tests exercise the real recovery paths without filesystem races.
 *
 * TEST-ONLY crash injection: when STUDIO_VNEXT_CRASH_AFTER is set to
 * 'recipe', 'backup' or 'swap', crashAfterHook(<point>) SIGKILLs the process
 * at that exact point — no cleanup handlers run — so tests exercise hard-crash
 * recovery. 'recipe' fires in the build route after the runner durably
 * persisted 'recipe_completed' and before publication begins; 'backup' fires
 * after the live->backup rename; 'swap' fires after the staged->live rename.
 * Both hooks are inert when their env var is unset and are never reachable
 * through normal requests.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TMP_PREFIX = '.dist-vnext-';
const TMP_SUFFIX = '-tmp';
const BACKUP_PREFIX = '.dist-vnext-backup-';
const JOURNAL_PREFIX = '.dist-vnext-publication-';
const JOURNAL_SUFFIX = '.json';
const PUBLICATION_MODE = 'external_atomic';

// TEST-ONLY hook — see header. Returns 'stage' | 'swap' | null.
function publishFailMode() {
  const mode = process.env.STUDIO_VNEXT_PUBLISH_FAIL;
  return mode === 'stage' || mode === 'swap' ? mode : null;
}

// TEST-ONLY hook — see header. Returns 'recipe' | 'backup' | 'swap' | null.
function crashAfterMode() {
  const mode = process.env.STUDIO_VNEXT_CRASH_AFTER;
  return mode === 'recipe' || mode === 'backup' || mode === 'swap' ? mode : null;
}

/**
 * TEST-ONLY hard-crash hook. When STUDIO_VNEXT_CRASH_AFTER names `point`,
 * SIGKILL the current process immediately — no cleanup handlers, no flush.
 * Inert in every other case.
 */
function crashAfterHook(point) {
  if (crashAfterMode() === point) {
    process.kill(process.pid, 'SIGKILL');
  }
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
 * Deterministic fingerprint of a directory tree: sha256 over the sorted list
 * of POSIX-style relative file paths and their contents. No timestamps, no
 * metadata — the same artifact always fingerprints identically, on any boot.
 */
function fingerprintDir(rootDir) {
  const hash = crypto.createHash('sha256');
  const files = [];
  (function walk(dir, rel) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), childRel);
      } else if (entry.isFile()) {
        files.push(childRel);
      }
    }
  })(rootDir, '');
  files.sort();
  for (const rel of files) {
    hash.update(rel, 'utf8');
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(rootDir, rel)));
    hash.update('\0');
  }
  return `sha256:${hash.digest('hex')}`;
}

function publicationJournalPath(siteDir, runId) {
  return path.join(siteDir, `${JOURNAL_PREFIX}${runId}${JOURNAL_SUFFIX}`);
}

/**
 * Durably persist the publication journal BEFORE the swap: write a temp file
 * and rename it into place, so a crash never leaves a partially written
 * journal. The journal contains no credentials.
 */
function writePublicationJournal(siteDir, journal) {
  const finalPath = publicationJournalPath(siteDir, journal.run_id);
  const tmpPath = `${finalPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(journal, null, 2));
  fs.renameSync(tmpPath, finalPath);
  return finalPath;
}

/**
 * Read every publication journal under a site dir. Unparseable journals are
 * returned as { file, journal: null } so recovery can drop them
 * conservatively. Orphan journal temp files (`*.json.<pid>.tmp`) are not
 * journals and are not returned (recoverSitePublications sweeps them).
 */
function readPublicationJournals(siteDir) {
  if (!fs.existsSync(siteDir)) return [];
  const journals = [];
  for (const name of fs.readdirSync(siteDir)) {
    if (!name.startsWith(JOURNAL_PREFIX) || !name.endsWith(JOURNAL_SUFFIX)) continue;
    const file = path.join(siteDir, name);
    if (!fs.statSync(file).isFile()) continue;
    let journal = null;
    try {
      journal = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      journal = null;
    }
    journals.push({ file, journal });
  }
  return journals;
}

function removePublicationJournal(siteDir, runId) {
  fs.rmSync(publicationJournalPath(siteDir, runId), { force: true });
}

/**
 * Atomically publish workspaceRoot/outputs into distVnextDir as a durable
 * transaction (see header). Throws on any failure after restoring the
 * previous artifact; the live dist-vnext is never left partially copied.
 * The journal survives a thrown failure for the caller to remove once the
 * run's terminal status is durably persisted.
 */
function publishDistVnextAtomic({ workspaceRoot, distVnextDir, runId, expectedPages, siteTag }) {
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

  // Fingerprint the complete staged artifact, then durably journal the
  // transaction BEFORE the first swap rename. After this point a hard crash
  // is recoverable by fingerprint identity (see recoverSitePublications).
  const expectedFingerprint = fingerprintDir(tmpDir);
  writePublicationJournal(siteDir, {
    publication_mode: PUBLICATION_MODE,
    run_id: runId,
    site_tag: siteTag || path.basename(siteDir),
    expected_fingerprint: expectedFingerprint,
    stage_dir: path.basename(tmpDir),
    backup_dir: path.basename(backupDir),
    status: 'publishing',
    created_at: new Date().toISOString(),
  });

  // Swap: only after the staged artifact is complete AND journaled.
  let swapped = false;
  try {
    if (fs.existsSync(distVnextDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
      fs.renameSync(distVnextDir, backupDir);
    }
    crashAfterHook('backup');
    if (publishFailMode() === 'swap') {
      throw new Error('STUDIO_VNEXT_PUBLISH_FAIL=swap (test hook)');
    }
    fs.renameSync(tmpDir, distVnextDir);
    swapped = true;
    crashAfterHook('swap');
  } catch (err) {
    // The swap partially happened (or never started): put the previous
    // complete artifact back and drop the staged one.
    if (!swapped && fs.existsSync(backupDir) && !fs.existsSync(distVnextDir)) {
      fs.renameSync(backupDir, distVnextDir);
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }

  // Verify: the live dist-vnext must BE the journaled artifact before the
  // caller may persist 'published'. A mismatch means the swap did not install
  // what was staged — restore the previous artifact and fail the publication.
  if (fingerprintDir(distVnextDir) !== expectedFingerprint) {
    if (fs.existsSync(backupDir)) {
      fs.rmSync(distVnextDir, { recursive: true, force: true });
      fs.renameSync(backupDir, distVnextDir);
    }
    const err = new Error('live dist-vnext fingerprint mismatch after swap');
    err.reason = 'fingerprint_mismatch';
    throw err;
  }

  // Success: the new artifact is live and verified; the backup is now
  // disposable. The journal is removed by the CALLER once the run's
  // 'published' status is durably persisted.
  fs.rmSync(backupDir, { recursive: true, force: true });
  return { published: true, distDir: distVnextDir, fingerprint: expectedFingerprint };
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

/**
 * Journal-driven crash recovery for externally managed (Operator V1)
 * publications under one site dir. IDEMPOTENT: every branch leaves a final
 * state that a repeated call (or repeated process restart) reproduces
 * exactly. See the module header for the full decision table.
 *
 * @param {object} args
 * @param {string} args.siteDir  sites/<tag> directory
 * @param {object} args.db       runtime-vnext state db (getRun/updateRunStatus)
 */
function recoverSitePublications({ siteDir, db }) {
  const result = { published: [], failed: [], restored: [], removed: [], mismatches: [] };
  if (!fs.existsSync(siteDir)) return result;
  const distVnextDir = path.join(siteDir, 'dist-vnext');

  // Sweep orphan journal temp files (crash between temp write and rename).
  for (const name of fs.readdirSync(siteDir)) {
    if (name.startsWith(JOURNAL_PREFIX) && name.includes(`${JOURNAL_SUFFIX}.`) && name.endsWith('.tmp')) {
      fs.rmSync(path.join(siteDir, name), { force: true });
      result.removed.push(name);
    }
  }

  for (const { file, journal } of readPublicationJournals(siteDir)) {
    // Corrupt or foreign journal: it cannot fingerprint-identify a run, so no
    // publication claim may be derived from it. Drop it; leftover dirs fall
    // back to reconcileDistVnextDirs and the caller's legacy rules.
    if (!journal || journal.publication_mode !== PUBLICATION_MODE || typeof journal.run_id !== 'string') {
      fs.rmSync(file, { force: true });
      result.removed.push(path.basename(file));
      continue;
    }

    const runId = journal.run_id;
    const run = typeof db.getRun === 'function' ? db.getRun(runId) : null;
    const status = run ? run.status : null;
    const tmpDir = path.join(siteDir, typeof journal.stage_dir === 'string' ? journal.stage_dir : `${TMP_PREFIX}${runId}${TMP_SUFFIX}`);
    const backupDir = path.join(siteDir, typeof journal.backup_dir === 'string' ? journal.backup_dir : `${BACKUP_PREFIX}${runId}`);
    const liveMatches = fs.existsSync(distVnextDir)
      && typeof journal.expected_fingerprint === 'string'
      && fingerprintDir(distVnextDir) === journal.expected_fingerprint;

    if (status === 'publishing') {
      if (liveMatches) {
        // The swap landed before the crash; only the 'published' update (and
        // cleanup) was lost. Confirm the publication.
        fs.rmSync(backupDir, { recursive: true, force: true });
        fs.rmSync(tmpDir, { recursive: true, force: true });
        db.updateRunStatus(runId, 'published', new Date().toISOString());
        fs.rmSync(file, { force: true });
        result.published.push(runId);
      } else {
        if (fs.existsSync(backupDir)) {
          // Interrupted between live->backup and staged->live (or the staged
          // artifact never became the live one): restore the previous complete
          // artifact. The live dir, when present here, provably is not the
          // journaled artifact and a complete backup exists.
          fs.rmSync(distVnextDir, { recursive: true, force: true });
          fs.renameSync(backupDir, distVnextDir);
          result.restored.push(runId);
        }
        // No backup: the swap never started; the live dir (when present) is
        // the PREVIOUS artifact and is never deleted.
        fs.rmSync(tmpDir, { recursive: true, force: true });
        db.updateRunStatus(runId, 'publish_failed', new Date().toISOString());
        fs.rmSync(file, { force: true });
        result.failed.push(runId);
      }
    } else if (status === 'published') {
      if (liveMatches) {
        // Crash between the 'published' update and journal cleanup.
        fs.rmSync(backupDir, { recursive: true, force: true });
        fs.rmSync(tmpDir, { recursive: true, force: true });
        fs.rmSync(file, { force: true });
        result.removed.push(path.basename(file));
      } else {
        // The run DID publish its artifact (historical fact); the live tree
        // provably no longer matches that identity — it was changed
        // afterwards (newer build or out-of-band edit). Be conservative:
        // flag the mismatch, never delete the live artifact, and drop the
        // stale journal so restarts converge on this same state.
        result.mismatches.push(runId);
        console.warn(`[dist-vnext-publish] live dist-vnext does not match the journaled artifact of published run ${runId} under ${siteDir}; leaving the live artifact untouched`);
        fs.rmSync(file, { force: true });
      }
    } else {
      // Terminal or missing run row: the publication was already resolved
      // in-process (the filesystem was restored before the terminal status
      // was persisted); only the journal cleanup was lost to the crash.
      fs.rmSync(file, { force: true });
      result.removed.push(path.basename(file));
    }
  }
  return result;
}

module.exports = {
  validateOutputs,
  fingerprintDir,
  publishDistVnextAtomic,
  reconcileDistVnextDirs,
  recoverSitePublications,
  writePublicationJournal,
  readPublicationJournals,
  removePublicationJournal,
  publicationJournalPath,
  crashAfterHook,
};
