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
 * final state.
 *
 * ── JOURNAL IDENTITY + PATH CONTAINMENT (never trust journal paths) ────────
 *
 * A journal is adversary-writable data: recovery never lets a journal steer
 * filesystem operations outside the explicit site directory. Before ANY read,
 * rename, recursive deletion, restoration, or cleanup, each journal must pass
 * the identity gate (validateJournalIdentity):
 *   - the journal FILENAME must be exactly .dist-vnext-publication-<runId>.json
 *     where <runId> matches the canonical run-id format (^run_\d+_[0-9a-f]{4}$,
 *     from runtime-vnext/lib/id.js generateRunId) — anything else is a foreign
 *     journal filename
 *   - the body must parse as JSON with publication_mode 'external_atomic'
 *   - journal.run_id must match the canonical format AND equal the filename's
 *     run id (mismatched run ids are rejected)
 *   - journal.site_tag must equal the explicit site being recovered
 *   - journal.stage_dir / journal.backup_dir are NEVER used to locate anything;
 *     the operational directory names are DERIVED from the validated run id
 *     (.dist-vnext-<runId>-tmp / .dist-vnext-backup-<runId>). Stored names that
 *     disagree with the derived convention mark the journal as tampered — this
 *     is where `..`, absolute paths, separators, encoded traversal and
 *     Windows-style backslash paths are rejected.
 * Every operational path is additionally resolved (resolveInsideSite) and must
 * provably stay inside the real site directory: lexical containment after
 * path.resolve AND, for paths that exist, realpath containment. A planted
 * symlink whose target escapes the site (a journal file, a staged/backup dir,
 * dist-vnext itself) is never read through, renamed, restored from, or
 * recursively deleted — the journal driving it is rejected. (Removing a
 * symlink itself is always safe; the gate exists so recovery also never READS
 * outside data and never mistakes an outside tree for a restorable backup.)
 * Rejected/corrupt/foreign journals are QUARANTINED inside the site dir by
 * renaming them to `<filename>.rejected` — the evidence is retained for
 * diagnosis, never silently deleted, and never leaves the site dir.
 * When multiple journals exist they are processed in deterministic (sorted
 * filename) order, each independently validated; a rejection never affects
 * the processing of the remaining journals.
 *
 * ── CURRENT-PUBLICATION RECEIPT (durable ownership) ────────────────────────
 *
 * When a publication is confirmed published, the caller (and recovery, when it
 * confirms a publication) atomically persists
 *   sites/<tag>/.vnext-current-publication.json
 * recording { run_id, site_tag, fingerprint, published_at } — the durable
 * statement of WHICH run owns the live dist-vnext artifact. It holds no
 * credentials. The name deliberately sits outside the `.dist-vnext-*` prefix
 * family, which the publication flow treats as transient debris. Writes are
 * idempotent: re-ensuring the same run+fingerprint is a no-op, so repeated
 * restarts converge byte-for-byte. A corrupt or foreign receipt is quarantined
 * to `.rejected` and treated as absent (ownership then cannot be proven —
 * the safe direction).
 *
 * ── RECOVERY DECISION TABLE ────────────────────────────────────────────────
 *
 * For each VALID journal whose run is durably 'publishing':
 *   - live dist-vnext MATCHES the expected fingerprint
 *       -> the swap landed before the crash: mark the run 'published', ensure
 *          the current-publication receipt, remove the run's backup + staged
 *          dirs and the journal
 *   - live does NOT match, run-specific backup present
 *       -> interrupted between live->backup and staged->live: restore the
 *          backup to dist-vnext, remove the staged dir, mark 'publish_failed'
 *   - live does NOT match, no backup
 *       -> the swap never started; the live dir (when present) is the
 *          PREVIOUS artifact and is NEVER deleted: remove the staged dir,
 *          mark 'publish_failed'
 * For a journal whose run is already 'published':
 *   - live matches -> crash hit between the 'published' update and journal
 *     cleanup: ensure the receipt, remove backup/staged dirs + journal
 *   - live provably does NOT match -> the run DID publish its artifact earlier
 *     (historical fact) and the live tree was changed afterwards. Classify
 *     durably instead of silently dropping the journal:
 *       * SUPERSEDED — a NEWER run (larger run-id timestamp) exists that
 *         belongs to the same site, is durably 'published', and OWNS the live
 *         fingerprint per the current-publication receipt (re-fingerprinted
 *         live == receipt fingerprint). The older journal is closed by
 *         renaming it to `<filename>.superseded`; restarts converge.
 *       * UNEXPLAINED INCONSISTENCY — no newer published run durably explains
 *         the live fingerprint: the run's durable status becomes
 *         'publication_inconsistent' (observable via the build-status
 *         endpoint, the recovery report and a console warning), the journal is
 *         quarantined to `<filename>.inconsistent`, and the live artifact is
 *         NEVER deleted. Repeated restarts converge to this same state.
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
// The durable "which run owns live dist-vnext" receipt (see header). Its name
// deliberately does NOT start with '.dist-vnext-': that prefix family is
// transient publication debris (staging/backup/journal) swept by recovery and
// asserted empty by the crash-consistency tests, while the receipt persists.
const RECEIPT_NAME = '.vnext-current-publication.json';
// Canonical run-id shape from runtime-vnext/lib/id.js generateRunId():
// `run_<timestamp-ms>_<4-char-hex>`. Journals/receipts carrying anything else
// are foreign. Capture groups expose the embedded timestamp for ordering.
const RUN_ID_PATTERN = /^run_(\d+)_([0-9a-f]{4})$/;
const FINGERPRINT_PATTERN = /^sha256:[0-9a-f]{64}$/;

