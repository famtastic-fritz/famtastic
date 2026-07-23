import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const {
  sendJson,
  broadcastJson,
  broadcastStatus,
  setupFileWatcherRuntime,
} = require('../server/ws-runtime');

const REPO_ROOT = path.resolve(import.meta.dirname, '..');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('rewrite seam coverage', () => {
  it('sendJson only sends to open websocket clients', () => {
    const openWs = { readyState: 1, send: vi.fn() };
    const closedWs = { readyState: 3, send: vi.fn() };

    expect(sendJson(openWs, { ok: true })).toBe(true);
    expect(openWs.send).toHaveBeenCalledWith(JSON.stringify({ ok: true }));

    expect(sendJson(closedWs, { ok: false })).toBe(false);
    expect(closedWs.send).not.toHaveBeenCalled();
  });

  it('broadcastJson and broadcastStatus fan out only to open clients', () => {
    const openA = { readyState: 1, send: vi.fn() };
    const openB = { readyState: 1, send: vi.fn() };
    const closed = { readyState: 2, send: vi.fn() };
    const wss = { clients: new Set([openA, openB, closed]) };

    expect(broadcastJson(wss, { type: 'ping' })).toBe(2);
    expect(openA.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
    expect(openB.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
    expect(closed.send).not.toHaveBeenCalled();

    expect(broadcastStatus(wss, 'working')).toBe(2);
    expect(openA.send).toHaveBeenLastCalledWith(JSON.stringify({ type: 'status', content: 'working' }));
  });

  it('setupFileWatcherRuntime wires server/index/css/js watch targets', () => {
    const watch = vi.fn(() => ({ close: vi.fn() }));
    const existsSync = vi.fn((target) => /public\/(css|js)$/.test(target));
    const mockedFs = { watch, existsSync };
    const mockedPath = path;
    const wss = { clients: new Set() };

    const watchers = setupFileWatcherRuntime({
      fs: mockedFs,
      path: mockedPath,
      rootDir: '/tmp/site-studio',
      wss,
    });

    expect(watchers).toHaveLength(4);
    const watchedTargets = watch.mock.calls.map(([target]) => target);
    expect(watchedTargets).toContain('/tmp/site-studio/server.js');
    expect(watchedTargets).toContain('/tmp/site-studio/public/index.html');
    expect(watchedTargets).toContain('/tmp/site-studio/public/css');
    expect(watchedTargets).toContain('/tmp/site-studio/public/js');
  });

  it('index shell references extracted frontend modules', () => {
    const html = fs.readFileSync(path.join(REPO_ROOT, 'public', 'index.html'), 'utf8');
    expect(html).toContain('js/studio-embedded-mode.js');
    expect(html).toContain('js/studio-embedded-intents.js');
    expect(html).toContain('js/studio-chat-ui.js');
    expect(fs.existsSync(path.join(REPO_ROOT, 'public', 'js', 'studio-embedded-mode.js'))).toBe(true);
    expect(fs.existsSync(path.join(REPO_ROOT, 'public', 'js', 'studio-embedded-intents.js'))).toBe(true);
    expect(fs.existsSync(path.join(REPO_ROOT, 'public', 'js', 'studio-chat-ui.js'))).toBe(true);
  });
});
