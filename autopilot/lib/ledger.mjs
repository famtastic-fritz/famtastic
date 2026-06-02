// Append-only JSONL ledgers — the autopilot's audit trail and operational
// state. Mirrors the data-center convention ({ts, ...record} + secret
// redaction) and also mirrors audit-worthy events into the global
// data-center ledger when it's available.

import fs from "node:fs";
import path from "node:path";
import { stateDir } from "./paths.mjs";
import { nowIso } from "./util.mjs";
import { mirrorToDataCenter } from "./interop.mjs";

const SECRET_KEY_RE = /(api[_-]?key|token|secret|password|credential|authorization)/i;
const SECRET_VALUE_RE = /\b(?:sk|pk|pplx|xi)-[A-Za-z0-9_-]{12,}\b/g;

export function sanitize(value) {
  if (value == null) return value;
  if (typeof value === "string") return value.replace(SECRET_VALUE_RE, "[REDACTED]");
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SECRET_KEY_RE.test(k) ? "[REDACTED]" : sanitize(v);
    }
    return out;
  }
  return value;
}

function ledgerPath(name, root) {
  return path.join(stateDir(root), `${name}.jsonl`);
}

// Append a record. `mirror: true` also writes to the global data-center.
export function append(name, record, { root, mirror = false } = {}) {
  const full = { ts: nowIso(), ...sanitize(record) };
  fs.appendFileSync(ledgerPath(name, root), JSON.stringify(full) + "\n");
  if (mirror) mirrorToDataCenter(name, full);
  return full;
}

export function read(name, { root } = {}) {
  const file = ledgerPath(name, root);
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// Rewrite a ledger in full (used sparingly, e.g. dedupe compaction).
export function rewrite(name, records, { root } = {}) {
  const file = ledgerPath(name, root);
  fs.writeFileSync(file, records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : ""));
}
