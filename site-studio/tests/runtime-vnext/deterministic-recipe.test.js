import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);

// Isolate DB from other parallel test files.
process.env.RUNTIME_VNEXT_DB_PATH = path.join(process.cwd(), '.tmp-runtime-vnext-m10.db');

// vNext modules (CommonJS)
const db = require('../../runtime-vnext/state/db');
const { loadProjectContext } = require('../../runtime-vnext/lib/project-context');
const { createRunContext } = require('../../runtime-vnext/lib/run-context');
const { loadAndResolve } = require('../../runtime-vnext/lib/recipe-resolver');
const { RecipeRunner } = require('../../runtime-vnext/lib/runner');
const { EventBus } = require('../../runtime-vnext/lib/event-bus');
const { registry } = require('../../runtime-vnext/lib/model-runner-registry');
const { DeterministicToolRunner } = require('../../runtime-vnext/families/deterministic-tool-runner');

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

function makeTempHub(prefix) {
  const dir = fs.mkdtempSync(path.join(process.cwd(), `.tmp-${prefix}-`));
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

describe('M10 DeterministicRecipe runtime', () => {
  let tempHub;
  let cleanup;

  beforeEach(() => {
    db.resetForTests();
    registry.register('DeterministicToolRunner', 'local', new DeterministicToolRunner());
    const t = makeTempHub('m10');
    tempHub = t.dir;
    cleanup = t.cleanup;

    // Copy recipe fixture into temp hub so {{project.hub_root}} resolves correctly
    const fixtureSrc = path.join(REPO_ROOT, 'runtime-vnext', 'recipes', 'fixtures', 'template.html');
    const fixtureDest = path.join(tempHub, 'runtime-vnext', 'recipes', 'fixtures', 'template.html');
    fs.mkdirSync(path.dirname(fixtureDest), { recursive: true });
    fs.copyFileSync(fixtureSrc, fixtureDest);
  });

  afterEach(() => {
    if (cleanup) cleanup();
    db.close();
  });

  it('loads a project context and persists .project.json', () => {
    const projectContext = loadProjectContext({ siteTag: 'test-site', hubRoot: tempHub });
    expect(projectContext.site_tag).toBe('test-site');
    expect(projectContext.hub_root).toBe(path.resolve(tempHub));
    expect(fs.existsSync(path.join(tempHub, 'sites', 'test-site', '.project.json'))).toBe(true);

    const fromDb = db.getProjectBySiteTag('test-site');
    expect(fromDb.project_id).toBe(projectContext.project_id);
  });

  it('creates a run context with workspace layout', () => {
    const projectContext = loadProjectContext({ siteTag: 'test-site', hubRoot: tempHub });
    const { runContext, runRecord } = createRunContext({
      projectContext,
      recipeId: 'deterministic-site-build-v1',
      recipeVersion: '1.0.0',
      trigger: 'test',
      hubRoot: tempHub,
    });

    expect(runContext.run_id).toMatch(/^run_\d+_[0-9a-f]{4}$/);
    expect(runContext.status).toBe('preparing');
    expect(fs.existsSync(path.join(runContext.workspace_root, 'staging'))).toBe(true);
    expect(fs.existsSync(path.join(runContext.workspace_root, 'outputs'))).toBe(true);
    expect(fs.existsSync(path.join(runContext.workspace_root, 'run.jsonl'))).toBe(true);

    const fromDb = db.getRun(runContext.run_id);
    expect(fromDb.status).toBe('preparing');
    expect(runRecord.workspace_root).toBe(runContext.workspace_root);
  });

  it('executes the deterministic recipe end-to-end and publishes to dist', async () => {
    const projectContext = loadProjectContext({ siteTag: 'test-site', hubRoot: tempHub });
    const { runContext } = createRunContext({
      projectContext,
      recipeId: 'deterministic-site-build-v1',
      recipeVersion: '1.0.0',
      trigger: 'test',
      hubRoot: tempHub,
    });

    const recipePath = path.join(REPO_ROOT, 'runtime-vnext', 'recipes', 'deterministic-site-build.yaml');
    const resolvedRecipe = loadAndResolve(recipePath);
    expect(resolvedRecipe.executionOrder).toEqual([
      'copy-template',
      'apply-branding',
      'generate-pages',
      'apply-page-branding',
      'verify-output',
    ]);

    const eventBus = new EventBus();
    const events = [];
    eventBus.on('stage:succeeded', (e) => events.push(e.type + ':' + e.stageId));
    eventBus.on('run:published', () => events.push('run:published'));

    const runner = new RecipeRunner({ registry, eventBus });
    const result = await runner.execute({
      projectContext,
      runContext,
      resolvedRecipe,
      spec: { site_name: 'Demo Business', pages: ['about', 'contact'] },
      publish: true,
    });

    expect(result.status).toBe('published');
    expect(result.error).toBeUndefined();
    expect(events).toContain('run:published');
    expect(events).toContain('stage:succeeded:copy-template');
    expect(events).toContain('stage:succeeded:apply-branding');
    expect(events).toContain('stage:succeeded:generate-pages');
    expect(events).toContain('stage:succeeded:apply-page-branding');
    expect(events).toContain('stage:succeeded:verify-output');

    // Verify committed outputs
    const outputsDir = path.join(runContext.workspace_root, 'outputs');
    expect(fs.existsSync(path.join(outputsDir, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(outputsDir, 'about.html'))).toBe(true);
    expect(fs.existsSync(path.join(outputsDir, 'contact.html'))).toBe(true);

    const indexHtml = fs.readFileSync(path.join(outputsDir, 'index.html'), 'utf8');
    expect(indexHtml).toContain('Demo Business');
    expect(indexHtml).not.toContain('{{SITE_NAME}}');

    // Verify published dist
    const distDir = path.join(tempHub, 'sites', 'test-site', 'dist');
    expect(fs.existsSync(path.join(distDir, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, 'about.html'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, 'contact.html'))).toBe(true);

    // Verify DB records
    const runRecord = db.getRun(runContext.run_id);
    expect(runRecord.status).toBe('published');
    expect(runRecord.ended_at).toBeTruthy();

    const attempts = db.getStageAttemptsForRun(runContext.run_id);
    expect(attempts.length).toBe(5 + 2); // 5 stages + 2 foreach items for generate-pages and apply-page-branding
    expect(attempts.every((a) => a.status === 'succeeded')).toBe(true);

    const artifacts = db.getArtifactsForRun(runContext.run_id);
    expect(artifacts.length).toBeGreaterThanOrEqual(5); // file artifacts
  });

  it('writes resolved-recipe.json to the workspace', async () => {
    const projectContext = loadProjectContext({ siteTag: 'test-site', hubRoot: tempHub });
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
    await runner.execute({
      projectContext,
      runContext,
      resolvedRecipe,
      spec: { site_name: 'Test', pages: [] },
      publish: false,
    });

    const resolvedPath = path.join(runContext.workspace_root, 'resolved-recipe.json');
    expect(fs.existsSync(resolvedPath)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    expect(parsed.recipe.id).toBe('deterministic-site-build-v1');
    expect(parsed.executionOrder).toContain('copy-template');
  });
});
