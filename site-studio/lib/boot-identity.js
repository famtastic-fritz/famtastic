'use strict';
/**
 * lib/boot-identity.js — Phase 1 / Task 1.6 (E7): boot identity and lock fencing.
 *
 * WHY THIS EXISTS
 * ---------------
 * Task 1.5 moves build locks off the in-memory WebSocket object and into a
 * persisted `build_locks (site_tag PK, run_id, pid, boot_id, fence_token,
 * heartbeat_at)` table. Persistence fixes lock loss on crash, but introduces a
 * new failure mode: when launchd restarts Studio mid-build, the NEW process
 * boots, reads `build_locks`, and finds a row owned by its own dead
 * predecessor. Without reconciliation the fresh process is blocked by its own
 * corpse until the heartbeat timeout expires — potentially minutes of an
 * unusable builder after a one-second restart.
 *
 * This module supplies the three primitives needed to fix that, and nothing
 * else. It is deliberately PURE and side-effect free apart from generating a
 * per-process UUID and advancing an in-memory counter:
 *
 *   1. getBootId()        — a UUID minted once per process
 *   2. nextFenceToken()   — a monotonically increasing acquisition token
 *   3. reconcileLocks()   — given lock rows + the current boot id, decide for
 *                           each row whether it is reclaimable or genuinely held
 *
 * It does NOT open the database and does NOT bind to the server. `server.js`
 * (owned by another task) wires it up: reconcile transactionally BEFORE
 * `listen()`, delete/steal the reclaimable rows, and stamp every resumed
 * attempt with a fresh fence token.
 */

const crypto = require('crypto');

// ── Boot identity ────────────────────────────────────────────────────────────

/**
 * Minted exactly once, at module load, for the lifetime of this process.
 * Every lock this process writes carries this value. Any lock row carrying a
 * different boot id was written by a different Studio process — either a dead
 * predecessor (the launchd-restart case) or a genuine concurrent instance.
 */
const BOOT_ID = crypto.randomUUID();

/** @returns {string} the UUID identifying this process incarnation. */
function getBootId() {
  return BOOT_ID;
}

// ── Fence tokens ─────────────────────────────────────────────────────────────

/**
 * Fence tokens make a stolen lock safe. When a lock is reclaimed the new owner
 * gets a strictly higher token; any late write from the old owner (a zombie
 * child process, a delayed async callback) carries a lower token and must be
 * rejected. See `isFenceCurrent`.
 *
 * The counter is seeded from the wall clock so that tokens keep increasing
 * across process restarts even before any persisted row has been observed.
 * `seedFenceToken` raises the floor from the max token found in `build_locks`,
 * which covers a backwards clock step.
 */
let _fenceCounter = Date.now();

/** @returns {number} a token strictly greater than every token handed out before it. */
function nextFenceToken() {
  _fenceCounter += 1;
  return _fenceCounter;
}

/**
 * Raise the fence floor to at least `token`. Call at boot with the maximum
 * `fence_token` observed in `build_locks` so a restarted process can never
 * reissue a token a previous incarnation already used.
 * @param {number} token
 * @returns {number} the resulting floor.
 */
function seedFenceToken(token) {
  const n = Number(token);
  if (Number.isFinite(n) && n > _fenceCounter) _fenceCounter = n;
  return _fenceCounter;
}

/**
 * A write guarded by a lock is valid only if the writer's token is still the
 * one recorded on the lock row. A lower token means the lock was stolen out
 * from under the writer.
 * @param {{fence_token?: number}} lockRow
 * @param {number} token
 */
function isFenceCurrent(lockRow, token) {
  if (!lockRow) return false;
  return Number(token) >= Number(lockRow.fence_token);
}

// ── Liveness ─────────────────────────────────────────────────────────────────

/**
 * Is a process with this pid currently running?
 *
 * `process.kill(pid, 0)` sends no signal; it only performs the existence and
 * permission check. ESRCH means no such process. EPERM means the process
 * exists but is owned by another user — still alive for our purposes.
 *
 * RESIDUAL RISK — PID RECYCLING.
 * A pid is not a stable identity. The kernel recycles pids, so a pid recorded
 * hours ago may now belong to a completely unrelated program. A bare
 * `isProcessAlive(pid)` check can therefore report "alive" for a lock whose
 * real owner died long ago, leaving the lock unreclaimable until the heartbeat
 * timeout. It can never report "dead" for a live owner, so it is safe in the
 * direction that matters (we never steal a lock from a running builder).
 *
 * We narrow the window by pairing the pid with the boot id: a pid is only
 * trusted as proof of liveness when the row's `boot_id` matches the CURRENT
 * process's boot id, i.e. the row was written by this very incarnation, so
 * the pid cannot have been recycled since without this process also having
 * died. For rows from a foreign boot id, a live-looking pid is treated as
 * merely "unproven", and the heartbeat timeout remains the backstop. That is
 * the correct trade: reclaiming immediately is an optimization for the common
 * restart case, and the conservative path costs only latency, never
 * correctness.
 *
 * @param {number} pid
 * @returns {boolean}
 */
