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
import threading
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
WEBPUSH_KEYS = Path.home() / ".shay" / "webpush.json"   # VAPID keypair (private)
WEBPUSH_SUBS = Path.home() / ".shay" / "webpush-subs.json"  # device subscriptions

# Shared command-center event spine. Every phone action (start a job, answer an
# ask, dispatch) appends here so the web dashboard's live feed reflects it — one
# truth, every window. Schema matches shay-agent-os/api/event_log.py exactly so a
# line maps 1:1 to a dashboard ActivityEvent. Override with $SHAY_EVENTS_LOG.
EVENTS_LOG = Path(os.environ.get(
    "SHAY_EVENTS_LOG", str(Path.home() / ".shay" / "events.jsonl")
)).expanduser()


def emit_event(etype: str, message: str, severity: str = "info",
               agent_id: str | None = None, **meta) -> None:
    """Append one event to the shared spine. Best-effort: never raise into a
    request path. source='phone' so the feed shows where the action originated."""
    import uuid as _uuid
    valid_types = {"heartbeat", "task_start", "task_complete", "task_fail",
                   "log", "error", "command", "system"}
    event = {
        "id": "evt-" + _uuid.uuid4().hex[:12],
        "timestamp": datetime.now().astimezone().isoformat(),
        "type": etype if etype in valid_types else "log",
        "agentId": agent_id,
        "message": message,
        "severity": severity if severity in {"info", "warn", "error", "success"} else "info",
        "source": "phone",
    }
    if meta:
        event["meta"] = meta
    try:
        EVENTS_LOG.parent.mkdir(parents=True, exist_ok=True)
        line = json.dumps(event, ensure_ascii=False) + "\n"
        with open(EVENTS_LOG, "a", encoding="utf-8") as fh:
            try:
                import fcntl
                fcntl.flock(fh.fileno(), fcntl.LOCK_EX)
                try:
                    fh.write(line)
                    fh.flush()
                finally:
                    fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
            except ImportError:
                fh.write(line)
                fh.flush()
    except Exception:  # noqa: BLE001 — emitting must never break a request
        pass


def read_feed(limit: int = 50) -> list:
    """Read the most-recent events from the shared spine, newest first. This is
    the read side of the same file emit_event() writes and the web dashboard
    streams — so the phone's feed and the dashboard's feed are identical."""
    if not EVENTS_LOG.exists():
        return []
    try:
        with open(EVENTS_LOG, "r", encoding="utf-8") as fh:
            lines = fh.readlines()
    except Exception:  # noqa: BLE001
        return []
    out = []
    for raw in lines[-limit:]:
        raw = raw.strip()
        if not raw:
            continue
        try:
            out.append(json.loads(raw))
        except json.JSONDecodeError:
            continue
    out.reverse()
    return out


def _ensure_vapid_keys() -> None:
    """Generate VAPID keypair and write to WEBPUSH_KEYS if it doesn't exist."""
    if WEBPUSH_KEYS.exists():
        return
    try:
        from py_vapid import Vapid
        from cryptography.hazmat.primitives.serialization import (
            Encoding, PublicFormat, PrivateFormat, NoEncryption
        )
        import base64
        v = Vapid()
        v.generate_keys()
        private_pem = v.private_key.private_bytes(
            Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()
        ).decode()
        public_raw = v.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
        public_b64 = base64.urlsafe_b64encode(public_raw).rstrip(b"=").decode()
        WEBPUSH_KEYS.parent.mkdir(parents=True, exist_ok=True)
        WEBPUSH_KEYS.write_text(json.dumps({
            "private_key": private_pem,
            "public_key": public_b64,
            "subject": "mailto:fritz.medine@gmail.com",
        }, indent=2))
        print("[shay-phone] VAPID keys generated → ~/.shay/webpush.json", file=sys.stderr)
    except Exception as exc:
        print(f"[shay-phone] VAPID key generation failed: {exc}", file=sys.stderr)


def _wp_keys():
    try:
        return json.loads(WEBPUSH_KEYS.read_text())
    except Exception:
        return {}


def _wp_subs():
    try:
        return json.loads(WEBPUSH_SUBS.read_text())
    except Exception:
        return []


def wp_subscribe(sub: dict) -> dict:
    subs = _wp_subs()
    ep = sub.get("endpoint")
    if ep and not any(s.get("endpoint") == ep for s in subs):
        subs.append(sub)
        WEBPUSH_SUBS.write_text(json.dumps(subs, indent=2))
    return {"ok": True, "count": len(subs)}


