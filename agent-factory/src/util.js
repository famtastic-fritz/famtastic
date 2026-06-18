// Shared helpers: .env loading (no deps), config IO, structured logging.
import fs from 'node:fs';
import { ROOT, resolveInside, appendInside } from './safepath.js';

// --- .env (minimal parser, no dependency) ---
export function loadEnv() {
  const p = resolveInside('.env');
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith('#')) {
        const val = m[2].replace(/^["']|["']$/g, '');
        if (process.env[m[1]] === undefined) process.env[m[1]] = val;
      }
    }
  }
  return process.env;
}

// --- config ---
export function loadConfig() {
  return JSON.parse(fs.readFileSync(resolveInside('config/factory-config.json'), 'utf8'));
}
export function saveConfig(cfg) {
  fs.writeFileSync(resolveInside('config/factory-config.json'), JSON.stringify(cfg, null, 2) + '\n');
}
export function loadModels() {
  return JSON.parse(fs.readFileSync(resolveInside('config/models.json'), 'utf8')).models;
}

// --- logging ---
export function ts() { return new Date().toISOString(); }

export function log(file, level, msg, extra) {
  const line = JSON.stringify({ t: ts(), level, msg, ...(extra || {}) });
  appendInside(`logs/${file}`, line + '\n');
  return line;
}

export function orchLog(msg, extra) {
  const line = log('ORCHESTRATOR.log', 'INFO', msg, extra);
  // also echo a human line to stdout so the demo is watchable
  const e = extra ? ' ' + JSON.stringify(extra) : '';
  process.stdout.write(`\x1b[36m[orch ${ts().slice(11, 19)}]\x1b[0m ${msg}${e}\n`);
  return line;
}

export function costLog(entry) {
  return log('COSTS.log', 'COST', 'charge', entry);
}

export function uid(prefix = 't') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export { ROOT };
