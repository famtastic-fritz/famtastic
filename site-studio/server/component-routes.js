// Lane C — Component routes
// Single owner for the /api/components surface.

'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const cheerio = require('cheerio');
const inventory = require('./component-inventory');

function resolveSitesRoot() {
  return path.resolve(__dirname, '..', '..', 'sites');
}

const SAFE_TAG_LOOSE_RE = /^[a-z0-9][a-z0-9_-]{0,80}$/i;
const SAFE_COMPONENT_ID_RE = /^[a-z0-9][a-z0-9_-]{0,64}$/;
const SAFE_SLOT_PAGE_RE = /^[a-zA-Z0-9._-]{1,64}$/;

function normalizeComponentImportPayload(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const componentId = String(source.component_id || source.id || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  if (!componentId) throw new Error('component_id required');

  const htmlTemplate = String(source.html_template || source.html || '').trim();
  if (!htmlTemplate) throw new Error('html_template required');

  return {
    component_id: componentId,
    id: componentId,
    name: String(source.name || componentId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())),
    type: String(source.type || 'generic'),
    version: String(source.version || '1.0'),
    description: String(source.description || ''),
    created_from: source.created_from || source.extracted_from || 'imported',
    created_at: source.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    html_template: htmlTemplate,
    css: source.css && typeof source.css === 'object' ? source.css : {
      variables: source.css_variables || {},
      local: source.css_local || source.css_text || '',
    },
    js: source.js && typeof source.js === 'object' ? source.js : {
      local: source.js_local || source.js_text || '',
    },
    content_fields: Array.isArray(source.content_fields) ? source.content_fields : [],
    slots: Array.isArray(source.slots) ? source.slots : [],
    dependencies: source.dependencies && typeof source.dependencies === 'object'
      ? source.dependencies
      : { css: [], js: [], external: [], fonts: [] },
    dependency_manifest: source.dependency_manifest && typeof source.dependency_manifest === 'object'
      ? source.dependency_manifest
      : null,
    css_variables: source.css_variables || source.css?.variables || {},
    slot_schema: Array.isArray(source.slot_schema) ? source.slot_schema : [],
    field_schema: Array.isArray(source.field_schema) ? source.field_schema : [],
    preview_assets: Array.isArray(source.preview_assets) ? source.preview_assets : [],
    demo_assets: Array.isArray(source.demo_assets) ? source.demo_assets : [],
    usage_count: Number(source.usage_count || 0),
    tags: Array.isArray(source.tags) ? source.tags : [],
  };
}

