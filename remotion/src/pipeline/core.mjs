// Faceless video pipeline — pure logic, zero dependencies, zero network.
//
// Everything in this file is deterministic and runs under plain `node`
// with no install step. The network-bound pieces (LLM script generation,
// TTS) live in script.mjs / tts.mjs and degrade gracefully to the
// fallbacks here so the generator ALWAYS produces a valid video spec —
// even with no API keys, no GPU, and no internet.

export const FORMATS = {
  vertical: { width: 1080, height: 1920, label: "vertical (Shorts/Reels/TikTok)" },
  square: { width: 1080, height: 1080, label: "square (feed)" },
  wide: { width: 1920, height: 1080, label: "wide (YouTube/landscape)" },
};

export const DEFAULT_FPS = 30;

// Speaking-rate model. ~150 wpm is a natural narration pace. We vary per
// word by length so long words read slower — this is what keeps captions
// feeling synced even when there is no real audio track to measure.
const BASE_WORD_MS = 210;
const PER_CHAR_MS = 42;
const MIN_WORD_MS = 240;
const MAX_WORD_MS = 900;
const SCENE_LEAD_MS = 250; // breath before a scene's first word
const SCENE_TAIL_MS = 450; // hold after the last word

export function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "faceless-video";
}

export function wordDurationMs(word) {
  const chars = word.replace(/[^a-zA-Z0-9]/g, "").length;
  const ms = BASE_WORD_MS + chars * PER_CHAR_MS;
  // Trailing punctuation = a beat. Commas/periods get a pause.
  const punct = /[,;:]$/.test(word) ? 160 : /[.!?]$/.test(word) ? 320 : 0;
  return Math.min(MAX_WORD_MS, Math.max(MIN_WORD_MS, ms)) + punct;
}

// Words longer than 6 chars, ALLCAPS tokens, or numbers get emphasized
// (scaled + accent-colored) in the caption renderer.
export function isEmphasis(word) {
  const clean = word.replace(/[^a-zA-Z0-9]/g, "");
  if (!clean) return false;
  if (/^\d/.test(clean)) return true; // numbers / stats pop
  if (clean.length >= 7) return true;
  if (clean.length >= 3 && clean === clean.toUpperCase()) return true;
  return false;
}

// Turn a narration line into word-level timing relative to scene start.
export function timeWords(line) {
  const tokens = String(line).trim().split(/\s+/).filter(Boolean);
  let cursor = SCENE_LEAD_MS;
  const words = tokens.map((word) => {
    const dur = wordDurationMs(word);
    const startMs = cursor;
    const endMs = cursor + dur;
    cursor = endMs;
    return { word, startMs, endMs, emphasis: isEmphasis(word) };
  });
  const sceneMs = cursor + SCENE_TAIL_MS;
  return { words, sceneMs };
}

export function msToFrames(ms, fps = DEFAULT_FPS) {
  return Math.max(1, Math.ceil((ms / 1000) * fps));
}

// A small rotating palette of gradient backgrounds so multi-scene videos
// don't look monotonous. Deterministic by scene index.
export const GRADIENTS = [
  ["#0f172a", "#1e3a8a"],
  ["#111827", "#065f46"],
  ["#1a0b2e", "#7c3aed"],
  ["#0c0a09", "#9a3412"],
  ["#082f49", "#0e7490"],
  ["#171717", "#be123c"],
];

export function gradientForIndex(i) {
  return GRADIENTS[i % GRADIENTS.length];
}

// Build the full video spec (= Remotion input props) from a script.
// `script` is { title, scenes: [{ text }] } and optional voice metadata.
export function buildSpec(script, opts = {}) {
  const format = FORMATS[opts.format] ? opts.format : "vertical";
  const fps = opts.fps || DEFAULT_FPS;
  const dims = FORMATS[format];
  const title = script.title || opts.topic || "Untitled";

  const scenes = (script.scenes || []).map((s, i) => {
    const { words, sceneMs } = timeWords(s.text);
    const audioMs = s.audioDurationMs || null;
    // If we have real audio for this scene, trust its length; otherwise
    // use the estimated narration length.
    const effectiveMs = audioMs && audioMs > sceneMs ? audioMs : sceneMs;
    return {
      id: `scene-${i + 1}`,
      text: s.text,
      kind: s.kind || (i === 0 ? "hook" : "body"),
      words,
      durationInFrames: msToFrames(effectiveMs, fps),
      durationMs: effectiveMs,
      background: {
        type: s.image ? "image" : "gradient",
        gradient: gradientForIndex(i),
        image: s.image || null,
        kenBurns: true,
        kenBurnsSeed: i,
      },
      audioSrc: s.audioSrc || null,
    };
  });

  const totalDurationInFrames = scenes.reduce(
    (sum, s) => sum + s.durationInFrames,
    0,
  ) || fps; // never zero — Remotion requires >= 1 frame

  return {
    meta: {
      topic: opts.topic || title,
      title,
      slug: slugify(title),
      format,
      fps,
      width: dims.width,
      height: dims.height,
      createdAt: opts.now || new Date().toISOString(),
      sceneCount: scenes.length,
      estimatedSeconds: Math.round(totalDurationInFrames / fps),
    },
    voice: {
      provider: script.voiceProvider || "none",
      model: script.voiceModel || null,
      voice: script.voiceName || null,
      hasAudio: scenes.some((s) => s.audioSrc),
    },
    theme: {
      accent: opts.accent || "#34d399",
      fontFamily: opts.fontFamily || "Inter",
      ...opts.theme,
    },
    scenes,
    totalDurationInFrames,
  };
}
