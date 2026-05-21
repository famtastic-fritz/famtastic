# MBSH RSVP Hero — revB Amendments

Status: amendments to the approved 2026-05-14 direction doc. Original `mbsh-rsvp-hero-artboard-plan-2026-05-14.md` remains the canonical brief; this file captures four refinements made after inspecting the first composition draft.

## Amendment 1 — Harry positioned on the LEFT, not the right

Reason: Harry as the usher OPENS the path. The path leads INTO the form. With Harry on the left, his right hand presents the RSVP card and his left hand opens the velvet rope outward to the right — creating a left-to-right line of action that mirrors reading direction and visually invites the visitor into the form below. First draft had Harry on the right, which closed the path instead of opening it.

Update to layer 4:
- Harry stands in left-third of hero artboard
- Body angled three-quarter toward viewer, biased to face the right side of the frame (he is addressing the headline/form)
- RIGHT hand presents the gold RSVP card forward at chest height
- LEFT hand on the brass clasp of a crimson velvet rope; rope extends outward to HIS right, continuing past the hero edge as part of the bleed/bridge
- Lighting key from upper right (matching warm marquee glow)
- Background plate must reserve negative space on the LEFT for Harry (flipped from first draft)

## Amendment 2 — Scene marker mounted bottom-LEFT; bleed flows past on the right

Reason: the marker must feel physically present in the scene AND be positioned so the bleed bridge can flow past it into the form section below.

Update to layer 5:
- Position: bottom-left quadrant of hero artboard
- Reads as physically mounted to the scene (set into the floor, attached to the podium base, or mounted on a wall element) — not a floating UI plaque
- Red carpet + velvet rope bleed continues from the hero scene → past the right edge of the marker → into the form section below
- Marker acts as a threshold: visually marks the hero edge, but the bleed deliberately violates it for visual continuity

## Amendment 3 — Composite is one named recipe: `cinematic-interior-hero`

The hero + scene marker + bleed bridge function as ONE conceptual unit, and the same composition applies to all interior pages (RSVP, Tickets, Through-Years, Memorial, Capsule, Playlist). RSVP is the first instance; the other interior pages reuse the same recipe with different scene content and dynamic marker text.

In the FAMtastic skill library this is `cinematic-interior-hero`, the interior-page (~70vh) sibling of `cinematic-hero` (100vh + curtain ritual variant used by Home).

Configurable inputs per page:
- scene-plate-src
- harry-pose-src
- marker-text
- prop-overlays
- bleed-direction
- continue-target

## Amendment 4 — Generate TWO Harry style variants in this pass

Reason: first draft rendered Harry in a 3D-glossy style rather than the F1 live-action costumed-mascot style. Fritz has not yet decided between F1 photoreal and 3D-rendered for interior heroes. Generate both on the same approved background plate and decide from composed comparison.

Two Harry assets, both transparent cutouts, same new pose (left-positioned, right-hand RSVP card, left-hand rope opening to the right):
- Variant A — F1 LIVE-ACTION COSTUMED MASCOT. Primary anchor: F1 photoreal mascot proof asset. Anti-fail: must NOT read as smooth 3D-rendered Pixar CGI.
- Variant B — 3D-RENDERED PHOTOREALISM. Primary anchor: first-draft 3D Harry if available, cartoon anchors as fallback. Anti-fail: must NOT read as a flat 2D illustration.

End amendments.
