#!/usr/bin/env node
/**
 * build-command-center.js — FAMtastic Command Center / Mission Control generator.
 *
 * Reads the real ledgers in this repo (plans, tasks, runs, proofs, agents,
 * capabilities, sites, closeouts) and produces three artifacts under
 * command-center/:
 *
 *   - index.html   — a self-contained, mobile-first dashboard (Chart.js via CDN)
 *   - briefing.md  — the "Virtual Fritz" daily briefing: what needs you, the
 *                    most profitable next move, the most autonomous win
 *   - state.json   — the full computed snapshot (machine-readable)
 *
 * No external npm dependencies. Run from the repo root:
 *
 *   node scripts/command-center/build-command-center.js
 *
 * Scoring is intentionally heuristic and tunable — see SCORING below. Every
 * number the dashboard shows is derived here and explained in the briefing so
 * nothing is a black box.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'command-center');
const NOW = new Date();
const incomeLedger = require(path.join(ROOT, 'command-center', 'collectors', 'income-ledger.js'));

// ---------------------------------------------------------------------------
// Tunable scoring model. Edit these to reshape how the dashboard ranks work.
// ---------------------------------------------------------------------------
const SCORING = {
  // Tags / roles that sit close to revenue rank higher on "profit".
  profitByTag: {
    'site-execution': 90,
    reunion: 85,
    deploy: 75,
    'release-management': 75,
    rollback: 60,
    'platform-upgrades': 45,
    'build-pipeline': 45,
    memory: 40,
    intelligence: 40,
    ledgers: 40,
    capture: 40,
    'studio-ui': 35,
    ux: 35,
    'design-research': 30,
    governance: 25,
    'multi-agent': 25,
  },
  profitByRole: {
    'site-project': 90,
    chassis: 50,
    substrate: 45,
    domain: 45,
    governance: 25,
  },
  // Words in open_blockers that mean "only Fritz can unblock this" (external
  // access, credentials, money, DNS) — these crater the autonomy score.
  externalBlockerWords: [
    'external', 'access', 'config', 'netlify', 'dns', 'godaddy', 'cpanel',
    'payment', 'secret', 'credential', 'creds', 'api key', 'auth', 'domain',
    'production', 'resend', 'mysql', 'php', 'backend secrets',
  ],
  staleDays: 14, // momentum older than this with no open tasks = "stale"
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function readJSON(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return fallback; }
}
function readJSONL(p) {
  try {
    return fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}
function daysSince(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return Math.max(0, Math.round((NOW - d) / 86400000));
}
function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function cleanText(text) {
  return String(text).replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
function formatUsd(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount) || 0);
}
function daysUntilDate(targetDate) {
  const target = new Date(`${targetDate}T00:00:00`);
  if (isNaN(target)) return null;
  const startNow = new Date(NOW);
  startNow.setHours(0, 0, 0, 0);
  return Math.round((target - startNow) / 86400000);
}
function boatMood(daysLeft) {
  if (daysLeft == null) return 'Boat clock offline. That is rude.';
  if (daysLeft < 0) return 'Boat left the dock. We are in aftermath mode now.';
  if (daysLeft === 0) return 'Boat day. No more theory. Proof only.';
  if (daysLeft <= 3) return 'Red alert. Deck shoes on. Ship the minimum viable magic.';
  if (daysLeft <= 7) return 'Crunch week. Every move should either earn, launch, or unblock.';
  if (daysLeft <= 14) return 'Window is open, but not wide. Stop romanticizing time.';
  return 'Plenty of runway by Fritz standards. Use it before it evaporates.';
}
function moneyMood(amount) {
  if (amount >= 1000) return 'Cha-ching choir activated.';
  if (amount >= 500) return 'Now we talking. The meter has a pulse.';
  if (amount > 0) return 'Money is on the board. Proof beats vibes.';
  return 'The Shay money meter is still hungry. Feed her.';
}

// ---------------------------------------------------------------------------
// Load ledgers
// ---------------------------------------------------------------------------
const registry = readJSON(path.join(ROOT, 'plans', 'registry.json'), { plans: [], active_parent_ids: [], labels: {} });
const tasks = readJSONL(path.join(ROOT, 'tasks', 'tasks.jsonl'));
const runs = readJSONL(path.join(ROOT, 'runs', 'runs.jsonl'));
const proofs = readJSONL(path.join(ROOT, 'proofs', 'proof-ledger.jsonl'));
const agents = readJSON(path.join(ROOT, 'agents', 'catalog.json'), { agents: [] }).agents || [];
const capsReg = readJSON(path.join(ROOT, 'platform', 'registry', 'capabilities.json'), { capabilities: [] }).capabilities || [];
const shayFocus = readJSON(path.join(ROOT, 'command-center', 'data', 'shay-focus.json'), {
  money: {
    label: 'Money made through Shay-Shay',
    amount_usd: 0,
    target_usd: 1000,
    note: 'Starts at $0 until we log a Shay-attributed win on purpose.',
  },
  countdown: {
    label: 'FAMU Alumni Cruise',
    date: '2026-06-26',
    note: 'Brand launch event. Simple platform, basic info, business workflows, and advertising need to be ready.',
  },
});
const landedIncome = incomeLedger.collect();
const cruiseDaysLeft = daysUntilDate(shayFocus.countdown?.date);
const shayMoney = Number(shayFocus.money?.amount_usd) || 0;
const shayMoneyTarget = Number(shayFocus.money?.target_usd) || 0;
const shayMoneyPct = shayMoneyTarget > 0 ? clamp((shayMoney / shayMoneyTarget) * 100) : null;

function listSites() {
  const out = [];
  for (const base of [path.join(ROOT, 'sites'), path.join(ROOT, '..', 'famtastic-sites')]) {
    try {
      for (const name of fs.readdirSync(base)) {
        const full = path.join(base, name);
        if (fs.statSync(full).isDirectory()) out.push({ tag: name, location: base.includes('famtastic-sites') ? 'deploy-repo' : 'studio-sandbox' });
      }
    } catch { /* dir absent */ }
  }
  return out;
}
const sites = listSites();

