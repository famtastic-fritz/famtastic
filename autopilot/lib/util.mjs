// Small deterministic utilities shared across the autopilot.
// Determinism matters: the same day + same state must produce the same
// decisions, so ticks are reproducible and testable.

import crypto from "node:crypto";

export function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex");
}

export function shortId(prefix, ...parts) {
  return `${prefix}_${sha256(parts.join("|")).slice(0, 12)}`;
}

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function nowIso() {
  return new Date().toISOString();
}

// Seeded RNG (mulberry32) so "random" choices are reproducible from a seed.
export function rng(seed) {
  let a = typeof seed === "string" ? hashSeed(seed) : seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Weighted pick from [{ value, weight }]. Uses the provided rng() fn.
export function weightedPick(items, next) {
  const total = items.reduce((s, i) => s + Math.max(0, i.weight), 0);
  if (total <= 0) return items[Math.floor(next() * items.length)]?.value;
  let r = next() * total;
  for (const it of items) {
    r -= Math.max(0, it.weight);
    if (r <= 0) return it.value;
  }
  return items[items.length - 1].value;
}

export function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}
