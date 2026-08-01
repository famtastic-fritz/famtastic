/**
 * Operator V1 — publication journal IDENTITY + PATH CONTAINMENT (Correction A).
 *
 * Direct-call tests of recoverSitePublications (server/dist-vnext-publish.js)
 * against a fully temporary world. A sentinel tree OUTSIDE the site dir (a
 * sentinel file, a sentinel directory, and a whole sibling site) is snapshotted
 * before and after every recovery run: hostile journals must never cause any
 * file or directory outside the explicit site directory to be read, renamed,
 * restored, or deleted.
 *
 * Covered rejection classes (each quarantined to `<filename>.rejected` INSIDE
 * the site dir, evidence retained, run status and live artifact untouched):
 *   - malformed JSON
 *   - wrong publication_mode
 *   - run_id failing the canonical format (^run_\d+_[0-9a-f]{4}$)
 *   - run_id that does not match the journal filename
 *   - site_tag that does not match the explicit site being recovered
 *   - foreign journal filenames (garbage, uppercase hex, encoded traversal,
 *     Windows-style backslashes in the run-id position)
 *   - hostile stage_dir / backup_dir values (`..`, absolute paths, separators,
 *     encoded traversal, Windows-style backslash paths) — operational dir
 *     names are DERIVED from the validated run id, never read from the journal
 *   - a journal that is a SYMLINK escaping the site (never even read)
 *   - a staged/backup dir that is a SYMLINK escaping the site (never restored
 *     from, renamed, or recursively deleted)
 * plus the deterministic multi-journal policy: hostile journals are quarantined
 * while valid ones are still processed, and repeated recovery runs converge.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const {
  recoverSitePublications,
  fingerprintDir,
  stageDirName,
  backupDirName,
} = require('../server/dist-vnext-publish.js');

const SITE_TAG = 'site-contained';
const RUN_A = 'run_1700000000000_abcd';
const RUN_B = 'run_1700000001000_ef01';
const HEX_ZERO = `sha256:${'0'.repeat(64)}`;

let tmpRoot;
let siteDir;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function stubDb(seed = {}) {
  const runs = new Map(Object.entries(seed));
  return {
    getRun: (id) => runs.get(id) || null,
    updateRunStatus: (id, status, endedAt) => {
      const row = runs.get(id);
      if (row) {
        row.status = status;
        row.ended_at = endedAt || null;
      }
    },
    _runs: runs,
  };
}

function writeLive(marker) {
  const dist = path.join(siteDir, 'dist-vnext');
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), `<!DOCTYPE html><html><body><h1>${marker}</h1></body></html>`);
  return dist;
}

/** The derived operational dirs, planted so ANY wrongful processing is visible. */
function plantDerivedDirs(runId) {
  const tmpD = path.join(siteDir, stageDirName(runId));
  const bakD = path.join(siteDir, backupDirName(runId));
  fs.mkdirSync(tmpD, { recursive: true });
  fs.mkdirSync(bakD, { recursive: true });
  fs.writeFileSync(path.join(tmpD, 'index.html'), 'STAGED');
  fs.writeFileSync(path.join(bakD, 'index.html'), 'BACKUP');
}

function derivedDirsIntact(runId) {
  const tmpFile = path.join(siteDir, stageDirName(runId), 'index.html');
  const bakFile = path.join(siteDir, backupDirName(runId), 'index.html');
  return fs.existsSync(tmpFile) && fs.readFileSync(tmpFile, 'utf8') === 'STAGED'
    && fs.existsSync(bakFile) && fs.readFileSync(bakFile, 'utf8') === 'BACKUP';
}

function validJournal(runId, overrides = {}) {
  return {
    publication_mode: 'external_atomic',
    run_id: runId,
    site_tag: SITE_TAG,
    expected_fingerprint: HEX_ZERO,
    stage_dir: stageDirName(runId),
    backup_dir: backupDirName(runId),
    status: 'publishing',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function journalPath(runPart) {
  return path.join(siteDir, `.dist-vnext-publication-${runPart}.json`);
}

function writeJournal(runPart, body) {
  const file = journalPath(runPart);
  fs.writeFileSync(file, typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  return file;
}

/** Snapshot of the ENTIRE temp world except the site dir — the strongest
 *  "nothing outside the site changed" check (files, contents, symlinks). */
function snapshotOutsideSite() {
  const snap = new Map();
  (function walk(dir, rel) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (full === siteDir) continue;
      const r = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, r);
      else if (entry.isFile()) snap.set(r, fs.readFileSync(full, 'utf8'));
      else if (entry.isSymbolicLink()) snap.set(r, `symlink:${fs.readlinkSync(full)}`);
    }
  })(tmpRoot, '');
  return snap;
}

