'use strict';

/**
 * assemble-site.js — turn articles/*.md into a lean static site in dist/.
 *
 * Produces:
 *   dist/index.html          — home page listing all articles
 *   dist/<slug>.html         — one page per article
 *   dist/style.css           — single shared stylesheet (mobile-first)
 *   dist/sitemap.xml         — all URLs
 *   dist/robots.txt          — allow-all + sitemap reference
 *
 * Plain semantic HTML + CSS. No framework, no build step, no JS required to
 * render. Injects the affiliate disclosure on every article page and an
 * owner-profile-derived footer site-wide.
 *
 * A very small, safe subset of markdown is rendered (headings, paragraphs,
 * lists, tables, links, blockquotes, bold). All article text is HTML-escaped
 * before inline formatting is applied, so generated content cannot inject markup.
 */

const fs = require('fs');
const path = require('path');
const {
  loadConfig, loadOwnerProfile, escapeHtml, parseMarkdownFile, todayStamp,
} = require('./lib');

/* ------------------------------------------------------------------ */
/* MINIMAL MARKDOWN -> HTML                                            */
/* ------------------------------------------------------------------ */

function inlineMd(text) {
  // text is already HTML-escaped. Apply links, bold, italics, inline code.
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, href) => {
      const safeHref = /^https?:\/\//i.test(href) || href.startsWith('/') || /\.html?$/.test(href)
        ? href : '#';
      const rel = /^https?:\/\//i.test(safeHref) ? ' rel="nofollow sponsored noopener" target="_blank"' : '';
      return `<a href="${safeHref}"${rel}>${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function renderMarkdown(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;

  function flushList(type, items) {
    out.push(`<${type}>`);
    for (const it of items) out.push(`<li>${inlineMd(escapeHtml(it))}</li>`);
    out.push(`</${type}>`);
  }

  while (i < lines.length) {
    let line = lines[i];

    // Strip the affiliate slot marker comment (keep the link that follows it).
    line = line.replace(/<!--\s*AFFILIATE_LINK_SLOT\s*-->/g, '');

    const trimmed = line.trim();

    if (trimmed === '') { i++; continue; }

    // Headings
    const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${inlineMd(escapeHtml(h[2]))}</h${level}>`);
      i++; continue;
    }

    // Blockquote (disclosure etc.)
    if (trimmed.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        buf.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${inlineMd(escapeHtml(buf.join(' ')))}</blockquote>`);
      continue;
    }

    // Tables
    if (trimmed.startsWith('|') && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const header = trimmed.split('|').slice(1, -1).map((c) => c.trim());
      i += 2; // skip header + separator
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim().split('|').slice(1, -1).map((c) => c.trim()));
        i++;
      }
      out.push('<div class="table-wrap"><table>');
      out.push('<thead><tr>' + header.map((c) => `<th>${inlineMd(escapeHtml(c))}</th>`).join('') + '</tr></thead>');
      out.push('<tbody>');
      for (const r of rows) {
        out.push('<tr>' + r.map((c) => `<td>${inlineMd(escapeHtml(c))}</td>`).join('') + '</tr>');
      }
      out.push('</tbody></table></div>');
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      flushList('ul', items);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      flushList('ol', items);
      continue;
    }

    // Paragraph (gather until blank line)
    const para = [trimmed];
    i++;
    while (i < lines.length && lines[i].trim() !== '' &&
           !/^(#{1,6}\s|[-*]\s|\d+\.\s|>|\|)/.test(lines[i].trim())) {
      para.push(lines[i].trim());
      i++;
    }
    out.push(`<p>${inlineMd(escapeHtml(para.join(' ')))}</p>`);
  }

  return out.join('\n');
}

/* ------------------------------------------------------------------ */
/* HTML SHELL + CSS                                                    */
/* ------------------------------------------------------------------ */

function footerHtml(cfg, owner) {
  const name = (owner.owner && owner.owner.display_name) || cfg.site_title;
  const legal = (owner.owner && owner.owner.legal_name) || '';
  const year = new Date().getFullYear();
  return (
`<footer class="site-footer">
  <p class="disclosure">${escapeHtml(cfg.monetization.disclosure_text)}</p>
  <p>&copy; ${year} ${escapeHtml(cfg.site_title)}${legal ? ' &middot; Published by ' + escapeHtml(legal) : ''}.</p>
  <p class="muted">Curated by ${escapeHtml(name)}. We may earn a commission from links on this site at no cost to you.</p>
  <p class="muted"><a href="index.html">Home</a></p>
</footer>`
  );
}

function pageShell({ title, description, canonical, bodyHtml, cfg, owner }) {
  return (
`<!DOCTYPE html>
<html lang="${escapeHtml(cfg.language || 'en')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="style.css">
</head>
<body>
<header class="site-header">
  <a class="brand" href="index.html">${escapeHtml(cfg.site_title)}</a>
  <p class="tagline">${escapeHtml(cfg.site_tagline || '')}</p>
</header>
<main>
${bodyHtml}
</main>
${footerHtml(cfg, owner)}
</body>
</html>
`);
}

const STYLESHEET =
`/* Mobile-first, system-font, fast. No external fonts, no JS. */
*,*::before,*::after{box-sizing:border-box}
:root{
  --ink:#1a1a1a;--muted:#5c5c5c;--bg:#ffffff;--soft:#f5f5f4;
  --accent:#1d4ed8;--line:#e5e5e5;--maxw:46rem;
}
html{-webkit-text-size-adjust:100%}
body{margin:0;font:1.05rem/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  color:var(--ink);background:var(--bg)}
a{color:var(--accent)}
img{max-width:100%;height:auto}
.site-header{padding:1.5rem 1.25rem;border-bottom:1px solid var(--line);text-align:center}
.brand{font-weight:800;font-size:1.4rem;text-decoration:none;color:var(--ink);letter-spacing:-.02em}
.tagline{margin:.4rem 0 0;color:var(--muted);font-size:.95rem}
main{max-width:var(--maxw);margin:0 auto;padding:1.5rem 1.25rem}
h1{font-size:1.9rem;line-height:1.25;letter-spacing:-.02em;margin:.5rem 0 1rem}
h2{font-size:1.4rem;margin:2rem 0 .75rem;letter-spacing:-.01em}
h3{font-size:1.15rem;margin:1.5rem 0 .5rem}
p{margin:0 0 1rem}
ul,ol{margin:0 0 1rem;padding-left:1.4rem}
li{margin:.35rem 0}
blockquote{margin:1.25rem 0;padding:.85rem 1.1rem;background:var(--soft);
  border-left:4px solid var(--accent);border-radius:.35rem;color:#333;font-size:.97rem}
code{background:var(--soft);padding:.1rem .35rem;border-radius:.25rem;font-size:.9em}
.table-wrap{overflow-x:auto;margin:1.25rem 0}
table{border-collapse:collapse;width:100%;font-size:.95rem}
th,td{border:1px solid var(--line);padding:.6rem .7rem;text-align:left;vertical-align:top}
th{background:var(--soft)}
.post-list{list-style:none;padding:0}
.post-list li{margin:0 0 1.25rem;padding-bottom:1.25rem;border-bottom:1px solid var(--line)}
.post-list a{font-size:1.2rem;font-weight:700;text-decoration:none}
.post-list .meta{color:var(--muted);font-size:.85rem;margin:.25rem 0 0}
.site-footer{max-width:var(--maxw);margin:2rem auto 0;padding:1.5rem 1.25rem 3rem;
  border-top:1px solid var(--line);font-size:.85rem;color:var(--muted)}
.site-footer .disclosure{background:var(--soft);padding:.75rem 1rem;border-radius:.4rem;color:#444}
.muted{color:var(--muted)}
@media(min-width:48rem){h1{font-size:2.4rem}body{font-size:1.08rem}}
`;

/* ------------------------------------------------------------------ */
/* ASSEMBLE                                                            */
/* ------------------------------------------------------------------ */

function assembleSite(opts = {}) {
  const cfg = opts.cfg || loadConfig();
  const owner = opts.owner || loadOwnerProfile();
  const articlesDir = opts.articlesDir || path.join(__dirname, cfg.articles_dir || 'articles');
  const distDir = opts.distDir || path.join(__dirname, cfg.output_dir || 'dist');
  const baseUrl = (cfg.base_url || '').replace(/\/$/, '');

  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

  const files = fs.existsSync(articlesDir)
    ? fs.readdirSync(articlesDir).filter((f) => f.endsWith('.md'))
    : [];

  const articles = files.map((f) => {
    const { meta, body } = parseMarkdownFile(fs.readFileSync(path.join(articlesDir, f), 'utf8'));
    const slug = meta.slug || f.replace(/\.md$/, '');
    return { meta, body, slug, file: f };
  }).sort((a, b) => String(b.meta.date || '').localeCompare(String(a.meta.date || '')));

  // Per-article pages
  for (const a of articles) {
    const bodyHtml = renderMarkdown(a.body);
    const html = pageShell({
      title: `${a.meta.title} | ${cfg.site_title}`,
      description: a.meta.description || cfg.site_tagline || '',
      canonical: `${baseUrl}/${a.slug}.html`,
      bodyHtml: `<article>${bodyHtml}</article>`,
      cfg, owner,
    });
    fs.writeFileSync(path.join(distDir, `${a.slug}.html`), html);
  }

  // Home page
  const listItems = articles.map((a) =>
`  <li>
    <a href="${a.slug}.html">${escapeHtml(a.meta.title)}</a>
    <p class="meta">${escapeHtml(a.meta.date || '')}${a.meta.words ? ' &middot; ' + a.meta.words + ' words' : ''}</p>
    <p>${escapeHtml(a.meta.description || '')}</p>
  </li>`).join('\n');

  const homeBody =
`<h1>${escapeHtml(cfg.site_title)}</h1>
<p>${escapeHtml(cfg.site_tagline || '')}</p>
${articles.length ? `<ul class="post-list">\n${listItems}\n</ul>` : '<p>No articles published yet.</p>'}`;

  fs.writeFileSync(path.join(distDir, 'index.html'), pageShell({
    title: `${cfg.site_title} — ${cfg.site_tagline || ''}`,
    description: cfg.site_tagline || cfg.site_title,
    canonical: `${baseUrl}/`,
    bodyHtml: homeBody, cfg, owner,
  }));

  // Stylesheet
  fs.writeFileSync(path.join(distDir, 'style.css'), STYLESHEET);

  // sitemap.xml
  const urls = [`${baseUrl}/`, ...articles.map((a) => `${baseUrl}/${a.slug}.html`)];
  const sitemap =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${escapeHtml(u)}</loc><lastmod>${todayStamp()}</lastmod></url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap);

  // robots.txt
  fs.writeFileSync(path.join(distDir, 'robots.txt'),
`User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml
`);

  return {
    distDir,
    pages: articles.length + 1,
    articleCount: articles.length,
    files: ['index.html', ...articles.map((a) => `${a.slug}.html`), 'style.css', 'sitemap.xml', 'robots.txt'],
  };
}

module.exports = { assembleSite, renderMarkdown };

if (require.main === module) {
  const r = assembleSite();
  console.log(`Assembled ${r.articleCount} article(s) -> ${r.pages} pages in ${path.relative(process.cwd(), r.distDir)}`);
  console.log('Files: ' + r.files.join(', '));
}
