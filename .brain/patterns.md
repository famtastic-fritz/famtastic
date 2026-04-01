# Validated Design Patterns
# Format: [pattern] | [evidence source] | [confidence: low/med/high] | [date]

## Layout
- Template-first build | internal testing | high | 2026-03-25
- main { max-width: 90% } page-template model | site-the-best-lawn-care | high | 2026-03-26
- hero breakout: width 100vw with negative margin | internal | high | 2026-03-26

## Images
- Slot-based identity with data-slot-id/status/role | internal | high | 2026-03-24
- 3-provider stock fallback chain (Unsplash → Pexels → Pixabay) | internal | high | 2026-03-24
- Contextual queries (business + niche + role) outperform generic role queries | internal | med | 2026-03-24

## Prompting
- printf over echo for Claude prompts (echo corrupts escape sequences) | bug | high | 2026-03-20
- os.tmpdir() as cwd for spawnClaude | bug | high | 2026-03-26
- loadRecentConversation(15) gives Claude meaningful conversation continuity | internal | high | 2026-03-24

## Verification
- 5 file-based checks catch ~80% of build issues with zero token cost | internal | med | 2026-03-30
- autoTagMissingSlots() as conditional post-processor keeps slot system healthy | internal | med | 2026-03-31
