# Faceless Video Generator

Turn a topic into a finished, captioned, vertical short — script, voiceover,
animated karaoke captions, Ken Burns backgrounds, and a FAMtastic brand chip —
rendered to MP4 by the shared Remotion engine.

This is FAMtastic's take on the
[SamurAIGPT AI-Faceless-Video-Generator](https://github.com/SamurAIGPT/AI-Faceless-Video-Generator).
That project animates a talking head with SadTalker (Python + GPU). We took the
*monetizable* interpretation instead: the captioned b-roll/voiceover format that
actually drives retention on Shorts/Reels/TikTok — and built it on the Remotion
engine we already own, so it runs anywhere Node runs (no GPU, no Python).

## Quick start

```bash
cd remotion

# 1. Generate a render-ready spec (works with ZERO API keys)
node bin/faceless.mjs "how compound interest builds wealth"

# 2. Render it to MP4 (needs `npm install` once)
npx remotion render FacelessVideo out/how-compound-interest-builds-wealth.mp4 \
  --props=out/how-compound-interest-builds-wealth.spec.json

# …or do both at once
node bin/faceless.mjs "best coffee in atlanta" --render
```

Open it live in the Remotion Studio to scrub/preview (uses the committed demo spec):

```bash
npm run dev      # then pick "FacelessVideo" in the sidebar
```

## Options

| Flag | Values | Default | Notes |
|------|--------|---------|-------|
| `--format` | `vertical`, `square`, `wide` | `vertical` | Sets dimensions (1080×1920 / 1080×1080 / 1920×1080) |
| `--scenes` | integer | `5` | Total scenes (hook + beats + CTA) |
| `--voice` | provider voice id | `alloy` / `Rachel` | OpenAI or ElevenLabs voice |
| `--accent` | hex | `#34d399` | Caption highlight + progress color |
| `--render` | — | off | Render the MP4 after generating the spec |

## API keys (all optional)

The generator **always produces a complete video**. Keys only upgrade quality:

| Env var | Effect when set |
|---------|-----------------|
| `OPENAI_API_KEY` | Real LLM-written script **and** voiceover (gpt-4o-mini + gpt-4o-mini-tts) |
| `ELEVENLABS_API_KEY` | Premium voiceover (used if no OpenAI key) |
| *(none)* | Templated script + estimated caption timing + silent track — still a watchable, renderable video |

When audio is synthesized, each scene's MP4 length is locked to the real clip
duration (parsed from the MP3 frames, no ffmpeg needed). Without audio, timing
comes from a per-word speaking-rate model (~150 wpm, length-weighted).

## Architecture

```
topic
  │
  ▼  src/pipeline/script.mjs   →  { title, scenes:[{text}] }      (OpenAI | template)
  ▼  src/pipeline/tts.mjs      →  + audioSrc, audioDurationMs     (OpenAI | ElevenLabs | none)
  ▼  src/pipeline/core.mjs     →  buildSpec()  → video-spec.json  (pure, deterministic)
  ▼  src/faceless/*.tsx        →  Remotion composition "FacelessVideo"
  ▼  remotion render           →  out/<slug>.mp4
```

- **`src/pipeline/core.mjs`** — pure, dependency-free, deterministic logic
  (slugify, word timing, emphasis detection, gradient palette, `buildSpec`).
  Fully unit-tested in `core.test.mjs` — no install/network/browser needed.
- **`src/pipeline/script.mjs`** — LLM script gen with a real (non-lorem) template fallback.
- **`src/pipeline/tts.mjs`** — OpenAI/ElevenLabs TTS + a built-in MP3 duration parser.
- **`src/pipeline/index.mjs`** — orchestrator; writes `out/<slug>.spec.json` and `public/faceless/<slug>/*.mp3`.
- **`src/faceless/FacelessVideo.tsx`** — the composition. `calculateMetadata` reads
  duration + dimensions from the spec, so one composition renders any length/format.
- **`src/faceless/Scene.tsx`** — background (Ken Burns image or animated gradient) + scrim + captions + audio.
- **`src/faceless/Captions.tsx`** — word-by-word "karaoke" captions with accent highlighting.

The spec (`video-spec.json`) is the contract between the Node pipeline and the
React renderer — `facelessSchema` (zod) in `src/faceless/schema.ts` mirrors what
`buildSpec()` emits.

## Tests

```bash
npm test          # node --test src/pipeline/core.test.mjs   (13 tests, no deps)
```

## Batch / programmatic use

```js
import { generateVideoSpec } from "./src/pipeline/index.mjs";
const { spec, specPath } = await generateVideoSpec("topic", { format: "vertical", scenes: 6 });
// render specPath with @remotion/renderer or the CLI
```

This is how `media-studio` (batch social variants) and `site-studio` (per-client
promo videos) are meant to consume it — call the pipeline, render the spec.
