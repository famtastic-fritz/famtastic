/**
 * Phase 1 / Task 1.6 (E7) — boot identity and lock fencing.
 *
 * Covers the launchd-restart failure mode: a persisted build lock owned by the
 * dead predecessor process must be reclaimable immediately, without waiting
 * for heartbeat staleness.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bootIdentity = require('../lib/boot-identity.js');
const {
  BOOT_ID,
  getBootId,
  nextFenceToken,
  seedFenceToken,
  isFenceCurrent,
  isProcessAlive,
  classifyLock,
  reconcileLocks,
  REASONS,
  DEFAULT_HEARTBEAT_TIMEOUT_MS,
  CURRENT_BOOT_HEARTBEAT_TIMEOUT_MULTIPLIER,
} = bootIdentity;

const NOW = Date.parse('2026-07-27T12:00:00.000Z');

// A heartbeat written one second ago — nowhere near stale.
const FRESH_HEARTBEAT = new Date(NOW - 1000).toISOString();
const STALE_HEARTBEAT = new Date(NOW - DEFAULT_HEARTBEAT_TIMEOUT_MS - 5000).toISOString();

const DEAD_PID = 999999;
const LIVE_PID = process.pid;

function lock(overrides = {}) {
  return {
    site_tag: 'site-a',
    run_id: 'run-1',
    pid: LIVE_PID,
    boot_id: getBootId(),
    fence_token: 100,
    heartbeat_at: FRESH_HEARTBEAT,
    ...overrides,
  };
}

const alwaysDead = () => false;
const alwaysAlive = () => true;

// ── Boot id ──────────────────────────────────────────────────────────────────

describe('boot id', () => {
  it('is a stable UUID for the lifetime of the process', () => {
    const first = getBootId();
    expect(first).toBe(BOOT_ID);
    expect(getBootId()).toBe(first);
    expect(getBootId()).toBe(first);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('is the same value when the module is required again (one id per process)', () => {
    const again = require('../lib/boot-identity.js');
    expect(again.getBootId()).toBe(getBootId());
    expect(again.BOOT_ID).toBe(BOOT_ID);
  });
});

// ── Fence tokens ─────────────────────────────────────────────────────────────

describe('fence tokens', () => {
  it('increase monotonically on every acquisition', () => {
    const tokens = Array.from({ length: 50 }, () => nextFenceToken());
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i]).toBeGreaterThan(tokens[i - 1]);
    }
  });

  it('never reissues a token below a seeded floor', () => {
    const floor = nextFenceToken() + 1_000_000;
    seedFenceToken(floor);
    const next = nextFenceToken();
    expect(next).toBeGreaterThan(floor);
  });

  it('ignores a seed that is lower than the current floor', () => {
    const current = nextFenceToken();
    seedFenceToken(current - 5000);
    expect(nextFenceToken()).toBeGreaterThan(current);
  });

  it('ignores a non-numeric seed', () => {
    const before = nextFenceToken();
    seedFenceToken('not-a-number');
    seedFenceToken(NaN);
    seedFenceToken(null);
    expect(nextFenceToken()).toBeGreaterThan(before);
  });

  it('rejects a write carrying a token older than the lock row', () => {
    const row = lock({ fence_token: 500 });
    expect(isFenceCurrent(row, 500)).toBe(true);
    expect(isFenceCurrent(row, 501)).toBe(true);
    expect(isFenceCurrent(row, 499)).toBe(false);
    expect(isFenceCurrent(null, 500)).toBe(false);
  });
});

// ── Liveness ─────────────────────────────────────────────────────────────────

describe('isProcessAlive', () => {
  it('reports this process as alive', () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  it('reports an unused pid as dead', () => {
    expect(isProcessAlive(DEAD_PID)).toBe(false);
  });

  it('treats invalid pids as dead', () => {
    expect(isProcessAlive(0)).toBe(false);
    expect(isProcessAlive(-1)).toBe(false);
    expect(isProcessAlive(null)).toBe(false);
    expect(isProcessAlive(undefined)).toBe(false);
    expect(isProcessAlive('abc')).toBe(false);
  });

  describe('EPERM — a process owned by another user', () => {
    // THE UNTESTED BRANCH. `process.kill(pid, 0)` throws EPERM when the process
    // EXISTS but belongs to a different uid — the multi-user box, the
    // root-owned launchd Studio, `sudo`-started builds. Returning `false` there
    // classifies a LIVE owner's lock as dead and lets this process steal it:
    // two Studios building the same site at once, which is the exact failure
    // build_locks exists to prevent. The mutant `return false` survived the
    // whole suite because nothing exercised the branch.
    //
    // process.kill is stubbed rather than a real cross-user pid: a genuine EPERM
    // requires a second uid on the box, which no test can assume, and the branch
    // under test is a pure reaction to the error code.
    function withKillThrowing(err, fn) {
      const real = process.kill;
      process.kill = () => { throw err; };
      try { return fn(); } finally { process.kill = real; }
    }

    it('reports EPERM as ALIVE — never steal a lock from another user', () => {
      const eperm = Object.assign(new Error('kill EPERM'), { code: 'EPERM', errno: -1 });
      expect(withKillThrowing(eperm, () => isProcessAlive(4242))).toBe(true);
    });

    it('still reports ESRCH as dead', () => {
      // The discriminating pair: if the EPERM branch were deleted entirely,
      // both codes would return false and only the test above would notice —
      // this one proves the module is not simply returning true for every throw.
      const esrch = Object.assign(new Error('kill ESRCH'), { code: 'ESRCH', errno: -3 });
      expect(withKillThrowing(esrch, () => isProcessAlive(4242))).toBe(false);
    });

    it('an errorless-code throw is treated as dead, not alive', () => {
      expect(withKillThrowing(new Error('something uninterpretable'), () => isProcessAlive(4242)))
        .toBe(false);
    });

    it("reconcileLocks LEAVES a foreign-boot lock held by another user's live process", () => {
      // The consequence, at the level the caller actually sees: an EPERM pid is
      // a live owner, so a fresh-heartbeat foreign-boot row must be HELD. Under
      // the `return false` mutant this row classifies as
      // previous_boot_dead_owner and reconcileBuildLocksOnBoot DELETES it.
      const eperm = Object.assign(new Error('kill EPERM'), { code: 'EPERM' });
      const real = process.kill;
      process.kill = () => { throw eperm; };
      try {
        const res = reconcileLocks({
          locks: [lock({ boot_id: 'another-users-studio', pid: 4242, heartbeat_at: FRESH_HEARTBEAT })],
          bootId: BOOT_ID,
          now: NOW,
          // isAlive deliberately NOT injected: this exercises the SHIPPING
          // default, isProcessAlive, which is where the EPERM branch lives.
        });
        expect(res.reclaimable).toEqual([]);
        expect(res.held.map((h) => h.reason)).toEqual([REASONS.FOREIGN_BOOT_LIVE_PID]);
      } finally {
        process.kill = real;
      }
    });
  });
});

// ── Reconciliation ───────────────────────────────────────────────────────────

describe('reconcileLocks — previous boot (launchd restart)', () => {
  it('reclaims a lock from a previous boot immediately, without heartbeat staleness', () => {
    const row = lock({
      boot_id: 'a-dead-previous-boot',
      pid: DEAD_PID,
      heartbeat_at: FRESH_HEARTBEAT, // heartbeat is FRESH — restart was instant
    });

    const { decisions, reclaimable } = reconcileLocks({
      locks: [row],
      bootId: getBootId(),
      now: NOW,
      isAlive: alwaysDead,
    });

    expect(decisions).toHaveLength(1);
    expect(decisions[0].reclaimable).toBe(true);
    expect(decisions[0].reason).toBe(REASONS.PREVIOUS_BOOT_DEAD_OWNER);
    expect(decisions[0].heartbeatStale).toBe(false);
    expect(reclaimable).toHaveLength(1);
    expect(reclaimable[0].siteTag).toBe('site-a');
    expect(reclaimable[0].runId).toBe('run-1');
  });

  it('does NOT reclaim a foreign-boot lock whose owner is still alive and heartbeating', () => {
    const row = lock({ boot_id: 'other-live-studio', pid: LIVE_PID, heartbeat_at: FRESH_HEARTBEAT });
    const { decisions, held } = reconcileLocks({
      locks: [row],
      bootId: getBootId(),
      now: NOW,
      isAlive: alwaysAlive,
    });
    expect(decisions[0].reclaimable).toBe(false);
    expect(decisions[0].reason).toBe(REASONS.FOREIGN_BOOT_LIVE_PID);
    expect(held).toHaveLength(1);
  });

  it('falls back to heartbeat staleness for a foreign boot with a live (possibly recycled) pid', () => {
    const row = lock({ boot_id: 'other-studio', pid: LIVE_PID, heartbeat_at: STALE_HEARTBEAT });
    const { decisions } = reconcileLocks({
      locks: [row],
      bootId: getBootId(),
      now: NOW,
      isAlive: alwaysAlive,
    });
    expect(decisions[0].reclaimable).toBe(true);
    expect(decisions[0].reason).toBe(REASONS.PREVIOUS_BOOT_HEARTBEAT_STALE);
    expect(decisions[0].heartbeatStale).toBe(true);
  });
});

describe('reconcileLocks — current boot', () => {
  it('does NOT reclaim a lock from the current boot with a live pid', () => {
    const row = lock({ boot_id: getBootId(), pid: LIVE_PID });
    const { decisions, held, reclaimable } = reconcileLocks({
      locks: [row],
      bootId: getBootId(),
      now: NOW,
      // uses the real isProcessAlive on purpose: process.pid is genuinely live
    });
    expect(decisions[0].reclaimable).toBe(false);
    expect(decisions[0].reason).toBe(REASONS.HELD_BY_THIS_PROCESS);
    expect(held).toHaveLength(1);
    expect(reclaimable).toHaveLength(0);
  });

  it('keeps holding a current-boot live lock through a merely stale heartbeat', () => {
    // Past the ordinary timeout but well inside the longer current-boot grace:
    // a live pid we minted ourselves is real evidence, so we do not steal yet.
    const row = lock({ boot_id: getBootId(), pid: LIVE_PID, heartbeat_at: STALE_HEARTBEAT });
    const { decisions } = reconcileLocks({ locks: [row], bootId: getBootId(), now: NOW });
    expect(decisions[0].reclaimable).toBe(false);
    expect(decisions[0].reason).toBe(REASONS.HELD_BY_THIS_PROCESS);
    expect(decisions[0].heartbeatStale).toBe(true);
  });

  it('reclaims a current-boot live lock whose heartbeat is grossly stale', () => {
    // The wedged-build case: the worker crashed but the recorded pid (Studio
    // itself, or a surviving parent) is still alive, so liveness alone would
    // hold this site's lock forever. The heartbeat is the backstop.
    const row = lock({
      boot_id: getBootId(),
      pid: LIVE_PID,
      heartbeat_at: new Date(NOW - 24 * 60 * 60 * 1000).toISOString(),
    });
    const { decisions, reclaimable } = reconcileLocks({
      locks: [row],
      bootId: getBootId(),
      now: NOW,
      // real liveness check — LIVE_PID is genuinely running
    });
    expect(decisions[0].reclaimable).toBe(true);
    expect(decisions[0].reason).toBe(REASONS.CURRENT_BOOT_HEARTBEAT_STALE);
    expect(decisions[0].ownerAlive).toBe(true);
    expect(decisions[0].heartbeatStale).toBe(true);
    expect(reclaimable).toHaveLength(1);
  });

  it('places the current-boot grace at the documented multiple of the ordinary timeout', () => {
    const grace = DEFAULT_HEARTBEAT_TIMEOUT_MS * CURRENT_BOOT_HEARTBEAT_TIMEOUT_MULTIPLIER;
    const at = (ageMs) =>
      reconcileLocks({
        locks: [lock({ boot_id: getBootId(), pid: LIVE_PID, heartbeat_at: NOW - ageMs })],
        bootId: getBootId(),
        now: NOW,
      }).decisions[0];

    expect(at(grace - 1).reclaimable).toBe(false);
    expect(at(grace).reclaimable).toBe(false); // boundary is exclusive
    expect(at(grace + 1).reclaimable).toBe(true);
    expect(at(grace + 1).reason).toBe(REASONS.CURRENT_BOOT_HEARTBEAT_STALE);
  });

  it('honours an explicit current-boot heartbeat timeout', () => {
    const row = lock({ boot_id: getBootId(), pid: LIVE_PID, heartbeat_at: STALE_HEARTBEAT });
    const strict = reconcileLocks({
      locks: [row], bootId: getBootId(), now: NOW, currentBootHeartbeatTimeoutMs: 1000,
    });
    expect(strict.decisions[0].reclaimable).toBe(true);
    expect(strict.decisions[0].reason).toBe(REASONS.CURRENT_BOOT_HEARTBEAT_STALE);

    const lenient = reconcileLocks({
      locks: [row], bootId: getBootId(), now: NOW, currentBootHeartbeatTimeoutMs: 60 * 60 * 1000,
    });
    expect(lenient.decisions[0].reclaimable).toBe(false);
    expect(lenient.decisions[0].reason).toBe(REASONS.HELD_BY_THIS_PROCESS);
  });

  it('treats a current-boot row with no heartbeat at all as reclaimable', () => {
    const row = lock({ boot_id: getBootId(), pid: LIVE_PID, heartbeat_at: null });
    const { decisions } = reconcileLocks({ locks: [row], bootId: getBootId(), now: NOW });
    expect(decisions[0].reclaimable).toBe(true);
    expect(decisions[0].reason).toBe(REASONS.CURRENT_BOOT_HEARTBEAT_STALE);
  });

  it('keeps a fresh current-boot heartbeat non-reclaimable', () => {
    const row = lock({ boot_id: getBootId(), pid: LIVE_PID, heartbeat_at: FRESH_HEARTBEAT });
    const { decisions } = reconcileLocks({ locks: [row], bootId: getBootId(), now: NOW });
    expect(decisions[0].reclaimable).toBe(false);
    expect(decisions[0].reason).toBe(REASONS.HELD_BY_THIS_PROCESS);
    expect(decisions[0].heartbeatStale).toBe(false);
  });

  it('reclaims a lock from the current boot whose pid is dead', () => {
    const row = lock({ boot_id: getBootId(), pid: DEAD_PID, heartbeat_at: FRESH_HEARTBEAT });
    const { decisions } = reconcileLocks({
      locks: [row],
      bootId: getBootId(),
      now: NOW,
      // real liveness check — DEAD_PID is not running
    });
    expect(decisions[0].reclaimable).toBe(true);
    expect(decisions[0].reason).toBe(REASONS.CURRENT_BOOT_DEAD_OWNER);
  });
});

describe('reconcileLocks — shape and edge cases', () => {
  it('returns an empty result for no locks', () => {
    const res = reconcileLocks({ locks: [], bootId: getBootId(), now: NOW });
    expect(res.decisions).toEqual([]);
    expect(res.reclaimable).toEqual([]);
    expect(res.held).toEqual([]);
    expect(res.maxFenceToken).toBe(0);
  });

  it('defaults to this process boot id and tolerates being called with no arguments', () => {
    const res = reconcileLocks();
    expect(res.bootId).toBe(getBootId());
    expect(res.decisions).toEqual([]);
  });

  it('tolerates a non-array locks value', () => {
    expect(reconcileLocks({ locks: null }).decisions).toEqual([]);
    expect(reconcileLocks({ locks: 'nope' }).decisions).toEqual([]);
  });

  it('reports the maximum persisted fence token so the counter can be seeded', () => {
    const res = reconcileLocks({
      locks: [
        lock({ site_tag: 'a', fence_token: 7 }),
        lock({ site_tag: 'b', fence_token: 42 }),
        lock({ site_tag: 'c', fence_token: 12 }),
      ],
      bootId: getBootId(),
      now: NOW,
    });
    expect(res.maxFenceToken).toBe(42);
  });

  it('treats a missing heartbeat as stale', () => {
    const row = lock({ boot_id: 'other', pid: LIVE_PID, heartbeat_at: null });
    const { decisions } = reconcileLocks({
      locks: [row],
      bootId: getBootId(),
      now: NOW,
      isAlive: alwaysAlive,
    });
    expect(decisions[0].heartbeatStale).toBe(true);
    expect(decisions[0].reclaimable).toBe(true);
  });

  it('accepts an epoch-ms heartbeat as well as an ISO string', () => {
    const row = lock({ boot_id: 'other', pid: LIVE_PID, heartbeat_at: NOW - 1000 });
    const { decisions } = reconcileLocks({
      locks: [row],
      bootId: getBootId(),
      now: NOW,
      isAlive: alwaysAlive,
    });
    expect(decisions[0].heartbeatStale).toBe(false);
    expect(decisions[0].reclaimable).toBe(false);
  });

  it('marks a malformed row reclaimable rather than blocking on it forever', () => {
    const { decisions } = reconcileLocks({
      locks: [null, {}, { site_tag: '' }],
      bootId: getBootId(),
      now: NOW,
    });
    expect(decisions).toHaveLength(3);
    for (const d of decisions) {
      expect(d.reclaimable).toBe(true);
      expect(d.reason).toBe(REASONS.MALFORMED);
    }
  });

  it('classifies a mixed set of rows independently', () => {
    const res = reconcileLocks({
      locks: [
        lock({ site_tag: 'mine-live', boot_id: getBootId(), pid: LIVE_PID }),
        lock({ site_tag: 'mine-dead', boot_id: getBootId(), pid: DEAD_PID }),
        lock({ site_tag: 'orphan', boot_id: 'previous-boot', pid: DEAD_PID }),
      ],
      bootId: getBootId(),
      now: NOW,
    });
    expect(res.held.map((d) => d.siteTag)).toEqual(['mine-live']);
    expect(res.reclaimable.map((d) => d.siteTag).sort()).toEqual(['mine-dead', 'orphan']);
  });

  it('honours a custom heartbeat timeout', () => {
    const row = lock({ boot_id: 'other', pid: LIVE_PID, heartbeat_at: new Date(NOW - 5000).toISOString() });
    const strict = reconcileLocks({
      locks: [row], bootId: getBootId(), now: NOW, heartbeatTimeoutMs: 1000, isAlive: alwaysAlive,
    });
    expect(strict.decisions[0].reclaimable).toBe(true);
    const lenient = reconcileLocks({
      locks: [row], bootId: getBootId(), now: NOW, heartbeatTimeoutMs: 60000, isAlive: alwaysAlive,
    });
    expect(lenient.decisions[0].reclaimable).toBe(false);
  });
});

describe('classifyLock', () => {
  it('is usable directly for a single row', () => {
    const d = classifyLock(lock({ boot_id: 'old', pid: DEAD_PID }), {
      bootId: getBootId(),
      now: NOW,
      heartbeatTimeoutMs: DEFAULT_HEARTBEAT_TIMEOUT_MS,
      isAlive: alwaysDead,
    });
    expect(d).toMatchObject({
      siteTag: 'site-a',
      runId: 'run-1',
      pid: DEAD_PID,
      bootId: 'old',
      fenceToken: 100,
      reclaimable: true,
      reason: REASONS.PREVIOUS_BOOT_DEAD_OWNER,
      ownerAlive: false,
    });
  });
});
