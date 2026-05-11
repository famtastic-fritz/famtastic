/* workflow-api.js — local-first Phase 3 workflow persistence client.
   Exposes window.WorkflowAPI for site drafts, component drafts, task records,
   learning candidates, and aggregate state used by Shay/recipes/memory. */

(function () {
  'use strict';

  async function parseJson(res) {
    const text = await res.text();
    try { return JSON.parse(text); } catch (_e) { return { ok: false, error: 'invalid_json', body: text }; }
  }

  async function getState(tag) {
    try {
      const url = tag
        ? `/api/studio-workflows/state?tag=${encodeURIComponent(String(tag))}`
        : '/api/studio-workflows/state';
      const res = await fetch(url, { credentials: 'same-origin' });
      const data = await parseJson(res);
      return data && data.state ? data.state : null;
    } catch (e) {
      return null;
    }
  }

  async function createSiteDraft(payload) {
    try {
      const res = await fetch('/api/studio-workflows/sites/drafts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      return await parseJson(res);
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    }
  }

  async function listSiteDrafts() {
    try {
      const res = await fetch('/api/studio-workflows/sites/drafts', { credentials: 'same-origin' });
      return await parseJson(res);
    } catch (e) {
      return { drafts: [], error: String(e && e.message || e) };
    }
  }

  async function createComponentDraft(payload) {
    try {
      const res = await fetch('/api/studio-workflows/components/drafts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      return await parseJson(res);
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    }
  }

  async function listComponentDrafts() {
    try {
      const res = await fetch('/api/studio-workflows/components/drafts', { credentials: 'same-origin' });
      return await parseJson(res);
    } catch (e) {
      return { drafts: [], error: String(e && e.message || e) };
    }
  }

  async function createTask(payload) {
    try {
      const res = await fetch('/api/studio-workflows/tasks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      return await parseJson(res);
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    }
  }

  async function listTasks(section) {
    try {
      const url = section
        ? `/api/studio-workflows/tasks?section=${encodeURIComponent(String(section))}`
        : '/api/studio-workflows/tasks';
      const res = await fetch(url, { credentials: 'same-origin' });
      return await parseJson(res);
    } catch (e) {
      return { tasks: [], error: String(e && e.message || e) };
    }
  }

  async function captureLearning(payload) {
    try {
      const res = await fetch('/api/studio-workflows/learning', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      return await parseJson(res);
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    }
  }

  async function listLearning() {
    try {
      const res = await fetch('/api/studio-workflows/learning', { credentials: 'same-origin' });
      return await parseJson(res);
    } catch (e) {
      return { items: [], error: String(e && e.message || e) };
    }
  }

  window.WorkflowAPI = {
    getState,
    createSiteDraft,
    listSiteDrafts,
    createComponentDraft,
    listComponentDrafts,
    createTask,
    listTasks,
    captureLearning,
    listLearning,
  };
})();
