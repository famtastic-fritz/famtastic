'use strict';
const fs = require('fs');
const path = require('path');

const STYLES_CSS = `/* Site Studio vNext — shared styles */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-body, system-ui, sans-serif);
  color: var(--color-text, #333);
  background: var(--color-bg, #fff);
  font-size: var(--size-base, 16px);
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* Navigation */
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-primary, #1e3a5f);
  box-shadow: 0 2px 8px rgba(0,0,0,.15);
}
.site-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .75rem 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}
.site-logo {
  color: #fff;
  font-family: var(--font-heading, serif);
  font-size: 1.25rem;
  font-weight: 700;
  text-decoration: none;
}
.nav-toggle {
  display: none;
  background: none;
  border: 1px solid rgba(255,255,255,.5);
  color: #fff;
  font-size: 1.25rem;
  cursor: pointer;
  padding: .25rem .5rem;
  border-radius: 4px;
}
.nav-menu {
  list-style: none;
  display: flex;
  gap: 1.5rem;
}
.nav-menu a {
  color: rgba(255,255,255,.9);
  text-decoration: none;
  font-size: .9rem;
  transition: color .2s;
}
.nav-menu a:hover, .nav-menu a.active { color: var(--color-accent, #c9a227); }

/* Hero */
.hero {
  min-height: 80vh;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, var(--color-primary, #1e3a5f) 0%, var(--color-secondary, #2c5282) 100%);
  color: #fff;
  text-align: center;
  padding: 4rem 0;
}
.hero h1 {
  font-family: var(--font-heading, serif);
  font-size: clamp(2rem, 5vw, 3.5rem);
  margin-bottom: 1rem;
  line-height: 1.2;
}
.hero .hero-body {
  font-size: 1.25rem;
  max-width: 600px;
  margin: 0 auto 2rem;
  opacity: .9;
}

/* CTA Buttons */
.btn-primary {
  display: inline-block;
  background: var(--color-accent, #c9a227);
  color: #fff;
  padding: .875rem 2.5rem;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: opacity .2s, transform .15s;
}
.btn-primary:hover { opacity: .9; transform: translateY(-1px); }

/* Services */
.services { padding: var(--space-2xl, 80px) 0; }
.services h2 {
  font-family: var(--font-heading, serif);
  font-size: 2rem;
  text-align: center;
  margin-bottom: 2.5rem;
  color: var(--color-primary, #1e3a5f);
}
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 2rem;
}
.service-card {
  background: var(--color-surface, #f7fafc);
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,.06);
  transition: transform .2s;
}
.service-card:hover { transform: translateY(-3px); }
.service-card h3 {
  font-family: var(--font-heading, serif);
  color: var(--color-primary, #1e3a5f);
  margin-bottom: .5rem;
}

/* About */
.about {
  padding: var(--space-2xl, 80px) 0;
  background: var(--color-surface, #f7fafc);
}
.about h2 {
  font-family: var(--font-heading, serif);
  font-size: 2rem;
  color: var(--color-primary, #1e3a5f);
  margin-bottom: 1.5rem;
}
.about p { max-width: 700px; line-height: 1.8; }
.differentiators { margin-top: 1.5rem; padding-left: 1.5rem; }
.differentiators li { margin-bottom: .5rem; }

/* Testimonials */
.testimonials { padding: var(--space-2xl, 80px) 0; }
.testimonials h2 {
  font-family: var(--font-heading, serif);
  font-size: 2rem;
  text-align: center;
  color: var(--color-primary, #1e3a5f);
  margin-bottom: 2.5rem;
}
blockquote {
  border-left: 4px solid var(--color-accent, #c9a227);
  padding: 1rem 1.5rem;
  margin: 1.5rem 0;
  background: var(--color-surface, #f7fafc);
  border-radius: 0 8px 8px 0;
}
blockquote cite { display: block; margin-top: .5rem; font-style: normal; color: var(--color-primary, #1e3a5f); font-weight: 600; }

/* CTA Banner */
.cta-banner {
  background: var(--color-primary, #1e3a5f);
  color: #fff;
  text-align: center;
  padding: var(--space-2xl, 80px) 0;
}
.cta-banner h2 {
  font-family: var(--font-heading, serif);
  font-size: 2.25rem;
  margin-bottom: 1.5rem;
}

/* Contact */
.contact { padding: var(--space-2xl, 80px) 0; }
.contact h2 {
  font-family: var(--font-heading, serif);
  font-size: 2rem;
  color: var(--color-primary, #1e3a5f);
  margin-bottom: 2rem;
}
.contact form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 600px;
}
.contact input, .contact textarea, form input, form textarea {
  width: 100%;
  padding: .75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: var(--font-body, sans-serif);
  font-size: 1rem;
}
.contact input:focus, .contact textarea:focus, form input:focus, form textarea:focus {
  outline: 2px solid var(--color-accent, #c9a227);
  border-color: transparent;
}

/* Misc sections */
.team, .values, .location, .hours, .section { padding: var(--space-xl, 48px) 0; }
.team h2, .values h2, .location h2, .hours h2, .section h2 {
  font-family: var(--font-heading, serif);
  font-size: 1.75rem;
  color: var(--color-primary, #1e3a5f);
  margin-bottom: 1rem;
}

/* Footer */
.site-footer {
  background: #222;
  color: rgba(255,255,255,.8);
  text-align: center;
  padding: 2rem 0;
  font-size: .875rem;
}
.site-footer p { margin-bottom: .25rem; }

/* Responsive */
@media (max-width: 768px) {
  .nav-toggle { display: block; }
  .nav-menu {
    display: none;
    flex-direction: column;
    position: absolute;
    top: 60px; left: 0; right: 0;
    background: var(--color-primary, #1e3a5f);
    padding: 1rem 1.5rem;
    gap: .75rem;
  }
  .nav-menu.open { display: flex; }
  .hero { min-height: 60vh; }
  .hero h1 { font-size: 1.75rem; }
  .hero .hero-body { font-size: 1rem; }
  .services-grid { grid-template-columns: 1fr; }
  .cta-banner h2 { font-size: 1.5rem; }
}
`;

const MAIN_JS = `document.addEventListener('DOMContentLoaded', function() {
  // Nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.querySelector('.nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function() {
      menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(menu.classList.contains('open')));
    });
  }
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      var target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});
`;

class SharedAssetsRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    const stagingDir = path.join(runContext.workspace_root, 'staging');
    const sideEffects = [];

    const cssPath = path.join(stagingDir, 'css', 'styles.css');
    fs.mkdirSync(path.dirname(cssPath), { recursive: true });
    fs.writeFileSync(cssPath, STYLES_CSS, 'utf8');
    sideEffects.push({ path: 'css/styles.css', kind: 'write' });

    const jsPath = path.join(stagingDir, 'js', 'main.js');
    fs.mkdirSync(path.dirname(jsPath), { recursive: true });
    fs.writeFileSync(jsPath, MAIN_JS, 'utf8');
    sideEffects.push({ path: 'js/main.js', kind: 'write' });

    return {
      result: {
        css_files: ['css/styles.css'],
        js_files: ['js/main.js'],
        static_files: [],
      },
      sideEffects,
      artifactReferences: [],
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      costUsd: 0,
    };
  }
}

module.exports = { SharedAssetsRunner };
