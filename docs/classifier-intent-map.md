# Classifier Intent Map

**File:** `site-studio/server.js` — `classifyRequest(message, spec)` at line ~4277  
**Last updated:** 2026-04-08

The classifier takes a raw user message and a site spec, and returns one of the intent strings below. Precedence is top-to-bottom — the first matching rule wins.

---

## Evaluation Order (Precedence Chain)

1. Strong build signals (intent-dominant override)
2. Brief indicators (vocabulary sanitization)
3. `brief_edit`
4. `visual_inspect`
5. `brand_health`
6. `brainstorm`
7. `rollback`
8. `version_history`
9. `summarize`
10. `data_model`
11. `tech_advice`
12. `template_import`
13. `page_switch`
14. `hub_push` / `git_push`
15. `deploy`
16. `build` (explicit commands)
17. `query`
18. `asset_import`
19. `fill_stock_photos`
20. `new_site` (no approved brief — early exit)
21. `build` (approved brief, no HTML)
22. `major_revision`
23. `restructure`
24. `content_update`
25. `restyle`
26. `bug_fix`
27. `verification`
28. `component_export`
29. `component_import`
30. `asset_import` (SVG/pattern)
31. `layout_update` (SVG/pattern application)
32. `layout_update` (structural changes)
33. **Default fallthrough:** `layout_update` (low confidence, logged)

---

## Intent Reference Table

| Intent | Trigger Patterns | False Positive Risk |
|--------|-----------------|---------------------|
| `new_site` | No approved brief exists in spec. Strong build signals (pages needed, color scheme, font stack). | Technical attribute vocabulary in a build brief (e.g., `data-section-id`, `data-field-id`) can match `visual_inspect` before reaching `new_site`. Mitigated by strong build signal pre-check. |
| `build` | Explicit: "build the site", "rebuild the site", "generate the site", "create the site". Approved brief exists but no HTML. Template commands. | Rare — explicit keyword required. |
| `brief_edit` | "edit the brief", "update the brief", "change the goal", "fix the audience", "modify the brief" | Low — specific phrase required. |
| `visual_inspect` | "check/measure/inspect/examine" + nav/header/footer/hero/layout/width/height/spacing/font/color/section/images/slots/structure. Page-specific: "check the about page". Overflow/responsive/mobile/tablet/screenshot/console errors/broken images. "What does X look like". "What color/font/size is". How many sections/images/links. SEO/accessibility/a11y checks. | HIGH — technical attribute vocabulary like `data-field-id`, `data-slot-id` can trigger this if a build brief is sent after brief approval. Mitigated by strong build signal pre-check (fires before visual_inspect). |
| `brand_health` | "check brand", "brand health", "what's missing", "asset checklist", "brand check", "missing assets" | Low — specific phrase required. |
| `brainstorm` | "brainstorm", "let's think/explore/plan more/discuss/ideate", "think about", "explore ideas", "planning mode" | Low. |
| `rollback` | "rollback", "roll back", "revert", "undo", "go back to", "previous version". "restore" + version/previous/backup/earlier/last. | Medium — "restore the original colors" would match rollback without the version anchor guard. |
| `version_history` | "versions", "changelog", "change log", "version history" | Low — requires "version" anchor. "what's the history of this font" would not match. |
| `summarize` | "summarize", "summary", "wrap up", "save progress" | Low. |
| `data_model` | "data model", "database", "schema", "entities", "what data", "need a db", "cms", "dynamic content", "user accounts", "e-commerce", "booking system" | Low. |
| `tech_advice` | "what tech", "tech stack", "which platform", "should I use", "recommend stack/tech/platform", "static or cms" | Low. |
| `template_import` | "import/use/apply/start from/start with" + "template/mockup/html file" | Medium — "use the display-stage component on the homepage" could match before `component_import`. Mitigated by precedence (template_import fires before component_import). |
| `page_switch` | "go to/switch to/edit/show/open" + page name + "page" — only fires if target page exists in `listPages()` | Low — requires page to actually exist. |
| `hub_push` / `git_push` | "push studio code/push hub/sync studio" / "push to repo/git/github/remote", "git push", "sync repo" | Low. |
| `deploy` | "deploy" (not "how to deploy") | Low. |
| `query` | "list/show/what" + "assets/templates/pages", or "preview" | Low. |
| `asset_import` | "create/make/generate/design/draw" + logo/icon/favicon/hero/banner/divider/illustration | Low. |
| `fill_stock_photos` | "add/fill/insert/get/find/need" + images/photos/stock photos. "fill the image slots". "I need images" | Medium — "add a hero image" could match before layout_update. |
| `major_revision` | "start over", "from scratch", "completely different", "totally redo", "scrap it/this/everything". "I'm not feeling", "hate it/this", "this isn't what", "wrong direction" | Low. |
| `restructure` | "break into pages", "separate pages", "split into pages", "make multi-page", "restructure the site", "change the page structure", "convert to multi-page" | Low — specific phrase required. |
| `content_update` | 7 patterns: (1) action verb + content field type without structural add/remove. (2) field + "should be/to say". (3) change/update/set + field + "to". (4) "add the address/hours/phone/email". (5) event/reunion + date/time/location + value clause. (6) "add the phrase/text/subtitle/tagline". (7) "change the tagline/motto/subtitle to". | Medium — "add the address section" could match pattern 4 without the section/form/block guard. |
| `restyle` | "make it more/less X" (no specific element vocab). "change the whole/entire/overall vibe/feel/look/style". "more premium/minimal/bold/elegant/modern/playful/professional" (no structural noun nearby). | Medium — "make the header more minimal" would NOT match restyle (header is a structural noun), correctly falling through to layout_update. |
| `bug_fix` | "broken", "bug", "doesn't work", "not working", "misaligned", "overlapping", "overflow" | Low. |
| `verification` | "run verif", "verify the", "check the site", "run checks", "verify the build", "check for issues", "run review", "review the build" | Low. |
| `component_export` | "export/save" + section/component/hero/card/form + "to/as/into" + library | Low — explicit phrase required. |
| `component_import` | "import/use/get/load" + component/hero/card/form + "from/in" + library. "what components are in/available". | Medium — "use" + component name could collide with template_import. Template_import fires at higher precedence for "use a template". |
| `layout_update` | "add/remove/move/swap/rearrange/reorder" + section/column/row/card/button/form/nav/header/footer/sidebar/testimonial/feature/grid. "make the header/footer/hero/nav/button/section X". SVG pattern application. | This is the **default fallthrough** — any unmatched message ends here. Low-confidence hits are logged with `[classifier] intent=layout_update confidence=LOW`. |

