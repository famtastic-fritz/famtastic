'use strict';

const assert = require('assert');

const { parseArgs, renderText } = require('../scripts/data-center-ingest');

(function run() {
  const parsed = parseArgs(['node', 'scripts/data-center-ingest.js', '--dry-run', '--json', '--root', '/tmp/data', '--hub-root', '/tmp/hub']);
  assert.strictEqual(parsed.dryRun, true);
  assert.strictEqual(parsed.json, true);
  assert.strictEqual(parsed.root, '/tmp/data');
  assert.strictEqual(parsed.hubRoot, '/tmp/hub');

  const text = renderText({
    root: '/tmp/data',
    hub_root: '/tmp/hub',
    dry_run: true,
    scanned: 2,
    created: 1,
    updated: 0,
    unchanged: 1,
    records: [
      { status: 'created', kind: 'capture_markdown', path: 'captures/inbox/sample.md', source_id: 'src_1' },
    ],
  });
  assert.ok(text.includes('Dry run: yes'));
  assert.ok(text.includes('capture_markdown'));
  assert.ok(text.includes('src_1'));

  assert.throws(() => parseArgs(['node', 'scripts/data-center-ingest.js', '--bogus']), /Unknown argument/);
  console.log('data-center-ingest-tests: PASS');
})();
