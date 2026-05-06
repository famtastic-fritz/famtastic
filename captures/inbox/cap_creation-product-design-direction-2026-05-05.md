# Creation Product Design Direction — 2026-05-05

User design feedback after seeing the 3-pane shell-compare viewer. This is a major architectural redirection that supersedes the "build the dashboard" trajectory until per-page-type design research is done.

## Decision: FAMtastic is a creation platform, not a website. Layout must reflect that.

The single most important framing the user has given. The current implementation treats the Workbench like a website (pages with persistent chrome around content). It should be treated like a creation product (canvas with collapsible chrome). Every layout decision flows from this. Reference: IDEs (Codex Desktop, VS Code), creation tools (Figma, Linear), generative AI tools (Leonardo, Midjourney, Cursor). The pets-assistant screenshot the user shared shows a collapsed-pane IDE pattern with header chrome and big working area.

## Rule: When the user is actually creating, chrome collapses; canvas dominates

When a user is in active creation mode (writing a prompt, editing an image, designing a component, editing a template), all chrome must collapse to maximum-information-minimum-space. The right rail slides away. Secondary nav collapses. The canvas dominates. When the user is browsing or selecting, chrome can expand. Mode is detected by user intent (clicked into a workspace vs. landed on a list).

## Rule: Right rail is a glass slide-out, not a stuck panel

The right-side panel must be a translucent glass slide-out, not a fixed boxy column. It can hold tools OR information depending on context (the same surface, content varies). It slides in/out cleverly designed to show/hide. Sections inside must be thoughtfully grouped, not just a tool dump. Glass aesthetic is mandatory.

## Rule: Secondary nav is a glass slide-out from the icon rail

The icon rail stays. When clicked, the secondary nav for that domain slides out with a glass aesthetic — translucent, blurred, layered. Not a permanent fixed column. This gives space back to the canvas when the user knows where they are.

## Decision: Page types each have their own layout pattern. One-size-fits-all is wrong.

Different page types call for different layouts. The previous plan defaulted to a one-template-everywhere approach. New rule: every page type gets a designed layout pattern matching its function. The ones identified so far (with their needed patterns):

### Library / Collection page (applies to: Sites landing, Media Studio landing, Component Studio landing)
- Search box (top, prominent)
- Sort + filter controls (faceted to the collection type)
- Grid/list toggle
- Each card respects the type-specific affordances (Site cards show deploy state; Media cards show preview thumbnail; Component cards show preview render)
- Optional "operational review" widget area (Sites landing should have a customizable widgets area like Codex Desktop / IDE start pages)

### Creation / Canvas page (applies to: Media Studio individual item, Component Studio editor, Template editor)
- Canvas dominates the screen
- Tool/info panels are glass slide-outs from edges
- Prompt input (when applicable) is a glass panel that can collapse
- Results / previews need explicit thoughtful design — how many, what size, what comparison affordances
- Shay-Shay must have a defined location near the canvas so she can see the proofs and the canvas (not floating randomly)

### Workshop / Sandbox page (Component Studio specifically)
- Canvas + sandbox split (think JSFiddle: JS spot, CSS spot, HTML spot, preview)
- Test component runner
- State inspector
- Hot-reload of the live result

### Triage / Workshop page (Shay-Shay's own page)
- This is where bigger tasks get sent
- Shay's workshop view of the work in progress
- Different from per-page Shay (which is contextual)

### Settings / Customization page (Shay-Shay options, Admin sections)
- Form-heavy
- Section-based
- Save indicator

### Editor with chat (Sites > Template editor, individual page editors)
- Editor canvas + chat sidebar
- Two distinct chats exist: Studio chat (per-page work) vs Shay-Shay (cross-cutting). Their relationship and surfaces must be designed.

## Rule: Each domain gets its own coherent icon set

Sites should have a Sites-themed visual icon set (cards / grids / globes / portfolio). Media Studio should have its own (image, video, sparkles, generation). Component Studio should have its own (cubes, pieces, brackets, code). The icons inside a domain match each other and match the domain. Mixing generic Lucide-style icons across domains is wrong.

## Rule: Icons over text, always

Single-letter text glyphs in the rail are wrong (current Foundation: S/B/P/C/M/Intel/A). Icons. Real ones. Domain-themed. With hover effects communicating state and animations.

## Anti-pattern: Implementing layout before researching the page-type

The previous Ops plan went straight to "swimlanes + drawer + inspector" without asking "what kind of page is this and what layout does it need?" Anti-pattern: every new page must do design research first — what's the closest reference (IDE, creation tool, library, dashboard?), what affordances does it need, what tools does it need, where does Shay live?

## Gap: No design research has been done for any of the canonical 7 domains

Per-domain layout research is missing for all 7. The current implementations either copy generic dashboard layouts or invent ad-hoc tile systems. Each domain needs a research packet before any more implementation: what is the canonical layout pattern, what are the tools, where does Shay live, what does the chrome do when the user is actively creating, what icon set fits.

## Decision: pause Workbench implementation. Research first, build second.

Until per-page-type design research is done for the relevant domains, no more Workbench shell implementation work. The previous trajectory (build Phase 0 → Jobs tab → next sub-tab) is paused. Replace with: research → mockup → implement, per page type. The 5 mockups in docs/mockups/ are a partial start; they need extension to cover the page types listed above.

## Reference: pets-assistant screenshot the user shared

The user shared a screenshot of an IDE-style interface ("Explain pets assistant" title bar) showing a collapsed panel pattern with header chrome and big working area below. This is the kind of canvas-dominant layout pattern the user wants for creation pages. Use as visual reference for the canvas + collapsible chrome direction.

## Rule: Every page-type design must cite at least 2 product references

To prevent inventing layouts: every new page-type design must cite at least 2 product references (Cursor, Figma, Leonardo, Linear, Codex Desktop, VS Code, JSFiddle, etc.) showing the layout pattern is proven, what it gets right, and what we should adapt.