---

## Vocabulary That Causes False Positives

These terms appear in legitimate build briefs but can trigger wrong intents if the strong build signal pre-check doesn't fire:

| Vocabulary | Misclassifies As | Prevention |
|-----------|-----------------|------------|
| `data-section-id`, `data-field-id`, `data-slot-id` | `visual_inspect` (via "check/inspect/examine ... section/slots/structure") | Strong build signal pre-check + brief indicator (2+ signals) |
| `data-section-type`, `data-buddy-placement` | `visual_inspect` | Same as above |
| "color scheme" | No false positive alone — safe | — |
| "font stack" | No false positive alone — safe | Strong build signal fires for this directly |
| "pages needed" | No false positive alone — safe | Strong build signal fires for this directly |
| "check" (in "check brand" or "check consistency") | `visual_inspect` or `brand_health` | Both are acceptable classifications for those phrases |
| "use the X component" | `template_import` | template_import requires "template/mockup/html file" keyword — low collision risk |
| "structure" (in brief describing site structure) | `visual_inspect` if combined with check/inspect | Strong build signal pre-check prevents this |

---

## Strong Build Signal Patterns (Intent-Dominant)

These patterns fire **before all other checks** and immediately return `new_site` or `build`. They exist to prevent brief vocabulary from being misclassified:

```
/\bi('m|\s+am)\s+(building|creating|making)\s+a\s+site\b/
/\bi\s+want\s+(a|to\s+(?:build|create|make))\s+(a\s+)?(?:website|site|web\s+page)\b/
/\bi\s+need\s+a\s+(?:website|site)\s+for\b/
/\b(?:build|create|generate|make)\s+(?:a\s+|the\s+)?(?:full\s+)?(?:website|site)\s+(?:for|now|with|from)\b/
/\bpages\s+needed\b/i
/\bcolor\s+scheme\b.*\bfonts?\b/i
/\bprimary\s+color\b.*\bsecondary\b/i
/\bfont\s+stack\b/
/\bmust.have.sections\b/i
```

Any 1 match → returns `new_site` (if no brief) or `build` (if brief approved).

---

## Brief Indicator Patterns (Vocabulary Sanitization)

These patterns detect that a message is a site brief containing technical attribute syntax. Requires **2 or more** matches to fire:

```
/\bpages?\s+needed\b/i
/\bcolor\s+(?:scheme|palette)\b/i
/\bfont\s+(?:stack|choice|pairing)\b/i
/\bdesign\s+requirements?\b/i
/\bbrand\s+(?:character|voice|guide)\b/i
/\bdata[-_]section[-_]id\b/i
/\bdata[-_]field[-_]id\b/i
/\bdata[-_]slot[-_]id\b/i
```

2+ matches → returns `new_site` (no brief) or `build` (brief approved). Logged with matched indicator names.

---

## Confidence Logging

Three log levels are emitted to the server console:

- `[classifier] intent=build confidence=HIGH signals=N (strong build pattern)` — strong build signal fired
- `[classifier] intent=new_site/build confidence=HIGH signals=N (brief indicators: ...)` — brief detection fired
- `[classifier] intent=new_site confidence=HIGH (no approved brief)` — default new_site exit
- `[classifier] intent=layout_update confidence=LOW (no pattern matched, defaulting)` — fallthrough, investigate if unexpected

---

## Regression Tests

See `/tests/classifier-regression.json` for 20 test cases covering all major intents and known false-positive scenarios.
