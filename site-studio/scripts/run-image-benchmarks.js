#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'docs/operating-rules/benchmark-runs/images');
const LOG_PATH = path.join(OUT_DIR, 'image-benchmarks-run-log.json');
const GOOGLE_SCRIPT = path.join(ROOT, 'scripts/google-media-generate');
const FAL_REF_IMAGE = path.join(ROOT, 'sites/site-mbsh-reunion/assets/background-tests/leonardo-motion/02-rebuilt-school-push-in-start.jpg');

const HERO_PROMPT = 'Cinematic 3:2 wide website hero background for a 30th high school reunion website. Open 1996 high school yearbook on a table, warm film grain, red white and silver school color accents, nostalgic but premium, soft depth of field, tasteful dramatic lighting, no readable text, no people, no logos, no mascot character, clean center safe area for HTML headline overlay.';

const OPENAI_OUTPUT = path.join(OUT_DIR, 'B-001-OPENAI-yearbook-hero.png');
const IMAGEN_OUTPUT = path.join(OUT_DIR, 'B-002-IMAGEN-yearbook-hero.png');
const SEED = 1996030;

const FAL_VARIATIONS = [
  {
    slug: 'warm-yearbook-print',
    output: path.join(OUT_DIR, 'B-004-FAL-Kontext-01-warm-yearbook-print.png'),
    prompt: 'Apply a 1996 high school yearbook print treatment while preserving the exact building/exterior identity, geometry, layout, palm silhouettes, and composition. Warm nostalgic film grain, slight paper texture, period color grade, soft focus around the edges, tasteful red white silver accents. Do not add people, readable text, logos, or mascot characters.',
    seed: 1996001,
  },
  {
    slug: 'flashback-vhs-yearbook',
    output: path.join(OUT_DIR, 'B-004-FAL-Kontext-02-flashback-vhs-yearbook.png'),
    prompt: 'Transform this into a 1996 yearbook flashback look while preserving the same building identity and camera angle. Add subtle VHS-era softness, warm print grain, gentle vignette, slightly faded reds and silvers, and soft-focus yearbook-photo edges. No people, no fake text, no logos, no mascot characters.',
    seed: 1996002,
  },
  {
    slug: 'archival-school-memory',
    output: path.join(OUT_DIR, 'B-004-FAL-Kontext-03-archival-school-memory.png'),
    prompt: 'Create an archival 1996 school-memory treatment while keeping the original scene identity intact: same school exterior structure, same layout, same palm silhouettes, same perspective. Add warm analog grain, printed-yearbook halftone texture, subtle light leaks, soft edges, and nostalgic color fade. No people, no readable text, no logos.',
    seed: 1996003,
  },
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function redactHeaders(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers || {})) {
    out[key] = /api|key|authorization/i.test(key) ? '<redacted>' : value;
  }
  return out;
}

function writeLog(log) {
  ensureDir(OUT_DIR);
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, args, {
      cwd: ROOT,
      env: { ...process.env, ...(options.env || {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr, durationMs: Date.now() - started });
    });
  });
}

async function requestJson(url, options, label) {
  const started = Date.now();
  const response = await fetch(url, options);
  const text = await response.text();
  const durationMs = Date.now() - started;
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const err = new Error(`${label} failed: ${response.status} ${text}`);
    err.status = response.status;
    err.body = data;
    err.durationMs = durationMs;
    throw err;
  }
  return { response, data, durationMs };
}

async function download(url, outputPath) {
  const started = Date.now();
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (!response.ok) {
    throw new Error(`download failed: ${response.status} ${buffer.toString('utf8')}`);
  }
  fs.writeFileSync(outputPath, buffer);
  return {
    durationMs: Date.now() - started,
    contentType: response.headers.get('content-type'),
    byteCount: buffer.length,
  };
}

