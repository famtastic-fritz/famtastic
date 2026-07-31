/**
 * lib/site-paths.js — containment vs. canonical shape.
 *
 * Regression coverage for a defect introduced during the Phase 1 authority
 * migration and missed by two separate delegated passes, both of which reasoned
 * from the source rather than running it.
 *
 * The defect: `resolveTag` applied `assertSafeTag` (canonical `site-…` shape) to
 * any EXPLICITLY passed tag, while the operator fallback branch applied only a
 * containment check. Central callers — `readSpec`/`writeSpec` in server.js —
 * resolve a tag and then pass the result back in explicitly, so a lenient
 * fallback tag was laundered into the strict branch and threw. Every one of the
 * eight pre-convention site directories in ~/famtastic/sites
 * (auntie-gale-garage-sales, ncs-demo, restaurant, readings-by-maria, …) failed
 * on every spec read, where a plain path.join had always worked.
 *
 * The fix separates the two rules by layer:
 *   - containment ("cannot escape sitesRoot") — a security property, enforced
 *     here for every tag regardless of provenance;
 *   - canonical shape — request input validation, enforced at the route layer by
 *     validateTagParam (lib/security.js), where it can answer 400.
 *
 * Because both branches now enforce the same rule, resolveTag is idempotent, and
 * the double-resolve pattern in callers is harmless rather than fatal.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { createSitePaths } = require('../lib/site-paths');

const SITES_ROOT = '/tmp/site-paths-test-root';

const HELPERS = [
  'SITE_DIR',
  'DIST_DIR',
  'SPEC_FILE',
  'CONVO_FILE',
  'STUDIO_FILE',
  'VERSIONS_DIR',
  'SUMMARIES_DIR',
  'UPLOADS_DIR',
];

// Real directory names from ~/famtastic/sites that predate the `site-` convention.
const LEGACY_TAGS = [
  'auntie-gale-garage-sales',
  'guys-classy-shoes',
  'ncs-demo',
  'poc-site',
  'readings-by-maria',
  'restaurant',
  'the-best-lawn-care',
];

const TRAVERSAL_TAGS = [
  '../../etc',
  'site-a/../site-b',
  '/abs',
  '..',
  '.',
  'a\\b',
  'a/b',
];

function paths(fallbackTag = 'site-demo') {
  return createSitePaths({ sitesRoot: SITES_ROOT, fallbackTag: () => fallbackTag });
}

/**
 * Run `fn` with STUDIO_STRICT_AUTHORITY neutralised, then restore whatever the
 * environment had — including "not set at all".
 *
 * Every assertion about the NON-strict operator fallback must be wrapped in
 * this. Without it those assertions silently depend on the ambient environment:
 * under `STUDIO_STRICT_AUTHORITY=1 npx vitest run` they failed, not because the
 * fallback was broken but because the harness never neutralised the flag. That
 * turned the strict suite — whose whole job is to enumerate the remaining
 * ambient reads — into a list padded with test-harness noise, which is the one
 * thing a worklist must not be.
 *
 * `isStrictAuthority()` reads process.env at CALL time, not at module load, so
 * flipping it around a single call is sufficient and needs no module reset.
 */
function withoutStrictAuthority(fn) {
  const prev = process.env.STUDIO_STRICT_AUTHORITY;
  delete process.env.STUDIO_STRICT_AUTHORITY;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.STUDIO_STRICT_AUTHORITY;
    else process.env.STUDIO_STRICT_AUTHORITY = prev;
  }
}

/** The mirror of withoutStrictAuthority, for assertions ABOUT strict mode. */
function withStrictAuthority(fn) {
  const prev = process.env.STUDIO_STRICT_AUTHORITY;
  process.env.STUDIO_STRICT_AUTHORITY = '1';
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.STUDIO_STRICT_AUTHORITY;
    else process.env.STUDIO_STRICT_AUTHORITY = prev;
  }
}

describe('legacy (non-canonical) site tags', () => {
  it('resolve through every helper via the operator fallback', () => {
    withoutStrictAuthority(() => {
      for (const tag of LEGACY_TAGS) {
        const sp = paths(tag);
        for (const helper of HELPERS) {
          expect(() => sp[helper](), `${helper}() with fallback ${tag}`).not.toThrow();
          expect(sp[helper]()).toContain(tag);
        }
      }
    });
  });

  it('resolve through every helper when passed EXPLICITLY — the actual regression', () => {
    // This is the exact shape of readSpec(): resolve once, then hand the result
    // back to SPEC_FILE(). Before the fix, every helper here threw
    // 'Unsafe site tag' while SITE_DIR() alone succeeded.
    for (const tag of LEGACY_TAGS) {
      const sp = paths(tag);
      // Only the fallback resolve needs the flag neutralised; the explicit-tag
      // assertions below are legal in strict mode and are deliberately left
      // outside the wrapper so they run under both.
      const resolved = withoutStrictAuthority(() => sp.resolveTag(undefined, 'readSpec'));
      expect(resolved).toBe(tag);
      for (const helper of HELPERS) {
        expect(() => sp[helper](resolved), `${helper}(${tag}) explicit`).not.toThrow();
      }
    }
  });
});

