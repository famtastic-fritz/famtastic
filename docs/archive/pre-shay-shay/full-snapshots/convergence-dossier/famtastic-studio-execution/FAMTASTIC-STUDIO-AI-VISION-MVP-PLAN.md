# FAMtastic Studio AI Vision + MVP Plan

Date: 2026-05-11
Branch inspected: `research/studio-intelligence-foundation-20260508`
Purpose: define the end-state AI vision and the practical MVP bridge without losing scope.

## 1. Core thesis

FAMtastic Studio is not a site generator. It is a closed-loop creative production factory.

The system should turn Fritz's taste, judgment, and strategic direction into a scalable machine that can discover, research, design, build, test, deploy, measure, and improve many revenue-capable digital properties.

The long-term goal is not merely 1000 sites. The long-term goal is a system where site 1000 is smarter, cheaper, faster, and more differentiated than site 1 because every build teaches the next one.

## 2. Operating principle

Do not build one giant autonomous agent.

Build a deterministic production pipeline with bounded AI specialists:

- Researcher
- Strategist
- SEO/content planner
- Visual director
- Prompt engineer
- Media producer
- Component/prototype builder
- Site assembler
- QA reviewer
- Cost controller
- Publisher
- Analytics interpreter
- Learning curator

Agents should operate inside explicit workflow states, schemas, budgets, and gates. Deployment, QA, artifact storage, cost tracking, and approval should be deterministic.

## 3. End-state pipeline

### Stage 0 — Opportunity Engine

Inputs:
- Fritz ideas
- search trends
- competitor gaps
- affiliate/product opportunities
- local/service opportunities
- analytics from existing sites
- Shay suggestions

Outputs:
- ranked site opportunities
- revenue hypothesis
- risk level
- estimated build cost
- estimated maintenance cost
- likely content/component/media needs

Goal:
Studio should bring high-potential opportunities to Fritz instead of waiting for Fritz to imagine every site manually.

### Stage 1 — Brief Intake

Inputs:
- rough prompt: “Institute for the Studies of Fungi”
- optional files/URLs/images
- site type target: cookie-cutter, premium FAMtastic, utility/tool, app/game/component, campaign/event

Outputs:
- structured site brief
- missing information list
- assumptions
- initial cost tier

MVP requirement:
A New Site prompt must become a structured build brief, not just a saved note.

### Stage 2 — Research + Strategy

Inputs:
- brief
- web/search data
- competitor pages
- audience/niche data
- prior site memory

Outputs:
- audience map
- competitor pattern map
- monetization paths
- SEO/content opportunities
- risk/legal notes
- FAMtastic differentiation angle

Tools/patterns to consider:
- Perplexity/Tavily/Exa/Firecrawl-style research connectors
- RAG with citations
- explicit cost gate before paid research

MVP requirement:
Research may be manual or lightweight, but the pipeline must have a slot for it and must record when research was skipped.

### Stage 3 — Concept Forge

Inputs:
- brief + research

Outputs:
- 3–5 design/content concepts
- recommended concept
- visual language
- tone
- site architecture
- revenue path

Example for fungi:
- Victorian Mycology Institute
- Fungi as Planetary Internet
- Mushroom Field Lab
- Weird Official Institute

MVP requirement:
At least generate one concept + page plan from the prompt.

### Stage 4 — Site Blueprint

The blueprint is the central contract.

Must include:
- site id/tag
- audience
- positioning
- pages
- sections
- content blocks
- components required
- assets required
- SEO metadata
- schema/data requirements
- forms/integrations
- deploy target
- analytics plan
- budget estimate
- approval gates

This should become the canonical input for build, media, components, QA, deploy, and learning.

MVP requirement:
Create a minimal `siteBlueprint` schema that can drive existing `createSite()` / `/api/new-site` behavior.

### Stage 5 — Media Studio

Media Studio is an asset intelligence system, not an image generator page.

Asset types:
- logos/marks
- hero images
- section illustrations
- icons
- textures/patterns
- diagrams
- product/mockup images
- social cards
- thumbnails
- ads
- video clips
- motion loops
- screenshots
- prompt recipes
- brand/style packs
- reusable asset kits

Every asset should track:
- source prompt
- negative prompt, if used
- provider/model/version
- input references
- seed/settings
- cost
- dimensions/aspect ratio
- license/commercial safety notes
- quality score
- usage locations
- edit history
- approval status
- failure/debug notes

Text-to-video pipeline:
- concept
- storyboard
- shot list
- keyframes
- provider selection
- render job
- QA review
- compression/export
- placement in site/component/social asset
- fallback static asset

Architecture rule:
Media generation must be async, budget-gated, retryable, and cacheable. Expensive video should never be a default hidden side effect.

