'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const { ensureDataCenter, createResearchJob } = require('../lib/famtastic/data-center');
const { exportResearchJobToVault } = require('../lib/famtastic/second-brain');

(function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'famtastic-second-brain-'));
  const dataRoot = path.join(tmp, 'data-center');
  const vaultRoot = path.join(tmp, 'vault');
  ensureDataCenter({ root: dataRoot });
  const job = createResearchJob({ root: dataRoot, id: 'research-test-job', title: 'Research Test Job', source: 'test' });
  const proof = {
    job_id: job.id,
    source: 'perplexity',
    citation_count: 2,
    search_result_count: 1,
    usage: { total_tokens: 42, cost: { total_cost: 0.005 } },
    citations: ['https://example.com/a', 'https://example.com/b'],
    answer_excerpt: 'A useful answer shaped the spec.',
  };
  fs.writeFileSync(path.join(dataRoot, 'jobs', job.id, 'outputs', 'research-proof.json'), JSON.stringify(proof, null, 2));

  const exported = exportResearchJobToVault({ dataRoot, vaultRoot, jobId: job.id });
  assert.ok(fs.existsSync(exported.notePath), 'expected note export');
  assert.ok(fs.existsSync(exported.canvasPath), 'expected canvas export');
  const note = fs.readFileSync(exported.notePath, 'utf8');
  assert.ok(note.includes('source: perplexity'), 'frontmatter should include source');
  assert.ok(note.includes('[[Research Test Job]]'), 'note should include wikilink');
  assert.ok(note.includes('https://example.com/a'), 'note should preserve citation');
  const canvas = JSON.parse(fs.readFileSync(exported.canvasPath, 'utf8'));
  assert.ok(Array.isArray(canvas.nodes), 'canvas should have nodes');
  assert.ok(canvas.nodes.some(node => node.text && node.text.includes('Research Test Job')), 'canvas should include job node');
  assert.ok(canvas.nodes.some(node => node.url === 'https://example.com/a'), 'canvas should include citation node');
  console.log('second-brain-tests: PASS');
})()
