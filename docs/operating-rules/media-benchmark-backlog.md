# Media Benchmark Backlog

Status: Draft for Fritz review before paid benchmarks
Updated: 2026-04-28

## Benchmark Rules

- Do not run benchmarks for curiosity. Each test must settle a routing decision for the 60-site factory.
- Record provider, model, API path, prompt, reference input, output path, cost, generation time, and pass/fail criteria.
- Stop before any test batch that would push total benchmark spend above `$50`.
- For character or portrait identity tests, identity preservation beats style novelty.
- For text/logo/milestone content, generated media is background only; exact text belongs in HTML/SVG/editor overlay.

## Approved Block 2 Benchmark Candidates

### B-001: OpenAI Responses Hero Still, No Character

Provider: OpenAI

Model/path: Responses API with `image_generation` tool

Use case: Hero still - branded scene with implied story

Evidence tier before benchmark: DOCS-CONFIRMED-UNTESTED

Test prompt: "Cinematic 16:9 hero background for a 30th high school reunion website. Open 1996 yearbook on a table, warm film grain, red white silver accents, nostalgic but premium, no readable text, no people, no logos, clean center safe area for HTML headline overlay."

Expected cost: Low; prior character reference run estimated about `$0.12`, no-reference still should be comparable or lower depending quality.

Credential prerequisite: `OPENAI_API_KEY` present.

Pass/fail criteria: Premium composition, overlay-safe negative space, no readable fake text/logos, no people, no mascot, usable at website hero size.

Factory routing impact: Determines whether OpenAI should be backup or co-primary for branded hero stills.

### B-002: Google Imagen 4 Hero Still Comparator

Provider: Google

Model/path: Gemini API Imagen 4, `imagen-4.0-generate-001`

Use case: Hero still - branded scene with implied story

Evidence tier before benchmark: VALIDATED.

Evidence note: Prior Google still generation is validated, but this exact reunion hero comparator is pending.

Test prompt: Same as B-001 or close equivalent adjusted for Imagen safety/prompt limits.

Expected cost: Prior local test about `$0.004/image`.

Credential prerequisite: `GEMINI_API_KEY` present.

Pass/fail criteria: Same as B-001, plus compare visual quality and latency against OpenAI.

Factory routing impact: Confirms whether Imagen remains primary for environment/hero stills.

### B-003: Google Veo 2 Atmospheric Loop Comparator

Provider: Google

Model/path: Existing local `scripts/google-media-generate` Veo 2 route

Use case: Atmospheric background loop

Evidence tier before benchmark: VALIDATED.

Evidence note: Prior Veo 2 hero video is validated, but Leonardo atmospheric-loop comparison is pending.

Test prompt: Animate the best still from B-001/B-002 with gentle yearbook page movement, dust motes, slow push-in, no readable text, no people, seamless background motion.

Expected cost: Prior local Veo 2 estimate about `$0.05`.

Credential prerequisite: `GEMINI_API_KEY` present and model quota available.

Pass/fail criteria: Smooth 5-second loop, no new fake text, web-friendly size, usable behind HTML overlay, comparable or better than Leonardo examples.

Factory routing impact: Determines whether Veo competes with Leonardo for background loops or stays narrative-clip backup.

### B-004: fal.ai FLUX Kontext Identity-Preserving Style Variation

Provider: fal.ai

Model/path: `fal-ai/flux-pro/kontext` or `fal-ai/flux-kontext-lora`

Use case: Style-consistent batch stills

Evidence tier before benchmark: DOCS-CONFIRMED-UNTESTED

Test prompt: Use a canonical input image and apply a "1996 yearbook portrait treatment" while preserving the original subject identity. Use one or more safe local test images, not a private real-person portrait unless Fritz explicitly approves it.

Expected cost: fal docs indicate about `$0.04/image` for Kontext Pro or per-megapixel pricing on some endpoints.

Credential prerequisite: `FAL_API_KEY` present.

Pass/fail criteria: Preserves identity, applies style coherently, does not alter key face/character features, output is production-usable as part of a batch. If identity fails but style succeeds, route only for backgrounds/style assets.

Factory routing impact: Determines whether fal can own style-batch generation for alumni/yearbook treatments.