async function runOpenAi(log) {
  const apiKey = process.env.OPENAI_API_KEY;
  const result = {
    benchmark: 'B-001',
    provider: 'openai',
    model: process.env.OPENAI_RESPONSES_MODEL || 'gpt-5.5',
    prompt: HERO_PROMPT,
    outputPath: OPENAI_OUTPUT,
    aspect: '3:2',
    size: '1536x1024',
    seed: null,
    seedNote: 'Responses image_generation tool does not expose seed in current route.',
  };
  if (!apiKey) {
    result.status = 'auth-missing';
    return result;
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const body = {
    model: result.model,
    input: HERO_PROMPT,
    tools: [
      {
        type: 'image_generation',
        action: 'generate',
        size: result.size,
        quality: 'medium',
        output_format: 'png',
        background: 'opaque',
      },
    ],
    tool_choice: { type: 'image_generation' },
  };
  result.request = {
    method: 'POST',
    url: 'https://api.openai.com/v1/responses',
    headers: redactHeaders(headers),
    body,
  };

  try {
    const generated = await requestJson('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }, 'OpenAI hero still');
    const imageCall = Array.isArray(generated.data?.output)
      ? generated.data.output.find((item) => item.type === 'image_generation_call')
      : null;
    const b64 = imageCall?.result;
    if (!b64) throw new Error('OpenAI Responses returned no image_generation_call result');
    const bytes = Buffer.from(b64, 'base64');
    fs.writeFileSync(OPENAI_OUTPUT, bytes);
    result.status = 'ok';
    result.durationMs = generated.durationMs;
    result.responseId = generated.data?.id;
    result.usage = generated.data?.usage || null;
    result.revisedPrompt = imageCall?.revised_prompt || null;
    result.byteCount = bytes.length;
    result.estimatedCostUsd = 0.07;
    result.estimatedCostNote = 'Estimate only; exact billing not returned. Medium landscape image uses 1568 image output tokens per OpenAI docs plus text tokens.';
  } catch (err) {
    result.status = 'error';
    result.error = err.message;
    result.durationMs = err.durationMs;
  }
  return result;
}

async function runImagen(log) {
  const output = IMAGEN_OUTPUT;
  const result = {
    benchmark: 'B-002',
    provider: 'google',
    model: 'imagen-4.0-generate-001',
    prompt: HERO_PROMPT,
    outputPath: output,
    aspect: '3:2',
    seed: null,
    seedNote: 'Current local google-media-generate wrapper does not expose seed.',
    request: {
      command: 'scripts/google-media-generate',
      args: ['--prompt', HERO_PROMPT, '--output', output, '--aspect-ratio', '3:2'],
      env: { GEMINI_API_KEY: '<redacted>' },
    },
    estimatedCostUsd: 0.004,
  };
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    result.status = 'auth-missing';
    return result;
  }
  const proc = await runProcess(GOOGLE_SCRIPT, ['--prompt', HERO_PROMPT, '--output', output, '--aspect-ratio', '3:2']);
  result.durationMs = proc.durationMs;
  result.stdout = proc.stdout;
  result.stderr = proc.stderr;
  if (proc.code === 0 && fs.existsSync(output)) {
    result.status = 'ok';
    result.byteCount = fs.statSync(output).size;
  } else {
    result.status = 'error';
    result.exitCode = proc.code;
  }
  return result;
}

async function runFalVariation(variation) {
  const apiKey = process.env.FAL_API_KEY;
  const result = {
    benchmark: 'B-004',
    provider: 'fal.ai',
    model: 'fal-ai/flux-pro/kontext',
    slug: variation.slug,
    inputImage: FAL_REF_IMAGE,
    outputPath: variation.output,
    prompt: variation.prompt,
    seed: variation.seed,
    estimatedCostUsd: 0.04,
  };
  if (!apiKey) {
    result.status = 'auth-missing';
    return result;
  }
  const inputBytes = fs.readFileSync(FAL_REF_IMAGE);
  const imageUrl = `data:image/jpeg;base64,${inputBytes.toString('base64')}`;
  const headers = {
    Authorization: `Key ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const body = {
    prompt: variation.prompt,
    image_url: imageUrl,
    guidance_scale: 3.5,
    num_images: 1,
    output_format: 'png',
    safety_tolerance: '2',
    enhance_prompt: false,
    aspect_ratio: '16:9',
    seed: variation.seed,
  };
  result.request = {
    method: 'POST',
    url: 'https://fal.run/fal-ai/flux-pro/kontext',
    headers: redactHeaders(headers),
    body: { ...body, image_url: `data:image/jpeg;base64,<${inputBytes.length} input bytes>` },
  };
  try {
    const generated = await requestJson('https://fal.run/fal-ai/flux-pro/kontext', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }, `fal ${variation.slug}`);
    result.durationMs = generated.durationMs;
    result.response = generated.data;
    const image = generated.data?.images?.[0];
    if (!image?.url) throw new Error('fal response did not include images[0].url');
    result.remoteUrl = image.url;
    result.width = image.width;
    result.height = image.height;
    const downloaded = await download(image.url, variation.output);
    result.status = 'ok';
    result.download = downloaded;
    result.byteCount = downloaded.byteCount;
  } catch (err) {
    result.status = 'error';
    result.error = err.message;
    result.durationMs = err.durationMs;
  }
  return result;
}

async function run() {
  loadEnvFile(path.join(ROOT, '.env'));
  loadEnvFile(path.join(ROOT, 'site-studio/.env'));
  ensureDir(OUT_DIR);

  const log = {
    ranAt: new Date().toISOString(),
    status: 'running',
    outputDir: OUT_DIR,
    budgetCapUsd: 50,
    estimatedCostUsd: {
      openai: 0.07,
      imagen: 0.004,
      fal: FAL_VARIATIONS.length * 0.04,
      total: 0.07 + 0.004 + FAL_VARIATIONS.length * 0.04,
    },
    sharedHeroPrompt: HERO_PROMPT,
    b001_openai: null,
    b002_imagen: null,
    b004_fal_kontext: [],
  };
  writeLog(log);

  const [openaiResult, imagenResult, ...falResults] = await Promise.all([
    runOpenAi(log),
    runImagen(log),
    ...FAL_VARIATIONS.map(runFalVariation),
  ]);
  log.b001_openai = openaiResult;
  log.b002_imagen = imagenResult;
  log.b004_fal_kontext = falResults;
  log.status = 'complete';
  writeLog(log);

  console.log(JSON.stringify({
    status: log.status,
    logPath: LOG_PATH,
    outputDir: OUT_DIR,
    openai: openaiResult.outputPath,
    imagen: imagenResult.outputPath,
    fal: falResults.map((result) => result.outputPath),
  }, null, 2));
}

run().catch((err) => {
  ensureDir(OUT_DIR);
  const failure = {
    ranAt: new Date().toISOString(),
    status: 'fatal-error',
    error: err.stack || err.message,
  };
  fs.writeFileSync(LOG_PATH, JSON.stringify(failure, null, 2));
  console.error(err.stack || err.message);
  process.exit(1);
});
