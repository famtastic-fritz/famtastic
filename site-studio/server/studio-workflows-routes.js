'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { isSafeTag } = require('./intelligence-reader');
const { readRegistry, countByApproval } = require('./media-registry');

const SAFE_COMPONENT_ID_RE = /^[a-z0-9][a-z0-9_-]{0,64}$/;
const SAFE_SECTION_RE = /^(home|sites|builder|siteset|thinktank|research|components|media|library|shay|mission|settings)$/;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function atomicWriteJson(file, value) {
  ensureDir(path.dirname(file));
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_e) {
    return fallback;
  }
}

function readJsonl(file) {
  try {
    if (!fs.existsSync(file)) return [];
    return fs.readFileSync(file, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try { return JSON.parse(line); } catch (_e) { return null; }
      })
      .filter(Boolean);
  } catch (_e) {
    return [];
  }
}

function appendJsonl(file, record) {
  ensureDir(path.dirname(file));
  fs.appendFileSync(file, JSON.stringify(record) + '\n', 'utf8');
}

function safeText(value, max, fallback) {
  if (typeof value !== 'string') return fallback || '';
  return value.trim().slice(0, max);
}

function compactSlug(value, fallback) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || fallback || 'item';
}

function nowStamp() {
  return new Date().toISOString();
}

