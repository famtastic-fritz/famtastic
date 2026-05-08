# MBSH Premiere — V2 Learnings & Patterns

**Captured:** 2026-05-08, immediately before production merge.
**Source:** Pass 11 + 12 + 13 implementation arc plus the audit + viewport
composition + footer-scene revisions.
**Purpose:** carry the hard-won lessons + the patterns that emerged into V2
so they don't have to be rediscovered.

The V2 site (or any FAMtastic Studio site that adopts the Premiere theme)
should start from these decisions rather than rebuild them.

---

## 1. The placement rule (canonical)

| Slot | Placement | Element |
|---|---|---|
| Menu medallion | **Centered top** (fixed, `top: env(safe-area-inset-top)`, `left: 50%`) | `.premiere-medallion` |
| In-scene character / page graphic | **Bottom-left** of the section | `.harry-in-scene--anchor-bottom-left` |
| Chat / assistant | **Bottom-right** of the viewport (fixed) | `.chatbot__bubble` |

**Why:**
- Centered medallion reads as the proscenium seal — the ceremonial entry to
  every scene. Both-thumb friendly on mobile.
- Splitting "in-scene Harry" left and "chat Harry" right removes the
  duplicate-corner-Harry render glitch we hit twice in P1 → P12.
- Predictability lets users learn one site, not seven.

**Rule:** never put two Harrys in the same visual zone. If a section needs
both an in-scene character AND a chat trigger visible at the same time,
they live in different corners. Period.

---

## 2. Section archetype system

Three modes; every top-level section gets exactly one. JS auto-tagger sets
`data-mode` at init.

| Mode | Min height | Snap | Down chevron | Up chevron | In-scene Harry |
|---|---|---|---|---|---|
| `scene` | `100dvh` | `start` | yes | yes | allowed (bottom-left) |
| `sequence` | auto | none | **skipped** | yes | **refused — auto-reroute to nearest Scene** |
| `tease` | `50dvh` | `start` | yes | yes | allowed (bottom-left) |

`scroll-snap-type: y proximity` site-wide. Mandatory snap fights long forms.

**V2 takeaways:**
- Form-bearing sections are always Sequences. Don't try to compress a
  14-field form into 100dvh.
- Short anchor sections (200–500px) are Teases — dressed with a slate +
  small atmospheric element, not stretched.
- The footer is a Scene (the Final Reel). It's the closing credit roll.

---

## 3. The Final Reel footer pattern

The footer is the closing scene of the experience. Vocabulary:

```
[scarlet→gold curtain rail]
  Centered seal medallion (brand-mark-foil), 100–140px
  Cinzel uppercase eyebrow:    "MBSH · 1926 — 2026"
  Italiana italic line:        "Class of 1996 · 30th Reunion"
  Allura cursive motto, gold:  "Let us be known for our deeds."
  ─── thin gold rule ───
  "— A FINAL CREDIT ROLL —"
  Reunion Committee · email
  Visit · RSVP · Tickets · Through the Years · ... (sitemap as credits)
  Official Site · Submit a memory · Become a sponsor (resources)
  Italic coming-soon note for social
  ─── thin gold rule ───
  "— ENCORE —"
  © Copyright
  FAMtastic Studio credit
[scarlet→gold curtain rail]
```

Single centered column. Desktop full-viewport, mobile auto-height. The
upgrader rewrites the legacy 3-column footer at runtime so HTML doesn't
have to change per page.

**V2 takeaways:**
- Footer should NEVER ship as default-CMS three-column-grid on a designed
  cinematic site. It will read as an afterthought every time.
- Treat the footer as a Scene. Give it a slate, give it the seal, close
  the curtain.

---

## 4. FX overlay calibration

The film-grain / vignette / light-leak overlay is supposed to be subtle.

**Spec:** `opacity: 0.08`, `z-index: 1`, `pointer-events: none`,
`mix-blend-mode: overlay`.

**Drift trap:** during early animation tuning, opacity crept to 0.55. At
that level the noise pattern crushed contrast on dark sections (footer
went black on desktop, memorial reverence muddied). We caught it twice.

**V2 takeaway:** lock these values in CSS variables and only tune via the
variable. Add a smoke test that asserts opacity ≤ 0.15.

---

## 5. The Harry asset pipeline

**Standing:** every Harry pose used on the site must be RGBA with a
transparent background. Never RGB.

**The trap:** AI-generated poses ship as RGB by default. Without a
`rembg` / matting pass, they render with a near-white halo — visible
inside red circle bubbles, on dark scenes, anywhere the figure isn't
on the same color as the source plate.

**V2 takeaways:**
- Bake `rembg` into the asset pipeline. Don't accept any pose into the
  registry without an alpha channel check.
- File-size jump from RGB 1.5 MB → RGBA 350 KB is a useful side-effect
  of cleaning the cutouts; both signals point at quality.
- Audit table format proven in P12 closeout: file × page × source ×
  status × fix.

---

## 6. Form readability standard

Forms on dark scenes need explicit theming. Default CMS `<input>` styles
render black-on-cream and become black-on-near-black on a Premiere page.

**Spec:**
- Label: cream, `0.95rem`, uppercase, weight 500
- Input: cream text on glassy panel (`rgba(255,255,255,0.07)`), 16px font
  (iOS no-zoom guard), gold-tinted border
- Placeholder: 45% cream, italic (softer than entered text but still
  visible)
- `<select>` options: cream-on-cream-bg (light theme) so the dropdown
  reads against OS chrome
- Focus ring: gold + `box-shadow: 0 0 0 3px rgba(247,183,51,0.18)`

