'use strict';
const fs     = require('fs').promises;
const fsSync = require('fs');
const path   = require('path');
const WebSocket = require('ws');
const studioActions = require('./studio-actions');

// These will be injected by server.js when this module is initialized
let _getSiteDir = null;
let _readSpec   = null;
let _TAG        = null;
let _HUB_ROOT   = null;

function initToolHandlers({ getSiteDir, readSpec, getTag, hubRoot }) {
  _getSiteDir = getSiteDir;
  _readSpec   = readSpec;
  _TAG        = getTag;    // function that returns current TAG
  _HUB_ROOT   = hubRoot;
}

async function handleToolCall(toolName, toolInput, ws) {
  switch (toolName) {
    case 'get_site_context':       return getSiteContext(toolInput.include_pages !== false, ws);
    case 'get_component_library':  return getComponentLibrary(toolInput.filter_vertical);
    case 'get_research':           return queryResearch(toolInput.vertical, toolInput.question, ws);
    case 'dispatch_worker':        return dispatchWorker(toolInput.worker, toolInput.task, toolInput.context || {}, ws);
    case 'read_file':              return readSiteFile(toolInput.path);
    case 'create_job':             return handleCreateJob(toolInput);
    case 'approve_job':            return handleApproveJob(toolInput.id);
    case 'park_job':               return handleParkJob(toolInput.id);
    case 'get_pending_jobs':       return handleGetPendingJobs(toolInput.site_tag);
    case 'log_gap':                return handleLogGap(toolInput);
    default:                       return { error: `Unknown tool: ${toolName}` };
  }
}

// ── Tool implementations ───────────────────────────────────────────────────

async function getSiteContext(includePages, ws) {
  try {
    const spec    = _readSpec ? _readSpec() : {};
    const siteDir = _getSiteDir ? _getSiteDir() : '';
    const tag     = _TAG ? _TAG() : 'unknown';

    let pages = [];
    if (includePages && siteDir) {
      try {
        const distDir = path.join(siteDir, 'dist');
        const files = fsSync.readdirSync(distDir).filter(f => f.endsWith('.html'));
        pages = files.map(f => {
          try {
            const content = fsSync.readFileSync(path.join(distDir, f), 'utf8');
            const h1    = content.match(/<h1[^>]*>([^<]+)/)?.[1]?.trim() || '';
            const title = content.match(/<title[^>]*>([^<]+)/)?.[1]?.trim() || '';
            return { file: f, title, h1, size: content.length };
          } catch { return { file: f }; }
        });
      } catch { /* dist may not exist yet */ }
    }

    return {
      tag,
      site_name:     spec.site_name     || 'unknown',
      business_type: spec.business_type || 'unknown',
      pages,
      brief:         spec.design_brief  || null,
      decisions:     (spec.design_decisions || []).filter(d => d.status === 'approved').slice(-10),
    };
  } catch (e) {
    return { error: `get_site_context failed: ${e.message}` };
  }
}

async function getComponentLibrary(filterVertical) {
  try {
    const libPath = path.join(_HUB_ROOT || '', 'components', 'library.json');
    if (!fsSync.existsSync(libPath)) return { components: [], note: 'library.json not found' };
    const raw = JSON.parse(fsSync.readFileSync(libPath, 'utf8'));
    // ALWAYS extract .components — never use root array (cerebrum.md rule)
    let components = Array.isArray(raw.components) ? raw.components : [];
    if (filterVertical) {
      components = components.filter(c =>
        !c.vertical || c.vertical === filterVertical ||
        (c.tags || []).includes(filterVertical)
      );
    }
    return {
      count: components.length,
      components: components.map(c => ({
        name:        c.name,
        type:        c.type,
        description: c.description || '',
        vertical:    c.vertical || 'universal',
        tags:        c.tags || [],
      })),
    };
  } catch (e) {
    return { error: `get_component_library failed: ${e.message}` };
  }
}

async function queryResearch(vertical, question, ws) {
  try {
    // Try to load research-router if available
    const routerPath = path.join(__dirname, 'research-router.js');
    if (fsSync.existsSync(routerPath)) {
      const { queryResearch: queryKnowledgeBase } = require(routerPath);
      if (typeof queryKnowledgeBase === 'function') {
        const result = await queryKnowledgeBase(vertical, question || `What should I know about building for ${vertical}?`);
        return result;
      }
    }
    return {
      vertical,
      question: question || `Research for ${vertical}`,
      findings: [],
      note: 'Research router not available or Pinecone not configured',
    };
  } catch (e) {
    return { error: `get_research failed: ${e.message}`, vertical };
  }
}

