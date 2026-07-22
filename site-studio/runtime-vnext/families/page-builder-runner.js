'use strict';
const fs = require('fs');
const path = require('path');

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderSection(section) {
  const c = section.content || {};
  switch (section.type || section.id) {
    case 'hero':
      return `<section class="hero" id="hero">
  <div class="container">
    <h1>${esc(c.heading)}</h1>
    <p class="hero-body">${esc(c.body)}</p>
    <a class="btn-primary" href="${esc((c.cta && c.cta.href) || '#contact')}">${esc((c.cta && c.cta.text) || 'Get Started')}</a>
  </div>
</section>`;
    case 'services':
    case 'services-grid':
    case 'services-overview':
    case 'services-intro': {
      const items = (c.items || []).map(i =>
        `    <div class="service-card"><h3>${esc(i.name)}</h3><p>${esc(i.description)}</p></div>`
      ).join('\n');
      return `<section class="services" id="services">
  <div class="container">
    <h2>${esc(c.heading || 'Our Services')}</h2>
    <div class="services-grid">
${items}
    </div>
  </div>
</section>`;
    }
    case 'about':
    case 'about-snippet':
    case 'about-story': {
      const diffs = (c.differentiators || []).map(d => `      <li>${esc(d)}</li>`).join('\n');
      return `<section class="about" id="about">
  <div class="container">
    <h2>${esc(c.heading || 'About Us')}</h2>
    <p>${esc(c.text)}</p>
    ${diffs ? `<ul class="differentiators">\n${diffs}\n    </ul>` : ''}
  </div>
</section>`;
    }
    case 'testimonials': {
      const quotes = (c.items || []).map(t =>
        `    <blockquote><p>${esc(typeof t === 'string' ? t : (t.text || t.quote || ''))}</p>${t.author ? `<cite>${esc(t.author)}</cite>` : ''}</blockquote>`
      ).join('\n');
      return `<section class="testimonials" id="testimonials">
  <div class="container">
    <h2>${esc(c.heading || 'What Clients Say')}</h2>
${quotes || '    <p>Testimonials coming soon.</p>'}
  </div>
</section>`;
    }
    case 'cta':
    case 'cta-banner':
      return `<section class="cta-banner" id="cta">
  <div class="container">
    <h2>${esc(c.heading || 'Ready to Get Started?')}</h2>
    <a class="btn-primary" href="#contact">${esc(c.cta || 'Contact Us')}</a>
  </div>
</section>`;
    case 'contact':
    case 'contact-form':
      return `<section class="contact" id="contact">
  <div class="container">
    <h2>${esc(c.heading || 'Contact Us')}</h2>
    <form method="POST" action="#">
      <input type="text" name="name" placeholder="Your Name" required aria-label="Your Name">
      <input type="email" name="email" placeholder="Email Address" required aria-label="Email Address">
      <textarea name="message" rows="5" placeholder="Your Message" required aria-label="Your Message"></textarea>
      <button type="submit" class="btn-primary">Send Message</button>
    </form>
  </div>
</section>`;
    case 'footer':
      return `<footer class="site-footer">
  <div class="container">
    <p>${esc(c.company)}${c.contact ? ' | ' + esc(c.contact) : ''}${c.hours ? ' | ' + esc(c.hours) : ''}</p>
    <p>&copy; ${esc(c.company || 'Site')}</p>
  </div>
</footer>`;
    case 'team':
      return `<section class="team" id="team">
  <div class="container">
    <h2>${esc(c.heading || 'Our Team')}</h2>
    <p>${esc(c.text)}</p>
  </div>
</section>`;
    case 'values': {
      const items = (c.items || []).map(v => `<li>${esc(v)}</li>`).join('\n      ');
      return `<section class="values" id="values">
  <div class="container">
    <h2>${esc(c.heading || 'Our Values')}</h2>
    ${items ? `<ul>\n      ${items}\n    </ul>` : ''}
  </div>
</section>`;
    }
    case 'location':
      return `<section class="location" id="location">
  <div class="container">
    <h2>${esc(c.heading || 'Find Us')}</h2>
    <p>${esc(c.address)}</p>
    ${c.hours ? `<p><strong>Hours:</strong> ${esc(c.hours)}</p>` : ''}
  </div>
</section>`;
    case 'hours':
      return `<section class="hours" id="hours">
  <div class="container">
    <h2>${esc(c.heading || 'Hours')}</h2>
    <p>${esc(c.text)}</p>
  </div>
</section>`;
    default:
      return `<section class="section ${esc(section.id)}" id="${esc(section.id)}">
  <div class="container">
    <h2>${esc(c.heading || section.id)}</h2>
    ${c.text ? `<p>${esc(c.text)}</p>` : ''}
  </div>
</section>`;
  }
}

class PageBuilderRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    const b = request.buildRequest || {};
    const pm = request.pageManifest || {};

    // Support both single contentPacket and array of contentPackets from foreach chain
    const contentPackets = request.contentPackets || [];
    const cp = request.contentPacket
      || contentPackets.find(c => c && c.page_id === pm.page_id)
      || contentPackets[0]
      || {};

    const dtp = request.designTokenPack || {};
    const seo = request.seoPackSlice || {};
    const biz = b.business || {};

    // Determine output path
    const route = pm.route || '/';
    let output_path = route === '/' ? 'index.html' : route.replace(/^\//, '').replace(/\/$/, '') + '.html';

    // Build navigation links
    const pages = (b._site_pages || []);
    const navLinks = pages.length > 1
      ? pages.map(p => `<a href="${esc(p.route)}">${esc(p.title)}</a>`).join('\n      ')
      : (cp.sections || []).filter(s => s.id !== 'footer').map(s =>
          `<a href="#${s.id}">${s.id.charAt(0).toUpperCase() + s.id.slice(1).replace(/-/g, ' ')}</a>`
        ).join('\n      ');

    const title = esc(seo.title || cp.meta_title || biz.name || 'Site');
    const description = esc(seo.description || cp.meta_description || '');

    const sectionHtml = (cp.sections || [])
      .filter(s => s.id !== 'footer')
      .map(renderSection)
      .join('\n\n');

    const footerSection = (cp.sections || []).find(s => s.id === 'footer');
    const footerHtml = footerSection ? renderSection(footerSection) : `<footer class="site-footer"><div class="container"><p>${esc(biz.name || 'Site')}</p></div></footer>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <link rel="stylesheet" href="/css/tokens.css">
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
<header class="site-header">
  <nav class="site-nav">
    <a class="site-logo" href="/">${esc(biz.name || 'Site')}</a>
    <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">&#9776;</button>
    <ul class="nav-menu">
      ${navLinks ? navLinks.split('\n').map(l => `<li>${l.trim()}</li>`).join('\n      ') : ''}
    </ul>
  </nav>
</header>

<main>
${sectionHtml}
</main>

${footerHtml}

<script src="/js/nav.js"></script>
<script src="/js/smooth-scroll.js"></script>
<script src="/js/main.js"></script>
</body>
</html>`;

    const stagingPath = path.join(runContext.workspace_root, 'staging', output_path);
    fs.mkdirSync(path.dirname(stagingPath), { recursive: true });
    fs.writeFileSync(stagingPath, html, 'utf8');

    const wordCount = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    const hasMph = request.mediaPlan && (request.mediaPlan.media_items || []).some(m => m.status === 'placeholder');

    return {
      result: {
        page_id: pm.page_id || 'home',
        route,
        output_path,
        word_count: wordCount,
        sections_rendered: (cp.sections || []).map(s => s.id),
        has_media_placeholders: hasMph || false,
      },
      sideEffects: [{ path: output_path, kind: 'write' }],
      artifactReferences: [],
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      costUsd: 0,
    };
  }
}

module.exports = { PageBuilderRunner };
