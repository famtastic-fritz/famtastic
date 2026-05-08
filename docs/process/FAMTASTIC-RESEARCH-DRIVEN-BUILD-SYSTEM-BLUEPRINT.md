# FAMtastic Research-Driven Build System Blueprint

**Captured:** 2026-05-08
**Source project:** MBSH Premiere / FAMtastic Studio debrief
**Purpose:** Preserve the reusable build-system blueprint discovered through the MBSH Premiere launch and convert it into future FAMtastic Studio architecture.

---

## 1. Core Law

Every FAMtastic build starts with intelligence.

A simple site should never mean a generic site. Build type controls scope, depth, module count, and polish level -- not the amount of strategic care.

The client brief is the starting point, not the ceiling.

When a user says, "Build me a simple site for a toy company," the system should still run FAMtastic intelligence: research, positioning, opportunity discovery, prompt strategy, visual direction, MVP classification, launch readiness, and learning capture.

---

## 2. FAMtastic Definition Anchor

FAMtastic means: Fearless deviation from established norms with a bold and unapologetic commitment to stand apart on purpose, applying mastery of craft to the point that the results are the proof, and manifesting the extraordinary from the ordinary.

This means the builder should not merely produce what the client knows how to ask for. It should enhance the client's thinking, discover the opportunity, and produce something better than the initial request.

---

## 3. The Real Product

FAMtastic Studio is not just a website builder.

It is a research-driven production system that turns vague requests into researched, strategic, visually intentional, conversion-aware sites.

The workflow is:

```text
Client asks for a site
↓
Studio enhances the brief
↓
Research identifies opportunity
↓
Strategy defines positioning
↓
Build recipe is composed
↓
Prompt intelligence generates visual / copy / component prompts
↓
Site builds to working MVP
↓
QA determines local / staging / production readiness
↓
Site launches
↓
Learning loop updates recipes, prompts, skills, components, agents, and QA gates
```

---

## 4. Big-Ticket Workstreams

### 4.1 Build Intelligence System

The brain of the platform.

Includes:

- Research-driven prompt intelligence
- Brief enhancer
- Opportunity gap finder
- Positioning generator
- Build recipe system
- Capability matrix
- Skills registry
- Agent registry
- Component registry
- Prompt registry
- QA gate registry
- Retry / fallback logic
- MVP / staging / production readiness classifier
- Learning loop

### 4.2 FAMtastic Studio GUI / Platform Layout

The visual product interface.

Screens identified:

- Project Intake
- Research
- Build Mode / Recipe Composer
- Theme Contract
- Page Purpose Map
- Scene Board
- Asset Board
- Character Board
- Build Ledger
- Preview Board
- QA Board
- Deploy Center
- Learning Board

### 4.3 ShayShay Guided Assistant Layer

ShayShay is not a separate build path. It is an adaptive guide layer on top of the same build engine, project ledger, repo state, and learning system.

ShayShay should explain:

- What the builder is doing
- What issues were found
- What choices need approval
- What a warning means
- What is safe to fix now
- What should be deferred
- What is ready for staging or production

### 4.4 MBSH Reunion Site V2

Post-launch iteration work for the live MBSH site.

Known backlog:

- Through-Years archival rebuild
- Spotify playlist ID
- Harry info-slide pattern
- Real Instagram / Facebook handles
- Memorial names
- Sponsorship mobile carousel
- Scene-filler polish
- iOS / S22 chevron issue

Strategic note: MBSH V2 is a good test case for post-launch iteration inside the future GUI.

### 4.5 Homeboy Shipping Site Test Case

A strong first test for the new research-driven process because it begins from a vague real-world client request.

Example input:

```text
I need a website for my homeboy's shipping company. He ships from Miami to the Bahamas.
```

This should test:

- Research screen
- Competitor scan
- Opportunity gap finder
- Positioning generator
- Prompt intelligence
- Visual direction
- Recipe composer
- MVP launch classifier

Recommended order:

1. Create this master blueprint.
2. Turn it into a Studio screen / product spec.
3. Use the shipping company site as the first clean GUI / process test.
4. Use MBSH V2 as the second test for post-launch iteration.
5. Build ShayShay as the guide layer that explains and controls the process.

---

## 5. Build Classification Model

Do not use rigid templates.

Use flexible recipes.

Wrong model:

```text
Pick one: simple / standard / cinematic / ecommerce / CMS
```

Correct model:

```text
Base Build Type + Capability Modules + Polish Level + Lifecycle Model
```

A site can be:

- cinematic + ecommerce
- cinematic + CMS
- premium + booking
- standard + character assistant
- simple + generated assets
- event + donation / sponsor flow
- portfolio + shop

Example recipe:

```yaml
site_recipe:
  base_type: event
  experience_level: cinematic
  business_model:
    - tickets
    - sponsorship
  content_model:
    - static_pages
    - editable_config
  assistant_layer: character_guide
  asset_strategy: generated_plus_manual
  motion_level: cinematic_subtle
  commerce_level: interest_only
  lifecycle: iterative_campaign_site
  launch_strategy: production_mvp_then_v2
```

Build type controls depth and scope, not whether intelligence applies.

---

## 6. Research-Driven Prompt Intelligence

Prompting should not start with visuals.

Wrong order:

```text
User says "make me a shipping website"
↓
AI writes homepage copy
↓
AI generates shipping hero image
↓
Site looks generic
```

Correct order:

```text
User says "make me a shipping website"
↓
Studio runs discovery
↓
Studio researches business type + market + competitors + gaps
↓
Studio identifies positioning opportunity
↓
Studio builds site strategy
↓
Studio creates visual direction
↓
Studio generates page structure
↓
Studio generates image prompts
↓
Studio builds MVP
↓
Studio tests whether the site supports the strategy
```

### FAMtastic Prompt Formula

```text
Research Insight
+ Business Opportunity
+ Target Customer
+ Emotional Promise
+ Conversion Goal
+ Visual Direction
+ Composition Direction
+ Section Purpose
+ Brand Consistency
+ Negative Constraints
= FAMtastic Prompt
```

### Example: Miami-to-Bahamas Shipping Site

Weak prompt:

```text
Create a website for a shipping company.
```

FAMtastic prompt direction:

```text
Create a conversion-focused website for a Miami-based shipping company serving Bahamian families, small businesses, and island-bound shipments. Research shows the opportunity is local pickup convenience, trust, package handling transparency, and reducing the stress of getting goods from Miami to the Bahamas.

Position the company around: "we pick it up, pack it right, and get it island-bound without the runaround."

Design direction:
- local Miami pickup energy
- island-bound logistics confidence
- warm and trustworthy, not cold corporate logistics
- visuals should show real pickup moments, boxes, home goods, small business supplies, and a clean shipping workflow
- hero should show two workers loading boxes into a branded truck outside a generic home-improvement/storefront setting, composed from a top-left angle so the eye flows toward the center CTA
- CTAs should prioritize "Schedule a Pickup" and "Get a Shipping Quote"
- sections should explain pickup, packing, export/shipping, tracking/updates, and Bahamas delivery coordination
```

### Prompt Objects, Not Loose Prompts

Prompts should be stored as structured objects.

```yaml
asset_prompt:
  id: hero_pickup_scene
  page: home
  section: hero
  purpose: "Show local pickup as the key differentiator"
  research_basis:
    - "Local pickup is a market gap"
    - "Customers need convenience and trust"
  target_customer:
    - "Bahamian families"
    - "Small businesses"
  composition:
    camera_angle: "upper-left diagonal"
    subject_position: "left third"
    cta_space: "center-right"
  visual_style:
    mood: "warm trustworthy commercial photography"
    colors: ["navy", "ocean blue", "cream", "sunlit gold"]
  prompt: "Generate..."
  negative_prompt:
    - "no real brand logos"
    - "no fake text"
    - "no distorted hands"
  status: draft
  generation_attempts: []
```

### Regeneration Critique Loop

Regeneration should not mean "try again."

It should record:

- what failed
- why it failed
- what prompt delta should fix it
- whether the new attempt improved the result

```yaml
generation_attempt:
  attempt: 2
  provider: gemini
  result: rejected
  rejection_reason:
    - "no visible pickup action"
    - "too generic logistics stock-photo feel"
    - "text artifacts on truck"
  revised_prompt_delta:
    - "show workers physically carrying boxes"
    - "remove all text/logos"
    - "leave clean negative space on right"
```

---

## 7. Research System

Research should not be passive or manual-only.

For business sites, research should run automatically unless the user disables it.

Research modes:

- Industry Scan
- Local Competitor Scan
- Customer Pain Scan
- Offer Gap Scan
- SEO / Search Intent Scan
- Visual Landscape Scan
- Trust / Proof Scan
- Pricing / Package Scan
- Niche Opportunity Scan