async function dispatchWorker(worker, task, context, ws) {
  console.log(`WORKER_DISPATCH — ${worker}: ${task.substring(0, 80)}...`);

  // Notify UI
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ type: 'worker_dispatched', worker, task: task.substring(0, 100) }));
    } catch {}
  }

  switch (worker) {
    case 'claude-code': return dispatchToClaudeCode(task, context);
    case 'playwright':  return dispatchToPlaywright(task, context);
    case 'netlify':     return dispatchToNetlify(task, context);
    default:            return { error: `Unknown worker: ${worker}` };
  }
}

async function dispatchToClaudeCode(task, context) {
  console.log(`WORKER_CLAUDE_CODE — task queued: ${task.substring(0, 100)}`);
  const queuePath = path.join(process.env.HOME || '', 'famtastic', '.worker-queue.jsonl');
  try {
    await fs.appendFile(
      queuePath,
      JSON.stringify({ worker: 'claude-code', task, context, queued_at: new Date().toISOString(), status: 'pending' }) + '\n',
      { flag: 'a' }
    );
  } catch {}
  try {
    studioActions.createJob({ type: 'claude-code', site_tag: context?.site_tag || _TAG?.(), payload: { task, context } });
  } catch {}
  return {
    status: 'queued',
    message: 'Task queued for Claude Code worker',
    task_preview: task.substring(0, 100),
  };
}

async function dispatchToPlaywright(task, context) {
  console.log(`WORKER_PLAYWRIGHT — task queued: ${task.substring(0, 100)}`);
  const queuePath = path.join(process.env.HOME || '', 'famtastic', '.worker-queue.jsonl');
  try {
    await fs.appendFile(
      queuePath,
      JSON.stringify({ worker: 'playwright', task, context, queued_at: new Date().toISOString(), status: 'pending' }) + '\n',
      { flag: 'a' }
    );
  } catch {}
  try {
    studioActions.createJob({ type: 'playwright', site_tag: context?.site_tag || _TAG?.(), payload: { task, context } });
  } catch {}
  return {
    status: 'queued',
    message: 'Task queued for Playwright worker',
    task_preview: task.substring(0, 100),
  };
}

async function dispatchToNetlify(task, context) {
  // Can actually run this — deploy pipeline already exists
  console.log(`WORKER_NETLIFY — deploy requested`);
  return {
    status: 'acknowledged',
    message: 'Netlify deploy queued — use fam-hub site deploy to execute',
    note: 'Full autonomous deploy wired in Session 12',
  };
}

async function readSiteFile(filePath) {
  if (!_getSiteDir) return { error: 'Tool handlers not initialized' };

  // Sandbox: all reads must stay within SITE_DIR (C5 — path traversal prevention)
  const siteRoot      = path.resolve(_getSiteDir());
  const requestedPath = path.resolve(siteRoot, filePath);

  if (!requestedPath.startsWith(siteRoot + path.sep) && requestedPath !== siteRoot) {
    console.error(`PATH_TRAVERSAL_BLOCKED — attempted: ${filePath}`);
    return { error: 'Access denied — path must be within the current site directory', attempted_path: filePath };
  }

  try {
    const content = await fs.readFile(requestedPath, 'utf8');
    const MAX_FILE_SIZE = 50000;
    return {
      path: filePath,
      content: content.length > MAX_FILE_SIZE
        ? content.substring(0, MAX_FILE_SIZE) + '\n\n[FILE TRUNCATED — too large]'
        : content,
      size: content.length,
    };
  } catch (e) {
    return { error: `File not found: ${filePath}` };
  }
}

// ─── Job Queue + Gap Logging (via studio-actions) ────────────────────────────

async function handleCreateJob(input) {
  try {
    const job = studioActions.createJob({
      type:         input.type,
      site_tag:     input.site_tag,
      payload:      input.payload,
      dependencies: input.dependencies,
      cost_estimate: input.cost_estimate,
      status:       input.status,
    });
    return { ok: true, job };
  } catch (e) {
    return { error: e.message };
  }
}

async function handleApproveJob(id) {
  try {
    const job = studioActions.approveJob(id);
    return { ok: true, job };
  } catch (e) {
    return { error: e.message };
  }
}

async function handleParkJob(id) {
  try {
    const job = studioActions.parkJob(id);
    return { ok: true, job };
  } catch (e) {
    return { error: e.message };
  }
}

async function handleGetPendingJobs(siteTag) {
  try {
    const jobs = studioActions.getPendingJobs(siteTag);
    return { jobs, count: jobs.length };
  } catch (e) {
    return { error: e.message };
  }
}

async function handleLogGap(input) {
  try {
    studioActions.logGap(input.tag || _TAG?.(), input.message, input.category, input.details || {});
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
}

module.exports = { handleToolCall, initToolHandlers };
