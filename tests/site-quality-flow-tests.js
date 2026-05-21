'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  extractPlatformNeeds,
  buildCrossStudioContract,
  buildSiteQualityFlowContext,
} = require('../lib/famtastic/site-quality-flow');

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

(function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'site-quality-flow-'));
  const componentsRoot = path.join(tmp, 'components');
  writeJson(path.join(componentsRoot, 'gallery-slideshow', 'component.json'), {
    id: 'gallery-slideshow',
    name: 'Gallery Slideshow',
    type: 'slideshow',
    groups: ['gallery', 'media', 'motion'],
    description: 'Reusable image slideshow with captions, arrow controls, and mobile swipe.',
    slots: [
      { id: 'images', type: 'asset-list', required: true },
      { id: 'caption', type: 'text' },
    ],
    content_fields: [{ id: 'headline', type: 'text' }],
  });
  fs.writeFileSync(path.join(componentsRoot, 'gallery-slideshow', 'template.html'), '<section data-component-ref="gallery-slideshow"></section>');

  const spec = {
    business_type: 'dog training',
    client_brief: {
      business_description: 'Premium dog trainer for families in Nassau',
      ideal_customer: 'busy families who want safe, trusted dog behavior help',
      geography: 'Bahamas',
      primary_cta: 'Book a training consult',
      style_notes: 'cinematic black night, warm family trust',
    },
    design_brief: {
      goal: 'Sell dog training packages',
      audience: 'families with dogs',
      must_have_sections: ['hero image', 'before and after slideshow', 'testimonials', 'contact'],
      visual_direction: { vertical: 'dog training', mood: 'cinematic trust' },
    },
  };
  const userMessage = 'Build me a site for coconut sales in Bahamas with a hero image and a slideshow gallery.';

  const needs = extractPlatformNeeds({ spec, userMessage });
  assert.ok(needs.research.length > 0, 'site builds should request research context');
  assert.ok(needs.media.some(need => need.type === 'hero_image'), 'hero image should become a Media Studio need');
  assert.ok(needs.components.some(need => need.type === 'slideshow'), 'slideshow should become a Component Studio need');

  const contract = buildCrossStudioContract();
  assert.ok(contract.includes('Research first'));
  assert.ok(contract.includes('Search/reuse before generate'));
  assert.ok(contract.includes('Return structured results to the caller'));
  assert.ok(contract.includes('Record proof in Data Center'));

  const context = buildSiteQualityFlowContext({
    hubRoot: tmp,
    componentsRoot,
    spec,
    userMessage,
    requestType: 'build',
    maxComponentCandidates: 3,
  });
  assert.ok(context.promptBlock.includes('SITE QUALITY FLOW'));
  assert.ok(context.promptBlock.includes('gallery-slideshow'), 'component reuse candidates should be injected');
  assert.ok(context.promptBlock.includes('Media Studio asset requests'), 'media needs should be routed to Media Studio planning');
  assert.ok(context.promptBlock.includes('Research-backed build requirements'), 'research should shape the build');
  assert.ok(context.promptBlock.includes('do not invent missing assets'), 'dry-run media planning must not claim assets exist');
  assert.strictEqual(context.requests.media[0].status, 'planned');
  assert.strictEqual(context.requests.components[0].status, 'reuse_search');

  console.log('site-quality-flow-tests: PASS');
}());
