# Intelligence Loop Audit

**Parent:** `STUDIO-PLATFORM-REFRESH-V2.md`
**Companions:** `MBSH-AS-STUDIO-BUILD-AUDIT.md` § 2 capabilities #61–67 · `WORKSTREAM-MAP.md` recommendation N6 · `docs/sites/site-mbsh-reunion/V2-LEARNINGS-AND-PATTERNS.md` (the learnings under test)
**Purpose:** test whether the platform's intelligence loop actually does its three jobs — **capture**, **retrieve**, and **apply** — and whether it can **verify** that captured knowledge improved the result. Use the MBSH learnings as the test case.

The loop only counts as working if the next build can reach for these learnings *and Studio can prove they were applied.*

---

## 1. The three jobs

```
                              ┌─────────────────────┐
                              │     CAPTURE         │
                              │  Did we record it?  │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │     RETRIEVE        │
                              │  Can we find it     │
                              │  later, by topic,   │
                              │  before planning?   │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │     APPLY           │
                              │  Did the next build │
                              │  use the learning?  │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │     VERIFY          │
                              │  Did applying it    │
                              │  actually improve   │
                              │  the result?        │
                              └─────────────────────┘
```

A learning that is captured but cannot be retrieved is a journal entry. A learning that is retrieved but not applied is a footnote. A learning that is applied but not verified is a guess. The loop only earns its name when all four steps work.

---

## 2. Test cases — the eight MBSH learnings

For each, the audit asks: *captured? retrievable? applied? verified?* Status legend: ✅ done · 🟡 partial · ❌ no.

### 2.1 Section archetype system (Scene / Sequence / Tease)

| Step | Status | Evidence |
|---|---|---|
| Captured | ✅ | `V2-LEARNINGS-AND-PATTERNS.md` § 2; PASS-11 closeout |
| Retrievable | 🟡 | `grep` finds it; the chat-capture pipeline indexes the V2 doc but there's no semantic retrieval pre-plan |
| Applied | ❌ | No future build has tried; no skill / classifier exists |
| Verified | ❌ | No verifier; no "did the section archetype actually fire" measure |

**Verdict:** captured well, retrievable manually, not yet applied or verified. **Action:** promote to Pattern Registry; build `Section Archetype Classifier` skill (FRDB §13).

### 2.2 Harry placement rule (medallion=center, in-scene=left, chat=right)

| Step | Status | Evidence |
|---|---|---|
| Captured | ✅ | `V2-LEARNINGS-AND-PATTERNS.md` § 1 (the rule); P13 closeout |
| Retrievable | 🟡 | grepable; not in a registry |
| Applied | ❌ | Future builds will need to know |
| Verified | ❌ | No QA gate enforces it |

**Verdict:** captured. Action: become a Tier-1 QA gate (Tools Matrix § 6).

### 2.3 Final Reel footer pattern

| Step | Status | Evidence |
|---|---|---|
| Captured | ✅ | V2 doc § 3; PASS-12 closeout |
| Retrievable | 🟡 | grepable; not in component registry |
| Applied | ❌ | No "use Final Reel footer" recipe directive |
| Verified | ❌ | No "is the footer the default-grid CMS footer?" gate |

**Verdict:** captured. Action: Component Library entry + Tier-1 QA gate.

### 2.4 Asset alpha pipeline (RGBA, no white halos)

| Step | Status | Evidence |
|---|---|---|
| Captured | ✅ | V2 doc § 5; AUDIT-2026-05-07.md table |
| Retrievable | 🟡 | grepable; not auto-invoked |
| Applied | ❌ | The next build will need to remember |
| Verified | ❌ | No automatic alpha-check on every imported pose |

**Verdict:** Action: Image Pipeline MCP capability (Tools Matrix § 5) + Tier-1 QA gate.

### 2.5 Form readability standard (16px iOS guard, cream-on-glass, italic placeholder)

