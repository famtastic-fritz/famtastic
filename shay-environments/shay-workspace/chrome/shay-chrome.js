/* shay-chrome.js — Part 3 visible rebrand overlay for Shay Workspace
 *
 * Intended load context: Electron preload script (webPreferences.preload)
 * for a packaged Shay Workspace.app wrapper around hermes-workspace v2.3
 * dist. This file lives in the Shay overlay; the upstream tree at
 * _refs/hermes-workspace-v2.3/ is read-only.
 *
 * Dev-mode (npm run dev / Vite) note: preload injection is not available
 * because we boot vite directly, not Electron. To activate this overlay
 * today, a thin Electron wrapper that loads http://127.0.0.1:3000 with
 * webPreferences.preload = <this file path> is required. See README.md
 * "Activation" section.
 *
 * Hookpoints (per inventory):
 *   - document.title: src/hooks/use-page-title.ts:3 (BASE_TITLE) +
 *     src/routes/__root.tsx:129 (root head meta title).
 *   - <link rel=icon|apple-touch-icon|manifest>: __root.tsx:166-186
 *   - boot splash <img>: __root.tsx:473-474 (claude-avatar.webp,
 *     claude-banner[-light].png) with alt="Hermes Agent" /
 *     "Hermes Workspace".
 *   - theme CSS custom properties: styles.css:712, :1086.
 *   - root meta description: __root.tsx:134.
 */