Research output should feed the build directly:

- Recommended positioning
- Site sections
- Copy angles
- CTA strategy
- Image prompts
- Feature suggestions
- Content gaps
- Questions for the client
- MVP recommendation

Research tools can later include Perplexity, web search, competitor scraping, SEO tools, uploaded client docs, and manual notes. The tool is less important than the pipeline:

```text
research → insight → opportunity → strategy → prompt → asset → build
```

---

## 8. Brief Enhancer

Most clients do not know what they want.

They may say:

```text
I need a website.
People should be able to contact me.
I want to upload pictures.
```

FAMtastic Studio should enhance this into:

- Clear offer
- Differentiator
- Primary CTA
- Trust/proof elements
- Content model
- Page map
- Visual direction
- Research questions
- MVP launch path

The system should ask high-value questions, not generic intake questions.

For a shipping company:

- Do you offer local pickup?
- What Miami areas do you serve?
- Which Bahamas islands do you ship to?
- What kinds of packages do you handle?
- Do you want quote requests by form, phone, WhatsApp, or email?
- What makes people choose you?

---

## 9. Every Site Is Iterative

A website is never really done.

The build goal is not perfection forever.

The build goal is:

```text
Always produce a coherent working build at the selected target level.
```

Target levels:

- local working build
- staging MVP
- production MVP
- production polished release
- V2 iteration
- maintenance update
- monthly improvement

Every issue should be classified as:

- production blocker
- staging blocker
- local blocker
- non-blocking polish
- V2 backlog
- content dependency
- external dependency

---

## 10. Build Pipeline

The reusable FAMtastic pipeline:

```text
1. Intake
2. Build recipe composition
3. Research
4. Opportunity finding
5. Positioning
6. Theme / visual contract
7. Page purpose map
8. Section architecture
9. Capability check
10. Asset plan
11. Prompt generation
12. Build ledger
13. Controlled build passes
14. Audits / drift reviews
15. Staging preview
16. Production release
17. Smoke test
18. Learning loop
19. Registry promotion
```

This pipeline scales. Simple sites run a lighter version. Premium/cinematic sites run deeper passes.

---

## 11. Studio Screens

Recommended Studio modes:

- Define
- Plan
- Build
- Review
- Debug
- Deploy
- Learn

Recommended screens:

- Project Intake
- Research
- Build Mode / Recipe Composer
- Theme Contract
- Page Purpose Map
- Scene Board
- Asset Board
- Character Board
- Build Ledger
- Preview Board
- QA Board
- Deploy Center
- Learning Board

Key principle: the Studio should expose the same build state through adaptive detail layers. There is one build engine, one source of truth, one project ledger. Different interfaces can show different levels of detail, but they should not create separate build paths.

---

## 12. Registries

Before creating a new skill, component, recipe, agent, prompt, or capability, the system should check whether something already exists.

Decision tree:

```text
1. Does this already exist?
   yes → reuse or extend
   no → continue

2. Is this a variation of something existing?
   yes → create variant
   no → continue

3. Is this project-specific?
   yes → keep local to project
   no → continue

4. Is this reusable across future builds?
   yes → add to registry
   no → document only

5. Does this replace an older pattern?
   yes → deprecate old pattern
```

Needed registries:

- Recipe Registry
- Component Registry
- Skill Registry
- Agent Registry
- Capability Registry
- Prompt Registry
- QA Gate Registry
- Pattern Registry
- Learning Registry
- Backlog Registry
- Decision Registry

---

## 13. Skills

Initial skill candidates:

- Build Mode / Recipe Classifier
- Theme Contract Generator
- Page Purpose Mapper
- Section Archetype Classifier
- Character Placement Auditor
- Asset Alpha / Quality Auditor
- Form Readability Auditor
- Footer Treatment Generator
- Production Readiness Auditor
- Learning Extractor
- Prompt Critic / Regenerator
- Opportunity Gap Finder
- Visual Direction Generator
- Component Replacement Planner

---

## 14. Agents

Initial agent candidates:

- Creative Director
- UX Flow Specialist
- Visual QA Critic
- Character Director
- Asset Director
- Accessibility / UX Safety Agent
- Performance Agent
- Deployment Manager
- Learning Loop Curator
- Research Strategist
- Conversion Strategist

