'use strict';

// lib/famtastic/ecosystem/index.js
// SHAY V2 (2026-05-02 iter 3): FAMtastic ecosystem registration.
//
// Each Studio (Site, Media, Brand, Component, Think Tank, future) registers
// itself with the ecosystem at boot. Shay-Shay (and any other ecosystem-aware
// surface) reads the registry to know which Studios exist, what each can do,
// what tools each contributes to the Workshop rail, and how to route handoffs.
//
// Pattern (from a Studio's boot module):
//   const ecosystem = require('lib/famtastic/ecosystem');
//   ecosystem.registerStudio({
//     id: 'site_studio',
//     name: 'Site Studio',
//     description: 'AI-powered site factory.',
//     capabilities: ['build_site', 'surgical_edit', 'deploy', 'restyle'],
//     pages: ['index', 'settings', 'preview', 'deploy'],
//     tools: ['workbench', 'cost-tracker', 'memory-inspector'],
//     routes: { handoff_in: 'workshop', handoff_out: ['media_studio.workshop'] },
//     status: 'live'
//   });
//
// Browser-side surfaces fetch the manifest via /api/ecosystem/studios.
// (Mount lib/famtastic/ecosystem/route.js on the server for that endpoint.)

const studios = new Map();

function registerStudio(opts) {
  if (!opts || !opts.id) { console.error('[ecosystem] registerStudio: id required'); return false; }
  studios.set(opts.id, {
    id: opts.id,
    name: opts.name || opts.id,
    description: opts.description || '',
    capabilities: Array.isArray(opts.capabilities) ? opts.capabilities : [],
    pages: Array.isArray(opts.pages) ? opts.pages : [],
    tools: Array.isArray(opts.tools) ? opts.tools : [],
    routes: opts.routes || { handoff_in: 'workshop', handoff_out: [] },
    status: opts.status || 'live',  // live | seed | not_built | broken
    registered_at: new Date().toISOString()
  });
  return true;
}

function unregisterStudio(id) {
  return studios.delete(id);
}

function listStudios() {
  return Array.from(studios.values());
}

function getStudio(id) {
  return studios.get(id) || null;
}

function findStudiosByCapability(capability) {
  return listStudios().filter(s => s.capabilities.includes(capability));
}

// Cross-Studio handoff routing. Given a target like "media_studio.workshop",
// resolve to a route descriptor. Falls back gracefully when target studio
// doesn't exist.
function resolveHandoffRoute(targetSurface) {
  if (!targetSurface) return { ok: false, error: 'no_target_surface' };
  if (!targetSurface.includes('.')) {
    // Assume same-studio routing (legacy: just "workshop" or "shay-shay")
    return { ok: true, studio: null, surface: targetSurface, cross_studio: false };
  }
  const [studioId, surface] = targetSurface.split('.');
  const studio = getStudio(studioId);
  if (!studio) return { ok: false, error: 'studio_not_registered', studio_id: studioId };
  if (studio.status !== 'live') return { ok: false, error: 'studio_not_live', studio_id: studioId, status: studio.status };
  return { ok: true, studio, surface, cross_studio: true };
}

// Boot self-registration: Site Studio registers itself when this module is required.
// Other Studios register from their own boot modules.
function bootSelfRegister() {
  if (!studios.has('site_studio')) {
    registerStudio({
      id: 'site_studio',
      name: 'Site Studio',
      description: 'AI-powered factory for building income-generating sites at scale.',
      capabilities: ['build_site', 'surgical_edit', 'content_update', 'layout_update', 'deploy', 'restyle', 'brainstorm', 'show_me_how'],
      pages: ['chat', 'workshop', 'mission_control', 'preview', 'images', 'research', 'deploy', 'settings'],
      tools: ['workbench', 'active-job', 'cost-tracker', 'capture-inspector'],
      routes: { handoff_in: 'workshop', handoff_out: ['media_studio.workshop', 'brand_studio.workshop'] },
      status: 'live'
    });
  }
  // Stub registrations for in-development sibling Studios. Status: seed.
  // When each one becomes its own product, it overwrites the stub from its own boot module.
  if (!studios.has('media_studio')) {
    registerStudio({
      id: 'media_studio',
      name: 'Media Studio',
      description: 'Image / video / audio generation surface. Currently a Site Studio surface; future standalone.',
      capabilities: ['generate_image', 'generate_video', 'generate_audio', 'edit_image', 'compose_clip'],
      pages: ['image_grid', 'video_clips', 'audio_lines'],
      tools: ['workbench', 'cost-tracker'],
      routes: { handoff_in: 'workshop', handoff_out: ['site_studio.workshop'] },
      status: 'seed'
    });
  }
  if (!studios.has('brand_studio')) {
    registerStudio({
      id: 'brand_studio',
      name: 'Brand Studio',
      description: 'Brand voice, palette, character pipeline. Future standalone.',
      capabilities: ['brand_voice', 'palette_generate', 'character_anchor', 'character_pose'],
      pages: ['brand_overview', 'characters', 'palettes'],
      tools: ['workbench'],
      routes: { handoff_in: 'workshop', handoff_out: ['site_studio.workshop', 'media_studio.workshop'] },
      status: 'seed'
    });
  }
  if (!studios.has('think_tank')) {
    registerStudio({
      id: 'think_tank',
      name: 'Think Tank',
      description: 'Idea capture, blueprint, validation. CLI exists today (cli/idea/), future standalone Studio.',
      capabilities: ['capture_idea', 'triage_idea', 'blueprint_idea', 'validate_idea'],
      pages: ['captured', 'incubating', 'blueprinted', 'validated'],
      tools: ['workbench', 'capture-inspector'],
      routes: { handoff_in: 'workshop', handoff_out: ['site_studio.workshop'] },
      status: 'seed'
    });
  }
}

bootSelfRegister();

module.exports = {
  registerStudio,
  unregisterStudio,
  listStudios,
  getStudio,
  findStudiosByCapability,
  resolveHandoffRoute
};
