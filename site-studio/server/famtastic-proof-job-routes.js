'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const DIRECTIONS = [
  { direction_id: 'a', direction_name: 'Bold and Modern', layout_variant: 'split_screen', font_pairing: 'modern-geometric', color_mood: 'bold', density: 'spacious', shape: 'sharp' },
  { direction_id: 'b', direction_name: 'Trusted and Professional', layout_variant: 'standard', font_pairing: 'editorial-serif', color_mood: 'calm', density: 'balanced', shape: 'balanced' },
  { direction_id: 'c', direction_name: 'Local and Approachable', layout_variant: 'centered_hero', font_pairing: 'luxury-display', color_mood: 'warm', density: 'comfortable', shape: 'soft' },
];

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifySignature(rawBody, header, secret) {
  if (!secret || !Buffer.isBuffer(rawBody)) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  return safeEqual(header, expected);
}

function validateRequest(payload) {
  if (!payload || payload.schema_version !== 1) throw Object.assign(new Error('schema_version must be 1'), { statusCode: 422 });
  for (const field of ['idempotency_key', 'campaign_id', 'callback_url']) {
    if (typeof payload[field] !== 'string' || payload[field].trim() === '') {
      throw Object.assign(new Error(`${field} is required`), { statusCode: 422 });
    }
  }
  if (!/^proof:[a-z0-9-]{3,190}$/i.test(payload.idempotency_key)) throw Object.assign(new Error('invalid idempotency_key'), { statusCode: 422 });
  if (!/^[a-z0-9-]{3,190}$/i.test(payload.campaign_id)) throw Object.assign(new Error('invalid campaign_id'), { statusCode: 422 });
  let callback;
  try { callback = new URL(payload.callback_url); } catch { throw Object.assign(new Error('invalid callback_url'), { statusCode: 422 }); }
  if (!['https:', 'http:'].includes(callback.protocol)) throw Object.assign(new Error('callback_url must use http or https'), { statusCode: 422 });
  if (payload.required_variant_count !== 3) throw Object.assign(new Error('required_variant_count must be 3'), { statusCode: 422 });
  if (!payload.prospect || typeof payload.prospect !== 'object' || !String(payload.prospect.business_name || '').trim()) {
    throw Object.assign(new Error('prospect.business_name is required'), { statusCode: 422 });
  }
  return payload;
}

function mapRequestToCampaign(payload, outputRoot) {
  const prospect = payload.prospect;
  const businessName = String(prospect.business_name).trim();
  const category = String(prospect.category || 'local business').trim();
  const serviceArea = String(prospect.service_area || 'the local area').trim();
  const description = String(prospect.description || `${businessName} provides ${category} services in ${serviceArea}.`).trim();
  const services = Array.isArray(prospect.services) && prospect.services.length
    ? prospect.services.map(String).filter(Boolean)
    : [category];
  const primaryCta = String(prospect.primary_cta || (prospect.phone ? 'Call Today' : 'Request a Quote'));
  const contactMethods = {
    phone: String(prospect.phone || ''),
    email: String(prospect.email || ''),
  };
  return {
    campaign_id: payload.campaign_id,
    output_base_dir: path.join(outputRoot, payload.campaign_id),
    base_spec: {
      site_name: businessName,
      business_type: category,
      famtastic_mode: true,
      client_brief: {
        business_description: description,
        ideal_customer: String(prospect.ideal_customer || `Customers in ${serviceArea}`),
        differentiator: String(prospect.differentiator || `Responsive ${category} service with local expertise`),
        primary_cta: primaryCta,
        services,
        geography: serviceArea,
        contact_methods: contactMethods,
      },
      design_brief: {
        goal: String(prospect.primary_goal || 'Build trust and generate qualified inquiries'),
        audience: String(prospect.ideal_customer || `Customers in ${serviceArea}`),
        tone: ['specific', 'credible', 'conversion-focused'],
        visual_direction: {},
      },
    },
    variants: DIRECTIONS,
  };
}