### B-005: ElevenLabs Harry Voice Candidates

Provider: ElevenLabs

Model/path: Text-to-speech, `POST /v1/text-to-speech/:voice_id`

Use case: Voice / narration

Evidence tier before benchmark: DOCS-CONFIRMED-UNTESTED

Test script: "Hey Tide family, Harry here. The reunion is coming up fast, and I saved you a seat by the dance floor."

Expected cost: Character-credit based; should be low for 3-5 short samples.

Credential prerequisite: `ELEVENLABS_API_KEY` present.

Pass/fail criteria: Friendly, energetic, not childish, not announcer-cheesy, fits cartoon mascot without sounding like a toy, clear pronunciation of "Tide family."

Factory routing impact: Determines whether ElevenLabs becomes persona voice provider.

### B-006: ElevenLabs VHS/Reunion SFX Pack

Provider: ElevenLabs

Model/path: Sound Effects, `POST /v1/sound-generation`

Use case: Sound effect / ambient audio

Evidence tier before benchmark: DOCS-CONFIRMED-UNTESTED

Test prompts:

- "subtle VHS tape hiss loop, nostalgic 1990s texture, low volume, 4 seconds"
- "vinyl crackle over dusty warm silence, subtle background texture, 4 seconds"
- "distant high school gym crowd cheer, muffled and nostalgic, 3 seconds"
- "metal school locker closing with hallway reverb, 2 seconds"
- "1990s answering machine beep and room tone, 3 seconds"

Expected cost: Docs state 40 credits per second when duration is specified.

Credential prerequisite: `ELEVENLABS_API_KEY` present.

Pass/fail criteria: Clean short assets, no harsh spikes, loops where requested, useful under video or UI interaction.

Factory routing impact: Determines whether audio ambience becomes part of premium site package.

### B-007: ElevenLabs Music 90s Instrumental

Provider: ElevenLabs

Model/path: Music, `POST /v1/music`

Use case: Original instrumental music

Evidence tier before benchmark: DOCS-CONFIRMED-UNTESTED

Test prompt: "Instrumental 1990s East Coast boom-bap inspired reunion bed, dusty piano chords, warm vinyl crackle, laid-back drums, celebratory but nostalgic, no vocals, no copyrighted artist references, 20 seconds."

Expected cost: Duration/plan dependent; must be checked before generation.

Credential prerequisite: `ELEVENLABS_API_KEY` present and paid Music API access available.

Pass/fail criteria: Original instrumental, no vocals, no obvious copyrighted mimicry, usable as low-volume hero/promo bed, exportable in web-friendly format.

Factory routing impact: Determines whether ElevenLabs Music is primary for promo/hero music beds or backlog-only.

Run condition: Only run if docs and account/API surface are clear. If API returns access/plan ambiguity, stop and mark backlog rather than retrying blindly.

### B-007.5: Photoshop adb-mcp Healthcheck

Provider: Adobe Creative Cloud

Model/path: adb-mcp proxy + Photoshop UXP plugin + Photoshop MCP server

Use case: Precheck for Photoshop finishing benchmarks

Evidence tier before benchmark: DOCS-CONFIRMED-UNTESTED

Test input: Use an existing local test PNG, preferably `sites/site-mbsh-reunion/assets/mascot/poses/01-wave-hello.png`.

Steps:

1. Start adb-mcp proxy.
2. Confirm Photoshop plugin connects.
3. Open a test PNG.
4. Save/export a copy to a benchmark output path.
5. Confirm the export landed and return the path.

Expected cost: `$0` marginal cost.

Credential prerequisite: Creative Cloud desktop subscription, Photoshop installed/openable, UXP plugin loaded, plugin panel connected.

Pass criteria: All five steps complete cleanly, no UXP errors, no proxy timeouts.

Fail criteria: Any step fails. Stop, document the exact failure, and do not attempt fixes in this pass. B-008/B-009/B-010 defer to a separate UXP-fix session.

Factory routing impact: Determines whether Photoshop finishing benchmarks can run now or need a dedicated integration repair session first.

Official docs: https://developer.adobe.com/photoshop/uxp/ and https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/