def wp_push(title: str, body: str, url: str = "/") -> dict:
    """Send a Web Push to every subscribed device. Prunes dead (410/404) subs."""
    keys = _wp_keys()
    subs = _wp_subs()
    if not keys or not subs:
        return {"ok": False, "reason": "no keys or no subscriptions", "count": len(subs)}
    try:
        from pywebpush import webpush, WebPushException
    except Exception as e:
        return {"ok": False, "reason": f"pywebpush missing: {e}"}
    payload = json.dumps({"title": title, "body": body, "url": url})
    live, sent = [], 0
    for s in subs:
        try:
            webpush(subscription_info=s, data=payload,
                    vapid_private_key=keys["private_key"],
                    vapid_claims={"sub": keys.get("subject", "mailto:fritz@example.com")})
            live.append(s); sent += 1
        except WebPushException as ex:
            code = getattr(getattr(ex, "response", None), "status_code", 0)
            if code in (404, 410):
                continue  # dead subscription — drop it
            live.append(s)  # transient — keep
        except Exception:
            live.append(s)
    if len(live) != len(subs):
        WEBPUSH_SUBS.write_text(json.dumps(live, indent=2))
    return {"ok": True, "sent": sent, "subs": len(live)}
PORT = int(os.environ.get("SHAY_PHONE_PORT", "8787"))

# ---------------------------------------------------------------------------
# Local Whisper STT — faster-whisper, base.en model, lazy-loaded on first use.
# Model is loaded ONCE at module level (first /api/stt call) to avoid slowing boot.
# ---------------------------------------------------------------------------
_whisper_model = None
_whisper_lock = None


def _get_whisper():
    """Return the WhisperModel, lazy-initialising on first call."""
    global _whisper_model, _whisper_lock
    import threading
    if _whisper_lock is None:
        _whisper_lock = threading.Lock()
    with _whisper_lock:
        if _whisper_model is None:
            try:
                from faster_whisper import WhisperModel
                _whisper_model = WhisperModel("base.en", device="cpu", compute_type="int8")
                print("[shay-phone] Whisper base.en loaded", file=sys.stderr)
            except Exception as exc:
                print(f"[shay-phone] Whisper load failed: {exc}", file=sys.stderr)
                raise
    return _whisper_model


def do_stt(audio_bytes: bytes, content_type: str) -> dict:
    """Transcribe audio bytes using local Whisper. Returns {text} or {text, error}."""
    # Determine file extension from content type
    ext_map = {
        "audio/webm": ".webm",
        "audio/ogg": ".ogg",
        "audio/wav": ".wav",
        "audio/wave": ".wav",
        "audio/x-wav": ".wav",
        "audio/mpeg": ".mp3",
        "audio/mp4": ".m4a",
        "audio/aiff": ".aiff",
        "audio/x-aiff": ".aiff",
    }
    ct_base = (content_type or "").split(";")[0].strip().lower()
    ext = ext_map.get(ct_base, ".webm")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tf:
            tf.write(audio_bytes)
            tmp_path = tf.name

        model = _get_whisper()
        segments, _info = model.transcribe(tmp_path, beam_size=5, language="en")
        text = " ".join(seg.text.strip() for seg in segments).strip()
        return {"text": text}
    except Exception as exc:
        return {"text": "", "error": str(exc)}
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

OPENROUTER_MODEL = os.environ.get("SHAY_PHONE_MODEL", "anthropic/claude-sonnet-4.6")
GEMINI_MODEL = "gemini-2.5-flash"
# GLM Coding Plan (Z.ai) — Shay's flat-rate primary brain. OpenAI-compatible.
# Endpoint is the CODING plan path (NOT /api/openai/v1, which is the metered
# general API). Key = GLM_API_KEY in ~/.shay/.env. Flagship model = glm-5.1.
GLM_BASE = os.environ.get("GLM_BASE_URL", "https://api.z.ai/api/coding/paas/v4")
GLM_MODEL = os.environ.get("SHAY_PHONE_GLM_MODEL", "glm-5.1")

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


