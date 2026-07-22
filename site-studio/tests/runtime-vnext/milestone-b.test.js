import { describe, it, expect, beforeEach } from 'vitest';
import { RepoBootstrapRunner } from '../../runtime-vnext/families/repo-bootstrap-runner.js';
import { ConfigScaffoldRunner } from '../../runtime-vnext/families/config-scaffold-runner.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

function makeCtx() {
  const workspace_root = fs.mkdtempSync(path.join(os.tmpdir(), 'vnext-test-'));
  return { runContext: { workspace_root, run_id: 'test-b' }, stageAttempt: {}, abortSignal: null };
}

function makeRequest(overrides = {}) {
  return {
    buildRequest: {
      site_tag: 'test-biz',
      business: { name: 'Test Biz', industry: 'consulting', description: 'We consult.', location: 'Austin, TX' },
      brand: { mood: 'professional' },
      content_inputs: { services: [] },
      positioning: {},
      deploy: { staging_deploy: false, prod_deploy: false },
      ...overrides,
    },
  };
}

describe('Milestone B — RepoBootstrapRunner', () => {
  it('returns files_created list', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new RepoBootstrapRunner();
    const res = await r.execute(makeRequest(), { runContext, stageAttempt, abortSignal });
    expect(res.result.files_created).toBeInstanceOf(Array);
    expect(res.result.files_created.length).toBeGreaterThan(0);
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
    expect(res.costUsd).toBe(0);
  });

  it('writes package.json to staging/', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new RepoBootstrapRunner();
    await r.execute(makeRequest(), { runContext, stageAttempt, abortSignal });
    const pkgPath = path.join(runContext.workspace_root, 'staging', 'package.json');
    expect(fs.existsSync(pkgPath)).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(pkg.name).toContain('test-biz');
  });

  it('is idempotent — second run does not throw', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new RepoBootstrapRunner();
    await r.execute(makeRequest(), { runContext, stageAttempt, abortSignal });
    const res2 = await r.execute(makeRequest(), { runContext, stageAttempt, abortSignal });
    expect(res2.result).toBeTruthy();
  });
});

describe('Milestone B — ConfigScaffoldRunner', () => {
  it('writes netlify.toml to staging/', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new ConfigScaffoldRunner();
    await r.execute(makeRequest(), { runContext, stageAttempt, abortSignal });
    const tomlPath = path.join(runContext.workspace_root, 'staging', 'netlify.toml');
    expect(fs.existsSync(tomlPath)).toBe(true);
  });

  it('returns deploy_target and staging_url_template', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new ConfigScaffoldRunner();
    const res = await r.execute(makeRequest(), { runContext, stageAttempt, abortSignal });
    expect(res.result.deploy_target).toBe('netlify');
    expect(res.result.staging_url_template).toContain('netlify.app');
  });

  it('writes .env.example', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new ConfigScaffoldRunner();
    await r.execute(makeRequest(), { runContext, stageAttempt, abortSignal });
    const envPath = path.join(runContext.workspace_root, 'staging', '.env.example');
    expect(fs.existsSync(envPath)).toBe(true);
  });
});
