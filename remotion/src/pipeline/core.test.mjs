// Pipeline logic tests — run with: node --test src/pipeline/
// No install, no network, no browser required.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  slugify,
  wordDurationMs,
  isEmphasis,
  timeWords,
  msToFrames,
  gradientForIndex,
  buildSpec,
  FORMATS,
} from "./core.mjs";
import { templateScript } from "./script.mjs";
import { estimateMp3DurationMs } from "./tts.mjs";

test("slugify produces url-safe slugs and never empty", () => {
  assert.equal(slugify("How Compound Interest Works!"), "how-compound-interest-works");
  assert.equal(slugify("  multiple   spaces  "), "multiple-spaces");
  assert.equal(slugify("!!!"), "faceless-video");
});

test("wordDurationMs is clamped and longer words take longer", () => {
  const short = wordDurationMs("a");
  const long = wordDurationMs("extraordinary");
  assert.ok(short >= 240, "respects floor");
  assert.ok(long > short, "longer word = longer duration");
  assert.ok(wordDurationMs("supercalifragilistic") <= 900 + 320, "respects ceiling + punct");
});

test("punctuation adds a pause", () => {
  assert.ok(wordDurationMs("end.") > wordDurationMs("end"));
});

test("isEmphasis flags numbers, long words, and ALLCAPS", () => {
  assert.equal(isEmphasis("30"), true);
  assert.equal(isEmphasis("compound"), true);
  assert.equal(isEmphasis("NASA"), true);
  assert.equal(isEmphasis("the"), false);
  assert.equal(isEmphasis("cat"), false);
});

test("timeWords produces monotonic non-overlapping timing", () => {
  const { words, sceneMs } = timeWords("Stop overthinking this right now.");
  assert.equal(words.length, 5);
  for (let i = 1; i < words.length; i++) {
    assert.equal(words[i].startMs, words[i - 1].endMs, "no gaps/overlaps");
    assert.ok(words[i].endMs > words[i].startMs);
  }
  assert.ok(sceneMs > words[words.length - 1].endMs, "scene includes a tail");
  assert.ok(words[0].startMs > 0, "scene has a lead-in");
});

test("msToFrames never returns zero", () => {
  assert.equal(msToFrames(0, 30), 1);
  assert.equal(msToFrames(1000, 30), 30);
  assert.equal(msToFrames(500, 30), 15);
});

test("gradientForIndex wraps around the palette", () => {
  assert.deepEqual(gradientForIndex(0), gradientForIndex(6));
  assert.equal(gradientForIndex(2).length, 2);
});

test("templateScript yields hook + body + cta and embeds the topic", () => {
  const s = templateScript("learning guitar", 5);
  assert.equal(s.source, "template");
  assert.equal(s.scenes.length, 5);
  assert.equal(s.scenes[0].kind, "hook");
  assert.equal(s.scenes[s.scenes.length - 1].kind, "cta");
  assert.ok(s.scenes.some((sc) => /guitar/i.test(sc.text)));
});

test("buildSpec produces a valid, render-ready spec", () => {
  const script = templateScript("how compound interest works", 5);
  const spec = buildSpec(script, { format: "vertical", topic: "how compound interest works" });

  // dimensions match the format
  assert.equal(spec.meta.width, FORMATS.vertical.width);
  assert.equal(spec.meta.height, FORMATS.vertical.height);
  assert.equal(spec.meta.fps, 30);

  // total frames == sum of scene frames (Sequence layout depends on this)
  const sum = spec.scenes.reduce((a, s) => a + s.durationInFrames, 0);
  assert.equal(spec.totalDurationInFrames, sum);
  assert.ok(spec.totalDurationInFrames >= 1);

  // every scene has timed words and a background
  for (const sc of spec.scenes) {
    assert.ok(sc.words.length > 0);
    assert.ok(sc.durationInFrames >= 1);
    assert.ok(Array.isArray(sc.background.gradient));
  }
});

test("buildSpec falls back to vertical for unknown formats", () => {
  const spec = buildSpec(templateScript("x", 3), { format: "imax" });
  assert.equal(spec.meta.format, "vertical");
});

test("buildSpec prefers real audio duration when longer than estimate", () => {
  const script = {
    title: "t",
    scenes: [{ text: "short line", audioDurationMs: 60000, audioSrc: "a.mp3" }],
  };
  const spec = buildSpec(script, { format: "vertical" });
  // 60s at 30fps = 1800 frames — audio length wins over the ~1s estimate
  assert.equal(spec.scenes[0].durationInFrames, 1800);
  assert.equal(spec.voice.hasAudio, true);
});

test("estimateMp3DurationMs returns 0 on non-mp3 bytes (graceful)", () => {
  assert.equal(estimateMp3DurationMs(Buffer.from([0, 1, 2, 3])), 0);
});

test("estimateMp3DurationMs sums frames for a synthetic CBR stream", () => {
  // Build 10 valid 128kbps/44.1kHz MPEG-1 Layer III frames.
  // frameLen = floor(144000*128/44100) = 417 bytes; each frame = 26.12ms.
  const frame = Buffer.alloc(417);
  frame[0] = 0xff;
  frame[1] = 0xfb; // MPEG1 L3, no CRC
  frame[2] = 0x90; // bitrate idx 9 (128k), srate idx 0 (44.1k), no padding
  frame[3] = 0x00;
  const stream = Buffer.concat(Array.from({ length: 10 }, () => frame));
  const ms = estimateMp3DurationMs(stream);
  assert.ok(ms >= 255 && ms <= 267, `expected ~261ms, got ${ms}`);
});
