// Worker-agent template + programmatic minting/retiring. The orchestrator decides
// which kinds of workers it needs (by task type) and mints them from this template,
// so new agent types can be created on demand without writing new files by hand.
import fs from 'node:fs';
import { resolveInside, ensureDir } from './safepath.js';

ensureDir('data/agents');
const DIR = 'data/agents';

// The template every minted worker is instantiated from.
export function template(name, handlesTypes, opts = {}) {
  return {
    name,
    kind: 'worker',
    handles: handlesTypes,         // task types this worker can take
    tier_pref: opts.tier_pref || 'auto',
    minted_at: new Date().toISOString(),
    last_used_at: null,
    tasks_done: 0,
    status: 'idle',                // idle|busy|retired
  };
}

// Map a task type to the worker family that should handle it.
export function familyFor(type) {
  if (type.startsWith('build-')) return 'builder';
  if (type === 'assemble') return 'integrator';
  if (['prospect', 'analyze', 'propose'].includes(type)) return 'analyst';
  return 'triager'; // triage/classify/summarize/report
}

export function mint(family, handlesTypes) {
  const name = `${family}-${Math.random().toString(36).slice(2, 6)}`;
  const def = template(name, handlesTypes, { });
  fs.writeFileSync(resolveInside(`${DIR}/${name}.json`), JSON.stringify(def, null, 2) + '\n');
  return def;
}

export function list() {
  if (!fs.existsSync(resolveInside(DIR))) return [];
  return fs.readdirSync(resolveInside(DIR))
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(resolveInside(`${DIR}/${f}`), 'utf8')));
}

export function save(def) {
  fs.writeFileSync(resolveInside(`${DIR}/${def.name}.json`), JSON.stringify(def, null, 2) + '\n');
}

export function touch(name, patch) {
  const p = resolveInside(`${DIR}/${name}.json`);
  if (!fs.existsSync(p)) return;
  const def = JSON.parse(fs.readFileSync(p, 'utf8'));
  Object.assign(def, patch);
  fs.writeFileSync(p, JSON.stringify(def, null, 2) + '\n');
  return def;
}

// Retire idle workers whose last use is older than ttl (or never used and stale).
export function retireIdle(ttlMs) {
  const now = Date.now();
  let retired = 0;
  for (const a of list()) {
    if (a.status === 'retired') continue;
    const last = a.last_used_at ? Date.parse(a.last_used_at) : Date.parse(a.minted_at);
    if (a.status === 'idle' && now - last > ttlMs) {
      fs.rmSync(resolveInside(`${DIR}/${a.name}.json`));
      retired++;
    }
  }
  return retired;
}

export function activeCount() {
  return list().filter(a => a.status !== 'retired').length;
}
