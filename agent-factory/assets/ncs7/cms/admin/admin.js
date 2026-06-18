/* ============================================================
   NCS7 CMS Admin — vanilla JS, no build step.
   Talks to the CMS REST API on the same origin.
   ============================================================ */
(function () {
  'use strict';

  var API = ''; // same origin
  var TOKEN_KEY = 'ncs7-cms-token';

  // ---------------- tiny DOM helpers ----------------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] === true) node.setAttribute(k, '');
        else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------------- toast ----------------
  function toast(msg, kind) {
    var host = $('#toast-host');
    var t = el('div', { class: 'toast ' + (kind || 'info'), text: msg });
    host.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .3s';
      t.style.opacity = '0';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, 3200);
  }

  // =========================================================
  // DATA LAYER
  // ---------------------------------------------------------
  // Every screen calls api(method, path, body). The data layer tries the real
  // server first. If the server is unreachable (running from file://, network
  // error, or any non-OK response) it transparently falls back to a
  // localStorage-backed store that mimics the same REST contract and returns
  // the same shapes. Function signature is unchanged, so no call site changed.
  // =========================================================

  // dataMode: 'unknown' | 'live' | 'offline'. Determined on the first call and
  // then sticky for the session, so we don't re-probe a dead server every call.
  var dataMode = 'unknown';

  function setDataMode(mode) {
    if (dataMode === mode) return;
    dataMode = mode;
    updateModeBadge();
  }

  // ---- real server fetch ----
  function apiFetch(method, path, body) {
    var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
    var tok = sessionStorage.getItem(TOKEN_KEY);
    if (tok) opts.headers.Authorization = 'Bearer ' + tok;
    if (body !== undefined) opts.body = JSON.stringify(body);
    return fetch(API + path, opts).then(function (r) {
      return r.text().then(function (txt) {
        var data = null;
        try { data = txt ? JSON.parse(txt) : null; } catch (_) { data = txt; }
        if (!r.ok) {
          var err = new Error((data && data.error) || ('HTTP ' + r.status));
          err.data = data; err.status = r.status;
          throw err;
        }
        return data;
      });
    });
  }

  function api(method, path, body) {
    // file:// has no server at all — go straight to offline, skip a doomed fetch.
    if (location.protocol === 'file:') {
      setDataMode('offline');
      return offlineApi(method, path, body);
    }
    // Once we know the server is dead this session, stay offline.
    if (dataMode === 'offline') {
      return offlineApi(method, path, body);
    }
    return apiFetch(method, path, body).then(function (data) {
      setDataMode('live');
      return data;
    }).catch(function (err) {
      // A real HTTP error from a live server (4xx/5xx with a status) means the
      // server IS there — surface it instead of masking it with demo data.
      if (dataMode === 'live' && err && typeof err.status === 'number') {
        throw err;
      }
      // Network/connection failure (TypeError from fetch, no status) → offline.
      setDataMode('offline');
      return offlineApi(method, path, body);
    });
  }

  // =========================================================
  // OFFLINE STORE (localStorage-backed REST emulation)
  // =========================================================
  var LS_KEY = 'ncs7-cms-store';        // serialized store
  var LS_VERSION_KEY = 'ncs7-cms-store-version';
  var STORE_VERSION = 1;

  // ---- embedded seed defaults (no network / no local JSON fetch) ----
  function seedStore() {
    return {
      site: {
        site: { name: 'National CAD Standard', tagline: 'Version 7' },
        home: {
          hero: {
            kicker: 'NCS Version 7',
            title: 'The National CAD Standard, made manageable.',
            subtitle: 'A unified standard for organizing and presenting building design data across construction documents.',
          },
        },
        about: {
          title: 'About the National CAD Standard',
          lead: 'The NCS streamlines the exchange of CAD data across the building design and construction industry.',
          body: 'The National CAD Standard (NCS) is a consensus standard developed by the National Institute of Building Sciences. It unifies layer naming, drawing organization, and presentation conventions so teams across disciplines can collaborate without translation overhead.',
        },
        contact: {
          office: {
            name: 'NCS Demo Office',
            email: 'info@ncs7-demo.example',
            phone: '(202) 555-0142',
            address: '1090 Vermont Ave NW, Suite 700, Washington, DC',
          },
        },
      },
      products: [
        {
          id: 'prod-uds', title: 'Uniform Drawing System (UDS)', sku: 'NCS7-UDS',
          category: 'Core Module', summary: 'Drawing set organization, sheet identification, and formatting.',
          description: 'The UDS establishes a consistent approach to organizing and presenting design data within construction documents, covering modules from drawing set organization to schedules.',
          pages: 248, format: 'PDF', price: 199,
          highlights: ['8 standardized modules', 'Sheet identification system', 'Drafting conventions'],
        },
        {
          id: 'prod-layer', title: 'AIA CAD Layer Guidelines', sku: 'NCS7-LAYER',
          category: 'Core Module', summary: 'Standardized layer naming for CAD files.',
          description: 'A complete framework for naming CAD layers consistently across disciplines, enabling clean data exchange and predictable file organization.',
          pages: 132, format: 'PDF', price: 149,
          highlights: ['Discipline designators', 'Major/minor group codes', 'Status fields'],
        },
        {
          id: 'prod-plotting', title: 'Plotting Guidelines', sku: 'NCS7-PLOT',
          category: 'Reference', summary: 'Pen widths, line types, and plotting consistency.',
          description: 'Guidance for consistent plotted output: line weights, screening, and color-to-pen mapping for readable, professional drawing sets.',
          pages: 64, format: 'PDF', price: 79,
          highlights: ['Line weight tables', 'Screening guidance', 'Color mapping'],
        },
      ],
      templates: [
        {
          id: 'tpl-standard-content', name: 'Standard Content Page',
          description: 'A general content page with heading, body, and a call to action.',
          blocks: [
            { type: 'heading', label: 'Page Heading', defaultValue: 'New Page' },
            { type: 'rich-text', label: 'Body', defaultValue: 'Write your page content here.' },
            { type: 'cta', label: 'Call To Action', defaultValue: 'Learn more' },
          ],
        },
        {
          id: 'tpl-landing', name: 'Landing Page',
          description: 'A marketing landing page with a hero, feature grid, and CTA.',
          blocks: [
            { type: 'hero', label: 'Hero', defaultValue: 'A bold headline for this landing page.' },
            { type: 'feature-grid', label: 'Features', defaultValue: 'Feature one\nFeature two\nFeature three' },
            { type: 'rich-text', label: 'Details', defaultValue: 'Supporting detail copy.' },
            { type: 'cta', label: 'Primary CTA', defaultValue: 'Get started' },
          ],
        },
      ],
      pages: [
        {
          id: 'page-getting-started', title: 'Getting Started with NCS7',
          slug: 'getting-started', templateId: 'tpl-standard-content', published: true,
          blocks: [
            { type: 'heading', label: 'Page Heading', value: 'Getting Started with NCS7' },
            { type: 'rich-text', label: 'Body', value: 'This page walks new adopters through implementing the National CAD Standard in their first project.' },
            { type: 'cta', label: 'Call To Action', value: 'Download the overview' },
          ],
        },
      ],
      tutor: [
        {
          q: 'what is the national cad standard',
          a: 'The National CAD Standard (NCS) is a consensus standard from the National Institute of Building Sciences that unifies CAD layer naming, drawing set organization, and presentation conventions so design and construction teams can exchange data consistently.',
        },
        {
          q: 'layer naming',
          a: 'NCS layer naming (from the AIA CAD Layer Guidelines) uses a structured format: a discipline designator (e.g. A for Architectural), a major group, optional minor groups, and a status field. This makes layers predictable and machine-parseable across files.',
        },
        {
          q: 'new in ncs version 7',
          a: 'NCS Version 7 refines the Uniform Drawing System modules, updates the AIA CAD Layer Guidelines, and improves plotting and presentation guidance, with clarifications aimed at BIM-era workflows.',
        },
        {
          q: 'cost price how much',
          a: 'In this demo, individual modules are priced per product (see the Products screen). The Uniform Drawing System is $199, the AIA CAD Layer Guidelines are $149, and the Plotting Guidelines are $79. A real deployment would wire pricing to a live catalog.',
        },
      ],
      _seq: 1,
    };
  }

  function loadStore() {
    var raw = null;
    try { raw = localStorage.getItem(LS_KEY); } catch (_) { raw = null; }
    var ver = null;
    try { ver = localStorage.getItem(LS_VERSION_KEY); } catch (_) { ver = null; }
    if (!raw || String(ver) !== String(STORE_VERSION)) {
      var fresh = seedStore();
      saveStore(fresh);
      return fresh;
    }
    try { return JSON.parse(raw); } catch (_) {
      var s = seedStore(); saveStore(s); return s;
    }
  }

  function saveStore(store) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(store));
      localStorage.setItem(LS_VERSION_KEY, String(STORE_VERSION));
    } catch (_) { /* localStorage unavailable — store stays in-memory only */ }
  }

  function resetStore() {
    try { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_VERSION_KEY); } catch (_) {}
    return loadStore();
  }

  function nextId(store, prefix) {
    store._seq = (store._seq || 0) + 1;
    return prefix + '-' + Date.now().toString(36) + '-' + store._seq;
  }

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  // Resolve a promise asynchronously so offline behaves like a real fetch.
  function resolved(v) { return new Promise(function (res) { setTimeout(function () { res(v); }, 0); }); }
  function rejected(msg, status) {
    return new Promise(function (_, rej) {
      setTimeout(function () {
        var e = new Error(msg); e.status = status || 404; e.offline = true; rej(e);
      }, 0);
    });
  }

  function findById(arr, id) {
    for (var i = 0; i < arr.length; i++) { if (arr[i].id === id) return i; }
    return -1;
  }

  // Tutor: naive keyword overlap against the embedded knowledge set.
  function tutorAnswer(store, question) {
    var q = String(question || '').toLowerCase();
    var best = null, bestScore = 0, bestMatch = '';
    (store.tutor || []).forEach(function (entry) {
      var words = entry.q.split(/\s+/);
      var score = 0;
      words.forEach(function (w) { if (w.length > 2 && q.indexOf(w) !== -1) score++; });
      if (score > bestScore) { bestScore = score; best = entry; bestMatch = entry.q; }
    });
    if (best && bestScore > 0) {
      return { answer: best.a, source: 'offline-kb', matched: bestMatch };
    }
    return {
      answer: 'I do not have an offline answer for that yet. Try asking about the National CAD Standard, layer naming, what is new in Version 7, or pricing. (A real LLM can be plugged in server-side.)',
      source: 'offline-kb', matched: null,
    };
  }

  // ---- the offline router: parses method+path and mutates the store ----
  function offlineApi(method, path, body) {
    var store = loadStore();
    var clean = path.split('?')[0];
    var parts = clean.split('/').filter(Boolean); // e.g. ['api','products','prod-uds']
    if (parts[0] !== 'api') return rejected('Not found: ' + path, 404);
    var res = parts[1];
    var id = parts[2] ? decodeURIComponent(parts[2]) : null;
    var sub = parts[2]; // for /api/pages/from-template, sub === 'from-template'

    // ---- login ----
    if (res === 'login' && method === 'POST') {
      var u = body && body.username, p = body && body.password;
      if (!u || !p) return rejected('Username and password required', 400);
      return resolved({ token: 'offline-demo-token', user: { username: u } });
    }

    // ---- tutor ----
    if (res === 'tutor' && method === 'POST') {
      return resolved(tutorAnswer(store, body && body.question));
    }

    // ---- site (singleton) ----
    if (res === 'site') {
      if (method === 'GET') return resolved(clone(store.site));
      if (method === 'PUT') { store.site = clone(body || {}); saveStore(store); return resolved(clone(store.site)); }
    }

    // ---- collections: products, pages, templates ----
    if (res === 'products' || res === 'pages' || res === 'templates') {
      var coll = store[res];

      // special: create page from template
      if (res === 'pages' && method === 'POST' && sub === 'from-template') {
        var tplIdx = findById(store.templates, body && body.templateId);
        if (tplIdx === -1) return rejected('Template not found', 404);
        var tpl = store.templates[tplIdx];
        var newPage = {
          id: nextId(store, 'page'),
          title: (body && body.title) || 'Untitled Page',
          slug: (body && body.slug) || slugify((body && body.title) || 'untitled-page'),
          templateId: tpl.id,
          published: false,
          blocks: (tpl.blocks || []).map(function (b) {
            return { type: b.type, label: b.label, value: b.defaultValue != null ? b.defaultValue : '' };
          }),
        };
        store.pages.push(newPage);
        saveStore(store);
        return resolved(clone(newPage));
      }

      // list
      if (!id && method === 'GET') return resolved(clone(coll));

      // create
      if (!id && method === 'POST') {
        var created = clone(body || {});
        created.id = nextId(store, res.slice(0, 4));
        if (res === 'pages') {
          if (!created.slug) created.slug = slugify(created.title || 'page');
          created.published = !!created.published;
          created.blocks = created.blocks || [];
        }
        coll.push(created);
        saveStore(store);
        return resolved(clone(created));
      }

      // single read
      if (id && method === 'GET') {
        var gi = findById(coll, id);
        if (gi === -1) return rejected(capitalize(res) + ' not found', 404);
        return resolved(clone(coll[gi]));
      }

      // update
      if (id && method === 'PUT') {
        var ui = findById(coll, id);
        if (ui === -1) return rejected(capitalize(res) + ' not found', 404);
        var updated = clone(body || {});
        updated.id = id;
        coll[ui] = updated;
        saveStore(store);
        return resolved(clone(updated));
      }

      // delete
      if (id && method === 'DELETE') {
        var di = findById(coll, id);
        if (di === -1) return rejected(capitalize(res) + ' not found', 404);
        coll.splice(di, 1);
        saveStore(store);
        return resolved({ ok: true });
      }
    }

    return rejected('Offline store: unhandled ' + method + ' ' + path, 404);
  }

  function slugify(s) {
    return String(s || '').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page';
  }
  function capitalize(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1, -1) || s; }

  // ---------------- mode badge ----------------
  function updateModeBadge() {
    var badge = $('#data-mode-badge');
    if (!badge) return;
    if (dataMode === 'live') {
      badge.textContent = 'Live API';
      badge.className = 'mode-badge mode-live';
      badge.title = 'Connected to the CMS server REST API.';
    } else if (dataMode === 'offline') {
      badge.textContent = 'Offline demo (localStorage)';
      badge.className = 'mode-badge mode-offline';
      badge.title = 'No server reachable. Data is read from and saved to your browser localStorage.';
    } else {
      badge.textContent = 'Connecting…';
      badge.className = 'mode-badge mode-unknown';
      badge.title = 'Determining data source.';
    }
  }

  function initResetControl() {
    var btn = $('#reset-demo-btn');
    if (!btn) return;
    function sync() { btn.hidden = dataMode !== 'offline'; }
    btn.addEventListener('click', function () {
      if (!confirm('Reset all demo data back to the seeded defaults? Any offline edits will be lost.')) return;
      resetStore();
      toast('Demo data reset', 'ok');
      navigate(currentView || 'dashboard');
    });
    // Keep visibility in sync as mode changes.
    var origUpdate = updateModeBadge;
    updateModeBadge = function () { origUpdate(); sync(); };
    sync();
  }

  // =========================================================
  // LOGIN
  // =========================================================
  function initLogin() {
    var form = $('#login-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var u = $('#login-username').value.trim();
      var p = $('#login-password').value.trim();
      var errEl = $('#login-error');
      errEl.hidden = true;
      if (!u || !p) {
        errEl.textContent = 'Enter any non-empty username and password.';
        errEl.hidden = false;
        return;
      }
      api('POST', '/api/login', { username: u, password: p })
        .then(function (res) {
          sessionStorage.setItem(TOKEN_KEY, res.token || 'demo-token');
          showApp();
        })
        .catch(function (err) {
          errEl.textContent = err.message || 'Login failed.';
          errEl.hidden = false;
        });
    });
  }

  function showApp() {
    $('#login-screen').hidden = true;
    $('#app').hidden = false;
    navigate('dashboard');
  }
  function showLogin() {
    sessionStorage.removeItem(TOKEN_KEY);
    $('#app').hidden = true;
    $('#login-screen').hidden = false;
  }

  // =========================================================
  // NAVIGATION
  // =========================================================
  var VIEWS = {};
  var TITLES = {
    dashboard: 'Dashboard', site: 'Site Content', pages: 'Pages',
    templates: 'Templates', products: 'Products', tutor: 'AI Tutor',
  };

  var currentView = 'dashboard';
  function navigate(view) {
    currentView = view;
    var btns = document.querySelectorAll('.nav-item');
    btns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-view') === view); });
    $('#view-title').textContent = TITLES[view] || view;
    var root = $('#view-root');
    root.innerHTML = '';
    (VIEWS[view] || function () { root.appendChild(el('div', { class: 'empty', text: 'Coming soon.' })); })(root);
  }

  function initNav() {
    document.querySelectorAll('.nav-item').forEach(function (b) {
      b.addEventListener('click', function () { navigate(b.getAttribute('data-view')); });
    });
    $('#logout-btn').addEventListener('click', showLogin);
  }

  // =========================================================
  // DASHBOARD
  // =========================================================
  VIEWS.dashboard = function (root) {
    var grid = el('div', { class: 'stat-grid' });
    root.appendChild(el('div', { class: 'card' }, [
      el('h2', { text: 'Overview' }),
      el('p', { class: 'card-sub', text: 'A simple, customizable CMS for the National CAD Standard demo. Everything you edit here flows straight to the live site via /api/content.' }),
      grid,
    ]));

    function stat(num, label) {
      return el('div', { class: 'stat' }, [
        el('div', { class: 'stat-num', text: String(num) }),
        el('div', { class: 'stat-label', text: label }),
      ]);
    }
    Promise.all([
      api('GET', '/api/products').catch(function () { return []; }),
      api('GET', '/api/pages').catch(function () { return []; }),
      api('GET', '/api/templates').catch(function () { return []; }),
    ]).then(function (r) {
      var prods = r[0] || [], pages = r[1] || [], tpls = r[2] || [];
      grid.appendChild(stat(prods.length, 'CAD Standard Products'));
      grid.appendChild(stat(pages.length, 'CMS Pages'));
      grid.appendChild(stat(pages.filter(function (p) { return p.published; }).length, 'Published Pages'));
      grid.appendChild(stat(tpls.length, 'Page Templates'));
    });

    root.appendChild(el('div', { class: 'card' }, [
      el('h2', { text: 'Quick actions' }),
      el('div', { class: 'card-actions' }, [
        el('button', { class: 'btn', onclick: function () { navigate('site'); }, text: 'Edit site content' }),
        el('button', { class: 'btn', onclick: function () { navigate('pages'); }, text: 'Create a page' }),
        el('button', { class: 'btn', onclick: function () { navigate('products'); }, text: 'Manage products' }),
        el('a', { class: 'btn', href: '/', target: '_blank', text: 'Open live site ↗' }),
      ]),
    ]));
  };

  // =========================================================
  // SITE CONTENT
  // =========================================================
  VIEWS.site = function (root) {
    root.appendChild(el('div', { class: 'empty', text: 'Loading site content…' }));
    api('GET', '/api/site').then(function (site) {
      root.innerHTML = '';
      site = site || {};
      site.home = site.home || {}; site.home.hero = site.home.hero || {};
      site.about = site.about || {};
      site.contact = site.contact || {}; site.contact.office = site.contact.office || {};
      site.site = site.site || {};

      // ---- Home hero ----
      var heroTitle = inputField('Hero Title', site.home.hero.title);
      var heroSub = textareaField('Hero Subtitle', site.home.hero.subtitle);
      var heroKicker = inputField('Hero Kicker', site.home.hero.kicker);

      // ---- About ----
      var aboutTitle = inputField('About Title', site.about.title);
      var aboutLead = textareaField('About Lead', site.about.lead);
      var aboutBody = textareaField('About Body', site.about.body, 5);

      // ---- Contact ----
      var cName = inputField('Office Name', site.contact.office.name);
      var cEmail = inputField('Email', site.contact.office.email);
      var cPhone = inputField('Phone', site.contact.office.phone);
      var cAddr = inputField('Address', site.contact.office.address);

      // raw JSON fallback
      var rawArea = el('textarea', { class: 'mono', rows: 14 });
      rawArea.value = JSON.stringify(site, null, 2);

      root.appendChild(card('Home hero', 'Shown at the top of the homepage.', [
        heroKicker.wrap, heroTitle.wrap, heroSub.wrap,
      ]));
      root.appendChild(card('About page', 'The About the NCS page content.', [
        aboutTitle.wrap, aboutLead.wrap, aboutBody.wrap,
      ]));
      root.appendChild(card('Contact details', 'Office contact information shown across the site.', [
        cName.wrap, cEmail.wrap, cPhone.wrap, cAddr.wrap,
      ]));

      var saveBtn = el('button', { class: 'btn btn-primary', text: 'Save site content' });
      var msg = el('p', { class: 'inline-msg' });
      saveBtn.addEventListener('click', function () {
        // Re-read raw area in case it was edited (advanced), else apply field values.
        var payload;
        try {
          payload = JSON.parse(rawArea.value);
        } catch (e) {
          payload = site;
        }
        payload.home = payload.home || {}; payload.home.hero = payload.home.hero || {};
        payload.about = payload.about || {};
        payload.contact = payload.contact || {}; payload.contact.office = payload.contact.office || {};
        payload.home.hero.kicker = heroKicker.input.value;
        payload.home.hero.title = heroTitle.input.value;
        payload.home.hero.subtitle = heroSub.input.value;
        payload.about.title = aboutTitle.input.value;
        payload.about.lead = aboutLead.input.value;
        payload.about.body = aboutBody.input.value;
        payload.contact.office.name = cName.input.value;
        payload.contact.office.email = cEmail.input.value;
        payload.contact.office.phone = cPhone.input.value;
        payload.contact.office.address = cAddr.input.value;

        saveBtn.disabled = true;
        api('PUT', '/api/site', payload).then(function () {
          msg.textContent = 'Saved. Changes are live on the site now.';
          msg.className = 'inline-msg ok';
          rawArea.value = JSON.stringify(payload, null, 2);
          toast('Site content saved', 'ok');
        }).catch(function (err) {
          msg.textContent = 'Save failed: ' + err.message;
          msg.className = 'inline-msg err';
          toast('Save failed', 'err');
        }).then(function () { saveBtn.disabled = false; });
      });

      var rawWrap = el('details', { class: 'card' }, [
        el('summary', { text: 'Advanced: raw JSON (for nested arrays like stats, principles, timeline)' }),
        el('p', { class: 'help', text: 'Editing this JSON and saving will override the fields above for any keys it changes. Use for nested arrays not exposed as fields.' }),
        rawArea,
      ]);
      root.appendChild(rawWrap);

      var bar = el('div', { class: 'card' }, []);
      bar.appendChild(el('div', { class: 'card-actions' }, [saveBtn]));
      bar.appendChild(msg);
      root.appendChild(bar);
    }).catch(function (err) {
      root.innerHTML = '';
      root.appendChild(el('div', { class: 'empty', text: 'Failed to load site content: ' + err.message }));
    });
  };

  // =========================================================
  // PAGES
  // =========================================================
  VIEWS.pages = function (root) {
    var head = el('div', { class: 'section-head' }, [
      el('h2', { text: 'Pages' }),
      el('button', { class: 'btn btn-primary', text: '+ New page from template', onclick: openNewPageModal }),
    ]);
    root.appendChild(head);
    var listHost = el('div', { class: 'list' });
    root.appendChild(listHost);

    function refresh() {
      listHost.innerHTML = '<div class="empty">Loading…</div>';
      api('GET', '/api/pages').then(function (pages) {
        listHost.innerHTML = '';
        if (!pages.length) {
          listHost.appendChild(el('div', { class: 'empty', text: 'No pages yet. Create one from a template.' }));
          return;
        }
        pages.forEach(function (p) {
          var badge = el('span', { class: 'badge ' + (p.published ? 'badge-pub' : 'badge-draft'), text: p.published ? 'Published' : 'Draft' });
          var row = el('div', { class: 'list-row' }, [
            el('div', { class: 'lr-main' }, [
              el('div', { class: 'lr-title' }, [document.createTextNode(p.title + '  '), badge]),
              el('div', { class: 'lr-sub', text: '/' + p.slug + '  ·  ' + (p.blocks ? p.blocks.length : 0) + ' blocks  ·  ' + (p.templateId || 'no template') }),
            ]),
            el('div', { class: 'lr-actions' }, [
              el('button', { class: 'btn btn-sm', text: 'Edit', onclick: function () { openEditPage(p.id); } }),
              el('button', { class: 'btn btn-sm btn-danger', text: 'Delete', onclick: function () { delPage(p.id, p.title); } }),
            ]),
          ]);
          listHost.appendChild(row);
        });
      }).catch(function (err) {
        listHost.innerHTML = '<div class="empty">Failed to load pages: ' + esc(err.message) + '</div>';
      });
    }

    function openNewPageModal() {
      api('GET', '/api/templates').then(function (tpls) {
        if (!tpls.length) { toast('Create a template first', 'err'); return; }
        var sel = el('select', {});
        tpls.forEach(function (t) { sel.appendChild(el('option', { value: t.id, text: t.name })); });
        var title = inputField('Page Title', '');
        var slug = inputField('Slug (optional)', '');
        modal('New page from template', 'Pick a template, then name the page. Blocks are copied from the template defaults.', [
          field('Template', sel), title.wrap, slug.wrap,
        ], function (close) {
          api('POST', '/api/pages/from-template', { templateId: sel.value, title: title.input.value || 'Untitled Page', slug: slug.input.value })
            .then(function (page) { toast('Page created', 'ok'); close(); refresh(); openEditPage(page.id); })
            .catch(function (err) { toast('Failed: ' + err.message, 'err'); });
        });
      });
    }

    function openEditPage(id) {
      api('GET', '/api/pages/' + encodeURIComponent(id)).then(function (p) {
        var title = inputField('Title', p.title);
        var slug = inputField('Slug', p.slug);
        var pub = el('input', { type: 'checkbox' });
        pub.checked = !!p.published;
        var pubWrap = el('label', { class: 'field' }, [
          el('span', { class: 'field-label', text: 'Published' }),
          el('div', {}, [pub, document.createTextNode(' Visible on the site')]),
        ]);

        var blocksHost = el('div', {});
        (p.blocks || []).forEach(function (b, i) {
          blocksHost.appendChild(renderBlockEditor(b, i));
        });

        modal('Edit page', 'Edit each content block. Block inputs adapt to the block type.', [
          title.wrap, slug.wrap, pubWrap,
          el('div', { class: 'field-label', text: 'Content blocks' }),
          blocksHost,
        ], function (close) {
          var blocks = [];
          var nodes = blocksHost.querySelectorAll('[data-block]');
          nodes.forEach(function (n) {
            blocks.push({ type: n.getAttribute('data-type'), label: n.getAttribute('data-label'), value: n.querySelector('[data-val]').value });
          });
          api('PUT', '/api/pages/' + encodeURIComponent(id), {
            title: title.input.value, slug: slug.input.value,
            templateId: p.templateId, published: pub.checked, blocks: blocks,
          }).then(function () { toast('Page saved', 'ok'); close(); refresh(); })
            .catch(function (err) { toast('Save failed: ' + err.message, 'err'); });
        }, 'Save page');
      });
    }

    function delPage(id, title) {
      if (!confirm('Delete page "' + title + '"? This cannot be undone.')) return;
      api('DELETE', '/api/pages/' + encodeURIComponent(id))
        .then(function () { toast('Page deleted', 'ok'); refresh(); })
        .catch(function (err) { toast('Delete failed: ' + err.message, 'err'); });
    }

    refresh();
  };

  function renderBlockEditor(block, i) {
    var type = block.type || 'text';
    var input;
    var multiline = ['rich-text', 'feature-grid', 'hero', 'text'].indexOf(type) !== -1;
    if (multiline) {
      input = el('textarea', { 'data-val': true, rows: type === 'feature-grid' ? 5 : 3 });
      input.value = block.value != null ? block.value : '';
    } else {
      input = el('input', { type: 'text', 'data-val': true });
      input.value = block.value != null ? block.value : '';
    }
    var wrap = el('div', { class: 'block-edit', 'data-block': true, 'data-type': type, 'data-label': block.label || '' }, [
      el('div', { class: 'be-head' }, [
        el('span', { class: 'field-label', text: block.label || type, style: 'margin:0' }),
        el('span', { class: 'be-type', text: type }),
      ]),
      input,
    ]);
    return wrap;
  }

  // =========================================================
  // TEMPLATES
  // =========================================================
  VIEWS.templates = function (root) {
    var head = el('div', { class: 'section-head' }, [
      el('h2', { text: 'Templates' }),
      el('button', { class: 'btn btn-primary', text: '+ New template', onclick: function () { openTemplate(null); } }),
    ]);
    root.appendChild(head);
    var listHost = el('div', { class: 'list' });
    root.appendChild(listHost);

    function refresh() {
      listHost.innerHTML = '<div class="empty">Loading…</div>';
      api('GET', '/api/templates').then(function (tpls) {
        listHost.innerHTML = '';
        if (!tpls.length) { listHost.appendChild(el('div', { class: 'empty', text: 'No templates yet.' })); return; }
        tpls.forEach(function (t) {
          listHost.appendChild(el('div', { class: 'list-row' }, [
            el('div', { class: 'lr-main' }, [
              el('div', { class: 'lr-title', text: t.name }),
              el('div', { class: 'lr-sub', text: (t.blocks ? t.blocks.length : 0) + ' blocks  ·  ' + (t.description || '') }),
            ]),
            el('div', { class: 'lr-actions' }, [
              el('button', { class: 'btn btn-sm', text: 'Edit', onclick: function () { openTemplate(t.id); } }),
              el('button', { class: 'btn btn-sm btn-danger', text: 'Delete', onclick: function () { delTpl(t.id, t.name); } }),
            ]),
          ]));
        });
      }).catch(function (err) { listHost.innerHTML = '<div class="empty">Failed: ' + esc(err.message) + '</div>'; });
    }

    function blockRow(b) {
      var typeSel = el('select', { 'data-bt': true });
      ['heading', 'rich-text', 'text', 'image', 'cta', 'hero', 'feature-grid'].forEach(function (tp) {
        var o = el('option', { value: tp, text: tp });
        if (tp === (b && b.type)) o.selected = true;
        typeSel.appendChild(o);
      });
      var label = el('input', { type: 'text', 'data-bl': true, placeholder: 'Label' });
      label.value = (b && b.label) || '';
      var def = el('input', { type: 'text', 'data-bd': true, placeholder: 'Default value' });
      def.value = (b && b.defaultValue) || '';
      var row = el('div', { class: 'block-edit', 'data-brow': true }, [
        el('div', { class: 'grid-2' }, [field('Type', typeSel), field('Label', label)]),
        field('Default value', def),
        el('button', { class: 'btn btn-sm btn-danger', text: 'Remove block', onclick: function () { row.parentNode.removeChild(row); } }),
      ]);
      return row;
    }

    function openTemplate(id) {
      function build(t) {
        t = t || { name: '', description: '', blocks: [] };
        var name = inputField('Name', t.name);
        var desc = textareaField('Description', t.description);
        var blocksHost = el('div', {});
        (t.blocks || []).forEach(function (b) { blocksHost.appendChild(blockRow(b)); });
        var addBtn = el('button', { class: 'btn btn-sm', text: '+ Add block', onclick: function () { blocksHost.appendChild(blockRow(null)); } });

        modal(id ? 'Edit template' : 'New template', 'Templates define the blocks new pages start with.', [
          name.wrap, desc.wrap,
          el('div', { class: 'field-label', text: 'Blocks' }), blocksHost, addBtn,
        ], function (close) {
          var blocks = [];
          blocksHost.querySelectorAll('[data-brow]').forEach(function (r) {
            blocks.push({
              type: r.querySelector('[data-bt]').value,
              label: r.querySelector('[data-bl]').value,
              defaultValue: r.querySelector('[data-bd]').value,
            });
          });
          var payload = { name: name.input.value, description: desc.input.value, blocks: blocks };
          var req = id ? api('PUT', '/api/templates/' + encodeURIComponent(id), payload) : api('POST', '/api/templates', payload);
          req.then(function () { toast('Template saved', 'ok'); close(); refresh(); })
            .catch(function (err) { toast('Save failed: ' + err.message, 'err'); });
        }, 'Save template');
      }
      if (id) api('GET', '/api/templates/' + encodeURIComponent(id)).then(build); else build(null);
    }

    function delTpl(id, name) {
      if (!confirm('Delete template "' + name + '"?')) return;
      api('DELETE', '/api/templates/' + encodeURIComponent(id))
        .then(function () { toast('Template deleted', 'ok'); refresh(); })
        .catch(function (err) { toast('Delete failed: ' + err.message, 'err'); });
    }

    refresh();
  };

  // =========================================================
  // PRODUCTS
  // =========================================================
  VIEWS.products = function (root) {
    var head = el('div', { class: 'section-head' }, [
      el('h2', { text: 'CAD Standard Products' }),
      el('button', { class: 'btn btn-primary', text: '+ Add product', onclick: function () { openProduct(null); } }),
    ]);
    root.appendChild(head);
    var wrap = el('div', { class: 'table-wrap' });
    root.appendChild(wrap);

    function refresh() {
      wrap.innerHTML = '<div class="empty">Loading…</div>';
      api('GET', '/api/products').then(function (prods) {
        wrap.innerHTML = '';
        if (!prods.length) { wrap.appendChild(el('div', { class: 'empty', text: 'No products yet.' })); return; }
        var tbody = el('tbody');
        prods.forEach(function (p) {
          tbody.appendChild(el('tr', {}, [
            el('td', {}, [el('strong', { text: p.title || '' })]),
            el('td', { text: p.sku || '' }),
            el('td', { text: p.category || '' }),
            el('td', { text: p.price != null ? '$' + p.price : '' }),
            el('td', {}, [el('div', { class: 'row-actions' }, [
              el('button', { class: 'btn btn-sm', text: 'Edit', onclick: function () { openProduct(p.id); } }),
              el('button', { class: 'btn btn-sm btn-danger', text: 'Delete', onclick: function () { delProduct(p.id, p.title); } }),
            ])]),
          ]));
        });
        wrap.appendChild(el('table', {}, [
          el('thead', {}, [el('tr', {}, [
            el('th', { text: 'Title' }), el('th', { text: 'SKU' }), el('th', { text: 'Category' }),
            el('th', { text: 'Price' }), el('th', { text: 'Actions' }),
          ])]),
          tbody,
        ]));
      }).catch(function (err) { wrap.innerHTML = '<div class="empty">Failed: ' + esc(err.message) + '</div>'; });
    }

    function openProduct(id) {
      function build(p) {
        p = p || {};
        var title = inputField('Title', p.title);
        var sku = inputField('SKU', p.sku);
        var category = inputField('Category', p.category);
        var summary = textareaField('Summary', p.summary);
        var description = textareaField('Description', p.description, 4);
        var pages = inputField('Pages', p.pages); pages.input.type = 'number';
        var format = inputField('Format', p.format || 'PDF');
        var price = inputField('Price (USD)', p.price); price.input.type = 'number';
        var highlights = textareaField('Highlights (one per line)', (p.highlights || []).join('\n'));

        modal(id ? 'Edit product' : 'Add product', 'CAD standard module sold as a downloadable PDF.', [
          el('div', { class: 'grid-2' }, [title.wrap, sku.wrap]),
          el('div', { class: 'grid-2' }, [category.wrap, format.wrap]),
          summary.wrap, description.wrap,
          el('div', { class: 'grid-2' }, [pages.wrap, price.wrap]),
          highlights.wrap,
        ], function (close) {
          var payload = {
            title: title.input.value, sku: sku.input.value, category: category.input.value,
            summary: summary.input.value, description: description.input.value,
            pages: pages.input.value ? Number(pages.input.value) : undefined,
            format: format.input.value,
            price: price.input.value ? Number(price.input.value) : undefined,
            highlights: highlights.input.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
          };
          var req = id ? api('PUT', '/api/products/' + encodeURIComponent(id), payload) : api('POST', '/api/products', payload);
          req.then(function () { toast('Product saved', 'ok'); close(); refresh(); })
            .catch(function (err) { toast('Save failed: ' + err.message, 'err'); });
        }, 'Save product');
      }
      if (id) api('GET', '/api/products/' + encodeURIComponent(id)).then(build); else build(null);
    }

    function delProduct(id, title) {
      if (!confirm('Delete product "' + title + '"?')) return;
      api('DELETE', '/api/products/' + encodeURIComponent(id))
        .then(function () { toast('Product deleted', 'ok'); refresh(); })
        .catch(function (err) { toast('Delete failed: ' + err.message, 'err'); });
    }

    refresh();
  };

  // =========================================================
  // AI TUTOR
  // =========================================================
  VIEWS.tutor = function (root) {
    root.appendChild(card('NCS7 AI Tutor', 'Ask questions about the National CAD Standard. Answers come from an offline knowledge base (no network calls). A real LLM can be plugged in server-side.', [
      el('div', { class: 'field-label', text: 'Try one of these' }),
      (function () {
        var chips = el('div', { class: 'tutor-suggest' });
        ['What is the National CAD Standard?', 'How does the layer naming system work?', 'What is new in NCS Version 7?', 'How much does the complete set cost?'].forEach(function (q) {
          chips.appendChild(el('button', { class: 'tutor-chip', text: q, onclick: function () { askInline(q); } }));
        });
        return chips;
      })(),
      el('div', { id: 'tutor-root' }),
    ]));

    // Built-in fallback chat (used if /tutor/tutor.js does not load).
    var fallback = el('div', { class: 'tutor-fallback' }, []);
    var log = el('div', { class: 'tutor-log' });
    var inputRow = el('div', { class: 'tutor-input-row' });
    var inp = el('input', { type: 'text', placeholder: 'Ask the NCS7 tutor…' });
    var sendBtn = el('button', { class: 'btn btn-primary', text: 'Ask' });
    inputRow.appendChild(inp); inputRow.appendChild(sendBtn);
    fallback.appendChild(el('p', { class: 'help', text: 'Built-in tutor (server-side offline retrieval).' }));
    fallback.appendChild(log);
    fallback.appendChild(inputRow);

    function ask(q) {
      if (!q || !q.trim()) return;
      log.appendChild(el('div', { class: 'tutor-msg user', text: q }));
      inp.value = '';
      var thinking = el('div', { class: 'tutor-msg bot', text: '…' });
      log.appendChild(thinking);
      log.scrollTop = log.scrollHeight;
      api('POST', '/api/tutor', { question: q }).then(function (res) {
        thinking.innerHTML = '';
        thinking.appendChild(document.createTextNode(res.answer || 'No answer.'));
        thinking.appendChild(el('span', { class: 'tutor-meta', text: 'source: ' + (res.source || '?') + (res.matched ? ' · matched: ' + res.matched : '') }));
        log.scrollTop = log.scrollHeight;
      }).catch(function (err) {
        thinking.textContent = 'Error: ' + err.message;
      });
    }
    window.__ncs7AskInline = ask; // exposed so suggestion chips can drive it
    sendBtn.addEventListener('click', function () { ask(inp.value); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(inp.value); });

    function askInline(q) {
      if (window.__ncs7TutorWidget && typeof window.__ncs7TutorWidget.ask === 'function') {
        window.__ncs7TutorWidget.ask(q);
      } else {
        ask(q);
      }
    }

    // Try loading the external tutor widget; if it fails, show fallback chat.
    var script = el('script', { src: '/tutor/tutor.js', defer: true });
    var usedExternal = false;
    script.addEventListener('load', function () { usedExternal = true; });
    script.addEventListener('error', function () {
      // 404 / not present — mount built-in fallback.
      $('#tutor-root').appendChild(fallback);
    });
    document.body.appendChild(script);
    // Safety: if after a moment the external widget hasn't rendered anything, show fallback.
    setTimeout(function () {
      var mount = $('#tutor-root');
      if (mount && mount.childElementCount === 0) mount.appendChild(fallback);
    }, 700);
  };

  // =========================================================
  // SHARED UI builders
  // =========================================================
  function field(label, control) {
    return el('label', { class: 'field' }, [el('span', { class: 'field-label', text: label }), control]);
  }
  function inputField(label, value) {
    var input = el('input', { type: 'text' });
    input.value = value != null ? value : '';
    return { wrap: field(label, input), input: input };
  }
  function textareaField(label, value, rows) {
    var input = el('textarea', { rows: rows || 3 });
    input.value = value != null ? value : '';
    return { wrap: field(label, input), input: input };
  }
  function card(title, sub, children) {
    var c = el('div', { class: 'card' }, [el('h2', { text: title })]);
    if (sub) c.appendChild(el('p', { class: 'card-sub', text: sub }));
    (children || []).forEach(function (ch) { c.appendChild(ch); });
    return c;
  }
  function modal(title, sub, bodyNodes, onSave, saveLabel) {
    var backdrop = el('div', { class: 'modal-backdrop' });
    function close() { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); }
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    var box = el('div', { class: 'modal' }, [
      el('h3', { text: title }),
      sub ? el('p', { class: 'modal-sub', text: sub }) : null,
    ]);
    (bodyNodes || []).forEach(function (n) { if (n) box.appendChild(n); });
    box.appendChild(el('div', { class: 'modal-actions' }, [
      el('button', { class: 'btn', text: 'Cancel', onclick: close }),
      el('button', { class: 'btn btn-primary', text: saveLabel || 'Create', onclick: function () { onSave(close); } }),
    ]));
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
  }

  // =========================================================
  // BOOT
  // =========================================================
  document.addEventListener('DOMContentLoaded', function () {
    // If we're on file://, we know up front there's no server.
    if (location.protocol === 'file:') setDataMode('offline');
    updateModeBadge();
    initResetControl();
    initLogin();
    initNav();
    if (sessionStorage.getItem(TOKEN_KEY)) showApp();
  });
})();
