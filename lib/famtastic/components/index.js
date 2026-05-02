'use strict';

// lib/famtastic/components/index.js
// SHAY V2 (2026-05-02 iter 3): Component library — pluggable, ecosystem-shared.
//
// Per Fritz's directive: "sometimes a piece of functionality is so useful we
// want to add it to our component library." This is that library.
//
// Components are reusable building blocks any Studio can pull from. Each
// component is a JSON manifest describing what it is, what it produces, what
// inputs it needs, and where its template lives. Studios consume components
// at build time (Site Studio injects them into generated HTML; Media Studio
// might consume a "video-hero" component to know how to assemble a clip).
//
// API:
//   components.register({ id, name, version, kind, template_path, props_schema })
//   components.list({ kind, studio })
//   components.get(id)
//
// The existing components/ directory at the repo root has hand-built component
// folders (animated-counter, video-hero, etc.). This index discovers them on
// load. Iteration 4+ adds: dependency resolution, version pinning, contribution
// CLI for promoting in-Studio components into the shared library.

const fs = require('fs');
const path = require('path');

const FAM_ROOT = path.resolve(process.env.HOME || '/root', 'famtastic');
const COMPONENTS_DIR = path.join(FAM_ROOT, 'components');

const registry = new Map();

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function discover() {
  ensureDir(COMPONENTS_DIR);
  const entries = fs.readdirSync(COMPONENTS_DIR, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const dir = path.join(COMPONENTS_DIR, ent.name);
    const manifestPath = path.join(dir, 'component.json');
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      registerFromManifest(ent.name, manifest, dir);
    } catch (err) {
      console.warn('[components] failed to load ' + ent.name + ':', err.message);
    }
  }
}

function registerFromManifest(folderName, manifest, absDir) {
  const id = manifest.id || folderName;
  registry.set(id, {
    id,
    name: manifest.name || folderName,
    version: manifest.version || '1.0.0',
    kind: manifest.kind || manifest.type || 'unknown',
    description: manifest.description || '',
    contributed_by: manifest.contributed_by || 'site_studio',
    template_path: manifest.template_path || (fs.existsSync(path.join(absDir, 'template.html')) ? path.relative(FAM_ROOT, path.join(absDir, 'template.html')) : null),
    css_path: manifest.css_path || (fs.existsSync(path.join(absDir, manifest.css || folderName + '.css')) ? path.relative(FAM_ROOT, path.join(absDir, manifest.css || folderName + '.css')) : null),
    props_schema: manifest.props_schema || manifest.props || null,
    studios_consuming: Array.isArray(manifest.studios_consuming) ? manifest.studios_consuming : ['site_studio'],
    discovered_at: new Date().toISOString(),
    raw_manifest: manifest
  });
}

function register(opts) {
  if (!opts || !opts.id) { console.error('[components] register: id required'); return false; }
  registry.set(opts.id, {
    id: opts.id,
    name: opts.name || opts.id,
    version: opts.version || '1.0.0',
    kind: opts.kind || 'unknown',
    description: opts.description || '',
    contributed_by: opts.contributed_by || 'unknown',
    template_path: opts.template_path || null,
    css_path: opts.css_path || null,
    props_schema: opts.props_schema || null,
    studios_consuming: Array.isArray(opts.studios_consuming) ? opts.studios_consuming : ['*'],
    discovered_at: new Date().toISOString()
  });
  return true;
}

function list(opts) {
  opts = opts || {};
  let items = Array.from(registry.values());
  if (opts.kind) items = items.filter(c => c.kind === opts.kind);
  if (opts.studio) items = items.filter(c => c.studios_consuming.includes('*') || c.studios_consuming.includes(opts.studio));
  return items;
}

function get(id) {
  return registry.get(id) || null;
}

function summary() {
  const items = list();
  const byKind = {};
  for (const it of items) {
    byKind[it.kind] = (byKind[it.kind] || 0) + 1;
  }
  return { total: items.length, by_kind: byKind, components_dir: COMPONENTS_DIR };
}

// Discover at load time
discover();

module.exports = { register, list, get, summary, discover };
