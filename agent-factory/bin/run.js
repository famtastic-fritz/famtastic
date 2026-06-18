#!/usr/bin/env node
// Start the orchestrator. Flags:
//   --batches N   run N non-empty batches then exit (default: run forever)
//   --drain       run until the queue is empty, then exit
import { loadEnv } from '../src/util.js';
import orchestrator from '../src/orchestrator.js';

loadEnv();

function arg(flag, def) { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : def; }
const has = (flag) => process.argv.includes(flag);

const maxBatches = arg('--batches') ? Number(arg('--batches')) : Infinity;
const stopWhenDrained = has('--drain');

orchestrator.runForever({ maxBatches, stopWhenDrained })
  .then((n) => { console.log(`\nOrchestrator finished after ${n} batch(es).`); process.exit(0); })
  .catch((e) => { console.error('Orchestrator error:', e); process.exit(1); });