function createComponentRouter(deps = {}) {
  const router = express.Router();
  const hubRoot = deps.hubRoot || path.resolve(__dirname, '..');
  const getDistDir = deps.getDistDir || (() => path.resolve(__dirname, '..', 'dist'));
  const getTag = deps.getTag || (() => null);
  const readSpec = deps.readSpec || (() => ({}));
  const writeSpec = deps.writeSpec || (() => {});
  const syncSkillFromComponent = deps.syncSkillFromComponent || (() => {});
  const studioEvents = deps.studioEvents || null;
  const STUDIO_EVENTS = deps.STUDIO_EVENTS || {};

  router.get('/', (req, res) => {
    res.json({ components: inventory.listInventory() });
  });

  router.get('/check', (req, res) => {
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    const result = inventory.checkExisting({ id });
    res.json(result);
  });

  router.get('/contract', (req, res) => {
    res.json({ contract: inventory.SURGICAL_INSERTION_CONTRACT });
  });

  router.get('/:id', (req, res) => {
    const compPath = path.join(hubRoot, 'components', req.params.id, 'component.json');
    if (!fs.existsSync(compPath)) return res.status(404).json({ error: 'Component not found' });
    try {
      res.json(JSON.parse(fs.readFileSync(compPath, 'utf8')));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/import', (req, res) => {
    try {
      const component = normalizeComponentImportPayload(req.body && (req.body.component || req.body));
      const compDir = path.join(hubRoot, 'components', component.component_id);
      fs.mkdirSync(compDir, { recursive: true });
      fs.writeFileSync(path.join(compDir, 'component.json'), JSON.stringify(component, null, 2));
      fs.writeFileSync(path.join(compDir, `${component.component_id}.html`), component.html_template);
      if (component.css && component.css.local) {
        fs.writeFileSync(path.join(compDir, `${component.component_id}.css`), String(component.css.local));
      }
      if (component.js && component.js.local) {
        fs.writeFileSync(path.join(compDir, `${component.component_id}.js`), String(component.js.local));
      }

      const libPath = path.join(hubRoot, 'components', 'library.json');
      let lib = { version: '1.0', components: [] };
      if (fs.existsSync(libPath)) {
        try { lib = JSON.parse(fs.readFileSync(libPath, 'utf8')); } catch {}
      }
      lib.components = (lib.components || []).filter((c) => (c.component_id || c.id) !== component.component_id);
      lib.components.push({
        id: component.component_id,
        component_id: component.component_id,
        name: component.name,
        type: component.type,
        version: component.version,
        created_from: component.created_from,
        created_at: component.created_at,
        updated_at: component.updated_at,
        field_count: component.content_fields.length,
        slot_count: component.slots.length,
        css_variables: Object.keys(component.css_variables || {}),
        used_in: Array.isArray(component.sites_using) ? component.sites_using : [],
        path: component.component_id,
        description: component.description || `${component.type} component import`,
      });
      lib.last_updated = new Date().toISOString();
      fs.writeFileSync(libPath, JSON.stringify(lib, null, 2));

      syncSkillFromComponent(component);
      res.json({ success: true, component });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/export', (req, res) => {
    const { page, section_id, component_id } = req.body || {};
    if (!page || !component_id) return res.status(400).json({ error: 'page and component_id required' });

    const pagePath = path.join(getDistDir(), page);
    if (!fs.existsSync(pagePath)) return res.status(404).json({ error: 'Page not found' });

    const html = fs.readFileSync(pagePath, 'utf8');
    const $ = cheerio.load(html);

    let section;
    if (section_id) {
      section = $(`[data-section-id="${section_id}"]`);
    }
    if (!section || section.length === 0) {
      section = $('section').first();
    }
    if (!section || section.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const sectionHtml = $.html(section);
    const cssPath = path.join(getDistDir(), 'assets', 'styles.css');
    const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
    const varRefs = sectionHtml.match(/var\(--[^)]+\)/g) || [];
    const cssVariables = {};
    for (const ref of varRefs) {
      const varName = ref.match(/--[^)]+/)?.[0];
      if (!varName) continue;
      const valMatch = css.match(new RegExp(`${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*([^;]+)`));
      if (valMatch) cssVariables[varName] = valMatch[1].trim();
    }

    const fields = [];
    $('[data-field-id]', section).each((_, el) => {
      fields.push({
        id: $(el).attr('data-field-id'),
        type: $(el).attr('data-field-type') || 'text',
        default_value: $(el).text().trim(),
      });
    });

    const slots = [];
    $('[data-slot-id]', section).each((_, el) => {
      slots.push({
        slot_id: $(el).attr('data-slot-id'),
        role: $(el).attr('data-slot-role') || 'generic',
      });
    });

    const tag = getTag();
    const component = {
      component_id,
      name: component_id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      type: section.attr('data-section-type') || 'generic',
      version: '1.0',
      created_from: tag,
      created_at: new Date().toISOString(),
      html_template: sectionHtml,
      css: { variables: cssVariables },
      content_fields: fields,
      slots,
      usage_count: 1,
      tags: [],
    };

    const compDir = path.join(hubRoot, 'components', component_id);
    const compJsonPath = path.join(compDir, 'component.json');
    let version = '1.0';
    if (fs.existsSync(compJsonPath)) {
      try {
        const existingComp = JSON.parse(fs.readFileSync(compJsonPath, 'utf8'));
        const [major, minor] = (existingComp.version || '1.0').split('.').map(Number);
        version = `${major}.${(minor || 0) + 1}`;
        component.version = version;
        component.usage_count = (existingComp.usage_count || 0) + 1;
        component.created_at = existingComp.created_at;
        component.updated_at = new Date().toISOString();
        console.log(`[components] Re-exported "${component_id}" → version ${version}`);
      } catch {}
    } else {
      component.updated_at = component.created_at;
    }
    component.version = version;

    fs.mkdirSync(compDir, { recursive: true });
    fs.writeFileSync(compJsonPath, JSON.stringify(component, null, 2));
    fs.writeFileSync(path.join(compDir, `${component_id}.html`), sectionHtml);

    const libPath = path.join(hubRoot, 'components', 'library.json');
    let lib = { version: '1.0', components: [] };
    if (fs.existsSync(libPath)) {
      try { lib = JSON.parse(fs.readFileSync(libPath, 'utf8')); } catch {}
    }
    const existingEntry = lib.components.find((c) => (c.component_id || c.id) === component_id);
    const usedIn = existingEntry?.used_in || [];
    if (tag && !usedIn.includes(tag)) usedIn.push(tag);

    lib.components = lib.components.filter((c) => (c.component_id || c.id) !== component_id);
    lib.components.push({
      id: component_id,
      component_id,
      name: component.name,
      type: component.type,
      version,
      created_from: component.created_from,
      created_at: component.created_at,
      updated_at: component.updated_at,
      field_count: fields.length,
      slot_count: slots.length,
      css_variables: Object.keys(cssVariables),
      used_in: usedIn,
      path: component_id,
      description: `${component.type} component with ${fields.length} editable fields`,
    });
    lib.last_updated = new Date().toISOString();
    fs.writeFileSync(libPath, JSON.stringify(lib, null, 2));

    syncSkillFromComponent(component);

    try {
      const specNow = readSpec();
      if (specNow.content && specNow.content[page]) {
        if (!specNow.content[page].sections) specNow.content[page].sections = [];
        const sectionId = section.attr('data-section-id') || component_id;
        const sIdx = specNow.content[page].sections.findIndex((s) => s.section_id === sectionId);
        const sRef = { section_id: sectionId, component_ref: `${component_id}@${version}` };
        if (sIdx >= 0) specNow.content[page].sections[sIdx] = { ...specNow.content[page].sections[sIdx], ...sRef };
        else specNow.content[page].sections.push(sRef);
        writeSpec(specNow);
      }
    } catch {}

    if (studioEvents && STUDIO_EVENTS.COMPONENT_INSERTED) {
      studioEvents.emit(STUDIO_EVENTS.COMPONENT_INSERTED, { tag, component_id, version });
    }
    console.log(`[components] Exported "${component_id}" v${version} from ${page} (${fields.length} fields, ${slots.length} slots, ${Object.keys(cssVariables).length} CSS vars)`);
    res.json({ success: true, component, field_count: fields.length, slot_count: slots.length });
  });

  router.post('/insert', (req, res) => {
    const { tag, component_id, slot, page } = req.body || {};
    const errors = [];

    if (typeof tag !== 'string' || !SAFE_TAG_LOOSE_RE.test(tag) || tag.includes('..')) {
      errors.push('tag: must be a safe alphanumeric site identifier');
    }
    if (typeof component_id !== 'string' || !SAFE_COMPONENT_ID_RE.test(component_id) || component_id.includes('..')) {
      errors.push('component_id: must match /^[a-z0-9][a-z0-9_-]{0,64}$/');
    }
    if (typeof slot !== 'string' || !SAFE_SLOT_PAGE_RE.test(slot) || slot.includes('..')) {
      errors.push('slot: must match /^[a-zA-Z0-9._-]{1,64}$/');
    }
    if (typeof page !== 'string' || !SAFE_SLOT_PAGE_RE.test(page) || page.includes('..')) {
      errors.push('page: must match /^[a-zA-Z0-9._-]{1,64}$/');
    }

    if (errors.length) {
      return res.status(400).json({ ok: false, errors });
    }

    const check = inventory.checkExisting({ id: component_id });
    if (!check.exists) {
      return res.status(400).json({ ok: false, errors: [`component_id "${component_id}" not found in inventory`], near: check.near || null });
    }

    const result = inventory.stagedInsert({ sitesRoot: resolveSitesRoot(), tag, componentId: component_id, slot, page });
    if (!result.ok) {
      return res.status(500).json({ ok: false, error: result.error });
    }

    return res.json({ ok: true, written: result.written, history_path: `${tag}/_test/insertion-history.jsonl`, history_entry: result.history_entry });
  });

  router.get('/insertions', (req, res) => {
    const tag = typeof req.query.tag === 'string' ? req.query.tag : '';
    if (!SAFE_TAG_LOOSE_RE.test(tag) || tag.includes('..')) {
      return res.status(400).json({ ok: false, errors: ['tag: invalid'] });
    }
    const insertions = inventory.listInsertions({ sitesRoot: resolveSitesRoot(), tag });
    return res.json({ insertions });
  });

  return router;
}

module.exports = { createComponentRouter, normalizeComponentImportPayload };
