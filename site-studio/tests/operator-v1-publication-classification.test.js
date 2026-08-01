/**
 * Operator V1 — durable classification of published-run fingerprint mismatches
 * (Correction B).
 *
 * When a VALID journal remains for a run that is durably 'published' but the
 * live dist-vnext provably no longer matches the journaled fingerprint, the old
 * code warned and silently dropped the journal. It now classifies durably,
 * driven by the site-local current-publication receipt
 * (sites/<tag>/.vnext-current-publication.json — the durable record of WHICH
 * run owns the live artifact):
 *
 *   SUPERSEDED — a NEWER run (larger run-id timestamp) exists that belongs to
 *     the same site, is durably 'published', and owns the live fingerprint per
 *     the receipt (re-fingerprinted live == receipt fingerprint). The older
 *     journal is closed by renaming it to `<filename>.superseded`.
 *   UNEXPLAINED INCONSISTENCY — no newer published run durably explains the
 *     live fingerprint: the run's durable status becomes
 *     'publication_inconsistent' (observable through the build-status
 *     endpoint's `status` field, the recovery report, and a console warning),
 *     the journal is quarantined to `<filename>.inconsistent`, and the live
 *     artifact is NEVER deleted.
 *
 * Both classifications are idempotent: a second recovery (restart) changes
 * nothing and the end state is byte-identical.
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
  ensureCurrentPublicationReceipt,
  readCurrentPublicationReceipt,
  currentPublicationReceiptPath,
} = require('../server/dist-vnext-publish.js');

const SITE_TAG = 'site-classified';
const RUN_OLD = 'run_1700000000000_abcd';
const RUN_NEW = 'run_1700000001000_ef01';
const HEX_F = `sha256:${'f'.repeat(64)}`;

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

function liveFingerprint() {
  return fingerprintDir(path.join(siteDir, 'dist-vnext'));
}

function validJournal(runId, overrides = {}) {
  return {
    publication_mode: 'external_atomic',
    run_id: runId,
    site_tag: SITE_TAG,
    expected_fingerprint: HEX_F,
    stage_dir: stageDirName(runId),
    backup_dir: backupDirName(runId),
    status: 'publishing',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function journalPath(runId) {
  return path.join(siteDir, `.dist-vnext-publication-${runId}.json`);
}

function writeJournal(runId, body) {
  const file = journalPath(runId);
  fs.writeFileSync(file, JSON.stringify(body, null, 2));
  return file;
}

function snapshotSiteDir() {
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
}

const EMPTY_RESULT = {
  published: [], failed: [], restored: [], removed: [],
  rejected: [], superseded: [], inconsistent: [], mismatches: [],
};

function resetWorld() {
  fs.rmSync(siteDir, { recursive: true, force: true });
  fs.mkdirSync(siteDir, { recursive: true });
  writeLive('LIVE ARTIFACT');
}

// ---------------------------------------------------------------------------
// setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'operator-v1-publication-classification-'));
  siteDir = path.join(tmpRoot, 'sites', SITE_TAG);
  resetWorld();
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// legitimate supersession
// ---------------------------------------------------------------------------

describe('durable mismatch classification (Correction B)', () => {
  it('superseded: a newer published run owning the live fingerprint closes the older journal durably and converges', () => {
    // Live artifact belongs to RUN_NEW; the receipt says so. RUN_OLD's journal
    // (run durably 'published') expects a different fingerprint.
    const liveFp = liveFingerprint();
    ensureCurrentPublicationReceipt(siteDir, { runId: RUN_NEW, siteTag: SITE_TAG, fingerprint: liveFp });
    const db = stubDb({
      [RUN_OLD]: { status: 'published' },
      [RUN_NEW]: { status: 'published' },
    });
    const oldJournal = writeJournal(RUN_OLD, validJournal(RUN_OLD)); // HEX_F != live

    const r1 = recoverSitePublications({ siteDir, db, siteTag: SITE_TAG });

    expect(r1.superseded).toEqual([{ run_id: RUN_OLD, superseded_by: RUN_NEW }]);
    expect(r1.inconsistent).toEqual([]);
    expect(r1.mismatches).toEqual([]);
    // The older journal is closed DURABLY, evidence kept inside the site dir.
    expect(fs.existsSync(oldJournal)).toBe(false);
    const closed = JSON.parse(fs.readFileSync(`${oldJournal}.superseded`, 'utf8'));
    expect(closed.run_id).toBe(RUN_OLD);
    // Statuses stay truthful: supersession changes NO run status.
    expect(db._runs.get(RUN_OLD).status).toBe('published');
    expect(db._runs.get(RUN_NEW).status).toBe('published');
    // The live artifact and the receipt are untouched.
    expect(liveFingerprint()).toBe(liveFp);
    const receipt = readCurrentPublicationReceipt(siteDir, SITE_TAG);
    expect(receipt.run_id).toBe(RUN_NEW);
    expect(receipt.fingerprint).toBe(liveFp);

    // Restart convergence: identical end state, nothing left to do.
    const after1 = snapshotSiteDir();
    const r2 = recoverSitePublications({ siteDir, db, siteTag: SITE_TAG });
    expect(r2).toEqual(EMPTY_RESULT);
    expect(snapshotSiteDir()).toEqual(after1);
    expect(db._runs.get(RUN_OLD).status).toBe('published');
    expect(db._runs.get(RUN_NEW).status).toBe('published');
  });

  it('supersession requires proof: without a qualifying newer published owner the mismatch is an inconsistency', () => {
    const liveFp = liveFingerprint();
    const variants = {
      // no receipt at all: ownership of live cannot be proven
      'no receipt': {},
      // receipt names a fingerprint that is NOT the live one
      'receipt fingerprint != live': { receipt: { runId: RUN_NEW, fingerprint: HEX_F } },
      // receipt run is OLDER than the journal's run (smaller timestamp)
      'receipt run older than journal run': { receipt: { runId: 'run_1600000000000_0001', fingerprint: liveFp } },
      // receipt run IS the journal's run — not a NEWER run
      'receipt run == journal run': { receipt: { runId: RUN_OLD, fingerprint: liveFp } },
      // receipt run is not durably 'published'
      'receipt run not published': { receipt: { runId: RUN_NEW, fingerprint: liveFp }, newStatus: 'publish_failed' },
      // receipt run missing from the durable db entirely
      'receipt run missing from db': { receipt: { runId: RUN_NEW, fingerprint: liveFp }, omitNewRun: true },
    };

    for (const [label, variant] of Object.entries(variants)) {
      resetWorld();
      const live = liveFingerprint();
      const db = stubDb({
        [RUN_OLD]: { status: 'published' },
        ...(variant.omitNewRun ? {} : { [RUN_NEW]: { status: variant.newStatus || 'published' } }),
      });
      if (variant.receipt) {
        ensureCurrentPublicationReceipt(siteDir, {
          runId: variant.receipt.runId,
          siteTag: SITE_TAG,
          fingerprint: variant.receipt.fingerprint,
        });
      }
      const oldJournal = writeJournal(RUN_OLD, validJournal(RUN_OLD));

      const r1 = recoverSitePublications({ siteDir, db, siteTag: SITE_TAG });

      expect(r1.superseded, label).toEqual([]);
      expect(r1.inconsistent, label).toEqual([RUN_OLD]);
      expect(db._runs.get(RUN_OLD).status, label).toBe('publication_inconsistent');
      expect(fs.existsSync(`${oldJournal}.inconsistent`), label).toBe(true);
      // The live artifact is preserved, byte-identical.
      expect(liveFingerprint(), label).toBe(live);
    }
  });

  it('unexplained inconsistency: durable status, retained evidence, preserved live artifact, observable, restart-convergent', () => {
    // Journal valid, run 'published', live no longer matches, and NOTHING
    // explains it (no receipt at all).
    const liveFp = liveFingerprint();
    const db = stubDb({ [RUN_OLD]: { status: 'published' } });
    const oldJournal = writeJournal(RUN_OLD, validJournal(RUN_OLD));
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (msg) => warnings.push(String(msg));
    let r1;
    try {
      r1 = recoverSitePublications({ siteDir, db, siteTag: SITE_TAG });
    } finally {
      console.warn = originalWarn;
    }

    // Recovery report + console surface.
    expect(r1.inconsistent).toEqual([RUN_OLD]);
    expect(r1.mismatches).toEqual([RUN_OLD]);
    expect(warnings.some((w) => w.includes('publication_inconsistent') && w.includes(RUN_OLD))).toBe(true);
    // Durable status — exactly what GET /api/site-studio/build-vnext/status
    // returns in its `status` field for this run.
    expect(db._runs.get(RUN_OLD).status).toBe('publication_inconsistent');
    // Evidence retained inside the site dir, never silently deleted.
    expect(fs.existsSync(oldJournal)).toBe(false);
    const retained = JSON.parse(fs.readFileSync(`${oldJournal}.inconsistent`, 'utf8'));
    expect(retained.run_id).toBe(RUN_OLD);
    expect(retained.expected_fingerprint).toBe(HEX_F);
    // The live artifact is NOT destroyed.
    expect(liveFingerprint()).toBe(liveFp);

    // Restart convergence: run recovery twice; the end state is identical.
    const after1 = snapshotSiteDir();
    const r2 = recoverSitePublications({ siteDir, db, siteTag: SITE_TAG });
    expect(r2).toEqual(EMPTY_RESULT);
    expect(snapshotSiteDir()).toEqual(after1);
    expect(db._runs.get(RUN_OLD).status).toBe('publication_inconsistent');
    expect(liveFingerprint()).toBe(liveFp);
  });

  it('a supersession that LATER becomes unexplained is still caught: receipt not matching live flips to inconsistency', () => {
    // Receipt says RUN_NEW owns fingerprint F, live is something else entirely:
    // the newer run does NOT own live, so the older mismatch is unexplained.
    const liveFp = liveFingerprint();
    ensureCurrentPublicationReceipt(siteDir, { runId: RUN_NEW, siteTag: SITE_TAG, fingerprint: HEX_F });
    const db = stubDb({
      [RUN_OLD]: { status: 'published' },
      [RUN_NEW]: { status: 'published' },
    });
    writeJournal(RUN_OLD, validJournal(RUN_OLD));

    const r1 = recoverSitePublications({ siteDir, db, siteTag: SITE_TAG });

    expect(r1.superseded).toEqual([]);
    expect(r1.inconsistent).toEqual([RUN_OLD]);
    expect(db._runs.get(RUN_OLD).status).toBe('publication_inconsistent');
    // The newer run is not touched — nothing proves it wrong either.
    expect(db._runs.get(RUN_NEW).status).toBe('published');
    expect(liveFingerprint()).toBe(liveFp);
  });

  // -------------------------------------------------------------------------
  // current-publication receipt mechanics
  // -------------------------------------------------------------------------

  it('persists the current-publication receipt atomically, idempotently, and fail-closed', () => {
    const liveFp = liveFingerprint();
    const receiptFile = currentPublicationReceiptPath(siteDir);

    const first = ensureCurrentPublicationReceipt(siteDir, { runId: RUN_OLD, siteTag: SITE_TAG, fingerprint: liveFp });
    expect(first.updated).toBe(true);
    const written = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
    expect(written).toMatchObject({
      publication_mode: 'external_atomic',
      run_id: RUN_OLD,
      site_tag: SITE_TAG,
      fingerprint: liveFp,
    });
    expect(typeof written.published_at).toBe('string');

    // Idempotent: same run + fingerprint is a byte-for-byte no-op.
    const bytes1 = fs.readFileSync(receiptFile, 'utf8');
    const second = ensureCurrentPublicationReceipt(siteDir, { runId: RUN_OLD, siteTag: SITE_TAG, fingerprint: liveFp });
    expect(second.updated).toBe(false);
    expect(fs.readFileSync(receiptFile, 'utf8')).toBe(bytes1);

    // Ownership moves: a newer run + fingerprint rewrites the receipt.
    const third = ensureCurrentPublicationReceipt(siteDir, { runId: RUN_NEW, siteTag: SITE_TAG, fingerprint: liveFp });
    expect(third.updated).toBe(true);
    expect(readCurrentPublicationReceipt(siteDir, SITE_TAG).run_id).toBe(RUN_NEW);

    // Fail-closed: malformed ownership claims are never persisted.
    const bytes3 = fs.readFileSync(receiptFile, 'utf8');
    expect(() => ensureCurrentPublicationReceipt(siteDir, { runId: 'garbage', siteTag: SITE_TAG, fingerprint: liveFp })).toThrow();
    expect(() => ensureCurrentPublicationReceipt(siteDir, { runId: RUN_OLD, siteTag: SITE_TAG, fingerprint: 'not-a-fingerprint' })).toThrow();
    expect(fs.readFileSync(receiptFile, 'utf8')).toBe(bytes3);

    // A corrupt receipt is quarantined and treated as absent.
    fs.writeFileSync(receiptFile, '{corrupt');
    expect(readCurrentPublicationReceipt(siteDir, SITE_TAG)).toBe(null);
    expect(fs.existsSync(receiptFile)).toBe(false);
    expect(fs.existsSync(`${receiptFile}.rejected`)).toBe(true);

    // A receipt naming ANOTHER site is foreign: quarantined, treated absent.
    ensureCurrentPublicationReceipt(siteDir, { runId: RUN_NEW, siteTag: SITE_TAG, fingerprint: liveFp });
    expect(readCurrentPublicationReceipt(siteDir, 'site-other')).toBe(null);
    expect(fs.existsSync(`${receiptFile}.rejected`)).toBe(true);
  });

  it('no receipt temp debris survives recovery sweeps', () => {
    // A crash between the receipt temp write and its rename leaves a
    // `.vnext-current-publication.json.<pid>.tmp` file; recovery sweeps it.
    const orphan = path.join(siteDir, '.vnext-current-publication.json.12345.tmp');
    fs.writeFileSync(orphan, '{"partial":');
    const db = stubDb({});
    const r1 = recoverSitePublications({ siteDir, db, siteTag: SITE_TAG });
    expect(r1.removed).toContain('.vnext-current-publication.json.12345.tmp');
    expect(fs.existsSync(orphan)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // receipt integration with the existing crash-window recovery branches
  // -------------------------------------------------------------------------

  it('window B: confirming a crashed publishing run by fingerprint also records ownership (idempotent)', () => {
    // Crash after tmp -> dist-vnext, before 'published': journal remains, run
    // is 'publishing', live IS the journaled artifact, backup still present.
    const liveFp = liveFingerprint();
    const db = stubDb({ [RUN_NEW]: { status: 'publishing' } });
    writeJournal(RUN_NEW, validJournal(RUN_NEW, { expected_fingerprint: liveFp }));
    const backupDir = path.join(siteDir, backupDirName(RUN_NEW));
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(path.join(backupDir, 'index.html'), 'PREVIOUS');

    const r1 = recoverSitePublications({ siteDir, db, siteTag: SITE_TAG });

    expect(r1.published).toEqual([RUN_NEW]);
    expect(db._runs.get(RUN_NEW).status).toBe('published');
    expect(fs.existsSync(backupDir)).toBe(false);
    expect(fs.existsSync(journalPath(RUN_NEW))).toBe(false);
    // Ownership receipt recorded for the confirmed run.
    const receipt = readCurrentPublicationReceipt(siteDir, SITE_TAG);
    expect(receipt.run_id).toBe(RUN_NEW);
    expect(receipt.fingerprint).toBe(liveFp);

    const after1 = snapshotSiteDir();
    const r2 = recoverSitePublications({ siteDir, db, siteTag: SITE_TAG });
    expect(r2).toEqual(EMPTY_RESULT);
    expect(snapshotSiteDir()).toEqual(after1);
  });

  it('published + live match (crash before journal cleanup): journal cleaned, receipt ensured', () => {
    const liveFp = liveFingerprint();
    const db = stubDb({ [RUN_NEW]: { status: 'published' } });
    writeJournal(RUN_NEW, validJournal(RUN_NEW, { expected_fingerprint: liveFp }));
    const tmpD = path.join(siteDir, stageDirName(RUN_NEW));
    fs.mkdirSync(tmpD, { recursive: true });

    const r1 = recoverSitePublications({ siteDir, db, siteTag: SITE_TAG });

    expect(r1.removed).toContain(`${path.basename(journalPath(RUN_NEW))}`);
    expect(fs.existsSync(journalPath(RUN_NEW))).toBe(false);
    expect(fs.existsSync(tmpD)).toBe(false);
    const receipt = readCurrentPublicationReceipt(siteDir, SITE_TAG);
    expect(receipt.run_id).toBe(RUN_NEW);
    expect(receipt.fingerprint).toBe(liveFp);
    expect(db._runs.get(RUN_NEW).status).toBe('published');
  });
});
