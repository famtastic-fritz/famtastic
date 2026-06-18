#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const PLANS_DIR = path.join(REPO, 'plans');

const REQUIRED_TOP_LEVEL = [
  'id',
  'title',
  'status',
  'classification',
  'owner',
  'purpose',
  'why_now',
  'success_signal',
  'non_goals',
  'execution_policy',
  'work_packet',
];

const REQUIRED_CLASSIFICATION = ['studio', 'plan_type', 'stream'];
const REQUIRED_EXECUTION_POLICY = [
  'run_to_completion_without_fritz',
  'intervention_threshold',
  'orchestration_mode',
  'swarm_expectation',
  'task_ledger_expectation',
];
const REQUIRED_GOAL = ['outcome', 'why_it_matters', 'success_criteria', 'proof'];
const REQUIRED_WORK_PACKET = ['goal', 'tasks', 'branch', 'worktree', 'main_landing_path', 'truth_surfaces', 'proof'];

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function planFiles() {
  const out = [];
  for (const entry of fs.readdirSync(PLANS_DIR)) {
    const candidate = path.join(PLANS_DIR, entry, 'plan.json');
    if (fs.existsSync(candidate)) out.push(candidate);
  }
  return out.sort();
}

function validatePlan(plan, file) {
  const issues = [];
  for (const key of REQUIRED_TOP_LEVEL) {
    if (!(key in plan)) issues.push(`missing top-level field: ${key}`);
  }

  for (const key of REQUIRED_CLASSIFICATION) {
    if (!plan.classification || !plan.classification[key]) issues.push(`missing classification.${key}`);
  }

  for (const key of REQUIRED_EXECUTION_POLICY) {
    if (!plan.execution_policy || !(key in plan.execution_policy)) {
      issues.push(`missing execution_policy.${key}`);
    }
  }

  for (const key of REQUIRED_WORK_PACKET) {
    if (!plan.work_packet || !(key in plan.work_packet)) issues.push(`missing work_packet.${key}`);
  }

  if (plan.work_packet?.goal) {
    for (const key of REQUIRED_GOAL) {
      if (!(key in plan.work_packet.goal)) issues.push(`missing work_packet.goal.${key}`);
    }
  }

  for (const key of ['tasks', 'truth_surfaces', 'proof']) {
    if (plan.work_packet && !Array.isArray(plan.work_packet[key])) {
      issues.push(`work_packet.${key} must be an array`);
    }
  }

  if (plan.work_packet?.goal) {
    for (const key of ['success_criteria', 'proof']) {
      if (!Array.isArray(plan.work_packet.goal[key])) {
        issues.push(`work_packet.goal.${key} must be an array`);
      }
    }
  }

  if (!Array.isArray(plan.non_goals)) issues.push('non_goals must be an array');
  if (plan.workstreams && !Array.isArray(plan.workstreams)) issues.push('workstreams must be an array when present');

  return {
    file,
    id: plan.id || path.basename(path.dirname(file)),
    ok: issues.length === 0,
    issues,
  };
}

function printHelp() {
  console.log('Usage: node scripts/plans/validate-template.js [--all | --plan <plan-id>] [--json]');
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return 0;
  }

  const json = args.includes('--json');
  const planIndex = args.indexOf('--plan');
  let files = planFiles();

  if (planIndex !== -1) {
    const planId = args[planIndex + 1];
    if (!planId) {
      console.error('Missing plan ID after --plan');
      return 1;
    }
    files = files.filter((file) => path.basename(path.dirname(file)) === planId);
    if (files.length === 0) {
      console.error(`Plan not found: ${planId}`);
      return 1;
    }
  }

  const results = files.map((file) => validatePlan(readJSON(file), file));
  const failed = results.filter((r) => !r.ok);

  if (json) {
    console.log(JSON.stringify({ ok: failed.length === 0, results }, null, 2));
  } else {
    if (failed.length === 0) {
      console.log(`Plan template check passed: ${results.length} plan file(s) match the required work-packet shape.`);
    } else {
      console.log(`Plan template check failed: ${failed.length} of ${results.length} plan file(s) missing required fields.`);
      for (const result of failed) {
        console.log(`\n- ${result.id} (${result.file})`);
        for (const issue of result.issues) console.log(`  - ${issue}`);
      }
    }
  }

  return failed.length === 0 ? 0 : 2;
}

process.exit(main());
