// TEMPORARY STUB — pending restoration of original implementation.
// The original module was never committed and is missing from the working tree.
// This stub preserves the call surface used by server.js (logger.middleware,
// logger.tail) so Studio can boot. It keeps a small in-memory ring buffer of
// request lines; it does NOT write to disk and is lost on restart.
//
// See SITE-LEARNINGS.md "Known Gaps" for restoration tracking.

const RING_MAX = 1000;
const ring = [];

function push(line) {
  ring.push(line);
  if (ring.length > RING_MAX) ring.splice(0, ring.length - RING_MAX);
}

function middleware() {
  return function (req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
      const dur = Date.now() - start;
      const line = `${new Date().toISOString()} ${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${dur}ms`;
      push(line);
    });
    next();
  };
}

function tail(n) {
  const count = Math.max(1, Math.min(RING_MAX, parseInt(n, 10) || 100));
  return ring.slice(-count);
}

module.exports = { middleware, tail };