### B-008: Photoshop Generative Fill / Expand to 16:9

Provider: Adobe Creative Cloud

Model/path: Photoshop Generative Fill / Generative Expand through adb-mcp if UXP plugin is connected; manual Photoshop fallback only if explicitly approved.

Use case: Generative fill / aspect extension

Evidence tier before benchmark: DOCS-CONFIRMED-UNTESTED

Test input: A strong Imagen/OpenAI/Leonardo still that is not already optimal 16:9.

Test prompt: Extend this image to a 16:9 cinematic website hero background while preserving the original subject, lighting, color grade, and overlay-safe composition. Do not add readable text, logos, people, or mascot characters.

Expected cost: `$0` marginal cost on paid Creative Cloud subscription; may consume Adobe generative credits.

Credential prerequisite: Creative Cloud desktop subscription plus working Photoshop adb-mcp path.

Precheck gate: Verify proxy server, Photoshop app state, UXP plugin loaded, plugin panel connected, and whether the prior `require('fs')` compatibility issue still exists. If still broken, stop and create unblock task before running.

Pass/fail criteria: Clean 16:9 extension, no fake text/logos, no obvious seam, preserves original composition, exportable as web hero image.

Factory routing impact: Determines whether Adobe owns finishing/extension instead of regenerating assets.

Official docs: https://www.adobe.com/learn/photoshop/web/expand-image-generative-fill

### B-009: Photoshop Background Removal vs rembg on Harry Pose

Provider: Adobe Creative Cloud

Model/path: Photoshop selection/remove-background workflow through adb-mcp if UXP plugin is connected; compare against local `POST /api/remove-background` / `scripts/rembg-worker.py`.

Use case: Background removal / asset isolation and automated batch finishing

Evidence tier before benchmark: DOCS-CONFIRMED-UNTESTED

Test input: A Hi-Tide Harry pose with difficult cape/edge detail. Prefer a non-transparent or flattened copy so the test is meaningful; do not modify the canonical pose.

Test prompt/workflow: Isolate character on transparent background, preserve cape edges, preserve black outline, preserve red/white shoe detail.

Expected cost: `$0` marginal cost on paid Creative Cloud subscription plus local compute.

Credential prerequisite: Creative Cloud desktop subscription plus working Photoshop adb-mcp path.

Precheck gate: Same as B-008. If Photoshop UXP is not operational, do not run this benchmark.

Pass/fail criteria: Better or equal edge quality than rembg, no cape holes, no halo artifacts, alpha preserved, output PNG usable as foreground overlay.

Factory routing impact: Determines whether Photoshop becomes premium cutout/finishing route for high-value assets while rembg remains bulk/default.

Official docs: https://developer.adobe.com/photoshop/uxp/

### B-010: Premiere Multi-Clip Stitch With Music Bed

Provider: Adobe Creative Cloud

Model/path: Premiere Pro via adb-mcp if UXP plugin is connected; ffmpeg fallback stays as current simple route.

Use case: Editorial video assembly with proper typography

Evidence tier before benchmark: DOCS-CONFIRMED-UNTESTED

Test input: Three existing Leonardo background loops from `sites/site-mbsh-reunion/assets/background-tests/leonardo-motion/`, plus a short music bed if B-007 succeeds or a placeholder royalty-safe local audio file if not.

Test workflow: Create a short sequence with three clips, crossfades, music bed, and exact typography overlay: "30 Years" / "100 Years" / "Miami Beach Senior High Reunion".

Expected cost: `$0` marginal cost on paid Creative Cloud subscription.

Credential prerequisite: Creative Cloud desktop subscription plus working Premiere adb-mcp path.

Precheck gate: Verify proxy server, Premiere app state, UXP plugin loaded, plugin panel connected, and file-system/media import capability. If plugin is broken, stop and create unblock task before running.

Pass/fail criteria: Three clips import, timeline sequence created, crossfades apply, audio bed present, exact typography preserved, exportable MP4 produced.

Factory routing impact: Determines whether Premiere becomes the finishing route for premium promo videos instead of relying only on ffmpeg.

Official docs: https://developer.adobe.com/premiere-pro/uxp/ and https://developer.adobe.com/premiere-pro/uxp/ppro_reference/

