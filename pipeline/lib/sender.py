"""Gated outbound sender — the single choke point for anything that contacts a
real person. Every agent routes sends through here.

Two hard gates, checked on EVERY send:
  1. Kill switch — if command-center/data/kill-switch.json is engaged, refuse.
  2. Armed + credentials — only send for real if SEND_ARMED=true AND SMTP creds
     are present. Otherwise the message is recorded as a draft (dry-run) and
     NOT transmitted.

This is what makes "fully autonomous" safe: the system drafts and queues
autonomously, but a real send requires Fritz to have explicitly armed it with
real credentials, and the kill switch can halt everything instantly.
"""
import json
import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr

import config


def kill_switch_engaged() -> bool:
    try:
        with open(config.KILL_SWITCH_FILE) as f:
            return bool(json.load(f).get("engaged"))
    except Exception:
        return False  # no file = not engaged


def can_send_for_real() -> bool:
    return bool(
        config.SEND_ARMED
        and config.SMTP_HOST
        and config.SMTP_USER
        and config.SMTP_PASS
    )


def send_email(to: str, subject: str, body: str) -> dict:
    """Returns a status dict; never raises. status is one of:
    blocked_kill_switch | draft_dry_run | sent | failed
    """
    if kill_switch_engaged():
        return {"status": "blocked_kill_switch", "sent": False}

    if not can_send_for_real():
        return {
            "status": "draft_dry_run",
            "sent": False,
            "reason": "not armed or missing SMTP creds — message drafted, not transmitted",
        }

    try:
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = formataddr((config.FROM_NAME, config.FROM_EMAIL))
        msg["To"] = to
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=20) as s:
            s.starttls()
            s.login(config.SMTP_USER, config.SMTP_PASS)
            s.sendmail(config.FROM_EMAIL, [to], msg.as_string())
        return {"status": "sent", "sent": True}
    except Exception as e:
        return {"status": "failed", "sent": False, "error": str(e)}