function makeTaskId(prefix) {
  const stamp = nowStamp().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${stamp}-${rand}`;
}

function buildTaskRecord(input) {
  const targetSection = SAFE_SECTION_RE.test(String(input.target_section || ''))
    ? String(input.target_section)
    : 'mission';
  return {
    task_id: safeText(input.task_id, 96, '') || makeTaskId('studio-task'),
    source_type: safeText(input.source_type, 32, 'studio'),
    source_id: safeText(input.source_id, 96, ''),
    target_section: targetSection,
    recommendation: safeText(input.recommendation, 1000, ''),
    status: safeText(input.status, 24, 'open') || 'open',
    created_at: safeText(input.created_at, 64, nowStamp()) || nowStamp(),
    proof_needed: Array.isArray(input.proof_needed)
      ? input.proof_needed.map((item) => safeText(item, 200, '')).filter(Boolean).slice(0, 8)
      : [],
    site_tag: safeText(input.site_tag, 96, ''),
    title: safeText(input.title, 160, ''),
    owner_section: safeText(input.owner_section, 32, ''),
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
    runner: 'Studio',
    auto_approved: true,
  };
}

function appendStudioTaskRecord(repoRoot, input) {
  const tasksFile = path.join(repoRoot, 'tasks', 'tasks.jsonl');
  const task = buildTaskRecord(input);
  appendJsonl(tasksFile, task);
  return task;
}

function readDraftFiles(dir) {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const file = path.join(dir, entry.name, 'draft.json');
        if (!fs.existsSync(file)) return null;
        const parsed = readJson(file, null);
        return parsed && typeof parsed === 'object' ? parsed : null;
      })
      .filter(Boolean)
      .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
  } catch (_e) {
    return [];
  }
}

function readInsertionHistory(sitesRoot, tag) {
  if (!tag) return [];
  const file = path.join(sitesRoot, tag, '_test', 'insertion-history.jsonl');
  return readJsonl(file).slice(-20).reverse();
}

function buildLatestActions(state) {
  const out = [];
  (state.site_drafts || []).slice(0, 5).forEach((draft) => {
    out.push({
      t: draft.updated_at || draft.created_at || nowStamp(),
      who: 'site',
      text: `draft staged · ${draft.site_tag}`,
      tone: 'warn',
      section: 'sites',
    });
  });
  (state.component_drafts || []).slice(0, 5).forEach((draft) => {
    out.push({
      t: draft.updated_at || draft.created_at || nowStamp(),
      who: 'component',
      text: `component draft · ${draft.id}`,
      tone: '',
      section: 'components',
    });
  });
  (state.tasks || []).slice(0, 8).forEach((task) => {
    out.push({
      t: task.created_at || nowStamp(),
      who: 'task',
      text: `${task.target_section} · ${task.recommendation || task.title || task.task_id}`,
      tone: task.status === 'completed' ? 'good' : task.status === 'blocked' ? 'crit' : 'warn',
      section: task.target_section,
    });
  });
  (state.learning_candidates || []).slice(0, 5).forEach((item) => {
    out.push({
      t: item.captured_at || nowStamp(),
      who: 'learning',
      text: `${item.section} · ${item.note}`,
      tone: 'aurora',
      section: 'shay',
    });
  });
  return out
    .sort((a, b) => String(b.t || '').localeCompare(String(a.t || '')))
    .slice(0, 12);
}

function buildRecipeArtifacts(state) {
  const mediaAssets = state.media_assets || [];
  const tasks = state.tasks || [];
  const insertions = state.insertions || [];
  return {
    'new-site': [
      ...(state.site_drafts || []).slice(0, 3).map((draft) => `draft:${draft.site_tag}`),
      ...tasks.filter((task) => task.target_section === 'sites' || task.target_section === 'builder').slice(0, 3).map((task) => task.task_id),
    ],
    'media-to-component': [
      ...mediaAssets.slice(0, 3).map((asset) => asset.id || asset.asset_id),
      ...mediaAssets.flatMap((asset) => Array.isArray(asset.used_by) ? asset.used_by.slice(0, 1).map((use) => use.target || use.slot || asset.id) : []).slice(0, 3),
    ],
    'component-to-site': [
      ...(state.component_drafts || []).slice(0, 3).map((draft) => draft.id),
      ...insertions.slice(0, 3).map((entry) => entry.component_id || entry.inserted_fragment_path || 'insert'),
    ],
    'research-to-build': tasks
      .filter((task) => ['research', 'sites', 'components', 'media'].includes(task.target_section) && String(task.source_type || '').includes('research'))
      .slice(0, 6)
      .map((task) => task.task_id),
    'shay-routing': [
      ...tasks.filter((task) => task.source_type === 'shay').slice(0, 4).map((task) => task.task_id),
      ...(state.learning_candidates || []).slice(0, 3).map((item) => item.learning_id),
    ],
  };
}

function collectState(repoRoot, tag) {
  const sitesRoot = path.join(repoRoot, 'sites');
  const siteDraftRoot = path.join(sitesRoot, '_drafts');
  const componentDraftRoot = path.join(repoRoot, 'components', 'studio-drafts');
  const tasksFile = path.join(repoRoot, 'tasks', 'tasks.jsonl');
  const learningFile = path.join(repoRoot, 'tasks', 'studio-learning-candidates.jsonl');
  const siteDrafts = readDraftFiles(siteDraftRoot);
  const componentDrafts = readDraftFiles(componentDraftRoot);
  const tasks = readJsonl(tasksFile)
    .filter((task) => task && task.runner === 'Studio')
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const learningCandidates = readJsonl(learningFile)
    .sort((a, b) => String(b.captured_at || '').localeCompare(String(a.captured_at || '')));
  const insertions = tag ? readInsertionHistory(sitesRoot, tag) : [];

  let mediaAssets = [];
  let mediaSummary = { auto: 0, pending: 0, approved: 0, deferred: 0, draft: 0, rejected: 0, used: 0 };
  if (tag && isSafeTag(tag)) {
    const siteDir = path.join(sitesRoot, tag);
    const registry = readRegistry(siteDir) || { assets: [] };
    mediaAssets = Array.isArray(registry.assets) ? registry.assets : [];
    mediaSummary = countByApproval(registry);
  }

  const openTasks = tasks.filter((task) => task.status !== 'completed' && task.status !== 'closed');
  const state = {
    tag: tag || null,
    site_drafts: siteDrafts,
    component_drafts: componentDrafts,
    tasks: openTasks.slice(0, 50),
    learning_candidates: learningCandidates.slice(0, 50),
    insertions,
    media_assets: mediaAssets,
    media_summary: mediaSummary,
  };
  return {
    ...state,
    counts: {
      site_drafts: siteDrafts.length,
      component_drafts: componentDrafts.length,
      open_tasks: openTasks.length,
      learning_candidates: learningCandidates.length,
      media_assets: mediaAssets.length,
      media_used: mediaAssets.filter((asset) => Array.isArray(asset.used_by) && asset.used_by.length > 0).length,
      insertions: insertions.length,
    },
    recipe_artifacts: buildRecipeArtifacts(state),
    latest_actions: buildLatestActions(state),
  };
}

function createStudioWorkflowsRouter(repoRoot) {
  const router = express.Router();
  const sitesRoot = path.join(repoRoot, 'sites');
  const siteDraftRoot = path.join(sitesRoot, '_drafts');
  const componentDraftRoot = path.join(repoRoot, 'components', 'studio-drafts');
  const learningFile = path.join(repoRoot, 'tasks', 'studio-learning-candidates.jsonl');

  router.get('/state', (req, res) => {
    const tag = typeof req.query.tag === 'string' && isSafeTag(req.query.tag) ? req.query.tag : null;
    return res.json({ ok: true, state: collectState(repoRoot, tag) });
  });

  router.get('/sites/drafts', (_req, res) => {
    return res.json({ drafts: readDraftFiles(siteDraftRoot) });
  });

  router.post('/sites/drafts', (req, res) => {
    const body = req.body || {};
    const siteName = safeText(body.site_name, 120, '');
    const siteTag = safeText(body.site_tag, 96, '');
    if (!siteName) return res.status(400).json({ ok: false, error: 'site_name_required' });
    if (!isSafeTag(siteTag)) return res.status(400).json({ ok: false, error: 'invalid_site_tag' });

    const draftDir = path.join(siteDraftRoot, siteTag);
    const draftFile = path.join(draftDir, 'draft.json');
    if (fs.existsSync(draftFile)) {
      return res.status(409).json({ ok: false, error: 'draft_exists' });
    }

    const draft = {
      kind: 'site-draft',
      status: 'draft',
      site_name: siteName,
      site_tag: siteTag,
      site_type: safeText(body.site_type, 80, 'general'),
      goal: safeText(body.goal, 300, ''),
      starting_recipe: safeText(body.starting_recipe, 80, 'New Site'),
      notes: safeText(body.notes, 2000, ''),
      created_at: nowStamp(),
      updated_at: nowStamp(),
      target_path: path.relative(repoRoot, draftDir),
      live_site_exists: fs.existsSync(path.join(sitesRoot, siteTag)),
    };
    atomicWriteJson(draftFile, draft);
    const task = appendStudioTaskRecord(repoRoot, {
      source_type: 'sites',
      source_id: siteTag,
      target_section: 'sites',
      recommendation: `Review site draft ${siteTag} and continue in Site Builder`,
      title: `Review draft ${siteName}`,
      proof_needed: ['draft.json', 'builder handoff'],
      site_tag: siteTag,
      owner_section: 'sites',
      metadata: { draft_path: draft.target_path, draft: true },
    });
    return res.json({ ok: true, draft, task });
  });

  router.get('/components/drafts', (_req, res) => {
    return res.json({ drafts: readDraftFiles(componentDraftRoot) });
  });

  router.post('/components/drafts', (req, res) => {
    const body = req.body || {};
    const id = safeText(body.id, 96, '');
    if (!SAFE_COMPONENT_ID_RE.test(id)) {
      return res.status(400).json({ ok: false, error: 'invalid_component_id' });
    }
    const file = path.join(componentDraftRoot, id, 'draft.json');
    if (fs.existsSync(file)) {
      return res.status(409).json({ ok: false, error: 'draft_exists' });
    }
    const draft = {
      kind: 'component-draft',
      id,
      name: safeText(body.name, 120, id),
      purpose: safeText(body.purpose, 400, ''),
      props: Array.isArray(body.props) ? body.props.slice(0, 20) : [],
      slots: Array.isArray(body.slots) ? body.slots.slice(0, 20) : [],
      variants: Array.isArray(body.variants) ? body.variants.slice(0, 20) : [],
      media_needs: Array.isArray(body.media_needs) ? body.media_needs.slice(0, 20) : [],
      status: 'draft',
      created_at: nowStamp(),
      updated_at: nowStamp(),
      target_path: path.relative(repoRoot, path.dirname(file)),
    };
    atomicWriteJson(file, draft);
    const task = appendStudioTaskRecord(repoRoot, {
      source_type: 'components',
      source_id: id,
      target_section: 'components',
      recommendation: `Review component draft ${id} and decide reuse vs insert path`,
      title: `Review component draft ${draft.name}`,
      proof_needed: ['component draft file', 'duplicate check result'],
      owner_section: 'components',
      metadata: { draft_path: draft.target_path },
    });
    return res.json({ ok: true, draft, task });
  });

  router.get('/tasks', (req, res) => {
    const section = typeof req.query.section === 'string' ? req.query.section : '';
    let tasks = collectState(repoRoot, null).tasks;
    if (section && SAFE_SECTION_RE.test(section)) {
      tasks = tasks.filter((task) => task.target_section === section || task.owner_section === section);
    }
    return res.json({ tasks });
  });

  router.post('/tasks', (req, res) => {
    const body = req.body || {};
    if (!SAFE_SECTION_RE.test(String(body.target_section || ''))) {
      return res.status(400).json({ ok: false, error: 'invalid_target_section' });
    }
    if (!safeText(body.recommendation, 1000, '')) {
      return res.status(400).json({ ok: false, error: 'recommendation_required' });
    }
    const task = appendStudioTaskRecord(repoRoot, body);
    return res.json({ ok: true, task });
  });

  router.get('/learning', (_req, res) => {
    return res.json({ items: readJsonl(learningFile).slice(-50).reverse() });
  });

  router.post('/learning', (req, res) => {
    const body = req.body || {};
    const note = safeText(body.note, 1000, '');
    const section = safeText(body.section, 32, 'shay');
    if (!note) return res.status(400).json({ ok: false, error: 'note_required' });
    const item = {
      learning_id: makeTaskId('learning'),
      section,
      note,
      source_id: safeText(body.source_id, 96, ''),
      captured_at: nowStamp(),
      status: 'candidate',
    };
    appendJsonl(learningFile, item);
    return res.json({ ok: true, item });
  });

  return router;
}

module.exports = {
  createStudioWorkflowsRouter,
  appendStudioTaskRecord,
  collectState,
};
