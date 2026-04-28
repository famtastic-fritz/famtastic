# Hi-Tide Harry — Character Sheet Spec

**Status:** Pre-generation lock document
**Captured:** 2026-04-27
**Reference image:** `chatgpt-canonical-2026-04-27.png` (the approved rendering — save filename as canonical)

---

## Canonical Identity

Hi-Tide Harry is the original mascot of Miami Beach Senior High School — a friendly cartoon hero with solid red skin, large round black eyes on white sclera, pointed elf-style ears, and a swept red quiff falling forward over his forehead. He wears a white tee with "Hi-Tide Harry" in red script across the chest, a flowing silver cape clasped at the collar, a slim red bodysuit, black wristbands, and black shoes with red-and-white striped soles. Cell-shaded illustration style with heavy black outline. Athletic hero proportions, warm expression, ready energy. Original character — not derived from or based on any existing intellectual property.

He is the visual ambassador for the school's spirit, the chatbot persona for the reunion site, and the canonical Hi-Tide Harry going forward.

---

## Physical Anatomy (Lock)

| Feature | Spec |
|---|---|
| Head shape | Round, slightly elongated top with swept quiff/cowlick falling forward |
| Head proportion | ~40% of total body height (chibi-leaning hero proportions) |
| Ears | Pointed elf-style, set high, ~50% head height, red |
| Eyes | Large round black pupils on white sclera, slight tilt for friendly expression |
| Eyebrows | Thin black, expressive |
| Nose | Small black button |
| Mouth | Curved smile, simple line |
| Cheeks | Subtle red flush |
| Skin | Solid red (matches school primary) |

## Body

| Feature | Spec |
|---|---|
| Build | Slim athletic, hero proportions (not muscular, not chibi) |
| Torso | Standard, balanced |
| Arms | Red, slim, with black wristbands |
| Hands | Red, three-finger or four-finger gloves (lock one, stay consistent) |
| Legs | Red bodysuit, slim |
| Feet | Black shoes with red-and-white striped soles (signature detail) |

## Costume

| Element | Spec |
|---|---|
| Tee shirt | White, "Hi-Tide Harry" wordmark in red script across chest |
| Wordmark | Bold script/handwritten style, red on white |
| Cape | Silver/metallic gray, draped behind, flowing |
| Cape collar | Black band with silver clasp accents |
| Bodysuit | Red, full coverage |
| Wristbands | Black, both arms |
| Shoes | Black with red/white striped soles |

## Color Palette (Lock)

- **Primary red:** Match MBSH school red (sample from canonical image)
- **White:** Pure white for shirt, eyes, stripe
- **Silver:** Cape — metallic with gradient/sheen, NOT flat gray
- **Black:** Outline, shoes, wristbands, eye pupils

No other colors permitted in the character. Background can vary (transparent PNG default).

---

## Rendering Style (Lock)

| Element | Spec |
|---|---|
| Line work | Heavy black outline, consistent weight |
| Shading | Cell-shaded with one shadow tone; subtle gradient on cape |
| Highlights | Small white reflections on hair/quiff and shoes |
| Background | Transparent OR pure white (specify per generation) |
| Style reference | Underdog × Astro Boy × modern mascot illustration |
| NOT | Photoreal, 3D-rendered, Pixar-style, anime-shaded |

---

## Personality (Drives Pose/Expression Choices)

- Heroic but approachable
- School-spirit confident, never arrogant
- Friendly chatbot face — leads with warmth
- Speed/energy when moving (cape flow, dynamic pose)
- Calm/steady when listening or thinking
- Miami Beach attitude — fun, sun-soaked, never stiff

---

## Pose Library — 25 Required for Chatbot

Group by chatbot use case:

### Greeting & Idle (5)
1. **Wave hello** — friendly side wave, smiling
2. **Standing greet** — both feet planted, slight smile, hands at sides
3. **Cape flourish** — turning toward viewer, cape swept with motion
4. **Thumbs up** — affirmative gesture
5. **Salute** — two-finger casual salute

### Speaking & Communicating (5)
6. **Talking gesture** — one hand raised mid-explanation
7. **Pointing forward** — directional, "look here"
8. **Pointing up** — "up there" / "important"
9. **Listing on fingers** — counting points
10. **Hand on chin** — thoughtful, mid-sentence

### Thinking & Reasoning (4)
11. **Chin scratch** — thinking
12. **Looking up pondering** — eyes up, thinking pose
13. **Reading clipboard/scroll** — looking down at info
14. **Hand on hip, head tilt** — considering

### Reactions (5)
15. **Excited cheer** — both fists up, big smile
16. **Surprised** — eyes wide, hands up
17. **Confused shrug** — hands palm-up, slight frown
18. **Apologetic** — slight bow, hand to chest
19. **Disappointed** — head down, hand at side, "I don't know that"

### Action & Energy (4)
20. **Running** — full motion, cape flowing back
21. **Jumping** — mid-air, arms up
22. **Pointing dramatically** — heroic stance, finger out
23. **Power pose** — fists at hips, chest out, cape spread

### Special / Site-Specific (2)
24. **Holding diploma/scroll** — for Legacy section
25. **At microphone** — for "addressing the class" / event content