Providers/tools to consider:
- OpenAI Images / GPT-image
- Google Imagen/Gemini
- Adobe Firefly
- FLUX / Stability
- Ideogram for typography-heavy images
- Runway, Luma, Pika, Kling, Veo/Sora where API/business terms allow
- Fal.ai / Replicate as provider routers
- Cloudinary/S3/R2 for optimization/storage

MVP requirement:
Start with asset requirements + manual/upload/local save + prompt generation. Paid generation comes after budget gate.

### Stage 6 — Component Studio

Component Studio is the reusable experience factory.

It should support:
- web sections
- app screens
- mobile UI
- game UI pieces
- interactive explainers
- calculators
- forms
- comparison tables
- affiliate product cards
- diagrams
- widgets
- prototype playgrounds

It can be Claude Design-like, v0-like, Storybook-like, or invented from scratch, but the important contract is:
- component spec in
- media/assets consumed
- interactive preview
- responsive/mobile states
- accessibility checks
- events/data contract
- reusable registry output
- optional apply-to-site path

Tools/patterns to consider:
- Storybook + Chromatic/Percy
- Playwright component tests
- React/Tailwind/shadcn-style primitives
- design tokens
- Figma/Builder/Locofy/Anima/v0/Bolt/Lovable as references, not necessarily dependencies

MVP requirement:
Do not make Component Studio block New Site. Keep sandbox preview, then later add gated surgical apply.

### Stage 7 — Site Assembly

Inputs:
- site blueprint
- approved components
- media assets
- copy/content plan

Outputs:
- generated site files
- preview URL/path
- build log
- asset usage map
- QA checklist

Current repo lesson:
The legacy builder in `site-studio/server.js` still contains the working engine. The new `/studio.html` shell should use it instead of replacing it too early.

MVP requirement:
Wire Studio New Site -> existing `/api/new-site` / `createSite()` flow.

### Stage 8 — QA + Evaluation

Required gates:
- build succeeds
- links valid
- forms render
- mobile viewport check
- Lighthouse/performance where possible
- accessibility/axe/Pa11y checks
- SEO metadata/schema check
- visual screenshot check
- broken asset check
- budget/cost report
- deploy readiness

AI review should supplement deterministic checks, not replace them.

Talk-to-test:
Fritz should be able to say:
- “test the RSVP form on mobile”
- “check if the hero looks generic”
- “open the site and tell me what feels broken”

The system converts that into Playwright/browser tasks, screenshots, logs, and fix suggestions.

MVP requirement:
Add a browser smoke test for New Site build + preview + one edit + deploy-gate visibility.

### Stage 9 — Deploy

Deploy is a gated workflow, not a chat side effect.

Required deploy states:
- local preview
- staging preview
- production ready
- production deployed
- rollback available

Netlify requirements:
- check auth/config
- show deploy target
- show expected domain/site id
- require approval for production
- record deployment id/url
- run post-deploy smoke

MVP requirement:
Studio must expose deploy readiness and call the existing deploy endpoint/gate.

### Stage 10 — Analytics + Feedback

Track:
- visits
- Core Web Vitals
- search impressions/clicks
- CTR
- form submissions
- affiliate clicks
- revenue
- user feedback
- broken/error reports

Feedback loops:
- low CTR -> title/meta variants
- traffic but no conversion -> CTA/layout/offer test
- high bounce -> content/layout review
- slow page -> performance task
- revenue winner -> extract reusable pattern

MVP requirement:
At least record build outcome, decisions, and manual notes. Full analytics can come later.

### Stage 11 — Learning + Upgrade Loop

The factory must learn at several levels:

- prompt memory: prompts that produce strong assets/content/components
- design memory: reusable visual systems and section patterns
- site memory: audience, brand, pages, claims, rules
- performance memory: traffic, revenue, conversions
- error memory: failures, fixes, provider issues
- Fritz taste memory: corrections and preferences
- Shay memory: recommendations and next-best actions

Every run should answer:
- what worked?
- what failed?
- what cost too much?
- what should be reused?
- what should never happen again?
- what should Shay suggest next time?

## 4. Cost analysis model

Track cost by site, job, stage, provider, and artifact.

Minimum ledger fields:
- site_id
- run_id
- stage
- provider/model
- input tokens/output tokens or provider units
- direct cost
- retries
- human review time estimate
- output artifact
- eval score
- publish status
- revenue attribution later

Primary business metrics:
- cost per draft site
- cost per approved site
- cost per deployed site
- cost per indexed page
- cost per lead/conversion
- cost per revenue dollar
- payback period
- monthly margin per site

Cost-control rules:
- cheap models for extraction/classification/metadata
- stronger models for strategy/review/repair
- paid media only after asset brief + approval/budget gate
- video only after storyboard/keyframe approval
- cache research summaries, prompts, assets, components
- max iteration limits for repair loops
- batch low-priority jobs

