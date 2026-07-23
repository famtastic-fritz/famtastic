import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);

// Isolate DB from other parallel test files.
process.env.RUNTIME_VNEXT_DB_PATH = path.join(process.cwd(), '.tmp-runtime-vnext-m11.db');

const db = require('../../runtime-vnext/state/db');
const { loadProjectContext } = require('../../runtime-vnext/lib/project-context');
const { createRunContext } = require('../../runtime-vnext/lib/run-context');
const { loadAndResolve } = require('../../runtime-vnext/lib/recipe-resolver');
const { RecipeRunner } = require('../../runtime-vnext/lib/runner');
const { EventBus } = require('../../runtime-vnext/lib/event-bus');
const { registry } = require('../../runtime-vnext/lib/model-runner-registry');
const { DeterministicToolRunner, ensureInsideWorkspace } = require('../../runtime-vnext/families/deterministic-tool-runner');
const { evaluateExpression, resolveTemplate } = require('../../runtime-vnext/lib/expression-engine');

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

function makeTempHub(prefix) {
  const dir = fs.mkdtempSync(path.join(process.cwd(), `.tmp-${prefix}-`));
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

describe('M11 consumer contract verification', () => {
  let tempHub;
  let cleanup;

  beforeEach(() => {
    db.resetForTests();
    registry.register('DeterministicToolRunner', 'local', new DeterministicToolRunner());
    const t = makeTempHub('m11-contract');
    tempHub = t.dir;
    cleanup = t.cleanup;

    const fixtureSrc = path.join(REPO_ROOT, 'runtime-vnext', 'recipes', 'fixtures', 'template.html');
    const fixtureDest = path.join(tempHub, 'runtime-vnext', 'recipes', 'fixtures', 'template.html');
    fs.mkdirSync(path.dirname(fixtureDest), { recursive: true });
    if (!fs.existsSync(fixtureDest)) {
      fs.copyFileSync(fixtureSrc, fixtureDest);
    }
  });

  afterEach(() => {
    if (cleanup) cleanup();
    db.close();
  });

  async function runDeterministicScenario(siteTag, specInput) {
    const projectContext = loadProjectContext({ siteTag, hubRoot: tempHub });
    const { runContext } = createRunContext({
      projectContext,
      recipeId: 'deterministic-site-build-v1',
      recipeVersion: '1.0.0',
      trigger: 'test',
      hubRoot: tempHub,
    });
    const recipePath = path.join(REPO_ROOT, 'runtime-vnext', 'recipes', 'deterministic-site-build.yaml');
    const resolvedRecipe = loadAndResolve(recipePath);
    const eventBus = new EventBus();
    const events = [];
    eventBus.on('*', (e) => events.push(e));
    const runner = new RecipeRunner({ registry, eventBus });
    const result = await runner.execute({
      projectContext,
      runContext,
      resolvedRecipe,
      spec: specInput,
      publish: true,
    });
    return { projectContext, runContext, result, events };
  }

  it('emits all contract-defined runtime event types', async () => {
    const { events } = await runDeterministicScenario('contract-events', { site_name: 'Events', pages: [] });
    const types = new Set(events.map((e) => e.type));
    expect(types).toContain('run:running');
    expect(types).toContain('run:committed');
    expect(types).toContain('run:published');
    expect(types).toContain('stage:running');
    expect(types).toContain('stage:succeeded');
  });

  it('records run status transitions in SQLite and JSONL', async () => {
    const { runContext } = await runDeterministicScenario('contract-status', { site_name: 'Status', pages: [] });
    const runRecord = db.getRun(runContext.run_id);
    expect(runRecord.status).toBe('published');
    expect(runRecord.started_at).toBeTruthy();
    expect(runRecord.ended_at).toBeTruthy();

    const auditLines = fs.readFileSync(path.join(runContext.workspace_root, 'run.jsonl'), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    const auditTypes = auditLines.map((e) => e.type);
    expect(auditTypes).toContain('run:preparing');
    expect(auditTypes).toContain('run:running');
    expect(auditTypes).toContain('run:committed');
    expect(auditTypes).toContain('run:published');
  });

  it('records stage attempts with required contract fields', async () => {
    const { runContext } = await runDeterministicScenario('contract-stages', { site_name: 'Stages', pages: [] });
    const attempts = db.getStageAttemptsForRun(runContext.run_id);
    expect(attempts.length).toBeGreaterThan(0);
    for (const attempt of attempts) {
      expect(attempt.stage_attempt_id).toMatch(/^stage_\d+_[0-9a-f]{4}$/);
      expect(attempt.run_id).toBe(runContext.run_id);
      expect(attempt.stage_id).toBeTruthy();
      expect(attempt.attempt_number).toBeGreaterThanOrEqual(1);
      expect(attempt.status).toBe('succeeded');
      expect(attempt.started_at).toBeTruthy();
      expect(attempt.ended_at).toBeTruthy();
      const inputs = JSON.parse(attempt.inputs_json);
      expect(inputs).toBeTruthy();
      const outputs = JSON.parse(attempt.outputs_json);
      expect(outputs).toBeTruthy();
    }
  });

  it('records file artifacts with checksums', async () => {
    const { runContext } = await runDeterministicScenario('contract-artifacts', { site_name: 'Artifacts', pages: [] });
    const artifacts = db.getArtifactsForRun(runContext.run_id);
    const fileArtifacts = artifacts.filter((a) => a.kind === 'file');
    expect(fileArtifacts.length).toBeGreaterThan(0);
    for (const artifact of fileArtifacts) {
      expect(artifact.artifact_id).toMatch(/^artifact_\d+_[0-9a-f]{4}$/);
      expect(artifact.checksum).toMatch(/^[0-9a-f]{64}$/);
      expect(artifact.path).toBeTruthy();
      expect(artifact.run_id).toBe(runContext.run_id);
    }
  });

  it('isolates runs by project_id and run_id', async () => {
    const a = await runDeterministicScenario('contract-isolation-a', { site_name: 'A', pages: [] });
    const b = await runDeterministicScenario('contract-isolation-b', { site_name: 'B', pages: [] });
    expect(a.runContext.project_id).not.toBe(b.runContext.project_id);
    expect(a.runContext.run_id).not.toBe(b.runContext.run_id);
    expect(a.runContext.workspace_root).not.toBe(b.runContext.workspace_root);
  });

  it('rejects path traversal in deterministic tools', () => {
    expect(() => ensureInsideWorkspace('/tmp/workspace', '../etc/passwd')).toThrow('escapes workspace');
  });

  it('rejects forbidden expression variables and operators', () => {
    expect(() => evaluateExpression('process.env.SECRET', { project: {}, spec: {}, stages: {}, item: null, env: {} })).toThrow();
    expect(() => evaluateExpression('foo.bar', { project: {}, spec: {}, stages: {}, item: null, env: {} })).toThrow();
    expect(() => evaluateExpression('project.name + 1', { project: {}, spec: {}, stages: {}, item: null, env: {} })).toThrow();
  });

  it('resolves allowed expression variables', () => {
    const ctx = {
      project: { site_tag: 'x' },
      spec: { name: 'y' },
      stages: { 'architecture-decider': { outputs: { result: { mode: 'multi-page' } } } },
      item: null,
      env: {},
    };
    expect(resolveTemplate('{{project.site_tag}}', ctx)).toBe('x');
    expect(resolveTemplate('{{spec.name}}', ctx)).toBe('y');
    expect(resolveTemplate('{{stages.architecture-decider.outputs.result.mode}}', ctx)).toBe('multi-page');
  });

  it('supports cancellation via AbortSignal', async () => {
    const projectContext = loadProjectContext({ siteTag: 'contract-cancel', hubRoot: tempHub });
    const { runContext } = createRunContext({
      projectContext,
      recipeId: 'deterministic-site-build-v1',
      recipeVersion: '1.0.0',
      trigger: 'test',
      hubRoot: tempHub,
    });
    const recipePath = path.join(REPO_ROOT, 'runtime-vnext', 'recipes', 'deterministic-site-build.yaml');
    const resolvedRecipe = loadAndResolve(recipePath);
    const runner = new RecipeRunner({ registry });

    const executePromise = runner.execute({
      projectContext,
      runContext,
      resolvedRecipe,
      spec: { site_name: 'Cancel', pages: [] },
      publish: false,
    });

    // Cancel immediately
    runner.cancel(runContext.run_id);

    const result = await executePromise;
    expect(result.status).toBe('failed');
  });
});
