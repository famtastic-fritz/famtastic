import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  verifySignature,
  validateRequest,
  mapRequestToCampaign,
  sanitizeProofHtml,
  packageProofHtml,
  createProofJobService,
} = require('../server/famtastic-proof-job-routes');

const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function payload() {
  return {
    schema_version: 1,
    idempotency_key: 'proof:pc-sunrise-bakery-abc123',
    campaign_id: 'pc-sunrise-bakery-abc123',
    prospect: {
      business_name: 'Sunrise Crumb Bakery',
      category: 'Bakery',
      description: 'A neighborhood bakery specializing in fresh bread and pastries.',
      service_area: 'Phoenix, AZ',
      phone: '602-555-0142',
      email: 'owner@sunrise-crumb.test',
    },
    required_variant_count: 3,
    callback_url: 'https://famtastic.example/api/pipeline/site-studio/callback',
  };
}

async function waitFor(check) {
  for (let i = 0; i < 100; i += 1) {
    const value = check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('timed out');
}

describe('FAMtastic proof job contract', () => {
  it('verifies the exact signed body and rejects changed bytes', () => {
    const raw = Buffer.from(JSON.stringify(payload()));
    const signature = `sha256=${crypto.createHmac('sha256', 'dispatch-secret').update(raw).digest('hex')}`;
    expect(verifySignature(raw, signature, 'dispatch-secret')).toBe(true);
    expect(verifySignature(Buffer.concat([raw, Buffer.from(' ')]), signature, 'dispatch-secret')).toBe(false);
  });

  it('maps prospect facts into three intentionally distinct Site Studio directions', () => {
    const mapped = mapRequestToCampaign(validateRequest(payload()), '/tmp/proofs');
    expect(mapped.base_spec.site_name).toBe('Sunrise Crumb Bakery');
    expect(mapped.base_spec.client_brief.business_description).toContain('fresh bread');
    expect(mapped.base_spec.client_brief.contact_methods.phone).toBe('602-555-0142');
    expect(mapped.variants).toHaveLength(3);
    expect(new Set(mapped.variants.map((variant) => variant.layout_variant)).size).toBe(3);
    expect(new Set(mapped.variants.map((variant) => variant.font_pairing)).size).toBe(3);
  });

  it('removes active content before crossing the callback boundary', () => {
    const clean = sanitizeProofHtml('<html><body onload="bad()"><script>bad()</script><a href="javascript:bad()">Safe</a></body></html>');
    expect(clean).not.toMatch(/<script|onload|javascript:/i);
    expect(clean).toContain('Safe');
  });

  it('packages local CSS and missing logo references into one portable HTML artifact', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'famtastic-proof-package-'));
    roots.push(root);
    fs.mkdirSync(path.join(root, 'assets'));
    fs.writeFileSync(path.join(root, 'assets', 'styles.css'), '.hero{color:tomato}');
    const artifact = path.join(root, 'index.html');
    const html = '<html><head><meta name="description" content="Bakery proof"><script>bad()</script><link rel="stylesheet" href="assets/styles.css"></head><body><img src="assets/missing-logo.svg" alt="Copper Kettle"><div class="hero">Bread</div></body></html>';
    const packaged = packageProofHtml(artifact, html);
    expect(packaged).toContain('.hero{color:tomato}');
    expect(packaged).toContain('proof-brand-wordmark">Copper Kettle');
    expect(packaged).toContain('content="Bakery proof"');
    expect(packaged).toContain('.fam-hero-layer--bg{z-index:0}');
    expect(packaged.indexOf('data-site-studio-shared')).toBeLessThan(packaged.indexOf('<meta name="description"'));
    expect(packaged).not.toMatch(/<script|assets\/styles\.css|missing-logo/);
  });

  it('generates once, delivers exactly three artifacts, and reuses the durable idempotency result', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'famtastic-proof-job-'));
    roots.push(root);
    const callbackBodies = [];
    let generationCount = 0;
    const service = createProofJobService({
      jobsDir: path.join(root, 'jobs'),
      outputRoot: path.join(root, 'proofs'),
      callbackSecret: 'callback-secret',
      fetchImpl: async (_url, options) => {
        const expected = `sha256=${crypto.createHmac('sha256', 'callback-secret').update(options.body).digest('hex')}`;
        expect(options.headers['X-FAMtastic-Signature']).toBe(expected);
        callbackBodies.push(JSON.parse(options.body));
        return { ok: true, status: 200 };
      },
      generateCampaign: async (request) => {
        generationCount += 1;
        const variants = request.variants.map((variant) => {
          const dir = path.join(root, variant.direction_id);
          fs.mkdirSync(dir, { recursive: true });
          const artifact = path.join(dir, 'index.html');
          fs.writeFileSync(artifact, `<!doctype html><html><body><h1>${request.base_spec.site_name} ${variant.direction_name}</h1></body></html>`);
          return { direction_id: variant.direction_id, artifact_path: artifact, design_dna: { source: 'site-studio' } };
        });
        return { distinct_html: true, variants };
      },
    });

    const first = service.accept(payload());
    const second = service.accept(payload());
    expect(second.duplicate).toBe(true);
    expect(second.job.job_id).toBe(first.job.job_id);
    await waitFor(() => service.findByKey(payload().idempotency_key)?.status === 'delivered');
    expect(generationCount).toBe(1);
    expect(callbackBodies).toHaveLength(1);
    expect(callbackBodies[0].variants.map((variant) => variant.direction_id)).toEqual(['a', 'b', 'c']);
  });
});
