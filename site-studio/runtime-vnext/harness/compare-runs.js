#!/usr/bin/env node
'use strict';
/**
 * Compare two characterization cases.
 *
 * Example:
 *   node runtime-vnext/harness/compare-runs.js \
 *     runtime-vnext/harness/cases/single-page-build \
 *     runtime-vnext/harness/cases/single-page-build-vnext
 */

const fs = require('fs');
const path = require('path');

function loadCase(caseDir) {
  const casePath = path.join(caseDir, 'case.json');
  return JSON.parse(fs.readFileSync(casePath, 'utf8'));
}

function diffSpecs(beforeSpec, afterSpec) {
  const keys = new Set([...Object.keys(beforeSpec || {}), ...Object.keys(afterSpec || {})]);
  const diff = [];
  for (const key of keys) {
    const before = JSON.stringify((beforeSpec || {})[key]);
    const after = JSON.stringify((afterSpec || {})[key]);
    if (before !== after) {
      diff.push({ key, before: (beforeSpec || {})[key], after: (afterSpec || {})[key] });
    }
  }
  return diff;
}

function diffSnapshots(beforeSnap, afterSnap) {
  const beforeKeys = new Set(Object.keys(beforeSnap));
  const afterKeys = new Set(Object.keys(afterSnap));
  const added = [...afterKeys].filter(k => !beforeKeys.has(k));
  const removed = [...beforeKeys].filter(k => !afterKeys.has(k));
  const changed = [];
  for (const k of beforeKeys) {
    if (afterKeys.has(k) && beforeSnap[k].sha256 !== afterSnap[k].sha256) {
      changed.push({ file: k, before: beforeSnap[k], after: afterSnap[k] });
    }
  }
  return { added, removed, changed };
}

function compareCases(oldCaseDir, newCaseDir) {
  const oldCase = loadCase(oldCaseDir);
  const newCase = loadCase(newCaseDir);

  const report = {
    old: { name: oldCase.meta.name, dir: oldCaseDir },
    new: { name: newCase.meta.name, dir: newCaseDir },
    specDiff: diffSpecs(oldCase.pre.spec, newCase.pre.spec),
    distDiff: diffSnapshots(oldCase.post.distSnapshot, newCase.post.distSnapshot),
    eventCounts: {
      old: oldCase.wsEvents.length,
      new: newCase.wsEvents.length,
    },
    traceCounts: {
      old: oldCase.post.traces.length,
      new: newCase.post.traces.length,
    },
  };

  // Simple parity heuristic: same number of dist files and same sha256 for matching files
  const oldFiles = Object.keys(oldCase.post.distSnapshot);
  const newFiles = Object.keys(newCase.post.distSnapshot);
  const matchingFiles = oldFiles.filter(f => newFiles.includes(f) && oldCase.post.distSnapshot[f].sha256 === newCase.post.distSnapshot[f].sha256);
  const parity = {
    totalOldFiles: oldFiles.length,
    totalNewFiles: newFiles.length,
    matchingFiles: matchingFiles.length,
    addedFiles: newFiles.filter(f => !oldFiles.includes(f)).length,
    removedFiles: oldFiles.filter(f => !newFiles.includes(f)).length,
    changedFiles: oldFiles.filter(f => newFiles.includes(f) && !matchingFiles.includes(f)).length,
  };
  report.parity = parity;
  report.parityScore = parity.totalOldFiles > 0 ? matchingFiles.length / parity.totalOldFiles : 0;

  return report;
}

function main() {
  const [oldCaseDir, newCaseDir] = process.argv.slice(2);
  if (!oldCaseDir || !newCaseDir) {
    console.error('Usage: node compare-runs.js <old-case-dir> <new-case-dir>');
    process.exit(1);
  }
  const report = compareCases(oldCaseDir, newCaseDir);
  console.log(JSON.stringify(report, null, 2));
}

main();