function sanitizeProofHtml(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '');
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function proofMediaFallback(tag, before, src, after, designDna) {
  const attrs = `${before} ${after}`;
  const status = /data-slot-status=["']([^"']+)["']/i.exec(attrs)?.[1]?.toLowerCase();
  const transparentPixel = /^data:image\/gif;base64,R0lGODlhAQABA/i.test(src);
  if (status !== 'empty' && !transparentPixel) return null;
  const role = (/data-slot-role=["']([^"']+)["']/i.exec(attrs)?.[1] || 'feature').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const business = designDna?.spec_snapshot?.site_name || 'Business';
  return `<span class="proof-media-fallback proof-media-fallback--${role}" role="img" aria-label="Decorative visual for ${escapeHtml(business)}"></span>`;
}

function stripCustomerVisibleScaffolding(html) {
  const $ = cheerio.load(String(html || ''), { decodeEntities: false });
  const forbidden = /\b(?:transparent placeholder|reserved (?:visual|image) slot|proof mode|proof-safe|image placeholder|hero photo slot|content (?:is|still) missing)\b/i;
  $('p, span, small, strong, figcaption, div, [class*="placeholder-caption"], [class*="visual-note"]').each((_, element) => {
    const candidate = $(element);
    if (element.tagName === 'div' && candidate.children().length > 0) return;
    if (forbidden.test(candidate.text().replace(/\s+/g, ' ').trim())) candidate.remove();
  });
  $('article').each((_, element) => {
    if (/what the proof leaves open|next content pass|content (?:is|still) missing/i.test($(element).text())) $(element).remove();
  });
  return $.html()
    .replace(/why this proof feels believable/gi, 'Why customers can feel confident')
    .replace(/bakery proof snapshot/gi, 'Bakery at a Glance')
    .replace(/throughout the proof/gi, 'throughout the page')
    .replace(/\bthis proof\b/gi, 'this design')
    .replace(/\bthe proof\b/gi, 'the design')
    .replace(/\bclient contract\b/gi, 'business details')
    .replace(/generic placeholder copy/gi, 'generic copy');
}