## 5. How to know if this is the best way

Use an eval harness, not vibes.

Compare pipelines by:
- build success rate
- time to first preview
- human edits required
- design score
- SEO score
- mobile score
- accessibility score
- deploy success rate
- cost per approved site
- later traffic/revenue

Maintain golden tests:
- MBSH reunion site
- Institute for the Studies of Fungi
- one local service site
- one affiliate/content site
- one app/game/component-heavy site

Every major model/prompt/template change runs against these.

## 6. MVP: Studio Parity Bridge

Goal:
Studio must not regress from main. It must be able to start, build, preview, edit, and deploy-gate a site from a prompt.

MVP user flow:
1. Open `/studio.html`.
2. Click New Site.
3. Enter prompt/brief.
4. Studio creates a structured brief/blueprint.
5. User clicks Build.
6. Studio calls the existing builder engine.
7. Preview appears in Studio.
8. User sends an edit prompt.
9. Builder applies/rebuilds.
10. Deploy panel shows Netlify readiness.
11. User can deploy to staging/production only through explicit gate.
12. Run outcome is logged.

MVP technical tasks:
- Add `siteBlueprint` schema.
- Convert Studio New Site draft to existing `/api/new-site` payload.
- Add Build button/state in Sites screen.
- Bridge Studio shell to embedded `/index.html` builder or direct API call.
- Show build progress and errors.
- Bind preview to the generated site/tag.
- Add edit prompt path using existing builder/chat behavior.
- Surface `/api/deploy-info` and `/api/deploy` in Studio deploy panel.
- Append run records to local task/outcome ledgers.
- Add Playwright smoke for New Site -> build -> preview -> edit -> deploy gate.

Explicitly out of MVP:
- full Shay autonomy
- paid Perplexity by default
- paid media generation by default
- real component surgical insertion
- full analytics optimization loop
- auto-production deploy

## 7. Platform sequencing

### Slice 1 — MVP Parity Bridge
New Site prompt builds through existing engine.

### Slice 2 — Blueprint Contract
Make site blueprint canonical across builder, media, components, deploy, QA.

### Slice 3 — Media Studio Foundation
Asset requirements, prompt recipes, manual/upload/local assets, metadata ledger, budget model.

### Slice 4 — Component Studio Foundation
Interactive sandbox, component spec, responsive preview, registry, tests.

### Slice 5 — Research + Concept Forge
Cost-gated research, concept options, SEO/content opportunities.

### Slice 6 — QA/Eval Harness
Playwright, screenshots, mobile, SEO, accessibility, AI critique, repair loop.

### Slice 7 — Deploy + Launch Readiness
Netlify gates, post-deploy smoke, rollback, environment readiness.

### Slice 8 — Learning + Analytics Loop
Build outcomes, revenue signals, prompt/template upgrades, Shay recommendations.

### Slice 9 — Opportunity Engine
Ranked site ideas, market gaps, revenue hypotheses, next-best-build queue.

## 8. Specific repo lessons to preserve

From recent inspection:
- `server.js` still has working builder behavior; do not strand it behind the new shell.
- `/studio.html` currently has better platform UX but New Site stages drafts instead of executing builds.
- MBSH proved high-quality sites require proof-heavy, multi-pass refinement.
- MBSH lessons should become reusable recipes: scene archetypes, assistant placement, Final Reel footer, alpha-channel asset checks, form readability rules.
- Media provider calls and Perplexity need visible budget gates before default use.
- Component insertion should remain sandboxed until surgical editor apply has diff/proof/rollback.
- Worktree is dirty; integration must stage carefully.

## 9. Architecture recommendation

Use this shape:

- Studio UI: cockpit and review surface
- Workflow API: durable run/task/artifact state
- Builder engine: existing proven site generation path
- Blueprint schema: contract between all studios
- Media service: async asset jobs + ledger + budget gate
- Component service: sandbox/prototype + registry
- QA service: Playwright/Lighthouse/axe/screenshots
- Deploy service: Netlify/staging/prod gates
- AI gateway: model/provider routing + cost ledger
- Learning store: prompts, outcomes, metrics, corrections
- Shay: ambient orchestrator/explainer/recommender, not required for MVP execution

## 10. Immediate next action

Do not start fresh.

Start with an evaluation + bridge implementation plan:

1. Create sandbox test for `Institute for the Studies of Fungi`.
2. Run current main builder flow and current Studio flow.
3. Map exact payloads/endpoints/files.
4. Implement Studio -> existing builder bridge.
5. Add MVP smoke test.
6. Only then expand Media/Component/Research from the blueprint contract.

This preserves the long-term vision while restoring the minimum working Studio that Fritz actually needs.
