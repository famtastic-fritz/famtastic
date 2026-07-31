'use strict';
/**
 * lib/site-paths.js — Phase 1, Task 1.3.
 *
 * Every derived site path (site dir, dist dir, conversation log, spec, studio
 * record) used to be a zero-argument function closing over the mutable global
 * `TAG` in server.js. That made the *current* site an ambient authority: a site
 * switch mid-build silently repointed every path in flight.
 *
 * These factories take an EXPLICIT `siteTag`. Passing no argument is still
 * accepted while the ~90 legacy call sites are migrated one at a time, but:
 *
 *   - under `STUDIO_STRICT_AUTHORITY=1` a zero-argument call THROWS, naming the
 *     helper, so the remaining ambient reads are findable by running the suite
 *     in strict mode; and
 *   - otherwise it falls back to the operator's selected site, which is the
 *     pre-existing behaviour.
 *
 * The strict flag is read at call time, not at module load, so a test can flip
 * it around a single call.
 */

const path = require('path');
// NOTE: assertSafeTag is deliberately NOT used here. Canonical-shape validation
// is a route-layer concern (lib/security.js validateTagParam). See the comment on
// assertContainedTag below for why enforcing shape at this layer was a defect.

/** True when ambient (zero-argument) site authority is forbidden. */
function isStrictAuthority() {
  return process.env.STUDIO_STRICT_AUTHORITY === '1';
}

/**
 * Every tag reaching this module — explicit or fallback — is validated for
 * CONTAINMENT, not for canonical shape.
 *
 * The split matters and was originally got wrong. Two different rules were being
 * enforced in one place:
 *
 *   - *Containment* ("cannot escape sitesRoot") is a security property. It must
 *     hold for every tag from every source, always. That is this function.
 *   - *Canonical shape* (`^site-[a-z0-9][a-z0-9-]{1,80}$`) is input validation
 *     for tags arriving from a REQUEST. It belongs at the route layer, where
 *     Phase 0 already put it (`validateTagParam` in lib/security.js) and where a
 *     bad value can be answered with a 400.
 *
 * Applying the shape check here broke legitimate operation: `~/famtastic/sites`
 * holds eight pre-convention directories (auntie-gale-garage-sales, ncs-demo,
 * restaurant, readings-by-maria, …). Because `resolveTag` ran `assertSafeTag` on
 * any *explicitly passed* tag, and central callers like `readSpec` resolve a tag
 * and then pass the result back in explicitly, those sites threw on every spec
 * read — where the previous plain `path.join` had always worked.
 *
 * Containment is what actually stops traversal, and it still does: `..`, `/`,
 * `\`, `.` and absolute paths are rejected regardless of provenance.
 */
function assertContainedTag(tag, helper) {
  if (typeof tag !== 'string' || tag.trim() === '') {
    throw new Error(`${helper}(): no siteTag and no operator site selected`);
  }
  if (
    tag.includes('/') ||
    tag.includes('\\') ||
    tag.includes('..') ||
    tag === '.' ||
    path.isAbsolute(tag)
  ) {
    // Message deliberately does not say "operator" — this guard now runs for
    // explicit tags too, and a misleading message sent an earlier debugging pass
    // looking in the wrong place.
    throw new Error(`${helper}(): unsafe site tag ${JSON.stringify(tag)}`);
  }
  return tag;
}

/**
 * @param {object} opts
 * @param {string} opts.sitesRoot        absolute path containing every site dir
 * @param {function|string} opts.fallbackTag  operator-selected site, used only
 *                                            when a caller passes no siteTag and
 *                                            strict authority is off
 */
function createSitePaths({ sitesRoot, fallbackTag }) {
  if (!sitesRoot) throw new Error('createSitePaths: sitesRoot required');

  /**
   * Resolve the tag a helper should operate on. Explicit always wins.
   *
   * Idempotent by construction: because both branches enforce the same
   * containment rule, `resolveTag(resolveTag(t)) === resolveTag(t)`. That
   * property is what makes the double-resolve pattern in callers such as
   * `readSpec`/`writeSpec` (resolve once, then pass the result into `SPEC_FILE`)
   * harmless rather than fatal. It is asserted in tests/site-paths.test.js.
   */
  function resolveTag(siteTag, helper = 'sitePath') {
    if (siteTag !== undefined && siteTag !== null && siteTag !== '') {
      return assertContainedTag(siteTag, helper);
    }
    if (isStrictAuthority()) {
      throw new Error(
        `${helper}() called with no siteTag while STUDIO_STRICT_AUTHORITY=1 — ` +
        'site authority must be passed explicitly (req.ctx.siteTag / run record).',
      );
    }
    const fb = typeof fallbackTag === 'function' ? fallbackTag() : fallbackTag;
    return assertContainedTag(fb, helper);
  }

  /**
   * Join an ALREADY-RESOLVED tag onto the sites root.
   *
   * Every public helper resolves its tag exactly ONCE and then calls this. The
   * earlier shape — `DIST_DIR = t => path.join(SITE_DIR(resolveTag(t)), 'dist')`
   * — resolved twice: the second pass saw the resolved tag as an *explicit*
   * argument and ran it through `assertSafeTag`, so a legacy operator fallback
   * that `SITE_DIR()` accepted (e.g. `readings-by-maria`) threw in every other
   * helper. Resolving once preserves the documented fallback leniency without
   * loosening the explicit-tag traversal guard.
   */
  const siteDirOf = (resolvedTag) => path.join(sitesRoot, resolvedTag);
  const distDirOf = (resolvedTag) => path.join(siteDirOf(resolvedTag), 'dist');
  const distVnextDirOf = (resolvedTag) => path.join(siteDirOf(resolvedTag), 'dist-vnext');

  const SITE_DIR      = (siteTag) => siteDirOf(resolveTag(siteTag, 'SITE_DIR'));
  const DIST_DIR      = (siteTag) => distDirOf(resolveTag(siteTag, 'DIST_DIR'));
  const DIST_VNEXT_DIR = (siteTag) => distVnextDirOf(resolveTag(siteTag, 'DIST_VNEXT_DIR'));
  const CONVO_FILE    = (siteTag) => path.join(siteDirOf(resolveTag(siteTag, 'CONVO_FILE')), 'conversation.jsonl');
  const SPEC_FILE     = (siteTag) => path.join(siteDirOf(resolveTag(siteTag, 'SPEC_FILE')), 'spec.json');
  const STUDIO_FILE   = (siteTag) => path.join(siteDirOf(resolveTag(siteTag, 'STUDIO_FILE')), '.studio.json');
  const VERSIONS_DIR  = (siteTag) => path.join(distDirOf(resolveTag(siteTag, 'VERSIONS_DIR')), '.versions');
  const SUMMARIES_DIR = (siteTag) => path.join(siteDirOf(resolveTag(siteTag, 'SUMMARIES_DIR')), 'summaries');
  const UPLOADS_DIR   = (siteTag) => path.join(distDirOf(resolveTag(siteTag, 'UPLOADS_DIR')), 'assets', 'uploads');

  return {
    resolveTag,
    SITE_DIR,
    DIST_DIR,
    DIST_VNEXT_DIR,
    CONVO_FILE,
    SPEC_FILE,
    STUDIO_FILE,
    VERSIONS_DIR,
    SUMMARIES_DIR,
    UPLOADS_DIR,
  };
}

module.exports = { createSitePaths, isStrictAuthority };
