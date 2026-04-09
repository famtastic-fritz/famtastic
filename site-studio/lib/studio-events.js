'use strict';
/**
 * studio-events.js — Studio event bus
 *
 * Any significant Studio action emits an event here. The context writer
 * subscribes to all events and regenerates STUDIO-CONTEXT.md.
 *
 * Usage:
 *   const { studioEvents, STUDIO_EVENTS } = require('./studio-events');
 *   studioEvents.emit(STUDIO_EVENTS.BUILD_COMPLETED, { tag: 'site-xyz', pages: ['index'] });
 */

const EventEmitter = require('events');

const STUDIO_EVENTS = {
  SESSION_STARTED:      'session:started',      // Studio server starts / WS connects
  SITE_SWITCHED:        'site:switched',         // user switches active site
  BUILD_STARTED:        'build:started',         // parallel build begins
  BUILD_COMPLETED:      'build:completed',       // build finishes (success or fail)
  EDIT_APPLIED:         'edit:applied',          // content field edit applied to page
  COMPONENT_INSERTED:   'component:inserted',    // component from library inserted
  DEPLOY_COMPLETED:     'deploy:completed',      // site deployed to Netlify
  BRAIN_SWITCHED:       'brain:switched',        // user selects different brain in UI
};

// Singleton emitter shared across all server modules
const studioEvents = new EventEmitter();
studioEvents.setMaxListeners(20);

module.exports = { STUDIO_EVENTS, studioEvents };