function latestCloseout(planId) {
  const dir = path.join(ROOT, 'plans', planId, 'closeouts');
  try {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
    if (!files.length) return null;
    return readJSON(path.join(dir, files[files.length - 1]), null);
  } catch { return null; }
}

// task open/total per plan
const taskAgg = {};
for (const t of tasks) {
  const k = t.plan_id || 'unknown';
  taskAgg[k] = taskAgg[k] || { open: 0, total: 0 };
  taskAgg[k].total += 1;
  if (!['completed', 'done', 'cancelled'].includes(t.status)) taskAgg[k].open += 1;
}

// ---------------------------------------------------------------------------
// Build the per-plan model
// ---------------------------------------------------------------------------
// active_parent_ids is the source of truth (matches scripts/plans/audit.js).
// A plan record may carry a stale status:"active" after being terminated, so we
// also subtract anything in terminated_parent_ids.
const terminated = new Set(Object.keys(registry.terminated_parent_ids || {}));
const activeIds = new Set((registry.active_parent_ids || []).filter((id) => !terminated.has(id)));
const planRecords = (registry.plans || []).filter((p) => activeIds.has(p.id));
// registry.plans may omit some active ids (they only carry a closeout) — patch them in.
for (const id of activeIds) {
  if (!planRecords.find((p) => p.id === id)) {
    const lbl = (registry.labels || {})[id] || {};
    planRecords.push({
      id,
      title: lbl.label || id,
      status: 'active',
      _fromLabelOnly: true,
      tags: lbl.tags,
      role: lbl.role,
      studio: lbl.studio,
      plan_type: lbl.plan_type,
      stream: lbl.stream,
      next_action: lbl.note,
    });
  }
}

function profitScore(plan, label) {
  const tags = plan.tags || label.tags || [];
  let best = 0;
  for (const t of tags) if (SCORING.profitByTag[t] != null) best = Math.max(best, SCORING.profitByTag[t]);
  const role = plan.role || label.role;
  if (role && SCORING.profitByRole[role] != null) best = Math.max(best, SCORING.profitByRole[role]);
  // near-term revenue note bonus
  const blob = `${plan.title || ''} ${plan.current_workstream || ''} ${(plan.assumptions || []).join(' ')}`.toLowerCase();
  if (/revenue|paid|client|sell|sale|income|invoice/.test(blob)) best = Math.max(best, 80);
  return clamp(best || 40);
}

function isExternalBlocker(text) {
  const lc = (text || '').toLowerCase();
  if (/no hard blocker/.test(lc)) return false;
  return SCORING.externalBlockerWords.some((w) => lc.includes(w));
}

function autonomyScore(plan, stage) {
  let s = 50;
  const handling = (plan.handling || '').toLowerCase();
  if (handling.includes('auto_approved') || registry?.governance?.auto_approved_execution) s += 22;
  const runner = (plan.current_runner || '').toLowerCase();
  if (runner && runner !== 'mixed' && runner !== 'none') s += 10;
  const blk = plan.open_blockers || '';
  if (/no hard blocker/i.test(blk)) s += 15;
  if (isExternalBlocker(blk)) s -= 40;
  if (stage === 'needs_tasking') s -= 15;
  if (stage === 'blocked_external') s -= 20;
  if (stage === 'stale') s -= 10;
  return clamp(s);
}

