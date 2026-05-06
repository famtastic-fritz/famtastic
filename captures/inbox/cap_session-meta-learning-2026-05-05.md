# Session Meta-Learning — 2026-05-05

This capture extracts the *meta* learnings from today's design session: how the research worked, what was worth capturing, what we'd improve, what recipes emerged, and how those recipes apply to building sites (not just the platform).

Authored at the user's request: *"lets capture the research that was done. how we did it, what information was useful to capture. what would have been nice to have. is the session history important? did we learn any new recipies? also what learning can we apply to the logic of how we build sites, refine them, what questions were important. how do we learn from this etc.."*

---

## Rule: Rail icons must sit inside a glass+bevel button container, not as flat SVG glyphs

User feedback after viewing `_research-icon-hover.html`: *"the touch you were going to use Graphics icons. in a glass button set type of deal."* The hover prototype rendered icons as flat SVGs with color/glow change on hover. The intended design is each rail item being a **beveled glass button** (matching the language of the OPEN RIGHT RAIL button in `_research-glass-slideout.html`) with the icon centered inside it. Same hover/active glow language as other buttons. The icon library recommendations (Tabler, Phosphor, Iconoir, Lucide) are correct; the rendering is incomplete. Update needed across all 7 icon-set briefs and the hover prototype.

## Decision: Every research subagent must produce a working HTML mockup, not just a markdown brief

Today's most valuable design move was pairing each markdown brief with a self-contained HTML mockup. The user could see and click the actual layout instead of inferring from prose. Six page-type briefs × two artifacts each = twelve files; the user picked direction visually in minutes. Words alone would have produced more rounds of clarification. Future research subagents must always produce both.

## Decision: Research-before-build is the new default for every page-type-shaped problem

The previous Workbench trajectory built layout before researching the page type. The shipped Ops MVP went to the wrong shell, used a swimlane pattern that may not fit, and invented a middle-area tile system the user hated. Today's reversal — pause implementation, do per-page-type research, return with mockups — produced six designed page types in a single session and recovered the user's original design intent. Research-before-build is now the default for any new surface. Build-first only when the surface clearly fits an already-researched page type.

## Recipe: Plan → Adversarial Review → Amend → Closeout

Today's plan-closeout work used the Codex-proposed pattern. Three steps: (1) author the plan, (2) run an adversarial review loop (Codex reviews Claude-authored work, vice versa, max 3 rounds default), (3) ship a closeout packet (`completed`, `checkpoint_complete`, `parked`, `superseded`, or `needs_tasking` with next_task_ids). Verified: today's 8 active plans all received closeouts, drift went 7 → 0, audit clean. Recipe documented in `plans/CLOSEOUT-SCHEMA.md`. Apply to every active plan at session end.

## Recipe: Spawn N parallel research subagents with strict file scopes

Today spawned 6 parallel research subagents writing to 24 distinct files, all on `main`, no commits, zero merge conflicts. The keys: (1) each agent had a unique target subdirectory (`page-types/`, `cross-cutting/`, `icon-sets/`), (2) explicit "do not commit / push / branch" instruction, (3) each agent read the same prerequisite files first (CLAUDE.md, plan.json, prior research, mockups, memory), (4) each cited at least 2 product references. Net throughput: ~16,500 words of research + 8 working mockups in one orchestrator turn. Recipe applies to any research-heavy work where deliverables don't share files.

## Recipe: Side-by-side viewer for design comparison

Today's `site-studio/public/shell-compare.html` (3-pane viewer with mockup dropdown) was the single most useful artifact for the user to form an opinion. Pattern: when there are competing implementations or design directions, build a viewer that shows them simultaneously in iframes with toggles. Read-only. Costs nothing to add (one HTML file, two iframes). User picks direction by sight in seconds instead of paragraphs of comparison prose.

## Recipe: User-canonical override on the auto-promote confidence gate

The chat-capture pipeline's regex-based confidence scoring rated user feedback at 0.7-0.78, below the 0.85 auto-promote allowlist gate. But user feedback IS canonical by definition. Today's workaround: a Python script that bypasses the gate for explicitly-named entries with `override_reason: "User design feedback is canonical by definition; regex-based confidence does not capture this."` This is a recurring need. The capture pipeline should add a `--user-canonical` promoter flag that defaults confidence to 0.95 for entries explicitly tagged as direct user statements. Until that ships, manual override is the workaround.

## Recipe: Capture the meta-learning from each session, not just the work

This very capture packet is an example. Beyond shipping the work, capture the *how* — the recipes that worked, the gaps that surfaced, the questions that mattered. Otherwise the next session reinvents the methodology. Recommend: a `--meta` flag on `session-capture.js` that creates a meta-learning capture template at session end, prompting for "what worked / what would I have wanted / what new recipes / what to apply forward."

## Learning: Session history is durable value, not throwaway transcript

