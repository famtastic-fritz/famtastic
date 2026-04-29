# Media Generation Capabilities

Status: Active operating rule after Block 2 benchmarks
Updated: 2026-04-29
Scope: FAMtastic Site Studio media routing for the 60-site factory

## Evidence Tiers

- VALIDATED: Tested in this codebase, output reviewed, pass/fail recorded. A local asset or run log is cited.
- DOCS-CONFIRMED-UNTESTED: Provider official docs describe the capability, but it has not been tested on this account.
- AUTH-MISSING: Capability exists per docs, but credentials, billing, or org-tier access are missing locally.
- FAILED: Tested and did not meet pass criteria. A failed asset or run log is cited.
- NOT-RECOMMENDED: Deprecated, tier-gated, strategically dispreferred, or wrong for this use case.

## Credential Audit

Present in local env files:

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `LEONARDO_API_KEY`
- `FAL_API_KEY`
- `ELEVENLABS_API_KEY`
- `ANTHROPIC_API_KEY`
- `PINECONE_API_KEY`
- `PERPLEXITY_API_KEY`

Not found in local env files:

- `RUNWAYML_API_SECRET`
- `SUNO_API_KEY`
- Vertex AI project/service-account configuration
- Adobe Firefly API key

## UI Text Rules

Provider names must not appear in user-facing generation status strings. UI copy should describe the task, not the provider, for example "Generating character poses..." instead of "Generating character poses via OpenAI Responses." Provider routing belongs in this document and internal config so future routing changes do not create UI text drift.

## Use-Case Routing

### 1. Single Character Pose, Transparent PNG

Definition: Generate one mascot/character pose, isolated on transparent alpha, suitable for chatbot or site overlay. Example: Hi-Tide Harry waving or giving a thumbs up.

Best provider: OpenAI Responses API with `image_generation` tool, using approved production pose reference as input image.

Exact API path: `POST https://api.openai.com/v1/files` for reference upload, then `POST https://api.openai.com/v1/responses` with `tools: [{ "type": "image_generation", "action": "edit", "background": "transparent", "output_format": "png" }]`.

Evidence tier: VALIDATED.

Reference test assets:

- `sites/site-mbsh-reunion/assets/mascot/test-codex/01-wave-hello-OPENAI-RESPONSES.png`
- `sites/site-mbsh-reunion/assets/mascot/test-codex/02-thumbs-up-from-wave-ref-OPENAI.png`
- `sites/site-mbsh-reunion/assets/mascot/test-codex/11-jumping-from-wave-ref-OPENAI.png`
- `sites/site-mbsh-reunion/assets/mascot/test-codex/test-run.json`
- `sites/site-mbsh-reunion/assets/mascot/test-codex/pose-generation-from-wave-ref.json`

Known failure modes: Bad anchor image causes drift; early canonical concept was weaker than approved production pose. Text on shirt/wordmark can garble. Some viewers render transparent PNG on dark canvas, making alpha look like a background unless inspected.

Cost per output: Prior run estimated about `$0.12` for medium 1024 square with reference input; exact billing was not returned by script.

Generation time: Prior OpenAI pose runs ranged about 34-53 seconds.

Output format and size: PNG, 1024x1024, transparent alpha supported and validated.

Transparent output: Supported.

Backup provider: Background-removal post-process for non-transparent still outputs, but not preferred for character identity generation.

Not recommended: Leonardo Phoenix 1.0 Character Reference 397 for this character. It failed identity/style on reviewed tests.

Official docs: https://platform.openai.com/docs/guides/images/image-generation

### 2. Multi-Pose Character Set, Identity-Locked

Definition: Generate 10-25 consistent poses from one approved character anchor. Example: full Hi-Tide Harry chatbot pose library.

Best provider: OpenAI Responses API with `image_generation` tool, one approved production pose reference per generation.

Exact API path: same as use case 1.

Evidence tier: VALIDATED.

Evidence note: Validated for selected programmatic poses and manual production set; full 25-pose automated set remains partially untested.

Reference test assets:

- Production approved manual poses: `sites/site-mbsh-reunion/assets/mascot/poses/`
- Programmatic OpenAI reference-pose outputs: `sites/site-mbsh-reunion/assets/mascot/test-codex/02-thumbs-up-from-wave-ref-OPENAI.png`, `sites/site-mbsh-reunion/assets/mascot/test-codex/11-jumping-from-wave-ref-OPENAI.png`

Known failure modes: Identity holds better when the reference is an approved production pose, not an early concept reference. Wordmarks remain unreliable. Do not depend on generated raster text for exact brand marks.

Cost per output: Prior estimate about `$0.12` each at medium 1024 square. A 25-pose run would likely be low single-digit dollars, but exact OpenAI billing should be measured in the benchmark log.

Generation time: About 35-55 seconds per pose in prior tests.

Output format and size: PNG, 1024x1024, transparent alpha supported.

Transparent output: Supported.

Backup provider: None validated. Use manual ChatGPT generation for flagship/high-touch cases if OpenAI API quality regresses.

Failed provider: Leonardo Phoenix 1.0 with Character Reference 397. Failed on identity, 2D style, and exact outfit details.

Official docs: https://platform.openai.com/docs/guides/images/image-generation

### 3. Hero Still - Landscape/Environment, No Character

Definition: High-quality still hero background for a site section, no foreground character. Example: rebuilt coastal high school exterior at golden hour.

Best provider: Google Imagen 4 is current best-known route from prior product/media tests.

Exact API path: Gemini API `POST https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict` or SDK `client.models.generate_images`.

Evidence tier: VALIDATED.

Evidence note: Validated for product/hero still quality, with OpenAI Responses also validated as a strong hero still fallback in the branded-scene benchmark.

Reference test assets:

- `tests/media/google/shoe-1.png` through `tests/media/google/shoe-4.png`
- `tests/media/google/maria-hero-still.png`
- `tests/media/three-provider-comparison.json`

Known failure modes: Safety filters can block person/cultural prompts. Prompt consistency is not true style locking. All generated images include SynthID watermark per Google docs.

