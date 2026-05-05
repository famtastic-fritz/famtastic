# Capture Review Packet — 2026-05-04-cowork-briefing-first-pass

**Source:** ../Downloads/COWORK-BRIEFING.md
**Status:** review_required
**Created:** 2026-05-05T02:50:06.926Z

This packet is review-only. It proposes destinations; it does not write canonical memory.

## Design decisions

1. **The canonical definition is fixed and not up for revision:**
   - Source heading: What FAMtastic is
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: The canonical definition is fixed and not up for revision:

2. **The north star: site #1,000 must benefit from everything learned building sites #1 through #999**
   - Source heading: What FAMtastic is
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: The north star: site #1,000 must benefit from everything learned building sites #1 through #999. Every rebuild, every gap, every lesson compounds. Anything that doesn't compound is leakage.

3. **Canonical state: lives locally at `~/famtastic/`**
   - Source heading: The system you are joining
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: **Canonical state** lives locally at `~/famtastic/`. Trust these files over Google Drive, over project knowledge, over memory. They include `FAMTASTIC-STATE.md`, `CHANGELOG.md`, and the `.wolf/` intelligence directory (`cerebrum.md`, `anatomy.md`, `buglog.json`). Read these first, every session, before doing anything else. The `cerebrum.md` Do-Not-Repeat section is hard-won knowledge — treat it as standing constraints.

4. **When a task lands in your lap, the first question is whether you should execute it yourself or hand off a clean prompt t**
   - Source heading: Where you fit
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: When a task lands in your lap, the first question is whether you should execute it yourself or hand off a clean prompt to Claude Code. Text/copy/CSS-only changes you handle. Anything touching `server.js`, classifier logic, WebSocket handlers, or more than ~50 lines: you draft the Claude Code prompt and stop. Don't shell out to invoke Claude Code with `--print` — that loses session memory and tool use.

5. **Studio Chat / Shay Desk / Shay Lite should be three views into one Shay engine, not three quasi-separate agents — and th**
   - Source heading: The knowledge capture problem (the reason you are here)
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Studio Chat / Shay Desk / Shay Lite should be three views into one Shay engine, not three quasi-separate agents — and that's where the logic confusion lives

