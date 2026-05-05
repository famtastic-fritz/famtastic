#!/usr/bin/env node
/**
 * agent-checkin.js — pre-flight coordination gate for agent surfaces.
 *
 * Usage:
 *   node scripts/agent-checkin.js --intent "<short>" [--surface claude-code|cowork|codex] [--dry-run]
 *
 * Exits:
 *   0 — no conflicts; intent appended to AGENT-COORDINATION.md (unless --dry-run)
 *   2 — overlap detected with one or more in-flight branches
 *   1 — usage / runtime error
 *
 * Always writes a `memory/usage.jsonl` event so check-ins are auditable.
 *
 * Safety: all subprocesses use execFileSync with explicit arg arrays — no shell
 * interpolation. The --intent string is never passed to a subprocess; it is
 * only used for in-process keyword matching.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const COORD_FILE = path.join(REPO_ROOT, 'AGENT-COORDINATION.md');
const USAGE_LOG = path.join(REPO_ROOT, 'memory', 'usage.jsonl');

function parseArgs(argv) {
  const args = { intent: null, surface: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--intent') args.intent = argv[++i];
    else if (a === '--surface') args.surface = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: agent-checkin.js --intent "<short>" [--surface <name>] [--dry-run]');
      process.exit(0);
    }
  }
  return args;
}

function detectSurface() {
  if (process.env.AGENT_SURFACE) return process.env.AGENT_SURFACE;
  if (process.env.CLAUDE_CODE) return 'claude-code';
  if (process.env.COWORK) return 'cowork';
  if (process.env.CODEX) return 'codex';
  return 'unknown';
}

function git(args) {
  try {
    return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim();
  } catch (err) {
    return '';
  }
}

function listRemoteBranches() {
  const raw = git(['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin']);
  return raw.split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .filter(b => b !== 'origin/main' && !b.startsWith('origin/HEAD'));
}

function changedFiles(branch) {
  const out = git(['diff', '--name-only', `origin/main..${branch}`]);
  return out ? out.split('\n').filter(Boolean) : [];
}

function loadScopeLocks() {
  if (!fs.existsSync(COORD_FILE)) return [];
  const md = fs.readFileSync(COORD_FILE, 'utf8');
  const tableStart = md.indexOf('| Branch |');
  if (tableStart === -1) return [];
  const lines = md.slice(tableStart).split('\n');
  const rows = [];
  for (const line of lines) {
    if (!line.startsWith('|')) break;
    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length < 5) continue;
    if (cells[0] === 'Branch' || cells[0].startsWith('---')) continue;
    rows.push({
      branch: cells[0].replace(/`/g, ''),
      surface: cells[1],
      intent: cells[2],
      scope_locks: cells[3].split(',').map(s => s.replace(/`/g, '').trim()).filter(Boolean),
      started: cells[4],
    });
  }
  return rows;
}

function intentKeywords(intent) {
  return (intent || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3);
}

function pathOverlaps(globs, files) {
  const matched = [];
  for (const g of globs) {
    const prefix = g.replace(/\*\*?/g, '').replace(/\/$/, '');
    if (!prefix || prefix === '(none declared)') continue;
    for (const f of files) {
      if (f.includes(prefix)) { matched.push(f); break; }
    }
  }
  return matched;
}

function detectOverlap(myIntent, mySurface, currentBranch) {
  const remotes = listRemoteBranches();
  const locks = loadScopeLocks();
  const kw = intentKeywords(myIntent);
  const conflicts = [];

  for (const remote of remotes) {
    const shortName = remote.replace(/^origin\//, '');
    if (currentBranch && shortName === currentBranch) continue;

    const files = changedFiles(remote);
    const lockEntry = locks.find(l => l.branch === shortName);

    const reasons = [];

    const branchWords = shortName.toLowerCase().split(/[^a-z0-9]+/);
    const kwHits = kw.filter(w => branchWords.includes(w));
    if (kwHits.length) reasons.push(`intent keywords match branch name: ${kwHits.join(', ')}`);

    if (lockEntry && lockEntry.scope_locks.length) {
      const hits = pathOverlaps(lockEntry.scope_locks, files);
      if (hits.length) reasons.push(`scope-lock paths in play: ${hits.slice(0,3).join(', ')}`);
    }

    const fileKwHits = kw.filter(w => files.some(f => f.toLowerCase().includes(w)));
    if (fileKwHits.length) reasons.push(`intent keywords in changed files: ${fileKwHits.join(', ')}`);

    if (reasons.length) {
      conflicts.push({
        branch: shortName,
        surface: lockEntry ? lockEntry.surface : 'unknown',
        intent: lockEntry ? lockEntry.intent : '(no scope-lock entry)',
        files_changed: files.length,
        reasons,
      });
    }
  }

  return conflicts;
}

function appendCoordinationRow(branch, surface, intent) {
  const today = new Date().toISOString().slice(0, 10);
  const safeIntent = intent.replace(/\|/g, '\\|');
  const row = `| \`${branch}\` | ${surface} | ${safeIntent} | (none declared) | ${today} |`;
  let md = fs.readFileSync(COORD_FILE, 'utf8');
  const tableHeader = '| Branch | Owner Surface | Intent | Scope Locks | Started |';
  const idx = md.indexOf(tableHeader);
  if (idx === -1) {
    fs.appendFileSync(COORD_FILE, `\n${row}\n`);
    return;
  }
  const after = md.slice(idx);
  const lines = after.split('\n');
  let lastTableIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('|')) lastTableIdx = i;
    else if (i > 1) break;
  }
  lines.splice(lastTableIdx + 1, 0, row);
  fs.writeFileSync(COORD_FILE, md.slice(0, idx) + lines.join('\n'));
}

function logUsage(event) {
  fs.mkdirSync(path.dirname(USAGE_LOG), { recursive: true });
  fs.appendFileSync(USAGE_LOG, JSON.stringify(event) + '\n');
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.intent) {
    console.error('error: --intent is required');
    process.exit(1);
  }
  const surface = args.surface || detectSurface();
  const currentBranch = git(['rev-parse', '--abbrev-ref', 'HEAD']);

  console.log(`agent-checkin: surface=${surface} branch=${currentBranch}`);
  console.log(`intent: ${args.intent}`);
  console.log('Fetching remote branches...');
  git(['fetch', '--all', '--quiet']);

  const conflicts = detectOverlap(args.intent, surface, currentBranch);

  const ts = new Date().toISOString();
  const usageEvent = {
    ts,
    event: 'agent_checkin',
    intent: args.intent,
    surface,
    branch: currentBranch,
    dry_run: args.dryRun,
    conflicts: conflicts.map(c => ({ branch: c.branch, surface: c.surface, reasons: c.reasons })),
  };
  logUsage(usageEvent);

  if (conflicts.length) {
    console.log('\nOVERLAP DETECTED with the following in-flight branches:\n');
    console.log('Branch                                              Surface       Files  Reasons');
    console.log('-' .repeat(100));
    for (const c of conflicts) {
      console.log(
        `${c.branch.padEnd(52)}${c.surface.padEnd(14)}${String(c.files_changed).padStart(5)}  ${c.reasons.join('; ')}`
      );
    }
    console.log('\nCoordinate with the listed branches before continuing.');
    console.log('See AGENT-COORDINATION.md → "Conflict resolution" for the protocol.');
    process.exit(2);
  }

  console.log('\nNo conflicts detected.');
  if (args.dryRun) {
    console.log('(dry-run) would append row to AGENT-COORDINATION.md');
  } else {
    appendCoordinationRow(currentBranch, surface, args.intent);
    console.log(`Added row to AGENT-COORDINATION.md for branch ${currentBranch}.`);
  }
  process.exit(0);
}

main();