Today's session recovered design intent that *appeared* lost (the Leonardo-AI glassy aesthetic, the round beveled buttons, the per-page-type thinking) by reading: (a) prior captures in `captures/inbox/`, (b) the `docs/mockups/` directory the user designed weeks ago, (c) `docs/STUDIO-UI-FOUNDATION.md` Section 2 freeze, (d) the user's own re-statement in chat. Without those persistent artifacts, the work would have been re-invented or abandoned. Session history compounds: every captured user quote becomes future-agent context.

## Learning: Working architecture and locked architecture diverge silently — surface viewers fix this

Today's bug-pattern entry (`when-the-locked-design-doesnt-match-what-works-the-next-agent-will-follow-whichever-surface-produces-value`) was the root of the day's confusion. The fix isn't to discipline the next agent; it's to make divergence visible. Recipe: any time there are two implementations of the same intent, build a viewer that shows them side-by-side. Drift becomes obvious; decisions become inevitable.

## Learning: The chat-capture pipeline needs a "session" packet type, not just paragraph extraction

Today's captures all flowed through `manual.js` adapter which extracts paragraphs by regex. Most user statements are multi-paragraph nuanced positions, not standalone aphorisms. The extractor split them awkwardly and confidence scoring missed the highest-value entries. Recommend: add a `--full-statement` capture mode that treats the entire input as one extract with user-canonical confidence (0.95), bypassing regex extraction. Useful for end-of-session reflection captures like this one.

## Application to site-building: pages-of-a-site need page-type research too

The user reframed FAMtastic as a creation platform with page-type-aware layouts. The same logic applies to the SITES we build with the platform. A site's home page, a contact form, an RSVP page, a media gallery, a story timeline — these are also page types and deserve type-specific research before build. MBSH today has all of those; some got designed (the cinematic hero), some got generic (the contact form). Apply the recipe: per-page-type research before building any new site page. Cite at least 2 product references per type. Produce a mockup before code.

## Application to site-building: site briefs should follow the closeout/checkpoint discipline

Today's plan-closeout mechanism applies to site execution too. Every site spec should produce closeout packets at major checkpoints (scaffold complete, content complete, deploy complete, post-launch). Each closeout records `proved`, `remaining_work`, `memory_candidates`. This makes site-building a first-class participant in the chat-capture pipeline — vendor facts learned during MBSH (cPanel UAPI is the deploy path) become memory entries that benefit every future site.

## Application to site-building: every new site should produce its own recipe

Today's MBSH deploy proved a recipe: cPanel UAPI overwrite path + DNS via cPanel + Resend domain verify + cron + CORS lockdown + smoke test. That recipe should be promoted as a `decision/site-deploy-canonical-recipe-cpanel-godaddy-resend` so the next site reuses it instead of re-discovering it. Pattern for every site we ship: at completion, distill the unique-to-this-site work AND the reusable recipe.

## Important questions today raised — keep asking these

- **Is this a creation tool or a website?** (changes layout entirely)
- **What page type is this?** (decision tree, not gut feel)
- **Where does Shay live so she can see what she needs to see?** (placement is design, not afterthought)
- **Does this surface push the canvas or float over it?** (right-rail behavior choice)
- **Per-domain coherent icon set or generic library mixed?** (visual identity at the rail)
- **What 2 product references prove this layout works?** (no inventing layouts)
- **What does this look like in: empty / loading / single result / many results / error?** (state map per page)
- **What would Codex's adversarial review say?** (independent verification before ship)

These eight questions become the standard pre-flight checklist for any new UI surface. Add to `docs/operating-rules/` as a checklist agents run through before drafting.

## Gap: We have research methodology now, but no research-brief template

Each of today's six page-type briefs followed roughly the same structure (Intent / References / Layout / Surfaces / Variants / States / Acceptance) but each agent invented the template. Future briefs should pull from a canonical template at `docs/operating-rules/research-brief-template.md`. Standardizes structure, reduces agent variance, makes briefs comparable.

## Gap: Agent-checkin overlap detection is too coarse and produces false positives

Today's `agent-checkin.js --intent` flagged 7 stale/merged branches as overlapping with the new research because they shared generic keywords (plan, design, schema). False-positive rate was effectively 100%. The script needs: (a) filter out branches already merged to main, (b) filter out branches with no recent commits (>3 days), (c) match keywords against actually-modified files in the LIVE branch, not against the branch name string. Already captured as a bug-pattern entry from earlier work.

## Decision: Every Workbench-relevant memory entry must be reviewable from inside the Workbench itself

Today's 30+ memory entries promoted to `memory/<type>/<id>.md` are not currently readable from any UI. They live as markdown files. The Memory tab from the Ops plan (deferred) needs to consume `lib/famtastic/memory/recall.js` and present these entries with the lifecycle controls (still-true / correct / retire). Until that ships, important memory is invisible to the operator. Promote memory-tab implementation to higher priority once the per-page-design research consolidates.
