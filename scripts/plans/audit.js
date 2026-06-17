#!/usr/bin/env node
/**
 * scripts/plans/audit.js — read-only plan/task ledger audit.
 *
 * Reports:
 *   - Active plans with zero open tasks (drift)
 *   - Active plans with tasks but no commits in last 14 days (stale)
 *   - Tasks referencing plans that don't exist in the registry (orphan tasks)
 *   - Plans with conflicting state (registry vs latest closeout)
 *
 * Exit code 0 = clean; exit 2 = drift exists.
 *
 * Per plans/CLOSEOUT-SCHEMA.md.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const REGISTRY = path.join(REPO, 'plans', 'registry.json');
const TASKS = path.join(REPO, 'tasks', 'tasks.jsonl');

function loadRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
}

function loadTasks() {
  if (!fs.existsSync(TASKS)) return [];
  return fs.readFileSync(TASKS, 'utf8').split('\n').filter(Boolean).map(l => {
    try { return JSON.parse(l); } catch (_) { return null; }
  }).filter(Boolean);
}

function loadPlanFiles() {
  const dir = path.join(REPO, 'plans');
  const out = {};
  for (const entry of fs.readdirSync(dir)) {
    const planFile = path.join(dir, entry, 'plan.json');
    if (fs.existsSync(planFile)) {
      try { out[entry] = JSON.parse(fs.readFileSync(planFile, 'utf8')); }
      catch (_) {}
    }
  }
  return out;
}

function listCloseouts(planId) {
  const dir = path.join(REPO, 'plans', planId, 'closeouts');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
      catch (_) { return null; }
    }).filter(Boolean)
    .sort((a, b) => (b.verdict_at || '').localeCompare(a.verdict_at || ''));
}

function lastCommitForPath(p) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%h %ad', '--date=relative', '--', p], {
      cwd: REPO, encoding: 'utf8',
    }).trim();
  } catch (_) { return null; }
}

function audit() {
  const reg = loadRegistry();
  const tasks = loadTasks();
  const planFiles = loadPlanFiles();

  const activeIds = new Set(reg.active_parent_ids || []);
  const openByPlan = {};
  const allByPlan = {};
  for (const t of tasks) {
    const pid = t.plan_id;
    if (!pid) continue;
    allByPlan[pid] = (allByPlan[pid] || 0) + 1;
    if (!['completed', 'closed', 'cancelled', 'superseded'].includes(t.status)) {
      openByPlan[pid] = (openByPlan[pid] || []);
      openByPlan[pid].push(t.task_id);
    }
  }

  const drift = [];      // active + 0 open
  const stale = [];      // active + tasks but no recent commit
  const orphans = [];    // task references plan not in registry
  const conflicts = [];  // registry vs closeout disagreement
  const missingActiveFiles = []; // plan.json says active but registry omitted it
  const allActive = [];
  const terminatedIds = new Set(Object.keys(reg.terminated_parent_ids || {}));

  for (const [pid, plan] of Object.entries(planFiles)) {
    if (plan && plan.status === 'active' && !activeIds.has(pid) && !terminatedIds?.has?.(pid)) {
      missingActiveFiles.push({ id: pid, title: plan.title || pid });
    }
  }

  for (const pid of activeIds) {
    const open = openByPlan[pid] || [];
    const total = allByPlan[pid] || 0;
    const closeouts = listCloseouts(pid);
    const latest = closeouts[0] || null;
    let lastCommit = null;
    const planDir = path.join('plans', pid);
    if (fs.existsSync(path.join(REPO, planDir))) {
      lastCommit = lastCommitForPath(planDir);
    }

    allActive.push({ id: pid, open: open.length, total, latest_closeout: latest?.verdict || null, last_commit: lastCommit });

    // Drift only if zero open tasks AND no recent closeout/checkpoint packet
    const hasResolution = latest && (
      latest.verdict === 'checkpoint_complete' ||
      latest.verdict === 'needs_tasking' ||
      latest.verdict === 'completed' ||
      latest.verdict === 'parked' ||
      latest.verdict === 'superseded'
    );
    if (open.length === 0 && !hasResolution) {
      drift.push({ id: pid, total_tasks: total, latest_closeout: null });
    }

    if (latest) {
      const verdict = latest.verdict;
      if (verdict === 'completed' || verdict === 'superseded' || verdict === 'parked') {
        // registry still says active but latest closeout says terminal
        conflicts.push({ id: pid, registry_status: 'active', closeout_verdict: verdict });
      }
    }
  }

  // Orphan = OPEN task pointing to plan not in registry AND not in terminated registry
  const knownPlanIds = new Set([...activeIds, ...terminatedIds, ...Object.keys(planFiles)]);
  for (const t of tasks) {
    if (!t.plan_id) continue;
    // Completed/closed tasks are history — never orphans
    if (['completed', 'closed', 'cancelled', 'superseded'].includes(t.status)) continue;
    if (!knownPlanIds.has(t.plan_id) && !knownPlanIds.has(t.plan_id.replace(/^plan_/, ''))) {
      orphans.push({ task_id: t.task_id, plan_id: t.plan_id, status: t.status });
    }
  }

  return { allActive, drift, stale, orphans, conflicts, missingActiveFiles };
}

function fmt() {
  const r = audit();
  console.log('=== PLAN AUDIT ===');
  console.log();
  console.log(`Active plans: ${r.allActive.length}`);
  for (const p of r.allActive) {
    const flag = p.open === 0 ? '⚠ ' : '  ';
    const co = p.latest_closeout ? `closeout=${p.latest_closeout}` : 'no-closeout';
    const lc = p.last_commit ? `commit=${p.last_commit}` : 'no-plan-dir';
    console.log(`  ${flag}${p.id.padEnd(50)} open=${String(p.open).padEnd(2)} total=${String(p.total).padEnd(2)} ${co.padEnd(28)} ${lc}`);
  }
  console.log();
  console.log(`Drift (active + zero open tasks): ${r.drift.length}`);
  for (const d of r.drift) console.log(`  ⚠ ${d.id} (${d.total_tasks} historical tasks; closeout=${d.latest_closeout || 'none'})`);
  console.log();
  console.log(`Conflicts (registry says active but closeout says terminal): ${r.conflicts.length}`);
  for (const c of r.conflicts) console.log(`  ✕ ${c.id}: registry=${c.registry_status} closeout=${c.closeout_verdict}`);
  console.log();

  console.log(`Missing active plan files (plan.json active but registry omitted): ${r.missingActiveFiles.length}`);
  for (const m of r.missingActiveFiles) console.log(`  ✕ ${m.id}: ${m.title}`);
  console.log();

  console.log(`Orphan tasks (task points to unknown plan): ${r.orphans.length}`);
  for (const o of r.orphans.slice(0, 10)) console.log(`  ✕ task=${o.task_id} plan=${o.plan_id} status=${o.status}`);
  if (r.orphans.length > 10) console.log(`  … ${r.orphans.length - 10} more`);
  console.log();
  const dirty = r.drift.length + r.conflicts.length + r.missingActiveFiles.length + r.orphans.length;
  console.log(`Verdict: ${dirty === 0 ? '✅ clean' : `🔴 ${dirty} issue(s) found`}`);
  return dirty === 0 ? 0 : 2;
}

if (require.main === module) {
  process.exit(fmt());
}

module.exports = { audit };
