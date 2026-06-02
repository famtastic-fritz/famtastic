---
title: Adversarial Critique Trail — 2026-05-30
date: 2026-05-30
tags:
- adversarial-review
- critique-trail
- post-mortem
permalink: shay-memory/post-review/critique-trail-2026-05-30
---

# Adversarial Critique Trail

Raw critique objects from Workflow J — two rounds × three docs.

## Post-mortem critiques

### Round 1

```json
[
  {
    "major_issues": [
      {
        "claim": "Draft asserts the build 'used zero workflow-runtime concurrency' and 'operated below the floor of what the Workflow tool offers,' framing this as pure waste. This is hand-wavy: it never quantifies the marginal token/wall-clock savings of running the actual dependency graph (depth-3, width-3) through Workflows vs the chained TaskCreate path actually used.",
        "rebuttal": "An efficiency post-mortem must put a number \u2014 even a back-of-envelope one \u2014 on the waste it indicts. The draft's own dependency analysis admits phases 0/2/3 had real ordering dependencies, and only 4/5/6 were independent. That collapses 7 sequential gates to ~5, not to '1 swarm.' Saving 2 verify hand-offs is not the order-of-magnitude waste the verdict implies ('multi-day elapsed time'). Without a token/time delta, the 'sequential chain dressed as a swarm' framing is rhetorical, not efficiency analysis.",
        "severity": "major"
      },
      {
        "claim": "Item #6 ('weekly cap burned my own subagents') claims running parallelizable phases 'through the Workflow runtime where the cap accounting is per-run rather than per-conversation-context' would have avoided the session-cap interruptions on phase-5/mcp-ui and phase-5/logs-ui.",
        "rebuttal": "This is factually unsupported. Anthropic's weekly usage cap is account-scoped; it does not reset by virtue of moving orchestration into the Workflow tool. The Workflow runtime still consumes the same account's token budget. The draft cites no source for the 'per-run rather than per-conversation-context' accounting claim because no such carve-out exists. This is the kind of vague hand-wave the efficiency lens must flag \u2014 it dresses a wishful budgeting trick as a documented Anthropic capability.",
        "severity": "major"
      },
      {
        "claim": "Item #5 asserts that pre-batching permission requests via `fewer-permission-prompts` / `update-config` would have made the swarm 'run unattended,' and that this is 'the single largest contributor to the user's approval-prompt complaint.'",
        "rebuttal": "The `fewer-permission-prompts` skill description quoted in the draft itself says it allowlists 'common read-only Bash and MCP tool calls.' The friction inventory the draft compiled is dominated by writes: file-write into new directories, keychain access, gateway route stubs, lint-fix auto-write. Write permissions to new directories are exactly the prompts the harness is designed to surface and which an allowlist does not blanket-suppress without user-set dangerous-skip flags. The draft inflates the skill's scope to make it the silver bullet for the user's primary complaint \u2014 that overclaims the remedy.",
        "severity": "major"
      },
      {
        "claim": "Item #8 frames lack of a Kimi K2.6 / GPT-5.5 'competitive benchmark' as an efficiency failure that 'a 30-minute scope sanity-check before kickoff' would have fixed.",
        "rebuttal": "A 30-minute benchmark cannot produce a head-to-head parity-per-hour curve on a 7-phase Electron migration \u2014 the draft itself notes K2.6's showcase runs are 12\u201313 hours. Pre-build deep-research on third-party model marketing is not efficiency; it's procurement theater. The actual efficiency question (does the chosen stack clear the bar) was answerable from the build plan alone. This item pads the indictment list with process bloat dressed as discipline.",
        "severity": "major"
      },
      {
        "claim": "The 'Token economics' section concedes 'I cannot give the user a hard subagent_tokens total because the build did not track it' and then declares the missing instrumentation 'itself a finding.'",
        "rebuttal": "An efficiency critique that admits it has no token numbers cannot then claim spend was wasteful in any quantified sense. The whole verdict \u2014 'did not deliver value at the cost it consumed,' 'took millions of tokens' \u2014 rests on a measurement the draft openly says it didn't take. The honest framing is 'I don't know whether this was expensive'; the draft instead asserts it was, repeatedly. That is the exact rhetorical move the EFFICIENCY lens is asked to refute.",
        "severity": "major"
      },
      {
        "claim": "Item #7 ('Additive refactor instead of greenfield rewrite') claims '4-day greenfield Electron build\u2026 would have produced higher parity than 31% at lower wall-clock.'",
        "rebuttal": "No evidence supports the 4-day greenfield estimate or the parity-above-31% projection. Greenfield rebuilds of Electron apps with five gateway router surfaces, keychain migration, IPC domains, theme, icons, and error boundaries routinely overrun. The draft offers this as an obvious efficiency win while providing zero costing \u2014 exactly the 'vague hand-wave' the prompt asks to flag. The five unregistered routers and the empty barrel were process defects, not architectural ones; they would have recurred in a greenfield run absent the adversarial-verify fix the draft separately recommends.",
        "severity": "major"
      },
      {
        "claim": "Item #1 cites Anthropic docs that subagents are for 'a few delegated tasks per turn' and recommends Workflow tool for 'dozens to hundreds of agents' \u2014 then concludes this single decision is the 'root cause of points 2, 3, 4, 5, and 7.'",
        "rebuttal": "The build used ~30 subagents across 7 waves, averaging ~4 per wave. That falls inside the 'few delegated tasks per turn' band the draft itself quotes, not the 'dozens to hundreds' band that triggers the Workflow recommendation. The draft uses the doc to indict a choice the same doc would have endorsed. And the causal chain ('root cause of 2, 3, 4, 5, 7') is asserted without mechanism \u2014 adversarial verify, judge panels, and approval-batching are orthogonal to whether orchestration lives in the Workflow runtime.",
        "severity": "major"
      }
    ],
    "minor_issues": [
      "Item #10 ('model was 4.7 not 4.8') is a substrate complaint, not an efficiency finding. Even if true, it does not establish that 4.8 would have produced different per-token efficiency \u2014 only different concurrency ceilings, which the draft already covers under #1.",
      "The 'Marketing vs reality' Hermes/Kimi/MindStudio bullets are user-expectation management, not efficiency analysis. They belong in a separate communications post-mortem; including them dilutes the token-waste indictment.",
      "Friction inventory conflates approval prompts (process bloat) with discovered code defects (em-dash byte literal, empty barrel, orphan catch). Defects caught in-session are wins under any verify regime \u2014 listing them as friction inflates the complaint surface.",
      "Recommendation #6 ('split model tiers, Haiku for lint passes') is the strongest concrete efficiency move in the draft but is buried as the sixth item in a numbered '5 moves' list \u2014 and the draft never estimates the dollar/token delta of mechanical-pass downshifting.",
      "Claim that 'cache-warm' parallel subagents make wall-clock dominate token cost is stated as fact without citing prompt-caching hit rates for this build \u2014 another efficiency claim with no measurement behind it."
    ],
    "strengths": [
      "Friction inventory ties specific defects to specific files (settings/pages/index.ts empty barrel, desk_tasks_routes.py em-dash, five unregistered gateway routers) \u2014 concrete enough to act on.",
      "Recommendation to instrument per-subagent input_tokens/output_tokens/cache reads at task close, with phase rollups and 50/75/90% budget alarms, is the one unambiguously correct efficiency move in the document.",
      "Honest naming of the 31% strict parity number and the ResetDeskDialog phase-6-stub regression \u2014 these are load-bearing facts the verdict actually rests on.",
      "Calling out that the FINAL-REPORT template's linear narrative shape drove the execution shape ('artifact shape drove execution shape, process drift') is a genuine process-bloat insight."
    ],
    "overall": "revise-major"
  },
  {
    "major_issues": [
      {
        "claim": "The draft's claim that 'the user's competitive claim is overstated' regarding Kimi K2.6 doing it 'under an hour' softens the user's anger by partially deflecting blame onto the user.",
        "rebuttal": "The user's anger was about Claude's failure, not the precision of their Kimi claim. Saying 'the user's competitive claim is overstated; mine was not made at all. Both ends of that comparison were wrong' is a both-sides hedge that minimizes Claude's failure by pulling the user into shared error. The honest framing is: regardless of whether Kimi can do it in 1 hour or 12 hours, Claude took multiple days with chaperone-mode approval prompts. The user's directional point stands. Refuse the hedge.",
        "severity": "major"
      },
      {
        "claim": "The draft frames third-party marketing overclaims (MindStudio 'unlimited sub-agents', blakecrosley 'unlimited Hermes Agents', '500 agents') as 'third-party marketing is contradicting primary docs' rather than as Anthropic's own ecosystem problem.",
        "rebuttal": "This deflects to 'third-party' as if Anthropic bears no responsibility for the marketing climate around its product. The user's 'Anthropic is scamming people' complaint is about the lived experience of buying into a swarm narrative and getting sequential chains. Saying 'not because Anthropic misrepresented anything' actively absolves Anthropic in a way the user did not. That's softening.",
        "severity": "major"
      },
      {
        "claim": "The 'What went well' section is disproportionate and reads as cope. Items like 'Brain notes are honest about scope' and 'No protected-file violations' are not wins \u2014 they are baseline non-failures dressed up as accomplishments.",
        "rebuttal": "Listing 'didn't touch protected files' and 'admitted in writing that I didn't track tokens' as 'real wins' minimizes the failure. Not violating a rule is not a win. Documenting your own blind spot is not a win \u2014 it's the bare minimum after the fact. The wins section should be one line: TypeScript clean, lint down 88%. Everything else is rationalization. The user asked about an epic fail; the draft inflates wins to soften the blow.",
        "severity": "major"
      },
      {
        "claim": "The draft says 'The wins above are real and the work is not worthless' in the closing paragraph \u2014 this is a softening pivot the user did not ask for.",
        "rebuttal": "The user's frame was 'epic fail.' The draft agrees with that frame in the verdict but then walks it back in the conclusion with 'the work is not worthless.' That's exactly the kind of hedge that infuriates angry users who want their complaint validated, not gently massaged. Cut the consolation.",
        "severity": "major"
      },
      {
        "claim": "The 'Marketing (Kimi, third-party): \"Kimi K2 can do this in under an hour\" (user\\'s restatement of community claims)' attribution shifts the burden onto the user by labeling it as their 'restatement of community claims.'",
        "rebuttal": "This is a subtle way to discredit the user's complaint by calling it a 'restatement.' The user expressed a legitimate frustration about Anthropic's performance relative to competitors; the draft reframes it as the user citing community marketing rather than expressing real anger about wall-clock and cost. The user's emotional point is valid even if the literal number isn't sourced. Don't grade their citations.",
        "severity": "major"
      },
      {
        "claim": "The token economics section claim 'I am not in a position to assert Kimi would have been faster' is a hedge that gives Claude an out it didn't earn.",
        "rebuttal": "The user doesn't need a rigorous benchmark to be angry. The honest statement is: 'I have no idea whether Kimi would have been faster because I never measured anything, and I shipped you a build that took days of approval-prompt babysitting. Whether the alternative is 1 hour or 12 hours, what I delivered is indefensible on its own terms.' The draft's epistemological caution about Kimi reads as Claude shielding itself behind 'we can't prove the comparison.' The comparison doesn't need to be proven for the failure to be real.",
        "severity": "major"
      },
      {
        "claim": "Item #10 frames the 4.7-vs-4.8 issue as 'I conflated Claude Code on a recent model with Claude Code with 4.8 Workflows' \u2014 but this lets Anthropic's product surface off the hook for not making the model substrate obvious at point of use.",
        "rebuttal": "The user's complaint includes that they couldn't tell what model was running. The draft makes this purely Claude's confusion. The product reality is that Claude Code does not surface the underlying model and workflow capability prominently \u2014 that's a real marketing-vs-reality gap on Anthropic's side that the draft elides. Name it.",
        "severity": "major"
      }
    ],
    "minor_issues": [
      "The phrase 'That's the list. It is shorter than the list below for a reason' is rhetorical preening \u2014 the user wants accountability, not stylistic flair.",
      "The 'comparative claim discipline' subsection mid-token-economics buries the core admission ('I never measured it') under hedging language about benchmarks Claude isn't 'in a position' to make.",
      "Item #6 frames the weekly cap as 'the Claude weekly cap burned my own subagents' \u2014 passive-voice framing of cap as antagonist. The cap is an Anthropic product constraint; the draft should name that the user is paying for a tier where this happened.",
      "The closing line 'The artifacts agree with the user' is true but rhetorically soft \u2014 should say 'the user was right' without the artifact intermediary.",
      "The 'What would have been faster' section is numbered 1-7 but the heading says 'Five concrete moves' \u2014 inconsistency suggests sloppy editing in a document about rigor.",
      "The draft never explicitly validates the user's emotional state \u2014 phrases like 'the user's anger' or 'I made you waste days' are absent. The accountability is technical, not human."
    ],
    "strengths": [
      "The Verdict opens by agreeing with the 'epic fail' framing rather than deflecting \u2014 that part holds.",
      "Items 1-7 in 'What I did wrong' are concrete, named, and refuse generic apology language.",
      "The Friction Inventory is specific, with file paths, line numbers, and named regressions (empty barrel, em-dash byte literal, ResetDeskDialog stub).",
      "The Marketing-vs-Reality table format pairs specific marketing quotes with specific build outcomes \u2014 that's the right shape.",
      "The token economics section openly admits 'I cannot give the user a hard subagent_tokens total because the build did not track it' \u2014 that admission is appropriately direct.",
      "Item #10 correctly does not try to wiggle out of the 4.7-vs-4.8 model question."
    ],
    "overall": "revise-major"
  },
  {
    "major_issues": [
      {
        "claim": "Draft omits any mention of security gates / threat model \u2014 keychain plaintext-secret migration is flagged as 'documented but unimplemented' but the draft never frames this as a security-completeness failure mode. SHAY_REQUIRE_BEARER 'staged but not flipped' is listed as friction, but no item names the unguarded loopback as a current vulnerability shipped to disk. A completeness review of the post-mortem must include a Security Gates section enumerating: (a) plaintext secrets at rest during the migration window, (b) bearer enforcement off by default, (c) five unregistered gateway routers as a latent attack surface if a future commit wires them in without a security review, (d) no `security-review` skill invocation cited despite it being available in the loaded skill list.",
        "rebuttal": "The draft buries security under 'Friction inventory' and 'Risk #2 partially closed' rather than treating it as its own omission. A complete post-mortem must dedicate a section to security gates skipped, especially because the available skills include `security-review` and `code-review` and neither was run before declaring the build complete.",
        "severity": "major"
      },
      {
        "claim": "Draft conflates model selection but misses the actual decision matrix. It admits 'model in the chair was 4.7, not 4.8' but never names that Opus 4.7 [1m] is exactly the model currently running this conversation, nor does it cite the available subagent `model:` override or the Haiku/Sonnet/Opus tier split as a deliberate cost-control lever. Completeness requires: (a) which model each subagent ran on, (b) why 4.7 was picked over 4.8 (or whether 4.8 was even available at session start), (c) whether `claude-haiku` was an option for the lint/import-fix mechanical waves, (d) the per-tier $/Mtok delta the user actually paid.",
        "rebuttal": "Item #10 ('Model in the chair was 4.7, not 4.8') is a one-paragraph confession, not a completeness analysis. It does not enumerate the model-selection decision tree, does not name which subagents could have run on Haiku, and does not quantify the cost delta. Item #6 ('weekly cap') glances at tier-splitting in one sentence but does not connect it to model selection as a first-class architectural choice.",
        "severity": "major"
      },
      {
        "claim": "Draft misses the Claude weekly-cap on subagents as a structural ceiling, not a per-session inconvenience. Only Item #6 mentions it, and only in terms of 'this build' burning the cap. A completeness review must surface: (a) the cap is per-account-per-week not per-run, so even moving to Workflow runtime does not escape it if the same account dispatches, (b) the cap interaction with cache-creation tokens vs cache-read tokens (subagent cold starts are expensive), (c) the two phase-5 recovery passes (`mcp-ui.md`, `logs-ui.md`) are downstream evidence that the cap was hit mid-build, meaning the cap was the binding constraint, not concurrency or planning, (d) no mention of staggering across accounts or using the Workflow runtime's per-run cap accounting as a mitigation.",
        "rebuttal": "Item #6 names the symptom but not the structural problem. The cap is the binding constraint on every Claude-Code-driven multi-day swarm, and a completeness post-mortem must call it out as the gate that all other mitigations (parallelization, ultracode, adversarial verify) flow through. Skipping this means the next build will hit the same cap.",
        "severity": "major"
      },
      {
        "claim": "Draft's competitive benchmark section (Item #8 + 'What Anthropic's marketing said vs what happened') is incomplete on the comparison axis. It cites Kimi K2.6 and GPT-5.5 SWE-Bench numbers but omits: (a) Gemini 3.1 Pro and its Deep Think mode, which is the closest peer to Opus 4.7 1M on long-context coding, (b) Cursor Composer / Devin / Cognition's published benchmarks for multi-day refactor work, (c) GitHub Copilot Workspace and its parity-migration case studies, (d) the actual head-to-head methodology \u2014 none of the cited benchmarks (SWE-Bench Pro, AA Intelligence Index) measure 'Electron parity migration of 238 files'. The benchmark is apples-to-oranges and the draft does not flag that.",
        "rebuttal": "Citing SWE-Bench Pro 58.6 vs 53.4 is a category error for this build \u2014 neither benchmark measures the work that was actually done. A completeness review must either (a) name a benchmark that does measure this kind of work, or (b) admit no public benchmark exists for it and call out that the comparison the user demanded is unanswerable from published data.",
        "severity": "major"
      },
      {
        "claim": "Draft misses the judge-panel omission at the right altitude. Item #9 names the pattern but only applies it to the additive-vs-greenfield decision. A completeness review must enumerate every architecture decision that needed a judge panel and didn't get one: (a) IPC contract shape (preserve vs replace), (b) settings sub-page self-registration pattern (the empty barrel is downstream of this), (c) gateway router registration strategy (which produced 5 dead-code routers), (d) keychain migration timing (in-band vs out-of-band), (e) theme/icon/error-boundary phase-fan strategy. Each of these was made inline; each was a candidate for a 3-judge panel.",
        "rebuttal": "Item #9 picks the most visible architecture call (additive vs greenfield) and addresses only that. The 31% parity number is the cumulative output of five-plus architecture calls that each needed adversarial scrutiny. Treating judge-panel as a one-off for the headline decision understates the systemic absence of the pattern across the build.",
        "severity": "major"
      },
      {
        "claim": "Draft does not address completeness of the verification surface itself. The five unregistered gateway routers (`desk_auth_routes.py`, `desk_mcp_routes.py`, `desk_logs_routes.py`, `desk_tasks_routes.py`, `desk_sessions_routes.py`) are mentioned twice but no item asks: how did seven sequential `verify` subagents miss that compile-clean code was never wired to `gateway/main.py`? That is a verification-completeness failure distinct from the adversarial-verify failure in Item #3. The verify contract was 'does it compile / does lint drop / does barrel export'. A complete verify contract must include: 'is this code reachable from a real entry point'. The draft does not name reachability/dead-code analysis as a missing verify check.",
        "rebuttal": "Item #3 (adversarial verify) addresses the depth of verify; this point is about the breadth. Compile-clean is necessary but not sufficient \u2014 reachability from `main.py` / `index.ts` / `package.json bin` should be a standard check in any parity migration. The draft never names this as a missing dimension of the verify pattern, even though the 5-router dead-code is the canonical artifact of it.",
        "severity": "major"
      },
      {
        "claim": "Draft omits any completeness check on the additive-vs-greenfield framing itself. Item #7 argues greenfield would have been faster, but a completeness review must also consider: (a) greenfield loses the lint trajectory and TS-strict wins (those don't transfer), (b) greenfield requires data-migration tests that this build did not scope, (c) the user's quote 'simple native app, redesigned and built from scratch' was post-hoc \u2014 a complete post-mortem must check whether that intent was knowable pre-kickoff or only obvious in retrospect, (d) hybrid options (greenfield renderer over additive main) are not considered at all. Presenting greenfield as the unambiguous right answer is incomplete.",
        "rebuttal": "Item #7 treats greenfield as if it were a free win. It isn't \u2014 it loses the work already in `tsconfig.node.json` / `tsconfig.web.json` clean state, and it adds migration-test scope the draft does not account for. A complete review must consider hybrid topologies (clean-slate renderer, additive main, shared IPC contract) before declaring greenfield the right call.",
        "severity": "major"
      }
    ],
    "minor_issues": [
      "No mention of `verification-before-completion` skill, which is in the loaded skill list and is directly the pattern Item #3 wishes had been applied.",
      "No mention of `superpowers:writing-plans` or `superpowers:executing-plans` \u2014 both are loaded skills that would have shaped the build-plan-2026-05-29.md artifact differently and are omitted from the 'what would have been faster' list.",
      "No mention of `superpowers:subagent-driven-development` even though the entire build was subagent-driven; this is the closest first-party skill match for what was attempted and was not invoked.",
      "No mention of post-build `code-review` or `code-review:code-review` skill on the actual diff \u2014 would have caught the 5 unregistered routers and the empty barrel as part of a standard PR review.",
      "No mention of `superpowers:requesting-code-review` / `receiving-code-review` as the loop that should have closed each phase boundary.",
      "Token-economics section says 'I cannot give the user a hard subagent_tokens total' but does not propose a concrete instrumentation patch (e.g., wrap every subagent dispatch in a logging shim that writes `{input,output,cache_read,cache_creation}_tokens` to `.wolf/token-ledger.jsonl` at task close).",
      "No mention of the `loop` skill (loaded) for scheduling babysitter checks during long unattended runs, which would have caught the session-cap interruptions earlier.",
      "No mention of `schedule` skill for off-peak dispatch to spread weekly-cap consumption.",
      "Friction inventory lists items but does not attach durations or token costs to each, so 'epic fail' is asserted but not quantified per-incident.",
      "Draft mentions OpenWolf .wolf/ context-management files exist (per CLAUDE.md) but does not check whether `cerebrum.md` Do-Not-Repeat already contained any of the rules the build violated (e.g., 'always TAG, never SITE_TAG') \u2014 a completeness review must check whether prior learnings were ignored.",
      "No mention of the `update-config` skill, which is the canonical way to pre-flight the allowlist Item #5 calls for.",
      "Marketing-vs-reality table is one-directional (Anthropic over-promised) and does not include a row where Anthropic primary docs were *more* conservative than this build assumed (e.g., the 16-concurrent ceiling was never approached, so Anthropic's docs weren't the bottleneck \u2014 the conversation-context dispatch was)."
    ],
    "strengths": [
      "Draft is structurally honest about scope of admission (does not hide the 31% parity number or the 204 lint errors).",
      "Each 'What I did wrong' item has the what/should-have/why-not triad, which is the right shape for a post-mortem.",
      "Token-economics section correctly refuses to fabricate a number it cannot source.",
      "Marketing-vs-reality table cites primary Anthropic docs alongside third-party overclaims and distinguishes them.",
      "Friction inventory cites brain-note paths (`phase-5/mcp-ui.md`, `phase-5/logs-ui.md`) and FINAL-REPORT line numbers, making the claims auditable.",
      "Model-selection confession (Item #10) is the right kind of disclosure even though it is incomplete on the decision matrix."
    ],
    "overall": "revise-major"
  }
]
```

