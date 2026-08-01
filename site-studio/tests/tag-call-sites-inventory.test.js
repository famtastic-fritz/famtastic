/**
 * Phase 1, Task 1.1 — TAG authority inventory.
 *
 * Guards runtime-vnext/reports/tag-call-sites.json against drift while the
 * TAG -> explicit siteTag migration is in flight. The inventory is only useful
 * if it is exhaustive: every occurrence of the literal substring "TAG" in
 * server.js must appear in the report, with a classification and a note about
 * where an explicit siteTag would come from.
 *
 * When the migration removes call sites, this test fails until the report is
 * regenerated — which is the intent. The report is the resumable worklist.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_PATH = join(ROOT, 'runtime-vnext', 'reports', 'tag-call-sites.json');

const report = JSON.parse(readFileSync(REPORT_PATH, 'utf8'));
const serverLines = readFileSync(join(ROOT, 'server.js'), 'utf8').split('\n');

const VALID = ['authority-read', 'ui-preference', 'assignment', 'unrelated'];

/** Every (line, occurrence) pair of the substring TAG in server.js. */
function actualOccurrences() {
  const out = [];
  serverLines.forEach((text, i) => {
    [...text.matchAll(/TAG/g)].forEach((m, k) => {
      out.push({ line: i + 1, occurrence: k + 1, column: m.index + 1, source: text.trim() });
    });
  });
  return out;
}

const key = (o) => `${o.line}#${o.occurrence}`;

describe('tag-call-sites.json — shape', () => {
  it('targets server.js and declares all four classifications', () => {
    expect(report.file).toBe('server.js');
    expect(Object.keys(report.classification_rules).sort()).toEqual([...VALID].sort());
  });

  it('gives every call site a line, source, classification and siteTag note', () => {
    expect(report.call_sites.length).toBeGreaterThan(0);
    for (const site of report.call_sites) {
      expect(Number.isInteger(site.line), `line for ${key(site)}`).toBe(true);
      expect(site.line).toBeGreaterThan(0);
      expect(typeof site.source).toBe('string');
      expect(site.source.length, `source for ${key(site)}`).toBeGreaterThan(0);
      expect(VALID, `classification for ${key(site)}`).toContain(site.classification);
      expect(typeof site.site_tag_source).toBe('string');
      expect(site.site_tag_source.length, `note for ${key(site)}`).toBeGreaterThan(10);
    }
  });

  it('classifies each occurrence exactly once', () => {
    const keys = report.call_sites.map(key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('reports totals that match the entries', () => {
    const counted = {};
    for (const c of VALID) counted[c] = report.call_sites.filter((s) => s.classification === c).length;
    expect(report.totals.occurrences).toBe(report.call_sites.length);
    for (const c of VALID) expect(report.totals[c], c).toBe(counted[c]);
  });
});

describe('tag-call-sites.json — exhaustive against server.js', () => {
  const actual = actualOccurrences();

  it('covers every TAG occurrence in server.js and invents none', () => {
    const inReport = new Set(report.call_sites.map(key));
    const inSource = new Set(actual.map(key));

    const uncovered = actual.filter((o) => !inReport.has(key(o)))
      .map((o) => `${key(o)}: ${o.source.slice(0, 100)}`);
    const phantom = report.call_sites.filter((s) => !inSource.has(key(s)))
      .map((s) => `${key(s)}: ${s.source.slice(0, 100)}`);

    expect(uncovered, 'occurrences missing from the report').toEqual([]);
    expect(phantom, 'report entries with no matching occurrence').toEqual([]);
  });

  it('records the source line and column verbatim', () => {
    const byKey = new Map(actual.map((o) => [key(o), o]));
    for (const site of report.call_sites) {
      const real = byKey.get(key(site));
      expect(real, `no occurrence for ${key(site)}`).toBeDefined();
      expect(site.source, `source drift at line ${site.line}`).toBe(real.source);
      expect(site.column, `column drift at line ${site.line}`).toBe(real.column);
    }
  });

  it('agrees with a word-boundary grep on the live-reference count', () => {
    const wordTag = (serverLines.join('\n').match(/\bTAG\b/g) || []).length;
    expect(report.totals.word_boundary_TAG).toBe(wordTag);
    // Substring-only matches (SITE_TAG, GENERIC_TAG_BLOCKLIST) are all classified unrelated.
    expect(report.totals.occurrences - wordTag).toBeGreaterThanOrEqual(0);
  });
});

describe('tag-call-sites.json — migration content', () => {
  it('flags every write to the global TAG as an assignment', () => {
    const assignments = new Set(
      report.call_sites.filter((s) => s.classification === 'assignment').map((s) => s.line),
    );
    // A write is `TAG = ...` (not `===`/`==`) anywhere on the line.
    serverLines.forEach((text, i) => {
      if (/\bTAG\s*=(?!=)/.test(text)) {
        expect(assignments.has(i + 1), `line ${i + 1} writes TAG but is not classified 'assignment': ${text.trim()}`).toBe(true);
      }
    });
  });

  it('classifies filesystem joins on TAG as authority reads', () => {
    for (const site of report.call_sites) {
      if (/path\.join\([^)]*\bTAG\b/.test(site.source)) {
        expect(site.classification, `line ${site.line}`).toBe('authority-read');
      }
    }
  });

  it('lists the hardest call sites with reasons', () => {
    expect(Array.isArray(report.hardest_to_migrate)).toBe(true);
    expect(report.hardest_to_migrate.length).toBeGreaterThanOrEqual(3);
    for (const h of report.hardest_to_migrate) {
      expect(Boolean(h.line) || Array.isArray(h.lines), 'entry names a line or lines').toBe(true);
      expect(typeof h.reason).toBe('string');
      expect(h.reason.length).toBeGreaterThan(40);
    }
  });

  it('does not claim the migration is complete while authority reads remain', () => {
    if (report.totals['authority-read'] > 0) {
      expect(report.totals.word_boundary_TAG).toBeGreaterThan(0);
    }
  });
});
