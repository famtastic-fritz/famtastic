'use strict';
/**
 * Process / agent health collector.
 *
 * Health for each registered agent is computed from two independent signals:
 *   1. liveness  — is a matching process actually running? (ps scan)
 *   2. heartbeat — did the agent write a fresh heartbeat file recently?
 *
 * This two-signal model is what catches the class of bug currently in the
 * pipeline: scout's PID is alive but the process is hung on a network call.
 * PID-only monitoring shows green; heartbeat freshness flips it to HUNG.
 *
 * Status values:
 *   "up"      alive AND (no heartbeat required OR heartbeat fresh)
 *   "hung"    alive BUT heartbeat is stale (process wedged / looping silently)
 *   "down"    no matching process found
 *   "stale"   not alive, but left a heartbeat behind (recently crashed)
 */
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function psSnapshot() {
  return new Promise((resolve) => {
    // -ww = don't truncate the command column
    execFile('ps', ['-axww', '-o', 'pid=,etime=,%cpu=,command='], { maxBuffer: 8 * 1024 * 1024 }, (err, stdout) => {
      if (err) return resolve([]);
      const rows = [];
      for (const line of stdout.split('\n')) {
        const t = line.trim();
        if (!t) continue;
        const m = t.match(/^(\d+)\s+(\S+)\s+(\S+)\s+(.*)$/);
        if (!m) continue;
        rows.push({ pid: Number(m[1]), etime: m[2], cpu: Number(m[3]), command: m[4] });
      }
      resolve(rows);
    });
  });
}

function readHeartbeat(relPath) {
  if (!relPath) return null;
  const abs = path.join(REPO_ROOT, relPath);
  try {
    const raw = fs.readFileSync(abs, 'utf8');
    const hb = JSON.parse(raw);
    const stat = fs.statSync(abs);
    // Prefer an explicit ts in the file; fall back to file mtime.
    let ts = null;
    if (typeof hb.ts === 'number') ts = hb.ts > 1e12 ? hb.ts / 1000 : hb.ts;
    else if (typeof hb.ts === 'string') ts = Date.parse(hb.ts) / 1000;
    if (!ts || Number.isNaN(ts)) ts = stat.mtimeMs / 1000;
    return { ts, status: hb.status || null, detail: hb.detail || null };
  } catch {
    return null;
  }
}

async function collect(registry, nowSec) {
  const procs = await psSnapshot();
  const now = nowSec || Date.now() / 1000;

  const agents = (registry.agents || []).map((a) => {
    const matches = procs.filter((p) => a.match && p.command.includes(a.match));
    const alive = matches.length > 0;
    const hb = readHeartbeat(a.heartbeat);

    let status;
    let staleSec = null;
    if (a.heartbeat && hb) {
      staleSec = Math.max(0, Math.round(now - hb.ts));
      const limit = a.maxStaleSec || 600;
      const fresh = staleSec <= limit;
      if (alive) status = fresh ? 'up' : 'hung';
      else status = 'stale';
    } else if (a.heartbeat && !hb) {
      // expected a heartbeat, none on disk
      status = alive ? 'hung' : 'down';
    } else {
      // PID-only service
      status = alive ? 'up' : 'down';
    }

    return {
      name: a.name,
      label: a.label,
      group: a.group || 'other',
      status,
      pids: matches.map((p) => p.pid),
      cpu: matches.reduce((s, p) => s + (p.cpu || 0), 0),
      uptime: alive ? matches[0].etime : null,
      heartbeat: hb ? { ageSec: staleSec, status: hb.status, detail: hb.detail, maxStaleSec: a.maxStaleSec || null } : null
    };
  });

  const summary = agents.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    },
    {}
  );

  return {
    agents,
    summary,
    healthy: agents.length > 0 && agents.every((a) => a.status === 'up'),
    degraded: agents.filter((a) => a.status === 'hung' || a.status === 'down' || a.status === 'stale').map((a) => a.label)
  };
}

module.exports = { collect };
