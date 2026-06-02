"""Append-only JSONL stores shared by all pipeline agents.

Every agent reads and writes through here so the Command Center sees one
coherent picture of leads, outreach, follow-ups, and inbound/responses.
"""
import json
import time
import urllib.request
from pathlib import Path

import config


def _read(path: Path):
    items = []
    if not path.exists():
        return items
    seen = set()
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            oid = obj.get("id")
            if oid and oid in seen:
                # keep latest write of a given id (status updates append)
                items = [x for x in items if x.get("id") != oid]
            if oid:
                seen.add(oid)
            items.append(obj)
    return items


def _append(path: Path, obj: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a") as f:
        f.write(json.dumps(obj) + "\n")
    return obj


# ---- leads ----
def leads():
    return _read(config.LEADS)


def add_lead(lead: dict):
    lead.setdefault("status", "new")
    lead.setdefault("found_at", time.time())
    return _append(config.LEADS, lead)


def update_lead(lead_id: str, **changes):
    existing = {l["id"]: l for l in leads() if l.get("id")}.get(lead_id)
    if not existing:
        return None
    existing.update(changes)
    existing["updated_at"] = time.time()
    return _append(config.LEADS, existing)


# ---- outreach / followups / inbound / responses ----
def outreach():
    return _read(config.OUTREACH)


def add_outreach(rec: dict):
    rec.setdefault("created_at", time.time())
    return _append(config.OUTREACH, rec)


def followups():
    return _read(config.FOLLOWUPS)


def add_followup(rec: dict):
    rec.setdefault("created_at", time.time())
    return _append(config.FOLLOWUPS, rec)


def inbound():
    return _read(config.INBOUND)


def add_inbound(rec: dict):
    rec.setdefault("received_at", time.time())
    rec.setdefault("handled", False)
    return _append(config.INBOUND, rec)


def responses():
    return _read(config.RESPONSES)


def add_response(rec: dict):
    rec.setdefault("created_at", time.time())
    return _append(config.RESPONSES, rec)


# ---- income (post real won deals to the Command Center ledger) ----
def record_income(amount: float, customer: str, description: str):
    """Best-effort POST to the Command Center manual-income endpoint.
    Returns True on success. Agents should only call this on a CONFIRMED deal.
    """
    try:
        payload = json.dumps(
            {"amount": amount, "customer": customer, "description": description}
        ).encode()
        req = urllib.request.Request(
            f"{config.COMMAND_CENTER}/api/income/manual",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status == 200
    except Exception:
        return False
