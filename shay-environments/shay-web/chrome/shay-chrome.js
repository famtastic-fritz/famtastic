/* shay-chrome.js — Shay Web visible rebrand overlay
 *
 * Loaded by hermes-webui via HERMES_WEBUI_EXTENSION_SCRIPT_URLS as <script defer>.
 * Upstream (_refs/hermes-webui-v0.51) is read-only.
 *
 * Responsibilities (per Part-3 decisions §4.2):
 *   1. Override window._botName early so applyBotName() picks 'Shay'.
 *   2. On DOMContentLoaded, swap:
 *      - #appTitlebarTitle textContent ("Hermes" -> "Shay Web")
 *      - .app-titlebar-icon innerHTML  (caduceus -> Shay monogram)
 *      - meta[name=apple-mobile-web-app-title] content
 *      - meta[name=theme-color]
 *      - all link[rel*=icon] and link[rel=apple-touch-icon] hrefs
 *   3. Install MutationObserver on <title> to defeat boot.js applyBotName()
 *      writing "Hermes" back over our value.
 *   4. Post-i18n DOM sweep replacing residual "Hermes" -> "Shay" in known
 *      visible regions (onboarding modal, settings labels, tooltips).
 *   5. Re-run the sweep on panel transitions (delegated click on the rail).
 *
 * Known limit: PWA manifest.json `name="Hermes"` cannot be JS-overridden
 * after install. Tier-B fix is a reverse-proxy /manifest.json rewrite.
 */

