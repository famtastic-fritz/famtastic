"""Gated outbound sender — the single choke point for anything that contacts a
real person. Every agent routes sends through here.

Two hard gates, checked on EVERY send:
  1. Kill switch — if command-center/data/kill-switch.json is engaged, refuse.
  2. Armed + credentials — only send for real if SEND_ARMED=true AND a transport
     is configured. Otherwise the message is recorded as a draft (dry-run) and
     NOT transmitted.

Transport precedence (matches the FAMtastic house standard, see
agent-command + platform/capabilities/email): Resend HTTP API first if
RESEND_API_KEY is set, else SMTP. Resend needs a domain-verified FROM_EMAIL.

This is what makes "fully autonomous" safe: the system drafts and queues
autonomously, but a real send requires Fritz to have explicitly armed it with
real credentials, and the kill switch can halt everything instantly.
"""
import json
import smtplib
import urllib.request
from email.mime.text import MIMEText
from email.utils import formataddr

import config


def kill_switch_engaged() -> bool:
    try:
        with open(config.KILL_SWITCH_FILE) as f:
            return bool(json.load(f).get("engaged"))
    except Exception:
        return False  # no file = not engaged


def _transport() -> str:
    if config.RESEND_API_KEY:
        return "resend"
    if config.SMTP_HOST and config.SMTP_USER and config.SMTP_PASS:
        return "smtp"
    return ""


def can_send_for_real() -> bool:
    return bool(config.SEND_ARMED and _transport())


def _send_resend(to, subject, body):
    payload = {
        "from": formataddr((config.FROM_NAME, config.FROM_EMAIL)),
        "to": [to],
        "subject": subject,
        "text": body,
    }
    if config.REPLY_TO:
        payload["reply_to"] = config.REPLY_TO
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {config.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        if r.status in (200, 201):
            return {"status": "sent", "sent": True, "via": "resend"}
        return {"status": "failed", "sent": False, "via": "resend", "http": r.status}


def _send_smtp(to, subject, body):
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = formataddr((config.FROM_NAME, config.FROM_EMAIL))
    msg["To"] = to
    if config.REPLY_TO:
        msg["Reply-To"] = config.REPLY_TO
    with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=20) as s:
        s.starttls()
        s.login(config.SMTP_USER, config.SMTP_PASS)
        s.sendmail(config.FROM_EMAIL, [to], msg.as_string())
    return {"status": "sent", "sent": True, "via": "smtp"}


def send_email(to: str, subject: str, body: str) -> dict:
    """Returns a status dict; never raises. status is one of:
    blocked_kill_switch | draft_dry_run | sent | failed
    """
    if kill_switch_engaged():
        return {"status": "blocked_kill_switch", "sent": False}

    transport = _transport()
    if not (config.SEND_ARMED and transport):
        return {
            "status": "draft_dry_run",
            "sent": False,
            "reason": "not armed or no transport configured — message drafted, not transmitted",
        }

    try:
        return _send_resend(to, subject, body) if transport == "resend" else _send_smtp(to, subject, body)
    except Exception as e:
        return {"status": "failed", "sent": False, "via": transport, "error": str(e)}
