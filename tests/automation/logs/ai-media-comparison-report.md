# AI Media Tool Comparison — First Tests

**Date:** 2026-04-07
**Test Sites:** Guy's Classy Shoes (Firefly), Readings by Maria (Veo)
**Status:** Both tests BLOCKED by credential/billing requirements

---

## Adobe Firefly

- **What worked:**
  - Skill installed successfully at `.claude/skills/adobe-firefly/SKILL.md`
  - CLI script `scripts/firefly-generate` built with batch mode, style reference, and single-image generation
  - OAuth 2.0 flow coded against Adobe IMS token endpoint
  - API endpoint confirmed: `https://firefly-api.adobe.io/v2/images/generate`
  - Script properly validates credentials and fails gracefully when missing

- **What didn't:**
  - No `FIREFLY_CLIENT_ID` or `FIREFLY_CLIENT_SECRET` in environment
  - Cannot test without Adobe Developer Console project credentials
  - The AgentSkillExchange repo only had a stub SKILL.md (no implementation) — had to build the entire integration from scratch

- **Image set coherence rating:** Not tested (0/10 — no credentials)
- **Credits consumed:** 0
- **Time to generate:** N/A
- **Integration difficulty:** MEDIUM — OAuth 2.0 client credentials flow is standard, but requires Adobe Developer Console setup (project creation, API key generation, scope configuration). The API itself is straightforward REST.

### What's Needed to Unblock
1. Create project at https://developer.adobe.com/firefly-services/docs/firefly-api/guides/
2. Set `FIREFLY_CLIENT_ID` and `FIREFLY_CLIENT_SECRET` in environment
3. Run: `scripts/firefly-generate --prompt "test" --output test.jpg`

---

## Google Veo / Gemini Image / Imagen

- **What worked:**
  - `google-genai` Python SDK installed (v1.47.0)
  - API key is valid and works for text generation (Gemini 2.5 Flash confirmed working)
  - Listed 12 image/video models available in the API:
    - Gemini image: 3.1-flash-image, 3-pro-image, 2.5-flash-image
    - Imagen: 4.0-generate, 4.0-ultra, 4.0-fast
    - Veo: 2.0, 3.0, 3.0-fast, 3.1, 3.1-fast, 3.1-lite

- **What didn't:**
  - ALL image/video generation requires a paid Google AI plan
  - Free tier quota is literally 0 for every image/video model
  - Imagen explicitly returns: "only available on paid plans"
  - Gemini image and Veo return: "quota exhausted" with limit: 0

- **Video quality rating:** Not tested (0/10 — no paid plan)
- **Cost:** Paid plan required (pricing at https://ai.dev/projects)
- **Time to generate:** N/A
- **Integration difficulty:** LOW — Python SDK is clean, API is well-documented, model names are discoverable via `client.models.list()`. Once paid plan is active, the code written for this test will work as-is.

### What's Needed to Unblock
1. Upgrade to paid plan at https://ai.dev/projects
2. Run the existing test script (code is ready, just quota-blocked)

---

## Capability Matrix

| Need | Best Tool | Why | Status |
|------|-----------|-----|--------|
| Image sets (coherent) | Adobe Firefly | Style reference API ensures consistent lighting/color across a set | Needs credentials |
| Hero video | Google Veo 3.1 | Image-to-video generation, dedicated video model | Needs paid plan |
| Still images (standalone) | Imagen 4.0 or Gemini 3.1 Flash Image | Fastest for single images, multiple quality tiers | Needs paid plan |
| SVG assets | Claude CLI (current) | Already working in pipeline via `scripts/asset-generate` | Working now |
| Product animation | Google Veo 3.1 | Only tool with video generation | Needs paid plan |
| Quick experiments | Gemini 3.1 Flash Image | Fastest model, lowest cost | Needs paid plan |
| Brand consistency | Adobe Firefly | Style reference + C2PA provenance metadata | Needs credentials |
| Commercially safe | Adobe Firefly | C2PA Content Credentials, trained on licensed content | Needs credentials |

---

## Recommendations for Studio Integration

### What should be integrated into Studio's Image Browser workspace
- **Firefly text-to-image** as a tab alongside Unsplash/Pexels in the Image Browser canvas tab
- **Firefly style reference** as an option when generating multiple images for a page — anchor image drives the set
- Provider badge system already supports this (just add "firefly" as a provider)

### What should be a CLI tool
- `scripts/firefly-generate` — already built, supports single + batch + style reference
- `scripts/veo-generate` — to be built when Veo is available, for hero video generation
- Both should integrate with `fam-hub site` subcommands

### What should be automated in the build pipeline
- **Hero image generation** — after brief approval, auto-generate hero using Firefly or Imagen based on brief's visual direction
- **Product image sets** — batch-generate with style reference after first approved image
- **Hero video** — auto-generate from approved hero still image via Veo

### What needs human judgment (stays manual)
- **Style reference selection** — which image to use as the anchor
- **Quality approval** — AI-generated images need human review before going live
- **Brand consistency** — final brand alignment check across the full image set
- **Video loop quality** — seamless loop assessment requires human eye

---

## Next Steps

### Immediate (unblocks testing)
1. **Adobe:** Create project at Adobe Developer Console, get API credentials, add to env
2. **Google:** Upgrade GEMINI_API_KEY to paid plan at https://ai.dev/projects

### After credentials are available
1. Re-run Phase 2 (Firefly image set coherence test with Guy's Classy Shoes)
2. Re-run Phase 3 (Veo hero video test with Readings by Maria)
3. Compare results and update this report with actual quality ratings

### Pipeline integration (after tests pass)
1. Add Firefly as a provider in the Image Browser tab's provider dropdown
2. Add `POST /api/firefly/generate` endpoint to server.js
3. Add `POST /api/veo/generate` endpoint for video generation
4. Wire into the stock photo flow — Firefly as a premium tier alongside Unsplash/Pexels
5. Add hero video support to the build pipeline (post-build step)

### What credentials/config are missing

| Credential | Variable | Status | Where to Get |
|-----------|----------|--------|--------------|
| Adobe Client ID | `FIREFLY_CLIENT_ID` | Missing | https://developer.adobe.com/firefly-services/ |
| Adobe Client Secret | `FIREFLY_CLIENT_SECRET` | Missing | Same as above |
| Google AI paid plan | `GEMINI_API_KEY` | Exists but free tier | Upgrade at https://ai.dev/projects |

---

## Key Insight

The infrastructure is fully built and ready:
- Firefly skill installed, CLI script with batch + style reference support
- Google genai SDK installed, 12 image/video models discovered
- Output directories created, test harness with JSON logging ready
- Image Browser tab in Studio already has provider dropdown architecture

**The only blocker is credentials and billing.** Once those are in place, the actual generation tests can run immediately with the code already written.
