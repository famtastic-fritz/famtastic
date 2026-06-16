# AI Result Comparison — Cross-Cutting Brief

**Status:** draft for review
**Type:** Cross-cutting pattern (applies inside Creation Canvas and any surface where AI returns N alternatives)
**Companion mockup:** `docs/design-research/cross-cutting/03-ai-result-comparison-mockup.html`
**Inherits:** `docs/design-research/cross-cutting/01-chrome-collapse.md`, `02-glass-slide-out.md`
**Parent page-type:** `docs/design-research/page-types/02-creation-canvas.md`
**Visual rulebook:** `docs/STUDIO-UI-FOUNDATION.md` §2 Night Scheme

---

## 1. Intent

> *"lets look into how we can handle display option from ai prompt returns to compare"*
> — Fritz, 2026-05-05 (capture: `cap_creation-product-design-direction-2026-05-05.md`)

When AI returns N alternatives — 6 image variants, 4 code completions, 3 video drafts, 2 copy options — the user is in a *judgment* mode, not a *creation* mode. They've already paid (latency, money, attention) for the spread, and the question is no longer "make me something" but "*which one*?". The job of the comparison surface is to make that judgment fast, fair, and reversible.

A bad comparison UX makes the user pick the first acceptable result and move on (decision fatigue). A good comparison UX rewards looking carefully — surfaces difference, preserves context, and lets the user shortlist, A/B, and ultimately *commit* with a record of why.

Three rules bind every comparison surface:
1. **The artifact wins, the chrome doesn't.** Comparison must not crowd what's being compared.
2. **Difference must be perceivable in one glance.** No spot-the-difference puzzles.
3. **Choosing is a recorded act.** "I picked variation 02 because…" is metadata Shay-Shay must hold.

---

## 2. Product references

### 2.1 Midjourney — 4-up grid + variations
**Pattern.** Single prompt produces a 2×2 quad. U1–U4 upscale, V1–V4 spawn variations of that tile, ↻ regenerates the whole quad.
**Get right.** Quad-as-default forces a real comparison (not just "approve the first one"). Per-tile actions (upscale / vary / regen) are inline corner buttons, not a separate panel.
**Adapt.** We adopt corner action chips per tile (regen / promote / compare / shortlist). We adopt "vary from this one" as a per-tile action.
**Reject.** Discord chat as the carrier — anti-FAMtastic. We never show other operators' work or social noise.

### 2.2 Leonardo AI — generation row + variant tray
**Pattern.** Each prompt creates a horizontal "generation row" of 4 tiles; rows stack chronologically. Click a tile for a hero view with metadata + per-variant controls. Credit balance and per-image cost shown above.
**Get right.** Generation lineage is *visible* — you can see your last five attempts and compare across runs, not just within one run. Per-image credit cost is honest and persistent.
**Adapt.** History section in our right rail mirrors the row-stack pattern (collapsed by default; expand to compare across runs). Cost-per-variant chip on every tile.
**Reject.** Leonardo's settings drawer bloats the right side. We keep tools in the existing right-rail Tools section, not a parallel surface.

### 2.3 OpenAI Playground — completion compare
**Pattern.** Side-by-side text completions in equal columns; difference highlighting via background-tint on changed sentences; a "best of N" picker.
**Get right.** Sentence-level diff for text. Equal-column layout enforces fair attention.
**Adapt.** For copy / text generation, we use sentence-level background tint plus a "diff toggle" per pair. Side-by-side defaults to 2-up; 3-up for finalist rounds.
**Reject.** Playground is a developer tool — exposes raw token settings. We surface a single "tone" / "voice" chip set instead.

### 2.4 Cursor — inline diff with per-chunk accept
**Pattern.** Code suggestion appears as a colored diff band inside the editor; user accepts/rejects per hunk with kbd shortcuts.
**Get right.** Decisions happen *in context*. The user doesn't leave the artifact to choose. Per-hunk granularity respects partial wins.
**Adapt.** Code-modality comparison renders as inline diff overlays on a single canvas, not a 6-tile grid. Accept-per-chunk is the selection mechanic for code.
**Reject.** Cursor's "always show suggestion" can be intrusive. Our comparison is invoked, not pushed.

