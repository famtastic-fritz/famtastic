# Contract: Execution Families

**Owner milestone:** M8 — Define execution-family contracts
**Status:** FROZEN
**Frozen at:** 2026-07-22
**Freezes affected:** M9, M10, M11, M12, M13, M14, M15

## Purpose
Separate the runtime from provider-specific SDK details. Each execution family has a standard contract; providers implement adapters.

## Families

### TextModelRunner
- **Input:**
  - `prompt` (string | array of messages)
  - `model` (string): provider-specific model selector
  - `maxTokens` (number)
  - `temperature` (number, optional)
  - `tools` (array, optional): tool definitions
  - `history` (array, optional): prior conversation turns
- **Output:**
  - `content` (string)
  - `usage` ({ inputTokens, outputTokens })
  - `stopReason` (string)
  - `toolCalls` (array, optional)
- **Capabilities:** streaming, retry-safe, batch-no
- **Adapters:** Anthropic Claude, OpenAI, Google Gemini, Codex

### ImageGenerator
- **Input:**
  - `prompt` (string)
  - `aspectRatio` (string)
  - `styleParams` (object)
  - `count` (number, default 1)
- **Output:**
  - `images` (array of artifact references)
- **Capabilities:** retry-safe, streaming-no
- **Adapters:** FAL.ai, Google Imagen, OpenAI DALL-E, Leonardo

### ImageEditor
- **Input:**
  - `sourceImages` (array of artifact references)
  - `instruction` (string)
  - `params` (object)
- **Output:**
  - `images` (array of artifact references)
- **Capabilities:** retry-safe, streaming-no
- **Adapters:** FAL.ai, Google Imagen (where supported), Leonardo

### BrowserCapture
- **Input:**
  - `target` (string): URL or local file path
  - `viewport` (object)
  - `captureType` (enum): `screenshot`, `pdf`, `metrics`, `fullPage`
- **Output:**
  - `captures` (array of artifact references)
  - `metrics` (object, optional)
- **Capabilities:** retry-safe, streaming-no
- **Adapters:** Puppeteer

### DeterministicToolRunner
- **Input:**
  - `toolName` (string)
  - `arguments` (object)
  - `executionContext` (object): run-scoped context
- **Output:**
  - `result` (any)
  - `sideEffects` (array): list of mutated artifacts
- **Capabilities:** deterministic, retry depends on tool
- **Adapters:** Studio tool handlers, filesystem ops, verification tools

## Adapter Registry

Adapters are registered by provider name under each family:

```js
ModelRunnerRegistry.register('TextModelRunner', 'anthropic', AnthropicTextAdapter);
ModelRunnerRegistry.register('TextModelRunner', 'openai', OpenAITextAdapter);
```

Family default provider is read from the capability manifest, recipe stage config, or `RunContext` provider hint. A recipe stage may explicitly request a provider.

## Common Contract Shape

Every family request includes:
- `runId`
- `stageAttemptId`
- `abortSignal` (AbortSignal)

Every family response includes:
- `artifactReferences` (array): ids of artifacts produced
- `durationMs`
- `costUsd` (when available)

## Retries and Timeouts

Default per family:

| Family | Default Timeout | Default Retries | Retry Owner |
|--------|-----------------|-----------------|-------------|
| TextModelRunner | 180s | 2 | stage |
| ImageGenerator | 120s | 2 | stage |
| ImageEditor | 120s | 2 | stage |
| BrowserCapture | 60s | 1 | stage |
| DeterministicToolRunner | 30s | 0 | none |

Recipe stage config may override defaults. The runtime orchestrator enforces the timeout via `AbortSignal`.

## Telemetry Flow

1. Runner receives request with `RunContext` and `StageAttempt`.
2. Runner emits `stage:running` and `artifact:created` events to the runtime event bus.
3. Runner returns response with usage/cost/duration.
4. Orchestrator writes a `trace_event` artifact and updates `StageAttempt` outputs.
5. Telemetry is aggregated into the `RunRecord`.

## Anti-Goals
- Do not let provider SDKs leak into the recipe DSL.
- Do not duplicate capability detection logic per adapter.
- Do not allow adapters to read mutable global state.