Aspect-ratio constraint: Imagen 4 supports `1:1`, `9:16`, `16:9`, `4:3`, and `3:4`. It does not support `3:2` or arbitrary ratios. OpenAI Responses landscape output used in the benchmark is `3:2` (`1536x1024`). Plan aspect ratio explicitly per provider when running comparisons.

Cost per output: Prior local test recorded about `$0.004/image` for Imagen 4.

Generation time: Prior local average about 7.2 seconds.

Output format and size: PNG in local outputs; Imagen supports aspect ratios including 16:9 and 1K/2K depending on model variant.

Transparent output: Not primary route. Use background removal only if isolating a subject.

Backup provider: OpenAI Responses API or Image API with GPT Image for branded hero scenes.

Official docs: https://ai.google.dev/gemini-api/docs/imagen

### 4. Hero Still - Branded Scene With Implied Story

Definition: A still scene with emotional/narrative resonance but no character dependency. Example: yearbook pages, school colors, reunion nostalgia, overlay-safe composition.

Best provider: OpenAI Responses API and Google Imagen 4 are both validated routing options. Select per site based on prompt specifics, aspect ratio needs, and stylistic fit.

Exact API path: Google Imagen 4 via Gemini API; OpenAI Responses API with `image_generation` tool.

Evidence tier: VALIDATED.

Evidence note: OpenAI Responses and Imagen 4 both produced hero-quality branded-scene stills. Final site asset selection is a planning/design decision, not a benchmark decision.

Reference test assets:

- Leonardo start frames used for motion loops: `sites/site-mbsh-reunion/assets/background-tests/leonardo-motion/*-start.jpg`
- Google hero still: `tests/media/google/maria-hero-still.png`
- OpenAI benchmark hero still: `docs/operating-rules/benchmark-runs/images/B-001-OPENAI-yearbook-hero.png`
- Imagen 4 benchmark hero still: `docs/operating-rules/benchmark-runs/images/B-002-IMAGEN-yearbook-hero.png`
- Image benchmark log: `docs/operating-rules/benchmark-runs/images/image-benchmarks-run-log.json`

Known failure modes: Raster text/logos are unreliable. Avoid asking image models to render exact school names, dates, or wordmarks. Generate clean safe zones for HTML overlay.

Aspect-ratio constraint: Imagen 4 supports `1:1`, `9:16`, `16:9`, `4:3`, and `3:4`. It does not support `3:2` or arbitrary ratios. OpenAI Responses landscape output used in the benchmark is `3:2` (`1536x1024`). Plan aspect ratio explicitly per provider when running comparisons.

Cost per output: Google prior about `$0.004/image`; OpenAI benchmark estimate about `$0.07/image`.

Generation time: Imagen benchmark about 14.3 seconds; OpenAI benchmark about 36 seconds.

Output format and size: JPEG/PNG depending provider.

Transparent output: Not required.

Backup provider: Leonardo Phoenix 1.0 can produce strong cinematic start frames for motion workflows, but prior stills were more CGI/coherence-variable than Google.

Official docs: https://ai.google.dev/gemini-api/docs/imagen and https://platform.openai.com/docs/guides/images/image-generation

### 5. Atmospheric Background Loop (5-10s)

Definition: Short muted motion background for a hero section. Example: yearbook pages flipping, VHS shimmer, dancefloor confetti, red/silver energy loop.

Best provider: Leonardo image-to-video using Phoenix start frame plus `generations-image-to-video`.

Exact API path: `POST https://cloud.leonardo.ai/api/rest/v1/generations` for start frame, then `POST https://cloud.leonardo.ai/api/rest/v1/generations-image-to-video`.

Evidence tier: VALIDATED.

Reference test assets:

- `sites/site-mbsh-reunion/assets/background-tests/leonardo-motion/01-yearbook-pages.mp4`
- `sites/site-mbsh-reunion/assets/background-tests/leonardo-motion/02-rebuilt-school-push-in.mp4`
- `sites/site-mbsh-reunion/assets/background-tests/leonardo-motion/03-vhs-to-modern-transition.mp4`
- `sites/site-mbsh-reunion/assets/background-tests/leonardo-motion/04-red-silver-mascot-energy.mp4`
- `sites/site-mbsh-reunion/assets/background-tests/leonardo-motion/05-dancefloor-confetti.mp4`
- `sites/site-mbsh-reunion/assets/background-tests/leonardo-motion/run-log.json`

Known failure modes: Can invent artifacts if prompt asks for readable text/logos/people. Generated clips are background ambience, not precise editorial storytelling.

Cost per output: Prior run log recorded Leonardo motion cost around `$0.1047` for one video generation; still generation cost not always present in the log.

Generation time: Prior run generated usable clips in minutes across the batch; exact per-clip timing should be captured in future benchmark logs.

Output format and size: MP4, prior files about 3.3-4.2 MB at preview 480 resolution.

Transparent output: Not applicable.

Backup provider: Google Veo 2/Veo 3. Needs controlled benchmark against Leonardo for atmospheric loops.

Official docs: https://docs.leonardo.ai/reference/createimagetovideogeneration

### 6. Cinematic Narrative Video Clip (3-8s, Intentional Camera Move)

Definition: Short clip with purposeful camera direction, not just ambient loop. Example: slow dolly through a hallway toward a glowing yearbook display.

Best provider: Google Veo 3 is docs-confirmed for high-fidelity 8-second videos with cinematic prompts; Veo 2 has related local hero-video validation.

Exact API path: Gemini API/Google video generation for Veo models; existing local route uses `scripts/google-media-generate` for Veo 2.

Evidence tier: DOCS-CONFIRMED-UNTESTED.

Evidence note: Veo 3 is untested on this account. Veo 2 has related validated hero-video evidence, but not enough to settle atmospheric loop routing.

Reference test assets:

- `tests/media/google/maria-hero.mp4`
- `tests/media/three-provider-comparison.json`
- `tests/automation/logs/veo-video-hero-test.json`

