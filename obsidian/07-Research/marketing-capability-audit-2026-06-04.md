---
date: 2026-06-04
session: claude-code
type: capability-audit
topic: marketing/media toolkit — claimed vs. real
trigger: Shay (on Gemini) proposed a "Show Don't Tell" campaign citing skills that don't exist
---

# Marketing toolkit — ground truth (claimed vs. installed)

Shay proposed a Digital Business Card launch citing an "Ad Agency" + "Production
Studio" toolkit. Verified each claim against the repo. **Verdict: the strategy is
sound; the tool attribution is ~40% real, ~60% overstated or fabricated.** Same
failure mode as the "research is lost" incident — confident assertion not grounded
in a capability check.

## Claimed vs. real

| Shay claimed | Reality | Status |
|---|---|---|
| Copywriting (core brain) | LLM generation — real | ✅ REAL |
| `muapi-ad-creative` | **No such skill/recipe in repo** | ❌ FABRICATED NAME |
| `muapi-social-pack` | **No such skill/recipe** | ❌ FABRICATED NAME |
| `muapi-social-media-video` | **No such recipe**; muapi video unproven | ❌ FABRICATED NAME |
| `muapi-product-video-ad-maker` | **No such recipe** | ❌ FABRICATED NAME |
| `songwriting-and-ai-music` | **No music-gen skill or integration exists** | ❌ NOT FOUND |
| `claude-design` | Only an **archived** pre-shay-shay doc; not installed | ❌ NOT A SKILL |
| Landing page + deploy | `site-studio` real; deploy was an "honest stub" earlier | 🟡 REAL (deploy semi-manual) |

## What's ACTUALLY available for media (the real toolkit)

- **MuAPI** — real & **keyed** (CLI keychain, per `specs/008-.../proof.md`; paid
  logo-lab batches exist). Runner: `media-studio/lib/index.js` `buildMuapiPlan()` →
  `muapi <mediaType> generate`. **Real recipes:** `muapi-logo-branding`,
  `muapi-brand-kit`, `muapi-design-guide`. **Known gap** (`PART-4-DESIGN.md:178`):
  "media generation — needs muapi key plumbing, file download UX." So muapi
  image/logo gen is proven; ad/social/video recipes are NOT built.
- **adobe-firefly** — real skill (`.claude/skills/adobe-firefly/`), text-to-image +
  style ref + batch. Needs Firefly API creds. *(Shay didn't even mention the one
  real image skill.)*
- **remotion** + `remotion-best-practices` — real, React/code-driven video. This is
  the actual video capability — NOT prompt-to-video. *(Also unmentioned.)*
- **site-studio** — real landing-page builder.
- **humanize-writing** — real copy-voice filter.
- **FAL** — key now live (alt media provider) per `MEDIA-...-2026-05-29.md`.

## Corrected tool mapping for the campaign

| Plan step | Shay's tool (fictional) | Real tool to use |
|---|---|---|
| Build the card (hero asset) | claude-code | ✅ site-studio + claude-code |
| Hero/social images | muapi-ad-creative / social-pack | **adobe-firefly** or a **new** muapi recipe (build it) |
| Product video | muapi-product-video-ad-maker | **remotion** (code video) — real today |
| Music/jingle | songwriting-and-ai-music | **none** — skip, or source royalty-free |
| Landing page | terminal | ✅ site-studio |
| Deploy | "Vercel/Netlify in minutes" | real but verify the deploy path (was a stub) |

## Recommendation

1. **Approve Digital Business Card as first product — yes.** Simple, fast, doubles as
   a live demo of the media services. Good call by Shay.
2. **Scope the launch to REAL tools** (table above). The "Show Don't Tell" strategy
   is good; just don't promise a muapi ad/video pipeline that isn't built.
3. **If we want the "Ad Agency" capability for real**, that's a build task: author a
   `muapi-ad-creative` recipe on top of the existing `buildMuapiPlan()` + close the
   "muapi key plumbing / download UX" gap. Estimate before promising it in a launch.
4. **Meta:** Shay should run the `gap-analysis` skill / check `docs/capability-registry.md`
   before claiming tools. Two confident-but-unverified claims in one day (research-lost,
   this) — verification-before-assertion needs to be the habit.
