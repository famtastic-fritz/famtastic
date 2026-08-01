import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { fulfillProofMedia, listEmptyImageSlots } = require('../server/proof-media-fulfillment');
const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('proof media fulfillment', () => {
  it('awaits real assets and removes every empty customer-visible slot', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'proof-media-'));
    roots.push(root);
    const artifactPath = path.join(root, 'index.html');
    fs.writeFileSync(artifactPath, '<html><body><img data-slot-id="hero-1" data-slot-role="hero" data-slot-status="empty" src="data:image/gif;base64,AAAA" alt="fresh bread"></body></html>');
    const calls = [];
    const result = await fulfillProofMedia({
      artifactPath,
      spec: { site_name: 'Sunrise Crumb Bakery', business_type: 'bakery' },
      generator: async (request) => {
        calls.push(request);
        fs.writeFileSync(request.outputPath, Buffer.alloc(12_000, 1));
      },
    });
    const html = fs.readFileSync(artifactPath, 'utf8');
    expect(result.status).toBe('fulfilled');
    expect(calls).toHaveLength(1);
    expect(calls[0].prompt).toContain('Sunrise Crumb Bakery');
    expect(html).toContain('src="assets/hero-1.jpg"');
    expect(html).toContain('data-slot-status="generated"');
    expect(listEmptyImageSlots(html)).toHaveLength(0);
  });

  it('fails closed when a generator returns a missing or tiny file', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'proof-media-'));
    roots.push(root);
    const artifactPath = path.join(root, 'index.html');
    fs.writeFileSync(artifactPath, '<img data-slot-id="hero-1" data-slot-role="hero" data-slot-status="empty" src="">');
    await expect(fulfillProofMedia({
      artifactPath,
      spec: {},
      generator: async ({ outputPath }) => fs.writeFileSync(outputPath, 'bad'),
    })).rejects.toThrow(/invalid asset/);
  });
});
