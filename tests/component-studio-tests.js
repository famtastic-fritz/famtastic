'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  loadComponentCatalog,
  searchComponents,
  buildComponentReuseContext,
  createComponentProofJob,
} = require('../lib/famtastic/component-studio');
const { buildMissionControlSnapshot } = require('../lib/famtastic/mission-control');

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

(function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'component-studio-'));
  const hubRoot = tmp;
  const componentsRoot = path.join(hubRoot, 'components');
  const dataCenterRoot = path.join(hubRoot, 'data-center');

  writeJson(path.join(componentsRoot, 'library.json'), {
    version: '1.1',
    components: [
      {
        id: 'cinematic-night-hero',
        name: 'Cinematic Night Hero',
        type: 'hero',
        path: 'cinematic-night-hero/',
        description: 'Asymmetric black-night hero with layered image well and premium CTA',
        usage_count: 2,
      },
    ],
    last_updated: '2026-05-21T00:00:00.000Z',
  });

  writeJson(path.join(componentsRoot, 'cinematic-night-hero', 'component.json'), {
    id: 'cinematic-night-hero',
    name: 'Cinematic Night Hero',
    version: '1.0',
    type: 'hero',
    groups: ['layout', 'buttons', 'typography'],
    description: 'Asymmetric black-night hero with layered image well and premium CTA',
    slots: [{ id: 'headline', type: 'text', required: true }],
    content_fields: [{ id: 'cta_label', type: 'text', default: 'Start here' }],
    css_variables: { '--component-bg': '#09090b' },
    dependencies: { css: ['cinematic-night-hero.css'], js: [] },
  });
  fs.writeFileSync(path.join(componentsRoot, 'cinematic-night-hero', 'template.html'), '<section data-component-ref="cinematic-night-hero"><h1 data-field-id="headline">{{headline}}</h1></section>');
  fs.writeFileSync(path.join(componentsRoot, 'cinematic-night-hero', 'cinematic-night-hero.css'), '.hero{min-height:100dvh;transform:translateZ(0);}');

  writeJson(path.join(componentsRoot, 'legacy-only-card', 'component.json'), {
    id: 'legacy-only-card',
    name: 'Legacy Only Card',
    version: '0.9',
    type: 'card',
    description: 'Card manifest not yet listed in library.json but still discoverable.',
    slots: [{ id: 'body', type: 'html' }],
  });

  const catalog = loadComponentCatalog({ hubRoot });
  assert.strictEqual(catalog.components.length, 2, 'loads library entries plus manifest-only components');
  assert.strictEqual(catalog.components[0].id, 'cinematic-night-hero');
  assert.ok(catalog.components[0].template_path.endsWith('template.html'));
  assert.deepStrictEqual(catalog.summary.groups.includes('layout'), true);

  const heroMatches = searchComponents(catalog, {
    query: 'premium black hero CTA',
    type: 'hero',
    limit: 3,
  });
  assert.strictEqual(heroMatches[0].id, 'cinematic-night-hero');
  assert.ok(heroMatches[0].score > 0, 'search score should be positive');

  const context = buildComponentReuseContext({ catalog, query: 'Need a night hero with CTA' });
  assert.ok(context.includes('Search-before-build component candidates'));
  assert.ok(context.includes('cinematic-night-hero'));
  assert.ok(context.includes('data-component-ref'));

  const proof = createComponentProofJob({
    dataCenterRoot,
    title: 'Wave 6 component reuse proof',
    query: 'premium black hero CTA',
    selectedComponentIds: ['cinematic-night-hero'],
    candidates: heroMatches,
    status: 'completed',
  });
  assert.ok(fs.existsSync(path.join(proof.job_dir, 'job.json')));
  assert.ok(fs.existsSync(path.join(proof.job_dir, 'outputs', 'component-reuse-proof.json')));
  const job = readJson(path.join(proof.job_dir, 'job.json'));
  assert.strictEqual(job.kind, 'component_reuse');
  assert.deepStrictEqual(job.selected_component_ids, ['cinematic-night-hero']);

  const snapshot = buildMissionControlSnapshot({
    root: dataCenterRoot,
    hubRoot,
    now: '2026-05-21T12:00:00.000Z',
  });
  assert.strictEqual(snapshot.summary.component_reuse.total, 1);
  assert.strictEqual(snapshot.component_reuse[0].selected_component_ids[0], 'cinematic-night-hero');

  console.log('component-studio-tests: PASS');
}());
