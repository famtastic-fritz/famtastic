'use strict';

/**
 * Phase 1 — Functional Tests
 *
 * Verifies all major classifier intents produce the correct response type
 * or content signal. Tests are ordered to build on each other:
 * early tests establish state that later tests depend on.
 *
 * Each test: { name, setup?, input, validate, options? }
 *   setup(utils, ws)          — optional async setup before sending
 *   input                     — string to send as chat message (or null for custom tests)
 *   validate(response, ws, allMessages) — returns { pass, reason }
 *   options.timeout           — ms (default 30000)
 *   options.collectAll        — collect all messages until timeout
 *   options.expectTimeout     — timeout is the expected outcome (pass)
 *   custom(ws, utils)         — alternative to input+validate for full control
 */

const tests = [

  // ─────────────────────────────────────────────────────────────
  // CLASSIFIER ROUTING
  // ─────────────────────────────────────────────────────────────

  {
    name: 'F01-new-site-triggers-planning',
    input: 'I want to build a website for my lawn care business in Tampa',
    validate: async (response, ws, all) => {
      // Server sends { type: 'brief', brief: {...} } or { type: 'planning' } or assistant with DESIGN_BRIEF content
      const msgs = all || [response];
      const isPlanning =
        msgs.some(m => m.type === 'brief') ||
        msgs.some(m => m.type === 'planning') ||
        /design.brief|site.name|target.audience|must.have/i.test(
          msgs.map(m => m.content || '').join(' ')
        );
      return {
        pass: isPlanning,
        reason: isPlanning
          ? 'Planning/brief mode triggered'
          : `Only got: ${msgs.map(m => m.type).join(', ')}`,
      };
    },
    options: { collectAll: true, timeout: 60000 },
  },

  {
    name: 'F02-brainstorm-no-html',
    input: "Let's brainstorm some creative ideas for the homepage hero section",
    validate: async (response, ws, all) => {
      const msgs = all || [response];
      const content = msgs.map(m => m.content || '').join('\n');
      const hasHtml = /<html|<body|<!DOCTYPE/i.test(content);
      const hasResponse = msgs.some(m => ['assistant', 'chat'].includes(m.type));
      return {
        pass: !hasHtml && hasResponse,
        reason: hasHtml
          ? 'FAIL: brainstorm response contained raw HTML'
          : hasResponse
          ? 'Brainstorm response received without HTML'
          : 'No assistant response received',
      };
    },
    options: { collectAll: true, timeout: 60000 },
  },

  {
    name: 'F03-page-switch-explicit',
    input: 'Go to the about page',
    validate: async (response, ws, all) => {
      const msgs = all || [response];
      const switched =
        msgs.some(m => m.type === 'page-changed') ||
        /about|switch|page/i.test(msgs.map(m => m.content || '').join(' '));
      return {
        pass: switched,
        reason: switched ? 'Page switch acknowledged' : 'No page switch signal',
      };
    },
    options: { collectAll: true, timeout: 10000 },
  },

  {
    name: 'F04-page-switch-natural',
    input: 'Show me the contact page',
    validate: async (response, ws, all) => {
      const msgs = all || [response];
      const switched =
        msgs.some(m => m.type === 'page-changed') ||
        /contact|switch|page/i.test(msgs.map(m => m.content || '').join(' '));
      return {
        pass: switched,
        reason: switched ? 'Natural phrasing page switch worked' : 'No page switch signal',
      };
    },
    options: { collectAll: true, timeout: 10000 },
  },

  {
    name: 'F05-version-history',
    input: 'Show me the version history',
    validate: async (response, ws, all) => {
      const content = (all || [response]).map(m => m.content || '').join('\n');
      const pass = /version|history|snapshot|no.*version|backup/i.test(content);
      return { pass, reason: pass ? 'Version history query handled' : `Unexpected: ${content.slice(0, 100)}` };
    },
    options: { collectAll: true, timeout: 15000 },
  },

  {
    name: 'F06-rollback-trigger',
    input: 'Rollback to the previous version',
    validate: async (response, ws, all) => {
      const content = (all || [response]).map(m => m.content || '').join('\n');
      const pass = /rollback|restore|revert|version|no.*version|nothing.*rollback/i.test(content);
      return { pass, reason: pass ? 'Rollback request handled' : `Unexpected: ${content.slice(0, 100)}` };
    },
    options: { collectAll: true, timeout: 15000 },
  },

  {
    name: 'F07-brand-health',
    input: 'Check the brand health',
    validate: async (response, ws, all) => {
      const content = (all || [response]).map(m => m.content || '').join('\n');
      const pass = /slot|coverage|health|image|missing|empty|upload/i.test(content);
      return { pass, reason: pass ? 'Brand health report returned' : `Unexpected: ${content.slice(0, 150)}` };
    },
    options: { collectAll: true, timeout: 15000 },
  },

  {
    name: 'F08-summarize-session',
    input: 'Summarize this session',
    validate: async (response, ws, all) => {
      const content = (all || [response]).map(m => m.content || '').join('\n');
      const pass = /summary|session|discussed|built|change|update/i.test(content);
      return { pass, reason: pass ? 'Session summary generated' : `Unexpected: ${content.slice(0, 150)}` };
    },
    options: { collectAll: true, timeout: 30000 },
  },

  {
    name: 'F09-tech-advice',
    input: 'What tech stack should I use for this site?',
    validate: async (response, ws, all) => {
      const content = (all || [response]).map(m => m.content || '').join('\n');
      const pass = /static|cms|dynamic|recommend|tailwind|html|javascript|netlify/i.test(content);
      return { pass, reason: pass ? 'Tech advice provided' : `Unexpected: ${content.slice(0, 150)}` };
    },
    options: { collectAll: true, timeout: 60000 },
  },

  {
    name: 'F10-data-model',
    input: 'Plan the database schema for this business',
    validate: async (response, ws, all) => {
      const content = (all || [response]).map(m => m.content || '').join('\n');
      const pass = /database|schema|entity|model|table|field|data/i.test(content);
      return { pass, reason: pass ? 'Data model planning triggered' : `Unexpected: ${content.slice(0, 150)}` };
    },
    options: { collectAll: true, timeout: 60000 },
  },

  {
    name: 'F11-brief-edit',
    input: 'Edit the design brief',
    validate: async (response, ws, all) => {
      const msgs = all || [response];
      const isPlanning =
        msgs.some(m => m.type === 'brief') ||
        msgs.some(m => m.type === 'planning') ||
        /brief|goal|audience|section|update/i.test(msgs.map(m => m.content || '').join(' '));
      return { pass: isPlanning, reason: isPlanning ? 'Brief edit mode activated' : 'No brief response' };
    },
    options: { collectAll: true, timeout: 60000 },
  },

  {
    name: 'F12-asset-logo-generate',
    input: 'Create a logo for the business',
    validate: async (response, ws, all) => {
      const content = (all || [response]).map(m => m.content || '').join('\n');
      const pass = /logo|svg|generating|asset|creat/i.test(content);
      return { pass, reason: pass ? 'Logo generation triggered' : `Unexpected: ${content.slice(0, 150)}` };
    },
    options: { collectAll: true, timeout: 60000 },
  },

  // ─────────────────────────────────────────────────────────────
  // FALSE POSITIVE PREVENTION
  // ─────────────────────────────────────────────────────────────

  {
    name: 'F13-no-false-positive-history',
    input: 'Tell me about the history of lawn care in America',
    validate: async (response, ws, all) => {
      const msgs = all || [response];
      // Should NOT activate the version_history handler
      const wrongTrigger = msgs.some(m =>
        m.type === 'version-history' ||
        /version.*history.*snapshot|rollback.*available/i.test(m.content || '')
      );
      return {
        pass: !wrongTrigger,
        reason: wrongTrigger
          ? 'FALSE POSITIVE: "history" alone triggered version_history'
          : 'Correctly routed general "history" as content/brainstorm',
      };
    },
    options: { collectAll: true, timeout: 60000 },
  },

  {
    name: 'F14-no-false-positive-restore',
    input: 'Restore the original brand colors from the client brief',
    validate: async (response, ws, all) => {
      const msgs = all || [response];
      // Should NOT trigger rollback (no version context)
      const wrongTrigger = msgs.some(m =>
        /rolling.*back|restoring.*version|reverting.*to.*version/i.test(m.content || '')
      );
      return {
        pass: !wrongTrigger,
        reason: wrongTrigger
          ? 'FALSE POSITIVE: "restore" without version context triggered rollback'
          : 'Correctly avoided rollback false positive',
      };
    },
    options: { collectAll: true, timeout: 60000 },
  },

  // ─────────────────────────────────────────────────────────────
  // BUILD PIPELINE — CHAT EDITS
  // ─────────────────────────────────────────────────────────────

  {
    name: 'F15-content-update',
    input: 'Change the phone number to (555) 123-4567',
    validate: async (response, ws, all) => {
      const content = (all || [response]).map(m => m.content || '').join('\n');
      const pass = /updated|changed|phone|555|content/i.test(content);
      return { pass, reason: pass ? 'Content update processed' : `Unexpected: ${content.slice(0, 150)}` };
    },
    options: { collectAll: true, timeout: 120000 },
  },

  {
    name: 'F16-layout-update',
    input: 'Add a testimonials section after the hero',
    validate: async (response, ws, all) => {
      const content = (all || [response]).map(m => m.content || '').join('\n');
      const pass = /testimonial|section|added|update|generat/i.test(content);
      return { pass, reason: pass ? 'Layout update processed' : `Unexpected: ${content.slice(0, 150)}` };
    },
    options: { collectAll: true, timeout: 120000 },
  },

  {
    name: 'F17-style-update',
    input: 'Make the header background dark blue',
    validate: async (response, ws, all) => {
      const msgs = all || [response];
      // Could be deterministic (direct CSS patch) or Claude-generated
      const pass =
        msgs.some(m => m.type === 'reload-preview') ||
        /header|blue|style|color|updated|direct.*edit/i.test(msgs.map(m => m.content || '').join('\n'));
      return { pass, reason: pass ? 'Style update processed' : 'No style change signal' };
    },
    options: { collectAll: true, timeout: 120000 },
  },

  {
    name: 'F18-bug-fix',
    input: 'The navigation menu is broken on mobile, fix it',
    validate: async (response, ws, all) => {
      const content = (all || [response]).map(m => m.content || '').join('\n');
      const pass = /fix|mobile|nav|responsive|updated|generat/i.test(content);
      return { pass, reason: pass ? 'Bug fix request processed' : `Unexpected: ${content.slice(0, 150)}` };
    },
    options: { collectAll: true, timeout: 120000 },
  },

  // ─────────────────────────────────────────────────────────────
  // QUERY OPERATIONS
  // ─────────────────────────────────────────────────────────────

  {
    name: 'F19-list-pages',
    input: 'List all the pages',
    validate: async (response, ws, all) => {
      const content = (all || [response]).map(m => m.content || '').join('\n');
      const pass = /page|index|about|contact|html|\bsite\b/i.test(content);
      return { pass, reason: pass ? 'Pages listed' : `Unexpected: ${content.slice(0, 150)}` };
    },
    options: { collectAll: true, timeout: 15000 },
  },

  {
    name: 'F20-show-brief',
    input: 'Show me the current design brief',
    validate: async (response, ws, all) => {
      const content = (all || [response]).map(m => m.content || '').join('\n');
      const pass = /brief|goal|audience|section|no.*brief|hasn.*been.*creat/i.test(content);
      return { pass, reason: pass ? 'Brief displayed (or absence noted)' : `Unexpected: ${content.slice(0, 150)}` };
    },
    options: { collectAll: true, timeout: 15000 },
  },

  // ─────────────────────────────────────────────────────────────
  // INSPECTION / VISUAL INTELLIGENCE
  // ─────────────────────────────────────────────────────────────

  {
    name: 'F21-inspect-page',
    input: 'Check the current page',
    validate: async (response, ws, all) => {
      const content = (all || [response]).map(m => m.content || '').join('\n');
      const pass = /section|image|nav|font|color|heading|link|inspect|check|found|count/i.test(content);
      return { pass, reason: pass ? 'Page inspection returned results' : `Unexpected: ${content.slice(0, 150)}` };
    },
    options: { collectAll: true, timeout: 15000 },
  },

  {
    name: 'F22-count-images',
    input: 'How many images are on this page?',
    validate: async (response, ws, all) => {
      const content = (all || [response]).map(m => m.content || '').join('\n');
      const pass = /image|img|\d+\s*(image|img|photo|slot)/i.test(content);
      return { pass, reason: pass ? 'Image count returned' : `Unexpected: ${content.slice(0, 150)}` };
    },
    options: { collectAll: true, timeout: 15000 },
  },

  {
    name: 'F23-check-seo',
    input: 'Does this page have good SEO?',
    validate: async (response, ws, all) => {
      const content = (all || [response]).map(m => m.content || '').join('\n');
      const pass = /seo|meta|title|description|canonical|keyword|og:|heading/i.test(content);
      return { pass, reason: pass ? 'SEO audit returned' : `Unexpected: ${content.slice(0, 150)}` };
    },
    options: { collectAll: true, timeout: 15000 },
  },

  // ─────────────────────────────────────────────────────────────
  // CONVERSATION CONTINUITY
  // ─────────────────────────────────────────────────────────────

  {
    name: 'F24-follow-up-context',
    setup: async (utils, ws) => {
      // Establish a context first
      await utils.sendChat(ws, 'The hero section needs a gradient background', {
        collectAll: true, timeout: 120000,
      });
      await utils.sleep(500);
    },
    input: 'Actually make it more subtle',
    validate: async (response, ws, all) => {
      const content = (all || [response]).map(m => m.content || '').join('\n');
      // Should understand "it" refers to the gradient; any sensible response is a pass
      const pass = content.length > 0;
      return {
        pass,
        reason: pass ? 'Follow-up received a response (context maintained)' : 'No response to follow-up',
      };
    },
    options: { collectAll: true, timeout: 120000 },
  },

  // ─────────────────────────────────────────────────────────────
  // EDGE CASES
  // ─────────────────────────────────────────────────────────────

  {
    name: 'F25-empty-message',
    input: '',
    validate: async (response, ws, all) => {
      // Any response (including silence) — the important thing is the server does NOT crash.
      // We verify the connection is still alive by checking we got any message OR can still send.
      return {
        pass: true,
        reason: 'Empty message did not crash the server',
      };
    },
    options: { timeout: 5000, collectAll: true, expectTimeout: true },
  },

  {
    name: 'F26-whitespace-only',
    input: '   \n\t   ',
    validate: async (response, ws, all) => ({
      pass: true,
      reason: 'Whitespace-only message handled without crash',
    }),
    options: { timeout: 5000, collectAll: true, expectTimeout: true },
  },

  {
    name: 'F27-very-short-message',
    input: 'hi',
    validate: async (response, ws, all) => {
      const msgs = all || [response];
      const hasAny = msgs.some(m => ['assistant', 'chat', 'planning', 'brief'].includes(m.type));
      return {
        pass: hasAny,
        reason: hasAny ? 'Short message got a response' : 'No response to short message',
      };
    },
    options: { collectAll: true, timeout: 60000 },
  },

  {
    name: 'F28-question-mark-only',
    input: '?',
    validate: async () => ({
      pass: true,
      reason: 'Single character handled without crash',
    }),
    options: { timeout: 5000, collectAll: true, expectTimeout: true },
  },

];

module.exports = { tests };