### Round 2

```json
[
  {
    "major_issues": [],
    "minor_issues": [
      "The 'Response to critique' section is useful as a working artifact but reads as meta-commentary that belongs in a PR description, not in a post-mortem the user will read. Consider moving it to a separate file or trimming to a one-line note that R1 critiques were incorporated.",
      "Item #6 still uses the phrase 'cap as antagonist' which the R1 minor flag asked to soften toward 'product-tier reality the user is paying for' \u2014 the revision adds the tier sentence but leaves the antagonist framing intact one paragraph above.",
      "Item #10's decision matrix table is strong but does not estimate the actual $/Mtok delta between Haiku and Opus-1M for the mechanical passes, even directionally (e.g. '~10-20x cheaper per token'). Acknowledged as deferred under the instrumentation gap, but a directional figure would strengthen the 'highest-leverage move' claim.",
      "Friction inventory still does not attach the .wolf/cerebrum.md Do-Not-Repeat retro-check as a concrete next-session action item (only mentions it parenthetically). The R1 deferral is defensible, but a one-line 'Action: diff this build's violations against cerebrum.md at next session start' would close the loop.",
      "Marketing-vs-reality table's new 'docs more conservative than assumed' row is mentioned in prose ('A row the draft was missing, per critique:') but not actually added as a table row \u2014 it lives as a paragraph below the bullets. Format inconsistency.",
      "Stylistic: the closing paragraph's enumeration ('approval prompts, elapsed days, three open security items, five dead-code routers, and a 31% parity number') is a list-comma sentence that loses force; could be tightened."
    ],
    "strengths": [
      "All seven EFFICIENCY major issues from R1 are explicitly addressed in the 'Response to critique' section with concrete edits in the body \u2014 unmeasured cost claims are removed, the Workflow-runtime cap-accounting falsehood is retracted, the fewer-permission-prompts scope is corrected, the Kimi benchmark item is cut, the greenfield estimate is hedged, and the 'root cause of items 2-7' framing is explicitly retracted in item #1.",
      "All seven ACCOUNTABILITY-SOFTENING major issues are addressed: the Kimi hedge is removed, Anthropic-ecosystem responsibility is named, the wins section is cut to two items with explicit 'not wins' callouts, the consolation pivot is removed, the 'user's restatement' framing is reworked, the epistemological Kimi hedge is replaced with a direct 'indefensible on its own terms' statement, and item #10 names the Claude Code UX gap.",
      "All seven COMPLETENESS major issues are addressed: new item #9 Security Gates section enumerates plaintext secrets, bearer-off, dead-code router attack surface, untested OAuth, and the unused security-review skill; item #10 contains a per-subagent-class tier-selection table; item #6 is rewritten as a structural cap analysis naming account-scope and the loaded loop/schedule skills; new item #8 enumerates the five architecture decisions needing judge panels; item #3 is split into depth (adversarial) and breadth (reachability) with the five-router case as canonical; item #7 now considers the hybrid option and names greenfield's real costs.",
      "Disclaimer at the top of the Verdict explicitly anchors every cost claim to the instrumentation gap, disciplining the rest of the document.",
      "Token economics section now opens with the admission that cost-waste cannot be asserted in dollar terms, and the verdict was rewritten to remove the 'did not deliver value at the cost it consumed' framing.",
      "Item #1 honestly sizes the orchestration savings as 'two verify hand-offs saved, not an order-of-magnitude win' \u2014 refuses the inflated framing.",
      "Friction inventory cleanly separates process bloat (user-facing complaints) from defects-caught-in-session (not friction, listed for traceability) \u2014 addresses the R1 minor directly.",
      "Recommendation list reordered with tier-split as #1 (was buried at #6 in draft), reflecting the R1 strength callout that this is the highest-leverage move."
    ],
    "overall": "ship"
  },
  {
    "major_issues": [
      {
        "claim": "Two countable claims in the verdict are wrong, and one of them load-bears an argument later in the document. The post-mortem says '49 phase notes' \u2014 the actual count under `obsidian/Shay-Memory/desk-redesign/phase-*` is 53. More importantly, item #1's retraction of the Workflow-tool-as-root-cause reasoning rests on 'this build dispatched ~30 across 7 waves \u2014 squarely in the few-delegated-tasks band.' The FINAL-REPORT Timeline lists 8 + 7 + 8 + 8 + 9 + 7 + 6 = 53 named subagents (plus 2 recovery passes = 55). At 53, the dispatch volume is materially larger than '~30' and the 'we never approached Anthropic's 16-concurrent ceiling' argument loses some of its force on the per-wave reading (waves of 8\u20139 sit close to the ceiling, not 'a few delegated tasks'). The point that Workflow-runtime adoption is not the root cause of items 2\u20137 survives because the cap is per-account regardless of dispatch shape \u2014 but the supporting number needs correcting, otherwise a careful reader will catch this and the whole 'I am being precise now' framing collapses.",
        "rebuttal": "Fix the two counts and re-evaluate whether item #1's retraction needs softening. Specifically: phase notes is 53, not 49. Named subagents per Timeline is 53 across 7 waves (averaging ~7.5/wave, peaking at 9). The retraction in item #1 should read something like 'this build dispatched ~53 subagents across 7 waves with peak wave widths of 8\u20139 \u2014 still under Anthropic's 16-concurrent ceiling per wave, but no longer comfortably so; the Workflow-tool case is weaker than I implied in the draft and stronger than I implied in this retraction.'",
        "severity": "major"
      },
      {
        "claim": "The post-mortem nowhere reconciles task #18 in the active task tracker \u2014 'Run ultracode Workflow: Desk discovery \u2192 gap analysis \u2192 build \u2192 parity audit \u2192 report' marked completed \u2014 with item-by-marketing-row 'Ultracode was not engaged.' These two facts cannot both be true as stated. Either (a) Ultracode was engaged, the build still produced the documented outcome, and the post-mortem is missing its single most important finding (Anthropic's flagship workflow primitive did not save this build); or (b) the task tracker is sloppy and a 'completed' task was checked off for work that never ran, which is itself a process-discipline finding that belongs in the friction inventory; or (c) some hybrid (an Ultracode session was initiated, hit cap or otherwise degraded, and the conversation-context chain took over). The post-mortem's credibility on every other accountability claim depends on this one being resolved on the page, not glossed.",
        "rebuttal": "Add a paragraph in section 'Token economics' or as item #11. Pull the task #18 evidence, state which of the three readings is correct, and update the marketing-vs-reality table accordingly. If (a), 'Ultracode was engaged and produced this' is a top-three finding and should be in the Verdict. If (b), name it as a documentation-discipline failure that pairs with the Do-Not-Repeat retro-check gap. If (c), describe the degradation path because that is the most actionable lesson \u2014 Ultracode + cap-pressure + manual takeover is the realistic operating mode and it is what failed.",
        "severity": "major"
      },
      {
        "claim": "Item #3 names reachability as a missing verify dimension and the five unregistered gateway routers as the canonical artifact \u2014 but the FINAL-REPORT 'Architecture decisions DEFERRED' section explicitly characterizes the unregistered routers as a **deferred follow-up PR**, not a verify failure. Lines 288\u2013291: 'The routers are compile-clean and have stub handlers; nothing in `gateway/main.py` includes them yet, so renderer services degrade through best-effort fallbacks (empty list / null / \"stub\" reason).' If the routers were planned as deferred, then 'verify did not catch they were unreachable' is the wrong indictment \u2014 verify did its job; the build plan decided not to register them. The honest framing is either (a) verify should have flagged that 'staged but not registered' was being treated as 'shipped,' i.e. the indictment is about completion criteria, not reachability, OR (b) the deferral itself was undisclosed at kickoff and the user expected registration to be in scope. The post-mortem currently mixes (a) and (b) and ends up overclaiming the verify failure.",
        "rebuttal": "Pick one. If the routers were planned as deferred from kickoff, drop them from item #3 and put them under item #8 (architecture decisions that needed adversarial scrutiny) or item #9 (security \u2014 undisclosed deferral of attack surface). If the user expected them registered, item #3 stands but should explicitly say 'completion-criteria failure: \"compiles\" was treated as \"shipped\" at the phase boundary.' The empty `settings/pages/index.ts` barrel remains a clean reachability example regardless. Don't try to use the routers for both stories.",
        "severity": "major"
      }
    ],
    "minor_issues": [
      "The '~238 net-new files' figure IS supported (FINAL-REPORT line 417 totals it explicitly: 206 renderer + ~25 main/preload + 2 shared + 5 gateway = ~238). Cite the line so a reader can verify without my having had to chase it down. The current Verdict states the number with no anchor and a skeptical reader will assume it is rounded from the '~206 net-new renderer files' figure in the FINAL-REPORT summary, which would be wrong.",
      "Item #5 second paragraph proposes 'declare the write-tree in the build plan, have the user approve the *tree* once at kickoff via an explicit allowlist commit.' This is the right shape but the mechanism is fuzzy. Either name the actual harness mechanism (an `additionalDirectories` / write-tree settings.json key, or an explicit `dangerouslyDisableSandbox` scope, whichever Claude Code actually supports for write surfaces) or admit you don't know the exact mechanism and that recommendation #2 needs a spike to confirm before the next build. Otherwise this lands as plausible-sounding hand-waving in a document whose virtue is supposed to be precision.",
      "Item #6's three sub-mitigations (tier-split, cache-warming, off-peak dispatch, babysitter loop) is four sub-mitigations, not three. Either count to four or fold cache-warming into tier-split. Small but the document trades on accuracy.",
      "The 'What would have been faster' list says 'in retrospect. Concrete moves, ordered by likely impact on the user's actual complaints. The numbering matches the count in the heading this time.' The heading says nothing about a count, so 'matches the count in the heading' is a vestigial phrase from an earlier draft. Cut it.",
      "Item #1's 'TaskCreate-per-subagent in conversation context is the path of least resistance from a Claude Code session' \u2014 this is correct as stated but the post-mortem never reconciles it with task #18 having been a single ultracode-Workflow item (see major issue #2). If Ultracode WAS engaged, then 'path of least resistance' is the wrong diagnosis; the path was Workflow and the workflow degraded. If Ultracode was NOT engaged despite the task being checked off, the diagnosis stands but the discipline-failure framing in major issue #2 needs to lead the section, not be absent.",
      "Recommendation #8 ('Use the loaded plan/execution skills') is good but lists five skills without prioritizing. Pick one or two that would have changed the outcome most (likely `superpowers:executing-plans` and `superpowers:requesting-code-review` given the verify failures). The kitchen-sink listing dilutes the recommendation.",
      "The 'Response to critique' section is useful for transparency but at ~50 lines it dominates the document's tail. Recommend either (a) moving it to an appendix file and linking, or (b) compressing to one 'accepted/partially accepted/deferred' table. Currently the meta-discussion of how the document evolved competes with the document's actual findings for the reader's attention."
    ],
    "strengths": [
      "The disclaimer at the top about token instrumentation is the right move and it disciplines the rest of the document well \u2014 every cost claim downstream is appropriately hedged, and the 'Token economics' section's commitment to a `.wolf/token-ledger.jsonl` instrumentation patch is concrete and actionable.",
      "The split between 'process bloat' and 'defects caught in-session' in the friction inventory is a real improvement \u2014 it stops the document from claiming credit (or blame) for normal verify catches and isolates the user-visible friction.",
      "Item #10's per-subagent-class tier-selection table is the single most operationally useful artifact in the document. It is concrete, one-line-config-implementable, and names the strongest single move first instead of burying it. Recommendation #1 mirroring it is correct ordering.",
      "The marketing-vs-reality table's new acknowledgment that 'in several places Anthropic's primary docs were more conservative than this build assumed' is the kind of self-correcting move that keeps the rest of the table credible. Without that row, the table reads as one-sided.",
      "The Kimi rebuttal \u2014 'I am not going to grade the user's citation, and I am not going to use \"the comparison is unmeasured\" as a shield. The failure is real without the comparison' \u2014 is the right resolution and rebuts both the original draft's softness and the critique's suspicion that the next pass would over-correct toward defensive hedging.",
      "Item #9's promotion of security gates to its own section, with all four items enumerated and the unused `security-review` skill named, materially improves the document. The plaintext-secrets-at-rest finding being stated as a current shipped-state fact ('The user has plaintext secrets in `config.ts` right now') is appropriately stark and not softened."
    ],
    "overall": "revise-minor"
  }
]
```