function stageDirName(runId) {
  return `${TMP_PREFIX}${runId}${TMP_SUFFIX}`;
}

function backupDirName(runId) {
  return `${BACKUP_PREFIX}${runId}`;
}

/** Millisecond timestamp embedded in a canonical run id, or null. */
function runIdTimestampMs(runId) {
  const match = typeof runId === 'string' ? RUN_ID_PATTERN.exec(runId) : null;
  return match ? Number(match[1]) : null;
}

/**
 * Prove that a durable run belongs to the explicit site being recovered.
 * Journal and receipt bodies are adversary-writable and therefore cannot make
 * this ownership claim themselves: it must come from the run -> project rows.
 */
function runBelongsToSite(db, run, siteTag) {
  if (!run || typeof run.project_id !== 'string' || typeof db.getProject !== 'function') return false;
  const project = db.getProject(run.project_id);
  return !!project && project.site_tag === siteTag;
}

function isPathInside(rootReal, candidate) {
  return candidate === rootReal || candidate.startsWith(rootReal + path.sep);
}

/**
 * Resolve a single path component (a NAME, not a path) inside a site dir,
 * refusing anything that could escape it. Returns the absolute resolved path,
 * or null when:
 *   - the name is not a plain basename (`..`, `.`, empty, contains `/`, `\\`
 *     or NUL, or is absolute on POSIX or Windows), or
 *   - the resolved path is not lexically contained in the site dir, or
 *   - the path EXISTS and its real location escapes the site dir (a planted
 *     symlink). A nonexistent path passes: it has no real location yet, and
 *     its lexical location is provably inside.
 * Callers must treat null as "never touch": no read-through, rename, restore,
 * or recursive delete against that path.
 */
function resolveInsideSite(siteRootReal, name) {
  if (typeof name !== 'string' || name === '' || name === '.' || name === '..') return null;
  if (name.includes('\0') || name.includes('/') || name.includes('\\')) return null;
  if (path.isAbsolute(name) || path.win32.isAbsolute(name)) return null;
  const resolved = path.resolve(siteRootReal, name);
  if (!isPathInside(siteRootReal, resolved)) return null;
  let real = null;
  try {
    real = fs.realpathSync(resolved);
  } catch {
    real = null; // does not exist — lexical containment above is sufficient
  }
  if (real !== null && !isPathInside(siteRootReal, real)) return null;
  return resolved;
}

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
 * Read every publication journal under a site dir, in deterministic (sorted
 * filename) order. Each entry is { name, file, journal }; journal is null when
 * the file was not safely readable as a journal — unparseable JSON, a
 * non-regular file, or a SYMLINK whose real target escapes the site dir (such
 * a journal is never read through: its content stays unknown and unread).
 * Orphan journal temp files (`*.json.<pid>.tmp`) are not journals and are not
 * returned (recoverSitePublications sweeps them).
 */
