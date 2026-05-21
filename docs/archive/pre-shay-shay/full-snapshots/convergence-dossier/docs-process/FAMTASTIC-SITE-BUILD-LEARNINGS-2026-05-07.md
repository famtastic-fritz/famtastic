# FAMtastic Site Build — Learnings & Improvement Hooks

**Captured:** 2026-05-07
**Source project:** MBSH Premiere Experience
**Purpose:** Convert lessons from the MBSH build into reusable FAMtastic site-build process improvements.

---

## 1. Build complexity should be configurable, not mandatory

Multi-pass building is powerful, but it should not be mandatory for every site.

The build system should detect the type of site and choose the right process depth.

Examples:

- Simple static site: one-pass or two-pass build may be enough.
- Standard business site: design pass + build pass + QA pass.
- Event/experience site: multi-pass build with assets, motion, previews, and polish.
- Ecommerce/CMS site: content/admin/lifecycle passes become more important than cinematic motion.

The rule is not "every site must use multi-pass." The rule is "the builder must choose the right build mode and know what can be skipped."

---

## 2. Mandatory vs optional should be explicit

Every build should classify features as:

- Required for launch
- Required for theme consistency
- Optional enhancement
- Deferred polish
- Not applicable

Optional modules should never break the build when missing.

Examples of optional modules:

- custom assistant / mascot
- chatbot
- image generation
- animated typography
- cinematic motion
- scroll snap
- advanced page transitions
- generated backdrops

Examples of mandatory logic:

- theme consistency
- page purpose
- clear navigation
- responsive layout
- accessibility baseline
- preview before launch
- production approval gate

---

## 3. The builder should succeed with acceptable fallbacks

The build should recognize missing assets, missing keys, unavailable tools, or unsupported features.

If the missing item is optional, the builder should:

1. Log the gap.
2. Use an approved fallback.
3. Continue the build.
4. Mark the enhancement for a later pass.

If the missing item is mandatory, the builder should pause with a clear reason.

---

## 4. Theme consistency is a core gate

Every site should feel like one unified world.

The build process should check:

- Do pages match the same visual language?
- Do sections match the page purpose?
- Do generated images match the theme?
- Do icons, graphics, backgrounds, cards, and CTAs belong together?
- Does motion support the experience instead of distracting from it?
- Are visual assets relevant, not random?

Theme consistency should guide:

- AI image prompts
- graphics generation
- section layout
- animation style
- page transitions
- component styling
- CTA design

---

## 5. Shay / non-technical lifecycle test

For every site, ask:

"Can Shay manage this herself?"

This does not mean every site needs a CMS. It means the build should be honest about maintenance.

Classify content as:

- hard-coded and developer-owned
- editable by Fritz
- editable by a non-technical admin
- needs CMS/admin interface
- needs future automation

The handoff should explain what can be changed safely and who owns future updates.

---

## 6. Preview should be standard

Every site should have a preview step before production.

Minimum launch-preview requirements:

- preview URL
- what changed
- known gaps
- fallbacks in use
- QA summary
- launch blockers
- approval request

Production merge/deploy should remain human-approved by default.

---

## 7. Useful future build modes

Suggested config:

```yaml
site_build:
  build_mode: simple | standard | premium | cinematic_experience | ecommerce | cms
  assistant_layer: none | static | reactive | full_guide
  image_generation: none | optional | required
  motion_level: none | subtle | cinematic | immersive
  content_management: static | editable_files | cms | ecommerce_admin
  pass_strategy: one_pass | light_passes | full_multi_pass
  preview_required: true
  production_auto_ship: false
  review_gate: loose | normal | strict
```

The script should use this to decide what is mandatory, optional, skippable, or pause-worthy.

---

## 8. Improvement hooks from MBSH

- Add a site-build mode selector before planning starts.
- Add mandatory/optional/deferred classification to every feature.
- Add theme-consistency scoring before asset generation and before launch.
- Add image prompt validation against the theme contract.
- Add fallback-first logic so builds do not fail because optional assets are missing.
- Add lifecycle/handoff planning for non-technical site maintainers.
- Add preview/launch approval as a standard build stage.
- Add post-build learning capture as a required closeout.
- Add a reusable asset-provider fallback chain: Gemini → OpenAI → Firefly → Canva/MCP → manual → CSS/SVG.
- Add a key-rotation/capability-check pattern for API-dependent features.

---

## 9. Core takeaway

The FAMtastic builder should not force every site through the same heavy process.

It should inspect the site type, choose the right build mode, preserve theme consistency, use fallbacks intelligently, and always leave behind proof, handoff notes, and learnings for the next build.