function classify(plan, agg, closeout, momentumDays) {
  const verdict = closeout && closeout.verdict;
  if (agg.open > 0) return 'in_progress';
  if (verdict === 'completed') return 'completed';
  if (verdict === 'needs_tasking') return 'needs_tasking';
  if (isExternalBlocker(plan.open_blockers)) return 'blocked_external';
  if (verdict && verdict.startsWith('checkpoint')) {
    return (momentumDays != null && momentumDays > SCORING.staleDays) ? 'checkpoint_stale' : 'checkpoint';
  }
  if (momentumDays != null && momentumDays > SCORING.staleDays) return 'stale';
  return 'checkpoint';
}

const STAGE_META = {
  in_progress:      { label: 'In progress',        emoji: '🟢', needsYou: false },
  checkpoint:       { label: 'Checkpoint',          emoji: '🔵', needsYou: false },
  checkpoint_stale: { label: 'Checkpoint (stalled)',emoji: '🟡', needsYou: true },
  needs_tasking:    { label: 'Needs tasking',       emoji: '🟡', needsYou: true },
  blocked_external: { label: 'Blocked (external)',  emoji: '🔴', needsYou: true },
  stale:            { label: 'Stale',               emoji: '⚪', needsYou: true },
  completed:        { label: 'Completed',           emoji: '✅', needsYou: false },
};

function needsYouReason(stage, plan) {
  switch (stage) {
    case 'needs_tasking': return 'Needs you to define the next tasks (or close it out).';
    case 'blocked_external': return `Blocked on access/credentials only you control — ${String(plan.open_blockers || '').slice(0, 160)}`;
    case 'checkpoint_stale': return `No movement in 2+ weeks at a checkpoint — decide the next phase or close it.`;
    case 'stale': return `No recorded movement recently — confirm it's still active or close it.`;
    default: return '';
  }
}

const plans = planRecords.map((p) => {
  const label = (registry.labels || {})[p.id] || {};
  const agg = taskAgg[p.id] || { open: 0, total: 0 };
  const closeout = latestCloseout(p.id);
  const momentumDays = daysSince(
    (closeout && closeout.verdict_at) || p._updated_at || registry.updated_at
  );
  const stage = classify(p, agg, closeout, momentumDays);
  const meta = STAGE_META[stage];
  const profit = profitScore(p, label);
  const autonomy = autonomyScore(p, stage);
  const planRuns = runs.filter((r) => r.plan_id === p.id);
  const activeRun = planRuns.find((r) => r.status === 'active');
  return {
    id: p.id,
    title: p.title || label.label || p.id,
    role: p.role || label.role || 'plan',
    studio: p.studio || p.classification?.studio || label.studio || 'unclassified',
    planType: p.plan_type || p.classification?.plan_type || label.plan_type || 'unclassified',
    stream: p.stream || p.classification?.stream || label.stream || 'unclassified',
    tags: p.tags || label.tags || [],
    priorityHigh: (p.fritz_priority || label.priority) === 'high',
    stage,
    stageLabel: meta.label,
    stageEmoji: meta.emoji,
    needsYou: meta.needsYou,
    needsYouReason: needsYouReason(stage, p),
    openTasks: agg.open,
    totalTasks: agg.total,
    momentumDays,
    autonomy,
    profit,
    nextAction: p.next_action || label.note || '',
    blocker: p.open_blockers || '',
    runner: p.current_runner || 'unassigned',
    closeoutVerdict: closeout && closeout.verdict,
    remainingWork: (closeout && closeout.remaining_work) || [],
    hasActiveRun: !!activeRun,
    proofCount: proofs.filter((pr) => pr.plan_id === p.id).length,
  };
});

// Rank for the briefing.
const priorities = plans.filter((p) => p.priorityHigh);
const needsYou = plans.filter((p) => p.needsYou)
  .sort((a, b) => (Number(b.priorityHigh) - Number(a.priorityHigh)) || ((b.profit + b.autonomy) - (a.profit + a.autonomy)));
const mostProfitable = [...plans].sort((a, b) => b.profit - a.profit);
const mostAutonomous = [...plans].sort((a, b) => b.autonomy - a.autonomy);

const kpis = {
  activePlans: plans.length,
  priorities: plans.filter((p) => p.priorityHigh).length,
  needsYou: plans.filter((p) => p.needsYou).length,
  blocked: plans.filter((p) => p.stage === 'blocked_external').length,
  inProgress: plans.filter((p) => p.stage === 'in_progress').length,
  openTasks: plans.reduce((s, p) => s + p.openTasks, 0),
  agents: agents.length,
  sites: sites.length,
  capabilities: capsReg.length,
  proofs: proofs.length,
};

const stageCounts = {};
for (const p of plans) stageCounts[p.stageLabel] = (stageCounts[p.stageLabel] || 0) + 1;