## Auth-Missing / Setup-Required Backlog

### B-101: Runway Gen-4 / Gen-4.5 Image-to-Video

Provider: Runway

Model/path: `/v1/image_to_video`, models such as `gen4.5`, `gen4_turbo`, or available current variant.

Use case: Cinematic narrative video clip

Evidence tier: AUTH-MISSING

Test prompt: Use approved reunion hero still, slow dolly/push-in, anamorphic light sweep, no generated text.

Expected cost: Check Runway pricing after API key setup.

Credential prerequisite: `RUNWAYML_API_SECRET`.

Pass/fail criteria: Strong intentional camera move, stable composition, no fake text/logos, web-friendly output.

Factory routing impact: Could displace or supplement Veo/Leonardo for narrative clips.

Official docs: https://docs.dev.runwayml.com/api

### B-102: Runway Character Performance / Act Two

Provider: Runway

Model/path: `/v1/character_performance`, model `act_two`

Use case: Character-in-motion video

Evidence tier: AUTH-MISSING

Test prompt/input: Approved Hi-Tide Harry still plus a short reference performance video.

Expected cost: Check Runway pricing after API key setup.

Credential prerequisite: `RUNWAYML_API_SECRET`, plus safe reference performance clip.

Pass/fail criteria: Character identity preserved, no 3D drift, no outfit/cape loss, motion readable, output not uncanny.

Factory routing impact: Determines whether animated mascot video is viable for factory packages.

Official docs: https://docs.dev.runwayml.com/api

### B-103: Vertex AI Imagen 3 Subject Customization

Provider: Google Vertex AI

Model/path: `imagen-3.0-capability-001`

Use case: Character pose or subject-preserving image generation

Evidence tier: AUTH-MISSING

Test prompt: Use approved production pose as subject reference, generate a new simple pose with transparent/background-isolated output if supported.

Expected cost: Check Vertex AI Imagen pricing.

Credential prerequisite: Google Cloud project ID, billing enabled, Vertex AI permissions, service-account/application-default credentials.

Pass/fail criteria: Preserves character identity, supports needed output quality, beats or matches OpenAI Responses. If no transparency, must still preserve identity strongly.

Factory routing impact: Could become backup or primary for subject-reference generation if it beats OpenAI.

Official docs: https://cloud.google.com/vertex-ai/generative-ai/docs/image/subject-customization

### B-104: Suno Instrumental Music

Provider: Suno

Model/path: TBD after official API verification

Use case: Original instrumental music

Evidence tier: AUTH-MISSING

Test prompt: Same as B-007.

Expected cost: TBD.

Credential prerequisite: Suno API key and official API route verification.

Pass/fail criteria: Original instrumental, no vocals, no obvious copyrighted mimicry, exportable format, better than ElevenLabs Music for site/promo use.

Factory routing impact: Music backup only unless it clearly beats ElevenLabs.

Official docs: Verify before use.

### B-105: Adobe Firefly Services API

Provider: Adobe Firefly Services

Model/path: Firefly Services API

Use cases: Image generation, generative fill, custom models, upscale, video

Evidence tier: NOT-RECOMMENDED.

Evidence note: Prior local verification says Fritz's Creative Cloud plan does not include practical Firefly Services API access and may require enterprise-tier upgrade. Firefly web remains valid for occasional manual exploration, not factory routing.

Test prompt/input: None in this pass.

Expected cost: Requires plan/API verification before any benchmark.

Credential prerequisite: Adobe Developer Console project with Firefly Services API access, client ID/secret, and confirmed plan entitlement.

Pass/fail criteria: Not applicable until access exists.

Factory routing impact: Do not route factory work here unless account access changes. Use Creative Cloud desktop/adb-mcp as Adobe route instead.

Official docs: https://developer.adobe.com/firefly-services/

### B-106: FAMtastic-Owned UXP Plugin

Provider: Adobe Creative Cloud / FAMtastic-owned integration

Model/path: Purpose-built Photoshop/Premiere UXP plugin exposing only Studio-required commands

Use cases: Photoshop finishing, batch export, edge cleanup, layer composition, Premiere editorial assembly

