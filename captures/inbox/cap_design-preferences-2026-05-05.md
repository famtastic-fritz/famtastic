# Design Preferences — 2026-05-05

User feedback during the shell reconciliation session, captured for the chat-capture pipeline so future agents do not lose it again.

## Preference: Workbench Foundation chrome is correct, middle area is not

User likes the Workbench Foundation top bar, the left navigation rail (the structure, not the icons), the bottom panel system, and the information flow. User strongly dislikes the middle workspace area as it currently renders in `site-studio/public/workbench-foundation.html` (the macOS-window-style tile cards with red/yellow/green dots and the Site/Page/Meta/Media/Template tabs). The middle area should follow the mockup designs in `docs/mockups/`, not what was implemented.

## Preference: Left rail icons should be visual icons, not text letters

The Workbench Foundation rail currently shows S/B/P/C/M/Intel/A as single-letter text glyphs. User dislikes this. Real icons are required — round, beveled, with hover effects to communicate state and animations. The mockup at `docs/mockups/workbench-night.html` shows the design language but does not include the rail icons explicitly; design work to draw real icons for each of the 7 domains is required.

## Preference: Black shiny glassy aesthetic (Leonardo-AI-style) with round beveled buttons and hover effects

User explicitly described the look as "black shiny glassy" with "round buttons with bevels" similar to Leonardo AI. Hover effects are wanted because they communicate state changes and animations. This look is already canonized in `docs/STUDIO-UI-FOUNDATION.md` Section 2 (Night Scheme): glass spec mandatory, blur 20-28px, border-radius 16-20px on cards and 7-9px on pills, breathing animations 2.4-3.6s, warm amber glow on focal elements, cool teal glow on Shay presence. The tokens exist; the implementation drifted from them.

## Decision: The 5 mockup HTML files in docs/mockups/ are the canonical visual reference

`docs/mockups/workbench-night.html`, `docs/mockups/workbench-screens.html`, `docs/mockups/mockup-a-shay-shay-on-media-studio.html`, `docs/mockups/mockup-b-shays-workshop.html`, `docs/mockups/mockup-c-show-me-how.html` together comprise the canonical visual reference. Any rebuild of the Workbench shell must match these mockups visually before any architectural reorganization happens. They were preserved through the freeze on 2026-05-04 and are the source of truth for what the shell should look like.

## Anti-pattern: Building from design tokens without rebuilding from the screen mockups

`docs/STUDIO-UI-FOUNDATION.md` Section 2 codifies the design tokens (color, type, glass, motion, glow). Section 8 codifies the workspace contract. But `docs/mockups/workbench-screens.html` shows 5 complete designed screens that the implementation never matched. The implementation took the tokens but invented its own layout. Anti-pattern: when both tokens and screen mockups exist, implementing from tokens alone produces a shell that is technically on-spec but visually nothing like the design. Always rebuild from the mockup screens, then verify the tokens match.

## Gap: Workbench Foundation implementation diverged from designed mockups

The current `site-studio/public/workbench-foundation.html` reproduces the Night Scheme color tokens from STUDIO-UI-FOUNDATION.md but does not match any of the 5 designed screens in `docs/mockups/workbench-screens.html`. Specifically: the home/portfolio screen is missing (mockup-screen-01 has the calm welcome, italic Fraunces hero, and warm site cards which never got built); the page editor screen is missing; the components library screen is missing; the media studio generation screen is missing; the Shay process trace screen is missing. The current implementation has the chrome around empty rooms instead of the rooms themselves.

## Do-not-repeat: Do not invent middle-area layouts when mockups exist

When implementing a workbench domain, the implementor must render the matching mockup screen, not invent its own layout. The current middle-area implementation (the macOS-styled Object/Sites/Page/Meta tile system) has no source in the mockups and was invented during build. Future builds: open the relevant mockup HTML side-by-side with the implementation and match it.

## Rule: Per-page-type layout consideration is mandatory

Different page types call for different layouts. The 5 mockups demonstrate this: portfolio overview uses card grid, page editor uses sidebar+preview+sidebar, components library uses tile grid, media studio uses chat-with-grid+preview, Shay trace uses terminal log view. Future page additions must pick the right mockup pattern for the page type, not default to a one-size-fits-all template.