### 2.5 Adobe Firefly — slider compare
**Pattern.** Two image variants overlaid; a vertical drag handle reveals A on one side and B on the other. Used heavily for before/after generative-fill edits.
**Get right.** Slider-compare is the highest-fidelity way to evaluate two images of the same composition (lighting tweaks, generative fill, upscales).
**Adapt.** We add slider-compare as an explicit mode for any 2-up finalist when the variants share composition. Drag handle uses the warm-glow hover treatment.
**Reject.** Firefly's modal-only slider locks the rest of the UI. Ours is in-canvas and reversible without a route change.

### 2.6 Figma — branching / version compare
**Pattern.** Version history sidebar; pick any two versions and "compare" yields a side-by-side render with a difference overlay toggle.
**Get right.** Compare is *between any two artifacts in history*, not just adjacent ones. Annotation per version.
**Adapt.** Our shortlist multi-select (`Shift+1–6`) functions as a "pick the two/three to compare" mechanic. Annotations live in Shay's per-variant note.
**Reject.** Figma's compare is read-only; ours has to support "pick this one and promote" inline.

### 2.7 Loom — side-by-side video comparison
**Pattern.** Two videos play in sync, scrubbing one scrubs both; speed control shared.
**Get right.** Sync-play is non-negotiable for video comparison — frame-by-frame divergence is the whole point.
**Adapt.** Video modality requires sync-scrub across all visible variants in 2-up or 3-up mode. Spacebar plays/pauses all.
**Reject.** Loom's commenting layer is per-frame chat — heavy. We use a single Shay annotation per variant, not threaded comments.

---

## 3. The comparison taxonomy

Comparison patterns categorized by what they're best for:

### Grid view (N-up, default landing)
- **Best for:** ≥4 variants, low-attention scan, "which 2–3 are even worth a closer look?"
- **Avoid when:** N ≤ 2 (use side-by-side instead) or modality is code/text where tile-size hides difference.
- **Interaction.** 2×2 / 2×3 / 3×3 layouts. Hover reveals corner actions. Click focuses (hero+thumbs); `Shift+click` shortlists.

### Side-by-side (2-up or 3-up)
- **Best for:** finalist evaluation; equal-column attention.
- **Avoid when:** variants differ in aspect ratio (forces letterboxing → unfair).
- **Interaction.** Triggered by `C` from grid, or by "compare shortlist" once 2–3 are checked. Columns sized equally; both update on prompt edit if regenerated together.

### Hero + thumbnails
- **Best for:** focused review of one with quick lateral switching; "scrubbing" through N.
- **Avoid when:** the user needs to compare two *simultaneously* (use side-by-side).
- **Interaction.** ◀ ▶ keys; `1–6` jumps to that variant; selected tile becomes hero (60% width), others compress to a vertical strip on the canvas right edge.

### Slider compare (overlay drag)
- **Best for:** two images of the *same composition*; before/after; upscale vs. original.
- **Avoid when:** compositions differ (the slider becomes meaningless), or for video/code/text.
- **Interaction.** Vertical drag handle in the middle by default. Drag left/right to reveal the A or B side. `S` swaps which side is A. ESC exits to side-by-side.

### A/B picker (modal swap)
- **Best for:** focused single decision; "I'll commit to one of two right now."
- **Avoid when:** more than two finalists or when context outside the pair matters.
- **Interaction.** Two large tiles, no other chrome. Keyboard `A` / `B` picks. Auto-records pick reason if Shay has prior context.

### Difference highlighting
- **Best for:** text diff, code diff, attribute diff (component props).
- **Avoid when:** images or video — diff overlays produce noise more than signal.
- **Interaction.** Per-modality renderer. Text uses sentence-tint; code uses Cursor-style colored gutter; props use a key/value table with changed rows tinted.

### Variant timeline
- **Best for:** video; comparing the same moment across N variants.
- **Avoid when:** non-temporal modalities.
- **Interaction.** Single shared scrubber drives all visible variants. Keyframe markers per variant overlaid.

