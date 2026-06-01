---
title: missed-capabilities-impact-map-2026-05-31
type: note
permalink: shay-memory/research/missed-capabilities-impact-map-2026-05-31
---

# Missed Capabilities → Impact Map (grounded in vault evidence)

For each missed ADOPT-NOW capability: the REAL documented pain it fixes, and how it
improves the current process. Citations are to actual vault notes / session incidents.

## The root-cause insight
Several misses share ONE cause: **flat-markdown memory with no graph/link layer.**
Because recall is file-grep, not semantic+linked, Shay can't connect
"capability-map recommended X" → "adopt-plan executed Y" → "X was silently dropped."
That is *exactly* how rlm-rs / TencentDB / TurboVec got missed. Fixing memory fixes
the gap-detection that caused the misses. The memory cluster is therefore the
highest-leverage adopt, not a nice-to-have.

---

## 1. rlm-rs (long-context) + wiring synthesize_sections
- **Documented pain:** `session-lessons-2026-05-31b` #3 — "Local-brain whole-file rewrite
  TRUNCATES >250-line files; npm build is the backstop gate." Caused build_app to BLOCK
  on H2/H4/H6/H7/H8/H9 and again on S1 (Settings Inspector, 2026-05-31).
- **Use case (this session):** S1 blocked in 27s; Claude had to step in. 3rd repeat.
- **Improvement:** Recursive chunking lets Shay read/generate files beyond the model
  window → she builds full screens HERSELF. Ends the rescue tax; restores autonomy.

## 2. TencentDB Agent Memory + TurboVec + graphify (MEMORY backend)
- **Documented pain:** capability-map MEMORY gap — "lacks dedicated local persistent
  databases or robust knowledge GRAPH capabilities." Today's whole "what got missed"
  crisis is the symptom.
- **Use case:** The capability-map flagged ~13 ADOPT-NOW items; the adopt-plan silently
  dropped 6. Flat markdown couldn't surface the drop. A graph backend links
  recommendation→plan→build so drops are visible automatically.
- **Improvement:** (a) Shay catches her own planning gaps; (b) semantic recall instead of
  grep; (c) Identity/Experience/Persona tiers give durable cross-session self-model;
  (d) TurboVec = fast compressed retrieval so recall scales without token blowup.

## 3. Verification loops — council-of-high-intelligence + autoloop
- **Documented pain:** `process-improvements-2026-05-30` — "reviewer-is-not-the-author
  rule MUST be enforced in the pipeline, not just recommended… hard-block same-model
  review." Plus the QA vision-judge false-positives (flagged good screens as broken).
- **Use case:** This session's QA judge scored clean screens 3-4 (false positives);
  only human-eye review caught it. No formal multi-LLM consensus existed.
- **Improvement:** Multi-LLM consensus + iterative refinement = trustworthy gates without
  a human spot-checking every screen. Closes the "I'll review my own work" hole.

## 4. rtk (context-hygiene) + cost telemetry (telemetry already added)
- **Documented pain:** tasks #13-16 "token volume drop" + cognee retired for token cost;
  `session-lessons` #6 "free tiers capped (OpenRouter :free 200/day shared)."
- **Use case:** Cap-burn forced a gateway-config emergency earlier in the project.
- **Improvement:** rtk compresses tool/terminal output before it hits context → fewer
  tokens per run → more runs/day under the cap. Pairs with the $/energy telemetry
  (added this session) to route by cost.

## 5. Agent OS port (W5) + Interview engine (W6)
- **Documented pain:** agentos board has only W5.0 (plan) done; deskbuild W6 never built.
- **Use case:** Fritz: "I never postponed this Agent OS port" — yet it stalled at plan.
- **Improvement:** W5 = the rich workspace (capability-map UI gap); W6 = conversational
  capture→plan→tasks, the front door to Shay's whole task pipeline.

## 6. Lower-leverage / monitor
- OpenSwarm (runtime), codebuff (coding), CasaOS (infra), crawl4ai (research scrape),
  skill libraries (karpathy/business-consulting). Real but not blocking current pain.

---

## Priority order by leverage (from the evidence)
1. **MEMORY backend cluster** — fixes the gap-detection that caused the misses (meta-fix)
2. **rlm-rs + synthesize_sections** — ends the build rescue tax (3x documented)
3. **Verification loops** — trustworthy gates (documented review-hole)
4. **rtk** — cap-burn relief (documented emergency)
5. **Agent OS port + Interview engine** — planned, owed
6. The rest — backlog/monitor
