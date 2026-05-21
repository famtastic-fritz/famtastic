#!/usr/bin/env node
'use strict';

const {
  loadComponentCatalog,
  searchComponents,
  buildComponentReuseContext,
  createComponentProofJob,
} = require('../lib/famtastic/component-studio');

function parseArgs(argv) {
  const args = { query: '', limit: 5, json: false, createProof: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--query') args.query = argv[++i] || '';
    else if (arg === '--type') args.type = argv[++i];
    else if (arg === '--group') args.group = argv[++i];
    else if (arg === '--limit') args.limit = Number(argv[++i] || 5);
    else if (arg === '--json') args.json = true;
    else if (arg === '--create-proof') args.createProof = true;
    else if (arg === '--title') args.title = argv[++i];
    else if (arg === '--select') args.selectedComponentIds = (argv[++i] || '').split(',').map(value => value.trim()).filter(Boolean);
    else if (arg === '--hub-root') args.hubRoot = argv[++i];
    else if (arg === '--components-root') args.componentsRoot = argv[++i];
    else if (arg === '--data-center-root') args.dataCenterRoot = argv[++i];
    else if (!args.query) args.query = arg;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const catalog = loadComponentCatalog(args);
  const candidates = searchComponents(catalog, args);
  const context = buildComponentReuseContext({ catalog, candidates, query: args.query, limit: args.limit });
  const result = {
    query: args.query,
    summary: catalog.summary,
    candidates,
    reuse_context: context,
  };

  if (args.createProof) {
    const selectedComponentIds = args.selectedComponentIds || candidates.slice(0, 1).map(component => component.id);
    result.proof = createComponentProofJob({
      hubRoot: args.hubRoot,
      dataCenterRoot: args.dataCenterRoot,
      title: args.title || `Component reuse proof: ${args.query || 'catalog search'}`,
      query: args.query,
      selectedComponentIds,
      candidates,
      status: 'completed',
    });
    result.proof.job_dir = result.proof.job_dir;
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(context);
  if (result.proof) {
    console.log(`\nProof job: ${result.proof.id}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