Known failure modes: Safety filters can block demographic/person prompts. Videos should avoid exact text generation. Prompt should carry motion only when still frame carries sensitive visual representation.

Cost per output: Prior local Veo 2 estimate about `$0.05`; current Veo 3 cost must be checked at runtime.

Generation time: Prior Veo 2 run about 33 seconds for 5 seconds.

Output format and size: MP4; prior local output about 1.6 MB.

Transparent output: Not applicable.

Backup provider: Leonardo image-to-video for atmospheric/narrative-lite clips. Runway is a strong docs-confirmed candidate but auth is missing.

Official docs: https://ai.google.dev/gemini-api/docs/video

### 7. Multi-Shot Stitched Video (15-90s, Editorial Pacing)

Definition: Multiple clips cut together with pacing, overlays, transitions, and possibly audio. Example: 30-second reunion hype reel.

Best provider: Site Studio should generate component clips with Veo/Leonardo, then assemble with ffmpeg/Premiere rather than expecting one model to produce the whole edited sequence.

Exact API path: Existing local promo pipeline uses Veo clips plus ffmpeg concat/crossfade/drawtext. Premiere MCP is unvalidated.

Evidence tier: DOCS-CONFIRMED-UNTESTED.

Evidence note: Local code exists, but this use case has not been benchmark-reviewed as a finished product output.

Reference test assets: None validated for 15-90 second finished product in this pass.

Known failure modes: Burned-in AI text is unreliable. Multi-shot continuity and music timing require an explicit editor layer. Do not route this to a single video model call.

Cost per output: Depends on number of clips and audio. Needs benchmark.

Generation time: Multiple minutes minimum.

Output format and size: MP4 final.

Transparent output: Not applicable.

Backup provider: Runway video APIs are docs-confirmed, but auth missing. Adobe Premiere via MCP is a post-production candidate, not validated.

Official docs: https://docs.dev.runwayml.com/api and https://ai.google.dev/gemini-api/docs/video

### 8. Character-In-Motion Video (Identity Preserved)

Definition: Animate a character across frames while preserving identity. Example: Hi-Tide Harry waving or dancing in a short clip.

Best provider: No validated winner yet.

Evidence tier: DOCS-CONFIRMED-UNTESTED.

Evidence note: Runway character/performance APIs are untested due missing auth. Leonardo Phoenix Character Reference is not recommended based on still-pose failure.

Reference test assets: None passed.

Known failure modes: Identity drift, 3D/Pixar drift, cape/outfit loss, wordmark corruption, no transparent video output. Character motion should not be assumed from still-pose success.

Cost per output: Unknown until benchmark.

Generation time: Unknown until benchmark.

Output format and size: MP4 likely.

Transparent output: Usually not available from video generation; compositing should use transparent PNG character over video background unless animation is essential.

Backup provider: Runway Act Two / character performance is backlog due missing `RUNWAYML_API_SECRET`.

Official docs: https://docs.dev.runwayml.com/api

### 9. Style-Consistent Batch Stills

Definition: Generate a coherent batch of 8-12 stills sharing a treatment. Example: 1996 yearbook treatment across alumni portraits, hallway shots, and sports photos.

Best provider: fal.ai FLUX Kontext for style variation where the input scene/identity must remain recognizable.

Exact API path: fal.ai FLUX Kontext endpoints, e.g. `fal-ai/flux-pro/kontext` or `fal-ai/flux-kontext-lora`.

Evidence tier: VALIDATED.

Evidence note: fal.ai FLUX Kontext preserved the non-character reference scene while applying a coherent 1996 yearbook treatment across three variations.

Reference test assets:

- `docs/operating-rules/benchmark-runs/images/B-004-FAL-Kontext-01-warm-yearbook-print.png`
- `docs/operating-rules/benchmark-runs/images/B-004-FAL-Kontext-02-flashback-vhs-yearbook.png`
- `docs/operating-rules/benchmark-runs/images/B-004-FAL-Kontext-03-archival-school-memory.png`
- `docs/operating-rules/benchmark-runs/images/image-benchmarks-run-log.json`

Known failure modes: Style transfer may preserve style but not person/character identity. If identity shifts, route to style backgrounds only, not portraits or mascots.

Cost per output: benchmark estimate about `$0.04/image` for FLUX Kontext.

Generation time: benchmark runs took about 11-13 seconds per image.

Output format and size: JPEG/PNG depending endpoint.

Transparent output: Not primary.

Backup provider: Adobe Firefly web style reference is strong but not automation-safe. Google/Imagen prompt consistency is acceptable but not true style locking.

Official docs: https://fal.ai/models/fal-ai/flux-pro/kontext/api and https://fal.ai/models/fal-ai/flux-kontext-lora/api

### 10. Animated Logo / Motion Graphic / Lower-Third

Definition: Motion identity elements, lower-thirds, animated title cards, and transition graphics. Example: "30 Years / 100 Years" animated red/silver lower-third.

Best provider: Manual/vector/HTML/CSS/After Effects-style composition first; do not rely on generative video for exact text.

Evidence tier: NOT-RECOMMENDED.

Evidence note: AI-generated exact typography is not recommended. Runway/Adobe/Premiere motion routes are untested and belong in backlog.

Reference test assets: None validated.

Known failure modes: AI video/text models garble exact names, dates, and wordmarks. Use generated video as background only; overlay exact text in HTML/CSS or editor layer.

Cost per output: Depends on editor path.

Generation time: Depends on editor path.

Output format and size: SVG/CSS/Lottie/MP4 depending route.

Transparent output: Best achieved with SVG/CSS/Lottie or alpha-capable editor export, not generic video generation.

Backup provider: Premiere via adb-mcp or Runway for background motion only.

Official docs: https://docs.dev.runwayml.com/api

### 11. Sound Effect / Ambient Audio

Definition: Short generated SFX or ambience layers. Example: VHS tape hiss, vinyl crackle, distant arena cheer, locker slam, 90s answering machine.

Best provider: ElevenLabs Sound Effects.

