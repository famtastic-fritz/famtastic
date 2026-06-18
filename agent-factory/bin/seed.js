#!/usr/bin/env node
// Seed the task queue so the factory has work immediately. Includes the NCS7
// "proof" pipeline (scout -> audit -> propose -> build parts -> assemble) plus a
// burst of lightweight tasks to exercise routing + throughput.
import queue from '../src/queue.js';
import { loadEnv } from '../src/util.js';

loadEnv();

const NCS7 = { target: 'https://www.nationalcadstandard.org/ncs7/' };

const tasks = [
  // Discovery + analysis + proposal (priority 1-2 -> run first)
  { type: 'prospect', priority: 1, payload: { ...NCS7, goal: 'find look-alike prospects' } },
  { type: 'analyze',  priority: 1, payload: { ...NCS7, goal: 'audit current site + business' } },
  { type: 'propose',  priority: 2, payload: { ...NCS7, high_stakes: true } },

  // Build the modernized demo (priority 3)
  { type: 'build-frontend', priority: 3, payload: { ...NCS7, feature: 'react + three.js immersive' } },
  { type: 'build-cms',      priority: 3, payload: { ...NCS7, feature: 'simple customizable CMS + templates' } },
  { type: 'build-tutor',    priority: 3, payload: { ...NCS7, feature: 'AI CMS tutor' } },
  { type: 'build-3d',       priority: 3, payload: { ...NCS7, feature: '3D CAD render (bonus)' } },

  // Integrate (priority 4 -> last)
  { type: 'assemble', priority: 4, payload: { ...NCS7 } },

  // Lightweight high-throughput tasks (stay on cheap tier) to show cost routing.
  { type: 'triage',    priority: 5, payload: { item: 'inbound lead #1' } },
  { type: 'classify',  priority: 5, payload: { item: 'inbound lead #2' } },
  { type: 'summarize', priority: 5, payload: { item: 'support ticket digest' } },
  { type: 'report',    priority: 6, payload: { item: 'weekly pipeline report', persist: true } },
];

// A burst of cheap, high-throughput tasks. This creates a backlog larger than a
// single batch, so the self-improvement loop has a reason to SCALE UP concurrency
// and batch size, then trim back once drained — visible in LEARNINGS.md.
const burstTypes = ['triage', 'classify', 'summarize'];
for (let i = 0; i < 18; i++) {
  tasks.push({ type: burstTypes[i % burstTypes.length], priority: 7, payload: { item: `bulk lead #${i + 1}` } });
}

let n = 0;
for (const t of tasks) { queue.enqueue(t); n++; }
console.log(`Seeded ${n} tasks. Queue depth: ${queue.depth()}`);
console.log('Types:', tasks.map(t => t.type).join(', '));