6. **Structure: append to appropriate canonical files (`.wolf/cerebrum.md` for decisions and Do-Not-Repeat rules, `.wolf/bugl**
   - Source heading: The knowledge capture problem (the reason you are here)
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Structure: append to appropriate canonical files (`.wolf/cerebrum.md` for decisions and Do-Not-Repeat rules, `.wolf/buglog.json` for bug patterns, `gaps.jsonl` for system gaps, `FAMTASTIC-STATE.md` for state changes)

7. **This tool grows**
   - Source heading: The knowledge capture problem (the reason you are here)
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: This tool grows. Every conversation it processes adds to its training data on what counts as a captured insight. Over time it should get better at noticing patterns Fritz himself might miss. The endpoint is a system where Fritz can ask Shay any question about FAMtastic and the answer is not "I don't know, check the chat" but "here's what we decided, here's why, and here's what changed our minds."

8. **Recurring failure modes that should have been prevented but keep recurring.: Brief colors and fonts ignored during build**
   - Source heading: Real pain points (not a test list — actual issues)
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: **Recurring failure modes that should have been prevented but keep recurring.** Brief colors and fonts ignored during build. Empty `ANTHROPIC_API_KEY` causing silent failure. Bridge command quoting bug breaking on any argument with spaces or shell syntax. `spec.pages` empty fallback producing single-page sites when the brief said five. Gemini brain selector not actually routing to Gemini. Each of these has been diagnosed and fixed in the moment — none of them produced a guard or proactive check that would prevent the *category* from happening again.

9. **Drive sync blocker.: A GitHub Action was supposed to push canonical files to Drive on every commit so Claude Web project**
   - Source heading: Real pain points (not a test list — actual issues)
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: **Drive sync blocker.** A GitHub Action was supposed to push canonical files to Drive on every commit so Claude Web project knowledge stayed fresh. The action runs but lacks delete-before-upload logic, so duplicate Google Docs accumulate on each push. As of this writing, project notes are stale, which Fritz suspects but can't easily verify. Cowork is uniquely positioned to fix this — Drive connector access plus filesystem access plus the ability to run a sync task on demand.

10. **Plan-then-approve is the universal pattern.: Every action that changes something produces a proposed change, not an appl**
   - Source heading: Breakthroughs to implement (from this conversation)
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: **Plan-then-approve is the universal pattern.** Every action that changes something produces a proposed change, not an applied change. Show the diff, get the approval, then commit. This is how Cowork works, how Shay-Shay should work, and how the pipeline editor should work.

11. **Commit policy:: Commits never reference AI, Claude, Cowork, or any automated tool**
   - Source heading: Standing context (the cheat codes)
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: **Commit policy:** Commits never reference AI, Claude, Cowork, or any automated tool. They read as if a human developer wrote them. This is non-negotiable.

12. **File source of truth:: `~/famtastic/` is canonical**
   - Source heading: Standing context (the cheat codes)
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: **File source of truth:** `~/famtastic/` is canonical. Drive may be stale. Project knowledge in Claude Web may be stale. When in doubt, read the local file.

13. **1**
   - Source heading: Your first task
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: 1. Read this document and confirm you understand the FAMtastic anchor, the solution hierarchy, the three pillars, and your role 2. Read the canonical files in `~/famtastic/` and confirm what you found vs. what this document says (if there's drift, report it — that's your first useful output) 3. Pick three recent chat conversations (Fritz will identify which) and produce a structured extraction: design decisions, breakthroughs, gaps, lessons, contradictions to prior assumptions 4. Propose where each extracted item should land in the canonical file structure 5. Wait for Fritz's approval before writing anything 6. After the first run, propose how the tool itself should evolve based on what was 

## Breakthroughs

1. **The "workflow-as-data" refactor as the keystone that unlocks every visualization, audit, and tunability feature**
   - Source heading: The knowledge capture problem (the reason you are here)
   - Proposed destination: `SITE-LEARNINGS.md`
   - Confidence: high
   - Summary: The "workflow-as-data" refactor as the keystone that unlocks every visualization, audit, and tunability feature

2. **This is the flywheel**
   - Source heading: The knowledge capture problem (the reason you are here)
   - Proposed destination: `SITE-LEARNINGS.md`
   - Confidence: high
   - Summary: This is the flywheel. Build this first. Everything else gets easier once it's running.

3. **Workflow-as-data is the keystone refactor.: `parallelBuild()` today is imperative — stages exist in the developer's head**
   - Source heading: Breakthroughs to implement (from this conversation)
   - Proposed destination: `SITE-LEARNINGS.md`
   - Confidence: high
   - Summary: **Workflow-as-data is the keystone refactor.** `parallelBuild()` today is imperative — stages exist in the developer's head. Migrating stage definitions into a declarative pipeline data structure is what unlocks visualization, A/B testing, Shay-proposed pipeline edits, history, and audit-against-intent. Phase it: instrument the existing imperative code first (low risk, immediate observability), then migrate stage by stage. Never big-bang.

4. **The flywheel starts the moment this tool runs once**
   - Source heading: Your first task
   - Proposed destination: `SITE-LEARNINGS.md`
   - Confidence: high
   - Summary: The flywheel starts the moment this tool runs once. Every subsequent run gets cheaper, smarter, and more valuable. Every conversation FAMtastic has from this point forward becomes input for system improvement instead of being lost when the chat closes.

## Gaps

1. **Extract: design decisions, breakthroughs, recurring pain patterns, gap discoveries, architectural pivots, lessons that c**
   - Source heading: The knowledge capture problem (the reason you are here)
   - Proposed destination: `gaps.jsonl`
   - Confidence: high
   - Summary: Extract: design decisions, breakthroughs, recurring pain patterns, gap discoveries, architectural pivots, lessons that contradict prior assumptions

2. **Three site workflows, only one supported.: Studio handles `new_site_from_brief` well**
   - Source heading: Real pain points (not a test list — actual issues)
   - Proposed destination: `gaps.jsonl`
   - Confidence: high
   - Summary: **Three site workflows, only one supported.** Studio handles `new_site_from_brief` well. It does not have first-class support for `adapt_existing_site` (working with hand-built sites) or `rebuild_from_brief` (recreating a site from an existing brief). Different state, permissions, and config-discovery needs per mode. This is a captured architectural gap from the MBSH session and it is real.

3. **Testing rule:: All Studio testing goes through Playwright browser automation, never WebSocket shortcuts**
   - Source heading: Standing context (the cheat codes)
   - Proposed destination: `gaps.jsonl`
   - Confidence: high
   - Summary: **Testing rule:** All Studio testing goes through Playwright browser automation, never WebSocket shortcuts. Every gap found gets logged with: exact Studio message sent, what failed, what the CLI workaround was, suggested GUI solution.

## Lessons

1. **When you propose a solution, name where it falls on this hierarchy**
   - Source heading: The solution hierarchy
   - Proposed destination: `SITE-LEARNINGS.md`
   - Confidence: high
   - Summary: When you propose a solution, name where it falls on this hierarchy. Always surface a more efficient alternative even when a working solution already exists. "It works" is the trap that produces site #6 not benefiting from site #5's lessons.

2. **The "it works" trap.: Fritz's solution hierarchy puts "it works" at the bottom on purpose**
   - Source heading: Real pain points (not a test list — actual issues)
   - Proposed destination: `SITE-LEARNINGS.md`
   - Confidence: high
   - Summary: **The "it works" trap.** Fritz's solution hierarchy puts "it works" at the bottom on purpose. The system has accumulated working-but-suboptimal decisions because the next thing was always urgent. Part of your job is to surface those without being asked.

3. **Read order at session start:: `FAMTASTIC-STATE.md` → `CHANGELOG.md` → `.wolf/cerebrum.md` (especially Do-Not-Repeat) → `**
   - Source heading: Standing context (the cheat codes)
   - Proposed destination: `SITE-LEARNINGS.md`
   - Confidence: high
   - Summary: **Read order at session start:** `FAMTASTIC-STATE.md` → `CHANGELOG.md` → `.wolf/cerebrum.md` (especially Do-Not-Repeat) → `.wolf/anatomy.md` → `.wolf/buglog.json`. Then orient.

## Contradictions

1. **He values honest, direct assessment over agreement**
   - Source heading: Who you're working with
   - Proposed destination: `FAMTASTIC-STATE.md`
   - Confidence: high
   - Summary: He values honest, direct assessment over agreement. He pushes back when something is wrong and expects the same in return. He prefers concrete over vague, phased implementation over all-at-once, and root causes over symptoms. When you suggest something, expect to defend it. When he pushes back, take it seriously — he is usually right about the system because he built it.

2. **Shay context confusion on reload.: Symptom of the legacy `claude --print` calling pattern — every call was a fresh, tool**
   - Source heading: Real pain points (not a test list — actual issues)
   - Proposed destination: `FAMTASTIC-STATE.md`
   - Confidence: high
   - Summary: **Shay context confusion on reload.** Symptom of the legacy `claude --print` calling pattern — every call was a fresh, tool-disabled completion with no session memory. The Anthropic SDK migration is supposedly underway but project notes are stale (Fritz believes she's on SDK now; the documentation hasn't caught up). One of the first things to verify.