| Step | Status | Evidence |
|---|---|---|
| Captured | ✅ | V2 doc § 6; P11 + P13 closeouts |
| Retrievable | 🟡 | grepable; not in pattern registry |
| Applied | 🟡 | Already partially codified in CSS (the global `body[data-premiere="on"] input { font-size: 16px }` rule) |
| Verified | ❌ | No automated check |

**Verdict:** the closest to "applied" of the eight. Action: Tier-1 QA gate; pattern entry.

### 2.6 FX overlay opacity guard (≤ 0.15)

| Step | Status | Evidence |
|---|---|---|
| Captured | ✅ | V2 doc § 4; P12 closeout |
| Retrievable | 🟡 | grepable; not in a check |
| Applied | ❌ | The drift to 0.55 happened *because* there was no guard |
| Verified | ❌ | No assertion runs |

**Verdict:** the most explicit example of what happens *without* a verifier. Action: simple lint rule + Tier-1 QA gate.

### 2.7 Site assistant FAQ + fallback collector pattern

| Step | Status | Evidence |
|---|---|---|
| Captured | ✅ | V2 doc § 7 (proposed for V2 component) |
| Retrievable | 🟡 | grepable |
| Applied | 🟡 | The pattern exists per-site (`chatbot.js`); not yet generalized |
| Verified | ❌ | No measure of FAQ hit rate, fallback rate, or refinement loop |

**Verdict:** the closest to "registry-ready" — there's an existing implementation to generalize. Action: Site Assistant Component plan (`WORKSTREAM-MAP.md` recommendation N3).

### 2.8 V2 backlog model (10 items per launch)

| Step | Status | Evidence |
|---|---|---|
| Captured | ✅ | V2 doc § 9 itself is the artifact |
| Retrievable | 🟡 | grepable per-site |
| Applied | ❌ | No cross-site backlog registry yet |
| Verified | ❌ | No "did the next launch's V2 doc inherit the previous backlog?" check |

**Verdict:** Action: Backlog Registry under Plans (FRDB §12) + cross-site backlog view.

---

## 3. Score

| Step | ✅ | 🟡 | ❌ |
|---|---|---|---|
| Captured | 8/8 | 0 | 0 |
| Retrievable | 0/8 | 8 | 0 |
| Applied | 0/8 | 2 | 6 |
| Verified | 0/8 | 0 | 8 |

**Capture works. Retrieval is manual. Application is mostly absent. Verification does not exist.**

This is the honest scorecard. The substrate captures; the production conversion layer (the part Platform Refresh v2 builds) makes the rest real.

---

## 4. Why the gap exists

The capture pipeline has been built (`fam-hub capture extract`, `captures/`, `memory/<type>/<id>.md`, `decisions.jsonl`). The retrieval, application, and verification halves were not part of the same wave. They're called out as missing in `MBSH-AS-STUDIO-BUILD-AUDIT.md` capabilities #64–66.

Three specific reasons:

1. **No retrieval index keyed to plan/build context.** A future plan should be able to ask "show me everything we've learned that's relevant to this recipe / brief / vertical / page-type" and get a ranked list. Today, that requires `grep`.
2. **No "applied this learning" telemetry field on closeouts.** When a closeout is written, there's no slot for "this pass applied learnings X, Y, Z." So even after-the-fact, you can't tell which closeouts used which learnings.
3. **No verifier.** A verifier needs (a) the learning, (b) the closeout/proof that it was applied, and (c) a measure of whether the result improved (smoke pass rate, audit issue count, cost vs estimate, reviewer score). None of those linked.

Each gap maps to a concrete piece of work in `WORKSTREAM-MAP.md` recommendation N6.

---

## 5. The required additions

### 5.1 Retrieve

- **Pattern Registry** with topic tags (FRDB §12). Each pattern has: id · name · topic_tags · authority_doc · code_anchors · related_patterns.
- **Pre-plan retrieval step** in the Build Mode / Recipe Composer: when a new plan opens, query the registry by recipe.base_type, recipe.modules, vertical, brand-mark hints. Return a ranked list of "patterns to consider."
- **Capture-store retrieval API** for free-form questions ("how do we handle character placement?" returns the V2 § 1 + the QA gate + the placement rule).