const snapshot = {
  generated_at: NOW.toISOString(),
  scoring_model: SCORING,
  kpis,
  shay_focus: {
    money: {
      label: shayFocus.money?.label || 'Money made through Shay-Shay',
      amount_usd: shayMoney,
      target_usd: shayMoneyTarget,
      progress_pct: shayMoneyPct,
      mood: moneyMood(shayMoney),
      note: shayFocus.money?.note || '',
    },
    countdown: {
      label: shayFocus.countdown?.label || 'FAMU Alumni Cruise',
      date: shayFocus.countdown?.date || null,
      days_left: cruiseDaysLeft,
      mood: boatMood(cruiseDaysLeft),
      note: shayFocus.countdown?.note || '',
    },
    landed_income: landedIncome,
  },
  stageCounts,
  plans,
  agents,
  sites,
  capabilities: capsReg.map((c) => ({ id: c.id, status: c.status, invocation: c.invocation })),
  runs: runs.map((r) => ({ run_id: r.run_id, plan_id: r.plan_id, status: r.status, target: r.target, current_step: r.current_step })),
};

// ---------------------------------------------------------------------------
// Emit state.json
// ---------------------------------------------------------------------------
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'state.json'), cleanText(JSON.stringify(snapshot, null, 2)));

// ---------------------------------------------------------------------------
// Emit briefing.md  — the "Virtual Fritz" daily read
// ---------------------------------------------------------------------------
function bulletPlan(p) {
  const m = p.momentumDays == null ? 'n/a' : `${p.momentumDays}d`;
  return `- **${p.title}** ${p.stageEmoji} ${p.stageLabel} · tasks ${p.openTasks}/${p.totalTasks} · last move ${m} · autonomy ${p.autonomy} · profit ${p.profit}`;
}

function escHtml(s) {
  return esc(String(s ?? ''));
}

function privateEntryCard(entry) {
  const action = entry.current_action || 'review';
  const note = entry.action_note ? `<div class="private-note">Note: ${escHtml(entry.action_note)}</div>` : '';
  const acted = entry.acted_at ? `<span>${escHtml(entry.acted_at)}</span>` : '';
  return `<div class="private-entry private-entry--${escHtml(action)}">
    <div class="private-meta"><span>${escHtml(entry.kind)}</span><span>${escHtml(entry.lane)}</span><span>${escHtml(entry.sensitivity)}</span><span>action:${escHtml(action)}</span>${acted}</div>
    <div class="private-excerpt">${escHtml(entry.excerpt)}</div>
    <div class="private-sub">${escHtml(entry.source_class || 'unknown')} · ${escHtml(entry.source_pointer || '')} · item ${escHtml(entry.item_id || '')}</div>
    ${note}
  </div>`;
}

const dateStr = NOW.toISOString().slice(0, 10);
const PROACTIVE_BRIEF = path.join(ROOT, 'obsidian', 'Shay-Memory', '_system', 'runtime', 'proactive', 'briefing-context.json');
const PRIVATE_REVIEW = path.join(ROOT, 'obsidian', 'Shay-Memory', '_system', 'runtime', 'proactive', 'private-review.json');
let proactiveBrief = null;
let privateReview = null;
try {
  if (fs.existsSync(PROACTIVE_BRIEF)) proactiveBrief = JSON.parse(fs.readFileSync(PROACTIVE_BRIEF, 'utf8'));
} catch (_) {}
try {
  if (fs.existsSync(PRIVATE_REVIEW)) privateReview = JSON.parse(fs.readFileSync(PRIVATE_REVIEW, 'utf8'));
} catch (_) {}
let briefing = `# FAMtastic Command Center — Daily Briefing\n\n`;
briefing += `**${dateStr}** · generated by \`scripts/command-center/build-command-center.js\`\n\n`;
briefing += `> Virtual Fritz, reporting. ${kpis.activePlans} active plans, **${kpis.needsYou} need you**, ${kpis.blocked} blocked on external access, ${kpis.inProgress} in motion. ${kpis.openTasks} open tasks across the board.\n\n`;
briefing += `## 💸 Cha-Ching + Boat Clock\n\n`;
briefing += `- **${shayFocus.money?.label || 'Money made through Shay-Shay'}:** ${formatUsd(shayMoney)}`;
if (shayMoneyTarget > 0) briefing += ` / ${formatUsd(shayMoneyTarget)} (${shayMoneyPct}% of target)`;
briefing += ` — ${moneyMood(shayMoney)}\n`;
briefing += `- **All landed income in Command Center ledger:** ${formatUsd(landedIncome.allTime)} total · ${formatUsd(landedIncome.month)} last 30d · ${landedIncome.count} event(s)\n`;
briefing += `- **${shayFocus.countdown?.label || 'FAMU Alumni Cruise'}:** ${cruiseDaysLeft} day(s) left until ${shayFocus.countdown?.date || 'n/a'} — ${boatMood(cruiseDaysLeft)}\n`;
if (shayFocus.money?.note) briefing += `- **Money note:** ${shayFocus.money.note}\n`;
if (shayFocus.countdown?.note) briefing += `- **Cruise note:** ${shayFocus.countdown.note}\n`;
briefing += `\n`;

