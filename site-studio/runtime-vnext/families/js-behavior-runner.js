'use strict';
const fs = require('fs');
const path = require('path');

const NAV_JS = `document.addEventListener('DOMContentLoaded', function() {
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.querySelector('.nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function() {
      menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', menu.classList.contains('open'));
    });
  }
});
`;

const SMOOTH_SCROLL_JS = `document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      var targetId = anchor.getAttribute('href');
      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});
`;

const SECTION_OBSERVER_JS = `document.addEventListener('DOMContentLoaded', function() {
  var navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');
  if (!navLinks.length || !('IntersectionObserver' in window)) return;
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        navLinks.forEach(function(link) { link.classList.remove('active'); });
        var activeLink = document.querySelector('.nav-menu a[href="#' + entry.target.id + '"]');
        if (activeLink) activeLink.classList.add('active');
      }
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('section[id]').forEach(function(section) {
    observer.observe(section);
  });
});
`;

const FORM_ENHANCE_JS = `document.addEventListener('DOMContentLoaded', function() {
  var forms = document.querySelectorAll('form');
  forms.forEach(function(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var email = form.querySelector('input[type="email"]');
      if (email && !email.value.includes('@')) {
        var errEl = form.querySelector('.form-error') || document.createElement('p');
        errEl.className = 'form-error';
        errEl.style.color = 'red';
        errEl.textContent = 'Please enter a valid email address.';
        if (!form.querySelector('.form-error')) form.insertBefore(errEl, form.querySelector('button'));
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      if (btn) btn.textContent = 'Sending...';
      setTimeout(function() {
        var msg = document.createElement('p');
        msg.className = 'form-success';
        msg.style.color = 'green';
        msg.textContent = 'Thank you! We will be in touch soon.';
        form.innerHTML = '';
        form.appendChild(msg);
      }, 800);
    });
  });
});
`;

class JsBehaviorRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    const b = request.buildRequest || {};
    const sm = request.siteManifest || {};
    const arch = request.architectureDecision || {};
    const stagingDir = path.join(runContext.workspace_root, 'staging');

    const modules = [];
    const sideEffects = [];

    function writeModule(id, feature, code) {
      const relPath = 'js/' + id + '.js';
      const fullPath = path.join(stagingDir, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, code, 'utf8');
      modules.push({ id, feature, output_path: relPath, code });
      sideEffects.push({ path: relPath, kind: 'write' });
    }

    writeModule('nav', 'navigation', NAV_JS);
    writeModule('smooth-scroll', 'smooth-scroll', SMOOTH_SCROLL_JS);

    const isSinglePage = arch.architecture === 'single-page' || (sm.pages || []).length <= 1;
    if (isSinglePage) {
      writeModule('section-observer', 'active-nav', SECTION_OBSERVER_JS);
    }

    // Check if any page has a contact form section
    const allPages = sm.pages || [];
    const hasForm = allPages.some(p => p.required_sections && (
      p.required_sections.includes('contact-form') || p.required_sections.includes('contact')
    ));
    // Also check buildRequest architecture constraints
    const constraints = b.architecture_constraints || {};
    const mustSupportForms = constraints.must_support_forms;

    if (hasForm || mustSupportForms) {
      writeModule('form-enhance', 'form-validation', FORM_ENHANCE_JS);
    }

    return {
      result: { modules },
      sideEffects,
      artifactReferences: [],
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      costUsd: 0,
    };
  }
}

module.exports = { JsBehaviorRunner };
