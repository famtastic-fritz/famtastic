#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const {
  buildMuapiPlan,
  createMediaJob,
} = require('../media-studio/lib');

function parseArgs(argv) {
  const args = { dryRun: true, createJob: false, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') args.json = true;
    else if (arg === '--create-job') args.createJob = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--spend') args.dryRun = false;
    else if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      args[key] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function usage() {
  return `Usage: node scripts/media-studio-plan.js --prompt <text> [--title <title>] [--intent hero-image] [--media-type image] [--category hero] [--create-job] [--json]\n\nDefault is dry-run; --spend is intentionally unsupported without code review/approval.\n`;
}

(function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.prompt) {
    process.stderr.write(usage());
    process.exit(2);
  }
  if (args.dryRun === false) {
    throw new Error('Paid media generation is gated. This planner only supports dry-run in Wave 5.');
  }
  const root = args.root ? path.resolve(args.root) : undefined;
  const plan = buildMuapiPlan({
    root,
    title: args.title,
    intent: args.intent || args.mediaType || 'text-to-image',
    prompt: args.prompt,
    mediaType: args.mediaType,
    category: args.category,
    dryRun: true,
    budget: { maxUsd: 0, maxCredits: 0 },
    researchJobIds: args.researchJobIds ? String(args.researchJobIds).split(',').map(s => s.trim()).filter(Boolean) : [],
  });
  const result = { plan };
  if (args.createJob) result.job = createMediaJob({ root, plan });

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return;
  }
  process.stdout.write(`Media Studio dry-run plan\n`);
  process.stdout.write(`Title: ${plan.title}\n`);
  process.stdout.write(`Intent: ${plan.intent}\n`);
  process.stdout.write(`Provider/model: ${plan.provider}/${plan.model}\n`);
  process.stdout.write(`Fallback chain: ${plan.fallback_chain.join(' -> ')}\n`);
  process.stdout.write(`Prompt hash: ${plan.prompt_hash}\n`);
  process.stdout.write(`Would spend: ${plan.would_spend}\n`);
  process.stdout.write(`Command preview: ${plan.command_preview}\n`);
  if (result.job) process.stdout.write(`Job: ${result.job.id}\n`);
})()