function readPublicationJournals(siteDir) {
  if (!fs.existsSync(siteDir)) return [];
  let siteRootReal;
  try {
    siteRootReal = fs.realpathSync(siteDir);
  } catch {
    siteRootReal = path.resolve(siteDir);
  }
  const names = fs.readdirSync(siteDir)
    .filter((name) => name.startsWith(JOURNAL_PREFIX) && name.endsWith(JOURNAL_SUFFIX))
    .sort();
  const journals = [];
  for (const name of names) {
    const file = path.join(siteDir, name);
    let safeToRead = false;
    try {
      const lst = fs.lstatSync(file);
      if (lst.isSymbolicLink()) {
        const real = fs.realpathSync(file);
        safeToRead = isPathInside(siteRootReal, real) && fs.statSync(file).isFile();
      } else {
        safeToRead = lst.isFile();
      }
    } catch {
      safeToRead = false;
    }
    let journal = null;
    if (safeToRead) {
      try {
        journal = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        journal = null;
      }
    }
    journals.push({ name, file, journal });
  }
  return journals;
}

function removePublicationJournal(siteDir, runId) {
  fs.rmSync(publicationJournalPath(siteDir, runId), { force: true });
}

/**
 * Journal identity gate (Correction A, see header). Pure validation — no
 * filesystem access. Returns { ok: true, runId } or { ok: false, reason }.
 * The run id is taken from the FILENAME (the durable marker written by this
 * module); the body must agree with it exactly, name the explicit site being
 * recovered, and carry stage/backup names identical to the ones derived from
 * the run id. Any disagreement — including `..`, separators, absolute paths,
 * encoded traversal, or Windows-style backslashes smuggled into the stored
 * names — rejects the journal before anything is read, renamed, restored, or
 * deleted on its behalf.
 */
function validateJournalIdentity({ name, journal, siteTag }) {
  const fileRunId = name.slice(JOURNAL_PREFIX.length, name.length - JOURNAL_SUFFIX.length);
  if (!RUN_ID_PATTERN.test(fileRunId)) {
    return { ok: false, reason: 'foreign_journal_filename' };
  }
  if (!journal || typeof journal !== 'object' || Array.isArray(journal)) {
    return { ok: false, reason: 'malformed_json' };
  }
  if (journal.publication_mode !== PUBLICATION_MODE) {
    return { ok: false, reason: 'unexpected_publication_mode' };
  }
  if (typeof journal.run_id !== 'string' || !RUN_ID_PATTERN.test(journal.run_id)) {
    return { ok: false, reason: 'invalid_run_id' };
  }
  if (journal.run_id !== fileRunId) {
    return { ok: false, reason: 'run_id_filename_mismatch' };
  }
  if (journal.site_tag !== siteTag) {
    return { ok: false, reason: 'site_tag_mismatch' };
  }
  if (journal.stage_dir !== stageDirName(fileRunId)) {
    return { ok: false, reason: 'stage_dir_mismatch' };
  }
  if (journal.backup_dir !== backupDirName(fileRunId)) {
    return { ok: false, reason: 'backup_dir_mismatch' };
  }
  return { ok: true, runId: fileRunId };
}

/**
 * Quarantine a publication file INSIDE the site dir by renaming it to
 * `<filename>.<classification>` ('rejected' | 'superseded' | 'inconsistent').
 * The evidence is retained, never silently deleted; the quarantined name no
 * longer matches the journal pattern, so later restarts skip it (convergent).
 * Never throws: a quarantine failure is logged and the file is left in place.
 */