(function shayChrome() {
  'use strict';

  var BRAND_TITLE  = 'Shay Web';
  var BOT_NAME     = 'Shay';
  var THEME_COLOR  = '#1E5BFF';
  var FAVICON_SVG  = '/extensions/shay-favicon.svg';
  var APPLE_TOUCH  = '/extensions/shay-favicon.svg';
  var MARK_SVG_URL = '/extensions/shay-mark.svg';

  // (1) — Set the bot name BEFORE applyBotName() reads it.
  try { window._botName = BOT_NAME; } catch (_) { /* noop */ }

  // Inline SVG markup mirroring shay-mark.svg, used for the titlebar swap so
  // we don't need a separate fetch round-trip for a 16x16 mark.
  var MARK_INLINE_SVG = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="shay-mark" aria-label="Shay">',
    '  <defs>',
    '    <linearGradient id="shayMarkGrad" x1="0" y1="0" x2="1" y2="1">',
    '      <stop offset="0%" stop-color="#1E5BFF"/>',
    '      <stop offset="100%" stop-color="#0D3FCC"/>',
    '    </linearGradient>',
    '  </defs>',
    '  <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#shayMarkGrad)"/>',
    '  <path d="M42 22c-2-3-5.5-4.5-10-4.5-6 0-10 3-10 7.5 0 4 3 6 9 7.5 5 1.2 6.5 2 6.5 3.8 0 1.8-2 3-5 3-3.5 0-6-1.5-7.5-4l-4 3c2.2 4 6.5 6 11.5 6 6.5 0 10.5-3 10.5-8 0-4.3-3-6.3-9.5-7.8-4.5-1-6-1.8-6-3.5 0-1.7 1.8-2.8 4.8-2.8 2.8 0 4.8 1 6.2 3z" fill="#FEFCF7"/>',
    '  <g transform="translate(48 14)">',
    '    <path d="M0 -6 L1.4 -1.4 L6 0 L1.4 1.4 L0 6 L-1.4 1.4 L-6 0 L-1.4 -1.4 Z" fill="#F5C542"/>',
    '  </g>',
    '</svg>'
  ].join('\n');

  function setTitle() {
    if (document.title !== BRAND_TITLE) {
      document.title = BRAND_TITLE;
    }
  }

  function swapFavicons() {
    var links = document.querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]'
    );
    links.forEach(function (l) {
      var rel = (l.getAttribute('rel') || '').toLowerCase();
      if (rel.indexOf('apple') === 0) {
        l.setAttribute('href', APPLE_TOUCH);
      } else {
        l.setAttribute('href', FAVICON_SVG);
        l.setAttribute('type', 'image/svg+xml');
      }
    });

    // Belt + suspenders: ensure at least one favicon link exists.
    if (!document.querySelector('link[rel="icon"]')) {
      var link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      link.href = FAVICON_SVG;
      document.head.appendChild(link);
    }
  }

  function swapMeta() {
    var apple = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (apple) apple.setAttribute('content', BRAND_TITLE);

    var theme = document.querySelector('meta[name="theme-color"]');
    if (theme) {
      theme.setAttribute('content', THEME_COLOR);
    } else {
      var m = document.createElement('meta');
      m.name = 'theme-color';
      m.content = THEME_COLOR;
      document.head.appendChild(m);
    }
  }

  function swapTitlebar() {
    var title = document.getElementById('appTitlebarTitle');
    if (title && title.textContent !== BRAND_TITLE) {
      title.textContent = BRAND_TITLE;
    }
    var icon = document.querySelector('.app-titlebar-icon');
    if (icon && !icon.querySelector('svg.shay-mark')) {
      icon.innerHTML = MARK_INLINE_SVG;
    }
  }

  // (4) — Best-effort DOM text sweep for residual "Hermes" strings.
  // Conservative: only walks text nodes inside known visible regions and
  // skips inputs, scripts, styles.
  var SWEEP_ROOTS = [
    '.app-titlebar',
    '#onboardingModal',
    '#onboardingTitle',
    '.settings-panel',
    '.sidebar-nav',
    '.rail',
    '#dashboardPanel'
  ];
  var SWEEP_SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, CODE: 1, PRE: 1 };

  function sweepTextNodes(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var p = node.parentNode;
        if (!p || SWEEP_SKIP_TAGS[p.nodeName]) return NodeFilter.FILTER_REJECT;
        return /Hermes/.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var n;
    while ((n = walker.nextNode())) {
      n.nodeValue = n.nodeValue
        .replace(/Hermes Web UI/g, 'Shay Web')
        .replace(/Hermes WebUI/g, 'Shay Web')
        .replace(/Hermes Dashboard/g, 'Shay Dashboard')
        .replace(/Hermes Agent/g, 'Shay')
        .replace(/Hermes home/g, 'Shay home')
        .replace(/Hermes/g, 'Shay');
    }

    // Attribute sweep: tooltips, aria labels, placeholders.
    var attrEls = root.querySelectorAll('[data-tooltip], [aria-label], [placeholder], [title]');
    attrEls.forEach(function (el) {
      ['data-tooltip', 'aria-label', 'placeholder', 'title'].forEach(function (a) {
        var v = el.getAttribute(a);
        if (v && /Hermes/.test(v)) {
          el.setAttribute(a, v
            .replace(/Hermes Web UI/g, 'Shay Web')
            .replace(/Hermes WebUI/g, 'Shay Web')
            .replace(/Hermes Dashboard/g, 'Shay Dashboard')
            .replace(/Hermes Agent/g, 'Shay')
            .replace(/Hermes/g, 'Shay'));
        }
      });
    });
  }

  function sweepAll() {
    SWEEP_ROOTS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(sweepTextNodes);
    });
  }

  function applyAll() {
    setTitle();
    swapFavicons();
    swapMeta();
    swapTitlebar();
    sweepAll();
  }

  // (3) — Keep document.title pinned even after boot.js applyBotName clobbers it.
  function installTitleGuard() {
    var titleEl = document.querySelector('head > title');
    if (!titleEl) {
      titleEl = document.createElement('title');
      titleEl.textContent = BRAND_TITLE;
      document.head.appendChild(titleEl);
    }
    var mo = new MutationObserver(function () { setTitle(); });
    mo.observe(titleEl, { childList: true, characterData: true, subtree: true });
  }

  // (5) — Re-run when panels transition (settings, dashboard, onboarding).
  function installPanelHooks() {
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      if (t.closest('.rail, .sidebar-nav, .nav-tab, [data-action="open-settings"], [data-action="open-onboarding"]')) {
        // Defer a tick so the target panel has rendered.
        setTimeout(applyAll, 60);
        setTimeout(applyAll, 300);
      }
    }, true);

    // Also re-sweep when new nodes are added to <body> (lazy modals).
    var bodyMo = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        if (records[i].addedNodes && records[i].addedNodes.length) {
          sweepAll();
          return;
        }
      }
    });
    bodyMo.observe(document.body, { childList: true, subtree: true });
  }

  function boot() {
    applyAll();
    installTitleGuard();
    installPanelHooks();

    // Re-apply a few times for late initializers (i18n, applyBotName, panel hydration).
    setTimeout(applyAll, 100);
    setTimeout(applyAll, 500);
    setTimeout(applyAll, 1500);
    setTimeout(applyAll, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