### Stack with overlay
- **Best for:** showing variants on top of each other (component layout shifts; subtle layout differences).
- **Avoid when:** sharp visual differences — overlay washes them out.
- **Interaction.** Z-stack with opacity slider; hold `Alt` to flip top vs. bottom.

---

## 4. Modality-specific patterns

### 4.1 Image
Grid view default (2×3 for 6 variants). Click → hero+thumbs. `C` → side-by-side 2-up using shortlist (or auto-pair if exactly two are shortlisted). Slider-compare mode available when 2-up is active and the two variants share aspect+composition. Preserve aspect ratio; never letterbox in the grid (use object-fit: cover with hover-zoom). Cache thumbnails so re-entering compare mode is instant.

### 4.2 Video
Variant timeline is the dominant pattern. Never default to autoplay-all (CPU). Tap any tile to load+play; spacebar to sync-play all visible variants. Shared scrubber sits below the grid; per-variant keyframe markers shown on the scrubber. In 2-up sync-play mode, both videos share frame count and FPS — mismatch warns before entering.

### 4.3 Code
No grid. Single canvas with inline diff overlay. Variants stack as collapsible chunks ("Variant A", "Variant B") with accept-per-chunk affordance. `Tab` cycles through diff hunks. Whole-snippet swap available via `S`. For >3 code variants, use the hero+thumbs pattern with a code-tile-as-thumbnail (first 5 lines preview).

