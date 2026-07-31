#!/usr/bin/env node
'use strict';
/**
 * Regenerate runtime-vnext/reports/tag-call-sites.json after server.js changes.
 *
 * Ported from feature/site-studio-runtime-vnext-closeout and adapted to main:
 * when no previous report exists (first run on this branch), the script
 * BOOTSTRAPS classifications with deterministic rules instead of carrying them
 * forward, because there is no hand-classified predecessor on main:
 *
 *   - comment lines and substring-only matches (SITE_TAG, GENERIC_TAG_BLOCKLIST,
 *     …)                                     -> 'unrelated'
 *   - `TAG = ...` writes (not ===/==)        -> 'assignment'
 *   - path.join(... TAG ...)                  -> 'authority-read'
 *   - console.log/warn/error mentioning TAG   -> 'ui-preference'
 *   - every other word-boundary TAG           -> 'authority-read' (conservative)
 *
 * Bootstrap notes are per-classification generics; they are the resumable
 * worklist and should be refined by hand as call sites are migrated.
 *
 * After the first report exists, classification is CARRIED FORWARD, never
 * invented: each occurrence is matched to a previous entry with the identical
 * source line (in order, so repeated lines keep their individual notes).
 * Occurrences with no prior entry must be declared in NEW_SITES below — the
 * script refuses to guess.
 *
 * Usage: node scripts/runtime-vnext/regen-tag-inventory.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SERVER = path.join(ROOT, 'server.js');
const REPORT = path.join(ROOT, 'runtime-vnext', 'reports', 'tag-call-sites.json');

/**
 * Source lines introduced by a migration, keyed by the trimmed source text.
 * { classification, site_tag_source }
 */
const NEW_SITES = {
};

const BOOTSTRAP_NOTES = {
  'authority-read':
    'TAG decides which site is operated on here. Migration: thread an explicit siteTag ' +
    '(req.ctx.siteTag / run record) to this call site and delete the ambient read.',
  'ui-preference':
    'TAG only reaches the operator as display text. May keep reading the operator\'s ' +
    'selected site after migration; no server authority change required.',
  'assignment':
    'A write to the global TAG binding. Migration: return the new siteTag to the caller ' +
    'instead of mutating the shared global.',
  'unrelated':
    'Substring-only or prose match (not a standalone TAG authority read); no migration needed.',
};

function occurrences(lines) {
  const out = [];
  lines.forEach((text, i) => {
    [...text.matchAll(/TAG/g)].forEach((m, k) => {
      out.push({ line: i + 1, occurrence: k + 1, column: m.index + 1, source: text.trim() });
    });
  });
  return out;
}

/** Is the TAG at `index` part of a larger identifier (e.g. SITE_TAG)? */
function isSubstringOnly(text, index) {
  const before = text[index - 1];
  const after = text[index + 3];
  return /[A-Za-z0-9_]/.test(before || '') || /[A-Za-z0-9_]/.test(after || '');
}

function bootstrapClassify(o, rawLine) {
  const trimmed = o.source;
  if (isSubstringOnly(rawLine, o.column - 1)) return 'unrelated';
  if (/^\s*(\/\/|\*|\/\*)/.test(rawLine)) return 'unrelated';
  if (/\bTAG\s*=(?!=)/.test(rawLine)) return 'assignment';
  if (/path\.join\([^)]*\bTAG\b/.test(trimmed)) return 'authority-read';
  if (/console\.(log|warn|error)\b/.test(trimmed)) return 'ui-preference';
  return 'authority-read';
}

function main() {
  const lines = fs.readFileSync(SERVER, 'utf8').split('\n');
  const actual = occurrences(lines);
  const bootstrapping = !fs.existsSync(REPORT);
  const prev = bootstrapping
    ? { call_sites: [], hardest_to_migrate: [] }
    : JSON.parse(fs.readFileSync(REPORT, 'utf8'));

  // Prior entries grouped by (source text, occurrence index within the line).
  const queues = new Map();
  for (const site of prev.call_sites) {
    const k = `${site.occurrence} ${site.source}`;
    if (!queues.has(k)) queues.set(k, []);
    queues.get(k).push(site);
  }

  const missing = [];
  const call_sites = actual.map((o) => {
    const rawLine = lines[o.line - 1];
    const k = `${o.occurrence} ${o.source}`;
    const carried = queues.get(k) && queues.get(k).shift();
    let decl = carried || NEW_SITES[o.source];
    if (!decl && bootstrapping) {
      const classification = bootstrapClassify(o, rawLine);
      decl = { classification, site_tag_source: BOOTSTRAP_NOTES[classification] };
    }
    if (!decl) { missing.push(`${o.line}: ${o.source}`); return null; }
    return {
      line: o.line,
      occurrence: o.occurrence,
      column: o.column,
      source: o.source,
      classification: decl.classification,
      site_tag_source: decl.site_tag_source,
    };
  });

  if (missing.length) {
    console.error('Unclassified new TAG occurrences — add them to NEW_SITES:\n  ' + missing.join('\n  '));
    process.exit(1);
  }

  const totals = { occurrences: call_sites.length };
  totals.word_boundary_TAG = (lines.join('\n').match(/\bTAG\b/g) || []).length;
  for (const c of ['authority-read', 'ui-preference', 'assignment', 'unrelated']) {
    totals[c] = call_sites.filter((s) => s.classification === c).length;
  }

  const report = {
    generated_at: new Date().toISOString(),
    task: 'runtime-vnext Phase 1, Task 1.1 — TAG authority inventory',
    file: 'server.js',
    file_lines: lines.length,
    method: "Every occurrence of the literal substring 'TAG' in server.js, classified. Substring-only matches (SITE_TAG, GENERIC_TAG_BLOCKLIST) and prose/comment matches are retained and marked 'unrelated' so the enumeration is provably exhaustive against a plain `grep -o TAG`.",
    classification_rules: {
      'authority-read': "TAG decides which site is operated on: filesystem joins, spawned-process argv, DB/JSONL record attribution, API response payload fields naming the subject site, cache keys, connection binding, and behaviour branches. These are the sites that must take an explicit siteTag.",
      'ui-preference': "TAG only reaches an operator: console.log/warn text, chat/prompt display-name fallbacks, `is_current` list markers, the last-site preference file, and site-switched notifications. May keep reading the operator's selected site after migration.",
      assignment: 'A write to the global TAG binding.',
      unrelated: 'Comments/JSDoc, a different identifier containing the substring TAG, or a property key literally named TAG.',
    },
    totals,
    hardest_to_migrate: prev.hardest_to_migrate || [],
    call_sites,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`[tag-inventory] ${call_sites.length} occurrences, ${totals['authority-read']} authority reads remain${bootstrapping ? ' (bootstrap classification)' : ''}`);
}

main();
