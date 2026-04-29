#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'docs/operating-rules/benchmark-runs/audio');
const LOG_PATH = path.join(OUT_DIR, 'audio-benchmarks-run-log.json');

const HARRY_SCRIPT = "Hey Tide family, Harry here. The reunion is coming up fast, and I saved you a seat by the dance floor.";

const SFX_PROMPTS = [
  { slug: 'vhs-tape-hiss', text: 'subtle VHS tape hiss loop, nostalgic 1990s texture, low volume', duration_seconds: 4 },
  { slug: 'vinyl-crackle', text: 'vinyl crackle over dusty warm silence, subtle background texture', duration_seconds: 4 },
  { slug: 'distant-gym-cheer', text: 'distant high school gym crowd cheer, muffled and nostalgic', duration_seconds: 3 },
  { slug: 'locker-slam', text: 'metal school locker closing with hallway reverb', duration_seconds: 2 },
  { slug: 'answering-machine', text: '1990s answering machine beep and room tone', duration_seconds: 3 },
];

const MUSIC_PROMPTS = [
  {
    slug: 'east-coast-boombap-reunion-bed',
    text: 'Instrumental 1990s East Coast boom-bap inspired reunion bed, dusty piano chords, warm vinyl crackle, laid-back drums, celebratory but nostalgic, no vocals, no copyrighted artist references.',
    duration_seconds: 20,
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

function safeSlug(value) {
  return String(value || 'voice')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'voice';
}

function redactHeaders(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers || {})) {
    out[key] = /api|key|authorization|xi-api-key/i.test(key) ? '<redacted>' : value;
  }
  return out;
}

function writeLog(log) {
  ensureDir(OUT_DIR);
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}

async function requestBuffer(url, options, label) {
  const started = Date.now();
  const response = await fetch(url, options);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const durationMs = Date.now() - started;
  if (!response.ok) {
    const text = buffer.toString('utf8');
    const err = new Error(`${label} failed: ${response.status} ${text}`);
    err.status = response.status;
    err.body = text;
    err.durationMs = durationMs;
    throw err;
  }
  return { response, buffer, durationMs };
}

async function requestJson(url, options, label) {
  const started = Date.now();
  const response = await fetch(url, options);
  const text = await response.text();
  const durationMs = Date.now() - started;
  if (!response.ok) {
    const err = new Error(`${label} failed: ${response.status} ${text}`);
    err.status = response.status;
    err.body = text;
    err.durationMs = durationMs;
    throw err;
  }
  return { response, json: text ? JSON.parse(text) : null, durationMs };
}

function pickVoiceCandidates(voices) {
  const preferred = ['Charlie', 'Brian', 'George', 'Eric', 'Adam', 'Chris', 'Josh', 'Liam'];
  const byName = new Map(voices.map((voice) => [String(voice.name || '').toLowerCase(), voice]));
  const selected = [];
  for (const name of preferred) {
    const voice = byName.get(name.toLowerCase());
    if (voice && !selected.some((v) => v.voice_id === voice.voice_id)) selected.push(voice);
    if (selected.length >= 5) break;
  }
  if (selected.length < 3) {
    for (const voice of voices) {
      const category = String(voice.category || '').toLowerCase();
      if (category && !['premade', 'professional', 'generated'].includes(category)) continue;
      if (!selected.some((v) => v.voice_id === voice.voice_id)) selected.push(voice);
      if (selected.length >= 5) break;
    }
  }
  return selected.slice(0, 5);
}