### 4.4 Text / copy
Side-by-side default (text doesn't grid well — too much reading). Sentence-level background tint flags differences. "Tone slider" (formal ↔ casual) re-renders both columns through the same axis for fair comparison. For ≥4 text variants, use hero+thumbs with the first sentence as the thumbnail label.

### 4.5 Audio
Waveform grid (all variants stacked vertically as waveform strips). Click any to solo-play; `Shift+click` adds to playlist for sequential A/B; spacebar plays all in sync (sync-play). Per-clip duration must match for sync-play (warn otherwise).

### 4.6 Design (component / layout)
Render preview compare in 2-up or 3-up. Below each preview, a prop-diff table shows which props differ (changed rows tinted). Responsive variant: a width-toggle (`375 / 768 / 1280`) re-renders all visible variants at the same breakpoint for fair comparison.

---

## 5. The Shay-Shay annotation layer

Per the parent Creation Canvas brief, Shay lives in (a) the top-bar presence dot and (b) the right-rail Shay panel. For comparison surfaces, we add a third surface:

**Per-variant Shay sticky.** A small glass card overlay (top-right of the focused tile) holding Shay's one-line "why this one" annotation. Visible only when:
- The tile is the *currently selected* variant, OR
- The user explicitly toggles "show Shay notes on all" (`Shift+?`).

**Right-rail running commentary.** When the right rail is open, the Shay panel shows her commentary across the *whole batch* — a paragraph per variant in collapsible cards, with the selected variant's card auto-expanded. This is where she ranks, contrasts, and recommends.

**On-demand "ask Shay why" button.** A small `?` chip in each tile's corner-action stack. Clicking it asks Shay to generate a fresh per-variant annotation without entering the rail. Result lands in the per-variant sticky.

**Rationale for three surfaces (not one).** The sticky is *glance*; the rail is *deliberation*; the ask-button is *summon*. Forcing all annotations into the rail means the user has to break gaze from the artifact to read what Shay thinks — that violates "the artifact wins." A glance-surface on the tile keeps eyes on the work.

---

## 6. The cost / quality / time triple

Every AI result has cost. Comparison surfaces must surface cost honestly without making it the loudest signal.

**Per-variant cost chip.** Bottom-left of every tile, in JetBrains Mono 10.5px, color `--text-3`. Format: `$0.04`. Hover reveals model, latency, and token/pixel count.

**Batch total.** Pinned to the bottom of the right rail (existing Cost section per the parent brief). Format: `$0.24 · 6 variants · 12.3s`.

**Estimated cost before regen.** When the user hovers the regen action on a single tile, a tooltip shows `$0.04 to regenerate this`. When the user hovers the batch regen, `$0.24 to regenerate 6`. This is honest and prevents "oh no I just spent X" moments. (Reference: Midjourney's GPU minutes; Leonardo's credit display.)

**Cost is never red.** Cost data is informational, not alarming. Color is `--text-3` (dim) until the batch crosses a session-budget threshold, at which point the chip warms to `--glow-warm` (not red — we don't shame spending).

**Cost lineage in History.** Each prior-run row in the History section shows the run's cost so the user can see "I've spent $1.80 on this hero so far across 5 runs."

---

## 7. Selection mechanics

How does a user mark "this is the winner"?

| Action | Mechanism | Keyboard |
|---|---|---|
| Focus a variant (preview / hero) | Click tile, or `1`–`6` | `1`–`6` |
| Add to shortlist | `Shift+click` tile, or `Shift+1`–`6` | `Shift+1`–`6` |
| Remove from shortlist | Same as add (toggle) | `Shift+1`–`6` |
| Enter compare (uses shortlist or focused) | `C` | `C` |
| Set as winner | Promote action (★) on tile, or `S` while focused | `S` |
| Pin / unpin a variant (keep around even after regen) | 📌 corner action | `P` |
| Regenerate selected variant | ↻ corner action, or `R` while focused | `R` |
| Regenerate whole batch | Batch ↻ in prompt strip | `Shift+R` |

**Multi-select for shortlist** is the mechanic that bridges grid → compare. The user checks 2–3, hits `C`, lands in 2-up or 3-up. Without a shortlist, `C` defaults to "compare focused vs. previously-focused."

**Winner-locked state.** When `S` is pressed, the tile gets a sustained warm halo (per parent brief §6 "Approved & saved"), the prompt strip clears, and a toast confirms `promoted to library · staged for use`.

---

## 8. Workflow integration

After selection, what happens?

1. **Save to library.** Default behavior. Selected variant lands in the Media library (or Components library, etc.) with full metadata (prompt, model, cost, run timestamp, Shay's annotation).
2. **Promote to canonical asset.** "Set as canonical hero asset for site `<tag>`" — a one-click action in the post-selection toast that wires the asset into the active site's brief and triggers the surgical-edit pipeline (existing FAMtastic capability per `famtastic-dna.md` §3 logo wiring pattern).
3. **Create a build task.** Spawn a `dispatch_worker` task to regenerate the affected page with the new asset (reuses the worker queue per `famtastic-dna.md` Session 12 Phase 2).
4. **Lineage preserved.** Non-winner variants stay in History (collapsed) so the user can revisit. Pinned variants (📌) survive batch regen.

The promote-to-build flow is the FAMtastic-distinctive part: a creative judgment immediately becomes a build action without a context switch.

---

## 9. State map

| State | Canvas | Right rail Shay | Cost section | Notes |
|---|---|---|---|---|
| Empty (no generation yet) | Fraunces hero "What are we making?" | hidden | shows `$0.00 · 0 gens` | Inherits parent brief empty state |
| Generating | 4-up or 6-up shimmer; tiles fill in as they arrive | hidden until first arrival, then auto-opens with a "generating commentary…" placeholder | ticks live | Per-tile shimmer; per-tile "rendering N/6" pill |
| All-rendered, none-selected | Full grid; no halo | shows batch overview ("six variants in; 02 reads warmest…") | totals settle | Default "judgment mode" |
| One selected, others visible | Selected tile halo'd; others dimmed 8% | auto-expands the per-variant card for selected | unchanged | Per-variant Shay sticky on selected tile |
| Shortlist (multi-select) | 2–3 tiles checked (corner ✓); rest dimmed 12% | shows comparative paragraph across the shortlist | unchanged | `C` armed |
| Finalist 2-up | Two tiles fill canvas in equal columns; grid hidden | per-variant cards for both, side-by-side | unchanged | `S` promotes focused side |
| Finalist 3-up | Three equal columns | three per-variant cards | unchanged | Tighter type scale |
| Slider compare (2-up only) | Single overlay with drag handle | active variant determined by handle position | unchanged | Toggle off → returns to 2-up |
| Hero + thumbs | Hero 60% + thumb strip on canvas right edge | per-variant card for hero | unchanged | ◀ ▶ to scrub |
| Winner-locked | Sustained warm halo on winner; others fade to History | locked card; promote actions surfaced | locked total | Toast: "promoted · staged for use" |
| Regenerating (single variant) | Selected tile shimmers; others stable | "regenerating 02 — keeping the dusk light, more confetti" | adds the regen cost preemptively | Lineage line drawn from old → new in History |
| Regenerating (whole batch) | All tiles shimmer; pinned variants survive | "starting fresh — pinned 02 as the floor" | full-batch cost preview | History row for the prior batch finalized |

---

## 10. Cross-modal patterns we haven't solved yet

Open questions to resolve in follow-on work:

1. **Image vs. video (still vs. moving).** When one variant is a video and another is a still keyframe of the same composition, how do we present them fairly? Defer — likely handled by upgrading the still to a 1-frame video.
2. **Code vs. rendered output.** Compare a generated component's code against its visual render — is that two surfaces side-by-side, or two tabs in one column? No clear precedent.
3. **Subtle-difference copy A/B.** Two paragraphs that differ only in 4 words — does sentence-tint suffice, or do we need word-level diff? OpenAI Playground tints whole sentences; we may need finer.
4. **N > 9 variants.** Our taxonomy assumes N ≤ 9. For long-tail batches (24 image variants from a sweep), we likely need a Library-style scroll grid with persistent shortlist. Out of scope here.
5. **Cross-modal comparison (image + copy + code as a "page candidate").** A generated landing-page candidate is *all three at once*. How do we compare two candidate pages? Almost certainly belongs in a separate Page Candidate Compare brief.
6. **Audio + transcript.** Compare audio variants by waveform AND by what they say. Likely needs a dual-track display.
7. **Persisting "why" across sessions.** Shay's annotations need a lifecycle — when the user comes back tomorrow, do they see her old commentary, a fresh take, or both?

---

## 11. Acceptance criteria

An implementation passes review when:

1. **Default is grid.** The first state after generation is a 2×N grid using the parent brief's tile spec. No comparison mode is auto-entered.
2. **Comparison is a state, not a route.** `C`, click-to-focus, slider toggle — all transform the canvas in place. URL may carry `?compare=02,04` but no full nav.
3. **Three modes demonstrated.** Grid, side-by-side (2-up), and one of {slider-compare, hero+thumbs} are all reachable from the same canvas without leaving the page.
4. **Per-variant cost is visible.** Every tile shows its cost chip; the batch cost lives in the right-rail Cost section.
5. **Per-variant Shay sticky exists.** The selected variant always has Shay's one-line annotation visible on-tile.
6. **Keyboard parity.** Every selection mechanic (`1–6`, `Shift+1–6`, `C`, `S`, `R`, `P`, `Tab` for diff hunks) works without mouse.
7. **Shortlist persists across modes.** Switching grid → 2-up → grid does not lose the user's shortlist.
8. **Cost is never red.** Color stays in the dim/warm range; no alarm.
9. **Winner promotion is one click.** From winner-locked state, "promote to canonical" is a single action that triggers the existing build flow.
10. **Tokens come from STUDIO-UI-FOUNDATION.md §2.** No new colors, no new motion curves.
11. **Cites at least 5 product references in the implementation PR.** This brief lists 7; the PR must reference ≥5.

---

## 12. Known gaps

- **N > 9 variants.** No defined pattern; likely needs a separate "batch-grid" brief.
- **Cross-modal candidate compare (page-as-artifact).** Out of scope; needs its own brief.
- **Word-level diff for subtle copy A/B.** Sentence-tint may be too coarse.
- **Shay annotation lifecycle.** Persistence model across sessions undefined.
- **Sync-play for audio with mismatched durations.** Warn-and-block is the proposed behavior; not specced.
- **Pin-survives-regen storage.** Where pinned variants live in the data model is undefined.
- **Cost-budget threshold.** We say the chip warms when a session crosses a budget; the budget itself is unconfigured.
- **Mobile / narrow viewport.** This brief assumes desktop ≥ 1280px. Compare on narrow viewports is undesigned.
