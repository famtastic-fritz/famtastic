// Bridges to existing FAMtastic (CommonJS) infrastructure so the autopilot
// reuses the platform instead of reinventing it. Every bridge is guarded:
// if the module can't be loaded, the autopilot degrades to local-only
// behavior rather than crashing.

import { createRequire } from "node:module";
import { HUB_ROOT } from "./paths.mjs";
import path from "node:path";

const require = createRequire(import.meta.url);

let _dataCenter = null;
export function dataCenter() {
  if (_dataCenter !== null) return _dataCenter;
  try {
    _dataCenter = require(path.join(HUB_ROOT, "lib/famtastic/data-center/index.js"));
  } catch {
    _dataCenter = false; // sentinel: tried and failed
  }
  return _dataCenter;
}

let _health = null;
// Reuse the existing run-health evaluator (lib/famtastic/autopilot).
export function evaluateRunHealth(events, options) {
  if (_health === null) {
    try {
      _health = require(path.join(HUB_ROOT, "lib/famtastic/autopilot/index.js"));
    } catch {
      _health = false;
    }
  }
  if (_health && typeof _health.evaluateRunHealth === "function") {
    return _health.evaluateRunHealth(events, options);
  }
  // Local fallback mirrors the platform thresholds closely enough.
  const recent = (events || []).filter(Boolean).slice(-(options?.windowSize || 8));
  if (!recent.length) return { status: "suspicious", metrics: {}, reason: "no events" };
  const ok = recent.filter((e) => e.ok !== false).length / recent.length;
  return {
    status: ok >= 0.75 ? "productive" : ok >= 0.34 ? "suspicious" : "stuck",
    metrics: { total: recent.length, successRate: ok },
    reason: "local fallback",
  };
}

// Mirror an audit event into the global data-center ledger when available.
export function mirrorToDataCenter(ledger, record) {
  const dc = dataCenter();
  if (!dc || typeof dc.appendLedgerRecord !== "function") return false;
  try {
    dc.appendLedgerRecord({ ledger: `autopilot-${ledger}`, record });
    return true;
  } catch {
    return false;
  }
}