(function shayWorkspaceChrome() {
  'use strict';

  const SHAY_TITLE = 'Shay Workspace';
  const SHAY_DESCRIPTION =
    'Shay agent workspace for chat, tools, files, memory, and jobs.';
  const SHAY_SHORT_NAME = 'Shay';

  // Overlay-served asset paths. In Electron-wrapper mode these resolve to
  // file:// URLs registered by the main process; in any other context they
  // fall back to relative paths under /shay-chrome/.
  const ASSET_BASE =
    (typeof window !== 'undefined' && window.__SHAY_CHROME_ASSET_BASE__) ||
    '/shay-chrome';

  const ASSETS = {
    avatar: ASSET_BASE + '/shay-avatar.webp',
    bannerDark: ASSET_BASE + '/shay-banner.png',
    bannerLight: ASSET_BASE + '/shay-banner-light.png',
    favicon: ASSET_BASE + '/shay-favicon.svg',
    faviconIco: ASSET_BASE + '/shay-favicon.ico',
    icon192: ASSET_BASE + '/shay-icon-192.png',
    icon512: ASSET_BASE + '/shay-icon-512.png',
    appleTouch: ASSET_BASE + '/shay-apple-touch.png',
  };

  // ── 1. Pin document.title to "<Page> — Shay Workspace" ────────────────
  //
  // use-page-title.ts writes `${page} — Hermes Workspace`. We rewrite on
  // every set so the trailing brand becomes Shay Workspace. We also
  // install a MutationObserver on <title> as a belt-and-suspenders measure
  // in case React's head manager bypasses the setter.
  function rebrandTitle(value) {
    if (typeof value !== 'string') return value;
    return value
      .replace(/HermesWorld/g, 'ShayWorld')
      .replace(/Hermes Workspace/g, SHAY_TITLE)
      .replace(/Hermes Agent/g, 'Shay')
      .replace(/\bHermes\b/g, 'Shay');
  }

  try {
    const proto = Object.getOwnPropertyDescriptor(
      Document.prototype,
      'title'
    );
    if (proto && proto.set && proto.get) {
      Object.defineProperty(document, 'title', {
        configurable: true,
        get() {
          return proto.get.call(document);
        },
        set(value) {
          proto.set.call(document, rebrandTitle(value));
        },
      });
    }
  } catch (e) {
    console.warn('[shay-chrome] title setter override failed:', e);
  }

  // Belt-and-suspenders: override Node.prototype textContent setter
  // to catch React DOM manipulation that bypasses document.title.
  // textContent lives on Node.prototype, not HTMLTitleElement.prototype.
  try {
    const nodeProto = Object.getOwnPropertyDescriptor(
      Node.prototype,
      'textContent'
    );
    if (nodeProto && nodeProto.set) {
      const origSet = nodeProto.set;
      const origGet = nodeProto.get;
      Object.defineProperty(Node.prototype, 'textContent', {
        configurable: true,
        get() {
          return origGet.call(this);
        },
        set(value) {
          // Only rebrand title elements
          if (this.tagName === 'TITLE' || (this.parentNode && this.parentNode.tagName === 'TITLE')) {
            origSet.call(this, rebrandTitle(value));
          } else {
            origSet.call(this, value);
          }
        },
      });
    }
  } catch (e) {
    console.warn('[shay-chrome] Node textContent override failed:', e);
  }

  function installTitleObserver() {
    const titleEl = document.querySelector('title');
    if (!titleEl) return;
    const obs = new MutationObserver(() => {
      const current = titleEl.textContent || '';
      const fixed = rebrandTitle(current);
      if (fixed !== current) titleEl.textContent = fixed;
    });
    obs.observe(titleEl, { childList: true, characterData: true, subtree: true });
  }

  // ── 2. Rewrite <link rel=icon|apple-touch-icon|manifest> hrefs ────────
  function rewriteIconLinks() {
    document.querySelectorAll('link[rel]').forEach((link) => {
      const rel = (link.getAttribute('rel') || '').toLowerCase();
      if (rel.includes('apple-touch-icon')) {
        link.setAttribute('href', ASSETS.appleTouch);
      } else if (rel === 'icon' || rel === 'shortcut icon') {
        const sizes = link.getAttribute('sizes') || '';
        if (sizes.includes('512')) link.setAttribute('href', ASSETS.icon512);
        else if (sizes.includes('192')) link.setAttribute('href', ASSETS.icon192);
        else link.setAttribute('href', ASSETS.favicon);
      } else if (rel === 'manifest') {
        link.setAttribute('href', buildShayManifestDataUrl());
      }
    });
  }

  function buildShayManifestDataUrl() {
    const manifest = {
      name: SHAY_TITLE,
      short_name: SHAY_SHORT_NAME,
      description: SHAY_DESCRIPTION,
      id: '/?app=shay-workspace',
      start_url: '/?app=shay-workspace',
      display: 'standalone',
      background_color: '#0D0D1A',
      theme_color: '#1E5BFF',
      icons: [
        { src: ASSETS.icon192, sizes: '192x192', type: 'image/png' },
        { src: ASSETS.icon512, sizes: '512x512', type: 'image/png' },
      ],
    };
    return (
      'data:application/manifest+json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(manifest))
    );
  }

  // ── 3. Rewrite boot-splash <img> src + alt ────────────────────────────
  function rewriteImage(img) {
    if (!img || img.dataset.shayRebranded === '1') return;
    const src = img.getAttribute('src') || '';
    if (src.includes('claude-avatar')) {
      img.setAttribute('src', ASSETS.avatar);
      img.setAttribute('alt', 'Shay');
      img.dataset.shayRebranded = '1';
    } else if (src.includes('claude-banner-light')) {
      img.setAttribute('src', ASSETS.bannerLight);
      img.setAttribute('alt', SHAY_TITLE);
      img.dataset.shayRebranded = '1';
    } else if (src.includes('claude-banner')) {
      img.setAttribute('src', ASSETS.bannerDark);
      img.setAttribute('alt', SHAY_TITLE);
      img.dataset.shayRebranded = '1';
    } else if (
      (img.getAttribute('alt') || '').includes('Hermes')
    ) {
      img.setAttribute(
        'alt',
        rebrandTitle(img.getAttribute('alt') || '')
      );
      img.dataset.shayRebranded = '1';
    }
  }

  function sweepImages(root) {
    (root || document).querySelectorAll('img').forEach(rewriteImage);
  }

  function installBodyObserver() {
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.tagName === 'IMG') rewriteImage(node);
          else if (node.querySelectorAll) {
            sweepImages(node);
            sweepTextNodes(node);
          }
        });
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // ── 4. Rewrite root meta description ──────────────────────────────────
  function rewriteMetaDescription() {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', SHAY_DESCRIPTION);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', SHAY_TITLE);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', SHAY_DESCRIPTION);

    const appleTitle = document.querySelector(
      'meta[name="apple-mobile-web-app-title"]'
    );
    if (appleTitle) appleTitle.setAttribute('content', SHAY_SHORT_NAME);
  }

  // ── 6. Best-effort DOM text sweep for residual "Hermes" strings ──────
  const SWEEP_SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, NOSCRIPT: 1, CODE: 1, PRE: 1 };
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
        .replace(/HermesWorld/g, 'ShayWorld')
        .replace(/Hermes Workspace/g, 'Shay Workspace')
        .replace(/Hermes Agent/g, 'Shay')
        .replace(/\bHermes\b/g, 'Shay');
    }
  }

  function sweepAllText() {
    sweepTextNodes(document.body);
  }

  // ── 7. Inject the chrome stylesheet ───────────────────────────────────
  function injectStylesheet() {
    if (document.getElementById('shay-chrome-css')) return;
    const link = document.createElement('link');
    link.id = 'shay-chrome-css';
    link.rel = 'stylesheet';
    link.href = ASSET_BASE + '/shay-chrome.css';
    document.head.appendChild(link);
  }

  // ── boot ──────────────────────────────────────────────────────────────
  function boot() {
    try {
      injectStylesheet();
      installTitleObserver();
      rewriteIconLinks();
      rewriteMetaDescription();
      sweepImages(document);
      sweepAllText();
      installBodyObserver();
      // Pin title once at boot too, since BASE_TITLE may have already fired.
      if (document.title) document.title = document.title;
    } catch (e) {
      console.error('[shay-chrome] boot failed:', e);
    }
  }

  // Delayed sweeps to catch SPA content that renders after initial hydration.
  // TanStack Start + React hydrate async, so DOM content appears 100-500ms
  // after DOMContentLoaded.
  function scheduleSweeps() {
    const delays = [200, 500, 1000, 2000, 5000];
    delays.forEach((ms) => {
      setTimeout(() => {
        sweepImages(document);
        sweepAllText();
        rewriteIconLinks();
        rewriteMetaDescription();
        if (document.title) document.title = document.title;
      }, ms);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { boot(); scheduleSweeps(); }, { once: true });
  } else {
    boot();
    scheduleSweeps();
  }
})();
