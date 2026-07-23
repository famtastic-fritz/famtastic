import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);

// Set before requiring server.js
process.env.SITE_TAG = process.env.SITE_TAG || 'site-demo';
process.env.STUDIO_NO_LISTEN = '1';

const { CharacterizationHarness, snapshotDirectory, hashString, readJsonl } = require('../runtime-vnext/harness/characterization-harness');
const { listScenarios, getScenario, ensureSpec } = require('../runtime-vnext/harness/scenarios');

describe('characterization harness', () => {
  const testDir = path.join(import.meta.dirname, '..', 'runtime-vnext', 'harness', 'cases', 'test-fixture');

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
  });

  it('lists all expected scenarios', () => {
    const scenarios = listScenarios();
    expect(scenarios).toContain('single-page-build');
    expect(scenarios).toContain('multi-page-build');
    expect(scenarios).toContain('cancellation');
    expect(scenarios).toContain('partial-failure');
  });

  it('loads a scenario definition', () => {
    const s = getScenario('single-page-build');
    expect(s.name).toBe('single-page-build');
    expect(typeof s.setup).toBe('function');
    expect(typeof s.action).toBe('function');
  });

  it('hashes strings deterministically', () => {
    const a = hashString('hello');
    const b = hashString('hello');
    const c = hashString('world');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(64);
  });

  it('reads jsonl safely', () => {
    const f = path.join(testDir, 'test.jsonl');
    fs.writeFileSync(f, '{"a":1}\n{"b":2}\n');
    const lines = readJsonl(f);
    expect(lines).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('snapshots a directory', () => {
    const dir = path.join(testDir, 'snapshot');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'a.txt'), 'alpha');
    fs.writeFileSync(path.join(dir, 'b.txt'), 'beta');
    const snap = snapshotDirectory(dir);
    expect(Object.keys(snap)).toContain('a.txt');
    expect(Object.keys(snap)).toContain('b.txt');
    expect(snap['a.txt'].sha256).toHaveLength(64);
  });

  it('constructs a CharacterizationHarness', () => {
    const h = new CharacterizationHarness({ siteTag: 'site-demo', caseDir: testDir });
    expect(h.siteTag).toBe('site-demo');
    expect(h.caseDir).toBe(testDir);
  });

  it('ensureSpec merges without overwriting existing fields', () => {
    const specPath = path.join(testDir, 'ensure-spec.json');
    fs.writeFileSync(specPath, JSON.stringify({ tag: 'site-demo', existing: true }));
    ensureSpec(specPath, { site_name: 'Test' });
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    expect(spec.tag).toBe('site-demo');
    expect(spec.existing).toBe(true);
    expect(spec.site_name).toBe('Test');
  });
});
