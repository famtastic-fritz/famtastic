'use strict';

const path = require('path');

const { buildComponentReuseContext, searchComponents, loadComponentCatalog } = require('../component-studio');
const { buildMuapiPlan } = require('../../../media-studio/lib');

function normalizeText(value) {
  if (!value) return '';
  if (Array.isArray(value)) return value.join(' ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function combinedSpecText(spec = {}, userMessage = '') {
  const brief = spec.design_brief || {};
  const clientBrief = spec.client_brief || {};
  return [
    userMessage,
    spec.business_type,
    brief.goal,
    brief.audience,
    normalizeText(brief.must_have_sections),
    normalizeText(brief.visual_direction),
    clientBrief.business_description,
    clientBrief.ideal_customer,
    clientBrief.geography,
    clientBrief.style_notes,
  ].filter(Boolean).join(' ').toLowerCase();
}

function uniqueByType(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = `${item.kind || ''}:${item.type || ''}:${item.purpose || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function extractPlatformNeeds({ spec = {}, userMessage = '' } = {}) {
  const text = combinedSpecText(spec, userMessage);
  const business = spec.business_type || spec.design_brief?.visual_direction?.vertical || spec.client_brief?.business_description || 'site build';
  const research = [
    {
      type: 'market_context',
      purpose: `Research audience, competitors, trust signals, search intent, and visual landscape for ${business}.`,
      status: 'required',
    },
  ];

  const media = [];
  if (/hero|banner|masthead|cover/.test(text)) {
    media.push({
      type: 'hero_image',
      intent: 'text-to-image',
      purpose: 'Primary above-the-fold image/visual system for the site hero.',
      prompt_seed: `Hero image for ${business}: ${spec.client_brief?.style_notes || spec.design_brief?.goal || userMessage}`,
      status: 'planned',
    });
  }
  if (/gallery|slideshow|carousel|before\s*and\s*after|portfolio|photos|images/.test(text)) {
    media.push({
      type: 'gallery_assets',
      intent: 'text-to-image',
      purpose: 'Supporting image set for gallery/slideshow/carousel sections.',
      prompt_seed: `Gallery asset set for ${business}: ${spec.design_brief?.goal || userMessage}`,
      status: 'planned',
    });
  }
  if (/video|reel|motion|animation|clip/.test(text)) {
    media.push({
      type: 'video_asset',
      intent: 'text-to-video',
      purpose: 'Motion/video asset request routed through Media Studio.',
      prompt_seed: `Short motion asset for ${business}: ${spec.design_brief?.goal || userMessage}`,
      status: 'planned',
    });
  }
  if (/logo|brand mark|brandmark|identity/.test(text)) {
    media.push({
      type: 'brand_asset',
      intent: 'logo-or-brand-asset',
      purpose: 'Logo/brand asset request routed through Media Studio.',
      prompt_seed: `Brand asset for ${business}: ${spec.client_brief?.style_notes || userMessage}`,
      status: 'planned',
    });
  }

  const components = [];
  if (/slideshow|carousel|gallery/.test(text)) {
    components.push({
      type: 'slideshow',
      query: 'slideshow carousel gallery image captions mobile swipe arrows',
      purpose: 'Reusable slideshow/gallery component; search full component first, then reusable pieces.',
      status: 'reuse_search',
      may_request_media: true,
    });
  }
  if (/hero|banner|masthead/.test(text)) {
    components.push({
      type: 'hero',
      query: 'cinematic premium hero CTA layered image',
      purpose: 'Reusable hero section/component before generating new UI.',
      status: 'reuse_search',
      may_request_media: true,
    });
  }
  if (/testimonial|review|social proof/.test(text)) {
    components.push({
      type: 'testimonial',
      query: 'testimonial reviews social proof cards carousel',
      purpose: 'Reusable testimonial/social-proof component.',
      status: 'reuse_search',
      may_request_media: false,
    });
  }
  if (/pricing|packages|plans|rates/.test(text)) {
    components.push({
      type: 'pricing',
      query: 'pricing packages cards CTA comparison',
      purpose: 'Reusable pricing/package component.',
      status: 'reuse_search',
      may_request_media: false,
    });
  }

  return {
    research: uniqueByType(research),
    media: uniqueByType(media),
    components: uniqueByType(components),
  };
}

function buildCrossStudioContract() {
  return [
    'Cross-studio orchestration contract:',
    '- Research first: shape the build with market, audience, competitor, trust, SEO/search-intent, and visual-landscape evidence before generating.',
    '- Search/reuse before generate: ask Component Studio and Media Studio what already exists before creating new UI/assets.',
    '- Route specialized needs to the owning studio: Media Studio owns image/video/audio/logo assets; Component Studio owns reusable sections/widgets/patterns.',
    '- Return structured results to the caller: requests must come back with ids, paths, provenance, status, proof, cost/usage, and any blockers.',
    '- Record proof in Data Center: cite research, store prompts/results, preserve costs/usage, and connect assets/components to where they are used.',
    '- Save reusable output back to the owning studio so every build compounds instead of starting from scratch.',
  ].join('\n');
}

function buildMediaRequestContext(needs, options = {}) {
  if (!needs.length) return 'Media Studio asset requests: none detected for this build.';
  const lines = [
    'Media Studio asset requests:',
    'Route image/video/audio/logo needs through Media Studio. Search existing assets and prompt history first; generate only when approved. In this prompt context, do not invent missing assets or claim generation already happened.',
  ];
  for (const need of needs) {
    let model = 'planned-by-media-studio';
    try {
      const plan = buildMuapiPlan({
        title: `${need.type} request`,
        intent: need.intent || 'text-to-image',
        mediaType: need.intent === 'text-to-video' ? 'video' : 'image',
        prompt: need.prompt_seed || need.purpose,
        dryRun: true,
        budget: { maxUsd: 0, maxCredits: 0 },
      });
      model = plan.model;
    } catch {}
    lines.push(`- ${need.type}: ${need.purpose}`);
    lines.push(`  status: ${need.status}; dry-run route: ${model}; prompt seed: ${need.prompt_seed || need.purpose}`);
  }
  return lines.join('\n');
}

function buildComponentRequestContext(needs, options = {}) {
  if (!needs.length) return 'Component Studio reuse requests: none detected for this build.';
  const hubRoot = path.resolve(options.hubRoot || path.join(__dirname, '..', '..', '..'));
  const componentsRoot = path.resolve(options.componentsRoot || path.join(hubRoot, 'components'));
  let catalog = options.catalog;
  try {
    catalog = catalog || loadComponentCatalog({ hubRoot, componentsRoot });
  } catch {
    catalog = { components: [] };
  }
  const lines = [
    'Component Studio reuse requests:',
    'For each UI need, search for a full component first. If no full match exists, reuse smaller pieces/patterns before generating new code. If a component needs images/video, route those requests to Media Studio.',
  ];
  for (const need of needs) {
    const candidates = searchComponents(catalog, { query: need.query || need.type, type: need.type, limit: options.maxComponentCandidates || 3 });
    lines.push(`- ${need.type}: ${need.purpose}`);
    lines.push(buildComponentReuseContext({ catalog, candidates, query: need.query || need.type }));
    if (need.may_request_media) lines.push('  may request Media Studio assets if existing/uploaded assets are insufficient.');
  }
  return lines.join('\n');
}

function buildResearchContext(needs) {
  const lines = [
    'Research-backed build requirements:',
    'Do not build from vibe alone. Use available research/spec/context to sharpen audience, offer, copy, trust signals, visual direction, SEO/search intent, and media/component choices.',
  ];
  for (const need of needs) lines.push(`- ${need.type}: ${need.purpose}`);
  return lines.join('\n');
}

function buildQualityGates() {
  return [
    'Quality gates for this build:',
    '- The output must explain its research-shaped assumptions in the code/content choices, not generic industry filler.',
    '- The output must preserve stable editing anchors: data-section-id, data-section-type, data-field-id, and data-field-type.',
    '- The output must use/reuse component and media references only when provided; otherwise leave clear placeholders/requests instead of pretending assets exist.',
    '- The output must maintain FAMtastic DNA: bold, black-night/elegant where appropriate, cinematic/layered, non-cookie-cutter, culturally fluent, and intentionally crafted.',
    '- Any newly invented reusable section should be suitable for later promotion into Component Studio with manifest/proof metadata.',
  ].join('\n');
}

function buildSiteQualityFlowContext(options = {}) {
  const needs = extractPlatformNeeds({ spec: options.spec || {}, userMessage: options.userMessage || '' });
  const researchContext = buildResearchContext(needs.research);
  const mediaContext = buildMediaRequestContext(needs.media, options);
  const componentContext = buildComponentRequestContext(needs.components, options);
  const contract = buildCrossStudioContract();
  const qualityGates = buildQualityGates();
  const promptBlock = [
    'SITE QUALITY FLOW (research-first, studio-routed, proof-aware):',
    contract,
    researchContext,
    componentContext,
    mediaContext,
    qualityGates,
  ].join('\n\n');

  return {
    schema_version: '0.1.0',
    request_type: options.requestType || 'build',
    requests: needs,
    researchContext,
    componentContext,
    mediaContext,
    qualityGates,
    contract,
    promptBlock,
  };
}

module.exports = {
  extractPlatformNeeds,
  buildCrossStudioContract,
  buildSiteQualityFlowContext,
};