function quarantinePublicationFile(file, classification) {
  const target = `${file}.${classification}`;
  try {
    fs.rmSync(target, { force: true });
    fs.renameSync(file, target);
    return target;
  } catch (err) {
    console.warn(`[dist-vnext-publish] failed to quarantine ${path.basename(file)} as .${classification}: ${err.message}`);
    return null;
  }
}

function currentPublicationReceiptPath(siteDir) {
  return path.join(siteDir, RECEIPT_NAME);
}

function isValidReceipt(receipt, siteTag) {
  return !!receipt && typeof receipt === 'object' && !Array.isArray(receipt)
    && receipt.publication_mode === PUBLICATION_MODE
    && typeof receipt.run_id === 'string' && RUN_ID_PATTERN.test(receipt.run_id)
    && receipt.site_tag === siteTag
    && typeof receipt.fingerprint === 'string' && FINGERPRINT_PATTERN.test(receipt.fingerprint);
}

/**
 * Read the current-publication receipt of a site, or null when there is no
 * USABLE one. A receipt symlink escaping the site is never read through; a
 * corrupt or identity-invalid receipt is quarantined to `.rejected` and
 * treated as absent (ownership cannot be proven — the safe direction).
 */
function readCurrentPublicationReceipt(siteDir, siteTag) {
  const file = currentPublicationReceiptPath(siteDir);
  if (!fs.existsSync(file)) return null;
  let siteRootReal;
  try {
    siteRootReal = fs.realpathSync(siteDir);
  } catch {
    siteRootReal = path.resolve(siteDir);
  }
  try {
    const lst = fs.lstatSync(file);
    if (lst.isSymbolicLink() && !isPathInside(siteRootReal, fs.realpathSync(file))) {
      quarantinePublicationFile(file, 'rejected');
      return null;
    }
    if (!fs.statSync(file).isFile()) return null;
  } catch {
    return null;
  }
  let receipt = null;
  try {
    receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    receipt = null;
  }
  if (!isValidReceipt(receipt, siteTag)) {
    quarantinePublicationFile(file, 'rejected');
    return null;
  }
  return receipt;
}

/**
 * Durably record WHICH run owns the live dist-vnext artifact (see header).
 * Atomic (temp file + rename), no credentials. Idempotent: when the existing
 * receipt already records the same run + fingerprint this is a no-op, so
 * repeated restarts converge byte-for-byte. Throws on malformed input —
 * a receipt with a bad run id or fingerprint must never be persisted.
 */