**V2 takeaway:** apply once at the site root, not per-page. We hit this
because the original rule scoped to rsvp/tickets/through-years and missed
capsule + playlist when those forms got added later.

---

## 7. Standardized Harry info-slide pattern (V2 candidate, not built)

A reusable component for any moment when Harry needs to explain something:
who he is, how the menu works, an updated piece of information, a
navigation hint.

**Concept:**

```
┌─────────────────────────────────────────────┐
│                                             │
│   [Optional eyebrow] — A note from Harry —  │
│                                             │
│   ┌───────────────────────┐    ┌────────┐   │
│   │                       │    │        │   │
│   │   Message title       │    │ Harry  │   │
│   │                       │    │ pose   │   │
│   │   Message body in     │    │        │   │
│   │   Cormorant italic.   │    │ (right)│   │
│   │   Three lines max.    │    │        │   │
│   │                       │    └────────┘   │
│   │   [Optional CTA]      │                 │
│   │                       │                 │
│   └───────────────────────┘                 │
│                                             │
└─────────────────────────────────────────────┘
```

**Variant rules:**
- **Character on the right** (mirror of in-scene Harry's left placement —
  this is a Harry-led moment, his face is the focus, message reads to his
  left).
- Message area:
  - title (Playfair / Italiana, ~1.4rem)
  - body (Cormorant italic, ~1rem)
  - optional CTA pill (Cinzel uppercase)
- Anchor either inline (replacing a section) or floating (modal-lite
  triggered from chat).

**Use cases:**
- "I'm Hi-Tide Harry. Tap me anytime."
- "The menu is the medallion at the top. Tap it for every page."
- "Heads-up — venue announcement just landed. Read more →"
- "Lost? Tap me, I'll walk you back to the lobby."

**Why we didn't build it in V1:**
- Time. The viewport composition + Final Reel footer were the
  blockers; V1 ships with the chatbot panel doing this job inline.
- Risk. Adding a fourth surface (medallion menu, chat panel, billboard,
  info-slide) right before production would invite drift.

**V2 implementation hooks:**
- `.harry-message` class scaffold can mirror `.billboard__slide` markup.
- Trigger registry keyed off URL hash (`#harry-help`, `#harry-menu`,
  `#harry-update-2026-05`) so links from anywhere can invoke a slide.
- Honor `prefers-reduced-motion` (no slide-up; instant fade).

---

## 8. Things that surprised us

| Surprise | Lesson |
|---|---|
| Mandatory snap fights mobile users on long forms | Use `proximity` not `mandatory`; declare archetype per section |
| Two corner Harrys is not "more Harry" — it's a render glitch | One Harry per visual zone |
| Hidden DOM elements still count for height & accessibility | Remove markup, don't just `display: none` |
| `100vh` lies on iOS Safari (URL bar + keyboard) | Always `100dvh` |
| `font-size: 15.2px` triggers iOS auto-zoom on focus | 16px minimum on every editable input |
| Footer as `<footer>` not `<section>` was invisible to the archetype tagger | Either tag it explicitly or expand the collector |
| Black-on-cream form labels migrated onto a black scene = invisible | Theme-aware form styles must be the default, not opt-in per page |
| Netlify build credits run out silently — pushes go to "skipped" without an alert | Check deploy state before assuming pushes landed |
| Curtain animation at 1.2s reads as "way too fast" — the eye wants to catch the title before the curtain lifts | Hold 55% then rise; total ~3.2s |
| Auto-advancing billboards need a manual override (dots) — auto-advance alone feels patronizing | Always pair with manual nav |

---

## 9. Post-launch backlog (low-risk, post-merge)

These are intentionally NOT in the launch scope. Captured here so V2 can
pick them up without re-discovery.

1. **Through-Years archival reel.** Real era photos + horizontal filmstrip
   pin animation. Replaces the coming-soon poster.
2. **Spotify playlist ID.** Drop the real ID into `playlist.html` and the
   embed lights up. (Decision D13.)
3. **iOS S22 chevron click.** Diagnose the platform-specific
   scroll-snap interaction; works on localhost desktop, parked on Fritz's
   phone.
4. **Sponsorship 5-tier mobile carousel.** Currently a 1867px Sequence on
   mobile; horizontal `scroll-snap-x` carousel would help.
5. **Real Instagram + Facebook handles** when they land (replace the
   coming-soon italic note in the Final Reel footer).
6. **Memorial names** when committee finishes verification — empty-state
   copy already sets expectation.
7. **Scene-filler atmosphere on Tease sections** ("Why now", "Why it
   matters", "The promise") — small Cinzel slate + light-sweep.
8. **Harry info-slide pattern** (§ 7 above).
9. **Smoke test for FX opacity drift** (§ 4 above).
10. **Real archival imagery for Through-Years** + retire the abstract
    `assets/story/era-*.jpg` placeholders.

---

## 10. Standing decisions (do not relitigate without cause)

- Centered medallion ✓ (R20-era decision, made permanent in P11)
- Three-archetype section system ✓
- Snap proximity, not mandatory ✓
- Final Reel footer is a Scene ✓
- One Harry per visual zone ✓
- Form labels uppercase Cinzel-ish, 0.95rem ✓
- 16px input font-size minimum ✓
- `.premiere-fx` opacity 0.08 (NOT 0.55) ✓
- `.hero__harry` markup removed; the chat bubble is the only corner Harry ✓
- Through-Years ships in coming-soon poster mode for V1 ✓

---

**End of V2 learnings.** Carry these forward. The next version starts from
these as defaults, not as proposals.
