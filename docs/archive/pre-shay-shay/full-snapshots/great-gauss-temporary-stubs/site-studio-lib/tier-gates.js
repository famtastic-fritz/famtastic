'use strict';
/**
 * Pure gate helpers for FAMtastic logo-mode prompt assembly.
 *
 * Each function encapsulates a single famtastic_mode branch so that:
 *   - Unit tests can verify gate behavior without running a full server
 *   - The server prompt assembly remains readable with a named call
 *
 * These are the three active gates identified in the V5 test seam audit:
 *   L3574  — buildTemplatePrompt (template-build path)
 *   L11964 — parallelBuild per-page prompt (per-page build path)
 *   L14275 — handleChatMessage logo instruction (single-page edit path)
 */

const famSkeletons = require('./famtastic-skeletons');

/** Returns LOGO_SKELETON_TEMPLATE when famtastic_mode is on, '' otherwise. (L3574 gate) */
function getLogoSkeletonBlock(spec) {
  return spec.famtastic_mode ? famSkeletons.LOGO_SKELETON_TEMPLATE : '';
}

/** Returns LOGO_NOTE_PAGE when famtastic_mode is on, '' otherwise. (L11964 gate) */
function getLogoNoteBlock(spec) {
  return spec.famtastic_mode ? famSkeletons.LOGO_NOTE_PAGE : '';
}

/**
 * Returns true when FAMtastic multi-part SVG logo emission should be requested
 * from Claude in the single-page prompt. (L14275 gate)
 *
 * Uses strict equality on famtastic_mode because this gate was introduced with
 * strict equality semantics and is preserved as-is for audit continuity.
 */
function shouldInjectFamtasticLogoMode(spec, logoFile, requestType) {
  return spec.famtastic_mode === true &&
    !logoFile &&
    ['build', 'new_site'].includes(requestType);
}

module.exports = { getLogoSkeletonBlock, getLogoNoteBlock, shouldInjectFamtasticLogoMode };