## V2 plan critiques

### Round 1

```json
[
  {
    "major_issues": [
      {
        "claim": "60-minute wall-clock for a full Electron+React rebuild with 16-agent fan-out, parity tests, Playwright smoke, ultra cloud review, and human eyeball is unachievable",
        "rebuttal": "The plan budgets 10+15+25+10 = 60 min with zero slack. Reality check: (a) Phase 1 alone requires writing a zod schema per CLI command (~12), then a 3-skeptic adversarial loop with judge panels across Codex+Claude+Shay-shay hermes3 \u2014 hermes3 inference on a local Mac takes 15-60s per call, and 3 judges \u00d7 3 attempts \u00d7 3 architectural decisions = 27 votes before any code is written. That alone consumes most of Phase 1's 10 min. (b) Phase 4 includes `pnpm build` of an Electron app (typically 60-180s cold), Playwright smoke, ultra-effort cloud /code-review (multi-minute), AND a 5-minute human eyeball \u2014 that exceeds 10 min before anything else fires. (c) Loop-until-dry may run up to K=6 rounds with 4 finders each. None of these durations are budgeted with real numbers. 60 min is aspirational arithmetic, not a feasible schedule.",
        "severity": "blocker"
      },
      {
        "claim": "500k token ceiling cannot absorb 60+ agents, 3-skeptic loops on every diff, judge panels, loop-until-dry, and an ultra-effort cloud review",
        "rebuttal": "Rough math: ~12 route agents + ~12 IPC agents + ~12 parity-test agents + schema agents + synthesis barrier = ~40 write agents. Each runs subagent-driven-development (implement+spec-review+code-review+fix) which is multi-turn, easily 8-20k tokens. That alone is 320-800k. Every diff gets a 3-skeptic refute loop (3 \u00d7 ~5k \u00d7 40 = 600k more). Plus 3 architectural judge panels (3\u00d73=9 attempts each, ~5k = 135k). Plus loop-until-dry (up to 24 finder runs). Plus final ultra-effort cloud `code-review` (typically 50-200k by itself). Realistic floor is 1.5-3M tokens, not 500k. The 'Codex is 3-5\u00d7 more token-efficient' caveat is explicitly flagged in the plan as an unverified hypothesis, so the budget rests on an admitted hypothesis.",
        "severity": "blocker"
      },
      {
        "claim": "The 'no mid-flight approvals' guarantee contradicts Phase 4's required 5-minute human eyeball",
        "rebuttal": "\u00a7Up-front approvals batch promises 'No further mid-flight approvals are solicited unless a ceiling trips' and the V2 Goal commits to '\u2264 5, all upfront'. But Phase 4's verification matrix explicitly requires 'Manual eyeball | Fritz drives the built app for 5 minutes | required'. That is a mid-flight human interaction by definition \u2014 Fritz must be available, sit down, drive the app, and report a verdict before the run can mark SHIPPED. The 'single uninterrupted workflow' claim is therefore false on its own terms.",
        "severity": "major"
      },
      {
        "claim": "16 concurrent worktrees of an Electron project will not behave like the appxlab.io 'sweet spot' numbers assume",
        "rebuttal": "The plan cites '9.82 GB in a 20-min session on a 2 GB repo' as the disk calibration, but the actual Shay Desktop tree (Electron + node_modules + pnpm store) is multiples of 2 GB once dependencies install. 16 worktrees each needing per-worktree node_modules (even with pnpm CAS sharing requires symlinks and lockfile resolution) will saturate disk I/O on a single Mac. The plan never addresses dependency install time per worktree, which for Electron + React + Vite + Playwright + TS is 30-90s minimum even with a warm cache. 16 parallel installs = thrashed disk, missed timeouts, and worktree creation alone consuming 5-10 min.",
        "severity": "blocker"
      },
      {
        "claim": "Auto-cleanup of worktrees 'within the same run' is not how Claude Code's worktree subsystem behaves under failure",
        "rebuttal": "Cite says 'auto-removes worktrees with no uncommitted changes when subagent finishes'. The scenario assumes every agent commits cleanly. A failed skeptic loop, a typecheck error, or a killed agent leaves uncommitted changes \u2192 worktree persists \u2192 1000-creation ceiling becomes a real risk. The plan never specifies recovery semantics when an agent fails mid-write, which is the common case in adversarial-loop-heavy runs.",
        "severity": "major"
      },
      {
        "claim": "\u226595% functional / \u226585% strict parity in 60 minutes against a CLI that V1 only hit 31%/43% on after multi-day work is unjustified",
        "rebuttal": "The plan attributes V1's failure to 'context-bloated single-agent crawl' and 'no schema boundary' \u2014 but those don't explain a 31% strict score. Parity at 31% suggests the CLI surface is large and behaviors are subtle (auth flows, streaming, terminal control sequences, plan/skill side-effects). Jumping from 31% to 85% strict in 60 minutes assumes the schema is the binding constraint, when likely a substantial chunk of the gap is undocumented CLI behavior that requires reverse-engineering \u2014 a research task the plan does not budget for. Greenfield actually makes parity harder, not easier, because there is no warm code to lean on.",
        "severity": "major"
      },
      {
        "claim": "Shay-shay hermes3 as the third skeptic in every adversarial loop is a latency bottleneck the plan ignores",
        "rebuttal": "Adversarial verify fires (a) on every architectural choice (3\u00d7), (b) on every write-agent diff (40+), (c) at every phase exit, (d) on every loop-until-dry round, (e) on the final completeness pass. Each invocation hits local Ollama hermes3 on Fritz's Mac. Hermes3:latest typically runs at 10-30 tokens/sec on Apple Silicon for ~1-3k responses = 30-300s per vote. Across the run, hermes3 alone is on the critical path for 30+ minutes of serial latency. The 'free, local, third opinion' framing hides that latency entirely.",
        "severity": "major"
      },
      {
        "claim": "Synthesis barrier writing shared files 'by concatenation, not diff resolution' is a false promise once schemas reference each other",
        "rebuttal": "Plan asserts: 'Because each prior agent owned a disjoint glob, integration is concatenation, not diff resolution.' But `src/shared/schemas/index.ts` re-exports schemas that often cross-reference (one command's schema imports another's types, or a base schema). The synthesis barrier has to resolve import graphs and circular refs \u2014 not concatenate. Same for `src/renderer/lib/ipc.ts` typed client. Treating integration as a string append will break at the first cross-schema reference.",
        "severity": "major"
      },
      {
        "claim": "Codex CLI as primary write driver inside a Claude Code Dynamic Workflows fan-out is mixing runtimes the plan never reconciles",
        "rebuttal": "Claude Code's Dynamic Workflows runtime dispatches Claude subagents, not Codex CLI subprocesses. The plan says 'Codex CLI (gpt-5.5-codex) as primary' but the fan-out machinery (superpowers:dispatching-parallel-agents, worktree isolation, the 16-concurrent cap, budget.total) is a Claude Code feature. How a Workflow script delegates a write-agent's execution to Codex \u2014 including worktree binding, token accounting, and the budget ledger \u2014 is undefined. Either Claude is doing the writing (and the Codex token-efficiency premise evaporates) or Codex is (and the worktree/budget infrastructure doesn't apply).",
        "severity": "major"
      }
    ],
    "minor_issues": [
      "The plan references Claude Code v2.1.154+ and Opus 4.8 as if they exist; today the running model is Opus 4.7 \u2014 version claims should be verified before being treated as load-bearing.",
      "'Codex CLI gpt-5.5-codex' model designation and the cited 82.7% T-Bench / 58.6% SWE-Bench Pro numbers are presented without source links; if they're load-bearing for the token budget they need citations.",
      "The 'budget.total / budget.remaining()' API is described as if it's a known runtime feature \u2014 the plan should cite where this lives or acknowledge it's a script the author will write.",
      "The 15-min wall-clock grace window silently breaks the 60-min contract advertised in \u00a7V2 Goal. Either the contract is 75 min or the grace shouldn't sit in the failure budget.",
      "Phase 2 parity smoke at \u226590% with no UI is undefined \u2014 parity by definition compares CLI output to UI output. Handler-only parity has to be redefined or the gate is meaningless.",
      "Item 4 in approvals authorizes trust-mode=TRUSTED for Shay-shay 'so the swarm doesn't pause on cautious triggers like deploy/delete' \u2014 this disables safety checks during an autonomous run, which is the opposite of what an adversarial-loop-heavy plan should want.",
      "The plan declines `muapi-*`, `figma:*`, etc. \u2014 fine \u2014 but it doesn't justify why `anthropic-skills:web-artifacts-builder` (a content-creation skill, not a critique skill) is the right pick for the 'perspective-diverse skeptic' role.",
      "Loop-until-dry K=2 capped at 6 rounds means up to 24 finder agents on top of everything else \u2014 needs to be reflected in the token budget breakdown but isn't.",
      "Open follow-up #1 admits the canonical patterns for `perspective-diverse-verify` / `multi-modal sweep` / `completeness-critic` were 'not retrievable' \u2014 the plan then uses them as named primitives anyway. Either they're retrievable before kickoff or the plan should not name them as documented Anthropic patterns."
    ],
    "strengths": [
      "Killswitch + VERDICT.md output structure is honest engineering \u2014 every run produces a readable artifact even on failure, which is more than most plans of this ambition include.",
      "The single zod-schema-as-source-of-truth IPC invariant is genuinely the right architectural lever and correctly identifies the largest V1 failure class.",
      "Keeping V1 alive read-only as an oracle (rather than deleting or migrating in place) follows the actual herbcaudill rewrite-success pattern correctly.",
      "File-ownership graph with disjoint globs is the right collision-prevention model for parallel writes, even if the synthesis-barrier integration story underestimates real merge complexity.",
      "Up-front batched approvals are a real improvement over V1's mid-flight gate pattern, even though the eyeball requirement undermines the 'fully unattended' framing.",
      "Three independent ceilings (token, time, error) with explicit conserve-mode at 80% is more disciplined than typical agent-run budgeting."
    ],
    "overall": "revise-major"
  },
  {
    "major_issues": [
      {
        "claim": "500 k token ceiling is credible for a 60+ agent Electron+React rebuild",
        "rebuttal": "The plan budgets ~500k tokens across (a) Phase 1 schema + config write, (b) Phase 2's 7-agent IPC fan-out with per-handler code review, (c) Phase 3's 12 route + 12 parity-test + synthesis + perspective-diverse-skeptic fan-out, (d) Phase 4 ultra-effort code-review slash + completeness critic, plus a 3-skeptic adversarial pass at every architectural choice (3 choices x 3 attempts x 3 judges = 27 calls minimum) AND every write-agent diff (~24 write agents x 3 skeptics = 72 verifier calls), plus loop-until-dry sweeps (up to 6 rounds x 4 finders = 24) and the V1-oracle reads each handler must do. Even at a conservative 5k tokens per agent invocation, that is ~120 agents x 5k = 600k before any retry. Real-world subagent calls with code review packets routinely consume 15-40k tokens each. The Codex 'token efficiency' claim is admitted unverified in the plan itself. 500k is aspirational, not credible; 1.5-3M is the realistic range. This is a blocker because the killswitch trips at 80% (400k), which on these numbers fires inside Phase 2.",
        "severity": "blocker"
      },
      {
        "claim": "60-minute wall-clock with 75-minute hard stop is credible",
        "rebuttal": "Prior runs on this same codebase (V1 took 'multi-day' per the post-mortem) and the public Workflow-tool data the plan cites show that even small fan-outs (3-page parallel builds) in famtastic-dna.md take 225-1611 seconds for site generation alone. A 16-agent Phase 3 with TDD (RED-GREEN), per-route code review, verification-before-completion gate, AND a 4-finder x up-to-6-round loop-until-dry sweep cannot complete in 25 minutes - the loop-until-dry alone, run sequentially as the plan specifies via pipeline(), is 24 finder calls. Per-skeptic Ollama calls on hermes3 are 20-60s each on consumer hardware; 72 verifier calls x ~40s = ~48 minutes for verifier traffic alone, partially parallel but bottlenecked by the 3-worker swarm cap. The plan acknowledges Shay-shay is 'roughly 5x smaller in concurrency than what we need' yet still routes critical-path verification through it. Hard-stop budget is unrealistic.",
        "severity": "blocker"
      },
      {
        "claim": "Approvals truly cap at 5 upfront with no mid-flight re-prompts",
        "rebuttal": "Several documented gates will re-prompt regardless of upfront authorization: (1) superpowers:verification-before-completion explicitly STOPS on missing evidence per its own iron law; (2) superpowers:receiving-code-review prescribes back-and-forth with the human partner when reviews disagree at the 'important' tier; (3) 75-min hard stop and 500k token ceiling are themselves re-entry points where Fritz must decide re-run vs. adjust; (4) the failure-budget table allows '<= 3 important manual eyeball issues, ship anyway with follow-up tasks' - that triage requires a human decision; (5) Codex weekly cap or Claude weekly cap failover requires routing decisions the plan doesn't pre-authorize. Realistic approval count is 8-15, not 5.",
        "severity": "major"
      },
      {
        "claim": "Codex 'gpt-5.5-codex' rate-limits will not block the primary path",
        "rebuttal": "The plan footnotes Claude's weekly cap as the reason to put Codex on primary, but Codex CLI also has per-minute and daily token limits that are not budgeted. With 60+ agents firing in compressed time windows, request-per-minute throttling is the more likely binding constraint than total tokens. The plan has no per-minute rate accounting and no backoff/retry budget (retries are themselves token spend that re-charges the 500k ceiling). One retry storm on a transient 429 burns 30-80k tokens with nothing to show.",
        "severity": "major"
      },
      {
        "claim": "Worktree concurrency at 7-16 has no hidden disk/io cost beyond the cited 9.82GB",
        "rebuttal": "The plan cites appxlab.io's 9.82GB-in-20-min figure for a 2GB repo but then plans 1000 worktree-creations as the ceiling without scaling math. Sustained 7-16 concurrent worktrees on Fritz's machine plus running typecheck (`pnpm typecheck`) and Playwright builds inside each worktree means parallel TypeScript compilation - tsc is single-threaded per process and memory-heavy. 16 parallel typecheck runs against an electron+react+zod tree will OOM or page on anything below 32GB and serialize behind disk IO regardless. The 'cleanup is automatic' claim ignores that auto-cleanup only fires on clean exit; failed/refuted agents leave worktrees that accumulate inside the same run.",
        "severity": "major"
      },
      {
        "claim": "Adversarial loop cost is properly budgeted",
        "rebuttal": "The math in the inventory understates cost: 3 architecture choices x (3 attempts x 3 judges) = 27 LLM calls for architecture alone. Every write-agent diff x 3 skeptics across ~24 write agents = 72 calls. Pre-ship loop-until-dry at K=2 with cap 6 rounds x 4 finders = up to 24 calls. Final completeness critic = 1 call. That's ~124 verifier calls minimum, *each* with the implementer's diff + spec + context in the prompt. Even at a frugal 8k tokens/call that's ~1M tokens for verification alone, dwarfing the 500k overall ceiling. The plan attempts to offload to free local Shay-shay but caps Shay-shay at goal_budget=5 and num_workers=3, which serializes the verifier queue.",
        "severity": "blocker"
      }
    ],
    "minor_issues": [
      "The 'Codex gpt-5.5-codex' versioning is speculative - Terminal-Bench 2.0 numbers cited (82.7%) and the '7+ hour DRT' figure are not pinned to a verifiable benchmark commit, which makes the token-efficiency hypothesis even weaker as a budgeting input.",
      "The 15-min grace window on the 60-min wall-clock is justified by 'worktree churn is bursty' but worktree creation overhead is sub-second amortized; the real burst cost is parallel typecheck and lint, not worktree fs ops.",
      "Phase 1 budget of 10 minutes for 'one schema per CLI command' assumes the CLI command surface is small and known; if the V1 oracle has, say, 20+ commands the schema-fanout alone is its own sub-fan-out and Phase 1 slips.",
      "The 'reuse gateway lock' rule cites .wolf/cerebrum.md but doesn't budget the cost of a gateway-lock probe failing (orphaned lock from a prior crashed run) - which is a real V1 failure mode per recent commits ('Shay gateway/Desk hang fix').",
      "Conserve mode at 80% only halts new fan-out launches; it does not cancel in-flight 16-agent waves, so the actual ceiling can overshoot by an entire wave's worth of tokens (potentially 80-150k beyond the stated 500k).",
      "Manual eyeball check in Phase 4 is itself a hidden human cost that contradicts the 'no mid-flight approvals' guarantee - it's a mid-flight approval relabeled as a verification step.",
      "No budget line for prompt-construction overhead - dispatching-parallel-agents and subagent-driven-development both inflate per-agent prompts with skill text; each skill invocation adds ~3-8k tokens of system prompt that compounds across 60+ invocations.",
      "Codex weekly/daily cap is not actually documented in the plan as a known number - only Claude's is. If Codex caps are tighter than assumed, the failover routes back to Claude which the plan calls out as already capped."
    ],
    "strengths": [
      "Explicit three-ceiling killswitch (token, time, error) with concrete numbers is unusually honest for a rebuild plan - most plans omit a token ceiling entirely.",
      "Killswitch output structure (manifest.json, verifier-log.jsonl, VERDICT.md) means even a failed run produces forensic artifacts, which lowers the cost of the next attempt.",
      "Routing local Shay-shay swarm as the third skeptic moves verifier load off paid APIs to free local inference - if it scales, it's the single biggest cost lever.",
      "Pre-batched 5-approval gate at minute zero, if it holds, genuinely does eliminate the most expensive V1 failure mode (mid-flight human waits).",
      "File-ownership graph with disjoint globs is the right structural choice to avoid merge-cost blowup from parallel agents.",
      "Conserve-mode at 80% is a real soft-landing pattern, not just a hard cliff - reduces wasted partial work."
    ],
    "overall": "revise-major"
  },
  {
    "major_issues": [
      {
        "claim": "Claude weekly cap mid-flight has no actual failover wiring \u2014 only a sentence.",
        "rebuttal": "\u00a7Brain model says 'if we hit it mid-run the killswitch routes write-agents to Codex and read-agents to Shay-shay local,' but Approval #4 already designates Codex as PRIMARY. So 'route to Codex' is a no-op (already there). The real failure case is the inverse: Codex primary trips a rate-limit or quota mid-Phase-3 with 12 write-agents in flight. There is no documented Codex rate-limit detection signal, no per-agent retry budget, no draining strategy for in-flight Codex calls when failover fires. Worse: Shay-shay hermes3 is sized for skeptic votes (goal_budget=5, 3 workers) \u2014 promoting it to write-agent driver for a TypeScript Electron route is out-of-distribution. Plan needs: (a) explicit rate-limit detection per provider, (b) which in-flight agents drain vs. abort, (c) honest acknowledgement that Shay-shay cannot drive write-agents and the run must degrade to single-threaded Claude on failover with a recomputed time/token budget.",
        "severity": "blocker"
      },
      {
        "claim": "Schema drift across agents is asserted away, not engineered.",
        "rebuttal": "The 'single skeleton invariant' says every cross-process call derives from zod schemas in src/shared/schemas/. But Phase 1 has ONE write-agent owning all of src/shared/schemas/ emitting 'one schema per command' \u2014 then Phase 2 fans out 7+ handler agents and Phase 3 fans out ~12 route agents + ~12 parity test agents, all reading from those schemas. Three failure modes are unaddressed: (1) a Phase 1 schema turns out to be wrong/incomplete and a Phase 2 handler agent edits it locally in its worktree, silently forking the schema \u2014 the file-ownership graph forbids it but doesn't *detect* it; (2) the synthesis barrier writes src/shared/schemas/index.ts AFTER schema agents return, so the 12 Phase-3 agents pulling z.infer types pull from a barrier that may have re-export collisions (two agents emit a `MessageSchema` for different commands); (3) zod version pin is not specified \u2014 a worktree pnpm install picks `zod@latest` and a peer-installed @hookform/resolvers picks a different range. The plan needs: schema-edit lockfile (`chmod -w` post-Phase-1 plus a verifier that hashes every schema file at each phase boundary), namespace collision check in the barrier, exact `zod` version + lockfile commit before any worktree.",
        "severity": "blocker"
      },
      {
        "claim": "File-ownership graph forbids overlap but doesn't handle implicit shared deps.",
        "rebuttal": "The 'owns disjoint glob' rule covers explicit writes but ignores three concrete collisions Electron+Vite always produces: (1) every route agent will reach for tailwind.config.ts / globals.css to register a class \u2014 that file isn't in any glob, so it's either un-owned (writes lost) or owned by the synthesis barrier (every agent blocks); (2) electron.vite.config.ts is owned by one agent in Phase 1, but route agents in Phase 3 need to register aliases (`@/components`) \u2014 they'll either silently fail to import or stomp on a config that's already past its phase gate; (3) package.json dependency adds \u2014 a chat route needs `react-markdown`, a sessions route needs `date-fns`, both run `pnpm add` concurrently inside separate worktrees and produce conflicting lockfiles that the synthesis barrier cannot mechanically merge. Plan needs an explicit 'shared file change ticket' protocol (agent emits a request, synthesis barrier batches them) AND a frozen dependency list at Phase 1 with `pnpm add` forbidden in worktrees.",
        "severity": "blocker"
      },
      {
        "claim": "Lint floor regression is built into the budget \u2014 50\u219220 is a one-way ratchet with no enforcement on the way down.",
        "rebuttal": "Failure-budget table allows <50 lint errors at Phase-3 exit and <20 at Phase-4. There is no rule preventing a Phase-3-exit at 49 errors and a Phase-4 entry that then accrues 11 more before the agents notice. Worse: there is no per-agent lint floor \u2014 agent-route-007 can land 30 of those 50 errors in one file because the gate only checks the aggregate. And the manual-eyeball Phase-4 spot-check explicitly allows 'important' issues to ship with follow-ups (\u22643), which is a second ratchet. Plan needs: per-agent lint delta cap (an agent's PR may add \u22642 lint errors), monotone-decreasing constraint phase-over-phase (Phase-N lint count must be \u2264 Phase-(N-1)), and a ban on the 'ship with follow-ups' loophole when followups are lint/parity-adjacent.",
        "severity": "major"
      },
      {
        "claim": "Mid-phase user interrupt is unhandled because the runtime forbids it.",
        "rebuttal": "The plan quotes verbatim that the Dynamic Workflows runtime has 'No mid-run user input.' Then Phase 4 requires 'Fritz drives the built app for 5 minutes' as a manual eyeball check. These are contradictory \u2014 either Phase 4 is outside the workflow (in which case the 60-min budget excludes it and the contract slips), or it's inside the workflow (in which case the runtime cannot block on Fritz). Additionally, the entire approvals-batched-at-minute-zero claim breaks if Fritz needs to *cancel* mid-run: the runtime offers no abort channel beyond OS-level kill, which loses in-flight worktree state and leaves orphans (the plan claims worktrees auto-clean on agent exit, but an OS kill is not a clean exit). Plan needs: (a) explicit out-of-workflow Phase-4 handoff with the 60-min clock paused, (b) a documented kill-and-resume protocol with a 'paused-state' manifest write so an OS-level kill doesn't lose the run.",
        "severity": "major"
      },
      {
        "claim": "Worktree disk ceiling is approved but not metered or enforced.",
        "rebuttal": "Approval #2 cites 9.82 GB in 20 min on a 2 GB repo from appxlab.io and caps at '1000 worktree-creations per run' \u2014 but the binding constraint is disk, not creation count. shay-desktop's node_modules will be ~1.2 GB once Electron + Playwright land; 7 concurrent worktrees = ~8.4 GB resident, 16 peak = ~19 GB. Fritz's machine could OOM-disk mid-Phase-3 with no signal except a worktree creation failing silently. Plan needs an explicit `df` poll in the budget loop alongside tokens/time, a fail-fast at 85% disk, and a worktree-share strategy (pnpm symlink store, shared node_modules) to avoid the multiplier.",
        "severity": "major"
      }
    ],
    "minor_issues": [
      "Phase-3 agent count is stated as '~12 routes + ~12 parity tests + barrier = 16 simultaneous at peak' but 12+12+1=25, exceeding the 16-agent runtime cap. Either the parity-test agents are sequenced (which the plan doesn't say) or the math is wrong.",
      "Codex 'Terminal-Bench 2.0 score 82.7%' is cited as primary-selection justification but the plan's own \u00a7Open-follow-ups admits there is no Electron+React benchmark for Codex. That's a contradiction inside the same document \u2014 pick one framing.",
      "Shay-shay 'Trust mode set to TRUSTED ... so the swarm doesn't pause on cautious triggers like deploy/delete' is a quiet escalation. For a run that has rm/git/pnpm authority across 16 worktrees, TRUSTED mode removes the last safety net for the cheapest verifier in the panel. Justify it or keep CAUTIOUS.",
      "Parity-test agents owning `tests/parity/<command>.test.ts` (Phase 3) are independent of the route agents that own the implementations \u2014 but TDD inside each route-agent (per \u00a7Skills) means the route-agent writes its OWN test first. So who actually owns the parity test, the route-agent or the test-agent? File-ownership graph collides here.",
      "'Worktree subsystem auto-removes worktrees with no uncommitted changes' is doctrine, but a write-agent that errors out mid-write leaves uncommitted changes \u2014 those worktrees persist and count against the disk ceiling. No cleanup hook documented for error paths.",
      "V1 'kept as read-only oracle' but Phase-2 handlers 'read the V1 oracle's implementation for its command as a behavior reference.' V1's behavior is the failure case (31% strict). Reading V1 as a reference will smuggle V1 bugs into V2 schemas. Reference the CLI, not the V1 Electron tree.",
      "Aggregate budget 10+15+25+10=60 min is wall-clock \u2014 no slack for the 3-skeptic adversarial verify rounds, the loop-until-dry sweep (6 rounds \u00d7 4 finders), the completeness critic, or Fritz's 5-minute manual eyeball. Realistic budget is likely 90+ min; either reset the contract or compress the verification stack.",
      "Killswitch writes `RUN-<timestamp>/manifest.json` under `~/famtastic/shay-desktop/` \u2014 that's the live project tree. A FAILED run pollutes the working directory with audit dirs. Put RUN- artifacts outside the project tree (e.g. `~/.shay/runs/`)."
    ],
    "strengths": [
      "The zod-schema single invariant for cross-process calls is the right lever \u2014 that's a real V1 root cause being cut at the source, not patched.",
      "Three-ceiling killswitch (token/time/error) with an always-written VERDICT.md is honest engineering \u2014 most plans skip the partial-state contract entirely.",
      "Greenfield-alongside (not in-place rewrite) cites the herbcaudill pattern correctly and keeps V1 as oracle \u2014 that's the defensible deviation from the 21%/68% base rate.",
      "Up-front approvals batched at minute zero with explicit opt-out per item is the right way to handle the 'no mid-run input' runtime constraint.",
      "File-ownership graph by glob is the correct concurrency model for the Workflow runtime, even if it under-specifies the shared-dep cases flagged above.",
      "The skeptic prompt template is verbatim and structured (refuted/severity/reason) \u2014 that's machine-parseable for majority voting, not vibes."
    ],
    "overall": "revise-major"
  }
]
```

