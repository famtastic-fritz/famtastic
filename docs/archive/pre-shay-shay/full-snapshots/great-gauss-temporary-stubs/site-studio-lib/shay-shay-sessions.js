// TEMPORARY STUB — pending restoration of original implementation.
// The original module was never committed and is missing from the working tree.
// This stub preserves the in-process call surface used by server.js so Studio
// can boot. It does not persist sessions across restarts.
//
// Surface required by server.js:
//   getOrCreate(id) -> session object with mutable { id, studioTier, forcedBrain }
//   get(id)         -> existing session or undefined
//   resetAll()      -> clears all sessions
//
// See SITE-LEARNINGS.md "Known Gaps" for restoration tracking.

const sessions = new Map();

function getOrCreate(id) {
  if (!id) return null;
  const key = String(id);
  let s = sessions.get(key);
  if (!s) {
    s = { id: key, studioTier: false, forcedBrain: null };
    sessions.set(key, s);
  }
  return s;
}

function get(id) {
  if (!id) return undefined;
  return sessions.get(String(id));
}

function resetAll() {
  sessions.clear();
}

module.exports = { getOrCreate, get, resetAll };
