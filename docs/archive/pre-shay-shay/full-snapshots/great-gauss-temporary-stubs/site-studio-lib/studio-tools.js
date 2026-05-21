'use strict';
/**
 * studio-tools.js — Anthropic-format tool definitions for ClaudeAdapter.
 *
 * IMPORTANT: These tools are CLAUDE-ONLY. Do not pass to GeminiAdapter or CodexAdapter.
 * Gemini and OpenAI tool format translation deferred to Session 12.
 * (cerebrum.md: DECISION: Tool calling is Claude-only, Session 10)
 */

const STUDIO_TOOLS = [
  {
    name: 'get_site_context',
    description: 'Get full context about the current site including spec, pages, components, and recent build history. Call this before making decisions about the site.',
    input_schema: {
      type: 'object',
      properties: {
        include_pages: {
          type: 'boolean',
          description: 'Include page content summaries',
          default: true,
        },
      },
    },
  },
  {
    name: 'get_component_library',
    description: 'Get all available components in the library with their descriptions and which sites have used them.',
    input_schema: {
      type: 'object',
      properties: {
        filter_vertical: {
          type: 'string',
          description: 'Filter components by vertical (e.g., "retail", "services")',
        },
      },
    },
  },
  {
    name: 'get_research',
    description: 'Get research findings for a specific vertical from the knowledge base.',
    input_schema: {
      type: 'object',
      properties: {
        vertical:  { type: 'string', description: 'The business vertical to research' },
        question:  { type: 'string', description: 'Specific question to answer from research' },
      },
      required: ['vertical'],
    },
  },
  {
    name: 'dispatch_worker',
    description: 'Dispatch a worker to execute a specific task. Use this when you need to take action — build pages, run tests, deploy. Workers are CLI-based agents that execute tasks and return results.',
    input_schema: {
      type: 'object',
      properties: {
        worker:  { type: 'string', enum: ['claude-code', 'playwright', 'netlify'], description: 'Which worker to dispatch' },
        task:    { type: 'string', description: 'Detailed description of the task for the worker to execute' },
        context: { type: 'object', description: 'Additional context the worker needs' },
      },
      required: ['worker', 'task'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file in the current site. Use this to inspect HTML, CSS, or spec before making changes.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from site root (e.g., "dist/index.html")' },
      },
      required: ['path'],
    },
  },
];

module.exports = { STUDIO_TOOLS };
