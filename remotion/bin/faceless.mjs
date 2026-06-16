#!/usr/bin/env node
// faceless — turn a topic into a render-ready faceless video.
//
// Usage:
//   node bin/faceless.mjs "how compound interest works"
//   node bin/faceless.mjs "best coffee in atlanta" --format vertical --scenes 5
//   node bin/faceless.mjs "topic" --render        # also render the mp4
//
// With no API keys this still produces a complete, watchable video:
// templated script, estimated caption timing, silent track. Set
// OPENAI_API_KEY for a real script + voiceover; ELEVENLABS_API_KEY for
// premium voices.

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateVideoSpec } from "../src/pipeline/index.mjs";
import { FORMATS } from "../src/pipeline/core.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

function parseArgs(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        opts[key] = true;
      } else {
        opts[key] = next;
        i++;
      }
    } else {
      opts._.push(a);
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const topic = opts._.join(" ").trim();
  if (!topic) {
    console.error('Usage: node bin/faceless.mjs "<topic>" [--format vertical|square|wide] [--scenes N] [--render]');
    process.exit(1);
  }

  const format = FORMATS[opts.format] ? opts.format : "vertical";
  console.log(`\n🎬 faceless — "${topic}"  (${FORMATS[format].label})`);

  const { spec, specPath } = await generateVideoSpec(topic, {
    format,
    scenes: opts.scenes ? Number(opts.scenes) : undefined,
    voice: opts.voice,
    accent: opts.accent,
  });

  console.log(`   script source : ${spec.voice.provider === "none" ? "template (no API key)" : spec.voice.provider}`);
  console.log(`   voiceover     : ${spec.voice.hasAudio ? `${spec.voice.provider} / ${spec.voice.voice}` : "none (silent + estimated timing)"}`);
  console.log(`   scenes        : ${spec.meta.sceneCount}`);
  console.log(`   length        : ~${spec.meta.estimatedSeconds}s @ ${spec.meta.fps}fps  (${spec.meta.width}x${spec.meta.height})`);
  console.log(`   spec written  : ${path.relative(ROOT, specPath)}`);

  const outFile = path.join("out", `${spec.meta.slug}.mp4`);
  const renderCmd = `npx remotion render FacelessVideo "${outFile}" --props="${path.relative(ROOT, specPath)}"`;

  if (opts.render) {
    console.log(`\n▶  rendering → ${outFile}`);
    const res = spawnSync(
      "npx",
      ["remotion", "render", "FacelessVideo", outFile, `--props=${specPath}`],
      { cwd: ROOT, stdio: "inherit" },
    );
    if (res.status !== 0) {
      console.error("\n⚠  render failed (Remotion needs `npm install` + a headless Chromium).");
      console.error(`   Spec is ready — finish rendering with:\n   ${renderCmd}`);
      process.exit(res.status || 1);
    }
    console.log(`\n✅ done → ${outFile}`);
  } else {
    console.log(`\n▶  render it with:\n   ${renderCmd}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
