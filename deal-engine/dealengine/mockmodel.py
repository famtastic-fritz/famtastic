"""Local OpenAI-compatible mock model server (stdlib only).

Purpose: PROVE the router's live-call path actually works — real HTTP request,
real response parsing, real usage-token accounting — without any API key, paid
model, or external network. It binds to localhost only and returns deterministic
chat-completion JSON in the OpenAI/OpenRouter schema, including a `usage` block so
the router records measured (not estimated) token counts.

Run standalone:
    python -m dealengine.mockmodel --port 11434
then point the engine at it:
    LOCAL_MODEL_URL=http://127.0.0.1:11434/v1 DEAL_ENGINE_ALLOW_LIVE_CALLS=1 ./bin/deal-engine ...

This is a TEST DOUBLE. It is never used in production routing; it only exists so
the live pipe can be exercised offline.
"""
from __future__ import annotations

import argparse
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class _Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):  # silence access logging
        pass

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            req = json.loads(raw)
        except Exception:
            req = {}
        messages = req.get("messages", [])
        model = req.get("model", "mock-model")
        prompt = " ".join(m.get("content", "") for m in messages)

        # Deterministic "reasoning" so tests are reproducible.
        reply = (f"MOCK-LIVE reply from {model}: acknowledged a {len(prompt)}-char "
                 f"prompt and returning a structured answer.")
        prompt_tokens = max(1, len(prompt) // 4)
        completion_tokens = max(1, len(reply) // 4)

        payload = {
            "id": "chatcmpl-mock",
            "object": "chat.completion",
            "model": model,
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": reply},
                "finish_reason": "stop",
            }],
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens,
            },
        }
        body = json.dumps(payload).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def serve(port: int = 11434, host: str = "127.0.0.1") -> ThreadingHTTPServer:
    httpd = ThreadingHTTPServer((host, port), _Handler)
    return httpd


def serve_in_thread(port: int = 11434):
    """Start the mock in a background thread; returns (server, thread)."""
    httpd = serve(port)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd, t


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="OpenAI-compatible mock model server")
    ap.add_argument("--port", type=int, default=11434)
    args = ap.parse_args(argv)
    httpd = serve(args.port)
    print(f"mock model listening on http://127.0.0.1:{args.port}/v1/chat/completions")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.shutdown()
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