Agents should only be used when they reduce risk, improve quality, parallelize work, or provide expert critique. Do not spawn agents just to spawn agents.

---

## 15. MCPs / Connectors

Initial connector candidates:

- Netlify MCP: deploy status, logs, limits, site IDs, rollback
- GitHub MCP: branches, PRs, commits, diffs, files, release tags
- Browser QA MCP: screenshots, console logs, click tests, forms, mobile viewports
- Image Pipeline MCP: generate, remove background, alpha check, compress, contact sheet
- API Capability MCP: test Gemini/OpenAI/Firefly keys, quotas, model availability, fallback status
- Content/CMS MCP: edit config, dates, venue, ticket status, playlist ID, memorial names, social links
- Research MCP: Perplexity / web search / competitor scan / SEO research
- Local Build MCP: dev server, build, lint, minify, inspect large files, smoke tests

---

## 16. QA Gates

Reusable QA gates from MBSH and future builds:

- Theme consistency gate
- Page purpose gate
- Section archetype gate
- Character placement gate
- Asset alpha / dirty background gate
- Form readability gate
- Footer treatment gate
- Mobile viewport gate
- Capability check gate
- Preview freshness gate
- Deployment readiness gate
- Production smoke gate
- Learning capture gate

---

## 17. Component / Slot Operations

Future builds should prefer component-aware edits over broad rewrites.

Change types:

- content edit
- style tweak
- component replacement
- component variant
- slot replacement
- layout restructure
- new page
- new capability
- new recipe

Examples:

```text
Replace footer.default_grid → footer.final_reel
Replace playlist.placeholder → spotify_embed
Replace through_years.coming_soon → archival_filmstrip
Replace ticket_interest_cta → checkout_button
```

Every placeholder should have:

- current state
- required data
- replacement component
- QA checks
- launch classification

---

## 18. Capability Matrix

Capabilities should be tracked by status, not assumed.

Example:

```yaml
capabilities:
  github:
    status: ready
    required_for: all_builds

  netlify:
    status: ready
    required_for: staging_and_prod
    limit_check: pass

  gemini:
    status: ready
    required_for: generated_assets
    fallback: openai_images

  payments:
    status: not_configured
    required_for: ticket_sales
    fallback: interest_form
```

A missing capability does not always block the build. It only blocks features that require it.

---

## 19. Learning Loop

The intelligence loop must not only store learnings. It must retrieve them before planning, apply them during building, and verify they affected the output.

Learning loop:

```text
Build happens
↓
Closeouts written
↓
Audit reports generated
↓
Launch report created
↓
Learning extractor runs
↓
Findings classified
↓
Registry search runs
↓
Reuse / extend / create decisions made
↓
Promote patterns
↓
Create backlog
↓
Update prompt templates
↓
Update QA gates
↓
Future builds start smarter
```

The loop has three jobs:

- Capture
- Retrieve
- Apply

A future test of the intelligence loop should ask:

- Did it remember MBSH lessons?
- Did it apply relevant section systems?
- Did it check image alpha?
- Did it run research before prompts?
- Did it improve the output?

---

## 20. Monthly Improvement Engine

For the long-term goal of one person managing many revenue-generating sites, the monthly value is not just hosting.

Monthly improvement can include:

- competitor checks
- seasonal content ideas
- SEO opportunities
- offer testing
- new sections
- image/content refreshes
- lead form improvements
- analytics summaries
- AI assistant updates
- monthly recommendations

Example for a shipping company:

```text
Competitors are promoting holiday shipping deadlines. Recommend adding a "Bahamas Holiday Shipping Cutoff" banner and quote CTA.
```

---

## 21. Immediate Next Steps

Recommended next order:

1. Convert this blueprint into a detailed Studio screen / product spec.
2. Build or document the registry model.
3. Build the Research → Strategy → Prompt object flow.
4. Use the homeboy shipping company site as the first test case.
5. Use MBSH V2 as the second test case focused on post-launch iteration.
6. Audit the existing platform code for component operations, large-file modularization, production build optimization, and registry insertion points.
7. Revisit the intelligence loop separately and test whether it actually retrieves and applies learnings.

---

## 22. Summary

The FAMtastic system should not depend on the user already knowing the right site to ask for.

It should enhance the brief, discover the opportunity, compose the right recipe, generate strategy-backed prompts, build a working MVP, classify launch readiness, and learn from the result.

This is how FAMtastic turns ordinary requests into extraordinary builds.
