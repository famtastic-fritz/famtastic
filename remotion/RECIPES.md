# FAMtastic Media Studio — Recipes & Build Catalog

> This is the working catalog of compositions, integrations, and use cases
> for `@famtastic/remotion`. Each entry is either:
> - **Shipped** — exists and is callable today
> - **Recipe** — well-defined enough to start building in 1–2 sessions
> - **Pattern** — orchestration/integration patterns that span multiple recipes
>
> Update this file whenever a new recipe is added, shipped, or retired.

---

## Architecture summary

```
                     ┌─────────────────────────────────────────┐
                     │    Media Studio (future server + UI)    │
                     └────────────────┬────────────────────────┘
                                      │
            ┌─────────────────────────┴────────────────────────┐
            ▼                                                  ▼
  ┌─────────────────────┐                          ┌──────────────────────┐
  │  muapi (generation)  │                          │  @famtastic/remotion │
  │  ────────────────   │                          │  (composition+render)│
  │  text→image          │                          │  ──────────────────  │
  │  text→video          │                          │  Compositions        │
  │  image→video         │                          │  Transitions         │
  │  music (Suno)        │   raw assets / clips     │  Caption rendering   │
  │  voiceover (TTS)     │   ───────────────────▶   │  Live <Player>       │
  │  transcription       │                          │  Lambda batch render │
  │  upscale/edit        │                          │                      │
  └─────────────────────┘                          └──────────────────────┘
            ▲                                                  │
            │                                                  ▼
       brand assets                                  final branded video
       (~/famtastic/brand)                           (MP4 / WebM / PNG /
                                                     embedded React component)
```

**Generation = muapi. Composition = Remotion. No overlap, no double-pay.**

---

## Shipped (in production today)

### ✅ `FAMtasticLogo` composition family
- **File:** `src/FAMtasticLogo.tsx`
- **IDs:** `FAMtasticLogo-Luminous`, `FAMtasticLogo-Dark`, `FAMtasticLogo-Square`
- **Duration:** 120 frames @ 30fps (4s)
- **Animation:** burst-explode (00–18) → FAM drop-in (12–36) → tastic wipe-in (30–60) → hold (60–120)
- **Inputs:** `burstVariant`, `famVariant`, `backgroundColor`
- **Outputs:** MP4 (1920×1080 or 1080×1080), PNG stills at any frame

---

## Phase 2 — Composition library (next builds)

### Recipe: `LowerThird`
- **Purpose:** Name + title overlay for video testimonials on FAMtastic sites
- **Why it matters:** Every testimonial section on a built site needs branded attribution; manual = inconsistent, auto = brand-locked
- **Props:** `name`, `title`, `accentColor`, `anchor` ("bottom-left" | "bottom-right")
- **Animation:** slide-in from edge, hold, slide-out
- **Format:** transparent background, can be overlaid on any video

### Recipe: `TitleCard`
- **Purpose:** Opening title card — episode/section/chapter intro
- **Why it matters:** Site Studio sites with video content need branded section breaks
- **Props:** `title`, `subtitle`, `theme` ("light" | "dark"), `burstVariant`
- **Animation:** burst opens → title types in → subtitle fades up → hold
- **Format:** full-screen (1920×1080 or 1080×1920 for vertical)

### Recipe: `SocialReel`
- **Purpose:** 9:16 vertical brand intro for Instagram Reels / TikTok / YouTube Shorts
- **Why it matters:** Every social asset needs the FAMtastic signature lock-up at vertical aspect
- **Props:** `hook` (text), `accentColor`, `duration` (default 3s)
- **Animation:** burst slams in → FAM drops → tastic flies in → hook text types
- **Format:** 1080×1920 (9:16)

### Recipe: `IntroOutro`
- **Purpose:** Bookend any user-generated video with FAMtastic-branded intro + outro
- **Why it matters:** Quickest path to brand consistency on user-uploaded video content
- **Props:** `mainVideoUrl`, `intro` ("logo" | "social-reel"), `outro` ("cta" | "signature")
- **Composition:** intro composition → user video clip → outro composition
- **Uses:** `@remotion/transitions` to bridge sections smoothly

### Recipe: `KineticType`
- **Purpose:** Animated text emphasis — for hero copy, callouts, key quotes
- **Why it matters:** Replaces static hero text on Site Studio sites with motion-driven type that holds attention
- **Props:** `lines` (string[]), `colorScheme`, `pace`, `style` ("bounce" | "type" | "explode")
- **Animation:** per-word or per-letter timing-driven entrances
- **Uses:** `@remotion/animation-utils` for easing curves

### Recipe: `ProductShowcase`
- **Purpose:** Product reveal animation — 3D rotation, exploded view, feature callouts
- **Why it matters:** When Site Studio builds e-commerce sites, the product hero needs more than a static image
- **Props:** `productImage`, `features` (string[]), `accentColor`
- **Animation:** product slides in → rotates 360° → feature callouts pop sequentially
- **Inputs:** muapi-generated product photos / multi-angle reshoots

---

## Phase 3 — Studio integrations

