// Text-to-speech. Synthesizes one audio file per scene into a public/
// asset dir and reports each clip's real duration so the spec can use
// actual audio length instead of estimated narration timing.
//
// Providers, in order of preference if keys exist:
//   - OpenAI TTS  (OPENAI_API_KEY)        -> mp3
//   - ElevenLabs  (ELEVENLABS_API_KEY)    -> mp3
// With no key, returns scenes unchanged (silent video, estimated timing).
//
// Audio duration is read from the mp3 itself (no ffmpeg needed) via a
// tiny MP3 frame parser so the video length matches the voiceover.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export async function synthesizeVoiceover(script, opts = {}) {
  const outDir = opts.audioDir;
  const publicPrefix = opts.publicPrefix || "audio";
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasEleven = !!process.env.ELEVENLABS_API_KEY;
  if (!hasOpenAI && !hasEleven) {
    return { ...script, voiceProvider: "none" };
  }
  if (outDir) await mkdir(outDir, { recursive: true });

  const provider = hasOpenAI ? "openai" : "elevenlabs";
  const voiceName = opts.voice || (hasOpenAI ? "alloy" : "Rachel");
  const scenes = [];
  for (let i = 0; i < script.scenes.length; i++) {
    const s = script.scenes[i];
    try {
      const buf =
        provider === "openai"
          ? await openaiTTS(s.text, voiceName)
          : await elevenTTS(s.text, voiceName);
      const file = `${publicPrefix}-${i + 1}.mp3`;
      if (outDir) await writeFile(path.join(outDir, file), buf);
      scenes.push({
        ...s,
        audioSrc: file,
        audioDurationMs: estimateMp3DurationMs(buf),
      });
    } catch (err) {
      console.error(`[tts] scene ${i + 1} failed (${err.message}); silent.`);
      scenes.push(s);
    }
  }
  return {
    ...script,
    scenes,
    voiceProvider: provider,
    voiceModel: provider === "openai" ? "gpt-4o-mini-tts" : "eleven_turbo_v2_5",
    voiceName,
  };
}

async function openaiTTS(text, voice) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice,
      input: text,
      response_format: "mp3",
    }),
  });
  if (!res.ok) throw new Error(`OpenAI TTS HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function elevenTTS(text, voiceId) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
      }),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Estimate an MP3's duration by summing decoded frame durations. Handles
// CBR and VBR without external tools. Returns milliseconds.
export function estimateMp3DurationMs(buf) {
  const BITRATES = [
    0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
  ];
  const SRATES = [44100, 48000, 32000, 0];
  let i = 0;
  let totalMs = 0;
  // Skip ID3v2 tag if present.
  if (buf.length > 10 && buf.toString("ascii", 0, 3) === "ID3") {
    const size =
      ((buf[6] & 0x7f) << 21) |
      ((buf[7] & 0x7f) << 14) |
      ((buf[8] & 0x7f) << 7) |
      (buf[9] & 0x7f);
    i = 10 + size;
  }
  while (i < buf.length - 4) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) {
      i++;
      continue;
    }
    const brIdx = (buf[i + 2] & 0xf0) >> 4;
    const srIdx = (buf[i + 2] & 0x0c) >> 2;
    const bitrate = BITRATES[brIdx];
    const srate = SRATES[srIdx];
    if (!bitrate || !srate) {
      i++;
      continue;
    }
    const padding = (buf[i + 2] & 0x02) >> 1;
    const frameLen = Math.floor((144000 * bitrate) / srate) + padding;
    if (frameLen <= 0) {
      i++;
      continue;
    }
    totalMs += (1152 / srate) * 1000; // samples-per-frame / sample-rate
    i += frameLen;
  }
  return Math.round(totalMs) || 0;
}
