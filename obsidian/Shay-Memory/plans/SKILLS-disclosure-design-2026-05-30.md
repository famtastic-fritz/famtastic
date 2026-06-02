---
title: Skills progressive-disclosure design — all 160 skills, no prompt bloat
date: 2026-05-30
author: research agent (Fritz session)
tags:
- plan
- skills
- progressive-disclosure
- find_skill
- profiles
- cache-stable
- skillnet
permalink: shay-memory/plans/skills-disclosure-design-2026-05-30
---

# Skills disclosure — keep all 160, stop paying for them every call

## The crux
Capping the static skills index to 40 saved ~22k tokens/call but must NOT lose
access to the other ~120. The fix is **progressive disclosure**, not a bigger cap.
**Shay ALREADY has the pattern**: `skills_list` + `skill_view` (tools/skills_tool.py
~1456/1472) = the canonical "list metadata → load body on demand" loop. Gap:
`skills_list` is unranked and dumps everything. Make the static-40 a *teaser* and
turn the lookup into a *ranked search*. (Same shape Claude Code uses: deferred tool
names + ToolSearch; Anthropic Skills: name+description up front, body lazy → ~98%
token cut when unused.)

## Deciding constraint: prompt-cache prefix must stay byte-stable
Prompt caching runs ~99% hit. Anything that changes the skills block PER TURN
(full-RAG in the system prompt, per-task profile swaps in the prefix) breaks the
cache and costs more than the 22k saved. So: **stable teaser in the prefix; all
variability (ranking, RAG, profiles, relationships) lives in a TOOL RESULT** (message
stream, not the cached prefix).

| Option | Prefix stable | Recall |
|---|---|---|
| static-40 only (today) | ✅ | misses ~120 |
| full-RAG into prompt | ❌ breaks cache | high |
| **static-40 teaser + find_skill tool** | ✅ | high (on demand) |

## Recommended design
**A. Teaser prefix (no structural change).** Keep `_apply_skill_count_cap` at 40
(always_include → toolset-match → alpha). Add ONE static sentence to the
`<available_skills>` block (prompt_builder.py ~1257): "This is the 40 most-likely
skills; ~120 more exist — call `find_skill(query)` to search the full catalog."
Static string → cache prefix unchanged.

**B. Build `find_skill(query, k=10)` (the core).** Register in the existing `skills`
toolset (skills_tool.py). Hybrid retrieval over the FULL local catalog
(`_find_all_skills()`): keyword/substring ∪ embedding top-k (k≈8–12, not 3 — recall).
Precompute skill-description vectors at snapshot time into a sidecar next to
`.skills_prompt_snapshot.json` (same mtime/size manifest); reuse the vault's
on-device Smart Connections embedding model — no new heavy dep, no hot-path network.
Return name+truncated description (tier-1); model then calls `skill_view(name)` for
the body. Attach `related` edges (see C).

**C. Reuse SkillNet `analyze` OFFLINE only.** `pip install skillnet-ai`;
`SkillNetClient.analyze(skills_dir=~/.shay/skills)` → `relationships.json`
(compose_with/depend_on/similar_to). Run once + on skill changes (cron, like the
intelligence-loop). `find_skill` reads that file to surface skill chains. Do NOT
route runtime search through SkillNet's hosted 500k catalog (wrong corpus/scale).

**D. Profiles = thin layer over existing `enabled_toolsets` + `always_include`.**
Add `skills.profiles` to config.yaml: profile-name → {toolset_categories,
always_include}. A profile only changes WHICH 40 the (cache-stable) prefix shows.
Switch per-session/per-task, NOT per-turn (per-turn breaks cache). Auto-suggest via
find_skill on the first message — advisory, not gating (avoid false-positive friction).

## Reuse-vs-build
- BUILD: `find_skill` (small, in-repo, hot-path) + vector sidecar (reuses snapshot plumbing).
- REUSE: SkillNet `analyze` offline (relationship graph); existing enabled_toolsets +
  always_include + vault embeddings.
- DON'T: put RAG/profiles in the system prompt (breaks cache); use SkillNet's cloud
  catalog at runtime.

## Net effect
Per-call tokens stay at the ~40 floor; cache prefix byte-stable (99% hit preserved);
all ~160 reachable via one tool call that costs tokens only when the 40 miss; skill
composition visible via the offline relationship graph.

## Key files
prompt_builder.py (988–1293, `_apply_skill_count_cap`, `<available_skills>` block) ·
tools/skills_tool.py (`skills_list` ~1456, `skill_view` ~1472, `_find_all_skills` ~549) ·
~/.shay/config.yaml (`skills:` ~357, `toolsets:` ~30).
Sources: Anthropic Agent Skills eng blog; claude-code progressive disclosure;
zjunlp/SkillNet + "Graph of Skills" (arxiv 2604.05333); Online-Optimized RAG for Tool Use (arxiv 2509.20415).