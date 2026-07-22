'use strict';
const fs = require('fs');
const path = require('path');

class SeoPackRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    const b = request.buildRequest || {};
    const sm = request.siteManifest || {};
    const pageManifests = request.pageManifests || [];
    const contentPackets = request.contentPackets || [];
    const biz = b.business || {};
    const deploy = b.deploy || {};

    const base_url = 'https://' + (
      (deploy.custom_domains && deploy.custom_domains[0]) || (b.site_tag + '.netlify.app')
    );

    const cpByPage = {};
    for (const cp of contentPackets) {
      if (cp && cp.page_id) cpByPage[cp.page_id] = cp;
    }

    const seoPages = (pageManifests || sm.pages || []).map(pm => {
      const cp = cpByPage[pm.page_id] || {};
      const rawTitle = (biz.name || 'Site') + ' — ' + (pm.purpose || pm.title || '') + ' | ' + (biz.location || '');
      const title = rawTitle.substring(0, 60);
      const descSrc = cp.meta_description || biz.description || (b.positioning || {}).desired_outcome || '';
      const description = descSrc.substring(0, 155);
      const canonical = base_url + (pm.route === '/' ? '' : pm.route);

      let schema_json_ld = null;
      if (pm.page_id === 'home' || pm.route === '/') {
        schema_json_ld = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: biz.name || '',
          description: biz.description || '',
          telephone: biz.public_contact || '',
          address: { '@type': 'PostalAddress', addressLocality: biz.location || '' },
        });
      }

      return {
        page_id: pm.page_id,
        title,
        description,
        og_title: title,
        og_description: description.substring(0, 120),
        og_image: base_url + '/images/og.jpg',
        canonical,
        schema_json_ld,
      };
    });

    // sitemap.xml
    const sitemapUrls = seoPages.map(p =>
      `  <url>\n    <loc>${p.canonical}</loc>\n  </url>`
    ).join('\n');
    const sitemap_xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>`;
    const robots_txt = `User-agent: *\nAllow: /\nSitemap: ${base_url}/sitemap.xml\n`;

    const stagingDir = path.join(runContext.workspace_root, 'staging');
    fs.mkdirSync(stagingDir, { recursive: true });
    fs.writeFileSync(path.join(stagingDir, 'sitemap.xml'), sitemap_xml, 'utf8');
    fs.writeFileSync(path.join(stagingDir, 'robots.txt'), robots_txt, 'utf8');

    return {
      result: { pages: seoPages, sitemap_xml, robots_txt, seo_status: 'complete' },
      sideEffects: [
        { path: 'sitemap.xml', kind: 'write' },
        { path: 'robots.txt', kind: 'write' },
      ],
      artifactReferences: [],
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      costUsd: 0,
    };
  }
}

module.exports = { SeoPackRunner };
