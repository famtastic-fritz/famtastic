'use strict';
/**
 * lib/security.js — Phase 0 containment primitives.
 *
 * Site Studio historically bound to every interface and exposed high-privilege
 * routes (PTY, bridge exec, codex exec, lifecycle, settings) with no auth. This
 * module provides the two guards used to close that hole:
 *
 *   1. bindHost()      — default the listen address to loopback.
 *   2. requireLoopback — reject privileged requests that did not originate on
 *                        this machine, so widening the bind address later does
 *                        not silently re-open remote code execution.
 *
 * These are containment, not a real authn/authz story. Phase 1+ replaces the
 * loopback guard with per-request identity once authority stops living in the
 * mutable global TAG.
 */

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * Listen address for the HTTP + preview servers.
 * Set STUDIO_HOST explicitly to widen it; nothing else should.
 */
function bindHost() {
  return process.env.STUDIO_HOST || '127.0.0.1';
}

function isLoopbackAddress(addr) {
  if (!addr) return false;
  return LOOPBACK.has(addr);
}

/**
 * Express middleware — allow only same-machine callers.
 * Deliberately ignores X-Forwarded-For: this server must not sit behind a proxy
 * that would let a spoofed header grant shell access.
 */
function requireLoopback(req, res, next) {
  const addr = req.socket && req.socket.remoteAddress;
  if (isLoopbackAddress(addr)) return next();
  console.warn(`[security] blocked non-loopback ${req.method} ${req.originalUrl} from ${addr}`);
  return res.status(403).json({ error: 'This endpoint is restricted to local requests.' });
}

/** Same check for raw sockets (WebSocket upgrade handlers). */
function isLoopbackRequest(request) {
  return isLoopbackAddress(request && request.socket && request.socket.remoteAddress);
}

/**
 * Site tags are used as filesystem path segments. Anything that does not match
 * this shape can escape SITES_ROOT (".." being the obvious case).
 */
function isSafeTag(tag) {
  return typeof tag === 'string'
    && /^site-[a-z0-9][a-z0-9-]{1,80}$/i.test(tag)
    && !tag.includes('..');
}

/**
 * Throwing variant for internal call sites that take a tag override.
 * Returns the tag so it can be used inline: path.join(root, assertSafeTag(t))
 */
function assertSafeTag(tag) {
  if (!isSafeTag(tag)) {
    throw new Error(`Unsafe site tag: ${JSON.stringify(tag)}`);
  }
  return tag;
}

/** Express guard — 400s on a bad tag in req.body.tag / req.params.tag / req.query.tag. */
function validateTagParam(source = 'body', field = 'tag') {
  return (req, res, next) => {
    const tag = req[source] && req[source][field];
    if (tag === undefined || tag === null || tag === '') {
      return res.status(400).json({ error: `${field} required` });
    }
    if (!isSafeTag(tag)) {
      return res.status(400).json({ error: `Invalid site tag: ${String(tag).slice(0, 64)}` });
    }
    next();
  };
}

/** Terminal (PTY) is opt-out: set STUDIO_ENABLE_TERMINAL=0 to remove it entirely. */
function terminalEnabled() {
  return process.env.STUDIO_ENABLE_TERMINAL !== '0';
}

module.exports = {
  bindHost,
  requireLoopback,
  isLoopbackRequest,
  isLoopbackAddress,
  isSafeTag,
  assertSafeTag,
  validateTagParam,
  terminalEnabled,
};
