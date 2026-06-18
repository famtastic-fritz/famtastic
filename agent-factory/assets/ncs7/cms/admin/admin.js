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

  // ---------------- API ----------------
  function api(method, path, body) {
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

  function navigate(view) {
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
    initLogin();
    initNav();
    if (sessionStorage.getItem(TOKEN_KEY)) showApp();
  });
})();