if (proactiveBrief) {
  briefing += `## 🧠 Human-state overlay\n\n`;
  const fires = proactiveBrief.top_fires || [];
  const decisions = proactiveBrief.top_unresolved_decisions || [];
  const silence = proactiveBrief.top_silence_weight || [];
  const rankedFocus = proactiveBrief.ranked_focus || [];
  if (fires.length) briefing += `- **Top fires:** ${fires.slice(0, 2).join(' | ')}\n`;
  if (decisions.length) briefing += `- **Unresolved decisions:** ${decisions.slice(0, 2).join(' | ')}\n`;
  if (silence.length) briefing += `- **Silence-weight:** ${silence.slice(0, 2).join(' | ')}\n`;
  if (proactiveBrief.protect_the_source) briefing += `- **Protect the source:** ${proactiveBrief.protect_the_source}\n`;
  if (proactiveBrief.momentum_move) briefing += `- **Momentum move:** ${proactiveBrief.momentum_move}\n`;
  if (proactiveBrief.seed_watch_item) briefing += `- **Seed watch:** ${proactiveBrief.seed_watch_item}\n`;
  if ((proactiveBrief.approved_private_carry_forward || []).length) briefing += `- **Approved private carry-forward:** ${proactiveBrief.approved_private_carry_forward.slice(0, 2).join(' | ')}\n`;
  if (rankedFocus.length) briefing += `- **Ranked focus:** ${rankedFocus.slice(0, 3).map((x) => x.excerpt).join(' | ')}\n`;
  briefing += `\n`;
}

if (priorities.length) {
  briefing += `## ⭐ Your priorities (the ones that matter to you)\n\n`;
  priorities.sort((a, b) => Number(b.stage === 'in_progress') - Number(a.stage === 'in_progress')).forEach((p) => {
    briefing += `- **${p.title}** ${p.stageEmoji} ${p.stageLabel} · tasks ${p.openTasks}/${p.totalTasks}${p.nextAction ? ` — next: ${p.nextAction}` : ''}\n`;
  });
  briefing += `\n`;
}

briefing += `## 🔴 Needs you now (do these first)\n\n`;
if (!needsYou.length) briefing += `_Nothing is waiting on you. Every active plan is either moving or parked cleanly._\n\n`;
else {
  needsYou.slice(0, 6).forEach((p, i) => {
    briefing += `${i + 1}. **${p.title}** — ${p.needsYouReason}\n`;
    if (p.remainingWork.length) briefing += `   - next: ${p.remainingWork[0]}\n`;
  });
  briefing += `\n`;
}

briefing += `## 💰 Most profitable next move\n\n`;
if (mostProfitable[0]) {
  const p = mostProfitable[0];
  briefing += `**${p.title}** (profit ${p.profit}/100). ${p.nextAction || ''}\n`;
  if (p.blocker && !/no hard blocker/i.test(p.blocker)) briefing += `> Watch-out: ${p.blocker}\n`;
  briefing += `\n`;
}

briefing += `## 🤖 Most autonomous win (greenlight it and walk away)\n\n`;
if (mostAutonomous[0]) {
  const p = mostAutonomous[0];
  const stalled = p.needsYou && p.autonomy >= 70;
  briefing += `**${p.title}** scores ${p.autonomy}/100 on autonomy. `;
  if (stalled) briefing += `It's auto-approved with a runner assigned and no hard blocker — the *only* thing stalling it is that no next tasks are queued. Greenlight it (queue the tasks below) and it runs with minimal input.\n`;
  else briefing += `It can proceed with little input from you. \n`;
  if (p.nextAction) briefing += `> Next: ${p.nextAction}\n`;
  briefing += `\n`;
}

briefing += `## All active plans\n\n`;
[...plans].sort((a, b) => (b.profit - a.profit)).forEach((p) => { briefing += bulletPlan(p) + '\n'; });

briefing += `\n## Roster\n\n`;
briefing += `- **Agents:** ${agents.map((a) => a.name).join(', ') || 'none'}\n`;
briefing += `- **Sites:** ${sites.map((s) => s.tag).join(', ') || 'none'}\n`;
briefing += `- **Platform capabilities:** ${capsReg.length} registered\n`;
briefing += `\n---\n_Scoring is heuristic and tunable in \`SCORING\` at the top of the generator. Profit ≈ revenue-proximity by tag/role; autonomy ≈ how much can proceed without you (auto-approval, assigned runner, no external blocker)._\n`;

fs.writeFileSync(path.join(OUT_DIR, 'briefing.md'), cleanText(briefing));