def call_glm(messages: list, ctx: str) -> str:
    """GLM-5.1 via the Z.ai Coding Plan (flat-rate). OpenAI-compatible chat API —
    this is Shay's real working brain, so the phone talks to the same model."""
    key = ENV.get("GLM_API_KEY")
    if not key:
        raise RuntimeError("no GLM_API_KEY in ~/.shay/.env")
    sys_prompt = SHAY_SYSTEM
    if ctx:
        sys_prompt += "\n\n# Relevant notes from Fritz's vault:\n" + ctx
    body = {
        "model": GLM_MODEL,
        "messages": [{"role": "system", "content": sys_prompt}] + messages,
        "max_tokens": 1024,
    }
    req = urllib.request.Request(
        GLM_BASE.rstrip("/") + "/chat/completions",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.loads(r.read())
    return data["choices"][0]["message"]["content"].strip()


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


# Brain registry. Order = default fallback preference. GLM-5.1 (flat-rate, Shay's
# real brain) is primary so the phone uses the same working model — never metered,
# never free-capped. Claude/Codex/Gemini stay as fallbacks for when they're funded.
BRAINS = [
    {"id": "glm", "label": "GLM-5.1 (flat)", "fn": call_glm},
    {"id": "claude", "label": "Claude (direct)", "fn": call_anthropic},
    {"id": "openrouter", "label": "Claude (OpenRouter)", "fn": call_openrouter},
    {"id": "codex", "label": "Codex CLI", "fn": call_codex_cli},
    {"id": "gemini", "label": "Gemini", "fn": call_gemini},
]


def brain_available(bid: str) -> bool:
    """Credential/binary presence (NOT live quota — runtime fallback handles caps)."""
    if bid == "glm":
        return bool(ENV.get("GLM_API_KEY"))
    if bid == "claude":
        return ENV.get("ANTHROPIC_API_KEY", "").startswith("sk-ant-api")
    if bid == "codex":
        return bool(CODEX_BIN and os.path.exists(CODEX_BIN))
    if bid == "openrouter":
        return bool(ENV.get("OPENROUTER_API_KEY"))
    if bid == "gemini":
        return bool(ENV.get("GEMINI_API_KEY"))
    return False


PHONE_SESSION_LOG = INBOX / "phone-session.md"


def _vault_append_exchange(user_msg: str, assistant_reply: str) -> None:
    """Append a timestamped exchange tail to the phone-session vault log.
    Single-writer sequential append — called only from do_chat after success."""
    try:
        INBOX.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        reply_tail = assistant_reply[-500:] if len(assistant_reply) > 500 else assistant_reply
        block = (
            f"\n## {ts}\n"
            f"**User:** {user_msg.strip()}\n\n"
            f"**Shay:** {reply_tail.strip()}\n"
        )
        with open(PHONE_SESSION_LOG, "a", encoding="utf-8") as fh:
            fh.write(block)
    except Exception as exc:  # noqa: BLE001
        print(f"[shay-phone] vault append failed: {exc}", file=sys.stderr)


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
            # W2.3 — append exchange to vault for cross-session continuity
            _vault_append_exchange(last_user, reply)
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
    emit_event("command", f"Shay is asking: {question[:120]}", severity="warn",
               agent_id="shay", ask_id=aid, kind=kind)
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
    emit_event("command", f"Fritz completed interview: {rec.get('title', aid)}",
               severity="success", agent_id="fritz", ask_id=aid)
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
    emit_event("command", f"Fritz answered an ask: {str(answer)[:120]}",
               severity="success", agent_id="fritz", ask_id=aid)
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
    emit_event("task_start", f"Job dispatched from phone: {goal[:120]}",
               severity="info", agent_id="fritz", job_id=jid, policy=policy)
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
                emit_event("log", f"Job progress: {message[:120]}", severity="info",
                           agent_id="shay", job_id=jid, percent=percent)
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
                ok = status == "completed"
                emit_event("task_complete" if ok else "task_fail",
                           f"Job {status}: {j.get('goal', jid)[:120]}",
                           severity="success" if ok else "error",
                           agent_id="shay", job_id=jid)
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
                    emit_event("system", f"Job cancelled from phone: {j.get('goal', jid)[:120]}",
                               severity="warn", agent_id="fritz", job_id=jid)
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


AGENTS_REGISTRY = Path.home() / "famtastic" / "command-center" / "data" / "agents-registry.json"
REVENUE_LEDGER = Path.home() / "famtastic" / "command-center" / "data" / "revenue.jsonl"


def _brief_agents() -> list:
    """Section 1: agent health from agents-registry.json + launchctl list."""
    registry = []
    try:
        data = json.loads(AGENTS_REGISTRY.read_text())
        registry = data.get("agents", [])
    except Exception as e:
        return [{"error": f"registry read failed: {e}"}]

    # Parse launchctl list for famtastic|shay lines
    lctl_by_label: dict = {}
    try:
        result = subprocess.run(
            ["launchctl", "list"],
            capture_output=True, text=True, timeout=10
        )
        for line in result.stdout.splitlines():
            parts = line.split("\t")
            if len(parts) >= 3 and re.search(r"famtastic|shay", parts[2], re.IGNORECASE):
                # columns: PID  LastExitStatus  Label
                label = parts[2].strip()
                pid = parts[0].strip()
                exit_code = parts[1].strip()
                lctl_by_label[label] = {
                    "pid": None if pid == "-" else pid,
                    "exit_code": exit_code,
                }
    except Exception:
        pass  # launchctl unavailable — status from registry only

    out = []
    for agent in registry:
        name = agent.get("name", "unknown")
        label_match = agent.get("match", "")
        # Try to find a matching launchd entry by label containing name
        status = "unknown"
        pid = None
        for lbl, info in lctl_by_label.items():
            if name in lbl or label_match in lbl:
                pid = info["pid"]
                status = "running" if pid else (
                    "stopped" if info["exit_code"] == "0" else f"exit:{info['exit_code']}"
                )
                break
        out.append({"name": name, "label": agent.get("label", name), "status": status, "pid": pid})

    # Also include any launchd shay/famtastic services not in the registry
    registry_names = {a.get("name", "") for a in registry}
    for lbl, info in lctl_by_label.items():
        short = lbl.split(".")[-1]
        if not any(n in lbl for n in registry_names):
            pid = info["pid"]
            status = "running" if pid else (
                "stopped" if info["exit_code"] == "0" else f"exit:{info['exit_code']}"
            )
            out.append({"name": lbl, "label": lbl, "status": status, "pid": pid})

    return out


def _brief_revenue_24h() -> dict:
    """Section 2: revenue in the last 24h from revenue.jsonl."""
    cutoff = time.time() - 86400
    total = 0.0
    count = 0
    try:
        if REVENUE_LEDGER.exists():
            for line in REVENUE_LEDGER.read_text().splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    ts = entry.get("timestamp") or entry.get("ts") or entry.get("at")
                    if ts is None:
                        continue
                    # Support ISO strings and unix timestamps
                    if isinstance(ts, str):
                        import datetime as _dt
                        try:
                            ts = _dt.datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
                        except Exception:
                            continue
                    if float(ts) >= cutoff:
                        total += float(entry.get("amount", 0))
                        count += 1
                except Exception:
                    continue
    except Exception as e:
        return {"error": f"revenue read failed: {e}"}
    return {"total": round(total, 2), "count": count}


def _brief_open_jobs() -> list:
    """Section 3: open/active jobs from the job queue."""
    active_statuses = {"active", "pending", "running", "queued"}
    try:
        jobs = list_jobs(limit=100)
        out = []
        for j in jobs:
            if j.get("status") in active_statuses:
                progress = j.get("progress") or []
                progress_tail = progress[-1]["message"] if progress else None
                out.append({
                    "id": j["id"],
                    "goal": j.get("goal", ""),
                    "status": j.get("status", ""),
                    "progress_tail": progress_tail,
                })
        return out
    except Exception as e:
        return [{"error": f"jobs read failed: {e}"}]


IDEAS_DIR = Path.home() / "famtastic" / "ideas" / "capture"
DATA_CENTER_LEDGERS = Path.home() / "famtastic" / "data-center" / "ledgers"
SITES_DIR = Path.home() / "famtastic" / "sites"
SHAY_CONFIG = Path.home() / ".shay" / "config.yaml"
SHAY_ACTIVE_SITE = Path.home() / ".shay" / "active-site.txt"


def _brief_open_asks() -> dict:
    """W4.1 section: pending asks count + titles."""
    try:
        asks = list_pending_asks()
        return {
            "count": len(asks),
            "titles": [a.get("question", "")[:80] for a in asks[:5]],
        }
    except Exception as e:
        return {"skipped": f"asks read failed: {e}"}


def _brief_ideas() -> dict:
    """W4.1 section: top few ideas from ~/famtastic/ideas/capture/."""
    try:
        if not IDEAS_DIR.exists():
            return {"skipped": "ideas dir not found"}
        entries = []
        for d in sorted(IDEAS_DIR.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
            if not d.is_dir():
                continue
            # Try manifest.json first, then idea.md
            mf = d / "manifest.json"
            idea_md = d / "idea.md"
            title = None
            state = None
            if mf.exists():
                try:
                    m = json.loads(mf.read_text())
                    title = m.get("idea") or m.get("tag") or d.name
                    state = m.get("state")
                except Exception:
                    pass
            if title is None and idea_md.exists():
                try:
                    first_line = idea_md.read_text(errors="ignore").strip().splitlines()[0]
                    title = re.sub(r"^#\s*", "", first_line)[:80]
                except Exception:
                    title = d.name
            if title:
                entry = {"title": title}
                if state:
                    entry["state"] = state
                entries.append(entry)
            if len(entries) >= 5:
                break
        return {"count": len(list(IDEAS_DIR.iterdir())), "top": entries}
    except Exception as e:
        return {"skipped": f"ideas read failed: {e}"}


def _brief_datacenter_digest() -> dict:
    """W4.1 section: rows per ledger in the last 86400s. Pure Python, no subprocess."""
    try:
        if not DATA_CENTER_LEDGERS.exists():
            return {"skipped": "ledgers dir not found"}
        cutoff = time.time() - 86400
        result = {}
        for ledger_path in sorted(DATA_CENTER_LEDGERS.glob("*.jsonl")):
            count = 0
            try:
                for raw_line in ledger_path.read_text(errors="ignore").splitlines():
                    raw_line = raw_line.strip()
                    if not raw_line:
                        continue
                    try:
                        row = json.loads(raw_line)
                    except Exception:
                        continue
                    ts = row.get("ts") or row.get("timestamp") or row.get("at")
                    if ts is None:
                        continue
                    if isinstance(ts, str):
                        try:
                            import datetime as _dt
                            ts = _dt.datetime.fromisoformat(
                                ts.replace("Z", "+00:00")).timestamp()
                        except Exception:
                            continue
                    if float(ts) >= cutoff:
                        count += 1
            except Exception:
                continue
            result[ledger_path.stem] = count
        return result if result else {"skipped": "no ledger rows in last 24h"}
    except Exception as e:
        return {"skipped": f"ledger read failed: {e}"}


def _brief_promoted_intel() -> dict:
    """W4.1 section: pending promoted intel findings for the active site."""
    try:
        # Determine active site tag: active-site.txt > config.yaml active_site key
        tag = None
        if SHAY_ACTIVE_SITE.exists():
            tag = SHAY_ACTIVE_SITE.read_text().strip() or None
        if not tag and SHAY_CONFIG.exists():
            for line in SHAY_CONFIG.read_text().splitlines():
                m = re.match(r"^\s*active[_-]site\s*:\s*(.+)", line, re.IGNORECASE)
                if m:
                    tag = m.group(1).strip().strip('"').strip("'")
                    break
        if not tag:
            return {"skipped": "no active site tag found"}
        promo_path = SITES_DIR / tag / "intelligence-promotions.json"
        if not promo_path.exists():
            return {"skipped": f"no promotions file for {tag}"}
        promos = json.loads(promo_path.read_text())
        pending = [
            {"title": p.get("title", ""), "severity": p.get("severity", ""),
             "category": p.get("category", "")}
            for p in promos
            if isinstance(p, dict) and p.get("status") != "dismissed"
        ][:5]
        return {"site": tag, "count": len(pending), "findings": pending}
    except Exception as e:
        return {"skipped": f"intel read failed: {e}"}


def assemble_daily_brief() -> dict:
    """Assemble the daily brief. Each section is isolated — an error in one
    section does not prevent the others from being returned."""
    brief = {}

    try:
        brief["agents"] = _brief_agents()
    except Exception as e:
        brief["agents"] = {"error": str(e)}

    try:
        brief["revenue_24h"] = _brief_revenue_24h()
    except Exception as e:
        brief["revenue_24h"] = {"error": str(e)}

    try:
        brief["open_jobs"] = _brief_open_jobs()
    except Exception as e:
        brief["open_jobs"] = {"error": str(e)}

    # W4.1 — four new sections, each silently skipped on any failure
    try:
        brief["open_asks"] = _brief_open_asks()
    except Exception as e:
        brief["open_asks"] = {"skipped": str(e)}

    try:
        brief["ideas"] = _brief_ideas()
    except Exception as e:
        brief["ideas"] = {"skipped": str(e)}

    try:
        brief["datacenter_digest"] = _brief_datacenter_digest()
    except Exception as e:
        brief["datacenter_digest"] = {"skipped": str(e)}

    try:
        brief["promoted_intel"] = _brief_promoted_intel()
    except Exception as e:
        brief["promoted_intel"] = {"skipped": str(e)}

    brief["generated_at"] = time.time()
    return brief


# ---------------------------------------------------------------------------
# Research Gate — W3.2
# POST /api/research/gate  →  {job_id, ask_id}  (non-blocking)
# Background thread picks up active research jobs every ~5s and runs them.
# ---------------------------------------------------------------------------

DATA_CENTER = Path.home() / "famtastic" / "data-center"
RESEARCH_CAP_FILE = Path.home() / ".shay" / "research-jobs-today.json"
RESEARCH_CAP_DAILY = 3  # max Gemini fan-out calls per day


def _research_cap_ok() -> bool:
    """Return True if under daily cap; increment counter if so."""
    today = datetime.now().strftime("%Y-%m-%d")
    try:
        data = json.loads(RESEARCH_CAP_FILE.read_text()) if RESEARCH_CAP_FILE.exists() else {}
    except Exception:
        data = {}
    if data.get("date") != today:
        data = {"date": today, "count": 0}
    if data["count"] >= RESEARCH_CAP_DAILY:
        return False
    data["count"] += 1
    RESEARCH_CAP_FILE.parent.mkdir(parents=True, exist_ok=True)
    RESEARCH_CAP_FILE.write_text(json.dumps(data))
    return True


def _research_today_count() -> int:
    today = datetime.now().strftime("%Y-%m-%d")
    try:
        data = json.loads(RESEARCH_CAP_FILE.read_text()) if RESEARCH_CAP_FILE.exists() else {}
        return data.get("count", 0) if data.get("date") == today else 0
    except Exception:
        return 0


def dispatch_research_job(topic: str) -> dict:
    """Create a research job with kind='research' and topic stored in goal."""
    with _jobs_lock:
        jobs = _load_jobs()
        jid = datetime.now().strftime("%Y%m%d%H%M%S%f")
        job = {
            "id": jid,
            "goal": topic,
            "kind": "research",
            "policy": "balanced",
            "priority": 1,
            "status": "pending",   # pending → active (on approve) | cancelled (on reject)
            "created": time.time(),
            "started": None,
            "completed": None,
            "output": None,
            "progress": [],
        }
        jobs.insert(0, job)
        _save_jobs(jobs)
    return job


def _set_job_status(jid: str, status: str) -> None:
    with _jobs_lock:
        jobs = _load_jobs()
        for j in jobs:
            if j.get("id") == jid:
                j["status"] = status
                if status == "cancelled":
                    j["completed"] = time.time()
                _save_jobs(jobs)
                return


def do_research_gate(topic: str) -> dict:
    """Non-blocking: generate scope summary, create job + ask, return IDs."""
    # Cheap Gemini call for the scope summary
    scope = ""
    try:
        summary_msg = [{"role": "user", "content":
            f"In 2 sentences, summarize what a research brief on '{topic}' would cover."}]
        scope = call_gemini(summary_msg, "")
    except Exception as exc:
        scope = f"(scope summary unavailable: {exc})"

    job = dispatch_research_job(topic)
    jid = job["id"]

    question = (
        f"Research request: \"{topic}\"\n\n"
        f"Scope: {scope}\n\n"
        f"Estimated cost: ~$0.05–0.20 for a thorough search"
    )
    ask = create_ask(
        "research_scope",
        question,
        options=["Approve", "Reject"],
        context=json.dumps({"job_id": jid, "topic": topic}),
    )
    return {"job_id": jid, "ask_id": ask["id"]}


def _run_single_research_job(job: dict) -> None:
    """Execute one research job in the background thread."""
    jid = job["id"]
    topic = job.get("goal", "")

    try:
        # Mark running
        _set_job_status(jid, "running")
        job_progress(jid, "Starting research fan-out…", 10)

        # Daily cap check
        if not _research_cap_ok():
            count = _research_today_count()
            create_ask(
                "research_cap",
                f"Research cap reached ({count}/{RESEARCH_CAP_DAILY} today) for topic: \"{topic}\". Raise cap?",
                options=["Skip for now"],
                context=json.dumps({"job_id": jid, "topic": topic}),
            )
            _set_job_status(jid, "cancelled")
            job_complete(jid, "Cancelled: daily research cap reached.", status="cancelled")
            return

        # Fan-out: 3 Gemini calls on sub-angles
        angles = [
            f"What are the main use cases and benefits of: {topic}? Keep it concise.",
            f"What are the key challenges, limitations, or trade-offs with: {topic}?",
            f"What tools, products, or resources are most relevant to: {topic}?",
        ]
        fan_results = []
        for i, angle in enumerate(angles):
            job_progress(jid, f"Researching angle {i+1}/3…", 20 + i * 20)
            try:
                result = call_gemini([{"role": "user", "content": angle}], "")
                fan_results.append(f"### Angle {i+1}\n{result}")
            except Exception as exc:
                fan_results.append(f"### Angle {i+1}\n(error: {exc})")

        job_progress(jid, "Synthesizing report…", 80)

        # Synthesis with Anthropic (Sonnet-class)
        synthesis_prompt = (
            f"You are a research analyst. Synthesize the following research notes on \"{topic}\" "
            f"into a concise, cited markdown report. Include a summary, key findings, and recommendations.\n\n"
            + "\n\n".join(fan_results)
        )
        try:
            report_md = call_anthropic(
                [{"role": "user", "content": synthesis_prompt}], ""
            )
        except Exception:
            # Fall back to Gemini for synthesis if Anthropic unavailable
            report_md = call_gemini(
                [{"role": "user", "content": synthesis_prompt}], ""
            )

        # Write report to data-center
        report_dir = DATA_CENTER / "jobs" / f"research-{jid}"
        report_dir.mkdir(parents=True, exist_ok=True)
        report_path = report_dir / "report.md"
        report_path.write_text(
            f"# Research Report: {topic}\n\n"
            f"**Generated:** {datetime.now().isoformat()}\n\n"
            f"{report_md}\n"
        )

        # Append to ledger
        ledger_path = DATA_CENTER / "ledgers" / "research-jobs.jsonl"
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        with open(ledger_path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps({
                "ts": time.time(),
                "job_id": jid,
                "topic": topic,
                "status": "complete",
                "report_path": str(report_path),
            }) + "\n")

        # Mark complete and notify
        job_complete(jid, str(report_path), status="completed")
        create_ask(
            "research_done",
            f"Research ready: {topic}",
            options=["View"],
            context=str(report_path),
        )
        job_progress(jid, "Report written ✓", 100)

    except Exception as exc:
        print(f"[shay-phone] research job {jid} failed: {exc}", file=sys.stderr)
        job_complete(jid, f"Error: {exc}", status="failed")


def _research_worker_loop() -> None:
    """Background daemon thread: scan for active research jobs every 5s."""
    while True:
        try:
            with _jobs_lock:
                jobs = _load_jobs()
            for job in jobs:
                if job.get("status") == "active" and job.get("kind") == "research":
                    # Claim it immediately (set to running) before releasing lock
                    _set_job_status(job["id"], "running")
                    # Run in a sub-thread so the watcher loop keeps scanning
                    t = threading.Thread(
                        target=_run_single_research_job,
                        args=(dict(job),),
                        daemon=True,
                    )
                    t.start()
        except Exception as exc:
            print(f"[shay-phone] research worker error: {exc}", file=sys.stderr)
        time.sleep(5)


def _handle_research_scope_answer(ask: dict, answer: str) -> None:
    """Hook called from answer_ask when the ask kind is 'research_scope'."""
    try:
        ctx = json.loads(ask.get("context", "{}"))
    except Exception:
        ctx = {}
    jid = ctx.get("job_id")
    if not jid:
        return
    if answer == "Approve":
        _set_job_status(jid, "active")
    else:
        _set_job_status(jid, "cancelled")
        job_complete(jid, "Rejected by Fritz.", status="cancelled")


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
            if path == "/api/vapid":
                return self._send(200, {"publicKey": _wp_keys().get("public_key", "")})
            if path == "/api/vapid-public":
                # W4.2: auth-gated endpoint returning the VAPID public key for frontend subscribe
                return self._send(200, {"publicKey": _wp_keys().get("public_key", "")})
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
            if path == "/api/daily-brief":
                brief = assemble_daily_brief()
                # Build a 1-line plain-English summary for the Ask card + push notification
                agent_list = brief.get("agents", [])
                running_count = sum(1 for a in agent_list
                                    if isinstance(a, dict) and a.get("status") == "running")
                total_agents = len(agent_list) if isinstance(agent_list, list) else 0
                rev = brief.get("revenue_24h", {})
                rev_total = rev.get("total", 0) if isinstance(rev, dict) else 0
                jobs = brief.get("open_jobs", [])
                open_jobs_count = len(jobs) if isinstance(jobs, list) else 0
                asks_info = brief.get("open_asks", {})
                asks_count = asks_info.get("count", 0) if isinstance(asks_info, dict) else 0
                summary = (
                    f"{running_count}/{total_agents} agents running, "
                    f"${rev_total:.2f} revenue last 24h, "
                    f"{open_jobs_count} open job(s), "
                    f"{asks_count} ask(s) pending."
                )
                try:
                    create_ask("daily_brief", summary, [], context=json.dumps(brief))
                except Exception:
                    pass  # ask creation failure must not break the brief response
                # W4.2: push notification for daily brief
                try:
                    wp_push("☀️ Shay Daily Brief", summary, "/")
                except Exception:
                    pass  # push failure must not break the brief response
                return self._send(200, brief)
            if path == "/api/jobs":
                return self._send(200, {"jobs": list_jobs()})
            if path == "/api/job":
                from urllib.parse import urlparse, parse_qs
                jid = parse_qs(urlparse(self.path).query).get("id", [""])[0]
                j = get_job(jid)
                if j is None:
                    return self._send(404, {"error": "no such job"})
                return self._send(200, j)
            if path == "/api/feed":
                # The unified activity feed from the shared spine — the SAME
                # events the web dashboard shows. This is what makes the phone a
                # window into the one system (every surface, one truth).
                from urllib.parse import urlparse, parse_qs
                lim = parse_qs(urlparse(self.path).query).get("limit", ["50"])[0]
                try:
                    lim = max(1, min(int(lim), 500))
                except ValueError:
                    lim = 50
                return self._send(200, {"events": read_feed(lim)})
            return self._send(404, {"error": "no such api"})
        return self._serve_static()

    def do_POST(self):
        from urllib.parse import urlparse
        path = urlparse(self.path).path
        if not self._authed():
            return self._send(403, {"error": "bad or missing token"})
        length = int(self.headers.get("Content-Length", "0"))

        # /api/stt — raw audio body (not JSON), handled before JSON parse
        if path == "/api/stt":
            audio_bytes = self.rfile.read(length) if length > 0 else b""
            if not audio_bytes:
                return self._send(200, {"text": "", "error": "empty audio"})
            ct = self.headers.get("Content-Type", "audio/webm")
            return self._send(200, do_stt(audio_bytes, ct))

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
        if path == "/api/subscribe":  # phone-side: register for Web Push
            sub = payload.get("subscription") or payload
            return self._send(200, wp_subscribe(sub))
        if path == "/api/push":  # agent-side: send a Web Push to all devices
            return self._send(200, wp_push(
                payload.get("title", "Shay"), payload.get("body", ""),
                payload.get("url", "/")))
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
            aid = payload.get("id", "")
            answer = payload.get("answer", "")
            # Peek at the ask before answering so we can hook on kind
            existing_ask = get_ask(aid)
            result = answer_ask(aid, answer)
            if isinstance(existing_ask, dict) and existing_ask.get("kind") == "research_scope":
                try:
                    _handle_research_scope_answer(existing_ask, answer)
                except Exception as exc:
                    print(f"[shay-phone] research_scope hook error: {exc}", file=sys.stderr)
            return self._send(200, result)
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
        if path == "/api/research/gate":
            topic = (payload.get("topic") or "").strip()
            if not topic:
                return self._send(400, {"error": "topic required"})
            return self._send(200, do_research_gate(topic))
        return self._send(404, {"error": "no such api"})


def main():
    if not TOKEN:
        print("[shay-phone] FATAL: no token in .token", file=sys.stderr)
        sys.exit(1)
    # Ensure VAPID keys exist (generates on first run)
    _ensure_vapid_keys()
    # Start background research worker
    worker = threading.Thread(target=_research_worker_loop, daemon=True)
    worker.start()
    print("[shay-phone] research worker started", file=sys.stderr)
    ThreadingHTTPServer.allow_reuse_address = True
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"[shay-phone] serving on 0.0.0.0:{PORT} "
          f"(glm={'yes' if ENV.get('GLM_API_KEY') else 'NO'}, "
          f"openrouter={'yes' if ENV.get('OPENROUTER_API_KEY') else 'NO'}, "
          f"gemini={'yes' if ENV.get('GEMINI_API_KEY') else 'NO'})")
    srv.serve_forever()


if __name__ == "__main__":
    main()