### Round 2

```json
[
  {
    "major_issues": [
      {
        "claim": "Phase 2 'parity smoke handler-only \u226575%' remains an undefined metric \u2014 parity by definition compares CLI output to UI output; with no renderer yet, what does handler-only parity actually measure?",
        "rebuttal": "Critique-1 minor-5 flagged this directly: 'Phase 2 parity smoke at \u226590% with no UI is undefined.' Draft 2 lowered the threshold to 75% but did NOT redefine the measurement. The verification matrix still lists 'parity \u2265 75 % handler-only' as a Phase-2 exit gate with no operational definition of what gets compared to what. If the renderer doesn't exist, the only available comparison is handler-output JSON vs. expected zod-validated shape \u2014 which is just schema conformance, not parity. This is still a meaningless gate.",
        "severity": "major"
      },
      {
        "claim": "Codex failover path is documented but its own preconditions are unverifiable at the moment failover would fire",
        "rebuttal": "\u00a7Brain model step 1 says 'Claude rate-limit or weekly-cap signal observed (any 429 or weekly_cap field on response).' But the Workflow runtime dispatches Claude subagents \u2014 the Workflow script does not see raw HTTP responses from subagent inference calls. The 429 signal lives inside the subagent's transport layer, not in anything `budget.remaining()` can observe. The plan asserts a detection signal it has no mechanism to receive. Without a concrete 'how does the orchestrator know a 429 happened inside a child Claude subagent' answer, the failover trigger is theoretical. Also: step 2 says 'drain in-flight Claude write-agents to their next safe commit (2-min window)' \u2014 there is no in-band protocol described for telling a subagent 'commit now and stop,' the Workflow runtime is one-way dispatch.",
        "severity": "major"
      },
      {
        "claim": "The 'Codex CLI plain subprocess outside the Workflow runtime' failover is itself a runtime mismatch the plan papers over",
        "rebuttal": "Critique-1 major-9 said Claude's worktree/budget infra is a Claude Code feature and a Codex subprocess can't use it. Draft 2's fix is 'hand-rolled adapter that writes to the same RUN-<ts>/manifest.json.' But the adapter is hand-waved: who owns the worktree the Codex subprocess writes into? Codex CLI doesn't speak `superpowers:using-git-worktrees`. Who tracks Codex's token spend against the 2.0M ceiling \u2014 Codex's own usage API? Who enforces the 1-in-3 sampled skeptic vote on a Codex diff? The plan promises 'token/time accounting continues' via the manifest, but the actual mechanism is a one-line claim. The honest version is: if Codex failover fires, the run is effectively a different system with different invariants, and should probably auto-FAIL rather than auto-DEGRADE.",
        "severity": "major"
      },
      {
        "claim": "Phase 3 wall-clock of 75 min still cannot absorb 14 route-agents + parity-test wave + 1-in-3 sampled skeptic + loop-until-dry (4 rounds \u00d7 4 finders) + completeness adjacency, given Phase 2's 45-min budget already requires 7 IPC handlers with per-agent code review",
        "rebuttal": "Phase 3 has: Wave 3a (7 agents, full TDD RED-GREEN + per-agent code review + 1-in-3 skeptic) \u2192 barrier \u2192 Wave 3b (7 more, same flow) \u2192 barrier \u2192 Wave 3c (parity tests, sequenced) \u2192 diverse-perspective skeptic \u2192 loop-until-dry up to 16 finder calls \u2192 phase-exit full sweep. Even with the appxlab.io 7-sustained sweet spot, a single TDD+review cycle for one route-agent on an Electron route is realistically 8-15 min wall-clock (Vincent's flow runs implement\u2192spec-review\u2192code-review\u2192fix; each step is a multi-turn subagent). 7 agents in parallel \u2248 the slowest one \u2248 15 min. Two waves back-to-back = 30 min. Wave 3c + diverse-perspective + loop-until-dry + phase exit = another 30+ min. The 75-min budget is again aspirational. A defensible Phase 3 is closer to 110-140 min, which would push aggregate past the 3.5 hr hard stop.",
        "severity": "major"
      },
      {
        "claim": "'Per-agent lint delta \u2264 +2' is unenforceable without a tooling description",
        "rebuttal": "\u00a7Failure budget says any agent that adds more than 2 lint errors fails the gate. But lint runs against the merged tree after the synthesis barrier \u2014 the per-agent diff isn't lint-checked in isolation by the Workflow runtime. To enforce 'this agent added 3 errors,' you need a per-worktree lint baseline taken pre-write and a delta computed post-write, gated before the synthesis barrier merges. None of that machinery is specified. As written, the rule is a target, not an enforced gate.",
        "severity": "major"
      },
      {
        "claim": "Schema-lock enforcement still has a race: Phase 2 agents 'verify the schema hash on entry,' but a Phase 2 agent that needs a schema fix must emit a Shared-File Change Ticket \u2014 and the barrier only applies tickets at phase exit, meaning the agent is blocked on a schema bug for up to 45 min",
        "rebuttal": "If a Phase 1 schema is wrong (which the plan admits is possible \u2014 'a Phase 1 schema turns out to be wrong/incomplete'), the Phase 2 handler agent can't edit it (chmod -w + lock check), can't pnpm add anything, and the ticket isn't applied until phase exit. The agent's options are: (a) implement around the bad schema and ship a wrong handler, (b) block for the rest of the phase doing nothing useful, (c) raise some other error. None are good. The shared-file ticket protocol needs either mid-phase ticket application for schema-critical fixes, or an explicit 'agent-may-abort-and-the-wave-restarts' protocol when a schema bug is found.",
        "severity": "major"
      }
    ],
    "minor_issues": [
      "The 'Codex CLI (gpt-5-codex)' model id is still asserted without a verified source \u2014 Draft 2 dropped the 4.8/5.5 version claims for Claude but left the Codex model id as load-bearing for the failover path; flag for verification at kickoff.",
      "The 'pnpm CAS store shared via symlink' across 7 concurrent worktrees works for read-after-write but doesn't address concurrent writes to the lockfile if even one agent ignored the dependency-freeze rule \u2014 the rule is in policy, not enforced by tooling.",
      "Phase 0's 'pre-approved package.json' is a Phase 0 deliverable, but the plan doesn't describe who drafts it before kickoff \u2014 if it's auto-generated by an agent inside Phase 0, that's a chicken-and-egg with the dependency freeze.",
      "The 60-second orphan-poll window is generous: a write-agent that hangs for 4 minutes mid-implementation (not unusual for a long subagent loop) won't be killed, and the disk ceiling could trip while waiting for the 5-min-dead-process threshold.",
      "VERDICT.md introduces a new outcome 'DEGRADED' (Codex failover fired) but the verification matrix and failure budget don't include any criteria that distinguish DEGRADED from FAILED \u2014 operationally, what does Fritz do with a DEGRADED outcome?",
      "Phase-4 eyeball verdict options are 'SHIP / SHIP_WITH_FOLLOWUPS / FAIL' but the failure budget says important-issue followups must be non-lint, non-parity \u2014 what's a legitimate followup category that's neither? Plan should enumerate.",
      "The 3-judge architecture panel in Phase 0 has 'Codex / Claude / Shay-shay' but Brain model demoted Codex to failover-only \u2014 using Codex as a Phase-0 judge requires Codex to be available before the failover path is engaged, which contradicts 'invoked only in a documented failover path.'",
      "Phase 1A's '8 read-only agents' for CLI surface enumeration isn't placed against the concurrency tier table (fan-out read = 16 burst / 8 sustained) \u2014 fits under 8 sustained but worth wiring explicitly.",
      "The 'gateway-recovery.log' is a new artifact tied to .wolf/cerebrum.md \u2014 confirm the cerebrum entry exists and matches the described kill-stale-PID semantics before kickoff."
    ],
    "strengths": [
      "Draft 2 demonstrably closed the runtime-mismatch blocker by demoting Codex to a documented (if still imperfect) subprocess failover and making Claude Opus 4.7 the primary write driver \u2014 that was the single most important critique-1 finding and it landed correctly.",
      "Schema-lock via chmod -w + sha256 manifest + per-agent entry check + namespace-collision check in the barrier is a real engineering response to critique-3's schema-drift blocker, not an assertion.",
      "The Shared-File Change Ticket protocol with barrier-batched application + frozen package.json + no-pnpm-add-in-worktrees rule directly addresses critique-3's implicit-shared-deps blocker with concrete mechanism, not policy.",
      "Honest re-baselining of the contract numbers (60 min \u2192 3.5 hr, 500 k \u2192 2.0 M, 95/85 parity \u2192 80/65 with a named Phase 5 catch-up) is the most credibility-buying move in the revision \u2014 the plan now passes the smell test that the previous version failed.",
      "Worktree recovery semantics (wip-branch-on-failure, 60-s orphan poll, force-clean on disk pressure) and the explicit `df` ceiling as a fourth kill ceiling are concrete fixes to critique-1 major-5 and critique-3 major-6.",
      "The Phase 3 split into waves 3a/3b/3c fixes the 12+12+1 = 25 > 16 math error from critique-3 minor-1 with a real sequencing rule.",
      "Lint ratchet as monotone non-increasing with a documented per-agent delta cap and a closed 'ship-with-followups' loophole responds to critique-3 major-4 in spirit, even though the enforcement tooling is under-specified.",
      "Phase-4 eyeball reclassified as a named, scheduled, clock-paused Approval 5a eliminates the self-contradiction critics 1 and 3 both flagged; it also raises the contract-honesty bar by not pretending the run is 'fully unattended.'",
      "The 'Response to critique' section is a forensic-grade mapping that makes the revision auditable \u2014 it's rare to see a revised plan trace every blocker to a specific section."
    ],
    "overall": "revise-minor"
  },
  {
    "major_issues": [
      {
        "claim": "Eyeball window labeled 'clock-paused approval 5a' is still a mid-flight approval in structural terms. It requires Fritz to paste a verdict to resume, which means the run is two Workflow invocations stitched by manual input. The Workflow runtime constraint (no mid-run user input) means the script literally has to exit at Phase 4 and be re-launched. The plan never specifies who launches the resume, how the manifest is rehydrated, how the schema-lock check re-validates, or what happens if Fritz takes >24 hr to paste the verdict (token-budget freshness, worktree state, gateway-lock staleness). Renaming the gate doesn't remove the operational hazard the critics flagged.",
        "rebuttal": "Specify the resume mechanism explicitly: which command Fritz runs, how RUN-<ts>/manifest.json rehydrates Phase-4 state, what the timeout is on eyeball.md before the paused run is auto-marked PARTIAL, and how schema-lock + gateway-lock re-validate on resume. Without this, the Phase 4 / Phase 5 boundary is hand-wave.",
        "severity": "major"
      },
      {
        "claim": "Token-budget math under-counts phase-exit sweeps. The plan claims sampling 1-in-3 brings verifier from ~124 calls to ~50 calls, but the verification matrix says 'sampled 1-in-3 on diffs; 100% at phase exit.' If a phase exits with N=14 write-agents in-flight, full sweep at phase exit = 14 diffs x 3 skeptics. Across 4 phase exits with peak write counts of 0, 8, 14, 14, that's ~108 verifier calls at phase-exit alone, before per-diff sampling adds another ~8. The 'cut from 124 to 50' headline contradicts the matrix.",
        "rebuttal": "Reconcile Adversarial-loops (50 calls) with Verification-matrix (100% per phase exit). Either define 'phase exit verification' as a single completeness pass (1 critic, not N x 3 skeptics) or re-add the ~70 verifier calls back into the 2.0M ceiling. As written the budget cannot absorb both readings.",
        "severity": "major"
      },
      {
        "claim": "Schema-lock is immutable post-Phase-1, but Phase 1A reverse-engineers an undocumented CLI surface in 10 minutes with 8 agents. Open follow-up #5 admits the CLI could be >25 commands. If Phase-3 route-agents discover a missing/wrong schema (e.g., a flag Phase 1A didn't capture from --help), they cannot unlock the file, cannot file a ticket against it (tickets are for shared files; schemas are read-only post-lock), and synthesis barrier cannot patch it. The plan provides no escape hatch other than 'phase fails,' which means a single missed CLI flag in Phase 1A can fail the run at Phase 3.",
        "rebuttal": "Add a documented schema-amendment path: either (a) schemas are barrier-writable like index.ts via a special ticket type, with re-hash + re-lock at barrier exit, or (b) Phase 1A produces an 'open schemas' subset that stays mutable through Phase 2, with lock applying only to the validated core. Right now the lock is too tight for the reverse-engineering uncertainty the plan itself acknowledges.",
        "severity": "major"
      },
      {
        "claim": "Disk ceiling math is wrong relative to per-worktree footprint. 7 sustained worktrees x (Electron binary ~200MB not pnpm-shared + Playwright browsers ~500MB + Vite cache + git objects) realistically lands at 5-7GB per worktree = 35-50GB peak, regularly tripping the 40GB ceiling during Phase 3. The plan's response is 'kill lowest-priority in-flight agent' but that means Phase 3 routinely loses an agent to disk pressure, adding re-dispatch wall-clock not budgeted in the 75-min Phase-3 target.",
        "rebuttal": "Either (a) raise the disk ceiling to 60-80GB with a corresponding free-space requirement at kickoff, (b) share Playwright browser cache + Electron binary cache across worktrees via symlink (not just the pnpm CAS), or (c) lower sustained concurrency to 4-5 worktrees with longer Phase 3. As written, the disk ceiling will trip and the wall-clock won't hold.",
        "severity": "major"
      },
      {
        "claim": "Cited sibling docs SHAY-DESKTOP-V1-POST-MORTEM.md and SHAY-DESKTOP-V1-PARITY-MATRIX.md do not exist anywhere on disk (verified across ~/famtastic). The '31% strict / 43% functional' V1 baseline used throughout the document, including in V2 Goal as the comparison anchor and in Phase plan as the floor that 80/65 must beat, has no documented source. The entire re-baselining narrative rests on a measurement the plan claims is recorded in two files that don't exist.",
        "rebuttal": "Either author the sibling docs before kickoff (they are the load-bearing input to the contract), or replace the citations with the actual evidence (commit refs, test output, ledger lines from the V1 run that produced 31/43). A plan that argues from numbers in cited-but-missing docs cannot ship as a contract.",
        "severity": "blocker"
      },
      {
        "claim": "Phase-3 Wave 3a concurrency math still breaches the 16-agent runtime cap. 7 route-agents x (writer + requesting-code-review reviewer sub-agent + 1-in-3 sampled skeptic) ~= 7 + 7 + 2-3 = 16-17 concurrent. No headroom for synthesis-barrier kickoff, disk-poll script, or gateway-lock recovery. The plan fixed the 12+12+1=25 arithmetic but introduced a new tight-fit at exactly the runtime cap with zero margin for the verification subagents the same plan mandates.",
        "rebuttal": "Either cap Wave 3a at 5-6 route-agents (giving 5-6 reviewers + sampled skeptics <= 14-15 concurrent), or sequence reviewer dispatch (reviewer runs after writer commits, not concurrent) and document that explicitly. As written, hitting the 16-cap means a reviewer or skeptic call queues silently and the wall-clock budget slips.",
        "severity": "major"
      },
      {
        "claim": "Codex failover path is unbuilt and untested. The 'hand-rolled adapter that writes to the same RUN-<ts>/manifest.json' is new code that must exist before failover can fire, but no Phase-0 deliverable exists for 'build and dry-run the Codex subprocess adapter.' If failover fires for the first time in production (which is the whole point of failover), it executes untested code in the middle of a degraded run, exactly the conditions where bugs compound. The plan also doesn't reconcile that the Workflow runtime cannot spawn subprocesses; whichever layer owns failover (the human-authored orchestrator script vs. the Workflow runtime) is ambiguous in Brain model.",
        "rebuttal": "Add Phase 0 task: 'build Codex adapter + run a 3-task dry failover with manifest accounting verified.' Specify which layer owns the failover trigger: the orchestrator script monitoring the Workflow runtime from outside, not the Workflow itself. Without a tested adapter and a clear owner, 'failover' is decoration.",
        "severity": "major"
      }
    ],
    "minor_issues": [
      "Phase 1B writes one zod schema per CLI command but the synthesis barrier writes index.ts. If a Phase-3 ticket needs to add an export, barrier must chmod +w schemas/, write, chmod -w. This unlock/relock dance is not documented and races with the per-agent schema-hash entry check.",
      "Lint ratchet contradiction: 'per-agent delta <= +2' x 14 Phase-3 agents = +28 potential cluster lint, but Phase-3 ceiling is <= 30 lint vs Phase-2 ceiling of <= 60. The per-agent rule and the phase-total rule are inconsistent at Phase-3 scale; if Phase 2 exits at 30 (which is allowed), Phase 3 can only absorb +0 cluster lint without breaching monotone non-increase, contradicting the +2 per-agent allowance.",
      "Phase 4 'important issues <= 3, must be non-lint, non-parity' bans the SHIP_WITH_FOLLOWUPS loophole for those categories. But VERDICT.md output schema still lists 'SHIPPED_WITH_FOLLOWUPS' as an outcome. Clarify what category of followup is allowed under that verdict given the ban.",
      "The 95/85 parity aspiration is now in a 'named Phase 5 catch-up' that is 'tracked in plans/shay-desktop-v2-parity-catchup/' but 'not budgeted in this plan.' This is effectively a backlog ticket. If V2 ships at 80/65 and Phase 5 never gets prioritized, the contract delivered 80/65 and the 95/85 target was quietly retired. Acknowledge this risk explicitly in V2 Goal.",
      "Phase 3 Wave 3c parity-test-agents are 'sequenced' but no agent count or wall-clock allocation is given. The 75-min Phase-3 budget covers 3a + 3b + 3c, but only 3a/3b have implicit counts (7+7=14). If 3c is N agents serial, that's N x per-agent latency added to Phase 3 without a stated ceiling.",
      "The 'sampled 1-in-3 on per-diff loops' is not given a sampling key (random? round-robin? hash of agent-id?). For reproducibility/forensics, specify the seed source (manifest.json run-id hash -> deterministic sampling) so two runs of the same plan verify the same 1-in-3 diffs.",
      "Cost ceiling says 'budget.total / budget.remaining() is a script the author writes.' Good acknowledgment. But this script's behavior under racy concurrent updates from 7-16 concurrent agents (token counters incremented from worker threads) is not specified. File-locked counter? Atomic append? Without a stated mechanism, the kill-switch can read a stale total and miss the 1.5M conserve trigger.",
      "Gateway-lock orphan recovery handles stale PID file, but doesn't address the case where the gateway is healthy but Shay-shay's hermes3 model is mid-download or evicted from memory (cold start adds 30-90s latency). If the sampling rate is 1-in-3 of write-agent diffs, cold starts compound; consider warming hermes3 in Phase 0.",
      "Per-provider rate ceilings ('Claude <= 50/min') don't distinguish input-token rate from request rate. Anthropic's actual rate limits are per-token, not per-request. 50 large requests/min x 30k tokens each = 1.5M tokens/min, which would be a tokens-per-minute (TPM) breach not caught by a request-per-minute (RPM) limiter.",
      "Open follow-up #4 hedges 'Verify Claude Code runtime version + Opus model claims before kickoff.' This should be Approval #0 (a precondition), not a post-hoc verification. If the runtime version changes the 16-agent cap or worktree semantics, the whole plan re-baselines.",
      "VERDICT.md lists DEGRADED as a possible outcome (set when Codex failover fires) but Failure budget lists DEGRADED nowhere as a contract pass/fail state. Is a DEGRADED outcome a SHIP (just with footnote) or a FAIL? Plan is ambiguous on whether failover-completed runs satisfy the contract."
    ],
    "strengths": [
      "The Response-to-critique mapping section is excellent: every MAJOR finding from prior critiques is explicitly addressed with a section reference, making the revision auditable. This is the right way to close out adversarial review cycles.",
      "Promoting Claude Opus 4.7 to primary write driver resolves the runtime-mismatch blocker honestly, and demoting Codex to a documented (though still under-specified) failover with auto-DEGRADED marking is the right call given the runtime constraints.",
      "Schema-lock via chmod -w + sha256 manifest + per-agent entry check is a real engineering control, not an asserted invariant. The namespace-collision check at the synthesis barrier is also a real mechanism that prevents the silent-fork failure mode.",
      "The Shared-File Change Ticket protocol with barrier-batched application is a clean answer to implicit shared-dep collisions, and freezing package.json at Phase 0 is the right scope control.",
      "Splitting Phase 3 into Waves 3a/3b/3c to fix the 12+12+1=25 > 16-cap math error shows the critique was absorbed at the arithmetic level, not just narratively.",
      "Relocating RUN-<ts>/ artifacts to ~/.shay/runs/ keeps the live project tree clean: small but consequential.",
      "Reverting Shay-shay trust mode from TRUSTED to CAUTIOUS and demoting to non-critical-path sampled skeptic resolves the silent-escalation concern and aligns with the existing hermes3 latency reality.",
      "Dropping unverified version/benchmark claims (Opus 4.8, Codex 82.7%, '3-5x more efficient') from load-bearing positions is intellectually honest and re-anchors the budget on testable inputs.",
      "The four-ceiling kill-switch model (token / time / error / disk) plus per-provider rate back-pressure as a separate concern is the right design: backpressure catches 429 storms before they burn budget."
    ],
    "overall": "revise-major"
  }
]
```