// ---------------------------------------------------------------------------
// Emit index.html — mobile-first dashboard
// ---------------------------------------------------------------------------
const stageColor = {
  'In progress': '#2dd4a7', 'Checkpoint': '#3b82f6', 'Checkpoint (stalled)': '#f5b342',
  'Needs tasking': '#f5b342', 'Blocked (external)': '#ef4444', 'Stale': '#94a3b8', 'Completed': '#22c55e',
};

function planCard(p) {
  const tagHtml = p.tags.slice(0, 4).map((t) => `<span class="tag">${esc(t)}</span>`).join('');
  const needs = p.needsYou ? `<div class="needs">⚠ ${esc(p.needsYouReason)}</div>` : '';
  const mom = p.momentumDays == null ? 'n/a' : `${p.momentumDays}d ago`;
  return `<div class="card" data-needs="${p.needsYou}" data-priority="${p.priorityHigh}">
    <div class="card-head">
      <span class="stage" style="--c:${stageColor[p.stageLabel] || '#888'}">${p.stageEmoji} ${esc(p.stageLabel)}</span>
      <span class="role">${p.priorityHigh ? '⭐ ' : ''}${esc(p.role)}</span>
    </div>
    <h3>${esc(p.title)}</h3>
    <div class="tags">${tagHtml}</div>
    <div class="metrics">
      <div><b>${p.openTasks}/${p.totalTasks}</b><span>tasks</span></div>
      <div><b>${mom}</b><span>last move</span></div>
      <div><b>${p.autonomy}</b><span>autonomy</span></div>
      <div><b>${p.profit}</b><span>profit</span></div>
    </div>
    ${needs}
    ${p.nextAction ? `<p class="next"><b>Next:</b> ${esc(p.nextAction)}</p>` : ''}
  </div>`;
}