Evidence tier: DOCS-CONFIRMED-UNTESTED

Decision status: Future decision point, not a near-term task.

Trigger condition: Consider building a narrow purpose-built UXP plugin if adb-mcp proves valuable across multiple sites and either adb-mcp limitations block factory throughput or adb-mcp version drift creates recurring maintenance tax.

Expected cost: Engineering time only; no new provider spend.

Credential prerequisite: Adobe UXP Developer Tool and Creative Cloud desktop apps.

Pass/fail criteria: Not a benchmark yet. Decision requires repeated evidence that the generic bridge is useful but too broad/fragile for factory use.

Factory routing impact: Could harden the Adobe finishing station into a stable internal Studio capability. Until a trigger fires, generic adb-mcp remains acceptable.

Official docs: https://developer.adobe.com/photoshop/uxp/ and https://developer.adobe.com/premiere-pro/uxp/

### B-107: adb-mcp openFile Photoshop UXP Fix

Provider: Adobe Creative Cloud / adb-mcp

Model/path: Photoshop UXP plugin command `openFile`

Use cases: Photoshop healthcheck, Generative Fill / Aspect Extension, Background Removal / Asset Isolation, Automated Batch Finishing

Evidence tier: FAILED

Failure evidence: `docs/operating-rules/benchmark-runs/B-007.5-photoshop-healthcheck.json`

Observed behavior: The adb-mcp proxy connects and `getDocuments` works, but `openFile` fails with `Could not create file entry. File probably does not exist` on a valid local PNG path.

Likely cause: UXP file URL handling, local-file permissions, or adb-mcp `openFile` implementation compatibility.

Trigger condition: When a flagship site needs Photoshop-grade finishing, schedule a focused UXP debugging session.

Factory routing impact: Resolution unblocks B-008/B-009/B-010 Adobe benchmarks and broader photo-restoration / generative-fill / batch-finishing / editorial-assembly capability lanes.

Pass/fail criteria: `openFile` can open a known local PNG by absolute path, save/export a copy, and confirm the output file exists.

Official docs: https://developer.adobe.com/photoshop/uxp/

## Docs-Confirmed But Lower Priority

### B-201: Google Veo 3 / Veo 3.1 Account Availability

Provider: Google

Model/path: Gemini API video generation docs list Veo 3. Current local quota/access unknown.

Use case: Cinematic narrative video clip

Evidence tier: DOCS-CONFIRMED-UNTESTED

Test prompt: Same as B-003 or narrative hallway prompt.

Expected cost: Check current model pricing before call.

Credential prerequisite: `GEMINI_API_KEY` and paid/quota access.

Pass/fail criteria: Better camera control and realism than Veo 2/Leonardo at acceptable cost.

Factory routing impact: Could become premium narrative clip provider.

Official docs: https://ai.google.dev/gemini-api/docs/video

### B-202: fal.ai FLUX LoRA Training

Provider: fal.ai

Model/path: FLUX LoRA training/inference endpoints

Use case: Style-consistent batch stills or recurring brand identity

Evidence tier: DOCS-CONFIRMED-UNTESTED

Test prompt/input: Requires a real dataset, not one-off prompt.

Expected cost: Check training endpoint pricing and storage.

Credential prerequisite: `FAL_API_KEY` present, but dataset and training plan required.

Pass/fail criteria: Trained style/persona produces consistent outputs better than reference-only Kontext.

Factory routing impact: Candidate for high-value recurring brands, not one-off $100/mo sites unless cost/time supports it.

Official docs: https://fal.ai/models/fal-ai/flux-lora/api

## Known Stale Code/Docs Follow-Up

- `site-studio/server.js` comments and character pipeline implementation still reference Imagen/Leonardo assumptions.
- `site-studio/public/js/studio-screens.js` has approved user-facing provider string fixes in this pass.
- `site-studio/config/studio-capabilities.json` has approved provider-routing fixes in this pass.
- `site-studio/shay-shay/instructions.md` has approved Shay routing fixes in this pass.
- Broader provider references from grep should be reviewed after the authoritative doc is approved; do not bulk-edit all 336 references blindly.