### 5.2 Apply

- **`learnings_applied` field** on every pass closeout with structured references to pattern IDs.
- **Recipe declares default learnings** — e.g., `cinematic_event_with_character` recipe ships pre-loaded with the eight MBSH learnings as `default_learnings`. The build engine cites them when the corresponding work happens.
- **Skill registry** — turn the most-used learnings into runnable skills (Section Archetype Classifier, Asset Alpha Auditor, Form Readability Auditor, Footer Treatment Generator, Final Reel Generator).

### 5.3 Verify

- **Verifier signals** per learning:
  - Section archetype: did `data-mode` end up on every section?
  - Harry placement: did the placement-rule QA gate pass?
  - Final Reel: was the footer rewritten via `injectFooterSiteMap()`?
  - Asset alpha: did every Harry asset return RGBA?
  - Form readability: did the readability QA gate pass?
  - FX opacity: did the assertion script confirm ≤ 0.15?
  - FAQ + fallback: did the assistant log at least one FAQ hit AND fallback collection?
  - V2 backlog: was the cross-site backlog updated?
- **Improvement signal:** verifier reports `learning X: applied + improved | applied + neutral | applied + worse | not applied`. The "improved" measure varies per learning (regression count, audit issues found, smoke pass rate, cost-versus-estimate delta, reviewer rating).
- **Verifier output** lands on the closeout AND in a cross-site `learning-effectiveness.jsonl` so the platform can rank learnings by demonstrated value.

---

## 6. The "did the loop work?" test

After Step 8 of `FIRST-BUILD-SEQUENCE.md` (the Homeboy Shipping test build), run this five-question test. Each answer should be `yes` for the loop to have succeeded:

1. **Did the build retrieve any MBSH learnings before planning?** (e.g., did the build engine consult the section archetype pattern when laying out pages?)
2. **Did at least three Tier-1 QA gates fire automatically without a manual audit?** (e.g., did the asset-alpha gate catch something, or did the form-readability gate confirm pass?)
3. **Did the closeouts cite specific learnings they applied?** (e.g., a `learnings_applied: [pattern.section_archetypes, pattern.final_reel_footer]` field on a pass closeout?)
4. **Did the verifier produce a measure for at least one learning's effectiveness on this build?** (e.g., "section archetype rule fired on 100% of sections; result: zero archetype regressions vs MBSH's 4 in early passes.")
5. **Did the V2 backlog at the end of Homeboy Shipping inherit any of the MBSH V2 backlog patterns** AND **add new ones unique to Homeboy Shipping?**

If 3-of-5 = the loop is partially real. 5-of-5 = the loop is real.

---

## 7. The fastest path to "the loop works"

You don't need every learning to be retrievable, applied, and verified to *prove* the loop. You need **one learning end-to-end** plus the **substrate** to extend.

The fastest end-to-end candidate: **asset alpha pipeline**.

- **Captured** (already done in V2 doc).
- **Retrievable** by tag `asset-quality, character, mascot, alpha`.
- **Applied** as part of the Image Pipeline MCP — every imported pose passes through `rembg` + alpha-check.
- **Verified** by the Tier-1 alpha QA gate which records `asset_alpha_check: pass | fail` per asset.

If the Homeboy Shipping build runs that one learning end-to-end, the loop is alive. The other seven follow the same shape.

---

## 8. What this audit locks

- Capture works; retrieval / application / verification are the missing halves.
- Eight MBSH learnings are the test cases. Retrieval and verification rate must improve to prove the loop.
- The fastest path to a working loop is **one learning end-to-end** (asset alpha is the recommended pilot).
- Recommendation N6 in `WORKSTREAM-MAP.md` (close-the-loop) is the plan that owns this work.
- The five-question test after Homeboy Shipping is the success measure.

A learning is not really captured until the next build can find it, use it, and prove it helped.