const needsYouHtml = needsYou.length
  ? needsYou.map((p) => `<li><b>${esc(p.title)}</b> — ${esc(p.needsYouReason)}</li>`).join('')
  : '<li>Nothing waiting on you. 🎉</li>';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>FAMtastic Command Center</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<style>
  :root{--bg:#0b0e14;--panel:#141925;--panel2:#1b2230;--ink:#e8edf6;--mut:#8b97ad;--line:#222b3b;--accent:#2dd4a7;}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1100px;margin:0 auto;padding:18px 16px 64px}
  header h1{font-size:22px;margin:0 0 2px;letter-spacing:-.3px}
  header .sub{color:var(--mut);font-size:13px;margin-bottom:18px}
  .kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px}
  @media(min-width:680px){.kpis{grid-template-columns:repeat(4,1fr)}}
  .kpi{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px}
  .kpi b{display:block;font-size:26px;line-height:1}
  .kpi span{color:var(--mut);font-size:12px;text-transform:uppercase;letter-spacing:.4px}
  .kpi.alert b{color:#f5b342}.kpi.danger b{color:#ef4444}.kpi.star{border-color:#5a4a22}.kpi.star b{color:#ffd479}
  .card[data-priority="true"]{border-color:#ffd479;box-shadow:0 0 0 1px rgba(255,212,121,.25)}
  section{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:18px}
  section h2{font-size:15px;margin:0 0 12px;color:var(--mut);text-transform:uppercase;letter-spacing:.6px}
  .needs-list{margin:0;padding-left:18px}.needs-list li{margin:6px 0}
  .charts{display:grid;grid-template-columns:1fr;gap:18px}
  @media(min-width:680px){.charts{grid-template-columns:1fr 1fr}}
  .chart-box{background:var(--panel2);border-radius:12px;padding:12px;min-height:240px}
  .chart-box h3{font-size:13px;margin:0 0 8px;color:var(--mut)}
  .cards{display:grid;grid-template-columns:1fr;gap:12px}
  @media(min-width:680px){.cards{grid-template-columns:1fr 1fr}}
  .card{background:var(--panel2);border:1px solid var(--line);border-radius:14px;padding:14px}
  .card[data-needs="true"]{border-color:#5a4a22}
  .card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
  .stage{font-size:12px;font-weight:600;color:var(--c)}
  .role{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.4px}
  .card h3{font-size:16px;margin:2px 0 8px}
  .tags{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}
  .tag{font-size:11px;background:#0c1f1a;color:var(--accent);border:1px solid #14342b;padding:2px 7px;border-radius:20px}
  .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}
  .metrics div{text-align:center;background:#0e1420;border-radius:9px;padding:7px 4px}
  .metrics b{display:block;font-size:15px}.metrics span{font-size:10px;color:var(--mut)}
  .needs{font-size:12.5px;color:#f5b342;background:#241b0c;border-radius:9px;padding:8px 10px;margin:6px 0}
  .next{font-size:12.5px;color:var(--mut);margin:6px 0 0}
  .private-review{display:grid;grid-template-columns:1fr;gap:10px}
  .private-entry{background:#101622;border:1px solid #2d3546;border-radius:12px;padding:12px}
  .private-entry--approve{border-color:#1f6f4a;box-shadow:0 0 0 1px rgba(45,212,167,.18) inset}
  .private-entry--suppress{border-color:#6f2c3b;box-shadow:0 0 0 1px rgba(239,68,68,.16) inset}
  .private-meta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
  .private-meta span{font-size:11px;background:#221626;color:#f3b6ff;border:1px solid #51335d;padding:2px 7px;border-radius:999px;text-transform:uppercase;letter-spacing:.3px}
  .private-excerpt{font-size:13px;line-height:1.45}
  .private-sub{margin-top:8px;color:var(--mut);font-size:11px}
  .private-note{margin-top:8px;color:#cde7df;font-size:11.5px}
  .focus-grid{display:grid;grid-template-columns:1fr;gap:12px}
  @media(min-width:680px){.focus-grid{grid-template-columns:1fr 1fr}}
  .focus-card{background:var(--panel2);border:1px solid var(--line);border-radius:14px;padding:14px}
  .focus-card.money{border-color:#14532d;box-shadow:0 0 0 1px rgba(45,212,167,.12) inset}
  .focus-card.cruise{border-color:#1d4ed8;box-shadow:0 0 0 1px rgba(59,130,246,.12) inset}
  .focus-kicker{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px}
  .focus-big{font-size:30px;font-weight:800;line-height:1.05;margin-bottom:6px}
  .focus-sub{color:var(--mut);font-size:13px}
  .focus-note{margin-top:8px;font-size:12.5px;color:#cbd5e1}
  .roster{display:flex;flex-wrap:wrap;gap:8px}
  .pill{background:var(--panel2);border:1px solid var(--line);border-radius:20px;padding:5px 12px;font-size:12.5px}
  footer{color:var(--mut);font-size:12px;text-align:center;margin-top:8px}
  a{color:var(--accent)}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>⬡ FAMtastic Command Center</h1>
    <div class="sub">Mission Control · generated ${esc(NOW.toUTCString())} · source: live repo ledgers</div>
  </header>

  <div class="kpis">
    <div class="kpi"><b>${kpis.activePlans}</b><span>Active plans</span></div>
    <div class="kpi star"><b>${kpis.priorities}</b><span>⭐ Your priorities</span></div>
    <div class="kpi ${kpis.needsYou ? 'alert' : ''}"><b>${kpis.needsYou}</b><span>Need you</span></div>
    <div class="kpi ${kpis.blocked ? 'danger' : ''}"><b>${kpis.blocked}</b><span>Blocked (ext)</span></div>
    <div class="kpi"><b>${kpis.inProgress}</b><span>In progress</span></div>
    <div class="kpi"><b>${kpis.openTasks}</b><span>Open tasks</span></div>
    <div class="kpi"><b>${kpis.agents}</b><span>Agents</span></div>
    <div class="kpi"><b>${kpis.capabilities}</b><span>Capabilities</span></div>
    <div class="kpi"><b>${kpis.proofs}</b><span>Proofs logged</span></div>
  </div>

  <section>
    <h2>💸 Cha-Ching + Boat Clock</h2>
    <div class="focus-grid">
      <div class="focus-card money">
        <div class="focus-kicker">${esc(shayFocus.money?.label || 'Money made through Shay-Shay')}</div>
        <div class="focus-big">${esc(formatUsd(shayMoney))}</div>
        <div class="focus-sub">${shayMoneyTarget > 0 ? `${esc(formatUsd(shayMoneyTarget))} target · ${esc(String(shayMoneyPct))}% there` : 'No target set yet'} · ${esc(moneyMood(shayMoney))}</div>
        <div class="focus-note">${esc(shayFocus.money?.note || 'Log every Shay-attributed dollar on purpose so the meter tells the truth.')}</div>
      </div>
      <div class="focus-card cruise">
        <div class="focus-kicker">${esc(shayFocus.countdown?.label || 'FAMU Alumni Cruise')}</div>
        <div class="focus-big">${esc(String(cruiseDaysLeft))} day${cruiseDaysLeft === 1 ? '' : 's'}</div>
        <div class="focus-sub">Until ${esc(shayFocus.countdown?.date || 'n/a')} · ${esc(boatMood(cruiseDaysLeft))}</div>
        <div class="focus-note">${esc(shayFocus.countdown?.note || 'Brand launch event. Readiness beats wishing.')}</div>
      </div>
    </div>
  </section>

  <section>
    <h2>🔴 Needs you now</h2>
    <ul class="needs-list">${needsYouHtml}</ul>
  </section>

  ${privateReview && privateReview.entries && privateReview.entries.length ? `
  <section>
    <h2>🔒 Private context review</h2>
    <p style="color:var(--mut);font-size:12px;margin:0 0 10px">Protected human-state items stay out of the public brief by default. Theme: ${escHtml(privateReview.theme || 'n/a')} · pressures: ${escHtml((privateReview.active_pressures || []).join(', ') || 'none')} · approved: ${escHtml(String(privateReview.action_summary?.approved ?? 0))} · suppressed: ${escHtml(String(privateReview.action_summary?.suppressed ?? 0))} · review: ${escHtml(String(privateReview.action_summary?.review ?? 0))}</p>
    <p style="color:var(--mut);font-size:12px;margin:0 0 10px">Action path: <code>python3 obsidian/Shay-Memory/_system/private_review_actions.py list</code> then <code>python3 obsidian/Shay-Memory/_system/private_review_actions.py set ITEM_ID approve --note "why it can surface"</code> or <code>... suppress --note "why it stays private"</code>.</p>
    <div class="private-review">${privateReview.entries.map(privateEntryCard).join('')}</div>
  </section>
  ` : ''}

  <section>
    <h2>The picture</h2>
    <div class="charts">
      <div class="chart-box"><h3>Plan health</h3><canvas id="healthChart"></canvas></div>
      <div class="chart-box"><h3>Autonomy × Profit (top-right = let it run)</h3><canvas id="quadChart"></canvas></div>
    </div>
  </section>

  <section>
    <h2>All active plans</h2>
    <div class="cards">${[...plans].sort((a,b)=>(Number(b.priorityHigh)-Number(a.priorityHigh))||(Number(b.needsYou)-Number(a.needsYou))||(b.profit-a.profit)).map(planCard).join('')}</div>
  </section>

  <section>
    <h2>Roster</h2>
    <p style="color:var(--mut);font-size:12px;margin:0 0 8px">Agents</p>
    <div class="roster">${agents.map((a)=>`<span class="pill">🤖 ${esc(a.name)} <small style="color:var(--mut)">${esc(a.model)}</small></span>`).join('') || '<span class="pill">none</span>'}</div>
    <p style="color:var(--mut);font-size:12px;margin:14px 0 8px">Sites</p>
    <div class="roster">${sites.map((s)=>`<span class="pill">🌐 ${esc(s.tag)} <small style="color:var(--mut)">${esc(s.location)}</small></span>`).join('') || '<span class="pill">none</span>'}</div>
  </section>

  <footer>Regenerate: <code>node scripts/command-center/build-command-center.js</code> · briefing.md + state.json emitted alongside this file.</footer>
</div>

<script>
const SNAP = ${JSON.stringify({ stageCounts, plans: plans.map((p) => ({ title: p.title, autonomy: p.autonomy, profit: p.profit, needsYou: p.needsYou })) })};
const stageColors = ${JSON.stringify(stageColor)};
new Chart(document.getElementById('healthChart'), {
  type:'doughnut',
  data:{labels:Object.keys(SNAP.stageCounts),datasets:[{data:Object.values(SNAP.stageCounts),backgroundColor:Object.keys(SNAP.stageCounts).map(k=>stageColors[k]||'#888'),borderColor:'#0b0e14',borderWidth:2}]},
  options:{plugins:{legend:{labels:{color:'#cbd5e1',boxWidth:12,font:{size:11}}}}}
});
new Chart(document.getElementById('quadChart'), {
  type:'scatter',
  data:{datasets:[{
    label:'plans',
    data:SNAP.plans.map(p=>({x:p.autonomy,y:p.profit,t:p.title})),
    backgroundColor:SNAP.plans.map(p=>p.needsYou?'#f5b342':'#2dd4a7'),
    pointRadius:7,pointHoverRadius:9
  }]},
  options:{
    scales:{
      x:{min:0,max:100,title:{display:true,text:'Autonomy →',color:'#8b97ad'},grid:{color:'#222b3b'},ticks:{color:'#8b97ad'}},
      y:{min:0,max:100,title:{display:true,text:'Profit →',color:'#8b97ad'},grid:{color:'#222b3b'},ticks:{color:'#8b97ad'}}
    },
    plugins:{legend:{display:false},tooltip:{callbacks:{label:(c)=>c.raw.t+' ('+c.raw.x+', '+c.raw.y+')'}}}
  }
});
</script>
</body>
</html>`;

fs.writeFileSync(path.join(OUT_DIR, 'index.html'), cleanText(html));

// ---------------------------------------------------------------------------
console.log(`Command Center generated → ${path.relative(ROOT, OUT_DIR)}/`);
console.log(`  plans: ${plans.length} | needs you: ${kpis.needsYou} | blocked: ${kpis.blocked} | open tasks: ${kpis.openTasks}`);
console.log(`  files: index.html, briefing.md, state.json`);
