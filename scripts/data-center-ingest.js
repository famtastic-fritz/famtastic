'use strict';

const path = require('path');
const {
  ensureDataCenter,
  ingestCaptureSources,
} = require('../lib/famtastic/data-center');

function parseArgs(argv) {
  const args = {
    dryRun: false,
    json: false,
    root: null,
    hubRoot: null,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--root') { args.root = next; i += 1; }
    else if (arg === '--hub-root') { args.hubRoot = next; i += 1; }
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function renderText(summary) {
  const lines = [
    `Data Center root: ${summary.root}`,
    `Hub root: ${summary.hub_root}`,
    `Dry run: ${summary.dry_run ? 'yes' : 'no'}`,
    `Scanned: ${summary.scanned}`,
    `Created: ${summary.created}`,
    `Updated: ${summary.updated}`,
    `Unchanged: ${summary.unchanged}`,
  ];

  if (summary.records.length) {
    lines.push('', 'Records:');
    for (const record of summary.records) {
      lines.push(`- ${record.status} ${record.kind} ${record.path} (${record.source_id})`);
    }
  }

  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv);
  const root = args.root ? path.resolve(args.root) : null;
  const hubRoot = args.hubRoot ? path.resolve(args.hubRoot) : null;

  ensureDataCenter({ root: root || undefined });
  const summary = ingestCaptureSources({
    root: root || undefined,
    hubRoot: hubRoot || undefined,
    dryRun: args.dryRun,
  });

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(renderText(summary));
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  renderText,
};