Exact API path: `POST https://api.elevenlabs.io/v1/sound-generation`.

Evidence tier: VALIDATED.

Evidence note: ElevenLabs Sound Effects generated all five short VHS/reunion ambience assets successfully. Per-site SFX selection is downstream.

Reference test assets:

- `docs/operating-rules/benchmark-runs/audio/B-006-sfx-vhs-tape-hiss.mp3`
- `docs/operating-rules/benchmark-runs/audio/B-006-sfx-vinyl-crackle.mp3`
- `docs/operating-rules/benchmark-runs/audio/B-006-sfx-distant-gym-cheer.mp3`
- `docs/operating-rules/benchmark-runs/audio/B-006-sfx-locker-slam.mp3`
- `docs/operating-rules/benchmark-runs/audio/B-006-sfx-answering-machine.mp3`
- `docs/operating-rules/benchmark-runs/audio/audio-benchmarks-run-log.json`

Known failure modes: Overly literal prompts can create foreground sounds instead of subtle ambience. Duration/looping must be specified for background use.

Cost per output: ElevenLabs docs state 40 credits per second when duration is specified.

Generation time: benchmark runs took about 1.6-2.2 seconds per SFX.

Output format and size: MP3 by default; WAV/PCM availability depends on output format and plan.

Transparent output: Not applicable.

Backup provider: Runway audio APIs are docs-confirmed but auth missing.

Official docs: https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert

### 12. Original Instrumental Music

Definition: Short instrumental bed for hero or promo video. Example: 90s East Coast boom-bap instrumental with dusty piano and vinyl crackle.

Best provider: ElevenLabs Music.

Exact API path: `POST https://api.elevenlabs.io/v1/music`.

Evidence tier: VALIDATED.

Evidence note: ElevenLabs Music API access verified and produced one 20-second 90s-inspired instrumental bed. Per-site music selection is downstream.

Reference test assets:

- `docs/operating-rules/benchmark-runs/audio/B-007-music-east-coast-boombap-reunion-bed.mp3`
- `docs/operating-rules/benchmark-runs/audio/audio-benchmarks-run-log.json`

Known failure modes: Copyright-sensitive prompts must avoid artist names, song names, and recognizable lyrics. Site background audio should be opt-in/muted by default for UX.

Cost per output: ElevenLabs docs say music cost is based on generated duration and plan; exact cost must be recorded from response/account metadata if exposed.

Generation time: benchmark run took about 9.2 seconds.

Output format and size: MP3/PCM/Opus depending output format and plan.

Transparent output: Not applicable.

Backup provider: Suno is backlog due missing credentials.

Official docs: https://elevenlabs.io/docs/api-reference/music/compose and https://elevenlabs.io/docs/cookbooks/music

### 13. Voice / Narration

Definition: Text-to-speech for site assistant personas, narration, or short promo voiceover. Example: friendly Harry mascot line for chatbot greeting.

Best provider: ElevenLabs Text to Speech.

Exact API path: `POST https://api.elevenlabs.io/v1/text-to-speech/:voice_id`.

Evidence tier: VALIDATED.

Evidence note: ElevenLabs TTS generated five Harry persona voice candidates successfully. Fritz/persona selection is downstream.

Reference test assets:

- `docs/operating-rules/benchmark-runs/audio/B-005-harry-voice-01-roger-laid-back-casual-resonant.mp3`
- `docs/operating-rules/benchmark-runs/audio/B-005-harry-voice-02-sarah-mature-reassuring-confident.mp3`
- `docs/operating-rules/benchmark-runs/audio/B-005-harry-voice-03-laura-enthusiast-quirky-attitude.mp3`
- `docs/operating-rules/benchmark-runs/audio/B-005-harry-voice-04-charlie-deep-confident-energetic.mp3`
- `docs/operating-rules/benchmark-runs/audio/B-005-harry-voice-05-george-warm-captivating-storyteller.mp3`
- `docs/operating-rules/benchmark-runs/audio/audio-benchmarks-run-log.json`

Known failure modes: Voice choice can feel off-brand. Avoid auto-playing voice in website UI. Store approved voice IDs per brand/persona.

Cost per output: ElevenLabs bills by character/credits; response headers expose character cost.

Generation time: benchmark runs took about 1.1-1.6 seconds per voice sample.

Output format and size: MP3 default; PCM/WAV on higher plan tiers.

Transparent output: Not applicable.

Backup provider: Runway audio/voice APIs are docs-confirmed but auth missing.

Official docs: https://elevenlabs.io/docs/api-reference/text-to-speech

### 14. Voice Cloning

Definition: Create a reusable voice from authorized voice samples. Example: permissioned testimonial voice or branded character voice.

Best provider: ElevenLabs IVC voice clone, only with explicit permission and source audio rights.

Exact API path: `POST https://api.elevenlabs.io/v1/voices/add`.

Evidence tier: DOCS-CONFIRMED-UNTESTED.

Reference test assets: None.

Known failure modes: Legal/consent risk is higher than technical risk. Must require written permission and audit trail before any cloning.

Cost per output: Plan/account dependent; not benchmarked.

Generation time: Unknown.

Output format and size: Creates a voice ID, not a media asset.

Transparent output: Not applicable.

Backup provider: None recommended without explicit consent workflow.

Official docs: https://elevenlabs.io/docs/api-reference/add-voice

### 15. Background Removal / Asset Isolation

Definition: Remove background from a generated or uploaded still to create transparent overlay asset. Example: isolate a non-transparent mascot output.

Best provider: Local rembg route already wired in Studio.

Exact API path: `POST /api/remove-background`, backed by `scripts/rembg-worker.py`.

Evidence tier: VALIDATED.

Evidence note: Validated in repo history, but not part of this Block 1 benchmark.

Reference test assets:

- `SITE-LEARNINGS.md` notes prior closure of white-background image issue through remove-background route.
- Studio route and worker exist locally.

Known failure modes: Hair/cape edges can degrade. Does not fix identity drift. Use as post-processing, not as a substitute for a correct character provider.

