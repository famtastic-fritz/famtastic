#!/usr/bin/env python3
"""Responder Agent — autonomous customer response.

Reads inbound messages (from data/inbound.jsonl — fed by an IMAP poller, a
webhook, or manual injection), classifies them, drafts a reply, and sends it
(gated). Hot leads (NIBS/urgent) are also flagged. Marks inbound handled.

Inbound record shape (written by whatever ingests mail):
  {id, from, subject, body, classification?, received_at}
"""
import sys
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path.home() / "famtastic" / "pipeline" / "lib"))
import store  # noqa: E402
import sender  # noqa: E402
import copywriter  # noqa: E402
from heartbeat import beat  # noqa: E402

LOOP_SECONDS = 60

URGENT = ("urgent", "asap", "immediately", "emergency", "critical")
NIBS = ("nibs", "conference", "speaker", "keynote")
AMA = ("ama", "ask me anything", "session", "guest")


def classify(rec):
    text = f"{rec.get('subject','')} {rec.get('body','')}".lower()
    if any(k in text for k in URGENT):
        return "urgent"
    if any(k in text for k in NIBS):
        return "nibs"
    if any(k in text for k in AMA):
        return "ama"
    return "routine"


def cycle():
    beat("responder", "looping", "scanning inbound")
    handled = 0
    for rec in store.inbound():
        if rec.get("handled"):
            continue
        rec["classification"] = rec.get("classification") or classify(rec)
        draft = copywriter.draft_response(rec)
        result = sender.send_email(rec.get("from", "(unknown)"), draft["subject"], draft["body"])
        store.add_response({
            "id": f"resp_{uuid.uuid4().hex[:12]}",
            "inbound_id": rec.get("id"),
            "to": rec.get("from"),
            "classification": rec["classification"],
            "subject": draft["subject"],
            "body": draft["body"],
            "status": result["status"],
            "sent": result["sent"],
        })
        # mark handled (append updated copy; store keeps latest by id)
        rec["handled"] = True
        store.add_inbound(rec)
        handled += 1
        beat("responder", "working", f"{rec['classification']} -> {result['status']}")
    beat("responder", "idle", f"cycle done, {handled} handled")
    return handled


def run():
    beat("responder", "starting", "responder agent up")
    while True:
        try:
            cycle()
        except Exception as e:
            beat("responder", "error", str(e)[:120])
        for _ in range(LOOP_SECONDS // 5):
            time.sleep(5)
            beat("responder", "idle", "waiting for inbound")


if __name__ == "__main__":
    run()
