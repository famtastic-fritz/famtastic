#!/usr/bin/env node
/**
 * FAMtastic MCP Server
 *
 * Exposes site project state as MCP resources so Claude Desktop, Claude Code,
 * and other MCP clients can read/query the current state of any site project.
 *
 * Protocol: MCP over stdio (JSON-RPC 2.0)
 *
 * Resources:
 *   famtastic://sites                — list all sites
 *   famtastic://sites/{tag}          — site spec + state
 *   famtastic://sites/{tag}/brief    — design brief
 *   famtastic://sites/{tag}/summary  — latest session summary
 *   famtastic://sites/{tag}/versions — version history
 *
 * Tools:
 *   list_sites         — list all site tags with status
 *   get_site_state     — full project state for a tag
 *   get_session_summary — latest conversation summary
 *   suggest_tech_stack — tech recommendations for a brief
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const http = require('http');

const HUB_ROOT = path.resolve(__dirname, '..');
const SITES_DIR = path.join(HUB_ROOT, 'sites');

// Shared execution layer — SQLite job queue + gap logger
const studioActions = require('../site-studio/lib/studio-actions');

const STUDIO_PORT = parseInt(process.env.STUDIO_PORT || '3334', 10);

// --- MCP Protocol ---

const rl = readline.createInterface({ input: process.stdin });
let buffer = '';

process.stdin.on('data', (chunk) => {
  buffer += chunk.toString();
  // MCP uses newline-delimited JSON
  let newlineIdx;
  while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, newlineIdx).trim();
    buffer = buffer.slice(newlineIdx + 1);
    if (line) {
      try {
        handleMessage(JSON.parse(line));
      } catch (e) {
        sendError(null, -32700, 'Parse error: ' + e.message);
      }
    }
  }
});

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function sendResult(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

// --- Helpers ---

function listSites() {
  if (!fs.existsSync(SITES_DIR)) return [];
  return fs.readdirSync(SITES_DIR)
    .filter(d => fs.existsSync(path.join(SITES_DIR, d, 'spec.json')))
    .map(d => {
      const spec = JSON.parse(fs.readFileSync(path.join(SITES_DIR, d, 'spec.json'), 'utf8'));
      const studioPath = path.join(SITES_DIR, d, '.studio.json');
      const studio = fs.existsSync(studioPath) ? JSON.parse(fs.readFileSync(studioPath, 'utf8')) : {};
      const distDir = path.join(SITES_DIR, d, 'dist');
      const pages = fs.existsSync(distDir) ? fs.readdirSync(distDir).filter(f => f.endsWith('.html')) : [];

      return {
        tag: d,
        site_name: spec.site_name || d,
        state: spec.state || 'unknown',
        business_type: spec.business_type || null,
        pages: pages,
        has_brief: !!spec.design_brief,
        brief_approved: spec.design_brief?.approved || false,
        session_count: studio.session_count || 0,
        deployed_url: spec.deployed_url || null,
        updated_at: studio.updated_at || null,
      };
    });
}

function getSiteState(tag) {
  const specPath = path.join(SITES_DIR, tag, 'spec.json');
  if (!fs.existsSync(specPath)) return null;

  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const studioPath = path.join(SITES_DIR, tag, '.studio.json');
  const studio = fs.existsSync(studioPath) ? JSON.parse(fs.readFileSync(studioPath, 'utf8')) : {};
  const distDir = path.join(SITES_DIR, tag, 'dist');
  const pages = fs.existsSync(distDir) ? fs.readdirSync(distDir).filter(f => f.endsWith('.html')) : [];

  // Load latest summary
  const summariesDir = path.join(SITES_DIR, tag, 'summaries');
  let latestSummary = null;
  if (fs.existsSync(summariesDir)) {
    const files = fs.readdirSync(summariesDir).filter(f => f.endsWith('.md')).sort();
    if (files.length > 0) {
      latestSummary = fs.readFileSync(path.join(summariesDir, files[files.length - 1]), 'utf8');
    }
  }

  return {
    tag,
    spec,
    studio,
    pages,
    latestSummary,
    versions: studio.versions || [],
  };
}

function getSessionSummary(tag) {
  const summariesDir = path.join(SITES_DIR, tag, 'summaries');
  if (!fs.existsSync(summariesDir)) return null;
  const files = fs.readdirSync(summariesDir).filter(f => f.endsWith('.md')).sort();
  if (files.length === 0) return null;
  return files.slice(-3).map(f => ({
    file: f,
    content: fs.readFileSync(path.join(summariesDir, f), 'utf8'),
  }));
}

function analyzeTechStack(brief) {
  const goal = (brief.goal || '').toLowerCase();
  const sections = (brief.must_have_sections || []).map(s => s.toLowerCase());
  const allText = goal + ' ' + sections.join(' ');

  const recommendations = [];
  const hasDynamic = allText.match(/booking|e-?commerce|shop|store|cart|login|account|dashboard|payment/);
  const hasCMS = allText.match(/blog|news|articles|portfolio|gallery|updates|posts/);
  const hasForm = allText.match(/contact|form|inquiry|quote/);

  if (hasDynamic) {
    recommendations.push({ category: 'architecture', suggestion: 'Custom web application', reason: 'Dynamic features detected', stack: 'Next.js or Express + database' });
  } else if (hasCMS) {
    recommendations.push({ category: 'architecture', suggestion: 'Static site with CMS', reason: 'Content-heavy site benefits from a CMS', stack: 'Static HTML + headless CMS' });
  } else {
    recommendations.push({ category: 'architecture', suggestion: 'Static site', reason: 'Static HTML + Tailwind is the fastest path', stack: 'HTML + Tailwind CSS' });
  }

  if (hasDynamic) {
    recommendations.push({ category: 'hosting', suggestion: 'Vercel or Railway', reason: 'Needs server-side rendering' });
  } else {
    recommendations.push({ category: 'hosting', suggestion: 'Netlify', reason: 'Free tier, CDN, instant deploys' });
  }

  if (hasForm && !hasDynamic) {
    recommendations.push({ category: 'forms', suggestion: 'Netlify Forms or Formspree', reason: 'Static sites need a form backend' });
  }

  return recommendations;
}

// --- Studio HTTP helper ---

function studioPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      { hostname: 'localhost', port: STUDIO_PORT, path, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
          catch { resolve({ status: res.statusCode, body: raw }); }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// --- MCP Message Handler ---

async function handleMessage(msg) {
  const { id, method, params } = msg;

  switch (method) {
    case 'initialize':
      sendResult(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          resources: { subscribe: false, listChanged: false },
          tools: {},
        },
        serverInfo: {
          name: 'famtastic',
          version: '1.0.0',
        },
      });
      break;

    case 'initialized':
      // Notification, no response needed
      break;

    case 'resources/list':
      sendResult(id, {
        resources: [
          { uri: 'famtastic://sites', name: 'All Sites', description: 'List of all FAMtastic site projects', mimeType: 'application/json' },
          ...listSites().map(s => ({
            uri: `famtastic://sites/${s.tag}`,
            name: s.site_name,
            description: `Site project: ${s.site_name} (${s.state})`,
            mimeType: 'application/json',
          })),
        ],
      });
      break;

    case 'resources/read': {
      const uri = params?.uri || '';
      if (uri === 'famtastic://sites') {
        sendResult(id, {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(listSites(), null, 2) }],
        });
      } else {
        const match = uri.match(/^famtastic:\/\/sites\/([^/]+)(\/(.+))?$/);
        if (!match) {
          sendError(id, -32602, 'Invalid URI');
          break;
        }
        const tag = match[1];
        const sub = match[3];

        if (sub === 'brief') {
          const state = getSiteState(tag);
          sendResult(id, {
            contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(state?.spec?.design_brief || null, null, 2) }],
          });
        } else if (sub === 'summary') {
          const summaries = getSessionSummary(tag);
          sendResult(id, {
            contents: [{ uri, mimeType: 'text/plain', text: summaries ? summaries.map(s => s.content).join('\n---\n') : 'No summaries yet' }],
          });
        } else if (sub === 'versions') {
          const state = getSiteState(tag);
          sendResult(id, {
            contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(state?.versions || [], null, 2) }],
          });
        } else {
          const state = getSiteState(tag);
          if (!state) {
            sendError(id, -32602, `Site not found: ${tag}`);
          } else {
            sendResult(id, {
              contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(state, null, 2) }],
            });
          }
        }
      }
      break;
    }

    case 'tools/list':
      sendResult(id, {
        tools: [
          {
            name: 'list_sites',
            description: 'List all FAMtastic site projects with their status',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'get_site_state',
            description: 'Get full project state for a site tag (spec, brief, decisions, pages, summaries)',
            inputSchema: {
              type: 'object',
              properties: { tag: { type: 'string', description: 'Site tag (e.g., site-clean-pools)' } },
              required: ['tag'],
            },
          },
          {
            name: 'get_session_summary',
            description: 'Get the latest conversation summaries for a site',
            inputSchema: {
              type: 'object',
              properties: { tag: { type: 'string', description: 'Site tag' } },
              required: ['tag'],
            },
          },
          {
            name: 'suggest_tech_stack',
            description: 'Get tech stack recommendations based on a site brief',
            inputSchema: {
              type: 'object',
              properties: { tag: { type: 'string', description: 'Site tag with an existing design brief' } },
              required: ['tag'],
            },
          },
          {
            name: 'trigger_build',
            description: 'Trigger an autonomous build for a site in the running Studio server',
            inputSchema: {
              type: 'object',
              properties: {
                tag:     { type: 'string', description: 'Site tag to build' },
                message: { type: 'string', description: 'Build instruction or intent message' },
              },
              required: ['tag', 'message'],
            },
          },
          {
            name: 'create_job',
            description: 'Create a job in the FAMtastic SQLite job queue',
            inputSchema: {
              type: 'object',
              properties: {
                type:          { type: 'string', description: 'Job type (e.g. build, deploy, research)' },
                site_tag:      { type: 'string', description: 'Site tag this job belongs to' },
                payload:       { type: 'object', description: 'Arbitrary job payload' },
                dependencies:  { type: 'array', items: { type: 'string' }, description: 'Job IDs this job depends on' },
                cost_estimate: { type: 'number', description: 'Estimated cost in USD' },
              },
              required: ['type'],
            },
          },
          {
            name: 'approve_job',
            description: 'Approve a pending job (pending → approved)',
            inputSchema: {
              type: 'object',
              properties: { id: { type: 'string', description: 'Job ID' } },
              required: ['id'],
            },
          },
          {
            name: 'park_job',
            description: 'Park a pending or blocked job (conscious deferral)',
            inputSchema: {
              type: 'object',
              properties: { id: { type: 'string', description: 'Job ID' } },
              required: ['id'],
            },
          },
          {
            name: 'get_pending_jobs',
            description: 'List pending jobs, optionally filtered by site tag',
            inputSchema: {
              type: 'object',
              properties: { site_tag: { type: 'string', description: 'Optional site tag filter' } },
            },
          },
          {
            name: 'log_gap',
            description: 'Log a known gap or missing capability to the FAMtastic gap ledger',
            inputSchema: {
              type: 'object',
              properties: {
                tag:      { type: 'string', description: 'Site tag' },
                message:  { type: 'string', description: 'Gap description' },
                category: { type: 'string', description: 'Gap category (NOT_BUILT, NOT_CONNECTED, BROKEN)' },
                details:  { type: 'object', description: 'Optional details object' },
              },
              required: ['message', 'category'],
            },
          },
        ],
      });
      break;

    case 'tools/call': {
      const toolName = params?.name;
      const args = params?.arguments || {};

      switch (toolName) {
        case 'list_sites':
          sendResult(id, {
            content: [{ type: 'text', text: JSON.stringify(listSites(), null, 2) }],
          });
          break;

        case 'get_site_state': {
          const state = getSiteState(args.tag);
          if (!state) {
            sendResult(id, { content: [{ type: 'text', text: `Site not found: ${args.tag}` }], isError: true });
          } else {
            sendResult(id, { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] });
          }
          break;
        }

        case 'get_session_summary': {
          const summaries = getSessionSummary(args.tag);
          if (!summaries) {
            sendResult(id, { content: [{ type: 'text', text: 'No session summaries found for this site.' }] });
          } else {
            sendResult(id, { content: [{ type: 'text', text: summaries.map(s => s.content).join('\n---\n') }] });
          }
          break;
        }

        case 'suggest_tech_stack': {
          const state = getSiteState(args.tag);
          if (!state?.spec?.design_brief) {
            sendResult(id, { content: [{ type: 'text', text: 'No design brief found. Create a brief first by describing your site.' }], isError: true });
          } else {
            const recs = analyzeTechStack(state.spec.design_brief);
            sendResult(id, { content: [{ type: 'text', text: JSON.stringify(recs, null, 2) }] });
          }
          break;
        }

        case 'trigger_build': {
          try {
            const resp = await studioPost('/api/autonomous-build', { message: args.message, context: { site_tag: args.tag } });
            sendResult(id, { content: [{ type: 'text', text: JSON.stringify(resp.body, null, 2) }] });
          } catch (e) {
            sendResult(id, { content: [{ type: 'text', text: `Studio server unreachable: ${e.message}` }], isError: true });
          }
          break;
        }

        case 'create_job': {
          try {
            const job = studioActions.createJob({
              type:          args.type,
              site_tag:      args.site_tag,
              payload:       args.payload,
              dependencies:  args.dependencies,
              cost_estimate: args.cost_estimate,
            });
            sendResult(id, { content: [{ type: 'text', text: JSON.stringify(job, null, 2) }] });
          } catch (e) {
            sendResult(id, { content: [{ type: 'text', text: e.message }], isError: true });
          }
          break;
        }

        case 'approve_job': {
          try {
            const job = studioActions.approveJob(args.id);
            sendResult(id, { content: [{ type: 'text', text: JSON.stringify(job, null, 2) }] });
          } catch (e) {
            sendResult(id, { content: [{ type: 'text', text: e.message }], isError: true });
          }
          break;
        }

        case 'park_job': {
          try {
            const job = studioActions.parkJob(args.id);
            sendResult(id, { content: [{ type: 'text', text: JSON.stringify(job, null, 2) }] });
          } catch (e) {
            sendResult(id, { content: [{ type: 'text', text: e.message }], isError: true });
          }
          break;
        }

        case 'get_pending_jobs': {
          try {
            const jobs = studioActions.getPendingJobs(args.site_tag);
            sendResult(id, { content: [{ type: 'text', text: JSON.stringify({ jobs, count: jobs.length }, null, 2) }] });
          } catch (e) {
            sendResult(id, { content: [{ type: 'text', text: e.message }], isError: true });
          }
          break;
        }

        case 'log_gap': {
          try {
            studioActions.logGap(args.tag, args.message, args.category, args.details || {});
            sendResult(id, { content: [{ type: 'text', text: 'Gap logged.' }] });
          } catch (e) {
            sendResult(id, { content: [{ type: 'text', text: e.message }], isError: true });
          }
          break;
        }

        default:
          sendError(id, -32601, `Unknown tool: ${toolName}`);
      }
      break;
    }

    default:
      if (id !== undefined) {
        sendError(id, -32601, `Method not found: ${method}`);
      }
      // Notifications without id are silently ignored
  }
}

// Ready
process.stderr.write('[famtastic-mcp] Server started\n');
