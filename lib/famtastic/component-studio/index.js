'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
  ensureDataCenter,
  appendLedgerRecord,
  sanitizeRecord,
} = require('../data-center');

function defaultHubRoot() {
  return path.resolve(__dirname, '..', '..', '..');
}

function defaultComponentsRoot(hubRoot) {
  return path.join(hubRoot, 'components');
}

function defaultDataCenterRoot(hubRoot) {
  return path.join(hubRoot, 'data-center');
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'component-proof';
}

function hashText(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16);
}

function normalizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
}

function listComponentDirs(componentsRoot) {
  if (!fs.existsSync(componentsRoot)) return [];
  return fs.readdirSync(componentsRoot)
    .filter(name => !name.startsWith('.') && name !== 'library.json')
    .map(name => path.join(componentsRoot, name))
    .filter(file => fs.existsSync(path.join(file, 'component.json')) && fs.statSync(file).isDirectory())
    .sort();
}

function findTemplatePath(componentDir) {
  const candidates = [
    'template.html',
    'index.html',
    `${path.basename(componentDir)}.html`,
  ];
  for (const candidate of candidates) {
    const file = path.join(componentDir, candidate);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function normalizeComponent({ libraryEntry = {}, manifest = {}, componentDir, componentsRoot }) {
  const id = manifest.id || libraryEntry.id || path.basename(componentDir || 'unknown');
  const templatePath = componentDir ? findTemplatePath(componentDir) : null;
  const relativeDir = componentDir ? path.relative(componentsRoot, componentDir).split(path.sep).join('/') : libraryEntry.path || id;
  const groups = normalizeArray(manifest.groups || manifest.group || manifest.type || libraryEntry.type);
  const slots = normalizeArray(manifest.slots);
  const contentFields = normalizeArray(manifest.content_fields || manifest.contentFields);
  const cssVariables = manifest.css_variables || manifest.cssVariables || {};
  const dependencies = manifest.dependencies || {};
  const tags = normalizeArray(manifest.tags || libraryEntry.tags).concat(groups);
  const searchable = [
    id,
    manifest.name,
    libraryEntry.name,
    manifest.type,
    libraryEntry.type,
    manifest.description,
    libraryEntry.description,
    ...tags,
    ...slots.map(slot => `${slot.id || ''} ${slot.type || ''} ${slot.description || ''}`),
    ...contentFields.map(field => `${field.id || ''} ${field.type || ''} ${field.description || ''}`),
  ].filter(Boolean).join(' ').toLowerCase();

  return sanitizeRecord({
    id,
    name: manifest.name || libraryEntry.name || id,
    version: manifest.version || libraryEntry.version || '0.1.0',
    type: manifest.type || libraryEntry.type || 'component',
    groups,
    tags: Array.from(new Set(tags.filter(Boolean))),
    path: libraryEntry.path || `${relativeDir}/`,
    manifest_path: componentDir ? path.relative(componentsRoot, path.join(componentDir, 'component.json')).split(path.sep).join('/') : null,
    template_path: templatePath ? path.relative(componentsRoot, templatePath).split(path.sep).join('/') : null,
    description: manifest.description || libraryEntry.description || '',
    usage_count: Number(libraryEntry.usage_count || manifest.usage_count || 0),
    used_in: normalizeArray(libraryEntry.used_in || manifest.sites_using),
    slots,
    content_fields: contentFields,
    css_variables: cssVariables,
    dependencies,
    preview: manifest.preview || { type: 'html', entry: templatePath ? path.relative(componentsRoot, templatePath).split(path.sep).join('/') : null },
    provenance: {
      extracted_from: manifest.extracted_from || libraryEntry.extracted_from || manifest.created_from || null,
      source: manifest.source || 'famtastic-components',
    },
    searchable,
  });
}

function loadComponentCatalog(options = {}) {
  const hubRoot = path.resolve(options.hubRoot || defaultHubRoot());
  const componentsRoot = path.resolve(options.componentsRoot || defaultComponentsRoot(hubRoot));
  const library = readJson(path.join(componentsRoot, 'library.json'), { version: '0', components: [] });
  const byId = new Map();

  for (const entry of normalizeArray(library.components)) {
    const componentDir = path.join(componentsRoot, String(entry.path || `${entry.id}/`).replace(/\/$/, ''));
    const manifest = readJson(path.join(componentDir, 'component.json'), {});
    byId.set(entry.id || manifest.id || path.basename(componentDir), normalizeComponent({
      libraryEntry: entry,
      manifest,
      componentDir,
      componentsRoot,
    }));
  }

  for (const componentDir of listComponentDirs(componentsRoot)) {
    const manifest = readJson(path.join(componentDir, 'component.json'), {});
    const id = manifest.id || path.basename(componentDir);
    if (!byId.has(id)) {
      byId.set(id, normalizeComponent({ manifest, componentDir, componentsRoot }));
    }
  }

  const components = Array.from(byId.values()).sort((a, b) => b.usage_count - a.usage_count || a.id.localeCompare(b.id));
  const groups = Array.from(new Set(components.flatMap(component => component.groups || []))).sort();
  const types = Array.from(new Set(components.map(component => component.type).filter(Boolean))).sort();

  return {
    schema_version: '0.1.0',
    hub_root: hubRoot,
    components_root: componentsRoot,
    library_version: library.version || 'unknown',
    generated_at: new Date().toISOString(),
    summary: {
      total: components.length,
      types,
      groups,
      stale_registry_count: components.filter(component => !normalizeArray(library.components).some(entry => entry.id === component.id)).length,
    },
    components,
  };
}

function scoreComponent(component, terms) {
  let score = 0;
  const haystack = component.searchable || '';
  for (const term of terms) {
    if (!term) continue;
    if (component.id.toLowerCase().includes(term)) score += 6;
    if (String(component.name || '').toLowerCase().includes(term)) score += 5;
    if (String(component.type || '').toLowerCase() === term) score += 4;
    if (haystack.includes(term)) score += 1;
  }
  score += Math.min(Number(component.usage_count || 0), 5) * 0.2;
  return Math.round(score * 10) / 10;
}

function searchComponents(catalogOrOptions, criteria = {}) {
  const catalog = catalogOrOptions.components ? catalogOrOptions : loadComponentCatalog(catalogOrOptions);
  const query = String(criteria.query || '').toLowerCase();
  const terms = query.split(/[^a-z0-9]+/).filter(term => term.length > 2);
  const type = criteria.type ? String(criteria.type).toLowerCase() : null;
  const group = criteria.group ? String(criteria.group).toLowerCase() : null;
  const limit = Number.isFinite(criteria.limit) ? criteria.limit : 5;

  return catalog.components
    .filter(component => !type || String(component.type || '').toLowerCase() === type)
    .filter(component => !group || normalizeArray(component.groups).map(String).map(value => value.toLowerCase()).includes(group))
    .map(component => ({ ...component, score: scoreComponent(component, terms) }))
    .filter(component => component.score > 0 || (!query && !terms.length))
    .sort((a, b) => b.score - a.score || b.usage_count - a.usage_count || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function buildComponentReuseContext(options = {}) {
  const catalog = options.catalog || loadComponentCatalog(options);
  const candidates = options.candidates || searchComponents(catalog, {
    query: options.query || '',
    type: options.type,
    group: options.group,
    limit: options.limit || 5,
  });
  const lines = [
    'Search-before-build component candidates:',
    'Reuse an existing component before generating a new one. Preserve data-component-ref, data-field-id, slots, CSS variables, dependencies, and provenance when reusing.',
  ];
  for (const component of candidates) {
    lines.push(`- ${component.id} (${component.type}, score ${component.score || 0}): ${component.description || component.name}`);
    if (component.template_path) lines.push(`  template: components/${component.template_path}`);
    if (component.slots && component.slots.length) lines.push(`  slots: ${component.slots.map(slot => slot.id || slot.name || slot.type).filter(Boolean).join(', ')}`);
  }
  if (!candidates.length) lines.push('- No strong candidate found; if building new, write a component manifest/proof so it can be reused later.');
  return lines.join('\n');
}

function appendComponentLedgerRecord(options = {}) {
  const root = path.resolve(options.dataCenterRoot || options.root || defaultDataCenterRoot(options.hubRoot || defaultHubRoot()));
  return appendLedgerRecord({
    root,
    ledger: 'component-reuse',
    record: sanitizeRecord({
      ledger_kind: 'component_reuse',
      ...options.record,
    }),
  });
}

function createComponentProofJob(options = {}) {
  const hubRoot = path.resolve(options.hubRoot || defaultHubRoot());
  const dataCenterRoot = path.resolve(options.dataCenterRoot || defaultDataCenterRoot(hubRoot));
  ensureDataCenter({ root: dataCenterRoot });
  const now = options.now || new Date().toISOString();
  const id = options.id || `component-${now.replace(/[-:TZ.]/g, '').slice(0, 14)}-${slugify(options.title || options.query || 'reuse-proof')}`;
  const jobDir = path.join(dataCenterRoot, 'jobs', id);
  const outputsDir = path.join(jobDir, 'outputs');
  fs.mkdirSync(outputsDir, { recursive: true });
  const candidates = normalizeArray(options.candidates).map(candidate => sanitizeRecord({
    id: candidate.id,
    name: candidate.name,
    type: candidate.type,
    score: candidate.score,
    description: candidate.description,
    template_path: candidate.template_path,
  }));
  const selectedComponentIds = normalizeArray(options.selectedComponentIds || options.selected_component_ids);
  const job = sanitizeRecord({
    id,
    kind: 'component_reuse',
    title: options.title || 'Component reuse proof',
    status: options.status || 'planned',
    query: options.query || '',
    query_hash: hashText(options.query || ''),
    selected_component_ids: selectedComponentIds,
    candidate_count: candidates.length,
    created_at: now,
    updated_at: now,
  });
  const proof = sanitizeRecord({
    proof_id: `${id}/component-reuse-proof`,
    job_id: id,
    kind: 'component_reuse_proof',
    status: job.status,
    query: job.query,
    selected_component_ids: selectedComponentIds,
    candidates,
    reuse_before_build: selectedComponentIds.length > 0,
    created_at: now,
  });

  writeJson(path.join(jobDir, 'job.json'), job);
  writeJson(path.join(outputsDir, 'component-reuse-proof.json'), proof);
  fs.writeFileSync(path.join(jobDir, 'events.jsonl'), `${JSON.stringify({ ts: now, event: 'component.reuse.proof.created', job_id: id, selected_component_ids: selectedComponentIds })}\n`);
  fs.writeFileSync(path.join(jobDir, 'report.md'), `# ${job.title}\n\nStatus: ${job.status}\n\nQuery: ${job.query}\n\nSelected: ${selectedComponentIds.join(', ') || 'none'}\n`);
  appendComponentLedgerRecord({
    dataCenterRoot,
    record: {
      ts: now,
      event: 'component.reuse.proof.created',
      job_id: id,
      proof_id: proof.proof_id,
      selected_component_ids: selectedComponentIds,
      candidate_count: candidates.length,
    },
  });

  return { id, job_dir: jobDir, job, proof };
}

module.exports = {
  loadComponentCatalog,
  searchComponents,
  buildComponentReuseContext,
  createComponentProofJob,
  appendComponentLedgerRecord,
};
