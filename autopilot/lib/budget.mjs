// Daily budget governor — the hard spend cap that lets the autopilot run
// unattended without blowing the bill. Every paid action must be granted
// budget first; over-cap requests are denied and the caller degrades to the
// free path (templated script, silent voiceover, gradient backgrounds).

import { append, read } from "./ledger.mjs";
import { dayKey } from "./util.mjs";

const LEDGER = "budget";

export function spentToday(opts = {}) {
  const today = dayKey();
  return read(LEDGER, opts)
    .filter((r) => r.day === today && r.granted)
    .reduce((sum, r) => sum + (r.amount || 0), 0);
}

export function remainingToday(config, opts = {}) {
  const cap = config.spend_cap_usd_per_day ?? 0;
  return Math.max(0, round(cap - spentToday(opts)));
}

// Atomically request budget. Returns { granted, amount, remaining, reason }.
// Append-then-check would race; we read current spend, decide, then record
// the grant so the next read reflects it.
export function requestSpend(amount, label, config, opts = {}) {
  const cap = config.spend_cap_usd_per_day ?? 0;
  const spent = spentToday(opts);
  const remaining = round(cap - spent);
  const amt = round(amount);

  if (amt <= 0) {
    append(LEDGER, { day: dayKey(), label, amount: 0, granted: true, free: true }, opts);
    return { granted: true, amount: 0, remaining, reason: "free action" };
  }
  if (amt > remaining) {
    append(
      LEDGER,
      { day: dayKey(), label, amount: amt, granted: false, reason: "cap exceeded", remaining },
      opts,
    );
    return { granted: false, amount: amt, remaining, reason: `cap exceeded (need $${amt}, $${remaining} left)` };
  }
  append(
    LEDGER,
    { day: dayKey(), label, amount: amt, granted: true, balanceAfter: round(remaining - amt) },
    opts,
  );
  return { granted: true, amount: amt, remaining: round(remaining - amt), reason: "ok" };
}

function round(n) {
  return Math.round(n * 100) / 100;
}
