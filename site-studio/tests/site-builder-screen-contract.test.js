import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCREEN_PATH = path.join(HERE, '..', 'public', 'studio', 'src', 'screens', 'site-builder.jsx');

/**
 * Site Builder screen — Operator V1 build contract.
 *
 * No JSX test harness exists in this repo; the established convention
 * (tests/unit.test.js) is to read shipped browser source verbatim and assert
 * the wiring it must contain. This test pins the V1 contract of
 * public/studio/src/screens/site-builder.jsx:
 *
 *   1. builds via POST /api/site-studio/build-vnext with an explicit siteTag
 *      (never omitted — the server 400s without it) and the operator brief;
 *   2. does not gate the build on the embedded /index.html chat or a WebSocket;
 *   3. polls GET /api/site-studio/build-vnext/status over HTTP until a terminal
 *      status (published | failed);
 *   4. exposes the preview via GET /api/site-studio/preview-url;
 *   5. requires a selected site before building;
 *   6. keeps the legacy embedded chat reachable, clearly marked legacy.
 */
describe('Site Builder screen — Operator V1 build contract', () => {
  const src = fs.readFileSync(SCREEN_PATH, 'utf8');

  it('posts siteTag and brief to /api/site-studio/build-vnext', () => {
    expect(src).toContain('"/api/site-studio/build-vnext"');
    expect(src).toContain('siteTag: tag');
    expect(src).toContain('brief:');
    expect(src).toContain('method: "POST"');
  });

  it('never sends a build without an explicit site tag', () => {
    // The build handler must bail out when no site is selected — there is no
    // `siteTag || undefined` fallback (the old ambient default).
    expect(src).not.toContain('siteTag: tag || undefined');
    expect(src).toContain('if (!tag) return;');
    // Build button disabled without a selected site.
    expect(src).toContain('disabled={!tag || buildBusy || !brief.trim()}');
  });

  it('polls GET /api/site-studio/build-vnext/status until a terminal status', () => {
    expect(src).toContain('/api/site-studio/build-vnext/status?run_id=');
    expect(src).toContain('"published"');
    expect(src).toContain('"failed"');
    expect(src).toContain('VNEXT_TERMINAL_STATUSES.includes(row.status)');
  });

  it('fetches the preview URL after a published build', () => {
    expect(src).toContain('/api/site-studio/preview-url?siteTag=');
  });

  it('does not depend on the embedded chat or a WebSocket for the V1 build', () => {
    // The legacy iframe exists only inside the collapsed legacy section.
    const iframeIdx = src.indexOf('src="/index.html?embedded=1"');
    const legacyIdx = src.indexOf('legacyOpen ? (');
    expect(iframeIdx).toBeGreaterThan(-1);
    expect(legacyIdx).toBeGreaterThan(-1);
    expect(iframeIdx).toBeGreaterThan(legacyIdx);
    // The V1 build path uses fetch() only — no WebSocket construction.
    expect(src).not.toContain('new WebSocket');
  });

  it('marks the embedded chat as legacy and shows a select-site prompt', () => {
    expect(src).toContain('legacy');
    expect(src).toContain('no site selected');
  });
});
