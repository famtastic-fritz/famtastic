# AI website builder edit enhancement workflow research

Status: completed
Source: perplexity
Citations: 8
Search results: 8
Usage: {"prompt_tokens":61,"completion_tokens":1112,"total_tokens":1173,"search_context_size":"low","cost":{"input_tokens_cost":0.00006,"output_tokens_cost":0.00111,"request_cost":0.005,"total_cost":0.00617}}
Cost: n/a

## Answer excerpt

Here are the current best practices for AI website builders, with **concise implementation implications** for web designers.

## 1) High-quality generation
**Best practice**
- Use **structured, detailed prompts/intake**: industry, audience, offer, tone, CTA, differentiators, constraints.
- Generate from **proven page patterns** (hero → problem → solution → benefits → proof → CTA).
- Make the AI aware of **brand rules** and **content style**.

**Implementation implications**
- Add an onboarding form that captures:
  - business type, ICP, goals, differentiators, trust signals, required pages
- Store these as reusable **site context objects** for all generations.
- Prefer **section-level generation** over full-page “black box” generation for better control.

**Source signals:** Durable and Wix emphasize detailed business input + customizable outputs; Microsoft notes human review remains essential. [1][5][6]

---

## 2) Section-level edits
**Best practice**
- Let users edit **one section a