Cost per output: Local compute only.

Generation time: Depends on image size/local machine.

Output format and size: PNG with alpha.

Transparent output: Supported.

Backup provider: Photoshop via adb-mcp if manual/advanced cleanup is required; not validated for automated factory flow.

Official docs: N/A for local route.

### 16. Upscaling (Still and Video)

Definition: Increase image or video resolution for production delivery. Example: upscale a 1024 mascot or 480p background loop for final site use.

Best provider: Not selected yet.

Evidence tier: DOCS-CONFIRMED-UNTESTED.

Evidence note: Google Imagen upscale on Vertex AI and Adobe Firefly/Photoshop web are docs-confirmed but untested. Adobe API auth is missing.

Reference test assets: None validated in this pass.

Known failure modes: Upscaling can sharpen artifacts, fake text, and edge mistakes. Character assets should be generated at usable size first when possible.

Cost per output: Provider dependent.

Generation time: Unknown.

Output format and size: PNG/JPEG/MP4 depending provider.

Transparent output: Must be tested. Do not assume alpha survives upscale unless verified.

Backup provider: Local image tooling for simple resizing; not true AI upscaling.

Official docs: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/overview

### 17. Photo Restoration

Definition: Repair, clean, color-correct, or reconstruct damaged/low-quality images. Example: restore scanned 1996 yearbook photos or faded reunion-era snapshots before using them in a site gallery.

Best provider: Adobe Photoshop via Creative Cloud desktop workflow; automate through adb-mcp only after UXP/plugin connection is verified.

Exact API path: No web API in current stack. Local automation path is `tools/adb-mcp/mcp/ps-mcp.py` plus Photoshop UXP plugin at `tools/adb-mcp/uxp/ps/manifest.json`.

Evidence tier: DOCS-CONFIRMED-UNTESTED.

Evidence note: Photoshop's restoration/cleanup tools are first-class finishing tools, but this repo has not yet validated automated Photoshop restoration through adb-mcp.

Reference test assets: None yet.

Known failure modes: Automation may fail if UXP plugin is not loaded, proxy is not running, or Photoshop is not open. Generative restoration can invent details; production use needs before/after review.

Cost per output: `$0` marginal cost on Fritz's paid Creative Cloud subscription; uses generative credits where Adobe features require them.

Generation time: Unknown until benchmark.

Output format and size: PSD/PNG/JPEG depending export.

Transparent output: Not primary.

Backup provider: Manual Photoshop. Do not route restoration to general image generation unless the goal is reinterpretation, not restoration.

Official docs: https://www.adobe.com/products/photoshop/generative-fill and https://developer.adobe.com/photoshop/uxp/

### 18. Generative Fill / Aspect Extension

Definition: Extend, fill, or repair the edges of an existing asset while preserving the core composition. Example: extend a square or 4:3 hero still to 16:9 without regenerating the whole image.

Best provider: Adobe Photoshop Generative Expand / Generative Fill.

Exact API path: Local automation candidate is adb-mcp Photoshop UXP; manual fallback is Photoshop desktop.

Evidence tier: DOCS-CONFIRMED-UNTESTED.

Evidence note: Adobe official docs confirm Generative Fill and Generative Expand in Photoshop. Local automation has not been validated.

Reference test assets: None yet.

Known failure modes: Edge extension may invent distracting objects, text-like artifacts, or inconsistent perspective. It is a finishing tool, not a replacement for correct hero composition.

Cost per output: `$0` marginal subscription cost; may consume Creative Cloud generative credits.

Generation time: Unknown until benchmark.

Output format and size: PSD/PNG/JPEG depending export.

Transparent output: Possible for Photoshop documents/layers, but alpha preservation must be verified per workflow.

Backup provider: Regenerate the hero still at correct aspect ratio with Imagen/OpenAI; use CSS crop when composition allows.

Official docs: https://www.adobe.com/learn/photoshop/web/expand-image-generative-fill and https://helpx.adobe.com/photoshop/using/generative-fill..html

### 19. Automated Batch Finishing

Definition: Apply repeatable finishing operations to many assets: resize, crop, sharpen, export web formats, preserve alpha, normalize filenames, and generate thumbnails/posters. Example: finish 25 mascot PNGs and 5 background videos for deploy.

Best provider: Adobe Photoshop via adb-mcp for image finishing once plugin status is verified; local scripts remain primary for simple deterministic transforms.

Exact API path: `tools/adb-mcp/mcp/ps-mcp.py` and Photoshop UXP plugin for Photoshop operations; local Node/Python scripts for deterministic compression/renaming.

Evidence tier: DOCS-CONFIRMED-UNTESTED.

Evidence note: Photoshop UXP supports plugin automation; local adb-mcp docs show installed MCP/proxy components but UXP plugins were not yet loaded into Adobe apps.

Reference test assets: None yet.

Known failure modes: GUI-app automation is more fragile than local scripts. Use Photoshop only where its edge quality/layer tooling beats deterministic scripts.

Cost per output: `$0` marginal subscription cost.

Generation time: Unknown until benchmark.

Output format and size: PNG/JPEG/WebP/PSD depending export.

Transparent output: Supported in Photoshop exports, but alpha preservation must be part of the benchmark.

Backup provider: Local deterministic scripts for resize/compress/poster extraction.

Official docs: https://developer.adobe.com/photoshop/uxp/ and https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/

### 20. Editorial Video Assembly With Proper Typography

Definition: Assemble generated clips, music, SFX, exact text, transitions, and brand typography into a finished promo or hero reel. Example: combine three Leonardo loops with a 90s music bed and exact "30 Years / 100 Years" typography.

Best provider: Adobe Premiere Pro via adb-mcp after UXP/plugin connection is verified; local ffmpeg remains backup for simple stitching.

Exact API path: `tools/adb-mcp/mcp/pr-mcp.py` and Premiere UXP plugin at `tools/adb-mcp/uxp/pr/manifest.json`.

Evidence tier: DOCS-CONFIRMED-UNTESTED.

