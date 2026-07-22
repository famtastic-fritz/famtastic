#!/usr/bin/env node
'use strict';
/**
 * Generate a parity / divergence report from old and vNext characterization cases.
 *
 * Example:
 *   node runtime-vnext/harness/generate-parity-report.js \
 *     runtime-vnext/harness/cases/old/single-page-build \
 *     runtime-vnext/harness/cases/vnext/single-page-build \
 *     > runtime-vnext/harness/reports/single-page-build-parity.md
 */

const fs = require('fs');
const path = require('path');

function loadCase(caseDir) {
  const casePath = path.join(caseDir, 'case.json');
  if (!fs.existsSync(casePath)) {
    throw new Error(`Case not found: ${casePath}`);
  }
  return JSON.parse(fs.readFileSync(casePath, 'utf8'));
}

function classifyOldRun(oldCase) {
  const postFiles = Object.keys(oldCase.post.distSnapshot || {}).length;
  const hadError = oldCase.actionResult && (oldCase.actionResult.error || oldCase.actionResult.buildError);
  if (postFiles === 0 || hadError) {
    return { healthy: false, reason: hadError || 'zero output files captured' };
  }
  return { healthy: true };
}

function diffSnapshots(oldSnap, newSnap) {
  const oldKeys = Object.keys(oldSnap || {});
  const newKeys = Object.keys(newSnap || {});
  const added = newKeys.filter((k) => !oldKeys.includes(k));
  const removed = oldKeys.filter((k) => !newKeys.includes(k));
  const changed = [];
  const matching = [];
  for (const k of oldKeys) {
    if (!newKeys.includes(k)) continue;
    if (oldSnap[k].sha256 === newSnap[k].sha256) {
      matching.push(k);
    } else {
      changed.push({ file: k, oldSize: oldSnap[k].size, newSize: newSnap[k].size });
    }
  }
  return { added, removed, changed, matching };
}

function compareEventTypes(oldEvents, newEvents) {
  const oldTypes = new Set((oldEvents || []).map((e) => e.type || e.event || e.kind).filter(Boolean));
  const newTypes = new Set((newEvents || []).map((e) => e.type).filter(Boolean));
  const onlyOld = [...oldTypes].filter((t) => !newTypes.has(t));
  const onlyNew = [...newTypes].filter((t) => !oldTypes.has(t));
  const shared = [...oldTypes].filter((t) => newTypes.has(t));
  return { oldTypes: [...oldTypes], newTypes: [...newTypes], onlyOld, onlyNew, shared };
}

function generateReport(oldCaseDir, newCaseDir) {
  const oldCase = loadCase(oldCaseDir);
  const newCase = loadCase(newCaseDir);

  const oldHealth = classifyOldRun(oldCase);
  const diff = diffSnapshots(oldCase.post.distSnapshot, newCase.post.distSnapshot);
  const eventComparison = compareEventTypes(oldCase.wsEvents, newCase.wsEvents);

  const oldFileCount = Object.keys(oldCase.post.distSnapshot || {}).length;
  const newFileCount = Object.keys(newCase.post.distSnapshot || {}).length;
  const parityScore = oldFileCount > 0 ? diff.matching.length / oldFileCount : 0;

  const lines = [];
  lines.push(`# Parity Report: ${oldCase.meta.name}`);
  lines.push('');
  lines.push(`- **Old runtime case:** \`${oldCaseDir}\``);
  lines.push(`- **vNext runtime case:** \`${newCaseDir}\``);
  lines.push(`- **Generated at:** ${new Date().toISOString()}`);
  lines.push('');

  lines.push('## Old Runtime Health');
  if (oldHealth.healthy) {
    lines.push('- Status: ✅ Healthy baseline captured');
  } else {
    lines.push('- Status: ⚠️ Baseline is not healthy');
    lines.push(`- Reason: ${oldHealth.reason}`);
    lines.push('- **Impact:** File-by-file parity cannot be measured against this baseline.');
  }
  lines.push('');

  lines.push('## Output File Comparison');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Old files after | ${oldFileCount} |`);
  lines.push(`| vNext files after | ${newFileCount} |`);
  lines.push(`| Matching files | ${diff.matching.length} |`);
  lines.push(`| Added files | ${diff.added.length} |`);
  lines.push(`| Removed files | ${diff.removed.length} |`);
  lines.push(`| Changed files | ${diff.changed.length} |`);
  lines.push(`| Parity score | ${(parityScore * 100).toFixed(1)}% |`);
  lines.push('');

  if (diff.added.length) {
    lines.push('### Added files (vNext only)');
    for (const f of diff.added) lines.push(`- \`${f}\``);
    lines.push('');
  }
  if (diff.removed.length) {
    lines.push('### Removed files (old only)');
    for (const f of diff.removed) lines.push(`- \`${f}\``);
    lines.push('');
  }
  if (diff.changed.length) {
    lines.push('### Changed files');
    for (const c of diff.changed) lines.push(`- \`${c.file}\` (old: ${c.oldSize}B, new: ${c.newSize}B)`);
    lines.push('');
  }

  lines.push('## Event / Trace Comparison');
  lines.push(`| Metric | Old | vNext |`);
  lines.push(`|--------|-----|-------|`);
  lines.push(`| WebSocket events | ${oldCase.wsEvents.length} | ${newCase.wsEvents.length} |`);
  lines.push(`| Trace records | ${oldCase.post.traces.length} | ${newCase.post.traces.length} |`);
  lines.push(`| Mutation records | ${oldCase.post.mutations.length} | ${newCase.post.mutations.length} |`);
  lines.push('');

  lines.push('### Event types');
  lines.push(`- Old only: ${eventComparison.onlyOld.length ? eventComparison.onlyOld.join(', ') : '(none)'}`);
  lines.push(`- vNext only: ${eventComparison.onlyNew.length ? eventComparison.onlyNew.join(', ') : '(none)'}`);
  lines.push(`- Shared: ${eventComparison.shared.length ? eventComparison.shared.join(', ') : '(none)'}`);
  lines.push('');

  lines.push('## Interpretation');
  if (!oldHealth.healthy) {
    lines.push('The old-runtime baseline did not produce output files. In this situation the parity score is expected to be 0% because there are no old files to match. The vNext deterministic slice produced output independently and should be evaluated on its own consumer-contract tests rather than file parity.');
  } else if (parityScore === 1.0) {
    lines.push('Full file parity achieved.');
  } else if (parityScore > 0) {
    lines.push('Partial parity. Divergence is expected while generative provider paths are not yet migrated to vNext.');
  } else {
    lines.push('No file parity. This is expected when the old and new paths use different execution families (generative vs deterministic).');
  }
  lines.push('');

  return lines.join('\n');
}

function main() {
  const [oldCaseDir, newCaseDir] = process.argv.slice(2);
  if (!oldCaseDir || !newCaseDir) {
    console.error('Usage: node generate-parity-report.js <old-case-dir> <vnext-case-dir>');
    process.exit(1);
  }
  console.log(generateReport(oldCaseDir, newCaseDir));
}

main();