function isProcessAlive(pid) {
  const n = Number(pid);
  if (!Number.isInteger(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch (err) {
    if (err && err.code === 'EPERM') return true; // exists, not ours to signal
    return false; // ESRCH (and anything else we cannot interpret)
  }
}

// ── Reconciliation ───────────────────────────────────────────────────────────

const DEFAULT_HEARTBEAT_TIMEOUT_MS = 90_000;

/**
 * How much longer than the ordinary heartbeat timeout a CURRENT-boot lock with
 * a live pid is allowed to go silent before we reclaim it anyway.
 *
 * WHY A SEPARATE, LONGER THRESHOLD.
 * For a foreign-boot row a live pid proves nothing (it may be recycled), so the
 * ordinary timeout is the only evidence we have. For a current-boot row the pid
 * is trustworthy — it cannot have been recycled without this process also having
 * died — so a live pid IS real evidence that the owner still exists, and we
 * should be slower to steal from it than from a stranger.
 *
 * But "the process exists" is not "the build is progressing". The pid recorded
 * on the row may be Studio's own pid, or a parent that outlives the worker that
 * actually crashed. If we trust liveness alone, such a row is NEVER reclaimable:
 * the pid stays alive for as long as Studio runs, and the site's lock is wedged
 * permanently — a build that lost its worker locks that site out until restart.
 * The heartbeat is the only signal that distinguishes "working" from "wedged",
 * so it must remain a backstop even here.
 *
 * 10x the ordinary timeout (15 minutes at the 90s default) is the chosen trade:
 * it is far beyond any plausible GC pause, disk stall, or slow build step that
 * could delay a heartbeat on a healthy run, while still bounding the damage of a
 * lost worker to minutes instead of forever.
 */
const CURRENT_BOOT_HEARTBEAT_TIMEOUT_MULTIPLIER = 10;

const REASONS = {
  PREVIOUS_BOOT_DEAD_OWNER: 'previous_boot_dead_owner',
  PREVIOUS_BOOT_HEARTBEAT_STALE: 'previous_boot_heartbeat_stale',
  FOREIGN_BOOT_LIVE_PID: 'foreign_boot_live_pid',
  CURRENT_BOOT_DEAD_OWNER: 'current_boot_dead_owner',
  CURRENT_BOOT_HEARTBEAT_STALE: 'current_boot_heartbeat_stale',
  HELD_BY_THIS_PROCESS: 'held_by_this_process',
  MALFORMED: 'malformed_lock_row',
};

function _parseTs(value) {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/**
 * Classify one persisted lock row against the current boot.
 * Pure: no clock reads, no db, no process state beyond the injected `isAlive`.
 *
 * @param {object} lock          a `build_locks` row
 * @param {object} opts
 * @param {string} opts.bootId   the current process boot id
 * @param {number} opts.now      epoch ms "now"
 * @param {number} opts.heartbeatTimeoutMs
 * @param {number} [opts.currentBootHeartbeatTimeoutMs] longer grace for our own
 *        rows; defaults to `heartbeatTimeoutMs * CURRENT_BOOT_HEARTBEAT_TIMEOUT_MULTIPLIER`
 * @param {(pid:number)=>boolean} opts.isAlive
 */
function classifyLock(lock, { bootId, now, heartbeatTimeoutMs, currentBootHeartbeatTimeoutMs, isAlive }) {
  const siteTag = lock ? lock.site_tag : undefined;
  const base = {
    siteTag,
    runId: lock ? lock.run_id : undefined,
    pid: lock ? lock.pid : undefined,
    bootId: lock ? lock.boot_id : undefined,
    fenceToken: lock ? lock.fence_token : undefined,
  };

  if (!lock || typeof lock !== 'object' || !siteTag) {
    return { ...base, reclaimable: true, reason: REASONS.MALFORMED, ownerAlive: false, heartbeatStale: true };
  }

  const heartbeatAt = _parseTs(lock.heartbeat_at);
  const heartbeatStale =
    heartbeatAt == null ? true : now - heartbeatAt > heartbeatTimeoutMs;

  const sameBoot = lock.boot_id === bootId;

  if (sameBoot) {
    // The row was written by THIS incarnation, so its pid cannot have been
    // recycled behind our back without this process also dying. A liveness
    // check on it is therefore trustworthy.
    const ownerAlive = isAlive(lock.pid);
    if (ownerAlive) {
      // A live pid is real evidence here, but not proof of progress: the pid may
      // be a parent that outlived the worker that actually crashed. Without this
      // backstop such a row would be unreclaimable for as long as Studio runs.
      const graceMs = Number.isFinite(Number(currentBootHeartbeatTimeoutMs))
        ? Number(currentBootHeartbeatTimeoutMs)
        : heartbeatTimeoutMs * CURRENT_BOOT_HEARTBEAT_TIMEOUT_MULTIPLIER;
      // A null heartbeat counts as grossly stale, matching how every other
      // branch in this module treats a missing heartbeat. Writers must stamp
      // `heartbeat_at` in the same statement that inserts the lock row.
      const grosslyStale = heartbeatAt == null ? true : now - heartbeatAt > graceMs;
      if (grosslyStale) {
        return {
          ...base,
          reclaimable: true,
          reason: REASONS.CURRENT_BOOT_HEARTBEAT_STALE,
          ownerAlive: true,
          heartbeatStale: true,
        };
      }
      return { ...base, reclaimable: false, reason: REASONS.HELD_BY_THIS_PROCESS, ownerAlive: true, heartbeatStale };
    }
    // Our own worker died (crashed child, killed pid) — reclaim now, no wait.
    return { ...base, reclaimable: true, reason: REASONS.CURRENT_BOOT_DEAD_OWNER, ownerAlive: false, heartbeatStale };
  }

  // Different boot id: written by another Studio incarnation.
  const ownerAlive = isAlive(lock.pid);
  if (!ownerAlive) {
    // THE LAUNCHD RESTART CASE. Previous boot, owner process gone: the lock is
    // provably orphaned. Reclaim immediately — do NOT wait out the heartbeat.
    return { ...base, reclaimable: true, reason: REASONS.PREVIOUS_BOOT_DEAD_OWNER, ownerAlive: false, heartbeatStale };
  }
  // Foreign boot with a live-looking pid. Either a genuinely concurrent Studio
  // or a recycled pid. We cannot tell them apart, so fall back to the
  // heartbeat: only a stale heartbeat justifies stealing the lock.
  if (heartbeatStale) {
    return { ...base, reclaimable: true, reason: REASONS.PREVIOUS_BOOT_HEARTBEAT_STALE, ownerAlive: true, heartbeatStale: true };
  }
  return { ...base, reclaimable: false, reason: REASONS.FOREIGN_BOOT_LIVE_PID, ownerAlive: true, heartbeatStale: false };
}

/**
 * Decide, for every persisted lock row, whether this process may reclaim it.
 *
 * Pure function: rows in, decisions out. The caller owns the transaction that
 * deletes/steals the reclaimable rows and the `listen()` call that must follow
 * it.
 *
 * @param {object} args
 * @param {Array<object>} args.locks   `build_locks` rows
 * @param {string} [args.bootId]       defaults to this process's boot id
 * @param {number} [args.now]          epoch ms, defaults to Date.now()
 * @param {number} [args.heartbeatTimeoutMs]
 * @param {number} [args.currentBootHeartbeatTimeoutMs]
 * @param {(pid:number)=>boolean} [args.isAlive] injectable for tests
 * @returns {{bootId:string, decisions:Array, reclaimable:Array, held:Array, maxFenceToken:number}}
 */
function reconcileLocks({
  locks = [],
  bootId = BOOT_ID,
  now = Date.now(),
  heartbeatTimeoutMs = DEFAULT_HEARTBEAT_TIMEOUT_MS,
  currentBootHeartbeatTimeoutMs = heartbeatTimeoutMs * CURRENT_BOOT_HEARTBEAT_TIMEOUT_MULTIPLIER,
  isAlive = isProcessAlive,
} = {}) {
  const rows = Array.isArray(locks) ? locks : [];
  const decisions = rows.map((lock) =>
    classifyLock(lock, { bootId, now, heartbeatTimeoutMs, currentBootHeartbeatTimeoutMs, isAlive })
  );

  let maxFenceToken = 0;
  for (const row of rows) {
    const t = Number(row && row.fence_token);
    if (Number.isFinite(t) && t > maxFenceToken) maxFenceToken = t;
  }

  return {
    bootId,
    decisions,
    reclaimable: decisions.filter((d) => d.reclaimable),
    held: decisions.filter((d) => !d.reclaimable),
    maxFenceToken,
  };
}

module.exports = {
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
};
