// Validates meta input and flags the common, costly mistakes.
import { normalizeInput } from './metatags.js';
import { isAbsoluteUrl } from './escape.js';

/**
 * @typedef {Object} Issue
 * @property {'error'|'warning'|'info'} severity
 * @property {string} field
 * @property {string} message
 */

const TITLE_MAX = 60; // Google SERP pixel budget approximation
const TITLE_MIN = 15;
const DESC_MAX = 155;
const DESC_MIN = 50;

/**
 * Run the full validation pass. Returns an array of issues, most severe first.
 * Deterministic and pure.
 * @param {import('./metatags.js').MetaInput} input
 * @returns {Issue[]}
 */
export function validate(input) {
  const m = normalizeInput(input);
  const issues = [];
  const add = (severity, field, message) =>
    issues.push({ severity, field, message });

  // Title
  if (!m.title) {
    add('error', 'title', 'Title is required — it is the headline of every preview.');
  } else {
    if (m.title.length > TITLE_MAX)
      add(
        'warning',
        'title',
        `Title is ${m.title.length} chars; Google truncates around ${TITLE_MAX}. It will be cut off in search.`,
      );
    if (m.title.length < TITLE_MIN)
      add('info', 'title', 'Title is quite short — consider a more descriptive headline.');
  }

  // Description
  if (!m.description) {
    add(
      'warning',
      'description',
      'No description — search engines and social cards will fall back to scraped text.',
    );
  } else {
    if (m.description.length > DESC_MAX)
      add(
        'warning',
        'description',
        `Description is ${m.description.length} chars; it will be truncated around ${DESC_MAX}.`,
      );
    if (m.description.length < DESC_MIN)
      add('info', 'description', 'Description is short — aim for 50–155 characters.');
  }

  // URL / canonical
  if (!m.url) {
    add('warning', 'url', 'No canonical URL — set og:url so shares resolve to one address.');
  } else if (!isAbsoluteUrl(m.url)) {
    add(
      'error',
      'url',
      'Canonical URL must be absolute (https://…). Relative og:url breaks link unfurling.',
    );
  }

  // Image
  if (!m.imageUrl) {
    add(
      'warning',
      'imageUrl',
      'No hosted og:image URL yet. Download the generated share image, host it (e.g. /og.png), then paste its absolute URL so cards unfurl rich instead of bare.',
    );
  } else if (!isAbsoluteUrl(m.imageUrl)) {
    add(
      'error',
      'imageUrl',
      'og:image must be an absolute URL. Most platforms ignore relative image paths.',
    );
  }

  // Site name
  if (!m.siteName)
    add('info', 'siteName', 'No site name — og:site_name helps brand the card.');

  // Twitter card vs image
  if (m.twitterCard === 'summary_large_image' && !m.imageUrl)
    add(
      'warning',
      'twitterCard',
      'Card type is summary_large_image but there is no image; X will fall back to a small card.',
    );

  // Theme color sanity
  if (m.themeColor && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(m.themeColor))
    add('info', 'themeColor', 'Theme color is not a valid hex (#rgb or #rrggbb).');

  const order = { error: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => order[a.severity] - order[b.severity]);
}

/**
 * Summarize a validation run into counts + an overall score (0–100).
 * @param {Issue[]} issues
 */
export function summarize(issues) {
  const counts = { error: 0, warning: 0, info: 0 };
  for (const i of issues) counts[i.severity]++;
  const score = Math.max(0, 100 - counts.error * 25 - counts.warning * 8 - counts.info * 2);
  return { counts, score, ok: counts.error === 0 };
}
