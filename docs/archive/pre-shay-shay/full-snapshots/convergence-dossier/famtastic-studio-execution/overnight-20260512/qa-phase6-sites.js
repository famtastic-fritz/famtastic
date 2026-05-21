#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

const repoRoot = path.resolve(__dirname, '../../..', '..');
const tags = [
  'site-bam-bam-civic',
  'site-black-night-barbershop',
  'site-glasshouse-records',
  'site-oscars-after-dark-china-edition',
  'site-spades-royale-online',
  'site-the-love-seat',
];
const base = 'http://127.0.0.1:3435';
function req(method, url, body) {
  return new Promise((resolve) => {
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const u = new URL(url);
    const r = http.request({ method, hostname: u.hostname, port: u.port, path: u.pathname + u.search, headers: { 'Content-Type': 'application/json', 'Content-Length': data ? data.length : 0, Origin: base } }, (res) => {
      let chunks = '';
      res.setEncoding('utf8');
      res.on('data', c => chunks += c);
      res.on('end', () => resolve({ status: res.statusCode, body: chunks }));
    });
    r.on('error', e => resolve({ status: 0, body: String(e.message || e) }));
    if (data) r.write(data);
    r.end();
  });
}
(async () => {
  const results = [];
  for (const tag of tags) {
    const siteDir = path.join(repoRoot, 'sites', tag);
    const dist = path.join(siteDir, 'dist');
    const spec = JSON.parse(fs.readFileSync(path.join(siteDir, 'spec.json'), 'utf8'));
    const pages = spec.pages || [];
    const checks = [];
    for (const page of pages) {
      const file = path.join(dist, page);
      const html = fs.readFileSync(file, 'utf8');
      checks.push({ name: `${page}: exists`, status: fs.existsSync(file) ? 'pass' : 'fail' });
      checks.push({ name: `${page}: title`, status: /<title>[^<]{6,}<\/title>/.test(html) ? 'pass' : 'fail' });
      checks.push({ name: `${page}: meta description`, status: /<meta name="description"/.test(html) ? 'pass' : 'fail' });
      checks.push({ name: `${page}: viewport`, status: /name="viewport"/.test(html) ? 'pass' : 'fail' });
      checks.push({ name: `${page}: CTA`, status: html.includes(spec.client_brief.primary_cta) ? 'pass' : 'fail' });
      checks.push({ name: `${page}: Black Night marker`, status: html.includes('Black Night Screen Elegant') ? 'pass' : 'fail' });
      checks.push({ name: `${page}: production-safe note`, status: html.includes('Preview') || html.includes('preview') ? 'pass' : 'fail' });
    }
    const switchRes = await req('POST', `${base}/api/switch-site`, { tag });
    const preview = await req('GET', 'http://127.0.0.1:3436/', null);
    const readiness = await req('GET', `${base}/api/studio-workflows/sites/deploy-readiness?site_tag=${encodeURIComponent(tag)}`, null);
    let readinessJson = null;
    try { readinessJson = JSON.parse(readiness.body); } catch {}
    checks.push({ name: 'switch-site API', status: switchRes.status === 200 ? 'pass' : 'fail', evidence: String(switchRes.status) });
    checks.push({ name: 'local preview responds', status: preview.status === 200 && preview.body.includes(spec.site_name) ? 'pass' : 'fail', evidence: String(preview.status) });
    checks.push({ name: 'production deploy blocked by readiness contract', status: readinessJson && readinessJson.readiness && readinessJson.readiness.production_allowed === false ? 'pass' : 'fail' });
    const fail = checks.filter(c => c.status !== 'pass').length;
    results.push({ tag, name: spec.site_name, local_preview_url: 'http://127.0.0.1:3436', file_preview: `sites/${tag}/dist/index.html`, pages, qa: { pass: checks.length - fail, fail }, checks, deploy_readiness: readinessJson && readinessJson.readiness ? { ok: readinessJson.ok, production_allowed: readinessJson.readiness.production_allowed, netlify: readinessJson.readiness.netlify } : null });
  }
  const out = { run_id: 'phase-6-build-sites-20260512', recorded_at: new Date().toISOString(), results };
  const outFile = path.join(repoRoot, 'docs/research/famtastic-studio-execution/overnight-20260512/phase6-site-qa-results.json');
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})();
