// Faceless pipeline orchestrator: topic in, render-ready video spec out.
//
//   topic --> generateScript --> synthesizeVoiceover --> buildSpec
//
// Writes <slug>.spec.json (Remotion input props) and, when audio was
// synthesized, the mp3 clips into public/<slug>/. The spec is everything
// the FacelessVideo composition needs to render.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateScript } from "./script.mjs";
import { synthesizeVoiceover } from "./tts.mjs";
import { buildSpec } from "./core.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REMOTION_ROOT = path.resolve(HERE, "..", "..");

export async function generateVideoSpec(topic, opts = {}) {
  const script = await generateScript(topic, opts);

  const slug = (opts.slug || topic).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const publicDir = path.join(REMOTION_ROOT, "public", "faceless", slug);
  const voiced = await synthesizeVoiceover(script, {
    audioDir: publicDir,
    publicPrefix: `faceless/${slug}/clip`,
    voice: opts.voice,
  });

  const spec = buildSpec(voiced, { ...opts, topic });

  const specDir = opts.specDir || path.join(REMOTION_ROOT, "out");
  await mkdir(specDir, { recursive: true });
  const specPath = path.join(specDir, `${spec.meta.slug}.spec.json`);
  await writeFile(specPath, JSON.stringify(spec, null, 2));

  return { spec, specPath };
}
