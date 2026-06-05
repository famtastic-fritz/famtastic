# CLI-as-Brain (Gemini / Codex / Claude) + Frontier Watchlist — Mid-2026
> Background research swarm, agent 3 of 3. Raw report — synthesized into SHAY-MODEL-LANDSCAPE.md once all three land.

## Part 1 — Gemini CLI as a free brain → DO NOT
- **How it works:** `gemini` OAuth ("Login with Google") provisions a free Gemini Code Assist license; calls the Code Assist backend, not the metered API. Free quota ~**60 req/min, 1,000 req/day** (~10× the free API key's ~100/day) — which is why it's tempting.
- **The crux — explicit ToS violation.** Google's own gemini-cli repo states verbatim: *"Directly accessing the services powering Gemini CLI (e.g. the Gemini Code Assist service) using third-party software… is a violation… Such actions may be grounds for suspension or termination of your account."*
- **Real bans documented:** a user running gemini-cli headless in a cron job with a custom system prompt (exactly the "agent brain" pattern) was suspended (issue #20813); mass 403 ToS bans hit CLI-wrapper users, some on paid tiers. Tiered enforcement: 1st flag → suspension + recert form; **2nd violation → permanent ban.**
- **And it's dying:** the free OAuth/Code Assist path is **shut off June 18, 2026** (Google pushes everyone to Antigravity CLI; only paid Standard/Enterprise survive). So building on it = non-compliant AND breaks within weeks.
- **Do instead:** Gemini via proper **API key** (paid, governed by API ToS) — which is exactly how Shay already has it — with **AI Studio free tier (~100 req/day)** as a no-cost dev lane. Watch **Gemini 3.5 Flash** (cheap/fast/1M ctx) as the going-forward Google brain.

## Part 2 — Codex via ChatGPT subscription → LEGITIMATE (like Claude Code)
- **"Sign in with ChatGPT"** is a first-class, supported Codex CLI feature; usage counts against your ChatGPT plan, not API billing. No equivalent of Google's third-party-OAuth prohibition. **Validates the gpt-5.4 Codex fallback you just added.**
- Default Codex model now **gpt-5.5**; gpt-5.4 / 5.4-mini / 5.3-codex also selectable. Limits = 5-hour rolling window + weekly caps (Plus ≈ 20–100 msgs/5h; Pro ≈ 200–1,000/5h). Check `/status`.
- **Safe pattern:** keep Shay invoking the real `codex` binary on your subscription. Don't scrape the ChatGPT token into a custom client (that leaves supported territory).

## Part 3 — Claude Code subscription (your baseline) + a CRITICAL warning
- Claude Code on **Max** uses OAuth/subscription billing — **UNLESS `ANTHROPIC_API_KEY` is set, which takes precedence and silently reverts you to metered API billing.** People have eaten >$1,800 surprise bills from this. **Action: `echo $ANTHROPIC_API_KEY` must be empty.**
- **The universal safe pattern across all three:** drive the vendor's *own official CLI/SDK* on the subscription token, and never let a metered API-key env var leak in. Claude ✅ · Codex ✅ · Gemini CLI OAuth ❌ (forbidden for third-party agents).

## Part 4 — Frontier watchlist (mid-2026) — "add as I hear about them"
| Vendor | Model | Why | Access |
|---|---|---|---|
| Anthropic | **Claude Opus 4.7** (Apr 16 2026) | top public Claude, SWE-bench 87.6% | Max sub (you have) / API |
| Anthropic | **Claude "Mythos"** preview | most capable, above Opus 4.7 — watch for GA | preview only |
| OpenAI | **GPT-5.5** ("Spud", Apr 23 2026) | new Codex default for hardest agentic work | ChatGPT plan / API |
| OpenAI | gpt-5.3-codex-spark | low-latency Codex for fast loops | preview, Pro |
| Google | **Gemini 3.1 Pro** | frontier reasoning, 1M ctx | API / AI Studio |
| Google | **Gemini 3.5 Flash** | cheap/fast, 1M ctx — ideal high-volume fallback (3.5 Pro slipped to ~June) | API / AI Studio / Vertex |
| Meta | **Llama 4 Scout/Maverick** | open-weights frontier, ~10M ctx, self-host | free weights |
| Mistral | **Large 3 + Small 4** | Apache-2.0 MoE, clean commercial license | free weights / API |
| DeepSeek | **V3.2 / V3.2-Speciale** | GPT-5-class at open-weight price, MIT | free weights / cheap API |
| Qwen | **Qwen3 235B-A22B** | Apache-2.0, safest enterprise open license | free weights |
| xAI | **Grok 4.3 Beta** (Apr 17 2026) | native tool-use + real-time search | SuperGrok / API |
| Nous | **Hermes 4 (405B)** | open self-improving agent stack, Nous house brain | free weights |

**Easy-add for Shay:** open-weights tier behind one OpenAI-compatible endpoint (Ollama/vLLM local, or OpenRouter hosted) → each new model = one-line base-URL/model-name change. Closed frontier via official CLI/SDK on sub or API key.

## Bottom line
Claude (Max→Claude Code) and Codex (ChatGPT plan→official Codex CLI) are both legit flat-rate brains because each vendor ships subscription auth as a supported feature of its own CLI — keep Shay invoking those real binaries and never let a metered API-key env var override the sub token. Gemini is the exception: CLI OAuth is explicitly forbidden for third-party agents, already bans accounts, and retires June 18 2026 — run Gemini through an API key (or AI Studio free tier) instead. For growth, add open-weights frontier (Llama 4, Qwen3, DeepSeek V3.2, Mistral Large 3, Hermes 4) behind one OpenAI-compatible endpoint; watch Claude Mythos and Gemini 3.5 Pro as the next closed-frontier upgrades.

### Key sources
- [gemini-cli ToS/privacy](https://github.com/google-gemini/gemini-cli/blob/HEAD/docs/resources/tos-privacy.md) · [suspension case #20813](https://github.com/google-gemini/gemini-cli/issues/20813) · [June 18 shutdown](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/)
- [Codex with ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan) · [Codex rate card](https://help.openai.com/en/articles/20001106-codex-rate-card)
- [Claude Code Pro/Max billing](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan) · [unintended-billing issue](https://github.com/anthropics/claude-code/issues/37686)