Evidence note: Premiere UXP official docs confirm programmatic access to projects, sequences, clips, markers, effects, and export. Local adb-mcp workflow has not yet been validated end-to-end.

Reference test assets: None yet.

Known failure modes: Plugin/proxy connection failure, missing fonts, timeline export issues, audio sync drift, and weak typography if text is baked by generation instead of added as an editor layer.

Cost per output: `$0` marginal subscription cost.

Generation time: Unknown until benchmark.

Output format and size: MP4 final, plus project/sequence files if saved.

Transparent output: Not applicable for final video; alpha-capable intermediate exports need separate validation.

Backup provider: Existing ffmpeg promo pipeline for simple clip concat/crossfade/drawtext.

Official docs: https://developer.adobe.com/premiere-pro/uxp/ and https://developer.adobe.com/premiere-pro/uxp/ppro_reference/

## Provider Reference

### OpenAI

Credentialed: Yes, `OPENAI_API_KEY`.

Wired in repo: Partially. Existing adapters include Image API routes, but the validated character path uses Responses API image generation with input image file IDs.

Validated strengths: Character pose generation from approved production pose reference, transparent PNG output.

Validated failures/risks: `/v1/images/edits` previously returned an org-tier/model restriction. OpenAI can garble shirt text/wordmarks.

Official docs: https://platform.openai.com/docs/guides/images/image-generation

### Google AI Studio / Gemini / Imagen / Veo

Credentialed: Yes, `GEMINI_API_KEY`.

Wired in repo: Yes through `scripts/google-media-generate` and Studio media routes for Imagen/Veo paths.

Validated strengths: Imagen 4 product/hero stills; Veo 2 hero video from still.

Untested but docs-confirmed: Veo 3 through Gemini API; current account access must be checked before use.

Known caveat: Imagen 3 subject customization is Vertex AI-specific in official Google docs and needs Vertex project/service auth.

Official docs: https://ai.google.dev/gemini-api/docs/imagen, https://ai.google.dev/gemini-api/docs/video, https://cloud.google.com/vertex-ai/generative-ai/docs/image/subject-customization

### Leonardo

Credentialed: Yes, `LEONARDO_API_KEY`.

Wired in repo: Scripts and partial Studio capability registry; image-to-video is proven in scripts but not first-class Studio server route.

Validated strengths: Cinematic atmospheric background loops using Phoenix start frames and image-to-video.

Validated failures: Phoenix 1.0 Character Reference 397 failed to preserve Hi-Tide Harry identity/style. Lightning XL path was also weak for control/reference honoring.

Official docs: https://docs.leonardo.ai/docs/phoenix, https://docs.leonardo.ai/reference/createimagetovideogeneration

### fal.ai

Credentialed: Yes, `FAL_API_KEY`.

Wired in repo: Not confirmed as Studio route.

Docs-confirmed capabilities: FLUX text-to-image, FLUX Kontext image editing, FLUX Kontext LoRA, FLUX LoRA image-to-image.

Validated strength: Preserves a non-character reference scene while applying coherent style variation, based on the 1996 yearbook treatment benchmark.

Official docs: https://fal.ai/models/fal-ai/flux-pro/kontext/api, https://fal.ai/models/fal-ai/flux-kontext-lora/api

### ElevenLabs

Credentialed: Yes, `ELEVENLABS_API_KEY`.

Wired in repo: Not yet as Studio media route.

Validated capabilities on this account: Text-to-speech, sound effects, and music. Voice cloning remains docs-confirmed but untested.

Validated strengths: Harry persona voice candidates, VHS/arena/reunion SFX, and a 90s instrumental bed were generated successfully in Block 2.

Official docs: https://elevenlabs.io/docs/api-reference/text-to-speech, https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert, https://elevenlabs.io/docs/api-reference/music/compose, https://elevenlabs.io/docs/api-reference/add-voice

### Runway

Credentialed: No local key found.

Wired in repo: Not confirmed.

Docs-confirmed capabilities: Image-to-video, text-to-video, text/image-to-image with references, character performance, audio tools.

Recommended status: AUTH-MISSING backlog. Strong candidate for character-in-motion and video generation once key exists.

Official docs: https://docs.dev.runwayml.com/api and https://docs.dev.runwayml.com/guides/models

### Suno

Credentialed: No local key found.

Wired in repo: Not confirmed.

Recommended status: AUTH-MISSING backlog. Do not prioritize before ElevenLabs Music is tested because ElevenLabs key is present and docs are clear.

Official docs: Not cited in this draft; verify current official API availability before adding to routing.

### Adobe Firefly API

Credentialed: No Firefly Services API key found.

Wired in repo: Skill/docs exist, but current account automation is not validated.

Recommended status: NOT-RECOMMENDED for factory routing on Fritz's current Creative Cloud plan.

Decision: Do not include Firefly Services API in provider routing unless Fritz upgrades to an eligible Adobe API/enterprise plan or confirms Developer Console credentials that can actually call Firefly Services. Prior local evidence says Firefly API access was blocked or enterprise-tier for this account.

Manual/web note: Firefly web remains useful for occasional manual style-reference exploration, but it is not factory-stable and should not appear in the routing rules.

Reference evidence: `tests/media/adobe/firefly-web-test-results.json`, `tests/automation/logs/firefly-image-set-test.json`

Official docs: https://developer.adobe.com/firefly-services/

### Adobe Creative Cloud

Credentialed: Yes as a paid desktop subscription; no separate API key required for local desktop use.

Wired in repo: Partially. `tools/adb-mcp/` exists with MCP servers, proxy, and UXP plugins. `docs/adobe-mcp-integration.md` says the proxy and MCP servers are installed, but UXP plugins were not yet loaded into Adobe apps.

Foundational principle: Photoshop and Premiere are finishing stations, not generators. They do not replace OpenAI/Imagen/Leonardo in the routing table - they sit downstream of generation, applying finishing operations (masks, generative fill, edge cleanup, layer composition, typography, editorial assembly) that the generative providers cannot do well. Default factory path is generate -> local scripts -> Photoshop only when quality requires it.

