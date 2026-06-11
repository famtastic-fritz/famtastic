# Vendor Capability Full Audit Addendum — OpenAI gpt-oss, Custom GPTs, GPT Store, Apps, and Actions

_Last updated: 2026-06-11_

This addendum patches the full vendor capability audit request so it does not miss OpenAI surfaces Fritz specifically called out in conversation: **gpt-oss**, custom GPTs, GPT Store, GPT Actions, Apps SDK, MCP-style apps/connectors, and GPT/workflow monetization/productization paths.

Use alongside:

`docs/famtastic-designs/vendor-capability-full-audit-prompt-2026-06-11.md`

---

## Required Additions to the Vendor Capability Full Audit

When auditing OpenAI, explicitly include these surfaces.

## 1. gpt-oss / Open-Weight OpenAI Models

Audit OpenAI's `gpt-oss` lane as its own capability surface, not just another API model.

Required questions:

- What official OpenAI docs/pages exist for `gpt-oss`?
- What model variants exist?
- Are they open-weight, API-hosted, both, or available through partners?
- What license applies?
- Where can they run: local machine, cloud GPU, Hugging Face, Ollama, vLLM, Azure, AWS, Fireworks, etc.?
- What hardware requirements are stated or observed?
- What are their strengths and weaknesses compared with hosted OpenAI models?
- Do they support tool use / agent harnesses / function calling natively, or only through a wrapper/harness?
- Are they suitable for Shay or FAMtastic production workflows now?
- What quality gates are needed before using them?
- Are they allowed under Fritz's earlier constraint to avoid local models unless proven, tested, and quality-checked?

Routing decision must distinguish:

```text
Hosted OpenAI API model != gpt-oss open-weight model
```

Potential use cases:

- local/private experimentation;
- cheap bulk transforms if quality is validated;
- offline dev/testing;
- controlled fallback lane;
- future local worker after quality harness exists.

Default stance:

```text
gpt-oss = PILOT / DEFER for Shay/FAMtastic production until proven by experiments.
```

Suggested experiment:

| Experiment | Provider | Feature | Hypothesis | Setup | Success bar | Failure bar | Decision |
|---|---|---|---|---|---|---|---|
| gpt-oss local/bulk-worker pilot | OpenAI/open-weight ecosystem | gpt-oss-20b or available variant | gpt-oss can handle cheap structured transforms without quality loss | Run same 100 classification/extraction tasks against Haiku/GPT-mini baseline | >= 90% agreement with accepted baseline, lower cost, acceptable latency | hallucinations, bad schema adherence, operational friction | promote to experimental local worker or defer |

---

## 2. Custom GPTs / GPT Store / GPT Builder

Audit custom GPTs as a product/workflow surface, not just a ChatGPT feature.

Required questions:

- What is a custom GPT?
- Who can create one?
- What plan is required?
- How are custom GPTs shared?
- What can be published publicly/private/workspace-only?
- What capabilities can be enabled: web, image, code/data, files/knowledge, actions, connectors, memory, etc.?
- What are GPT Actions and how do they authenticate/call external APIs?
- What are privacy/security risks?
- What happens when other people use Fritz's GPT — whose usage limits apply?
- What costs can Fritz incur if a GPT Action calls his backend?
- What limitations exist around direct monetization?
- What indirect monetization paths are realistic?

FAMtastic product ideas to evaluate:

- FAMtastic Business Review GPT
- FAMtastic Website Proof Interview GPT
- FAMtastic Church Connect Readiness GPT
- FAMtastic Nonprofit Growth GPT
- FAMtastic Local Business Glow-Up GPT
- FAMtastic E-commerce From-Phone GPT
- FAMtastic AI Automation Audit GPT

Default stance:

```text
Custom GPTs = PILOT as lead-gen/workflow tools, not primary revenue engine.
```

Why:

- GPTs can route users into FAMtastic services.
- GPTs can serve as guided intake/interview flows.
- GPT Actions can connect to FAMtastic backend/proof engine later.
- Direct GPT Store monetization should not be assumed.

---

## 3. GPT Actions / External API Integration

Audit GPT Actions separately from custom GPTs.

Required questions:

- How are Actions defined?
- What schema format is used?
- What auth options exist?
- Can Actions call a FAMtastic backend endpoint?
- What safety/approval UX exists for users?
- How should Fritz avoid exposing secrets?
- How should rate limits and abuse be handled?
- What logs are needed when a GPT Action triggers a proof request?

Potential FAMtastic integration:

```text
Custom GPT interview
→ Action call to FAMtastic backend
→ create Lead
→ create Business Review
→ queue Proof
→ return status/check link
```

Risk:

- public GPT can become an unbounded backend-cost generator if not rate-limited.

Required guardrails:

- API auth;
- per-user/session rate limits;
- spam checks;
- captcha or abuse scoring if public;
- cost budgets;
- backend queueing;
- no direct proof generation until lead passes minimum validity checks.

---

## 4. Apps SDK / ChatGPT Apps / MCP-style Integrations

Audit whether OpenAI Apps SDK / ChatGPT app integrations can become a stronger long-term lane than simple custom GPTs.

Required questions:

- What is the Apps SDK?
- How does it differ from custom GPTs?
- Can it expose a richer UI?
- Can it integrate with MCP servers/tools?
- Can it support a FAMtastic Business Review or Proof Preview app inside ChatGPT?
- What hosting/backend requirements exist?
- What review/publishing process exists?
- What monetization or lead-generation path exists?

Default stance:

```text
Apps SDK = research/pilot for Phase 2 product lane.
Custom GPT = faster Phase 1 lead-gen/intake experiment.
```

---

## 5. Required Output Additions

Add these rows to `vendor-capability-full-audit.md`:

- OpenAI — gpt-oss / open-weight models
- OpenAI — Custom GPTs / GPT Builder
- OpenAI — GPT Store / sharing/publishing
- OpenAI — GPT Actions
- OpenAI — Apps SDK / ChatGPT Apps
- OpenAI — Codex app/CLI/subagents/skills/workflows if documented

Add these experiments to the experiments section:

1. Custom GPT as FAMtastic Business Review GPT
2. GPT Action → FAMtastic backend lead creation
3. gpt-oss structured-transform benchmark
4. Apps SDK feasibility check for richer FAMtastic intake/proof preview
5. Codex/Codex-like worker feasibility for repo/build tasks

Add these account verification tasks:

- Can Fritz create and publish GPTs?
- Which GPT capabilities are enabled in his account/workspace?
- Can GPT Actions be configured?
- Can a GPT Action call a test FAMtastic endpoint?
- Are GPTs usable by prospects without Fritz paying for every ChatGPT message?
- What backend/API costs could Fritz incur from Actions?
- Does Fritz have access to Apps SDK features?
- Does Fritz have access to gpt-oss via OpenAI, partners, Ollama, Hugging Face, or other official/reputable channels?

---

## Final Instruction

Do not let the vendor audit miss product surfaces just because they are not normal API endpoints.

For Fritz, the useful categories are:

- hosted models;
- open-weight models;
- custom GPTs;
- GPT Actions;
- app/plugin surfaces;
- Codex/build workers;
- batch/background/flex economics;
- eval/QA harnesses;
- retrieval/memory/context services;
- studio/prototype deployment paths.

All of these must be represented in the final capability spec and routing plan.