async function run() {
  loadEnvFile(path.join(ROOT, '.env'));
  loadEnvFile(path.join(ROOT, 'site-studio/.env'));
  ensureDir(OUT_DIR);

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const log = {
    ranAt: new Date().toISOString(),
    provider: 'elevenlabs',
    outputDir: OUT_DIR,
    totalEstimatedCostUsd: null,
    benchmarks: {
      b005_voice_candidates: { status: 'pending', results: [] },
      b006_sfx_pack: { status: 'pending', results: [] },
      b007_music: { status: 'pending', results: [] },
    },
  };

  if (!apiKey) {
    log.status = 'auth-missing';
    log.error = 'ELEVENLABS_API_KEY not found in environment or .env files';
    writeLog(log);
    process.exitCode = 1;
    return;
  }

  const headers = {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  writeLog(log);

  const voicesCall = {
    method: 'GET',
    url: 'https://api.elevenlabs.io/v1/voices',
    headers: redactHeaders({ 'xi-api-key': apiKey, Accept: 'application/json' }),
  };
  const voicesResp = await requestJson(voicesCall.url, {
    method: 'GET',
    headers: { 'xi-api-key': apiKey, Accept: 'application/json' },
  }, 'list voices');
  const voices = Array.isArray(voicesResp.json?.voices) ? voicesResp.json.voices : [];
  const candidates = pickVoiceCandidates(voices);
  log.benchmarks.b005_voice_candidates.availableVoiceCount = voices.length;
  log.benchmarks.b005_voice_candidates.selectedVoices = candidates.map((voice) => ({
    voice_id: voice.voice_id,
    name: voice.name,
    category: voice.category,
    labels: voice.labels || {},
  }));
  log.benchmarks.b005_voice_candidates.listVoicesCall = voicesCall;

  if (candidates.length < 3) {
    log.benchmarks.b005_voice_candidates.status = 'failed';
    log.benchmarks.b005_voice_candidates.error = `Only found ${candidates.length} usable voices`;
  } else {
    for (let i = 0; i < candidates.length; i += 1) {
      const voice = candidates[i];
      const filename = `B-005-harry-voice-${String(i + 1).padStart(2, '0')}-${safeSlug(voice.name)}.mp3`;
      const outputPath = path.join(OUT_DIR, filename);
      const body = {
        text: HARRY_SCRIPT,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.42,
          similarity_boost: 0.75,
          style: 0.25,
          use_speaker_boost: true,
        },
      };
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice.voice_id}`;
      const result = {
        provider: 'elevenlabs',
        benchmark: 'B-005',
        voice_id: voice.voice_id,
        voice_name: voice.name,
        category: voice.category,
        prompt: HARRY_SCRIPT,
        outputPath,
        request: {
          method: 'POST',
          url,
          headers: redactHeaders(headers),
          body,
        },
      };
      try {
        const generated = await requestBuffer(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        }, `tts ${voice.name}`);
        fs.writeFileSync(outputPath, generated.buffer);
        result.status = 'ok';
        result.durationMs = generated.durationMs;
        result.contentType = generated.response.headers.get('content-type');
        result.characterCost = generated.response.headers.get('character-cost') || generated.response.headers.get('x-character-cost');
        result.byteCount = generated.buffer.length;
      } catch (err) {
        result.status = 'error';
        result.error = err.message;
        result.durationMs = err.durationMs;
      }
      log.benchmarks.b005_voice_candidates.results.push(result);
      writeLog(log);
    }
    log.benchmarks.b005_voice_candidates.status = log.benchmarks.b005_voice_candidates.results.some((r) => r.status === 'ok') ? 'ok' : 'failed';
  }

  for (const item of SFX_PROMPTS) {
    const filename = `B-006-sfx-${item.slug}.mp3`;
    const outputPath = path.join(OUT_DIR, filename);
    const body = {
      text: item.text,
      duration_seconds: item.duration_seconds,
      prompt_influence: 0.35,
    };
    const url = 'https://api.elevenlabs.io/v1/sound-generation';
    const result = {
      provider: 'elevenlabs',
      benchmark: 'B-006',
      slug: item.slug,
      prompt: item.text,
      durationSeconds: item.duration_seconds,
      outputPath,
      request: {
        method: 'POST',
        url,
        headers: redactHeaders(headers),
        body,
      },
    };
    try {
      const generated = await requestBuffer(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }, `sfx ${item.slug}`);
      fs.writeFileSync(outputPath, generated.buffer);
      result.status = 'ok';
      result.durationMs = generated.durationMs;
      result.contentType = generated.response.headers.get('content-type');
      result.characterCost = generated.response.headers.get('character-cost') || generated.response.headers.get('x-character-cost');
      result.byteCount = generated.buffer.length;
    } catch (err) {
      result.status = 'error';
      result.error = err.message;
      result.durationMs = err.durationMs;
    }
    log.benchmarks.b006_sfx_pack.results.push(result);
    writeLog(log);
  }
  log.benchmarks.b006_sfx_pack.status = log.benchmarks.b006_sfx_pack.results.some((r) => r.status === 'ok') ? 'ok' : 'failed';

  const musicDocsStatus = {
    docsUrl: 'https://elevenlabs.io/docs/api-reference/music/compose',
    endpoint: 'https://api.elevenlabs.io/v1/music',
    accountSurfaceCheck: 'attempt one short request only; access errors mark backlog',
  };
  log.benchmarks.b007_music.docsStatus = musicDocsStatus;
  writeLog(log);

  for (const item of MUSIC_PROMPTS) {
    const filename = `B-007-music-${item.slug}.mp3`;
    const outputPath = path.join(OUT_DIR, filename);
    const body = {
      prompt: item.text,
      music_length_ms: item.duration_seconds * 1000,
    };
    const url = 'https://api.elevenlabs.io/v1/music';
    const result = {
      provider: 'elevenlabs',
      benchmark: 'B-007',
      slug: item.slug,
      prompt: item.text,
      durationSeconds: item.duration_seconds,
      outputPath,
      request: {
        method: 'POST',
        url,
        headers: redactHeaders(headers),
        body,
      },
    };
    try {
      const generated = await requestBuffer(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }, `music ${item.slug}`);
      fs.writeFileSync(outputPath, generated.buffer);
      result.status = 'ok';
      result.durationMs = generated.durationMs;
      result.contentType = generated.response.headers.get('content-type');
      result.characterCost = generated.response.headers.get('character-cost') || generated.response.headers.get('x-character-cost');
      result.byteCount = generated.buffer.length;
    } catch (err) {
      result.status = 'deferred';
      result.error = err.message;
      result.durationMs = err.durationMs;
      result.decision = 'Do not retry in this pass; mark Music API access/surface for backlog verification.';
    }
    log.benchmarks.b007_music.results.push(result);
    writeLog(log);
  }
  log.benchmarks.b007_music.status = log.benchmarks.b007_music.results.some((r) => r.status === 'ok') ? 'ok' : 'deferred';

  log.status = 'complete';
  writeLog(log);
  console.log(JSON.stringify({
    status: log.status,
    outputDir: OUT_DIR,
    logPath: LOG_PATH,
    voiceOutputs: log.benchmarks.b005_voice_candidates.results.filter((r) => r.status === 'ok').map((r) => r.outputPath),
    sfxOutputs: log.benchmarks.b006_sfx_pack.results.filter((r) => r.status === 'ok').map((r) => r.outputPath),
    musicOutputs: log.benchmarks.b007_music.results.filter((r) => r.status === 'ok').map((r) => r.outputPath),
  }, null, 2));
}

run().catch((err) => {
  ensureDir(OUT_DIR);
  const failure = {
    ranAt: new Date().toISOString(),
    provider: 'elevenlabs',
    status: 'fatal-error',
    error: err.stack || err.message,
  };
  fs.writeFileSync(LOG_PATH, JSON.stringify(failure, null, 2));
  console.error(err.stack || err.message);
  process.exit(1);
});
