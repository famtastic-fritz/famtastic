# Image Generation Capability Check

**Date:** 2026-05-07
**Run by:** Claude Code (Opus 4.7)
**Purpose:** Verify the image-generation toolchain before unblocking P3 of the MBSH Premiere build. Distinguish key/auth from billing/quota/model/network/integration failure modes.
**Triggered by:** Fritz observation that credits should be available — do not assume credits are the only issue.

---

## TL;DR

| Provider | Status | Diagnosis | Fix |
|---|---|---|---|
| **Gemini / nano-banana (PRIMARY)** | ❌ BLOCKED | API key INVALID (auth failure, not credits) | Generate new key at https://aistudio.google.com/app/apikey; update `~/.zshrc` and `~/.config/famtastic/studio-config.json` |
| **OpenAI / ChatGPT DALL-E (BACKUP 1)** | ❌ UNAVAILABLE | No `OPENAI_API_KEY` in env or config | Add OpenAI API key to env + studio-config |
| **Adobe Firefly (BACKUP 2)** | ❌ UNAVAILABLE | `firefly_client_id` is empty string; `firefly_client_secret` empty | Configure Adobe IMS credentials |
| **Canva MCP (BACKUP 3)** | ❓ UNKNOWN | Plugin registered (`mcp__plugin_marketing_canva__*`) but OAuth not completed in this session | Run `mcp__plugin_marketing_canva__authenticate` if a workable image-gen flow exists |
| **Local pipeline (BACKUP 4)** | ⚠️ PARTIAL | `ffmpeg` present at `/opt/homebrew/bin/ffmpeg`; ImageMagick `convert` NOT installed; no generative model locally | Could install ImageMagick for SVG→PNG rasterization, but that's not generative |
| **CSS / SVG / existing-pose fallback (FINAL)** | ✅ ACTIVE | Already wired throughout V1+P1 ship | None needed — site ships with this today |

---

## 1. Tool tested — Gemini / nano-banana

**Expected tool:** `gemini-tools:nano-banana` subagent. Backed by Google's Gemini API at `generativelanguage.googleapis.com` for image generation (image-capable models like `gemini-2.5-flash-image-preview` or `imagen-3.x` series).

**Required environment variable:** `GEMINI_API_KEY` (Google AI Studio API key, format `AIza...`).

---

## 2. Environment-variable presence

Probed without exposing values:

| Var | Present | Length | Shape (first/last 4) |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ yes | 39 | `AIza***mkZM` (Google API-key format confirmed) |
| `OPENAI_API_KEY` | ❌ no | 0 | — |
| `ANTHROPIC_API_KEY` | ❌ no | 0 | — (Claude Code uses subscription auth) |
| `ADOBE_CLIENT_ID` | ❌ no | 0 | — |
| `ADOBE_CLIENT_SECRET` | ❌ no | 0 | — |
| `FIREFLY_CLIENT_ID` | ❌ no | 0 | — |

`GEMINI_API_KEY` is set in `~/.zshrc`. (Confirmed via `grep -l "GEMINI_API_KEY" ~/.zshrc`.)

---

## 3. Famtastic studio-config keys

`~/.config/famtastic/studio-config.json` keys (no values printed — only set/empty status):

| Config key | Status |
|---|---|
| `anthropic_api_key` | empty |
| `gemini_api_key` | empty (env var is the source) |
| `openai_api_key` | empty |
| `firefly_client_id` | empty string |
| `firefly_client_secret` | empty |
| `image_provider` | `"imagen4"` |

`vault-index.txt` lists 6 secrets — all are non-image-gen (Resend, cPanel, MBSH DB/admin). No image-gen credentials in the vault.

---

## 4. Minimal Gemini API test request

Used **header authentication** (`x-goog-api-key`) so the key never appeared in any URL or log. Test #1 hit the simplest endpoint (text generation on `gemini-2.5-flash`) to isolate auth from model/feature concerns.

