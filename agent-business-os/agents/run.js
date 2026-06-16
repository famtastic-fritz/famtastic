#!/usr/bin/env node
'use strict';

/*
 * run.js — the orchestrator CLI for Agent Business OS agents.
 *
 *   node run.js tick                 billing-agent then monitor-agent (one cycle)
 *   node run.js billing              run billing-agent once
 *   node run.js monitor              run monitor-agent once
 *   node run.js memo                 write today's digest into the brain
 *   node run.js mark-paid <invId>    flip an invoice to paid (webhook/manual sync)
 *   node run.js win <dealId>         mark a deal won (so billing invoices it)
 *   node run.js status               print the current health snapshot
 *   node run.js seed                 load a demo pipeline (for trying it out)
 *   node run.js loop [seconds]       run tick on an interval (default 900s)
 *
 * Autonomy in production: schedule `tick` on cron (e.g. every 15 min) and `memo`
 * once a day. `loop` is the same thing for a long-running process.
 */

const store = require('./lib/store');
const capture = require('./capture-agent');
const sync = require('./sync-agent');
const qualifier = require('./qualifier-agent');
const sdr = require('./sdr-agent');
const billing = require('./billing-agent');
const monitor = require('./monitor-agent');
const memo = require('./memo-agent');
const growth = require('./growth-agent');

// One full cycle: pull live leads/payments → qualify → contact/open → invoice/dun → measure.
async function tick() {
  const sy = await sync.run();
  const q = await qualifier.run();
  const s = await sdr.run();
  const b = await billing.run();
  const h = await monitor.run();
  return { sync: sy, qualifier: q, sdr: s, billing: b, status: h.status };
}

function markPaid(invId) {
  const db = store.load();
  const inv = (db.invoices || []).find((i) => i.id === invId);
  if (!inv) { console.error(`no invoice ${invId}`); process.exit(1); }
  inv.status = 'paid';
  inv.paidAt = new Date().toISOString();
  store.save(db);
  store.logEvent('run', 'mark_paid', invId, { amount: inv.amount });
  console.log(`marked ${invId} paid ($${inv.amount}). Run \`tick\` to close the deal.`);
}

function win(dealId) {
  const db = store.load();
  const deal = (db.deals || []).find((d) => d.id === dealId);
  if (!deal) { console.error(`no deal ${dealId}`); process.exit(1); }
  deal.status = 'won';
  deal.wonAt = new Date().toISOString();
  store.save(db);
  store.logEvent('run', 'deal_won', dealId, { amount: deal.amount });
  console.log(`deal ${dealId} marked won. Run \`tick\` to invoice it.`);
}

function status() {
  const h = monitor.compute(store.load());
  console.log(JSON.stringify(h, null, 2));
}

function seed() {
  const now = new Date();
  const demo = {
    version: 1,
    leads: [
      { id: 'lead_demo1', name: 'Jordan Rivera', email: 'jordan@acme.io', revenue: 60000, bottleneck: 'follow_up', lift: 40000, start7: 'yes', fitScore: 100, priority: 'hot', responseSlaMinutes: 15, stage: 'conversion', status: 'qualified', createdAt: now.toISOString(), firstContactAt: now.toISOString() },
      { id: 'lead_demo2', name: 'Sam Lee', email: 'sam@studio.co', revenue: 18000, bottleneck: 'lead_volume', lift: 9000, start7: 'no', fitScore: 48, priority: 'nurture', responseSlaMinutes: 240, stage: 'capture', status: 'new', createdAt: now.toISOString(), firstContactAt: null }
    ],
    deals: [
      { id: 'deal_demo1', leadId: 'lead_demo1', email: 'jordan@acme.io', name: 'Jordan Rivera', amount: 3500, currency: 'USD', description: 'ABOS Performance Sprint — setup', status: 'won', wonAt: now.toISOString() }
    ],
    invoices: []
  };
  store.save(demo);
  console.log('seeded demo pipeline:', store.storePath());
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  switch (cmd) {
    case 'tick': console.log('tick:', JSON.stringify(await tick())); break;
    case 'ingest': { let j = {}; try { j = JSON.parse(arg || '{}'); } catch (_) { console.error('ingest: arg must be JSON'); process.exit(1); } console.log('ingest:', JSON.stringify(capture.ingest(j))); break; }
    case 'sync': console.log('sync:', JSON.stringify(await sync.run())); break;
    case 'qualify': console.log('qualifier:', JSON.stringify(await qualifier.run())); break;
    case 'sdr': console.log('sdr:', JSON.stringify(await sdr.run())); break;
    case 'billing': console.log('billing:', JSON.stringify(await billing.run())); break;
    case 'monitor': { const h = await monitor.run(); console.log('monitor:', h.status); break; }
    case 'memo': console.log('memo:', memo.run()); break;
    case 'growth': { const r = growth.run(); console.log(`growth: ${r.worklisted} queued, ${r.remaining} remaining → ${r.file}`); break; }
    case 'mark-paid': markPaid(arg); break;
    case 'win': win(arg); break;
    case 'status': status(); break;
    case 'seed': seed(); break;
    case 'loop': {
      const sec = parseInt(arg || '900', 10);
      console.log(`loop: tick every ${sec}s (Ctrl-C to stop)`);
      const cycle = async () => { try { console.log('tick:', JSON.stringify(await tick())); } catch (e) { console.error('tick failed', e && e.message); } };
      await cycle();
      setInterval(cycle, sec * 1000);
      break;
    }
    default:
      console.log('usage: run.js <tick|sync|ingest|qualify|sdr|billing|monitor|memo|growth|mark-paid|win|status|seed|loop>');
      process.exit(cmd ? 1 : 0);
  }
}

main();
