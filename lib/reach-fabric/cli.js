// cli.js — thin node entry the capability shell shim invokes.
//
// Usage (from send.sh):
//   node cli.js "<message>" --title=.. --urgency=.. --channels=a,b
//
// Prints a human-readable result plus any manual_required notes, and exits
// non-zero only if nothing delivered (console fallback makes that effectively
// impossible, which is the point).
'use strict';

const { sendReach } = require('./index');

function parseArgs(argv) {
  const out = { message: '', title: undefined, urgency: 'normal', channels: undefined, json: false };
  const positional = [];
  for (const arg of argv) {
    if (arg === '--json') out.json = true;
    else if (arg.startsWith('--title=')) out.title = arg.slice('--title='.length);
    else if (arg.startsWith('--urgency=')) out.urgency = arg.slice('--urgency='.length);
    else if (arg.startsWith('--channels=')) {
      out.channels = arg
        .slice('--channels='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else positional.push(arg);
  }
  out.message = positional.join(' ');
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.message) {
    process.stderr.write('Usage: platform reach send "<message>" [--title=] [--urgency=] [--channels=a,b]\n');
    process.exit(1);
  }

  const result = await sendReach(opts);

  if (opts.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write('\nReach Fabric send\n=================\n');
    process.stdout.write(`  urgency:       ${result.urgency}\n`);
    process.stdout.write(`  delivered_via: ${result.delivered_via || '(none)'}\n`);
    process.stdout.write(`  fellback:      ${result.fellback}\n`);
    process.stdout.write(`  audit_written: ${result.audit_written}\n`);
    process.stdout.write('  attempts:\n');
    for (const a of result.attempts) {
      process.stdout.write(`    - ${a.channel.padEnd(9)} ${a.status.padEnd(10)} ${a.reason}\n`);
    }
    if (result.manual_required.length) {
      process.stdout.write('\n  manual_required (unavailable channels):\n');
      for (const m of result.manual_required) {
        process.stdout.write(`    - ${m.channel}: ${m.note}\n`);
      }
    }
  }

  process.exit(result.delivered_via ? 0 : 3);
}

main().catch((err) => {
  process.stderr.write(`reach send error: ${err.message}\n`);
  process.exit(1);
});