function resetWorld() {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  fs.mkdirSync(siteDir, { recursive: true });
  // Sentinel tree OUTSIDE the site dir.
  fs.mkdirSync(path.join(tmpRoot, 'outside', 'sentinel-dir'), { recursive: true });
  fs.writeFileSync(path.join(tmpRoot, 'outside', 'sentinel.txt'), 'SENTINEL-FILE');
  fs.writeFileSync(path.join(tmpRoot, 'outside', 'sentinel-dir', 'keep.txt'), 'SENTINEL-DIR');
  // A sibling site that must never be touched either.
  fs.mkdirSync(path.join(tmpRoot, 'sites', 'site-other', 'dist-vnext'), { recursive: true });
  fs.writeFileSync(path.join(tmpRoot, 'sites', 'site-other', 'dist-vnext', 'index.html'), 'SIBLING');
  writeLive('LIVE');
}

function liveFingerprint() {
  return fingerprintDir(path.join(siteDir, 'dist-vnext'));
}

// ---------------------------------------------------------------------------
// setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'operator-v1-journal-containment-'));
  siteDir = path.join(tmpRoot, 'sites', SITE_TAG);
  resetWorld();
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// rejection classes
// ---------------------------------------------------------------------------

describe('journal identity + path containment (Correction A)', () => {
  it('rejects malformed, foreign, and mismatched journal identities, quarantines the evidence, and touches nothing', () => {
    const cases = [
      ['malformed JSON', RUN_A, 'this is not json{', 'malformed_json'],
      ['wrong publication_mode', RUN_A, validJournal(RUN_A, { publication_mode: 'inline_legacy' }), 'unexpected_publication_mode'],
      ['run_id failing the canonical format', RUN_A, validJournal(RUN_A, { run_id: 'not-a-run-id' }), 'invalid_run_id'],
      ['run_id in body != filename', RUN_A, validJournal(RUN_A, { run_id: RUN_B }), 'run_id_filename_mismatch'],
      ['site_tag of another site', RUN_A, validJournal(RUN_A, { site_tag: 'site-other' }), 'site_tag_mismatch'],
      ['garbage filename', 'garbage', validJournal(RUN_A), 'foreign_journal_filename'],
      ['uppercase hex in filename run id', 'run_1700000000000_ABCD', validJournal(RUN_A), 'foreign_journal_filename'],
      ['encoded traversal in filename', 'run_1700000000000_%2e%2e', validJournal(RUN_A), 'foreign_journal_filename'],
      ['windows-style backslashes in filename', 'run_1700000000000_..\\..', validJournal(RUN_A), 'foreign_journal_filename'],
      ['non-canonical run id shape in filename', 'run_1700000000000_abcde', validJournal(RUN_A), 'foreign_journal_filename'],
    ];

    for (const [label, runPart, body, reason] of cases) {
      resetWorld();
      plantDerivedDirs(RUN_A);
      // The run is 'publishing': an UNGATED recovery would act on this journal
      // (restore the backup, flip the status). The gate must make it inert.
      const db = stubDb({ [RUN_A]: { status: 'publishing' } });
      const file = writeJournal(runPart, body);
      const outsideBefore = snapshotOutsideSite();
      const liveBefore = liveFingerprint();

      const result = recoverSitePublications({ siteDir, db, siteTag: SITE_TAG });

      expect(result.rejected, label).toEqual([{ file: path.basename(file), reason }]);
      expect(result.published, label).toEqual([]);
      expect(result.failed, label).toEqual([]);
      expect(result.restored, label).toEqual([]);
      // Evidence quarantined INSIDE the site dir — never silently deleted.
      expect(fs.existsSync(file), label).toBe(false);
      expect(fs.existsSync(`${file}.rejected`), label).toBe(true);
      // No status flip, no restore, no rename, no recursive delete.
      expect(db._runs.get(RUN_A).status, label).toBe('publishing');
      expect(liveFingerprint(), label).toBe(liveBefore);
      expect(derivedDirsIntact(RUN_A), label).toBe(true);
      expect(snapshotOutsideSite(), label).toEqual(outsideBefore);
    }
  });

  it('rejects hostile stage_dir / backup_dir values (.., absolute, separators, encoded, windows) without deriving any path from them', () => {
    const hostileValues = [
      '..',
      '/abs/outside',
      'nested/dir',
      '%2e%2e%2f',
      '..\\..\\outside',
      'C:\\windows\\temp',
      '.dist-vnext-backup-other',
    ];

    for (const field of ['stage_dir', 'backup_dir']) {
      for (const hostile of hostileValues) {
        resetWorld();
        plantDerivedDirs(RUN_A);
        const db = stubDb({ [RUN_A]: { status: 'publishing' } });
        const file = writeJournal(RUN_A, validJournal(RUN_A, { [field]: hostile }));
        const outsideBefore = snapshotOutsideSite();
        const liveBefore = liveFingerprint();

        const result = recoverSitePublications({ siteDir, db, siteTag: SITE_TAG });

        const expectedReason = field === 'stage_dir' ? 'stage_dir_mismatch' : 'backup_dir_mismatch';
        expect(result.rejected, `${field}=${hostile}`).toEqual([{ file: path.basename(file), reason: expectedReason }]);
        expect(fs.existsSync(`${file}.rejected`), `${field}=${hostile}`).toBe(true);
        expect(db._runs.get(RUN_A).status, `${field}=${hostile}`).toBe('publishing');
        expect(liveFingerprint(), `${field}=${hostile}`).toBe(liveBefore);
        expect(derivedDirsIntact(RUN_A), `${field}=${hostile}`).toBe(true);
        expect(snapshotOutsideSite(), `${field}=${hostile}`).toEqual(outsideBefore);
      }
    }
  });

  it('never reads through a journal that is a symlink escaping the site', () => {
    // The outside target holds a FULLY VALID journal for a 'publishing' run:
    // if recovery read through the symlink it would confirm the publication.
    const outsideJournal = path.join(tmpRoot, 'outside', 'planted-journal.json');
    fs.writeFileSync(outsideJournal, JSON.stringify(validJournal(RUN_A, { expected_fingerprint: liveFingerprint() }), null, 2));
    const link = journalPath(RUN_A);
    fs.symlinkSync(outsideJournal, link);
    const db = stubDb({ [RUN_A]: { status: 'publishing' } });
    const outsideBefore = snapshotOutsideSite();
    const liveBefore = liveFingerprint();

    const result = recoverSitePublications({ siteDir, db, siteTag: SITE_TAG });

    // Not read -> treated as unreadable -> rejected and quarantined. The
    // quarantine renames the LINK itself; the outside target is untouched.
    expect(result.rejected).toEqual([{ file: path.basename(link), reason: 'malformed_json' }]);
    expect(result.published).toEqual([]);
    expect(db._runs.get(RUN_A).status).toBe('publishing');
    expect(fs.existsSync(link)).toBe(false);
    const quarantined = fs.lstatSync(`${link}.rejected`);
    expect(quarantined.isSymbolicLink()).toBe(true);
    expect(fs.readlinkSync(`${link}.rejected`)).toBe(outsideJournal);
    expect(fs.readFileSync(outsideJournal, 'utf8')).toContain(RUN_A);
    expect(liveFingerprint()).toBe(liveBefore);
    expect(snapshotOutsideSite()).toEqual(outsideBefore);
  });

  it('never restores from a staged/backup dir that is a symlink escaping the site', () => {
    // A perfectly VALID journal (passes the identity gate), but the derived
    // backup dir is a planted symlink to an outside directory. Without the
    // containment proof, the 'publishing' + mismatch + backup-present branch
    // would install the OUTSIDE tree as the live artifact.
    const db = stubDb({ [RUN_A]: { status: 'publishing' } });
    writeJournal(RUN_A, validJournal(RUN_A)); // expected_fingerprint != live
    fs.symlinkSync(path.join(tmpRoot, 'outside', 'sentinel-dir'), path.join(siteDir, backupDirName(RUN_A)));
    const outsideBefore = snapshotOutsideSite();
    const liveBefore = liveFingerprint();

    const result = recoverSitePublications({ siteDir, db, siteTag: SITE_TAG });

    expect(result.rejected).toEqual([{ file: `${path.basename(journalPath(RUN_A))}`, reason: 'path_escapes_site' }]);
    expect(result.restored).toEqual([]);
    expect(result.failed).toEqual([]);
    // Nothing restored, nothing flipped, nothing deleted anywhere.
    expect(db._runs.get(RUN_A).status).toBe('publishing');
    expect(liveFingerprint()).toBe(liveBefore);
    expect(fs.readFileSync(path.join(tmpRoot, 'outside', 'sentinel-dir', 'keep.txt'), 'utf8')).toBe('SENTINEL-DIR');
    expect(fs.lstatSync(path.join(siteDir, backupDirName(RUN_A))).isSymbolicLink()).toBe(true);
    expect(fs.existsSync(`${journalPath(RUN_A)}.rejected`)).toBe(true);
    expect(snapshotOutsideSite()).toEqual(outsideBefore);
  });

  it('multiple journals: deterministic order, each independently validated — hostile quarantined, valid still processed', () => {
    // RUN_A: hostile journal (names ANOTHER site). RUN_B: valid journal whose
    // run is 'publishing' and whose expected fingerprint IS the live artifact.
    const db = stubDb({
      [RUN_A]: { status: 'publishing' },
      [RUN_B]: { status: 'publishing' },
    });
    const hostileFile = writeJournal(RUN_A, validJournal(RUN_A, { site_tag: 'site-other' }));
    const validFile = writeJournal(RUN_B, validJournal(RUN_B, { expected_fingerprint: liveFingerprint() }));
    const outsideBefore = snapshotOutsideSite();
    const liveBefore = liveFingerprint();

    const r1 = recoverSitePublications({ siteDir, db, siteTag: SITE_TAG });

    expect(r1.rejected).toEqual([{ file: path.basename(hostileFile), reason: 'site_tag_mismatch' }]);
    expect(r1.published).toEqual([RUN_B]);
    expect(fs.existsSync(`${hostileFile}.rejected`)).toBe(true);
    expect(fs.existsSync(validFile)).toBe(false); // consumed by the confirmed publication
    expect(db._runs.get(RUN_A).status).toBe('publishing'); // untouched
    expect(db._runs.get(RUN_B).status).toBe('published');
    expect(liveFingerprint()).toBe(liveBefore);
    expect(snapshotOutsideSite()).toEqual(outsideBefore);

    // Convergence: a second recovery (restart) finds nothing left to do and
    // the site tree is byte-identical.
    const snapSite = () => {
      const m = new Map();
      (function walk(dir, rel) {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const r = rel ? `${rel}/${e.name}` : e.name;
          const full = path.join(dir, e.name);
          if (e.isDirectory()) walk(full, r);
          else if (e.isFile()) m.set(r, fs.readFileSync(full, 'utf8'));
        }
      })(siteDir, '');
      return m;
    };
    const siteAfter1 = snapSite();
    const r2 = recoverSitePublications({ siteDir, db, siteTag: SITE_TAG });
    expect(r2).toEqual({
      published: [], failed: [], restored: [], removed: [],
      rejected: [], superseded: [], inconsistent: [], mismatches: [],
    });
    expect(db._runs.get(RUN_B).status).toBe('published');
    expect(snapSite()).toEqual(siteAfter1);
    expect(snapshotOutsideSite()).toEqual(outsideBefore);
    expect(fs.existsSync(`${hostileFile}.rejected`)).toBe(true);
    expect(siteAfter1.size).toBeGreaterThan(0);
  });

  it('explicit siteTag governs: recovery for a DIFFERENT site rejects these journals as foreign', () => {
    // A journal that is perfectly valid for site-contained must be rejected
    // when the explicit site being recovered names another tag — containment
    // is always relative to the explicit site.
    const db = stubDb({ [RUN_A]: { status: 'publishing' } });
    const file = writeJournal(RUN_A, validJournal(RUN_A));
    const outsideBefore = snapshotOutsideSite();
    const liveBefore = liveFingerprint();

    const result = recoverSitePublications({ siteDir, db, siteTag: 'site-other' });

    expect(result.rejected).toEqual([{ file: path.basename(file), reason: 'site_tag_mismatch' }]);
    expect(db._runs.get(RUN_A).status).toBe('publishing');
    expect(fs.existsSync(`${file}.rejected`)).toBe(true);
    expect(liveFingerprint()).toBe(liveBefore);
    expect(snapshotOutsideSite()).toEqual(outsideBefore);
  });
});
