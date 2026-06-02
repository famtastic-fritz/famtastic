# Shay — Omnipresent Virtual Assistant ⭐ (Fritz priority)

> Assume the assistant Fritz wants doesn't exist as one product. Build it from
> the best available pieces, on top of the Shay runtime we already have.

The goal: Shay stops being a Telegram-only assistant and becomes a manager-grade
presence that can reach Fritz **everywhere** — phone, web, voice (Alexa/Google),
smartwatch, AR/smart glasses — and that he can reach from anywhere, with a
**virtual body** (avatar + voice + persona).

## How it's sequenced

1. **Research (running)** — `docs/shay-fritz-ready/VIRTUAL-ASSISTANT-LANDSCAPE.md`:
   what exists, what to build on, which reach channels are open vs locked, and a
   recommended stack.
2. **Reach fabric** — one service that delivers a message to whichever channel
   reaches Fritz, with fallback (push → SMS → voice → Telegram → email).
3. **Virtual body** — avatar/voice/persona, chosen for cost + latency.
4. **Ubiquity** — wearables and glasses, within platform limits.

## Anchored to what exists

Shay runs today on Hermes Agent v0.13.0 at `~/.shay/` (Claude Sonnet via Max OAuth
+ Gemini + Ollama, Telegram delivery working, crons active — see
`SHAY-MASTER-PLAN-2026-05-28.md`). This plan extends that runtime; it does not
replace it. Shares the reach fabric with `fritz-companion-app`.
