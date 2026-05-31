#!/usr/bin/env python3
"""
notify.py — monitoring spine for the all-night master-plan arc.

Three channels so Fritz can monitor / be pinged / sign off from anywhere:
  1. Phone (shay-phone :8787)  — heartbeats stream to a long-lived job
     (/api/job/progress); sign-off gates block on /api/ask until he answers.
  2. macOS banner (osascript)  — local desktop notification.
  3. run-state.json ledger     — durable cursor so the arc resumes after a
     restart / cap-pause instead of redoing work.

Import from the orchestrator and the ralph loop:
    from notify import heartbeat, signoff, start_arc, RUN_STATE
"""
from __future__ import annotations
import json, subprocess, time, urllib.request
from pathlib import Path

PHONE = "http://127.0.0.1:8787"
_TOKEN_FILE = Path.home() / "famtastic" / "shay-phone" / ".token"
TOKEN = _TOKEN_FILE.read_text().strip() if _TOKEN_FILE.exists() else ""
RUN_STATE = Path.home() / "famtastic" / "shay-agent-os" / "run-state.json"


def _post(path: str, body: dict, timeout: float = 15.0) -> dict:
    try:
        req = urllib.request.Request(
            f"{PHONE}{path}?k={TOKEN}", data=json.dumps(body).encode(),
            headers={"Content-Type": "application/json", "X-Shay-Token": TOKEN})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except Exception as exc:
        return {"error": str(exc)}


def _get(path: str, timeout: float = 15.0) -> dict:
    try:
        req = urllib.request.Request(f"{PHONE}{path}", headers={"X-Shay-Token": TOKEN})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except Exception as exc:
        return {"error": str(exc)}


def _tg_creds():
    """Read TELEGRAM_BOT_TOKEN + TELEGRAM_HOME_CHANNEL from ~/.shay/.env."""
    env = {}
    f = Path.home() / ".shay" / ".env"
    if not f.exists():
        return None, None
    for line in f.read_text().splitlines():
        line = line.strip()
        if line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env.get("TELEGRAM_BOT_TOKEN"), env.get("TELEGRAM_HOME_CHANNEL")


def telegram_push(text: str) -> None:
    """Real lock-screen push via the existing Shay Telegram bot. Never raises."""
    token, chat = _tg_creds()
    if not token or not chat:
        return
    try:
        body = json.dumps({"chat_id": chat, "text": text,
                           "disable_notification": False}).encode()
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=body, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=10)
    except Exception:
        pass


def _banner(title: str, msg: str) -> None:
    try:
        safe_t = title.replace('"', "'")[:60]
        safe_m = msg.replace('"', "'")[:180]
        subprocess.run(
            ["osascript", "-e", f'display notification "{safe_m}" with title "{safe_t}"'],
            capture_output=True, timeout=5)
    except Exception:
        pass


def _load_state() -> dict:
    if RUN_STATE.exists():
        try:
            return json.loads(RUN_STATE.read_text())
        except Exception:
            pass
    return {"arc": "master-plan-next-arc", "job_id": None, "phase": None,
            "events": [], "checkpoints": {}}


import os as _os
def _save_state(s: dict) -> None:
    # Atomic write so a mid-write crash can't truncate the ledger and erase job_id.
    tmp = RUN_STATE.with_suffix(".tmp")
    tmp.write_text(json.dumps(s, indent=2))
    _os.replace(tmp, RUN_STATE)


def start_arc(title: str = "All-night master-plan arc") -> str:
    """Create the long-lived phone job heartbeats stream to. Idempotent-ish:
    reuses the job_id already in run-state if present."""
    s = _load_state()
    if s.get("job_id"):
        return s["job_id"]
    res = _post("/api/dispatch", {"goal": title, "policy": "balanced", "priority": 1})
    jid = res.get("id") or res.get("job", {}).get("id")
    s["job_id"] = jid
    _save_state(s)
    _banner("Shay arc started", title)
    return jid


def heartbeat(phase: str, msg: str, pct=None) -> None:
    """Emit a progress beat to all three channels. Never raises."""
    ts = time.strftime("%H:%M:%S")
    line = f"[{ts}] {phase}: {msg}"
    print(line, flush=True)
    s = _load_state()
    s["phase"] = phase
    s["events"] = (s.get("events", []) + [{"t": ts, "phase": phase, "msg": msg, "pct": pct}])[-200:]
    _save_state(s)
    if s.get("job_id"):
        _post("/api/job/progress", {"id": s["job_id"], "message": line, "percent": pct})
    _banner(f"Shay · {phase}", msg)
    # Real lock-screen push for the events that matter (not every micro-beat).
    if any(k in msg for k in ("DONE", "BLOCKED", "SIGN-OFF", "FAILED", "complete",
                              "arc", "start")) or phase == "SIGN-OFF":
        telegram_push(f"🤖 Shay · {phase}\n{msg}")
        # Web Push to the installed Android PWA (native lock-screen notification).
        _post("/api/push", {"title": f"Shay · {phase}", "body": msg[:180], "url": "/"})


def checkpoint(name: str, data: dict) -> None:
    """Record a durable checkpoint (resume cursor)."""
    s = _load_state()
    s.setdefault("checkpoints", {})[name] = {"at": time.strftime("%Y-%m-%d %H:%M:%S"), **data}
    _save_state(s)
    heartbeat(name, f"checkpoint saved: {json.dumps(data)[:120]}")


def signoff(question: str, options=None, context: str = "", timeout: float = 3600) -> str:
    """Block until Fritz answers on his phone. Returns answer, or 'TIMEOUT'.
    Use at GO/NO-GO gates."""
    options = options or ["Proceed", "Hold"]
    heartbeat("SIGN-OFF", f"awaiting your answer: {question}")
    rec = _post("/api/ask", {"kind": "approval", "question": question,
                             "options": options, "context": context})
    aid = rec.get("id")
    if not aid:
        # FAIL-CLOSED: a GO/NO-GO gate must NOT self-authorize when the phone is
        # unreachable. Return TIMEOUT so the caller holds rather than proceeds.
        heartbeat("SIGN-OFF", "phone unreachable — cannot create ask; treating as HOLD")
        return "TIMEOUT"
    deadline = time.time() + timeout
    while time.time() < deadline:
        cur = _get(f"/api/ask?id={aid}")
        ans = cur.get("answer")
        if ans:
            heartbeat("SIGN-OFF", f"answered: {ans}")
            return ans
        time.sleep(3.0)
    heartbeat("SIGN-OFF", "TIMEOUT — no answer")
    return "TIMEOUT"


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        jid = start_arc("Shay all-night arc — smoke test")
        print("arc job:", jid)
        heartbeat("TEST", "monitoring spine online — you should see this on your phone + a Mac banner")
        print("run-state:", RUN_STATE.read_text()[:300])
