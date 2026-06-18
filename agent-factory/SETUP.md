# SETUP — running offline (default) and going live later

## 1. Offline (default — no setup, no spend)

Nothing to configure. The model layer (`src/llm.py`) serves every call from a
deterministic local stub. Token counts and per-tier prices are simulated so the
cost ledger and routing behave realistically, but **no network call is made and
no money is spent.**

```bash
cd agent-factory
python3 -m venv .venv          # optional but recommended (isolated runtime)
./run.sh demo
```

## 2. Going LIVE with real models (OpenRouter)

Real model calls are **opt-in and require two things** so it can never happen by
accident:

1. Copy the env template and add your key:
   ```bash
   cp .env.example .env
   # edit .env:
   #   OPENROUTER_API_KEY=sk-or-...
   #   AGENT_FACTORY_LIVE=1
   ```
2. That's it. The next run uses real models. If either the key is missing **or**
   `AGENT_FACTORY_LIVE` is not `1`, the stub is used.

`.env` is git-ignored; only `.env.example` is committed. No credentials ever
enter the repo.

### Which models?

The tiered catalog lives in `src/llm.py → MODEL_CATALOG`:

| Tier | Model id | ~$ / 1M in | ~$ / 1M out | Used for |
|------|----------|-----------|------------|----------|
| triage   | `meta-llama/llama-3.1-8b-instruct` | 0.05 | 0.08 | triage, classify |
| standard | `anthropic/claude-haiku-4-5` | 0.80 | 4.00 | extract, summarize |
| strong   | `anthropic/claude-sonnet-4-6` | 3.00 | 15.00 | compare, analyze |
| frontier | `anthropic/claude-opus-4-8` | 15.00 | 75.00 | synthesize, plan (only when needed) |

Prices are illustrative — update them to match current OpenRouter pricing. The
router optimises throughput-per-dollar, so accurate prices = better routing.

### A different provider?

`src/llm.py` speaks the OpenAI/OpenRouter `chat/completions` shape over stdlib
`urllib`. Point `OPENROUTER_BASE_URL` at any compatible endpoint (a local
Ollama/LM Studio server, vLLM, etc.) and the same code path works.

## 3. Tuning behaviour

Edit `config.json` (or let the self-improvement loop tune it). Every adjustable
value has a `*_bounds` pair the loop will never exceed. Reset to defaults by
editing the file directly.

## 4. Real task sources

Replace the static `tasks/seed_tasks.json` by enqueueing programmatically:

```python
from src import queue_db
queue_db.enqueue("analyze", "Look at PR #123", {"url": "..."}, priority=4)
```

Wire this into a webhook, a cron-fed file watcher, or a poller. The orchestrator
picks up new pending rows on its next tick automatically.
