#!/usr/bin/env python3
"""
ask_shay — the bridge that lets ANY Shay job/agent ask Fritz a question or
request approval, and BLOCK until he answers from his phone.

This is the Claude-Code-style mid-run round-trip:
    from ask_shay import ask, approve
    if approve("Deploy the site to production?"):
        ...
    choice = ask("Which brand direction?", ["Bold", "Classic", "Playful"])

Under the hood it POSTs to the local Shay-phone proxy (/api/ask), then polls
(/api/ask?id=) until the phone answers (/api/answer) or it times out.

CLI:  python3 ask_shay.py "Approve deploy?" --options Yes No --timeout 600
"""
from __future__ import annotations

import json
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = "http://127.0.0.1:8787"
TOKEN = (ROOT / ".token").read_text().strip() if (ROOT / ".token").exists() else ""


def _post(path: str, body: dict) -> dict:
    req = urllib.request.Request(
        f"{BASE}{path}?k={TOKEN}", data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "X-Shay-Token": TOKEN})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def _get(path: str) -> dict:
    req = urllib.request.Request(f"{BASE}{path}",
                                 headers={"X-Shay-Token": TOKEN})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def ask(question: str, options=None, kind: str = "question",
        context: str = "", timeout: float = 1800, poll: float = 3.0):
    """Post a question to the phone and block until answered (or timeout).
    Returns the answer string, or None on timeout."""
    rec = _post("/api/ask", {"kind": kind, "question": question,
                             "options": options or [], "context": context})
    aid = rec.get("id")
    if not aid:
        raise RuntimeError(f"could not create ask: {rec}")
    print(f"[ask_shay] waiting for Fritz to answer on his phone: {question}",
          file=sys.stderr)
    deadline = time.time() + timeout
    while time.time() < deadline:
        cur = _get(f"/api/ask?id={aid}")
        if cur.get("status") == "answered":
            return cur.get("answer")
        time.sleep(poll)
    return None


def queue_interview(title: str, questions, context: str = "", url: str = "") -> str:
    """Fire-and-forget: queue a structured review session for Fritz's phone and
    return its id immediately (for cron jobs that don't block, e.g.
    'interview Fritz on the research from X')."""
    rec = _post("/api/interview", {"title": title, "questions": questions,
                                   "context": context, "url": url})
    return rec.get("id")


def interview(title: str, questions, context: str = "", url: str = "",
              timeout: float = 86400, poll: float = 4.0):
    """Queue a review session and BLOCK until Fritz completes it on his phone.
    Returns a list of answers aligned to questions, or None on timeout.
    `questions` is a list of strings or {q, options, type} dicts."""
    aid = queue_interview(title, questions, context, url)
    if not aid:
        raise RuntimeError("could not create interview")
    print(f"[ask_shay] interview queued for Fritz's phone: {title}", file=sys.stderr)
    deadline = time.time() + timeout
    while time.time() < deadline:
        cur = _get(f"/api/ask?id={aid}")
        if cur.get("status") == "answered":
            return [q.get("answer") for q in cur.get("questions", [])]
        time.sleep(poll)
    return None


def update_job(job_id: str, message: str, percent=None) -> dict:
    """Report progress on a running job so it shows up on the phone.

    Automatically transitions a queued job to 'running' on first call.
    Silently swallows errors — never block the agent on a reporting call.

    Usage from any Shay job::

        from ask_shay import update_job
        update_job(job_id, "Fetching research sources…", percent=20)
    """
    try:
        body: dict = {"id": job_id, "message": message}
        if percent is not None:
            body["percent"] = percent
        return _post("/api/job/progress", body)
    except Exception as exc:  # noqa: BLE001
        print(f"[ask_shay] update_job warning: {exc}", file=sys.stderr)
        return {}


def complete_job(job_id: str, output: str, status: str = "completed") -> dict:
    """Mark a dispatched job as done (or failed) and write its final output.

    Call this at the end of any job that was dispatched via /api/dispatch::

        from ask_shay import complete_job
        complete_job(job_id, output="Done. Generated 3 files.")

    Pass status='failed' if the job errored out.
    Silently swallows errors — never block the agent on a reporting call.
    """
    try:
        return _post("/api/job/complete", {"id": job_id, "output": output, "status": status})
    except Exception as exc:  # noqa: BLE001
        print(f"[ask_shay] complete_job warning: {exc}", file=sys.stderr)
        return {}


def approve(question: str, context: str = "", timeout: float = 1800) -> bool:
    """Yes/No approval gate. Returns True only on an explicit 'Approve'/'Yes'."""
    ans = ask(question, options=["Approve", "Deny"], kind="approval",
              context=context, timeout=timeout)
    return (ans or "").strip().lower() in ("approve", "yes", "ok", "y")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("question")
    p.add_argument("--options", nargs="*", default=[])
    p.add_argument("--kind", default="question")
    p.add_argument("--timeout", type=float, default=600)
    a = p.parse_args()
    out = ask(a.question, a.options, a.kind, timeout=a.timeout)
    print(json.dumps({"answer": out}))