---

## Generation Settings

### Tool path
- **Primary:** Imagen 4 with seed lock + style reference image
- **Backup:** Leonardo.ai with character LoRA-style consistency
- **Test first:** 5 poses before committing to all 25

### Per-generation prompt template
```
Hi-Tide Harry, the official mascot of Miami Beach Senior High School.
Original cartoon hero with athletic proportions: pointed elf-like
ears, red swept quiff/cowlick on top of round red head, silver flowing
cape, white tee with "Hi-Tide Harry" red script wordmark, red bodysuit,
black shoes with red-and-white striped soles, black wristbands.
Cell-shaded with heavy black outline, friendly expression, large black
eyes on white sclera. School colors: red, white, silver.

POSE: [insert specific pose from library]

Style: matches the canonical reference image. Transparent background.
Fully original character — original IP only.
```

### Negative prompt elements
```
NOT: photorealistic, 3D rendered, Pixar style, anime shading, blue color,
yellow color, animal mascot,
existing trademarked character, blurry, text watermark, signature,
multiple characters, background scene, complex environment.
```

### Consistency parameters
- **Seed:** Lock once first acceptable generation lands
- **Style strength (IP-Adapter):** 0.7–0.85
- **Aspect ratio:** 3:4 portrait or 1:1 square (lock per use case)
- **Resolution:** 2048×2048 minimum for chatbot use, downscale per slot

---

## 5-Pose Test Set (Generate First)

Before committing to all 25, generate these 5 to verify style consistency:

### Test 1 — Greeting Wave (baseline check)
```
[Base prompt] POSE: standing facing viewer, friendly side wave with right
hand raised at shoulder height, left hand at side, big warm smile, cape
hanging straight behind. This is the chatbot's "hello" pose.
```

### Test 2 — Thumbs Up (gesture check)
```
[Base prompt] POSE: standing facing viewer, right hand giving a confident
thumbs up at chest level, left hand on hip, big smile, cape flowing
slightly to the side. This is the chatbot's "got it" pose.
```

### Test 3 — Hand on Chin Thinking (subtle expression check)
```
[Base prompt] POSE: standing in three-quarter view, right hand on chin in
classic thinking pose, eyes looking slightly up and to the side,
contemplative expression with subtle smile, cape hanging straight. This
is the chatbot's "let me think" pose.
```

### Test 4 — Excited Cheer (high-energy check)
```
[Base prompt] POSE: both arms raised overhead in victory cheer, both
hands in fists, jumping slightly with feet just off the ground, cape
flowing dramatically behind, mouth open in big excited smile, eyes
bright. This is the chatbot's "celebration" pose.
```

### Test 5 — Disappointed Hand-Down (negative emotion check)
```
[Base prompt] POSE: standing facing viewer, slight slouch, hands at sides,
head tilted slightly down, small disappointed frown, cape hanging limp.
This is the chatbot's "I don't know that" pose.
```

### Why these 5
- **#1** locks the canonical baseline — must match reference image exactly
- **#2** tests gesture consistency — does hand pose stay on-model
- **#3** tests subtle expression — does the face read "thinking" without exaggeration
- **#4** tests high-energy / cape motion — does dynamic motion stay on-model
- **#5** tests negative emotion — does the character read sad without losing identity

### Pass criteria for the test set
- All 5 are recognizably the same character
- Color palette stays locked (no drift to pink, orange, blue, yellow)
- Cape silver consistency (not flat gray, not white)
- Face identity holds (eyes, ears, quiff)
- Style consistency (line weight, shading)
- "Hi-Tide Harry" wordmark legible on shirt in all 5

If 4 of 5 pass, lock seed and proceed to remaining 20.
If 3 or fewer pass, refine prompt template before continuing.

---

## Storage & Naming

```
~/famtastic/sites/site-mbsh-reunion/assets/mascot/
├── canonical-reference.png        (the source image)
├── character-sheet.md             (this doc)
├── seed.txt                       (locked seed value once verified)
├── poses/
│   ├── 01-wave-hello.png
│   ├── 02-standing-greet.png
│   ├── 03-cape-flourish.png
│   ├── ... (numbered 01-25)
└── poses-thumbnails/              (small versions for chatbot UI)
```

---

## Standing Rules

1. **Never modify the canonical reference image** — it's the lock
2. **Every generation references the canonical image** as IP-Adapter input
3. **Failed generations get logged**, not just discarded — feeds learning loop
4. **Pose library is closed at 25** for v1 — additions go to v2 batch
5. **No name-drop poses** (e.g., "Harry standing next to a celebrity") — character carries himself
6. **Cape is silver, not gray, not white, not chrome** — defining feature
7. **Character is fully original IP** — call out explicitly in every prompt

---

## Next Concrete Action

1. Save canonical reference image to `~/famtastic/sites/site-mbsh-reunion/assets/mascot/canonical-reference.png`
2. Save this character sheet to same folder as `character-sheet.md`
3. Run the 5-pose test set through Imagen 4 with reference image as IP-Adapter input
4. Review test results against pass criteria
5. If pass: lock seed, generate remaining 20 poses
6. If fail: refine prompt template, re-test
