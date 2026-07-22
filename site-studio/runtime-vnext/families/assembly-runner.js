'use strict';
const fs = require('fs');
const path = require('path');

class AssemblyRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    const b = request.buildRequest || {};
    const sm = request.siteManifest || {};
    const pageArtifacts = request.pageArtifacts || [];
    const sharedAssetsReport = request.sharedAssetsReport || {};
    const seoData = request.seoData || {};

    const stagingDir = path.join(runContext.workspace_root, 'staging');
    const outputsDir = path.join(runContext.workspace_root, 'outputs');
    const sideEffects = [];

    const siteTag = sm.site_tag || b.site_tag || 'site';
    const canonical = 'https://' + (siteTag) + '.netlify.app';

    // Generate sitemap.xml
    const pages = sm.pages || [];
    const sitemapUrls = pages.map(p =>
      `  <url>\n    <loc>${canonical}${p.route === '/' ? '' : p.route}</loc>\n  </url>`
    ).join('\n');
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</urlset>`;

    const robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${canonical}/sitemap.xml\n`;

    const sitemapPath = path.join(stagingDir, 'sitemap.xml');
    fs.mkdirSync(path.dirname(sitemapPath), { recursive: true });
    fs.writeFileSync(sitemapPath, sitemapXml, 'utf8');
    sideEffects.push({ path: 'sitemap.xml', kind: 'write' });

    const robotsPath = path.join(stagingDir, 'robots.txt');
    fs.writeFileSync(robotsPath, robotsTxt, 'utf8');
    sideEffects.push({ path: 'robots.txt', kind: 'write' });

    // Determine expected pages
    const expectedPages = pages.map(p => ({
      page_id: p.page_id,
      route: p.route,
      output_path: p.route === '/' ? 'index.html' : p.route.replace(/^\//, '').replace(/\/$/, '') + '.html',
    }));

    // Check which pages exist in outputs
    const missing = [];
    for (const ep of expectedPages) {
      const fullPath = path.join(outputsDir, ep.output_path);
      if (!fs.existsSync(fullPath)) {
        missing.push(ep.output_path);
      }
    }

    const build_status = missing.length === 0 ? 'complete' : 'partial';

    const assets = [
      ...(sharedAssetsReport.css_files || []),
      ...(sharedAssetsReport.js_files || []),
      ...(sharedAssetsReport.static_files || []),
      'sitemap.xml',
      'robots.txt',
    ];

    const manifest = {
      site_tag: siteTag,
      dist_root: 'outputs/',
      pages: expectedPages,
      assets,
      sitemap_xml: 'sitemap.xml',
      robots_txt: 'robots.txt',
      build_status,
      missing,
    };

    const manifestPath = path.join(stagingDir, 'build-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    sideEffects.push({ path: 'build-manifest.json', kind: 'write' });

    return {
      result: manifest,
      sideEffects,
      artifactReferences: [],
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      costUsd: 0,
    };
  }
}

module.exports = { AssemblyRunner };
