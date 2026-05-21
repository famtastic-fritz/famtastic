'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { ensureDataCenter, createResearchJob, appendLedgerRecord } = require('../lib/famtastic/data-center');
const research = require('../lib/famtastic/research');

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = { vertical: 'general', question: '', forceSource: null, enablePerplexity: false, skipCache: false, title: '' };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--vertical') { args.vertical = next; i++; }
    else if (arg === '--question') { args.question = next; i++; }
    else if (arg === '--source') { args.forceSource = next; i++; }
    else if (arg === '--perplexity') { args.forceSource = 'perplexity'; args.enablePerplexity = true; args.skipCache = true; }
    else if (arg === '--skip-cache') { args.skipCache = true; }
    else if (arg === '--title') { args.title = next; i++; }
  }
  if (!args.question) throw new Error('Missing --question');
  if (!args.title) args.title = `${args.vertical}: ${args.question}`.slice(0, 120);
  return args;
}

async function main() {
  loadEnvFile(path.join(os.homedir(), '.shay', '.env'));
  const args = parseArgs(process.argv);
  const dataCenter = ensureDataCenter();
  const job = createResearchJob({
    root: dataCenter.root,
    title: args.title,
    source: args.forceSource || 'router',
    budget: { maxUsd: args.forceSource === 'perplexity' ? 0.01 : 0 },
  });

  appendLedgerRecord({
    root: dataCenter.root,
    ledger: 'research-events',
    record: {
      event: 'query.started',
      job_id: job.id,
      vertical: args.vertical,
      question: args.question,
      source: args.forceSource || 'auto',
    },
  });

  const response = await research.query({
    vertical: args.vertical,
    question: args.question,
    options: {
      forceSource: args.forceSource || undefined,
      enablePerplexity: args.enablePerplexity,
      skipCache: args.skipCache,
    },
  });

  const result = response.result || {};
  const citationCount = Array.isArray(result.meta?.citations) ? result.meta.citations.length : 0;
  const searchResultCount = Array.isArray(result.meta?.search_results) ? result.meta.search_results.length : 0;
  const usage = result.meta?.usage || null;
  const cost = result.meta?.cost || null;

  appendLedgerRecord({
    root: dataCenter.root,
    ledger: 'research-events',
    record: {
      event: response.ok ? 'query.completed' : 'query.failed',
      job_id: job.id,
      vertical: args.vertical,
      question: args.question,
      ok: response.ok,
      error: response.error || null,
      source: result.source || args.forceSource || 'unknown',
      answer_excerpt: result.answer ? String(result.answer).slice(0, 500) : null,
      citation_count: citationCount,
      search_result_count: searchResultCount,
      citations: result.meta?.citations || [],
      search_results: result.meta?.search_results || [],
      usage,
      cost,
      meta: result.meta || {},
    },
  });

  const jobDir = path.join(dataCenter.root, 'jobs', job.id);
  const sourceProof = {
    job_id: job.id,
    ok: response.ok,
    vertical: args.vertical,
    question: args.question,
    source: result.source || args.forceSource || 'unknown',
    fromCache: !!result.fromCache,
    stale: !!result.stale,
    citation_count: citationCount,
    search_result_count: searchResultCount,
    usage,
    cost,
    citations: result.meta?.citations || [],
    search_results: result.meta?.search_results || [],
    answer_excerpt: result.answer ? String(result.answer).slice(0, 1000) : null,
  };
  fs.writeFileSync(path.join(jobDir, 'outputs', 'research-proof.json'), JSON.stringify(sourceProof, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(jobDir, 'report.md'), [
    `# ${job.title}`,
    '',
    `Status: ${response.ok ? 'completed' : 'failed'}`,
    `Source: ${sourceProof.source}`,
    `Citations: ${citationCount}`,
    `Search results: ${searchResultCount}`,
    `Usage: ${usage ? JSON.stringify(usage) : 'n/a'}`,
    `Cost: ${cost ? JSON.stringify(cost) : 'n/a'}`,
    '',
    '## Answer excerpt',
    '',
    sourceProof.answer_excerpt || 'No answer.',
    '',
  ].join('\n'), 'utf8');

  console.log(JSON.stringify({
    ok: response.ok,
    job_id: job.id,
    source: sourceProof.source,
    citation_count: citationCount,
    search_result_count: searchResultCount,
    has_usage: !!usage,
    has_cost: !!cost,
    proof: path.join(jobDir, 'outputs', 'research-proof.json'),
  }, null, 2));
}

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { loadEnvFile, parseArgs };