function packageProofHtml(artifactPath, html, designDna = {}) {
  const artifactDir = path.dirname(artifactPath);
  let packaged = String(html || '');
  let sharedCss = '';
  packaged = packaged.replace(/<link\b[^>]*href=["']assets\/styles\.css["'][^>]*>/i, () => {
    const stylesheet = path.join(artifactDir, 'assets', 'styles.css');
    if (!fs.existsSync(stylesheet)) return '';
    sharedCss = fs.readFileSync(stylesheet, 'utf8');
    return '';
  });
  if (sharedCss) {
    packaged = packaged.replace(/<head([^>]*)>/i, `<head$1>\n<style data-site-studio-shared>\n${sharedCss}\n</style>`);
  }
  packaged = packaged.replace(/<img\b([^>]*?)src=["']([^"']+)["']([^>]*)>/gi, (tag, before, src, after) => {
    const fallback = proofMediaFallback(tag, before, src, after, designDna);
    if (fallback) return fallback;
    if (/^(?:https?:|data:|\/\/)/i.test(src)) return tag;
    const file = path.resolve(artifactDir, src);
    if (file.startsWith(artifactDir + path.sep) && fs.existsSync(file) && fs.statSync(file).size <= 200000) {
      const ext = path.extname(file).toLowerCase();
      const mime = ext === '.svg' ? 'image/svg+xml' : (ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg'));
      const encoded = fs.readFileSync(file).toString('base64');
      return `<img${before}src="data:${mime};base64,${encoded}"${after}>`;
    }
    const alt = /alt=["']([^"']*)["']/i.exec(`${before} ${after}`)?.[1]
      || designDna?.spec_snapshot?.site_name
      || 'Business';
    return `<span class="proof-brand-wordmark">${escapeHtml(alt)}</span>`;
  });
  packaged = packaged.replace('</head>', `<style data-proof-portability>
.proof-brand-wordmark{font:700 1.05rem/1.1 var(--font-heading,system-ui);letter-spacing:.02em}
.container{width:min(100% - 2rem,90rem);margin-inline:auto}.h-10{height:2.5rem}.w-auto{width:auto}
.fam-hero-layered{position:relative;isolation:isolate;overflow:hidden;display:grid;place-items:center}
.fam-hero-layer{position:absolute;inset:0;pointer-events:none}
.fam-hero-layer--bg{z-index:0}.fam-hero-layer--character{z-index:3}.fam-hero-layer--fx{z-index:4}
.fam-hero-layer--content{z-index:6;position:relative;inset:auto;pointer-events:auto}
.proof-media-fallback{display:block;width:100%;min-height:12rem;aspect-ratio:4/3;border-radius:inherit;overflow:hidden;background:radial-gradient(circle at 22% 18%,rgba(255,255,255,.7) 0 5%,transparent 6%),radial-gradient(circle at 74% 30%,rgba(255,255,255,.32),transparent 28%),linear-gradient(135deg,var(--color-secondary,#d9a15f),var(--color-primary,#70401f) 52%,var(--color-accent,#f3c56f));box-shadow:inset 0 0 0 1px rgba(255,255,255,.24)}
.proof-media-fallback--hero,.proof-media-fallback--character{aspect-ratio:16/10;min-height:18rem;background:radial-gradient(ellipse at 70% 18%,rgba(255,244,210,.72),transparent 34%),linear-gradient(145deg,var(--color-primary,#70401f),var(--color-accent,#e7a33f))}
.proof-media-fallback--service,.proof-media-fallback--product{background:repeating-linear-gradient(135deg,rgba(255,255,255,.14) 0 12px,transparent 12px 24px),linear-gradient(145deg,var(--color-secondary,#d9a15f),var(--color-primary,#70401f))}
</style></head>`);
  return sanitizeProofHtml(stripCustomerVisibleScaffolding(packaged));
}

function atomicWriteJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

function createProofJobService({ generateCampaign, renderThumbnail = null, jobsDir, outputRoot, callbackSecret, fetchImpl = fetch }) {
  const inFlight = new Set();
  const jobFile = (jobId) => path.join(jobsDir, `${jobId}.json`);
  const findByKey = (key) => {
    if (!fs.existsSync(jobsDir)) return null;
    for (const name of fs.readdirSync(jobsDir).filter((entry) => entry.endsWith('.json'))) {
      try {
        const job = JSON.parse(fs.readFileSync(path.join(jobsDir, name), 'utf8'));
        if (job.idempotency_key === key) return job;
      } catch {}
    }
    return null;
  };
  const save = (job) => atomicWriteJson(jobFile(job.job_id), job);

  async function deliver(job, variants) {
    const body = JSON.stringify({
      event_id: `site-studio:${job.job_id}:generated`,
      campaign_id: job.campaign_id,
      job_id: job.job_id,
      variants,
    });
    const signature = `sha256=${crypto.createHmac('sha256', callbackSecret).update(body).digest('hex')}`;
    let lastError;
    for (const delay of [0, 1000, 3000]) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        const response = await fetchImpl(job.callback_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-FAMtastic-Signature': signature },
          body,
        });
        if (response.ok) return;
        const detail = typeof response.text === 'function' ? await response.text() : '';
        lastError = new Error(`callback returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 500)}` : ''}`);
      } catch (error) { lastError = error; }
    }
    throw lastError || new Error('callback delivery failed');
  }

  async function run(job) {
    if (inFlight.has(job.job_id)) return;
    inFlight.add(job.job_id);
    try {
      job.status = 'generating';
      job.started_at = new Date().toISOString();
      save(job);
      let generated = Array.isArray(job.generated_variants) ? job.generated_variants : null;
      if (!generated && job.generated_at) {
        const recovered = DIRECTIONS.map(({ direction_id }) => {
          const dir = path.join(outputRoot, job.campaign_id, direction_id);
          const artifactPath = path.join(dir, 'index.html');
          const dnaPath = path.join(dir, 'design-dna.json');
          if (!fs.existsSync(artifactPath) || !fs.existsSync(dnaPath)) return null;
          return { direction_id, artifact_path: artifactPath, design_dna: JSON.parse(fs.readFileSync(dnaPath, 'utf8')) };
        });
        if (recovered.every(Boolean)) generated = recovered;
      }
      if (!generated) {
        const result = await generateCampaign(mapRequestToCampaign(job.payload, outputRoot));
        if (!result || result.distinct_html !== true || !Array.isArray(result.variants) || result.variants.length !== 3) {
          throw new Error('Site Studio did not produce three distinct proof variants');
        }
        generated = result.variants;
      }
      const variants = await Promise.all(generated.map(async (variant) => {
        const html = packageProofHtml(variant.artifact_path, fs.readFileSync(variant.artifact_path, 'utf8'), variant.design_dna || {});
        const thumbnail = renderThumbnail ? await renderThumbnail(html, variant) : null;
        return {
          direction_id: variant.direction_id,
          html,
          thumbnail_base64: thumbnail?.data || null,
          thumbnail_media_type: thumbnail?.media_type || null,
          design_dna: variant.design_dna || {},
        };
      }));
      job.generated_variants = generated.map((variant) => ({
        direction_id: variant.direction_id,
        artifact_path: variant.artifact_path,
        design_dna: variant.design_dna || {},
      }));
      job.status = 'callback_pending';
      job.generated_at = new Date().toISOString();
      save(job);
      await deliver(job, variants);
      job.status = 'delivered';
      job.delivered_at = new Date().toISOString();
      delete job.payload;
      save(job);
    } catch (error) {
      job.status = 'failed';
      job.failed_at = new Date().toISOString();
      job.error = String(error && error.message || error).slice(0, 1000);
      save(job);
    } finally {
      inFlight.delete(job.job_id);
    }
  }

  function accept(payload) {
    const existing = findByKey(payload.idempotency_key);
    if (existing) {
      if (existing.status === 'failed' && existing.payload) {
        existing.status = 'accepted';
        delete existing.error;
        save(existing);
        setImmediate(() => run(existing));
      }
      return { job: existing, duplicate: true };
    }
    const job = {
      job_id: `proof_job_${crypto.randomUUID()}`,
      idempotency_key: payload.idempotency_key,
      campaign_id: payload.campaign_id,
      callback_url: payload.callback_url,
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      payload,
    };
    save(job);
    setImmediate(() => run(job));
    return { job, duplicate: false };
  }

  function resumePending() {
    if (!fs.existsSync(jobsDir)) return 0;
    let resumed = 0;
    for (const name of fs.readdirSync(jobsDir).filter((entry) => entry.endsWith('.json'))) {
      try {
        const job = JSON.parse(fs.readFileSync(path.join(jobsDir, name), 'utf8'));
        if (job.payload && ['accepted', 'generating', 'callback_pending'].includes(job.status)) {
          resumed += 1;
          setImmediate(() => run(job));
        }
      } catch {}
    }
    return resumed;
  }

  return { accept, run, findByKey, resumePending };
}

function registerFamtasticProofJobRoute({ app, generateCampaign, renderThumbnail, jobsDir, outputRoot, dispatchSecret, callbackSecret, fetchImpl }) {
  const service = createProofJobService({ generateCampaign, renderThumbnail, jobsDir, outputRoot, callbackSecret, fetchImpl });
  app.post('/api/integrations/famtastic/proof-jobs', (req, res) => {
    if (!dispatchSecret || !callbackSecret) return res.status(503).json({ error: 'proof_integration_not_configured' });
    if (!verifySignature(req.rawBody, req.get('X-FAMtastic-Signature'), dispatchSecret)) {
      return res.status(401).json({ error: 'invalid_signature' });
    }
    try {
      const payload = validateRequest(req.body);
      if (!safeEqual(req.get('Idempotency-Key'), payload.idempotency_key)) {
        return res.status(422).json({ error: 'idempotency_key_mismatch' });
      }
      const { job, duplicate } = service.accept(payload);
      return res.status(202).json({ job_id: job.job_id, status: job.status, duplicate });
    } catch (error) {
      return res.status(error.statusCode || 422).json({ error: 'invalid_proof_job', message: error.message });
    }
  });
  service.resumePending();
  return service;
}

module.exports = {
  DIRECTIONS,
  verifySignature,
  validateRequest,
  mapRequestToCampaign,
  sanitizeProofHtml,
  stripCustomerVisibleScaffolding,
  packageProofHtml,
  createProofJobService,
  registerFamtasticProofJobRoute,
};
