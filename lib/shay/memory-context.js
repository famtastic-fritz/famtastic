/**
 * memory-context — Shay-Shay context provider.
 *
 * Computes the RELEVANT MEMORY block injected into Shay's context on every
 * call. Scoped to current site / plan / workspace. Surfaces rule and
 * do-not-repeat types as hard constraints; vendor-fact and anti-pattern as
 * soft hints.
 *
 * Per chat-capture-learn-optimize plan, ws_retriever.
 *
 * Registers like workbench.foundation does — see existing Shay context
 * provider pattern in site-studio/lib for the registration call to add.
 */

const { recall } = require('../famtastic/memory/recall');

const HARD_CONSTRAINT_TYPES = ['rule', 'do-not-repeat'];
const SOFT_HINT_TYPES = ['vendor-fact', 'anti-pattern', 'bug-pattern'];
const REFERENCE_TYPES = ['decision', 'preference', 'learning', 'gap'];

const PROVIDER_ID = 'memory.context';
const PROVIDER_VERSION = '0.2.0';

/**
 * Build the RELEVANT MEMORY block string for Shay.
 * @param {object} ctx — Shay call context
 * @param {string} [ctx.site_tag]
 * @param {string} [ctx.plan_label]
 * @param {string} [ctx.workspace_domain]
 * @param {string} [ctx.session_id]
 */
function buildMemoryBlock(ctx = {}) {
  // Build facet set with both prefixed and bare forms so entries tagged with
  // either match. e.g. workspace_domain='deploy' should match entries tagged
  // 'workspace:deploy' OR plain 'deploy'.
  const facets = [];
  if (ctx.site_tag) {
    facets.push(`site:${ctx.site_tag}`);
    facets.push(ctx.site_tag);
  }
  if (ctx.plan_label) facets.push(ctx.plan_label);
  if (ctx.workspace_domain) {
    facets.push(`workspace:${ctx.workspace_domain}`);
    facets.push(ctx.workspace_domain);
  }

  const wantedTypes = [...HARD_CONSTRAINT_TYPES, ...SOFT_HINT_TYPES, ...REFERENCE_TYPES];

  const entries = recall({
    facets,
    types: wantedTypes,
    lifecycle: ['active', 'candidate'],
    limit: 12,
    context: {
      site: ctx.site_tag || null,
      plan: ctx.plan_label || null,
      session: ctx.session_id || null,
      surface: 'shay-shay',
      provider: PROVIDER_ID,
    },
  });

  if (!entries.length) {
    return {
      provider: PROVIDER_ID,
      version: PROVIDER_VERSION,
      block: '',
      count: 0,
    };
  }

  const hard = entries.filter(e => HARD_CONSTRAINT_TYPES.includes(e.type));
  const soft = entries.filter(e => SOFT_HINT_TYPES.includes(e.type));
  const refs = entries.filter(e => REFERENCE_TYPES.includes(e.type));

  const lines = ['## RELEVANT MEMORY', ''];
  if (hard.length) {
    lines.push('### Hard constraints (rules + do-not-repeat — honor these)');
    for (const e of hard) lines.push(`- [${e.type}] **${e.title}** — \`memory/${e.canonical_id}.md\``);
    lines.push('');
  }
  if (soft.length) {
    lines.push('### Vendor facts + anti-patterns + known bugs (soft hints)');
    for (const e of soft) lines.push(`- [${e.type}] ${e.title} — \`memory/${e.canonical_id}.md\``);
    lines.push('');
  }
  if (refs.length) {
    lines.push('### Decisions, preferences, learnings (for reference)');
    for (const e of refs) lines.push(`- [${e.type}] ${e.title} — \`memory/${e.canonical_id}.md\``);
    lines.push('');
  }
  lines.push('_Honor hard constraints. Cite soft hints when relevant. Treat references as background._');
  lines.push('');

  return {
    provider: PROVIDER_ID,
    version: PROVIDER_VERSION,
    block: lines.join('\n'),
    count: entries.length,
    breakdown: { hard: hard.length, soft: soft.length, refs: refs.length },
  };
}

/**
 * Shay context-provider registration shape.
 * Wire this into the Shay context provider registry next to workbench.foundation.
 */
const provider = {
  id: PROVIDER_ID,
  version: PROVIDER_VERSION,
  describe() {
    return {
      id: PROVIDER_ID,
      provides: 'RELEVANT MEMORY block scoped to current site/plan/workspace.',
      reads: ['memory/INDEX.json', 'memory/<type>/*.md'],
      writes: ['memory/usage.jsonl (surfaced events)'],
    };
  },
  async getContext(callContext) {
    return buildMemoryBlock({
      site_tag: callContext?.site_tag,
      plan_label: callContext?.plan_label,
      workspace_domain: callContext?.workspace_domain || callContext?.domain,
      session_id: callContext?.session_id,
    });
  },
};

module.exports = { buildMemoryBlock, provider };
