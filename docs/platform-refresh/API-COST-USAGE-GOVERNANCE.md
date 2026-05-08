# API + Cost + Usage Governance

**Parent:** `STUDIO-PLATFORM-REFRESH-V2.md`
**Companion:** `AUTONOMOUS-BUILD-OPERATING-MODEL.md` (cost guardrails section), `MBSH-AS-STUDIO-BUILD-AUDIT.md` (capabilities #51–60).
**Status:** First-class governance. The MBSH build silently burned six Netlify deploys to "skipped due to credit usage" before it surfaced. That is the gap this doc closes.

---

## 1. The thesis

FAMtastic's economics depend on **cheap defaults, expensive when justified, never expensive by accident**. The Platform Refresh v2 governance layer makes that policy explicit at four levels:

1. **Telemetry** — every provider call records cost, tokens, latency, status.
2. **Estimate** — every expensive operation shows a cost estimate before it runs.
3. **Lane** — every recipe declares "cheap lane" or "premium lane" by default.
4. **Gate** — every cost above the soft threshold creates an Approval Center item; every cost above the hard threshold pauses the run.

This is the same governance pattern the autonomous-build model uses. Cost is just one of the categories of dangerous action.

---

## 2. Provider universe (what we track)

Every paid or rate-limited provider the platform talks to is in scope.

### 2.1 Text / chat / reasoning models

| Provider | Models we use | Pricing model | Currently tracked? |
|---|---|---|---|
| Anthropic / Claude | Sonnet, Opus, Haiku (varies by surface) | per-token in/out | ❌ no |
| OpenAI | GPT-4 family for prompts, Responses API for image-gen | per-token + per-image | ❌ no |
| Google AI Studio (Gemini) | Gemini for image (Imagen 4) + occasional text | per-call + per-image | 🟡 manual (key rotation logged on MBSH P3) |
| Local / cheap-lane fallback (e.g., Ollama, hosted small models) | Optional | free | ❌ not yet wired |

### 2.2 Image generation

| Provider | Capability | Pricing | Tracked? |
|---|---|---|---|
| OpenAI Responses (image_generation) | Identity-locked character poses, transparent PNG | per-image | ❌ |
| Google Imagen 4 | Hero stills, environments | per-image | ❌ |
| Leonardo (Phoenix, image-to-video) | Cinematic ambience, atmospheric loops | per-call + per-second | ❌ |
| fal.ai / Flux (Kontext) | Style-consistent batch stills | per-image | ❌ |
| Adobe Firefly (web manual) | Polish, finishing | manual / Adobe sub | ❌ — not metered, manual handoff |
| Claude SVG | Vector logos / icons (`/api/media/generate-asset`) | per-token | ❌ |

### 2.3 Video generation

| Provider | Capability | Pricing | Tracked? |
|---|---|---|---|
| Leonardo image-to-video | atmospheric loops | per-second of output | ❌ |
| Google Veo 2 / Veo 3 | text-to-video, image-to-video | per-second | ❌ |
| Runway Gen-3 (after auth) | text/image-to-video | per-second | ❌ — auth not configured |

### 2.4 Audio / voice / music

| Provider | Capability | Pricing | Tracked? |
|---|---|---|---|
| ElevenLabs | TTS, sound effects, music | per-character + per-second | ❌ |
| Suno (after auth) | music | per-track | ❌ — auth not configured |

### 2.5 Search / research / data

| Provider | Capability | Pricing | Tracked? |
|---|---|---|---|
| Perplexity | research scans | per-query | ❌ |
| SimilarWeb / Ahrefs / SEO tools | competitor + traffic data | per-call / per-month | ❌ |
| Pinecone | vertical knowledge embeddings | per-vector + per-query | 🟡 connected, no usage meter |

### 2.6 Hosting / deploy / infra

| Provider | Capability | Pricing | Tracked? |
|---|---|---|---|
| Netlify | site host, build minutes, bandwidth | monthly plan + overages | 🟡 silent failure on MBSH; **this is the proof** that we need explicit tracking |
| GoDaddy / DNS | domain registration + DNS | annual + per-domain | ❌ |
| Backend host (per-site PHP/MySQL) | runtime | per-site | ❌ |
| Resend (email) | committee email + transactional | per-email + monthly | 🟡 verified, no usage meter |

### 2.7 Adobe / desktop polish

| Provider | Capability | Pricing | Tracked? |
|---|---|---|---|
| Adobe Photoshop / Firefly desktop | polish, finishing, retouching | Creative Cloud sub | ✋ manual handoff only |
| adb-mcp | desktop automation | (free) | 📄 doc-confirmed-untested |

---

## 3. The Capability Truth Layer cost extension

Every entry in the Capability Truth Layer carries a `cost` field with this shape:

```yaml
cost:
  unit: "image" | "second" | "token" | "call" | "deploy" | "month"
  amount: numeric                          # e.g. 0.04
  currency: "USD"
  source: "provider_pricing_doc_link"
  estimate_basis: "per_image | per_1k_tokens | per_minute_video | per_seat"
  monthly_baseline: numeric                # what you pay even with zero use
  notes: "free text"
```

A capability without a `cost` field counts as `cost: unknown` and is **automatically routed through the approval gate** until someone adds the field. (No surprise expensive calls.)

---

## 4. Required UI surfaces

Six surfaces. Each maps to an existing or planned screen.

### 4.1 Cost estimate before expensive generation

**Where:** every screen that triggers a provider call (Media Studio prompt input, Component Studio sandbox, Build Mode pass kickoff, asset generation, video generation).

**What:** before submission, the surface shows: `~$0.04 (Imagen 4) · ~5–8s · within run cap ($14.20 / $25)`.

**Behavior:**
- Soft threshold breach: yellow, "approve cost" button required.
- Hard threshold breach: red, blocks; routes to Approval Center.
- Below threshold: gray, click-through.

### 4.2 Usage meter (running)

**Where:** Ops Workspace inside Admin (`/admin` health overview).

**What:** active run cost, today's cost, this month's cost, per-provider breakdown.

**Why:** matches the way MBSH operators were caught off-guard by Netlify build credits.

### 4.3 Provider health

**Where:** Ops Workspace `/admin/capabilities` panel.

**What:** per provider: rate-limit, quota, outage, last-test result, last-known-good time.

**Source:** Capability Truth Layer + per-provider probe.

### 4.4 Per-run cost report

**Where:** Sites domain `/sites/<tag>/build` (the Build Ledger panel).

**What:** for the run just completed: provider × calls × cost. Compared to the run contract's cost guardrails.

**Why:** the V2 backlog can include "we should have used the cheap lane for that batch" only if the data exists.

### 4.5 Monthly cost summary

**Where:** Ops Workspace `/admin/cost-summary` (new sub-route).

**What:** monthly spend by provider, by site, by run-mode (manual / assisted / GA / GA-to-completion / batch).

**Why:** reveal whether autonomy modes are paying off. If GA-to-completion runs cost 3× manual for the same outcome, that's a signal.

### 4.6 Cheap-lane / premium-lane selection

**Where:** Recipe Composer (Build Mode), per-recipe defaults; per-task override available.

**What:** every recipe declares per-asset-class lanes:

```yaml
recipe_lanes:
  hero_still:
    cheap: { provider: openai_responses, fallback: imagen_4 }
    premium: { provider: imagen_4, fallback: openai_responses }
  character_pose:
    cheap: { provider: openai_responses, transparent: true }
    premium: { provider: openai_responses, with_critique_loop: true }
  background_video:
    cheap: { skip: true, use_existing_loop: true }
    premium: { provider: leonardo_i2v, fallback: veo_2 }
  voice_narration:
    cheap: { skip: true }
    premium: { provider: elevenlabs }
```

The recipe's *base type* determines the default lane. `simple` = cheap; `cinematic` = premium for visual but cheap for video unless explicitly enabled; `event` = premium hero, cheap rest.

---

## 5. Approval gate before costly media / video / API actions

Three thresholds, three behaviors.

```yaml
cost_thresholds:
  per_call_inline_warning:    $0.50    # show estimate before run, no approval
  per_run_soft_approval:      $5.00    # approve cost button on the screen
  per_run_hard_approval:     $15.00    # routes to Approval Center, pauses run
  cumulative_run_hard_cap:   $50.00    # absolute stop for one run
  monthly_soft_cap:         $200.00    # warn on every expensive call
  monthly_hard_cap:         $500.00    # all paid-tier calls pause
```

**Defaults are conservative.** Fritz can raise them per recipe (e.g., a flagship-cinematic site could be $100/run). The defaults exist so a malfunction never burns budget.

---

## 6. Routing rules (cheap lane first)

Adopt the existing `studio-capabilities.json` `routing_rules` block as the seed. Extend with cost-aware fallback:

```yaml
routing_rule:
  task: hero_still_environment
  primary: openai_responses.image_generation
  fallback: google.imagen_4
  cheap_lane: openai_responses    # uses cheaper model defaults
  premium_lane: google.imagen_4   # pricier but higher fidelity for hero
  cost_aware: true
  on_quota_exceeded:
    action: switch_to_fallback
    record: capability_event
  on_estimate_above_soft:
    action: show_approval_prompt
  on_estimate_above_hard:
    action: route_to_approval_center
```

The `validated` evidence tier in the existing manifest is preserved. Cost-awareness is layered on top, never replacing it.

---

## 7. Local / free model lanes

Some tasks can run without paid providers. Examples:

- **rembg** background removal — local Python, free. Already used on MBSH P12 audit.
- **Image compression** — local `pngquant` / `cwebp` — free.
- **Local browser screenshot** — Playwright local — free.
- **Local lint / type-check / smoke** — free.
- **Pinecone-stored embeddings + local cosine search** — already paid baseline; no marginal cost.

Recipes can bias these for early-pass / draft work. Premium-lane recipes still escalate when needed.

---

## 8. Telemetry schema

Every provider call records:

```yaml
provider_call:
  call_id: uuid
  run_id: link to run record
  pass_id: link to pass closeout (if applicable)
  site_tag: which site this is for
  provider: openai_responses | imagen_4 | leonardo_i2v | ...
  task: hero_still_environment | character_pose | ...
  unit: image | second | token | call
  units_consumed: numeric
  cost_usd: numeric
  latency_ms: numeric
  status: success | failed | rate_limited | timeout
  prompt_id: link to prompt registry entry
  output_id: link to media library entry
  approval_required: bool
  approval_id: link to Approval Center item if applicable
  ts: ISO 8601
```

Stored in `tasks/provider-calls.jsonl` (append-only). All cost surfaces query this log.

---

## 9. The Netlify-build-credit lesson

The MBSH P7→P13 push window silently lost six staging deploys to *"Skipped due to account credit usage exceeded"* before Fritz noticed in chat. The deploys completed at the Netlify CLI level but never went live. The diagnosis required:

1. Curl the staging URL (revealed stale ETag)
2. List Netlify deploys (revealed all "error" state with the credit message)

**Required fix in Platform Refresh v2:**
- Capability Truth Layer probes Netlify monthly limit on every push.
- Status `costly` if within 80% of limit. Status `broken` if at limit.
- Approval Center item created automatically when `costly` is hit.
- Mission Control surfaces a red banner.

This single failure mode doubles as the proof that this whole governance layer is necessary.

---

## 10. Adobe / Firefly / manual provider handoff

Adobe is *polish*, not a generator. It cannot be metered the way an API is. The governance for it:

1. Capability Truth Layer marks `photoshop_finishing: manual_only`.
2. The handoff is a *prompt packet* + asset bundle that the operator opens locally.
3. The result returns through the asset library with a "manual provider" tag.
4. Cost is tracked at the Creative Cloud subscription level (monthly baseline), not per-call.

The same pattern applies to any other manual provider (Suno before auth, Runway before auth, etc.).

---

## 11. What this doc locks

- **Cost is first-class governance**, not a feature backlog item.
- Six surfaces (estimate · meter · provider health · per-run report · monthly summary · lane selector) all draw from one telemetry log.
- Three thresholds (per-call warning · per-run soft · per-run hard) with explicit behaviors.
- Cumulative run cap and monthly hard cap **always** pause; can only be lifted by Fritz.
- Capability Truth Layer carries cost data on every entry; missing cost = automatic approval gate.
- Cheap lane is the default for every recipe except where the recipe explicitly declares premium.
- Local / free providers are first-class members of the routing table, not afterthoughts.

When in doubt: cheap lane, ask before spending, log everything.
