#!/usr/bin/env python3
"""
Shay Phone — tonight's v0.

A tiny, dependency-free (stdlib-only) proxy + static server so Fritz can run a
"Shay" PWA from his phone over the home LAN. NOT exposed to the public internet.

What it does:
  - Serves the installable PWA in ./web
  - POST /api/chat    -> Claude via OpenRouter (+ local vault context), Gemini fallback
  - POST /api/capture -> writes a markdown note into the Shay-Memory vault inbox
  - GET  /api/recent  -> lists recent inbox notes

Auth: every /api call must carry the shared token (?k= or X-Shay-Token header).
The token lives in ./.token (chmod 600, gitignored). Secrets (OpenRouter/Gemini
keys) are read from ~/.shay/.env at runtime and never logged or sent to the client.

Run:  python3 server.py         (binds 0.0.0.0:8787)
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
import glob
import shutil
import tempfile
import subprocess
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent
WEB = ROOT / "web"
TOKEN_FILE = ROOT / ".token"
ENV_FILE = Path.home() / ".shay" / ".env"
VAULT = Path.home() / "famtastic" / "obsidian" / "Shay-Memory"
INBOX = VAULT / "inbox"
ASKS = ROOT / "asks"      # pending approval/question requests from Shay jobs
JOBS_FILE = ROOT / "jobs.json"  # persistent job queue
PORT = int(os.environ.get("SHAY_PHONE_PORT", "8787"))

OPENROUTER_MODEL = os.environ.get("SHAY_PHONE_MODEL", "anthropic/claude-sonnet-4.6")
GEMINI_MODEL = "gemini-2.5-flash"

SHAY_SYSTEM = (
    "You are Shay, Fritz's personal AI assistant. You are warm, direct, and "
    "concise. You have access to Fritz's private notes (provided as context "
    "when relevant). You help him capture ideas, think through problems, take "
    "notes, and keep a diary. When context from his vault is provided, use it; "
    "if it's not relevant, ignore it. Never invent facts about his notes."
)


def load_env() -> dict:
    env = {}
    try:
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")
    except Exception as exc:  # noqa: BLE001
        print(f"[shay-phone] could not read {ENV_FILE}: {exc}", file=sys.stderr)
    return env


ENV = load_env()
TOKEN = TOKEN_FILE.read_text().strip() if TOKEN_FILE.exists() else ""


def vault_context(query: str, k: int = 4) -> str:
    """Dependency-free local relevance: score vault notes by query-term hits."""
    terms = [t.lower() for t in re.findall(r"[a-zA-Z0-9]{3,}", query)][:12]
    if not terms:
        return ""
    scored = []
    for fp in glob.glob(str(VAULT / "**" / "*.md"), recursive=True):
        try:
            text = Path(fp).read_text(errors="ignore")
        except Exception:  # noqa: BLE001
            continue
        low = text.lower()
        score = sum(low.count(t) for t in terms)
        if score:
            scored.append((score, fp, text))
    scored.sort(key=lambda x: x[0], reverse=True)
    chunks = []
    for score, fp, text in scored[:k]:
        name = Path(fp).name
        chunks.append(f"### {name}\n{text[:1200]}")
    return "\n\n".join(chunks)


def call_anthropic(messages: list, ctx: str) -> str:
    """Direct Anthropic API. Only used with a REAL api key (sk-ant-api...),
    never the sk-ant-oat OAuth subscription token (that's the capped path)."""
    key = ENV.get("ANTHROPIC_API_KEY", "")
    if not key.startswith("sk-ant-api"):
        raise RuntimeError("no direct ANTHROPIC_API_KEY (sk-ant-api...) present")
    sys_prompt = SHAY_SYSTEM + (("\n\n# Relevant notes from Fritz's vault:\n" + ctx) if ctx else "")
    body = {
        "model": os.environ.get("SHAY_PHONE_ANTHROPIC_MODEL", "claude-sonnet-4-6"),
        "max_tokens": 1024,
        "system": sys_prompt,
        "messages": [{"role": m["role"], "content": m["content"]} for m in messages],
    }
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(body).encode(),
        headers={"x-api-key": key, "anthropic-version": "2023-06-01",
                 "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.loads(r.read())
    return "".join(b.get("text", "") for b in data.get("content", [])).strip()


def call_openrouter(messages: list, ctx: str) -> str:
    key = ENV.get("OPENROUTER_API_KEY")
    if not key:
        raise RuntimeError("no OPENROUTER_API_KEY")
    sys_prompt = SHAY_SYSTEM
    if ctx:
        sys_prompt += "\n\n# Relevant notes from Fritz's vault:\n" + ctx
    body = {
        "model": OPENROUTER_MODEL,
        "messages": [{"role": "system", "content": sys_prompt}] + messages,
        "max_tokens": 1024,
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost/shay-phone",
            "X-Title": "Shay Phone",
        },
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.loads(r.read())
    return data["choices"][0]["message"]["content"].strip()


CODEX_BIN = shutil.which("codex") or os.path.expanduser(
    "~/.nvm/versions/node/v24.14.0/bin/codex")


def call_codex_cli(messages: list, ctx: str) -> str:
    """Codex CLI (uses the funded ChatGPT/Codex subscription) in non-interactive,
    read-only mode. Answers only — no file edits / shell execution."""
    if not (CODEX_BIN and os.path.exists(CODEX_BIN)):
        raise RuntimeError("codex CLI not found")
    sys_prompt = SHAY_SYSTEM + (("\n\n# Relevant notes from Fritz's vault:\n" + ctx) if ctx else "")
    convo = "\n".join(f"{'User' if m['role']=='user' else 'Shay'}: {m['content']}"
                      for m in messages)
    prompt = f"{sys_prompt}\n\n# Conversation so far:\n{convo}\n\nShay's reply:"
    with tempfile.NamedTemporaryFile("w+", suffix=".txt", delete=False) as tf:
        out_path = tf.name
    try:
        proc = subprocess.run(
            [CODEX_BIN, "exec", "-s", "read-only", "--skip-git-repo-check",
             "--ephemeral", "--color", "never", "-o", out_path, "-"],
            input=prompt, capture_output=True, text=True, timeout=120,
            cwd=str(ROOT),
        )
        reply = ""
        try:
            reply = Path(out_path).read_text().strip()
        except Exception:  # noqa: BLE001
            pass
        if not reply:
            # fall back to stdout if -o produced nothing
            reply = (proc.stdout or "").strip()
        if not reply:
            raise RuntimeError(f"codex returned empty (rc={proc.returncode}): "
                               f"{(proc.stderr or '')[:200]}")
        return reply
    finally:
        try:
            os.unlink(out_path)
        except Exception:  # noqa: BLE001
            pass


def call_gemini(messages: list, ctx: str) -> str:
    key = ENV.get("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("no GEMINI_API_KEY")
    sys_prompt = SHAY_SYSTEM + (("\n\n# Vault context:\n" + ctx) if ctx else "")
    contents = [{"role": "user" if m["role"] == "user" else "model",
                 "parts": [{"text": m["content"]}]} for m in messages]
    body = {
        "system_instruction": {"parts": [{"text": sys_prompt}]},
        "contents": contents,
        "generationConfig": {"maxOutputTokens": 1024},
    }
    url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
           f"{GEMINI_MODEL}:generateContent?key={key}")
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.loads(r.read())
    return data["candidates"][0]["content"]["parts"][0]["text"].strip()


# Brain registry. Order = default fallback preference ("lean on Claude"):
# Claude direct → Codex CLI → Claude via OpenRouter → Gemini.
BRAINS = [
    {"id": "claude", "label": "Claude (direct)", "fn": call_anthropic},
    {"id": "openrouter", "label": "Claude (OpenRouter)", "fn": call_openrouter},
    {"id": "codex", "label": "Codex CLI", "fn": call_codex_cli},
    {"id": "gemini", "label": "Gemini", "fn": call_gemini},
]


def brain_available(bid: str) -> bool:
    """Credential/binary presence (NOT live quota — runtime fallback handles caps)."""
    if bid == "claude":
        return ENV.get("ANTHROPIC_API_KEY", "").startswith("sk-ant-api")
    if bid == "codex":
        return bool(CODEX_BIN and os.path.exists(CODEX_BIN))
    if bid == "openrouter":
        return bool(ENV.get("OPENROUTER_API_KEY"))
    if bid == "gemini":
        return bool(ENV.get("GEMINI_API_KEY"))
    return False


def do_chat(messages: list, preferred: str = "auto") -> dict:
    last_user = next((m["content"] for m in reversed(messages)
                      if m["role"] == "user"), "")
    ctx = vault_context(last_user)
    # Order brains: if a specific one is requested, try it first, then the rest.
    order = list(BRAINS)
    if preferred and preferred != "auto":
        order.sort(key=lambda b: 0 if b["id"] == preferred else 1)
    errors = []
    for b in order:
        try:
            reply = b["fn"](messages, ctx)
            out = {"reply": reply, "brain": b["label"], "brain_id": b["id"],
                   "used_context": bool(ctx)}
            if errors:
                out["note"] = " | ".join(errors)
            return out
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{b['label']}: {exc}")
    return {"error": "all brains failed: " + " | ".join(errors)}


def slugify(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return (s[:48] or "note")


def do_capture(kind: str, text: str) -> dict:
    INBOX.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    title = text.strip().splitlines()[0][:60] if text.strip() else kind
    fp = INBOX / f"{ts}-{kind}-{slugify(title)}.md"
    front = (f"---\ntype: {kind}\ncaptured: {datetime.now().isoformat()}\n"
             f"source: shay-phone\ntags: [{kind}, inbox]\n---\n\n")
    fp.write_text(front + text.strip() + "\n")
    return {"saved": fp.name, "path": str(fp)}


# ---------------------------------------------------------------------------
# Ask flow — the Claude-Code-style mid-run approval / question round-trip.
# A Shay job calls create_ask() (via ask_shay.py), which the phone surfaces;
# Fritz answers; the job polls get_ask() until answered, then continues.
# ---------------------------------------------------------------------------
def _ask_path(aid: str) -> Path:
    return ASKS / f"{re.sub(r'[^a-zA-Z0-9_-]', '', aid)}.json"


def create_ask(kind: str, question: str, options, context: str = "") -> dict:
    ASKS.mkdir(parents=True, exist_ok=True)
    aid = datetime.now().strftime("%Y%m%d%H%M%S%f")
    rec = {"id": aid, "kind": kind, "question": question,
           "options": options or [], "context": context,
           "status": "pending", "answer": None,
           "created": time.time(), "answered": None}
    _ask_path(aid).write_text(json.dumps(rec))
    return rec


def create_interview(title: str, questions, context: str = "", url: str = "") -> dict:
    """A structured multi-question review session (e.g. 'review the research from X').
    questions: list of {q, options?, type?}. Any job/cron can queue one."""
    ASKS.mkdir(parents=True, exist_ok=True)
    aid = datetime.now().strftime("%Y%m%d%H%M%S%f")
    qs = []
    for q in (questions or []):
        if isinstance(q, str):
            qs.append({"q": q, "options": [], "type": "text", "answer": None})
        else:
            qs.append({"q": q.get("q", ""), "options": q.get("options", []),
                       "type": q.get("type", "text"), "answer": None})
    rec = {"id": aid, "kind": "interview", "title": title or "Interview",
           "context": context, "url": url, "questions": qs,
           "status": "pending", "created": time.time(), "answered": None}
    _ask_path(aid).write_text(json.dumps(rec))
    return rec


def answer_interview(aid: str, answers) -> dict:
    fp = _ask_path(aid)
    if not fp.exists():
        return {"error": "no such interview"}
    rec = json.loads(fp.read_text())
    for i, q in enumerate(rec.get("questions", [])):
        if i < len(answers):
            q["answer"] = answers[i]
    rec["status"] = "answered"
    rec["answered"] = time.time()
    fp.write_text(json.dumps(rec))
    return {"ok": True, "id": aid}


def list_pending_asks() -> list:
    if not ASKS.exists():
        return []
    out = []
    for f in sorted(ASKS.glob("*.json"), key=lambda p: p.stat().st_mtime):
        try:
            rec = json.loads(f.read_text())
        except Exception:  # noqa: BLE001
            continue
        if rec.get("status") == "pending":
            out.append(rec)
    return out


def answer_ask(aid: str, answer: str) -> dict:
    fp = _ask_path(aid)
    if not fp.exists():
        return {"error": "no such ask"}
    rec = json.loads(fp.read_text())
    rec["answer"] = answer
    rec["status"] = "answered"
    rec["answered"] = time.time()
    fp.write_text(json.dumps(rec))
    return {"ok": True, "id": aid}


def get_ask(aid: str) -> dict:
    fp = _ask_path(aid)
    if not fp.exists():
        return {"error": "no such ask"}
    return json.loads(fp.read_text())


# ---------------------------------------------------------------------------
# Jobs — Fritz dispatches a goal from the phone; Shay agents pick it up,
# report progress, and mark it complete. Persistent in jobs.json (JSON array).
# ---------------------------------------------------------------------------

import threading
_jobs_lock = threading.Lock()

def _load_jobs() -> list:
    """Load jobs from disk. Returns a list (newest first by created)."""
    try:
        if JOBS_FILE.exists():
            data = json.loads(JOBS_FILE.read_text())
            if isinstance(data, list):
                return data
    except Exception:  # noqa: BLE001
        pass
    return []


def _save_jobs(jobs: list) -> None:
    """Atomically write jobs list to disk."""
    JOBS_FILE.write_text(json.dumps(jobs, indent=2))


def dispatch_job(goal: str, policy: str = "balanced", priority: int = 1) -> dict:
    """Create a new job entry, append to jobs.json, return it."""
    with _jobs_lock:
        jobs = _load_jobs()
        jid = datetime.now().strftime("%Y%m%d%H%M%S%f")
        job = {
            "id": jid,
            "goal": goal,
            "policy": policy,
            "priority": priority,
            "status": "queued",       # queued | running | completed | failed | cancelled
            "created": time.time(),
            "started": None,
            "completed": None,
            "output": None,
            "progress": [],           # [{message, percent, ts}]
        }
        jobs.insert(0, job)           # newest first
        _save_jobs(jobs)
    return job


def list_jobs(limit: int = 20) -> list:
    """Return up to `limit` jobs, newest first."""
    with _jobs_lock:
        jobs = _load_jobs()
    return jobs[:limit]


def get_job(jid: str) -> dict | None:
    """Return one job by id, or None if not found."""
    with _jobs_lock:
        jobs = _load_jobs()
    for j in jobs:
        if j.get("id") == jid:
            return j
    return None


def job_progress(jid: str, message: str, percent=None) -> dict:
    """Append a progress message to a running job. Agent-side."""
    with _jobs_lock:
        jobs = _load_jobs()
        for j in jobs:
            if j.get("id") == jid:
                if j.get("status") == "queued":
                    j["status"] = "running"
                    j["started"] = time.time()
                entry = {"message": message, "ts": time.time()}
                if percent is not None:
                    entry["percent"] = percent
                j.setdefault("progress", []).append(entry)
                _save_jobs(jobs)
                return {"ok": True, "id": jid}
    return {"error": "no such job"}


def job_complete(jid: str, output: str, status: str = "completed") -> dict:
    """Mark a job done or failed. Agent-side."""
    with _jobs_lock:
        jobs = _load_jobs()
        for j in jobs:
            if j.get("id") == jid:
                j["status"] = status
                j["output"] = output
                j["completed"] = time.time()
                if j.get("started") is None:
                    j["started"] = time.time()
                _save_jobs(jobs)
                return {"ok": True, "id": jid}
    return {"error": "no such job"}


def job_cancel(jid: str) -> dict:
    """Cancel a queued or running job. Phone-side."""
    with _jobs_lock:
        jobs = _load_jobs()
        for j in jobs:
            if j.get("id") == jid:
                if j.get("status") in ("queued", "running"):
                    j["status"] = "cancelled"
                    j["completed"] = time.time()
                    _save_jobs(jobs)
                    return {"ok": True, "id": jid}
                return {"error": f"job is already {j.get('status')}"}
    return {"error": "no such job"}


def do_recent(n: int = 15) -> dict:
    files = sorted(INBOX.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)[:n]
    out = []
    for f in files:
        body = f.read_text(errors="ignore")
        body = re.sub(r"^---.*?---\n", "", body, flags=re.DOTALL).strip()
        out.append({"name": f.name, "preview": body[:160],
                    "ts": int(f.stat().st_mtime)})
    return {"notes": out}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):  # quieter logs; never log query strings w/ token
        pass

    def _send(self, code, body, ctype="application/json"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode()
        elif isinstance(body, str):
            body = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _authed(self) -> bool:
        from urllib.parse import urlparse, parse_qs
        q = parse_qs(urlparse(self.path).query)
        tok = (q.get("k", [None])[0]) or self.headers.get("X-Shay-Token")
        return bool(TOKEN) and tok == TOKEN

    def _serve_static(self):
        from urllib.parse import urlparse
        path = urlparse(self.path).path
        if path == "/":
            path = "/index.html"
        fp = (WEB / path.lstrip("/")).resolve()
        if not str(fp).startswith(str(WEB)) or not fp.is_file():
            return self._send(404, {"error": "not found"})
        ctypes = {".html": "text/html", ".js": "application/javascript",
                  ".json": "application/json", ".webmanifest": "application/manifest+json",
                  ".png": "image/png", ".svg": "image/svg+xml", ".css": "text/css"}
        self._send(200, fp.read_bytes(), ctypes.get(fp.suffix, "application/octet-stream"))

    def do_GET(self):
        from urllib.parse import urlparse
        path = urlparse(self.path).path
        if path.startswith("/api/"):
            if not self._authed():
                return self._send(403, {"error": "bad or missing token"})
            if path == "/api/recent":
                return self._send(200, do_recent())
            if path == "/api/asks":
                return self._send(200, {"asks": list_pending_asks()})
            if path == "/api/ask":
                from urllib.parse import urlparse, parse_qs
                aid = parse_qs(urlparse(self.path).query).get("id", [""])[0]
                return self._send(200, get_ask(aid))
            if path == "/api/brains":
                return self._send(200, {"brains": [
                    {"id": b["id"], "label": b["label"],
                     "available": brain_available(b["id"])} for b in BRAINS]})
            if path == "/api/ping":
                return self._send(200, {"ok": True})
            # Jobs API (GET)
            if path == "/api/arc":
                # Live heartbeat feed for the all-night master-plan arc. Reads the
                # orchestrator's run-state ledger directly (decoupled from the job
                # runner — that's why job-based heartbeats weren't showing here).
                import json as _j
                rs = Path.home() / "famtastic" / "shay-agent-os" / "run-state.json"
                try:
                    data = _j.loads(rs.read_text()) if rs.exists() else {}
                except Exception:
                    data = {}
                return self._send(200, {
                    "phase": data.get("phase"),
                    "events": (data.get("events") or [])[-40:],
                    "checkpoints": data.get("checkpoints", {}),
                })
            if path == "/api/jobs":
                return self._send(200, {"jobs": list_jobs()})
            if path == "/api/job":
                from urllib.parse import urlparse, parse_qs
                jid = parse_qs(urlparse(self.path).query).get("id", [""])[0]
                j = get_job(jid)
                if j is None:
                    return self._send(404, {"error": "no such job"})
                return self._send(200, j)
            return self._send(404, {"error": "no such api"})
        return self._serve_static()

    def do_POST(self):
        from urllib.parse import urlparse
        path = urlparse(self.path).path
        if not self._authed():
            return self._send(403, {"error": "bad or missing token"})
        length = int(self.headers.get("Content-Length", "0"))
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
        except Exception:  # noqa: BLE001
            return self._send(400, {"error": "bad json"})
        if path == "/api/chat":
            msgs = payload.get("messages") or []
            preferred = payload.get("brain", "auto")
            return self._send(200, do_chat(msgs, preferred))
        if path == "/api/capture":
            kind = payload.get("kind", "note")
            text = payload.get("text", "")
            if not text.strip():
                return self._send(400, {"error": "empty"})
            return self._send(200, do_capture(kind, text))
        if path == "/api/ask":  # agent-side: create a pending approval/question
            return self._send(200, create_ask(
                payload.get("kind", "question"),
                payload.get("question", ""),
                payload.get("options") or [],
                payload.get("context", "")))
        if path == "/api/interview":  # agent/cron-side: create a review session
            return self._send(200, create_interview(
                payload.get("title", "Interview"),
                payload.get("questions") or [],
                payload.get("context", ""),
                payload.get("url", "")))
        if path == "/api/answer":  # phone-side: answer single ask OR interview
            if "answers" in payload:
                return self._send(200, answer_interview(
                    payload.get("id", ""), payload.get("answers") or []))
            return self._send(200, answer_ask(payload.get("id", ""),
                                              payload.get("answer", "")))
        # Jobs API (POST)
        if path == "/api/dispatch":
            # Phone-side: Fritz dispatches a new job goal
            goal = (payload.get("goal") or "").strip()
            if not goal:
                return self._send(400, {"error": "goal required"})
            job = dispatch_job(
                goal=goal,
                policy=payload.get("policy", "balanced"),
                priority=int(payload.get("priority", 1)),
            )
            return self._send(200, job)
        if path == "/api/job/progress":
            # Agent-side: append progress message to a running job
            jid = payload.get("id", "")
            message = payload.get("message", "")
            if not jid or not message:
                return self._send(400, {"error": "id and message required"})
            return self._send(200, job_progress(jid, message, payload.get("percent")))
        if path == "/api/job/complete":
            # Agent-side: mark job completed (or failed)
            jid = payload.get("id", "")
            if not jid:
                return self._send(400, {"error": "id required"})
            return self._send(200, job_complete(
                jid,
                output=payload.get("output", ""),
                status=payload.get("status", "completed"),
            ))
        if path == "/api/job/cancel":
            # Phone-side: cancel a queued or running job
            jid = payload.get("id", "")
            if not jid:
                return self._send(400, {"error": "id required"})
            return self._send(200, job_cancel(jid))
        return self._send(404, {"error": "no such api"})


def main():
    if not TOKEN:
        print("[shay-phone] FATAL: no token in .token", file=sys.stderr)
        sys.exit(1)
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"[shay-phone] serving on 0.0.0.0:{PORT} "
          f"(openrouter={'yes' if ENV.get('OPENROUTER_API_KEY') else 'NO'}, "
          f"gemini={'yes' if ENV.get('GEMINI_API_KEY') else 'NO'})")
    srv.serve_forever()


if __name__ == "__main__":
    main()
