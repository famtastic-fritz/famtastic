---
title: Ollama Brain Configuration Pitfalls (Bugs 276/277/278)
date: 2026-06-09
author: claude-code-cli
source: debugging-session
confidence: confirmed-fixed
tags:
  - ollama
  - brain
  - configuration
  - bug-276
  - bug-277
  - bug-278
  - num_ctx
  - kv-quant
  - launchd
permalink: shay-memory/learnings/ollama-brain-pitfalls-2026-06-09
---

# Ollama Brain Configuration Pitfalls (Bugs 276/277/278)

Fixed by Claude Code CLI session on 2026-06-09. Documented here so they never need rediscovering.

## Bug-276: Provider Registration Required in `providers:` Dict

**Symptom:** Ollama models appear in `model_aliases` and `fallback_providers` but requests fail with connection errors or silently route elsewhere.

**Root cause:** Defining Ollama in `model_aliases` or `fallback_providers` alone is NOT enough. A top-level `ollama:` entry must exist in the `providers:` dict of `config.yaml` for Shay's brain to know how to reach the Ollama endpoint.

**Fix:** Ensure `providers:` dict includes:
```yaml
providers:
  ollama:
    name: Ollama (local)
    base_url: http://localhost:11434/v1
```

**Status:** CONFIRMED FIXED in ~/.shay/config.yaml

## Bug-277: `reasoning_content` Must Be Stripped for Strict APIs

**Symptom:** Requests to Cerebras, Groq, or other strict-schema providers fail with 400/422 errors about unexpected `reasoning_content`.

**Root cause:** Ollama reasoning models (hermes3, qwen variants) include `reasoning_content` in responses. When forwarded verbatim to strict-schema APIs (Cerebras, Groq), they reject it.

**Fix:** Strip `reasoning_content` from message payloads before sending to strict-schema providers. Fix location: brain client response normalization layer.

**Status:** CONFIRMED FIXED

## Bug-278: Ollama Defaults to 4096-Token Context Ceiling

**Symptom:** Models respond with truncated outputs, "I'll continue" patterns, or refuse complex prompts despite supporting 64K contexts.

**Root cause:** Ollama sets `num_ctx: 4096` by default regardless of model's actual context window.

**Fix (two parts):**

1. **Per-model num_ctx in config:** Define model variants with explicit context sizes:
```yaml
model_aliases:
  hermes3: "ollama/hermes3"
  hermes3-64k: "ollama/hermes3"  # same model, different num_ctx
```
Then pass `num_ctx` in the Ollama `/api/chat` request:
```json
{ "model": "hermes3", "options": { "num_ctx": 65536 } }
```

2. **KV-quant environment variable for memory efficiency:**
`OLLAMA_KV_CACHE_TYPE=q8_0` reduces KV cache memory usage, critical for 64K contexts on consumer hardware.

**PERSISTENCE GAP:** `launchctl setenv` and shell `export` are session-scoped on macOS. They DO NOT survive reboots. Need a LaunchAgent to set env vars before Ollama starts.

**LaunchAgent fix (NOT YET CREATED):**
```xml
<!-- ~/Library/LaunchAgents/com.famtastic.ollama-env.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.famtastic.ollama-env</string>
    <key>ProgramArguments</key>
    <array>
        <string>sh</string>
        <string>-c</string>
        <string>launchctl setenv OLLAMA_KV_CACHE_TYPE q8_0</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```
Load: `launchctl load ~/Library/LaunchAgents/com.famtastic.ollama-env.plist`

**Status:** Code fix CONFIRMED. LaunchAgent for KV-quant persistence NOT YET CREATED (open task LAUNCHAGENT).

## Verification Checklist

When verifying brain fixes landed:
1. Buglog: `cat ~/.wolf/cerebrum.md | grep -i '<topic>'`
2. Session captures: `ls -la ~/.shay/sessions/*.json | tail -5`
3. Git log: `git log --oneline -10` in relevant repo
4. Live config: Read actual config file — confirm values are there
5. Runtime state: Query live endpoint (e.g., `curl localhost:11434/api/tags`) — config on disk doesn't mean runtime picked it up