// Public engine API — one import surface for the server and tests.
export * from './escape.js';
export * from './metatags.js';
export * from './validate.js';
export * from './preview.js';
export * from './ogimage.js';

import { buildTagList, buildMetaHtml, normalizeInput } from './metatags.js';
import { validate, summarize } from './validate.js';
import { buildPreview } from './preview.js';
import { generateOgImageSvg, svgDataUri } from './ogimage.js';

/**
 * One-call generation: everything the UI needs from one input object.
 * @param {import('./metatags.js').MetaInput} input
 */
export function generateAll(input) {
  const normalized = normalizeInput(input);
  const issues = validate(input);
  const svg = generateOgImageSvg({
    title: normalized.title,
    siteName: normalized.siteName,
    themeColor: normalized.themeColor,
    url: normalized.url,
  });
  return {
    input: normalized,
    tags: buildTagList(input),
    html: buildMetaHtml(input),
    issues,
    summary: summarize(issues),
    preview: buildPreview(input),
    ogImageSvg: svg,
    ogImageDataUri: svgDataUri(svg),
  };
}