Current UXP/plugin status: Precheck required before B-008/B-009/B-010. Local files exist at `tools/adb-mcp/uxp/ps/manifest.json` and `tools/adb-mcp/uxp/pr/manifest.json`. The operating note still says plugins must be loaded through UXP Developer Tools and connected from the Adobe app panel. The specific `require('fs')` compatibility concern should be retested because Adobe's current Premiere UXP docs explicitly describe file-system access through `require("fs")` with manifest permissions.

What Photoshop enables that no generator replaces:

- Selection-defined Generative Fill / Generative Expand for targeted edits.
- Higher-quality background removal and edge refinement for hair/capes than generic background-removal scripts.
- Layer-based compositing, masks, blend modes, typography placement, and nondestructive finishing.
- Batch finishing where human-grade export settings matter.

What Premiere enables that no generator replaces:

- Real editorial assembly: clips, transitions, music beds, SFX, exact typography, and exports.
- Timeline control instead of hoping a single video model produces correct pacing.
- Proper text/lower-third treatment using fonts and layout rather than generated raster/video text.

Validated strengths: Manual/web Firefly image quality and style-reference surface were reviewed positively; Photoshop/Premiere automation through adb-mcp is not yet validated.

Known blockers: UXP plugin loading/connection status, proxy availability, app launch state, and potential API compatibility issues.

Official docs: https://developer.adobe.com/photoshop/uxp/, https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/, https://developer.adobe.com/premiere-pro/uxp/, https://developer.adobe.com/premiere-pro/uxp/ppro_reference/

## Validated Test Asset Registry

### Passed / Recommended

- `sites/site-mbsh-reunion/assets/mascot/test-codex/02-thumbs-up-from-wave-ref-OPENAI.png` - OpenAI Responses reference-pose character generation; passed identity and transparency review.
- `sites/site-mbsh-reunion/assets/mascot/test-codex/11-jumping-from-wave-ref-OPENAI.png` - OpenAI Responses reference-pose character generation; passed identity and transparency review.
- `sites/site-mbsh-reunion/assets/mascot/poses/` - Manually approved production pose set; current best anchor source for character identity.
- `sites/site-mbsh-reunion/assets/background-tests/leonardo-motion/01-yearbook-pages.mp4` - Leonardo atmospheric background loop; user-reviewed positively.
- `sites/site-mbsh-reunion/assets/background-tests/leonardo-motion/02-rebuilt-school-push-in.mp4` - Leonardo atmospheric background loop; user-reviewed positively.
- `sites/site-mbsh-reunion/assets/background-tests/leonardo-motion/03-vhs-to-modern-transition.mp4` - Leonardo atmospheric background loop; user-reviewed positively.
- `sites/site-mbsh-reunion/assets/background-tests/leonardo-motion/04-red-silver-mascot-energy.mp4` - Leonardo atmospheric background loop; user-reviewed positively.
- `sites/site-mbsh-reunion/assets/background-tests/leonardo-motion/05-dancefloor-confetti.mp4` - Leonardo atmospheric background loop; user-reviewed positively.
- `tests/media/google/maria-hero-still.png` and `tests/media/google/maria-hero.mp4` - Google Imagen/Veo adjacent hero test.
- `tests/media/google/shoe-1.png` through `tests/media/google/shoe-4.png` - Google Imagen product stills, rated high in local report.

### Failed / Not Recommended

- `sites/site-mbsh-reunion/assets/mascot/test-codex/01-wave-hello-LEO-PHOENIX-397.jpg` - Leonardo Phoenix 1.0 Character Reference 397 failed character consistency.
- `sites/site-mbsh-reunion/assets/mascot/test-codex/02-thumbs-up-from-wave-ref-LEO-PHOENIX-397.jpg` - Leonardo Phoenix 1.0 Character Reference 397 failed character consistency.
- `sites/site-mbsh-reunion/assets/mascot/test-codex/11-jumping-from-wave-ref-LEO-PHOENIX-397.jpg` - Leonardo Phoenix 1.0 Character Reference 397 failed character consistency.
- `sites/site-mbsh-reunion/assets/mascot/test/01-wave-hello-LEO-CHARREF.jpg` and `sites/site-mbsh-reunion/assets/mascot/test/01-wave-hello-LEO-INIT.jpg` - earlier Leonardo tests with drift/identity issues.

## Factory Routing Rules

