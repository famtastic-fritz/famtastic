---
name: famtastic-proof-media
description: Use when Site Studio or FAMtastic creates prospect proof websites containing empty image slots, placeholder graphics, or generic fallback art. Fulfill and validate every required image before thumbnail capture or customer delivery, using the repository's governed proof-media pipeline rather than inventing assets inline.
---

# FAMtastic Proof Media

Turn Site Studio's internal image-slot contract into customer-ready proof imagery. The authoritative implementation is `site-studio/server/proof-media-fulfillment.js`; this skill tells Shay and other agents when and how to use it.

## Required flow

1. Generate the proof HTML with semantic image slots: `data-slot-id`, `data-slot-role`, and `data-slot-status="empty"`.
2. Call the Site Studio proof campaign endpoint. Do not manually replace slots with CSS gradients, random remote URLs, or invented local files.
3. Await media fulfillment. Imagen 4 is the current governed provider and requires `GEMINI_API_KEY`.
4. Confirm every required slot has `data-slot-status="generated"` and a local `assets/<slot-id>.jpg` source.
5. Confirm every generated file exists and is at least 10 KB.
6. Capture direction thumbnails only after fulfillment succeeds.
7. Deliver or publish only when `design-dna.json` records `media_fulfillment.status` as `fulfilled` or `not_needed`.

If any generation or validation step fails, keep the job failed or media-pending. Never label the proof customer-ready.

## Visual truth rules

- Generate imagery relevant to the business type, service, slot role, and design direction.
- Do not depict generated signage, logos, storefronts, staff, products, awards, or customer results as documentary facts.
- Prompts must prohibit text, logos, watermarks, and fake storefront signage.
- Prefer a wide text-safe composition for heroes, square portraits for team/testimonial roles, and 4:3 for service/gallery roles.
- A gradient, blank block, transparent pixel, labeled placeholder, or broken image is a failure—not a completed asset.
- Do not use unrelated stock merely to make validation pass.

## Proof command

Run Site Studio with the provider configured, then submit the normal FAMtastic proof request. The application itself owns prompts, provider invocation, asset writing, HTML patching, and the delivery gate.

```bash
test -n "$GEMINI_API_KEY" && echo "Imagen configured" || echo "Imagen missing"
npm test -- --run tests/proof-media-fulfillment.test.js tests/famtastic-proof-job-routes.test.js
```

For a generated campaign, inspect each direction:

```bash
find <campaign-output> -type f \( -name 'index.html' -o -path '*/assets/*.jpg' -o -name 'design-dna.json' \) -print
rg -n 'data-slot-status="empty"|data:image/(gif|png);base64|proof-media-fallback' <campaign-output>
```

The `rg` command must return no customer-visible empty-slot fallback in delivered artifacts.

## Failure handling

- Missing `GEMINI_API_KEY`: stop and report configuration missing.
- Provider safety rejection or timeout: retry only with a safer, more literal prompt; otherwise fail closed.
- Missing or tiny output: treat it as invalid and fail the proof.
- Any empty slot after patching: fail the proof before thumbnail capture.
- Poor but technically valid output: mark it rejected, refine the role-specific prompt, regenerate, and visually review again.

## Verification checklist

- [ ] Focused automated tests pass.
- [ ] No empty or transparent required slots remain.
- [ ] Assets are local, non-trivial image files.
- [ ] `design-dna.json` records provider, role, source, and prompt for each slot.
- [ ] Direction thumbnails show the generated images.
- [ ] A browser screenshot at desktop width has no broken images or placeholder language.
- [ ] The images do not make false claims about the prospect.
- [ ] Only then is the proof eligible for callback delivery.

See [references/contract.md](references/contract.md) for the machine contract and status semantics.