**Request:**
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
Header: x-goog-api-key: <key>
Body: {"contents":[{"parts":[{"text":"Reply with just: OK"}]}]}
```

**Response — HTTP 400:**
```json
{
  "error": {
    "code": 400,
    "message": "API key expired. Please renew the API key.",
    "status": "INVALID_ARGUMENT",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        "reason": "API_KEY_INVALID",
        "domain": "googleapis.com",
        "metadata": { "service": "generativelanguage.googleapis.com" }
      },
      {
        "@type": "type.googleapis.com/google.rpc.LocalizedMessage",
        "locale": "en-US",
        "message": "API key expired. Please renew the API key."
      }
    ]
  }
}
```

**Test #2 — model listing** (`GET /v1beta/models`):
- HTTP 400, same `API_KEY_INVALID` error
- Zero models returned

---

## 5. Exact non-secret error

```
HTTP 400
status:  INVALID_ARGUMENT
reason:  API_KEY_INVALID
message: API key expired. Please renew the API key.
service: generativelanguage.googleapis.com
```

The key was redacted in all logs; the test scripts used `x-goog-api-key` header (never `?key=` URL parameter), and only the literal Google response was captured.

---

## 6. Failure classification

**Category: KEY / AUTH** — definitively, not credits.

Evidence:
- `reason: API_KEY_INVALID` — Google's own classification
- The same error fires on the simplest possible endpoint (text generation, listing models). It is not specific to image generation, which rules out **model name**, **feature access**, or **tool integration**.
- HTTP 400 (not 429 quota / not 402 billing / not 403 quota-by-project).
- The key shape is correct (`AIza...`, length 39) — it's a real key that was once valid, now revoked or expired.
- Network is fine — the request reached Google and got a structured error back.

**Likely root causes (in order of probability):**
1. The key was **rotated** in Google AI Studio (the old one revoked when a new one was created).
2. The key was **deleted** from the AI Studio project.
3. The Google Cloud project that owns the key was **disabled** or **deleted**.
4. The key has **referrer / IP restrictions** and the local request doesn't match — less likely given the explicit "expired" wording.

Fritz's belief that credits are available is plausible — credits live on the project/billing account, not the key itself. **Even with credits, an invalidated key fails.** The fix is regeneration.

---

## 7. Backup options surveyed

### ChatGPT / OpenAI image generation API (DALL-E 3 or `gpt-image-1`)

- **Auth:** would require `OPENAI_API_KEY`
- **Status:** ❌ not present in env or `studio-config.json` (`openai_api_key = empty`)
- **Cost:** pay-as-you-go on OpenAI billing
- **To enable:** create an OpenAI API key at https://platform.openai.com/api-keys, add to env (`OPENAI_API_KEY=...`) and/or studio-config

### Adobe Firefly

- **Auth:** Adobe IMS — needs `FIREFLY_CLIENT_ID` + `FIREFLY_CLIENT_SECRET`
- **Status:** ❌ both empty in studio-config
- **Cost:** Adobe Firefly API is paid (volume-based)
- **To enable:** register an integration at https://developer.adobe.com/console/, populate client_id + client_secret in studio-config

### Canva MCP (`mcp__plugin_marketing_canva__*`)

- **Auth:** OAuth flow via `mcp__plugin_marketing_canva__authenticate`
- **Status:** ❓ plugin registered, OAuth not completed in this session
- **Image-gen capability:** Canva has Magic Design and image-gen features but the MCP scope and what it actually exposes for our use case is **unverified**
- **To enable:** invoke the plugin's authenticate tool; verify that image-gen is one of the exposed actions

### Local pipeline

- **`ffmpeg`** at `/opt/homebrew/bin/ffmpeg` ✅ — useful for video manipulation, **not image generation**
- **ImageMagick `convert`** ❌ not installed — could be installed (`brew install imagemagick`) for SVG→PNG rasterization workflows, but again this is not generative
- **Stable Diffusion / Diffusers / CoreML local models** — none detected in the system; would need a substantial install

### Manual creation by Fritz / commissioned illustrator

- Always available, but slow. Most appropriate as a final fallback for the highest-impact assets only.

### CSS / SVG / existing-pose fallback (current state)

- ✅ Active and working in production
- Documented per-asset in `DEFERRED-ASSETS.md`
- Site ships in P2 with this today
- Pass-2 propagation is unblocked — only Pass 3 raster polish is gated on real image gen

---

## 8. Fallback chain (real, ordered)

```
1. Gemini / nano-banana (PRIMARY) — once key regenerated
   ↓ (if blocked)
2. ChatGPT / OpenAI DALL-E — once OPENAI_API_KEY configured
   ↓ (if blocked)
3. Adobe Firefly — once FIREFLY_CLIENT_ID + SECRET configured
   ↓ (if blocked)
4. Canva MCP — once OAuth completed AND image-gen capability confirmed
   ↓ (if blocked)
5. Local / manual — Fritz hand-creates or commissions illustrator
   ↓ (final)
6. CSS / SVG / existing-pose fallback — already in use, ships today
```

---

## 9. Recommended next action

**Highest leverage (5 min):** Fritz regenerates the Gemini API key.

Steps:
1. Go to https://aistudio.google.com/app/apikey
2. Verify the existing project still has billing/credits attached
3. Either reactivate the existing key (if possible) or generate a new key in the same project
4. Update `~/.zshrc`:
   ```
   export GEMINI_API_KEY="<new-key-value>"
   ```
5. Source the rc file (`source ~/.zshrc`) or open a new terminal
6. Re-run this capability check by repeating step 4 (the curl test). Expected: HTTP 200 + reply text.
7. Notify the build run that Gemini is unblocked. P3 raster generation can proceed per `DEFERRED-ASSETS.md` priority order (peeking → pride-celebrate → ticket-stub → wax-stamping → tier medallions → backdrops → remaining poses).

**If Fritz prefers a backup path:** configure OpenAI (fastest, lowest setup overhead) by adding `OPENAI_API_KEY` to env. The MBSH-side image specs in `DEFERRED-ASSETS.md` map cleanly to DALL-E 3 prompts; the only adaptation needed is style-consistency (DALL-E character consistency is weaker than Imagen, so Harry pose batches benefit from one canonical reference image being included in each prompt).

**No action and the build still ships** — Pass 2 propagates the experience using existing-pose + CSS/SVG fallbacks. Pass 3 raster polish is upgrade only. The "site is unbuildable without image gen" framing is wrong: the site is **fully buildable** with CSS/SVG; image gen elevates it.

---

## Capability-check artifact list

- `evidence/p1-sandbox-state.json` — referenced for context
- `DEFERRED-ASSETS.md` — updated with this real fallback chain (next commit)
- `IMAGE-GEN-CAPABILITY-CHECK.md` — this file

## Privacy / secrets handling

No secrets were exposed in any log or output. All API key probing used:
- Length + first-4/last-4 character probe (still ambiguous; not enough to reconstruct)
- `x-goog-api-key` request header (never URL parameter)
- Error responses captured to `/tmp/*.json` then displayed in plain text — Google's error response does not echo the request key

The `/tmp/gemini-test*.json` files contain only the error structure shown above. No further redaction needed.
