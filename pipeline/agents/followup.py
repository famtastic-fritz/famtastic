#!/usr/bin/env python3
"""Follow-up Agent — autonomous, polite persistence.

Scans outreach that was sent (or drafted) more than FOLLOWUP_AFTER_HOURS ago,
whose lead has not advanced past 'contacted' (no reply / not won / not dead),
and sends up to 2 follow-ups spaced by the same interval. Gated by the sender.
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

LOOP_SECONDS = 300
MAX_FOLLOWUPS = 2


def followups_sent_for(lead_id, fups):
    return [f for f in fups if f.get("lead_id") == lead_id]


def cycle():
    beat("followup", "looping", "scanning for due follow-ups")
    now = time.time()
    interval = config.FOLLOWUP_AFTER_HOURS * 3600
    leads_by_id = {l["id"]: l for l in store.leads() if l.get("id")}
    fups = store.followups()
    sent = 0
    for out in store.outreach():
        lead = leads_by_id.get(out.get("lead_id"))
        if not lead:
            continue
        if lead.get("status") not in ("contacted",):
            continue  # replied/won/dead -> stop chasing
        prior = followups_sent_for(lead["id"], fups)
        if len(prior) >= MAX_FOLLOWUPS:
            continue
        last_touch = max(
            [out.get("created_at", 0)] + [f.get("created_at", 0) for f in prior]
        )
        if now - last_touch < interval:
            continue
        draft = copywriter.draft_followup(out, n=len(prior) + 1)
        result = sender.send_email(out.get("to") or "(no address)", draft["subject"], draft["body"])
        store.add_followup({
            "id": f"fup_{uuid.uuid4().hex[:12]}",
            "lead_id": lead["id"],
            "outreach_id": out.get("id"),
            "n": len(prior) + 1,
            "to": out.get("to"),
            "subject": draft["subject"],
            "body": draft["body"],
            "status": result["status"],
            "sent": result["sent"],
        })
        sent += 1
        beat("followup", "working", f"followup #{len(prior)+1} -> {result['status']}")
    beat("followup", "idle", f"cycle done, {sent} follow-ups")
    return sent


def run():
    beat("followup", "starting", "followup agent up")
    while True:
        try:
            cycle()
        except Exception as e:
            beat("followup", "error", str(e)[:120])
        for _ in range(LOOP_SECONDS // 5):
            time.sleep(5)
            beat("followup", "idle", "waiting for next sweep")


if __name__ == "__main__":
    run()