function ensureCurrentPublicationReceipt(siteDir, { runId, siteTag, fingerprint, publishedAt }) {
  if (typeof siteTag !== 'string' || siteTag === '') {
    throw new Error('a siteTag is required for the current-publication receipt');
  }
  if (typeof runId !== 'string' || !RUN_ID_PATTERN.test(runId)) {
    throw new Error(`invalid run_id for the current-publication receipt: ${runId}`);
  }
  if (typeof fingerprint !== 'string' || !FINGERPRINT_PATTERN.test(fingerprint)) {
    throw new Error(`invalid fingerprint for the current-publication receipt: ${fingerprint}`);
  }
  const finalPath = currentPublicationReceiptPath(siteDir);
  const existing = readCurrentPublicationReceipt(siteDir, siteTag);
  if (existing && existing.run_id === runId && existing.fingerprint === fingerprint) {
    return { receiptPath: finalPath, updated: false };
  }
  const receipt = {
    publication_mode: PUBLICATION_MODE,
    run_id: runId,
    site_tag: siteTag,
    fingerprint,
    published_at: publishedAt || new Date().toISOString(),
  };
  const tmpPath = `${finalPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(receipt, null, 2));
  fs.renameSync(tmpPath, finalPath);
  return { receiptPath: finalPath, updated: true };
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
  const tmpDir = path.join(siteDir, stageDirName(runId));
  const backupDir = path.join(siteDir, backupDirName(runId));

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
    stage_dir: stageDirName(runId),
    backup_dir: backupDirName(runId),
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
 * exactly. Every journal passes the identity + containment gate before any
 * filesystem operation, and published-run fingerprint mismatches are
 * classified durably (superseded / publication_inconsistent). See the module
 * header for the full gate, quarantine, receipt, and decision-table docs.
 *
 * @param {object} args
 * @param {string} args.siteDir  sites/<tag> directory
 * @param {object} args.db       runtime-vnext state db (getRun/updateRunStatus)
 * @param {string} [args.siteTag] the explicit site being recovered; journals
 *                                naming any other site are rejected. Defaults
 *                                to basename(siteDir) (sites/<tag> layout).
 */
function recoverSitePublications({ siteDir, db, siteTag }) {
  const result = {
    published: [], failed: [], restored: [], removed: [],
    rejected: [], superseded: [], inconsistent: [], mismatches: [],
  };
  if (!fs.existsSync(siteDir)) return result;
  const explicitSiteTag = typeof siteTag === 'string' && siteTag !== '' ? siteTag : path.basename(siteDir);
  const siteRootReal = fs.realpathSync(siteDir);
  const distVnextDir = path.join(siteDir, 'dist-vnext');

  // Sweep orphan journal/receipt temp files (crash between temp write and
  // rename). These are this module's own `*.<pid>.tmp` names inside the site.
  for (const name of fs.readdirSync(siteDir)) {
    if (name.startsWith(JOURNAL_PREFIX) && name.includes(`${JOURNAL_SUFFIX}.`) && name.endsWith('.tmp')) {
      fs.rmSync(path.join(siteDir, name), { force: true });
      result.removed.push(name);
    } else if (name.startsWith(`${RECEIPT_NAME}.`) && name.endsWith('.tmp')) {
      fs.rmSync(path.join(siteDir, name), { force: true });
      result.removed.push(name);
    }
  }

  // The live artifact's identity, computed once. A dist-vnext whose real
  // location escapes the site dir (planted symlink) is never read through:
  // it simply matches no journaled fingerprint.
  let liveFingerprint = null;
  if (fs.existsSync(distVnextDir) && resolveInsideSite(siteRootReal, 'dist-vnext') !== null) {
    try {
      liveFingerprint = fingerprintDir(distVnextDir);
    } catch {
      liveFingerprint = null;
    }
  }

  for (const { name, file, journal } of readPublicationJournals(siteDir)) {
    // ── Identity + containment gate: nothing below may be steered by an
    // unvalidated journal. Operational dir names are DERIVED from the
    // validated run id and proven contained before use.
    const identity = validateJournalIdentity({ name, journal, siteTag: explicitSiteTag });
    let tmpDir = null;
    let backupDir = null;
    if (identity.ok) {
      tmpDir = resolveInsideSite(siteRootReal, stageDirName(identity.runId));
      backupDir = resolveInsideSite(siteRootReal, backupDirName(identity.runId));
      if (tmpDir === null || backupDir === null) {
        identity.ok = false;
        identity.reason = 'path_escapes_site';
      }
    }
    if (!identity.ok) {
      // Corrupt, foreign, or hostile journal: no publication claim and no
      // filesystem operation may be derived from it. Quarantine the evidence
      // inside the site dir; leftover dirs fall back to reconcileDistVnextDirs
      // and the caller's legacy rules.
      quarantinePublicationFile(file, 'rejected');
      result.rejected.push({ file: name, reason: identity.reason });
      continue;
    }

    const runId = identity.runId;
    const run = typeof db.getRun === 'function' ? db.getRun(runId) : null;
    if (run && !runBelongsToSite(db, run, explicitSiteTag)) {
      quarantinePublicationFile(file, 'rejected');
      result.rejected.push({ file: name, reason: 'run_site_mismatch' });
      continue;
    }
    const status = run ? run.status : null;
    const liveMatches = liveFingerprint !== null
      && typeof journal.expected_fingerprint === 'string'
      && liveFingerprint === journal.expected_fingerprint;

    if (status === 'publishing') {
      if (liveMatches) {
        // The swap landed before the crash; only the 'published' update (and
        // cleanup) was lost. Confirm the publication and its ownership
        // receipt. A receipt-write failure must not abort crash recovery.
        fs.rmSync(backupDir, { recursive: true, force: true });
        fs.rmSync(tmpDir, { recursive: true, force: true });
        db.updateRunStatus(runId, 'published', new Date().toISOString());
        try {
          ensureCurrentPublicationReceipt(siteDir, { runId, siteTag: explicitSiteTag, fingerprint: journal.expected_fingerprint });
        } catch (err) {
          console.warn(`[dist-vnext-publish] failed to persist the current-publication receipt for ${runId}: ${err.message}`);
        }
        fs.rmSync(file, { force: true });
        result.published.push(runId);
      } else {
        if (fs.existsSync(backupDir)) {
          // Interrupted between live->backup and staged->live (or the staged
          // artifact never became the live one): restore the previous complete
          // artifact. The live dir, when present here, provably is not the
          // journaled artifact and a complete backup exists. (If dist-vnext
          // is a symlink, rmSync removes the link itself, never the target.)
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
        try {
          ensureCurrentPublicationReceipt(siteDir, { runId, siteTag: explicitSiteTag, fingerprint: journal.expected_fingerprint });
        } catch (err) {
          console.warn(`[dist-vnext-publish] failed to persist the current-publication receipt for ${runId}: ${err.message}`);
        }
        fs.rmSync(file, { force: true });
        result.removed.push(name);
      } else {
        // The run DID publish its artifact (historical fact); the live tree
        // provably no longer matches that identity. Classify durably (see
        // header): superseded only when a NEWER published run owns the live
        // fingerprint per the current-publication receipt; otherwise an
        // unexplained inconsistency. NEVER delete the live artifact.
        const receipt = readCurrentPublicationReceipt(siteDir, explicitSiteTag);
        const receiptIsNewerRun = receipt !== null
          && receipt.run_id !== runId
          && (runIdTimestampMs(receipt.run_id) || 0) > (runIdTimestampMs(runId) || 0);
        const receiptRun = receiptIsNewerRun && typeof db.getRun === 'function'
          ? db.getRun(receipt.run_id)
          : null;
        const receiptOwnsLive = receiptIsNewerRun
          && liveFingerprint !== null
          && receipt.fingerprint === liveFingerprint;
        if (receiptRun
          && receiptRun.status === 'published'
          && runBelongsToSite(db, receiptRun, explicitSiteTag)
          && receiptOwnsLive) {
          // Legitimate supersession: the newer run provably owns the live
          // artifact, so the older journal's mismatch is fully explained.
          quarantinePublicationFile(file, 'superseded');
          result.superseded.push({ run_id: runId, superseded_by: receipt.run_id });
          continue;
        }
        // Unexplained inconsistency: no newer published run durably explains
        // the live fingerprint. Persist the state, retain the evidence, keep
        // the live artifact, and converge on repeat restarts.
        result.mismatches.push(runId);
        result.inconsistent.push(runId);
        console.warn(`[dist-vnext-publish] live dist-vnext does not match the journaled artifact of published run ${runId} under ${siteDir} and no newer published run owns it; marking the run publication_inconsistent and leaving the live artifact untouched`);
        db.updateRunStatus(runId, 'publication_inconsistent', new Date().toISOString());
        quarantinePublicationFile(file, 'inconsistent');
      }
    } else {
      // Terminal or missing run row: the publication was already resolved
      // in-process (the filesystem was restored before the terminal status
      // was persisted); only the journal cleanup was lost to the crash.
      fs.rmSync(file, { force: true });
      result.removed.push(name);
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
  validateJournalIdentity,
  resolveInsideSite,
  quarantinePublicationFile,
  ensureCurrentPublicationReceipt,
  readCurrentPublicationReceipt,
  currentPublicationReceiptPath,
  stageDirName,
  backupDirName,
  runIdTimestampMs,
  runBelongsToSite,
};