describe('resolveTag idempotence', () => {
  it('is a fixed point, so double-resolving callers are safe', () => {
    const sp = paths('readings-by-maria');
    for (const tag of [...LEGACY_TAGS, 'site-demo']) {
      expect(sp.resolveTag(sp.resolveTag(tag))).toBe(sp.resolveTag(tag));
    }
    const fromFallback = withoutStrictAuthority(() => sp.resolveTag(undefined, 'readSpec'));
    expect(sp.resolveTag(fromFallback)).toBe(fromFallback);
  });
});

describe('containment is still enforced — this is the security boundary', () => {
  it('rejects traversal on an EXPLICIT tag in every helper', () => {
    const sp = paths();
    for (const bad of TRAVERSAL_TAGS) {
      for (const helper of HELPERS) {
        expect(() => sp[helper](bad), `${helper}(${JSON.stringify(bad)})`).toThrow();
      }
    }
  });

  it('rejects traversal arriving through the operator fallback', () => {
    // Neutralised deliberately: under an ambient STUDIO_STRICT_AUTHORITY=1 these
    // calls throw the strict-authority error, so the assertion would pass
    // without the containment guard ever running — a test green for the wrong
    // reason. The message match pins it to containment.
    withoutStrictAuthority(() => {
      for (const bad of TRAVERSAL_TAGS) {
        const sp = paths(bad);
        for (const helper of HELPERS) {
          expect(() => sp[helper](), `${helper}() fallback ${JSON.stringify(bad)}`)
            .toThrow(/unsafe site tag/);
        }
      }
    });
  });

  it('no resolvable tag can escape the sites root', () => {
    const sp = paths();
    for (const tag of LEGACY_TAGS) {
      for (const helper of HELPERS) {
        expect(sp[helper](tag).startsWith(`${SITES_ROOT}/`)).toBe(true);
      }
    }
  });

  it('rejects an empty or missing operator selection', () => {
    withoutStrictAuthority(() => {
      for (const empty of ['', '   ', null, undefined]) {
        const sp = createSitePaths({ sitesRoot: SITES_ROOT, fallbackTag: () => empty });
        expect(() => sp.SITE_DIR()).toThrow(/no operator site selected/);
      }
    });
  });
});

describe('canonical tags are unaffected', () => {
  it('still resolve normally', () => {
    const sp = paths();
    expect(sp.SITE_DIR('site-demo')).toBe(`${SITES_ROOT}/site-demo`);
    expect(sp.DIST_DIR('site-demo')).toBe(`${SITES_ROOT}/site-demo/dist`);
    expect(sp.SPEC_FILE('site-demo')).toBe(`${SITES_ROOT}/site-demo/spec.json`);
  });
});

describe('strict authority mode', () => {
  it('throws on a zero-argument call and names the helper', () => {
    withStrictAuthority(() => {
      const sp = paths();
      expect(() => sp.SPEC_FILE()).toThrow(/SPEC_FILE/);
      // An explicit tag remains legal under strict mode — that is the point.
      expect(() => sp.SPEC_FILE('site-demo')).not.toThrow();
    });
  });

  it('throws for EVERY helper, naming each one — this is what makes the suite a worklist', () => {
    withStrictAuthority(() => {
      const sp = paths();
      for (const helper of HELPERS) {
        expect(() => sp[helper](), `${helper}() under strict`)
          .toThrow(new RegExp(`^${helper}\\(\\) called with no siteTag`));
      }
    });
  });

  it('restores the previous flag value, including "unset"', () => {
    const prev = process.env.STUDIO_STRICT_AUTHORITY;
    withStrictAuthority(() => {
      expect(process.env.STUDIO_STRICT_AUTHORITY).toBe('1');
      withoutStrictAuthority(() => {
        expect(process.env.STUDIO_STRICT_AUTHORITY).toBeUndefined();
      });
      expect(process.env.STUDIO_STRICT_AUTHORITY).toBe('1');
    });
    expect(process.env.STUDIO_STRICT_AUTHORITY).toBe(prev);
  });
});
