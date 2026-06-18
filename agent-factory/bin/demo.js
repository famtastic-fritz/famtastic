#!/usr/bin/env node
// One-shot end-to-end proof: reset -> seed -> run to drain -> dashboard -> readout.
import { loadEnv } from '../src/util.js';
import queue from '../src/queue.js';
import orchestrator from '../src/orchestrator.js';
import dashboard from '../src/dashboard.js';
import { execSync } from 'node:child_process';
import { ROOT } from '../src/safepath.js';

loadEnv();

console.log('=== AGENT FACTORY — END-TO-END DEMO ===\n');
queue.reset();
console.log('Queue reset.');

execSync('node bin/seed.js', { cwd: ROOT, stdio: 'inherit' });
console.log('');

await orchestrator.runForever({ stopWhenDrained: true });

console.log('\n' + dashboard.terminal());
const dpath = dashboard.writeHtml();
console.log(`\nDashboard: ${dpath}`);
console.log('Decision log: logs/ORCHESTRATOR.log');
console.log('Cost ledger: logs/COSTS.log');
console.log('Learnings:   LEARNINGS.md');
console.log('Demo build:  projects/ncs7/build/  (run: node projects/ncs7/build/cms/server.js)');
process.exit(0);