```json
{
  "character_pose_transparent_png": {
    "primary": "openai.responses.image_generation",
    "model_policy": "GPT Image via Responses tool; use approved production pose reference",
    "fallback": "manual_chatgpt_for_flagship_or_local_background_removal_for_nontransparent_outputs",
    "evidence_tier": "VALIDATED",
    "hard_rules": [
      "reference image required",
      "approved production pose beats early concept anchor",
      "transparent PNG required",
      "do not trust generated raster wordmarks"
    ]
  },
  "multi_pose_character_set": {
    "primary": "openai.responses.image_generation",
    "fallback": "manual_chatgpt_for_high_touch",
    "evidence_tier": "VALIDATED",
    "evidence_note": "Validated for selected programmatic poses plus manual production set; full 25-pose automated set still needs complete-run validation.",
    "hard_rules": [
      "one approved reference input per pose",
      "quality gate before promoting each pose"
    ]
  },
  "hero_still_environment": {
    "primary": "google.imagen_4",
    "fallback": "openai.responses.image_generation",
    "evidence_tier": "VALIDATED",
    "evidence_note": "Validated for product and adjacent hero stills; reunion-specific OpenAI-vs-Imagen comparison remains pending.",
    "hard_rules": [
      "no exact text/logos in raster",
      "reserve safe overlay zone"
    ]
  },
  "hero_still_branded_story": {
    "primary": "google.imagen_4_or_openai.responses.image_generation",
    "fallback": "leonardo.phoenix_start_frame_for_motion_workflows",
    "evidence_tier": "VALIDATED",
    "evidence_note": "OpenAI Responses and Imagen 4 both produced hero-quality branded-scene stills; provider selection is per-site.",
    "hard_rules": [
      "HTML/SVG overlay for exact copy",
      "choose provider by aspect ratio, prompt specifics, and stylistic fit"
    ]
  },
  "atmospheric_background_loop": {
    "primary": "leonardo.image_to_video",
    "fallback": "google.veo_2_or_veo_3",
    "evidence_tier": "VALIDATED",
    "hard_rules": [
      "background only",
      "no readable text",
      "no mascot identity dependence"
    ]
  },
  "cinematic_narrative_clip": {
    "primary": "google.veo",
    "fallback": "leonardo.image_to_video",
    "evidence_tier": "DOCS-CONFIRMED-UNTESTED",
    "evidence_note": "Veo 3 is docs-confirmed but not tested on this account; Veo 2 adjacent evidence exists.",
    "hard_rules": [
      "use still frame to control composition",
      "avoid exact text in video"
    ]
  },
  "multi_shot_video": {
    "primary": "editor_pipeline_ffmpeg_or_premiere",
    "fallback": "runway_after_auth",
    "evidence_tier": "DOCS-CONFIRMED-UNTESTED",
    "hard_rules": [
      "generate clips separately",
      "compose/edit explicitly",
      "do not ask one video model for full final commercial"
    ]
  },
  "character_in_motion_video": {
    "primary": "runway.character_performance_after_auth",
    "fallback": "layered_static_character_over_motion_background",
    "evidence_tier": "AUTH-MISSING",
    "hard_rules": [
      "do not assume still-pose provider works for motion",
      "transparent video not assumed"
    ]
  },
  "style_consistent_batch_stills": {
    "primary": "fal.flux_kontext",
    "fallback": "adobe_firefly_web_manual_or_google_prompt_consistency",
    "evidence_tier": "VALIDATED",
    "hard_rules": [
      "identity preservation confirmed for non-character scene style variation",
      "if identity fails, restrict to background/style assets"
    ]
  },
  "animated_logo_lower_third": {
    "primary": "html_svg_css_or_editor",
    "fallback": "runway_or_leonardo_for_background_motion_only",
    "evidence_tier": "NOT-RECOMMENDED",
    "evidence_note": "AI-generated exact typography is not recommended; use AI only for background motion.",
    "hard_rules": [
      "exact text must be overlay/vector",
      "do not bake brand-critical typography into generated video"
    ]
  },
  "sfx_ambient_audio": {
    "primary": "elevenlabs.sound_effects",
    "fallback": "runway_audio_after_auth",
    "evidence_tier": "VALIDATED",
    "hard_rules": [
      "specify duration",
      "loop only when needed",
      "keep site audio opt-in"
    ]
  },
  "instrumental_music": {
    "primary": "elevenlabs.music",
    "fallback": "suno_after_auth",
    "evidence_tier": "VALIDATED",
    "hard_rules": [
      "avoid artist names and copyrighted references",
      "site playback opt-in or muted by default"
    ]
  },
  "voice_narration": {
    "primary": "elevenlabs.tts",
    "fallback": "runway_audio_after_auth",
    "evidence_tier": "VALIDATED",
    "hard_rules": [
      "store approved voice_id per brand",
      "do not autoplay"
    ]
  },
  "voice_cloning": {
    "primary": "elevenlabs.ivc_with_permission",
    "fallback": "none",
    "evidence_tier": "DOCS-CONFIRMED-UNTESTED",
    "hard_rules": [
      "written consent required",
      "audit trail required"
    ]
  },
  "background_removal": {
    "primary": "local.rembg",
    "fallback": "photoshop_mcp_after_validation",
    "evidence_tier": "VALIDATED",
    "evidence_note": "Repo history and local route validate the capability; not benchmarked in Block 1.",
    "hard_rules": [
      "post-process only",
      "does not solve identity drift"
    ]
  },
  "upscaling": {
    "primary": "provider_tbd",
    "fallback": "local_resize_for_noncritical_assets",
    "evidence_tier": "DOCS-CONFIRMED-UNTESTED",
    "hard_rules": [
      "verify alpha preservation before character use",
      "do not upscale bad text"
    ]
  },
  "photo_restoration": {
    "primary": "adobe.photoshop_desktop_or_adb_mcp_after_precheck",
    "fallback": "manual_photoshop",
    "evidence_tier": "DOCS-CONFIRMED-UNTESTED",
    "hard_rules": [
      "review before/after",
      "do not invent historically important details without approval"
    ]
  },
  "generative_fill_aspect_extension": {
    "primary": "adobe.photoshop_generative_expand_after_precheck",
    "fallback": "regenerate_at_target_aspect_or_css_crop",
    "evidence_tier": "DOCS-CONFIRMED-UNTESTED",
    "hard_rules": [
      "use for finishing, not primary composition",
      "check for fake text and perspective drift"
    ]
  },
  "automated_batch_finishing": {
    "primary": "local_scripts_first_then_adobe.photoshop_for_edge_quality",
    "fallback": "local_scripts_only",
    "evidence_tier": "DOCS-CONFIRMED-UNTESTED",
    "hard_rules": [
      "use deterministic scripts for simple resize/compress",
      "use Photoshop when masks/layers/edge quality matter"
    ]
  },
  "editorial_video_assembly": {
    "primary": "adobe.premiere_adb_mcp_after_precheck",
    "fallback": "ffmpeg_simple_concat",
    "evidence_tier": "DOCS-CONFIRMED-UNTESTED",
    "hard_rules": [
      "exact typography belongs in editor layers",
      "assemble clips explicitly instead of asking a video model for final edit"
    ]
  }
}
```

## Stale Runtime/Instruction Follow-Up

These references are known stale or incomplete and should be handled after this doc is approved:

- `site-studio/server.js` comments still describe Imagen anchor and Leonardo pose generation.
- `site-studio/server.js` character pose generation still has legacy provider behavior that does not match the validated OpenAI Responses reference-image path.
- Other historical provider references surfaced by grep remain in backlog until they are proven to affect runtime routing or user-facing UI.
