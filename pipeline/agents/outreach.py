#!/usr/bin/env python3
"""Outreach Agent — turns scored leads into personalized outreach.

Autonomous loop:
  1. read leads with status 'new' and score >= OUTREACH_MIN_SCORE
  2. draft personalized copy
  3. send (gated: dry-run unless armed; kill switch halts)
  4. record outreach + advance the lead to 'contacted'

Heartbeats every step so the Command Center can see it working vs. wedged.
"""
import sys
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path.home() / "famtastic" / "pipeline" / "lib"))
import config  # noqa: E402
import store  # noqa: E402
import sender  # noqa: E402
import copywriter  # noqa: E402
from heartbeat import beat  # noqa: E402

LOOP_SECONDS = 120


def cycle():
    beat("outreach", "looping", "scanning leads")
    contacted = 0
    for lead in store.leads():
        if lead.get("status") != "new":
            continue
        if (lead.get("score") or 0) < config.OUTREACH_MIN_SCORE:
            continue
        to = lead.get("contact") or lead.get("email")
        draft = copywriter.draft_outreach(lead)
        result = sender.send_email(to or "(no address on lead)", draft["subject"], draft["body"])
        store.add_outreach({
            "id": f"out_{uuid.uuid4().hex[:12]}",
            "lead_id": lead.get("id"),
            "channel": "email",
            "to": to,
            "subject": draft["subject"],
            "body": draft["body"],
            "status": result["status"],
            "sent": result["sent"],
        })
        store.update_lead(lead.get("id"), status="contacted", contacted_at=time.time())
        contacted += 1
        beat("outreach", "working", f"{result['status']} -> {lead.get('title','?')[:40]}")
    beat("outreach", "idle", f"cycle done, {contacted} contacted")
    return contacted


def run():
    beat("outreach", "starting", "outreach agent up")
    while True:
        try:
            cycle()
        except Exception as e:  # never die silently
            beat("outreach", "error", str(e)[:120])
        for _ in range(LOOP_SECONDS // 5):
            time.sleep(5)
            beat("outreach", "idle", "waiting for next cycle")


if __name__ == "__main__":
    run()