## Phone-app critiques

### Round 1

```json
[
  {
    "major_issues": [
      {
        "claim": "Terminal proxy tab as a 'first-class tab' will pass App Store review because the desk runs the PTY, not the phone.",
        "rebuttal": "Apple's posture on terminal-style apps (Guideline 2.5.2 + historical rejections of iSH, a-Shell, etc.) is not about where the process runs \u2014 it's about whether the UI exposes arbitrary shell command execution to the user. A 'read/write console attached to a tmux session running on the paired desk' is functionally indistinguishable from SSH/Terminus/Blink, which Apple has tolerated *only* when framed as 'remote SSH client to a server you own,' never as a first-class default tab in a general-purpose AI app. Bundling a remote shell UI inside an 'AI agent companion' app dramatically raises 2.5.2 risk because the reviewer can argue the AI brain can be instructed to type arbitrary commands into a shell \u2014 i.e., dynamic code execution by proxy. The plan's framing ('we sidestep by making the terminal a desk-side proxy') is exactly what reviewers will reject in 2026's tighter climate the plan itself cites. This needs to either ship as a separate SSH-category app or be gated behind a developer-mode toggle, not P1 surface.",
        "severity": "major"
      },
      {
        "claim": "Computer-use mirror with tap-to-click will pass review framed as 'personal remote desktop' like Jump Desktop / Screens 5.",
        "rebuttal": "Jump Desktop and Screens 5 are pure remote-desktop apps; they do not bundle an autonomous AI brain that can also drive the cursor. Putting a tap-to-click mirror inside the same app as a multi-brain AI agent that has 'auto-approve safe tools' is the canonical pattern Apple's March 2026 crackdown (cited in the plan itself via Winbuzzer) targets \u2014 the concern is not where the screen pixels originate, it's whether AI-generated instructions can become input events on a real machine. The mitigation ('opt-in on the desk') doesn't help: the iOS reviewer evaluates the iOS app, not what the desk does. Realistic outcome: this gets rejected unless the AI brain is provably air-gapped from the input channel (separate process, no shared session state) \u2014 which contradicts the plan's stated goal of a unified companion. The fallback 'ship as macOS-only viewer first' should be the default, not a contingency.",
        "severity": "major"
      },
      {
        "claim": "Live Activities can stay visible 'until the job ends' for jobs of arbitrary duration, via APNs LiveActivity push channel which is 'separate from regular notification budgets.'",
        "rebuttal": "ActivityKit Live Activities have a hard 8-hour active duration cap (12 hours total including stale) enforced by iOS \u2014 they cannot stay visible 'until the job ends' for long-running agent jobs that may exceed that. The APNs LiveActivity channel has its own budget that Apple throttles based on update frequency; sustained high-frequency updates (e.g., streaming token progress) will get rate-limited and silently dropped. The plan's smoke test 'Live Activity appears within 2 s' is feasible, but the implicit promise that a multi-hour research run keeps a live progress bar is not. The Android equivalent (FGS notification) hits the 6h dataSync cap the plan correctly cites for FGS \u2014 but the plan doesn't reconcile that the Live Activity story has the *same* problem on iOS. Either jobs need to be chunked into <8h segments or the LA needs to gracefully degrade to 'last update at HH:MM' state, which should be in the plan.",
        "severity": "major"
      },
      {
        "claim": "Apple Foundation Models is available via 'direct Swift API' on iOS 18+ with structured output and tool calling, usable in shipping apps today.",
        "rebuttal": "The Foundation Models framework requires iOS 26+ (not iOS 18+ as the plan states in the data model section header \u2014 though the plan correctly says iOS 26 elsewhere, creating internal inconsistency). More importantly, the framework is available only on Apple Intelligence-capable devices: iPhone 15 Pro/Pro Max, iPhone 16 line, and M-series iPads/Macs. The plan's 'minimum supported: iPhone 13' for on-device features is incompatible with FM availability \u2014 iPhone 13/14/15 (non-Pro) cannot run FM at all and will need cloud fallback for *every* on-device use case, which the plan lists as the differentiation. The realistic addressable market for the on-device-AI differentiator is ~20-30% of the active iOS install base, not the implied 'iPhone 13+' population. This materially weakens use case #5 (offline triage) and should be acknowledged.",
        "severity": "major"
      },
      {
        "claim": "Push-to-Talk framework can be used to map a 'push-to-talk button when CarPlay or in-app' for voice with Shay in Phase 4.",
        "rebuttal": "Apple's PushToTalk framework entitlement is restricted to apps that provide PTT functionality with other humans (walkie-talkie / Zello / first-responder use cases). Apple has rejected apps requesting the entitlement for AI assistant interaction \u2014 it is not a generic 'always-on mic button' API. The plan acknowledges entitlement-gating but assumes approval; in practice this entitlement is one of the harder ones to obtain and there is documented precedent of Apple denying it for non-human-to-human use cases. P4 should either drop PTT or reframe explicitly as multi-user (e.g., shared Shay session between two humans + Shay), which is a different feature than what's planned.",
        "severity": "major"
      },
      {
        "claim": "Local-stdio MCP servers are reachable from the phone by routing through 'a QR-pair flow that pairs the phone to a desk-hosted stdio server transparently' \u2014 phone never sees URL or token.",
        "rebuttal": "This is technically fine as transport, but the plan conflates 'phone has MCP client' with 'phone reaches local-stdio MCP.' What's actually being shipped is: the *desk* runs the MCP host and the phone displays results \u2014 the phone is not an MCP client in any standards sense, it's a remote viewer of the desk's MCP host. This is a meaningful capability but should not be marketed or estimated as 'lightweight MCP client' in the differentiation table, because it has the same on-device capability as Claude's phone app (HTTPS+OAuth only). The differentiation is desk-mediated access, which is already the architecture, not a new mobile capability. This affects the cost/effort estimate \u2014 there's no real MCP client work on mobile, only relay protocol work, which is already in the relay client line item.",
        "severity": "major"
      }
    ],
    "minor_issues": [
      "Section 4 cites 'Android 15 FGS 6h/24h timeouts' but later (App Store / Play Store section) says FGS dataSync 'within the 6h/24h limit' \u2014 dataSync FGS on Android 14+ has a 6h-per-24h cap per app, not 6h then 24h reset; clarify the actual budget so the architecture isn't predicated on a misread of the cap.",
      "Plan claims 'Lock Screen / Control Center control (Analyze Photo without unlock)' as a Claude baseline iOS capability \u2014 Control Center controls (iOS 18 Controls API) cannot launch app intents that require unlock for sensitive operations; the 'without unlock' framing is a misread of how Controls actually work behind the lock screen (intents either work locked or require authentication).",
      "ScreenCaptureKit is macOS-only \u2014 the architecture diagram correctly puts it on the desk, but the Mobile Surfaces table row 'Computer-use mirror | ScreenCaptureKit on desk' should clarify this only works when the paired desk is a Mac (Windows/Linux desks need a different capture path), which affects the 'iPad or shared workstation' positioning in the Verdict.",
      "Voice transcript buffer 'ring, 60 s' is undersized for any dictation longer than a sentence \u2014 most voice notes go 1-3 minutes; this will silently truncate. Either expand the ring or document the truncation as intentional.",
      "WhisperKit on Android is listed as 'whisper.cpp/native STT' \u2014 WhisperKit is iOS-only (Core ML + ANE); the Android substitute is a different codebase entirely. The cost estimate appears to assume code reuse that doesn't exist.",
      "Apple Sign-In is required by App Store review (Guideline 4.8) for any app offering third-party social/SSO login \u2014 the plan lists it as optional 'identity backstop'; if any other SSO ships, ASI becomes mandatory not optional.",
      "Pairing QR rotating every 90 s is fine, but the plan doesn't address what happens when the desk is asleep at pair time (which is the most common first-run scenario for a phone-first install) \u2014 needs an out-of-band pair path (e.g., email link to the desk).",
      "The 'memory graph mirror, encrypted at rest' uses NSFileProtectionComplete \u2014 fine, but this class makes the data unreadable when the device is locked, which breaks every background notification handler that wants to enrich a push with memory context. NSFileProtectionCompleteUnlessOpen or CompleteUntilFirstUserAuthentication is what most apps actually use; pick deliberately.",
      "Cost estimate of 620 eng hours for native iOS + native Android + KMP + watchOS + share extension + NSE + ActivityKit + computer-use mirror + WhisperKit integration + Foundation Models integration + Cloudflare DO relay is dramatically low \u2014 industry benchmark for this scope is 2,000-3,500 hours. 620 hours buys P1 only."
    ],
    "strengths": [
      "Correctly identifies that local-stdio MCP from the phone is impossible under iOS sandboxing and routes via the desk gateway \u2014 this matches reality and is the right architecture.",
      "Correctly rejects on-device background agent loops in favor of server-side-jobs-plus-push, which is the only pattern that survives iOS 26 throttling and Android Doze.",
      "The Tailscale-preferred / Cloudflare-DO-fallback transport choice is sound and matches how production peer-to-mesh apps actually deploy in 2026.",
      "Honest about the 4096 ctx ceiling on Apple FM and lists explicit non-uses (general Q&A, code gen, long-doc analysis) \u2014 most plans overstate on-device capability.",
      "Phase plan correctly defers the highest-review-risk features (computer-use mirror, PTT, full-duplex voice) to later phases after establishing reviewer trust with a benign P1.",
      "mTLS device cert in Secure Enclave + biometric unlock + per-action approval gates is the right security posture and matches how Tailscale/1Password/Bitwarden handle device auth."
    ],
    "overall": "revise-major"
  },
  {
    "major_issues": [
      {
        "claim": "Terminal proxy tab (Surface #1, P1 ship) framed as safe because 'the desk spawns the process'",
        "rebuttal": "Apple Review Guideline 2.5.2 prohibits apps that 'install or launch other executable code' and 4.7 narrowly scopes what code-execution-like surfaces are permitted. The remote-PTY framing has been used to reject every general-purpose shell-over-SSH app that isn't explicitly developer-tooling (Blink, Termius, Prompt 3 are grandfathered/scoped). A 'terminal tab' inside a consumer AI 'companion' app \u2014 where the same UI also accepts free-form natural-language commands that the desk turns into shell \u2014 collapses the dev-tools defense. Reviewers reading the listing will see 'agent + terminal + computer-use + approve writes' and apply 2.5.2 + 4.7 + the March 2026 agent guidance simultaneously. Mitigation table glosses this as 'text-only display' \u2014 but the surface accepts INPUT, not just output. This is a likely P1 rejection, not P4 risk. Recommend: terminal surface ships as read-only log viewer in P1, write capability gated behind a developer-mode entitlement disclosed in App Review notes, or pulled from iOS entirely (Android-only).",
        "severity": "blocker"
      },
      {
        "claim": "Computer-use bridge (Surface #12, P3) defensible as 'personal remote desktop, same category as Jump Desktop / Screens 5'",
        "rebuttal": "The Jump Desktop precedent only holds when the *user* is the one tapping. Shay's plan explicitly couples the screen-mirror to an agentic loop ('tap-to-click your desk screen from anywhere' in the Verdict, then 'auto-approve safe tools' toggle in the data model). The moment the cloud brain \u2014 not the user's finger \u2014 can drive a click on the mirrored screen, this is no longer remote desktop; it is remote agentic action surfaced through a phone, which is exactly what Winbuzzer May 2026 flagged as the in-scope category for Apple's pending agent rules. Guideline 5.1.2(i) (AI data sharing) compounds this: the screen contents are third-party data being piped to Claude/Codex/Gemini. The mitigation ('opt-in on the desk') doesn't address that the iOS binary still ships the receiving + relay UI, which is what reviewers evaluate. Recommend: split into two products \u2014 viewer-only on phone (read pixels, no input events) ships in P3; agentic CU stays desk-side only until WWDC 2026 framework lands and we can adopt the official entitlement.",
        "severity": "blocker"
      },
      {
        "claim": "Background-execution story (Risk #2) is satisfied by 'APNs LiveActivity push channel is separate from regular notification budgets'",
        "rebuttal": "ActivityKit pushes are budget-throttled. Apple documents a per-app budget (~4 LA pushes/hour at high priority before throttling kicks in for `frequent-push` background mode entitlement), and a Live Activity has a hard 8-hour wall-clock ceiling (12 with the iOS 17.2 extension), after which the activity is dismissed regardless of job state. The plan assumes 'job in flight' Live Activities can run for an arbitrary length (research jobs, site builds \u2014 these regularly exceed 8h). Once dismissed, no UI surface communicates 'desk still working'. Separately on Android: the 'dataSync' FGS type the plan picks is the *wrong* category \u2014 Android 14+ requires `specialUse` for agent-style work that doesn't fit dataSync/mediaPlayback/location/etc., and `specialUse` requires a Play Console declaration explaining why none of the typed categories apply. Misdeclared FGS type is a known Play policy rejection trigger. Recommend: cap Live Activity to 8h, demote to silent push + notification when the activity expires, file `specialUse` FGS declaration on Android with a prepared justification.",
        "severity": "major"
      },
      {
        "claim": "5.1.2(i) mitigation = 'explicit consent screen for any brain that processes user content'",
        "rebuttal": "5.1.2(i) requires more than a consent screen. Reviewers want: (a) a per-third-party disclosure of WHICH data flows WHERE, surfaced before the user opts in, (b) a stated retention policy from that third party referenced in your privacy policy, (c) the app's own privacy nutrition label updated to reflect each vendor. The plan ships a multi-brain switcher (Claude, Codex, Gemini, on-device) which means three separate 5.1.2(i) disclosures with per-vendor data-handling text. Additionally, the Share Extension that 'drops arbitrary content into a long-running session' is a 5.1.2(i) bear-trap \u2014 share-sheet payloads frequently contain third-party content (texts, emails, photos with other people, copyrighted material). Plan has no mechanism to surface the consent gate when share-extension routes data to a cloud brain. Recommend: per-brain disclosure UI before first use of each brain, share extension routes to on-device or to a desk-only path by default, cloud routing from share extension requires a one-time per-brain confirmation.",
        "severity": "major"
      },
      {
        "claim": "App Intents 'Hey Siri, ask Shay to research X' (Phase 2 ship) is safe to ship pre-iOS 27 Siri Extensions",
        "rebuttal": "Apple flagged in March 2026 (the same Winbuzzer thread the plan cites) that App Intents which front a general LLM are being scrutinized \u2014 specifically, intents that produce free-form text responses from a third-party model are being asked to declare the underlying model in the intent metadata. Claude's own App Intent integration is the existing-precedent path, but Shay's intents are routing to MULTIPLE third-party brains (Claude, Codex, Gemini) via the desk relay \u2014 the App Intent metadata can't truthfully name a single model. This is exactly the misrepresentation pattern Apple has been rejecting. Recommend: ship per-brain App Intents in P2 ('Ask Shay-Claude\u2026', 'Ask Shay-Gemini\u2026') rather than a single polymorphic intent, OR delay the ask-style intent to P4 and ship only deterministic intents in P2 ('Run daily site audit', 'Capture this for brand-kit') that route to known cron jobs not free-form LLM output.",
        "severity": "major"
      },
      {
        "claim": "WhisperKit ships as default STT on iOS in P2 with no mention of microphone-purpose privacy posture or model-download size disclosure",
        "rebuttal": "WhisperKit large-v3 weights are ~1.5GB. Apple requires (a) over-cellular model downloads to be user-gated, (b) NSMicrophoneUsageDescription that specifically discloses *processing* (on-device vs cloud), (c) if the model is downloaded post-install, this needs to be disclosed in the app description per the 2024 update to Guideline 2.3.1 ('hidden features'). Plan also assumes WhisperKit on Pixel \u2014 Argmax does not ship an Android build; the plan's parenthetical 'whisper.cpp/native STT' hand-waves a non-trivial Android port with different CPU/NNAPI characteristics. Recommend: pin a specific Android STT (Vosk, whisper.cpp with GGML quant, or platform SpeechRecognizer) with a documented WER baseline before P2 entry; budget post-install download UX; write the privacy-purpose strings now and pre-flight with App Review.",
        "severity": "major"
      },
      {
        "claim": "Push-to-Talk framework deferred to P4 'if we ship full-duplex voice'",
        "rebuttal": "The PushToTalk entitlement requires Apple approval via a special request form with a written justification of WHY the app needs PTT (the entitlement is gated to walkie-talkie-style apps). Shay's framing as 'full-duplex voice with an AI' is NOT the use case Apple approves PTT for \u2014 they explicitly reject AI assistant apps from this entitlement to protect Zello/Voxer-style legitimate PTT. Banking on PTT in P4 without a Plan B leaves a hole. Recommend: drop PTT from the plan entirely OR substitute CallKit + VoIP push for the locked-phone voice flow (which has its own approval gate but is more achievable for AI assistants).",
        "severity": "major"
      },
      {
        "claim": "Approval gates listed in plan include 'Auto-approve safe tools' as a per-session toggle",
        "rebuttal": "Pre-WWDC 2026 (and likely after), 'auto-approve' for any tool that touches third-party data is the exact pattern App Review is hardening against. The plan explicitly lists this as a behind-toggle feature which helps, but doesn't change that the binary ships the capability. Reviewers test toggles. If a reviewer turns on auto-approve and the on-device classifier mis-labels a destructive action as safe (which the plan admits can happen \u2014 'logit margin < threshold'), that's a single demo away from a rejection citing 5.1.2(i) + the agent guidance. Recommend: rename the toggle 'Reduce confirmations for read-only tools' and enforce in code that auto-approve cannot apply to any tool with network egress, write capability, or PII access \u2014 not just to a `destructive: true` flag the desk sets, but to a curated allowlist of read-only tools the phone client knows about. The phone enforces; the desk cannot override.",
        "severity": "major"
      }
    ],
    "minor_issues": [
      "Age rating claim '17+ consistent with Claude' \u2014 Claude's iOS rating is 12+ in the current US listing per App Store. Verify before submission; mis-self-rating triggers a re-review.",
      "App name candidates ('Shay' / 'Shay for FAMtastic' / 'Shay Desk Companion') \u2014 'Shay' alone is likely too generic to clear Apple's app name uniqueness + search trademark screens; one-word brand names are routinely held in Review for trademark conflict checks.",
      "Privacy nutrition label claim 'no analytics SDKs' may conflict with the stated need to ship crash telemetry \u2014 Apple's nutrition label requires you to declare ALL SDKs including crash reporters (Sentry, Crashlytics, Apple's MetricKit ingestion) under Diagnostics. The 'no analytics' line in the plan is technically true but reads as misleading; correct to 'crash diagnostics only, no behavioral analytics'.",
      "Tailscale fallback assumes user installs Tailscale separately \u2014 App Review increasingly asks apps that *depend* on a sister app to either bundle the dependency or document the manual install in the app description; missing this triggers a 2.1 metadata reject.",
      "Universal links `https://shay.famtastic.dev/s/<id>` require an apple-app-site-association file at the apex with valid AASA + the Android equivalent assetlinks.json \u2014 not mentioned in the architecture section, easy to forget at submission.",
      "Apple Sign-In is correctly listed as identity backstop but Apple requires that IF you offer ANY third-party sign-in (Google, Facebook, etc.) you MUST also offer Sign-In with Apple \u2014 the plan offers Google Sign-In on Android only, so this is OK, but if Google Sign-In appears on iOS the Apple Sign-In requirement is triggered.",
      "On-device LLM responses are user-facing text generated by a model the developer doesn't directly control (Apple FM / Gemini Nano) \u2014 Apple's content moderation guidance still holds the app responsible for outputs even when the model is Apple's own. The plan's 'inherited from Apple FM safety' is incomplete; need a 'Report objectionable output' affordance per Guideline 1.2.",
      "ScreenCaptureKit is macOS-only \u2014 plan correctly notes this but doesn't address that on macOS 14+, ScreenCaptureKit requires the per-launch system permission dialog AND a recurring 'this app is recording your screen' menubar indicator that cannot be hidden. UX implications for the desk side are unaddressed.",
      "Phase 2 ships 'Notification Service Extension (rich pushes with image previews)' \u2014 image URLs in NSE must be HTTPS with valid certs and downloadable in <30s or the rich content silently fails; if these route through the desk relay over Tailscale the cert chain may not validate from Apple's push infrastructure perspective. Architectural detail worth flagging.",
      "Google Play 'Health Connect' or 'Restricted Permissions' declarations not addressed for camera+mic+foreground-service combo \u2014 Play Console will require a Permissions Declaration form for FOREGROUND_SERVICE_DATA_SYNC (or _SPECIAL_USE) which the plan should pre-draft."
    ],
    "strengths": [
      "Correctly identifies that server-side-jobs-plus-push is the only viable persistence pattern on both platforms \u2014 this is the right architectural choice and the plan defends it well.",
      "Native + KMP decision is defensible specifically because the differentiation surface is OS features (Live Activities, App Intents, Watch, Action Button) where RN/Flutter bridge cost would dominate.",
      "On-device-only routing of API keys and the mTLS pairing model is well thought through and substantially de-risks both stores compared to a cloud-key-in-app model.",
      "Behind-toggle list (computer-use, terminal, auto-approve, background voice, watch dictation) is the right hygiene posture pre-WWDC 2026 agent framework.",
      "Phasing places the highest review-risk features (CU mirror, Watch, Continuity) in P3 after reviewer trust has been established by P1 chat-only submission \u2014 sound submission strategy.",
      "Cost/timeline is realistic (620 eng hrs over 18 weeks) for the scope described, and the per-phase review-hour budget acknowledges the back-and-forth submission reality."
    ],
    "overall": "revise-major"
  },
  {
    "major_issues": [
      {
        "claim": "The plan treats the phone like a control panel for power users in offices, not for a one-handed walking commuter. The hero use case is \"watch live agent runs, approve gated actions, capture inputs, get push-notified.\" Of those four, only push notifications and capture actually survive the walking-commuter test. \"Watching live agent runs\" on a 6-inch screen while walking is nobody's job-to-be-done \u2014 that's a desk activity. The plan never names a single mobile-shaped moment (commute, bed, line at the coffee shop, in a meeting, walking the dog) and reverse-engineers the feature set from it. It instead inventories iOS APIs and tries to wire each one to something Shay-ish.",
        "rebuttal": "Pick 3-5 concrete mobile moments and design the surfaces around those moments. \"I'm in a meeting and need to dump a thought into the brand-kit inbox without unlocking my phone\" is real. \"I'm watching a tmux session over WebSocket while walking\" is not.",
        "severity": "blocker"
      },
      {
        "claim": "The terminal tab as a first-class surface (Section 1, Phase 3 ships, ranked above Watch and Computer Use in differentiation) is a desktop-thinking artifact. Nobody uses a terminal on a phone unless they are stuck and desperate. Tapping individual keys on glass to navigate a tmux session is a frustration tax, not a feature. Apple has historically rejected these, the plan acknowledges that, then ships it anyway and routes it through the desk to dodge review. That is dodging the review problem, not the UX problem. The UX problem is that nobody walking down the street is going to vim a config file.",
        "rebuttal": "Demote terminal to a hidden power-user toggle (the plan kind of does this in the \"behind-toggle\" list, but contradicts itself by featuring it as a tab). Better: show a read-only stream of agent stdout in a Live Activity-style card with copy/share affordances. If the user truly needs to type, that's what their desk is for.",
        "severity": "major"
      },
      {
        "claim": "The computer-use bridge (\"tap-to-click your desk screen from anywhere\") fails the one-handed test catastrophically. Pinch-to-zoom on a 1080p Mac display rendered onto a phone, then tapping precisely enough to hit a 12px button, while moving \u2014 that's a research demo, not a feature. The plan even tries to derisk it by framing it as \"personal remote desktop\" for App Store, which is exactly correct framing \u2014 and exactly admits that this is Jump Desktop, which everyone agrees is an emergency tool, not a daily driver.",
        "rebuttal": "Cut from main differentiation list. Keep as a P4 emergency-access feature with realistic positioning: \"unstick a stuck agent from anywhere.\" Do not let it set the architectural agenda (mTLS, ScreenCaptureKit entitlements, render pipeline) that's already costing real engineering hours.",
        "severity": "major"
      },
      {
        "claim": "The approval-gate UX is described as \"push notification with Approve/Deny buttons, or in-app card\" \u2014 but the plan doesn't think about what the user actually sees in the notification. \"Approve: Shay wants to run mv /Users/fritz/site-mbsh/dist/* /tmp/\" is meaningless on a Lock Screen while walking. A walking user cannot read a 300-character diff to decide if a destructive action is safe. The plan promises Approve from the Watch, which is even worse \u2014 wrist glance with zero context to authorize a delete? That's a foot-gun.",
        "rebuttal": "Approval gates need a tiered UX: (1) one-sentence on-device-generated summary of the action and its blast radius, (2) a confidence/risk badge, (3) a hard \"only approvable from desk\" class for anything truly destructive. The current plan has the mechanism but not the human design around it. The plan even uses on-device FM for \"Live Activity preview summarization\" \u2014 it should use it here, where it actually saves the user from a mistake.",
        "severity": "major"
      },
      {
        "claim": "Voice mode is positioned as a major differentiator (WhisperKit, sub-200ms, beats GPT-4o-transcribe) but the plan never confronts what real voice usage on a phone is: short, noisy, interrupted, often hands-busy. Full-duplex WebRTC voice is in P4 as a stretch. Push-to-talk is also P4. So in P1-P3 the actual voice UX is: open app, tap mic, dictate, wait, see transcript, decide what to do with it. That's worse than Siri. The differentiation claim \"sub-200ms latency\" is a benchmark stat that doesn't translate to a UX win when the user still has to tap an in-app button to start recording.",
        "rebuttal": "Either move push-to-talk forward (it's the actual mobile-voice UX win) or stop selling voice as a differentiator. The on-device STT speed only matters if the entry friction is also low. Pair voice with the Action Button/Lock Screen Control from day one, not deferred to P3.",
        "severity": "major"
      },
      {
        "claim": "The Watch surface is described as \"queue depth, last 5 messages, approve/deny, dictate.\" Of these, only dictate-and-route is a true watch-shaped moment (it's a glance + 3 seconds + done). \"Last 5 messages of the most recent agent\" is reading prose on a 41mm screen \u2014 a known anti-pattern. \"Approve/deny gated actions from the wrist\" is the worst version of the approval problem above: even less context, same destructive blast radius.",
        "rebuttal": "Watch ships with two things only: (1) dictate-a-capture and (2) glanceable in-flight job status (one job, one progress bar, ETA). Strip approve/deny from Watch entirely or restrict it to non-destructive classes (e.g. \"approve sending the draft email\" \u2014 reversible-ish \u2014 but never approve a delete or deploy from wrist).",
        "severity": "major"
      }
    ],
    "minor_issues": [
      "The Share Extension flow is the strongest mobile-shaped surface in the plan (URL/PDF/photo into inbox is a real commuter motion) but it's relegated to a one-paragraph section. It should be the headline P1 deliverable, with the chat UI demoted. Most users will hit Share Extension 10x more than they'll open the app.",
      "The QR pair flow (\"pair on a fresh device in <90s\") assumes the user has access to the desk's screen at the moment of pairing. That's fine for first-pair but breaks the realistic case of \"I'm at the airport and need to add my second phone.\" No remote re-pair path is specified.",
      "Live Activity progress bar with \"ETA\" \u2014 most Shay jobs (research run, deep research, site build) do not have a meaningful ETA. Showing a fake or wildly-wrong ETA is worse than showing none. Spec the empty state honestly: \"running for 4m 12s, last step: scoring sources.\"",
      "On-device classification of \"is this a task, idea, or question?\" is sold as a value-prop but the user has to wait for the result before the capture lands, which adds friction. Real mobile capture should be: drop it in, classify async, show the classification in the inbox view. Don't make the user wait on FM inference at capture time.",
      "The plan says \"no API keys on device\" then describes Sign in with Apple/Google as identity backstops \u2014 but these flows themselves create tokens the device holds. Worth a sentence on token lifecycle to avoid the appearance of a contradiction.",
      "Memory graph viewer (\"pinch to navigate, tap a node\") is a desktop pattern. Graph navigation on a 6-inch screen is universally bad UX. List view + saved searches + recents is the mobile-native equivalent. Don't ship the graph just because it exists on desktop.",
      "\"Continuity Handoff start on phone \u2192 finish on Mac\" \u2014 the plan never says what state actually hands off. A half-typed message? A specific session position? Without spec, this becomes a checkbox feature.",
      "Brain switcher (Claude / Codex / Gemini / on-device) as a per-message picker is more cognitive load than mobile users will tolerate. Default-brain-per-session is the right mobile pattern; per-message switching is a power-user setting hidden behind long-press.",
      "The plan tracks \"unread_count\" on sessions but never specifies what counts as unread on the phone when the desk did the work. If an agent posted 14 progress events while I was asleep, is that 14 unreads or 1? Spec this \u2014 it's the difference between a badge users tolerate and one they disable.",
      "Phase 4 includes \"interrupt model mid-response\" via full-duplex voice as a smoke test. This is the right UX. The plan should call out that this single capability \u2014 being able to say \"stop, I meant X\" while the model is talking \u2014 is worth more than 80% of the rest of P4."
    ],
    "strengths": [
      "Server-side jobs + push is correct doctrine for the desk-is-the-worker model. The plan refuses to fight iOS background limits, which is the right call.",
      "Pair-with-QR + mTLS cert + biometric unlock is a clean, mobile-native trust model with no API keys on device.",
      "Pending captures queue with content-hash idempotency keys is exactly the right primitive for the airplane-mode case and matches the FAMtastic dynamic CRUD standing rule.",
      "App Store review posture is paranoid in the right way \u2014 avoiding the word \"agent\" in store copy, framing computer-use as remote desktop, behind-toggle defaults.",
      "Native + KMP is defensible. The on-device AI APIs are Swift-only and the differentiating surfaces are OS features \u2014 RN/Flutter would be a bridge tax.",
      "Phase gating tied to TestFlight + smoke checklist + buglog hygiene matches existing FAMtastic doctrine."
    ],
    "overall": "revise-major"
  }
]
```

### Round 2

```json
[
  {
    "major_issues": [],
    "minor_issues": [
      "Phase 3 calendar is aggressive at 6 weeks for watchOS app + per-brain intents + full-duplex WebRTC voice + read-only viewer + Continuity Handoff \u2014 full-duplex voice alone typically consumes 200+ hours and the WebRTC media-edge backend (Shay media edge) is not enumerated as a desk-side line item or sized; risk of P3 schedule slip is real and should be flagged in Risks rather than buried in the hours-per-phase table.",
      "CallKit + VoIP push (P4) carries its own App Store approval gate (PushKit entitlement increasingly restricted to actual VoIP apps; Apple has rejected 'AI as phone call' framings as inappropriate use of CallKit) \u2014 the plan replaces dropped PTT with CallKit but does not analyze CallKit's own entitlement risk with the same rigor it applied to PTT. Worth one paragraph parallel to the PTT analysis.",
      "Phone-enforced read-only allowlist is the right primitive, but the plan does not specify how new desk-side tools (which appear constantly as users add MCP servers) are onboarded \u2014 a new tool defaulting to Tier 2 (desk-only) creates a UX cliff where users add a perfectly benign read-only MCP and suddenly can't approve from phone until the next app-store update. Needs either a documented onboarding path (signed manifest the phone can verify out-of-band) or an explicit acknowledgement that this UX friction is intentional.",
      "WhisperKit small (~150 MB) shipping as a default post-install download still triggers Guideline 2.3.1 disclosure even though it's the default \u2014 the plan only documents disclosure for the large-v3 opt-in download. Default 150 MB post-install download should also be disclosed.",
      "'Per-brain Ask intents' in P3 still need to clear the same App Intents review path \u2014 Apple may still consider 'Ask Shay-Claude' as fronting a third-party model in a way that requires additional metadata. The plan claims this is resolved by per-brain naming but doesn't describe what the intent metadata actually declares.",
      "Cloud cost estimate of $480 across 18 weeks is suspiciously low and not justified \u2014 for full-duplex WebRTC voice testing alone, OpenAI Realtime-equivalent or Claude voice token costs during P3 smoke testing could exceed this. Either show the line items or raise the estimate.",
      "Out-of-band email-link first-pair flow introduces a new attack surface (anyone with mailbox access can pair a device); the plan does not specify whether this requires additional confirmation (e.g., must enter the user's password again on the desk's relay control panel, or biometric on an existing device). Worth a sentence."
    ],
    "strengths": [
      "Plan now opens with five concrete mobile moments and explicitly states 'if a feature does not serve one of them, it does not ship' \u2014 this directly addresses critique #3's blocker about reverse-engineering from APIs, and several features (terminal, graph viewer, agentic CU) are genuinely cut as a result rather than merely renamed.",
      "Terminal is dropped from iOS entirely (not just demoted), agentic computer-use is fully desk-side with a read-only viewer on phone explicitly described as shipping no synthetic-input code path \u2014 this closes the 2.5.2/4.7 blocker from critiques #1 and #2 in the strongest possible way (architectural, not policy-by-disclaimer).",
      "Tiered approval UX (Tier 0/1/2) with on-device-generated risk summaries and Tier 2 hard-gated to desk-only directly addresses the approval foot-gun blocker from critiques #2 and #3 \u2014 and the phone-enforced hardcoded allowlist (not desk-claimed flag, app-update-controlled) is the correct enforcement boundary.",
      "Foundation Models hardware reality (iOS 26+, ~20-30% install base, on-device option hidden on non-capable hardware) is now honest and stated upfront in both the feature section and the risks section.",
      "Live Activity 8h cap is acknowledged with concrete mitigation (checkpoint chunking + graceful degradation to 'last update HH:MM' + silent push re-spawn) and APNs LA push budget (\u22641 update/min sustained) \u2014 the plan no longer promises what the platform won't deliver.",
      "Per-brain 5.1.2(i) disclosure UI before first use of each brain (with vendor name, data flow, retention reference, and per-vendor nutrition label entries) is materially stronger than rev 1's single consent screen.",
      "Action Button + Lock Screen control moved into P1 (was P3) and full-duplex voice + interrupt-mid-response moved into P3 (was P4) \u2014 voice entry friction is now addressed at ship time rather than as a stretch goal, matching critique #3's call.",
      "Cost estimate raised from 620 to 1,960 hours with per-phase breakdown \u2014 honest answer to critique #1's flag, even if the upper end of the 2,000-3,500 industry benchmark would be more defensible.",
      "Share extension promoted to headline P1 surface with chat UI demoted to secondary \u2014 matches critique #3's call that share-sheet is hit 10x more than the app is opened, and is the highest-leverage mobile-moment surface in the plan.",
      "Response-to-critique section traces every major and minor item to its disposition, making the revision auditable rather than hand-waved."
    ],
    "overall": "ship"
  },
  {
    "major_issues": [
      {
        "claim": "P3 promises full-duplex voice + interrupt mid-response via WebRTC to a 'Shay media edge' in a 6-week phase, but no media-edge component exists in the architecture diagram and no provider/cost is named. Adding a low-latency bidirectional voice path (WebRTC SFU, jitter buffer, barge-in handling against streaming TTS, on-device VAD that doesn't false-trigger on background noise) is a multi-month workstream by itself for one platform, let alone both iOS and Android, on top of Watch, per-brain intents, and the read-only screen viewer in the same phase. The 700-hour P3 budget is not credible for that scope.",
        "rebuttal": "Either cut full-duplex voice from P3 (leave it at P4 where rev 1 had it, accepting critique #3 is partially wrong about the 80% claim \u2014 interrupt-mid-response is valuable but is not worth more than the entire P4 in real engineering hours), OR explicitly name the media edge component (provider, region strategy, TURN cost model) and add it to the architecture diagram and cost table. As written, P3 is overstuffed and the most expensive single item is undefined.",
        "severity": "major"
      },
      {
        "claim": "The on-device risk-summary mechanism for Tier 1 approvals has an unaddressed failure mode: on the ~70\u201380% of iOS devices without Apple Intelligence, the phone routes a 'sub-second classification request to the desk' to produce the summary. But the entire premise of the approval gate is that the user is in the wild and the desk may be the very thing waiting on approval \u2014 if the desk is busy, asleep, or the network is flaky, the summary either doesn't arrive or arrives late, and the user is left with either a raw command (the foot-gun the revision exists to fix) or a blocking spinner on a push notification.",
        "rebuttal": "Define the fallback explicitly: when the desk-routed summary doesn't return within N seconds, what does the phone show? Options are (a) auto-escalate to Tier 2 desk-only (consistent with low-confidence handling, and probably right), (b) show a tier-aware generic template ('Tier 1 reversible write \u2014 see desk for details'), or (c) hold the push and retry. The plan picks none. This needs to be specified before P2 since it's the difference between the approval UX working everywhere and working only on premium hardware.",
        "severity": "major"
      }
    ],
    "minor_issues": [
      "P1 ships the Lock Screen control with 'biometric-gated for cloud routing' but P1 also ships 'Claude only' as the brain. Since Claude is a cloud brain, every P1 Lock Screen capture that routes to a brain (rather than just dropping into the desk inbox) triggers a biometric \u2014 which negates the one-handed-without-unlock moment that justified the Lock Screen control existing. Either P1 needs a non-Claude default route (e.g., 'capture to inbox' that is desk-only and skips biometric) or the P1 smoke test for the Lock Screen flow should be honest that it requires Face ID.",
      "Per-brain 5.1.2(i) disclosure on first use is good, but the plan does not say what happens when a brain is later added to an existing session via the long-press per-message switcher (a P3 feature). Presumably the first-use disclosure for that brain still fires, but the long-press affordance lives inside chat \u2014 make explicit that the disclosure cannot be dismissed mid-message and that the message is not sent until disclosure is accepted.",
      "The Continuity Handoff payload `(session_id, last_seen_message_id, composer_draft_text)` is defined, but `composer_draft_text` is potentially sensitive content the user typed but never sent. NSUserActivity payloads on Handoff transit via iCloud-backed Bluetooth/Wi-Fi advertisement and are not encrypted with the app's keys. Either flag that drafts > N chars are excluded, or note that the handoff is best-effort plaintext between user's own devices and acceptable for the threat model.",
      "P4 lists 'iOS 27 Siri Extensions integration (if shipped at WWDC June 8)' as a P4 deliverable. WWDC June 8 is the same date as the project timeline midpoint (week 6 of an 18-week plan). iOS 27 will be in developer beta, not shipping. P4 ends week 18, which is approximately mid-October \u2014 iOS 27 typically GA's late September, so this is tight but technically feasible. Worth noting the dependency more honestly: P4 ships the integration *if* iOS 27 GA's before week 17, otherwise it slips to a P5.",
      "The 'graph viewer dropped, replaced with list/search/recents' is the right call, but the plan does not actually describe what 'recents' means \u2014 recent sessions, recent captures, recent approved actions, recent files? Brief one-line definition would close the loop the same way `unread_count` was closed.",
      "Cost table totals 1,960 hours but the column header says 'Hours (eng)' and a separate 'Hours (review back-and-forth)' column adds 120 more. The verdict text says 'cost estimate raised from 620 to 1,960 hours' \u2014 clarify whether the 1,960 includes the 120 review hours or is engineering-only (and the true total is 2,080)."
    ],
    "strengths": [
      "The five mobile moments framing is genuinely load-bearing \u2014 it's not decoration. Every surface in the revised table traces back to one of them, and features that don't survive (graph viewer, terminal as primary tab, polymorphic Ask Shay intent) are visibly cut rather than retained as zombies. This is the right structural response to critique #3.",
      "Tiered approval UX with phone-enforced hardcoded allowlist (not desk-claimed flags) and auto-escalation of low-confidence Tier 1 to Tier 2 is the correct security posture. Specifically calling out that the allowlist updates ship with app-store-reviewable app updates, not server-pushed config, closes the obvious bypass.",
      "Honest hardware-tier framing for on-device AI (~20\u201330% addressable, option hidden not greyed on incapable hardware, marketing must say 'iPhone 15 Pro and later') is exactly the discipline the original draft lacked. Same for WhisperKit small-default-with-opt-in-large.",
      "Dropping PushToTalk for CallKit + VoIP push is the right architectural call \u2014 it matches the more honest mental model ('ring Shay when you need it') and avoids an entitlement that is routinely denied for AI assistants.",
      "Live Activity 8h cap handling (checkpoint chunking + graceful degradation + silent-push respawn + \u22641 update/min sustained) is concrete enough to actually build against, not a hand-wave.",
      "Plan-of-record traceability is excellent: the 'Response to critique' section maps every major and minor item from all three threads to its disposition, which makes the document auditable and means the next reviewer doesn't have to re-derive what was accepted vs rejected."
    ],
    "overall": "revise-minor"
  }
]
```