### Pattern: Captions overlay
- **Source:** muapi transcribes audio (built into AI-Clipping endpoint)
- **Renderer:** `@remotion/captions` consumes the transcription, styles per FAMtastic brand
- **Use case:** Every video on every site gets branded auto-captions (accessibility + consistency)
- **Style options:** Karaoke highlight, word-by-word reveal, sentence-by-sentence
- **Customization:** brand color injected into highlight, font from `@remotion/google-fonts`

### Pattern: Music sync
- **Source:** Suno (via muapi) generates branded track
- **Renderer:** Remotion `<Audio>` component with `@remotion/media-utils` for waveform analysis
- **Use case:** Lock animation beats to the music — burst hits on the kick drum
- **Implementation:** parse audio → detect beats → trigger composition events at beat timestamps

### Pattern: Voiceover sync
- **Source:** muapi TTS or external recording
- **Renderer:** Remotion `<Audio>` + `@remotion/captions` for synced subtitles
- **Use case:** Narrated product explainers, founder messages, AI-generated voiceovers

### Pattern: AI clip → branded video
- **Source:** muapi text-to-video (Seedance, Kling, Veo3)
- **Renderer:** Remotion composition wraps the muapi clip with FAMtastic intro + outro + lower thirds + captions
- **Use case:** "Make me a 30s ad for this product" → muapi generates the visuals → Remotion brands them

### Pattern: Multi-format batch render
- **Source:** Single Remotion composition
- **Renderer:** Same composition rendered at all common aspect ratios in one batch
- **Formats:** 16:9 hero (1920×1080), 9:16 reel (1080×1920), 1:1 square (1080×1080), 4:5 IG portrait (1080×1350), 21:9 cinematic (2560×1080)
- **Implementation:** Studio's render API takes a `formats` array, queues N renders, returns N URLs

### Pattern: Brand context injection
- **Source:** Site Studio knows the site's brand colors / logo / typography
- **Renderer:** Site Studio passes these as `inputProps` to Media Studio's render API
- **Use case:** Same FAMtasticLogo composition renders with cobalt-blue background for one site, forest-green for another
- **Contract:** every composition exposes a `brandContext` prop following a shared schema

---

## Phase 4 — Embedded live experiences

### Pattern: Live `<Player>` embed
- **Source:** `@remotion/player`
- **Where it lives:** inside Site Studio-built sites (React-driven or via the player's standalone web bundle)
- **Behavior:** instead of baking compositions to MP4 and embedding `<video>`, Site Studio sites embed the composition as a **live React component**
- **Why it matters:** Update `FAMtasticLogo.tsx` → all sites pick up the new version on next page-load. No re-render of N MP4s.
- **Controls:** scrub, replay, autoplay-on-scroll, hover-to-play

### Pattern: Per-visitor personalization
- **Source:** Player gets fresh `inputProps` per page render
- **Use case:** Visitor's name in the title card, their location in the lower third, dynamic CTA based on referral source
- **Privacy note:** server-side prop injection; PII never leaves the brand owner's infra

---

## Phase 5 — AI media pipelines

### Pattern: "Make me a 30s ad for X" end-to-end
1. User describes the product/ad
2. Media Studio calls **muapi** to generate hero clips (text-to-video)
3. Media Studio calls **muapi** to generate music (Suno)
4. Media Studio calls **muapi** to generate voiceover (TTS)
5. Media Studio calls **muapi** to transcribe the voiceover → caption timeline
6. **Remotion** composes: FAMtastic intro → muapi clips → kinetic type overlays → captions → outro → music underneath
7. **Remotion Lambda** (when scaled) batch-renders 5 format variants in parallel
8. Output: 5 branded MP4s + 5 social-ready captions ready to post

### Pattern: Social variant factory
- Single input: a hero clip + tagline
- Outputs: 16:9 YouTube, 9:16 TikTok/Reel, 1:1 IG feed, 4:5 IG portrait, 2:3 Pinterest — all branded, all captioned

### Pattern: Site-Studio-triggered hero video
- Trigger: Site Studio builds a site for client X
- Pipeline: Site brand context + FAMtastic signature → Media Studio renders a 6-second branded intro → uploaded to site's CDN → embedded in hero section
- Cadence: every new site automatically gets a unique branded video, no manual work

---

## Composition contract (proposed standard)

Every recipe in this catalog should follow this prop shape so they're interchangeable in Media Studio's queue:

```ts
type CompositionProps = {
  // Always present
  brandContext: {
    primary: string;       // hex
    secondary: string;
    accent: string;
    logoVariant: "luminous" | "dark";
    famVariant: "motion" | "original";
  };
  format: "16:9" | "9:16" | "1:1" | "4:5" | "21:9";
  duration: number;        // seconds

  // Recipe-specific
  content: Record<string, unknown>;
};
```

This lets Media Studio queue any composition with the same API call shape.

---

## Notes

- **Cost discipline:** muapi handles all generation. Remotion handles all composition. No `@remotion/openai-whisper` (would duplicate muapi transcription + add OpenAI API fees).
- **Brand consistency:** every composition starts with the FAMtastic signature lock-up. Hard-coded; cannot be disabled. This is the brand promise mechanism.
- **Reusability:** compositions are the moat. Each one shipped here is reusable across every site, every product, every brand variant — forever.
- **License:** Remotion is free at FAMtastic's current size (≤3 people). When team scales, see [LICENSE.md](https://www.remotion.pro/license).
