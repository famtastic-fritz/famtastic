'use strict';
/**
 * Characterization harness for Site Studio vNext.
 *
 * Captures inputs, outputs, events, and traces for build scenarios so that
 * the old runtime and the new runtime can be compared for parity.
 *
 * Usage:
 *   const { CharacterizationHarness } = require('./runtime-vnext/harness/characterization-harness');
 *   const h = new CharacterizationHarness({ siteTag: 'site-demo', caseDir: './cases/single-page' });
 *   await h.runScenario('single-page-build');
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Snapshot helpers
function hashFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function hashString(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function listFiles(dir, base = dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFiles(full, base));
    } else {
      results.push(path.relative(base, full));
    }
  }
  return results;
}

function snapshotDirectory(dir, opts = {}) {
  const { includeContent = false, maxContentBytes = 50 * 1024 } = opts;
  const files = listFiles(dir);
  const snapshot = {};
  for (const rel of files) {
    const full = path.join(dir, rel);
    const stat = fs.statSync(full);
    const entry = {
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      sha256: hashFile(full),
    };
    if (includeContent && stat.size <= maxContentBytes) {
      try {
        entry.content = fs.readFileSync(full, 'utf8');
      } catch {
        entry.contentBase64 = fs.readFileSync(full).toString('base64');
      }
    }
    snapshot[rel] = entry;
  }
  return snapshot;
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return { _parseError: true, raw: l }; } });
}

class CharacterizationHarness {
  constructor({ siteTag, caseDir, hubRoot }) {
    this.siteTag = siteTag;
    this.caseDir = caseDir;
    this.hubRoot = hubRoot || path.resolve(__dirname, '../..');
    this.siteDir = path.join(this.hubRoot, 'sites', siteTag);
    this.distDir = path.join(this.siteDir, 'dist');
    this.specPath = path.join(this.siteDir, 'spec.json');
    this.studioPath = path.join(this.siteDir, '.studio.json');
    this.tracePath = path.join(this.siteDir, 'build-trace.jsonl');
    this.mutationPath = path.join(this.siteDir, 'mutations.jsonl');
    this.events = [];
  }

  ensureServerLoaded() {
    if (this.serverModule) return this.serverModule;
    // Prevent server from binding ports during harness runs
    process.env.STUDIO_NO_LISTEN = '1';
    process.env.SITE_TAG = this.siteTag;
    // server.js derives paths from process.env.SITE_TAG at load time
    // Hub root may be the parent of site-studio, or the site-studio directory itself.
    const candidates = [
      path.join(this.hubRoot, 'site-studio', 'server'),
      path.join(this.hubRoot, 'server'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate + '.js')) {
        this.serverModule = require(candidate);
        return this.serverModule;
      }
    }
    throw new Error(`Cannot find server.js under ${this.hubRoot}. Tried: ${candidates.join(', ')}`);
  }

  createMockWs() {
    const events = this.events;
    return {
      readyState: 1,
      buildRunId: null,
      currentBrain: 'claude',
      brainModels: {},
      activeChildren: [],
      currentChild: null,
      autoAccept: false,
      send: (data) => {
        events.push(typeof data === 'string' ? JSON.parse(data) : data);
      },
      once: () => {},
      removeListener: () => {},
      on: () => {},
    };
  }

  async capturePreState() {
    return {
      timestamp: new Date().toISOString(),
      spec: fs.existsSync(this.specPath) ? JSON.parse(fs.readFileSync(this.specPath, 'utf8')) : null,
      studio: fs.existsSync(this.studioPath) ? JSON.parse(fs.readFileSync(this.studioPath, 'utf8')) : null,
      distSnapshot: snapshotDirectory(this.distDir),
      mutations: readJsonl(this.mutationPath),
      traces: readJsonl(this.tracePath),
    };
  }

  async capturePostState() {
    return {
      timestamp: new Date().toISOString(),
      spec: fs.existsSync(this.specPath) ? JSON.parse(fs.readFileSync(this.specPath, 'utf8')) : null,
      studio: fs.existsSync(this.studioPath) ? JSON.parse(fs.readFileSync(this.studioPath, 'utf8')) : null,
      distSnapshot: snapshotDirectory(this.distDir, { includeContent: true }),
      mutations: readJsonl(this.mutationPath),
      traces: readJsonl(this.tracePath),
    };
  }

  async runScenario(scenarioDef) {
    const { name, description, setup, action, timeoutMs = 600000 } = scenarioDef;
    this.events = [];

    fs.mkdirSync(this.caseDir, { recursive: true });

    const meta = {
      name,
      description,
      siteTag: this.siteTag,
      hubRoot: this.hubRoot,
      startedAt: new Date().toISOString(),
    };

    const server = this.ensureServerLoaded();

    // 1. Setup
    if (setup) {
      await setup({ server, harness: this, siteDir: this.siteDir, specPath: this.specPath });
    }

    const preState = await this.capturePreState();

    // 2. Action
    const actionResult = await action({
      server,
      harness: this,
      mockWs: this.createMockWs(),
      siteTag: this.siteTag,
      specPath: this.specPath,
      timeoutMs,
    });

    const postState = await this.capturePostState();

    meta.endedAt = new Date().toISOString();

    const caseData = {
      meta,
      pre: preState,
      post: postState,
      wsEvents: this.events,
      actionResult,
    };

    // 3. Persist
    fs.writeFileSync(path.join(this.caseDir, 'case.json'), JSON.stringify(caseData, null, 2));
    fs.writeFileSync(path.join(this.caseDir, 'spec-before.json'), JSON.stringify(preState.spec, null, 2));
    fs.writeFileSync(path.join(this.caseDir, 'spec-after.json'), JSON.stringify(postState.spec, null, 2));
    fs.writeFileSync(path.join(this.caseDir, 'events.jsonl'), this.events.map(e => JSON.stringify(e)).join('\n') + (this.events.length ? '\n' : ''));

    // 4. Summary
    const summary = {
      name,
      caseDir: this.caseDir,
      eventCount: this.events.length,
      filesBefore: Object.keys(preState.distSnapshot).length,
      filesAfter: Object.keys(postState.distSnapshot).length,
      tracesBefore: preState.traces.length,
      tracesAfter: postState.traces.length,
      mutationsBefore: preState.mutations.length,
      mutationsAfter: postState.mutations.length,
    };

    return summary;
  }
}

module.exports = { CharacterizationHarness, snapshotDirectory, hashFile, hashString, readJsonl };
