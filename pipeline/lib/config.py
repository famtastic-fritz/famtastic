"""Shared config + paths for pipeline agents.

All agents read these so the whole system points at one set of files and one
Command Center. Nothing here requires external credentials to import — agents
must be runnable (in dry-run) on a fresh machine.
"""
import os
from pathlib import Path

REPO = Path.home() / "famtastic"
PIPELINE = REPO / "pipeline"
DATA = PIPELINE / "data"
HEARTBEATS = DATA / "heartbeats"

# Command Center (single source of truth)
COMMAND_CENTER = os.environ.get("COMMAND_CENTER_URL", "http://localhost:7878")
KILL_SWITCH_FILE = REPO / "command-center" / "data" / "kill-switch.json"

# Data stores (append-only JSONL)
LEADS = DATA / "leads.jsonl"
OUTREACH = DATA / "outreach.jsonl"
FOLLOWUPS = DATA / "followups.jsonl"
INBOUND = DATA / "inbound.jsonl"
RESPONSES = DATA / "responses.jsonl"

# Sending guardrails. Agents NEVER send to a real person unless armed AND
# the kill switch is disengaged. Default state is draft/dry-run.
SEND_ARMED = os.environ.get("SEND_ARMED", "false").lower() == "true"

# Transport. Resend HTTP API is the FAMtastic house standard (matches
# agent-command + platform/capabilities/email). SMTP is the fallback.
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")

FROM_EMAIL = os.environ.get("FROM_EMAIL", SMTP_USER or "no-reply@famtastic.local")
FROM_NAME = os.environ.get("FROM_NAME", "Fitzgerald Medine")
# Where replies land — mirrors Shay's pattern (domain-verified from, gmail reply-to).
REPLY_TO = os.environ.get("REPLY_TO", "")

# Lead scoring threshold for autonomous outreach.
OUTREACH_MIN_SCORE = int(os.environ.get("OUTREACH_MIN_SCORE", "70"))
# Hours to wait before a follow-up.
FOLLOWUP_AFTER_HOURS = int(os.environ.get("FOLLOWUP_AFTER_HOURS", "48"))

for _d in (DATA, HEARTBEATS):
    _d.mkdir(parents=True, exist_ok=True)
