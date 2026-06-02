"""Outreach / response / follow-up copy generation.

Template-based and dependency-free so the agents work on the always-available
tier (no vendor brain required). If an LLM is wired in later, swap these
functions — the agents only call draft_*().
"""
import config

SIGNOFF = f"\n\nBest,\n{config.FROM_NAME}\nFAMtastic — web & automation that stands apart\nhttps://fritz-web-studio.netlify.app"


def draft_outreach(lead: dict) -> dict:
    title = lead.get("title", "your project")
    budget = lead.get("budget")
    subject = f"Re: {title[:60]}"
    pain = (
        "I build fast, polished, conversion-focused sites and automations — "
        "results are the proof, not promises."
    )
    budget_line = (
        f"I can deliver what you described in your ${budget} range on a tight timeline."
        if budget
        else "I can scope this to your budget and turn it around fast."
    )
    body = (
        f"Hi,\n\nI saw your post about \"{title[:120]}\". {pain}\n\n"
        f"{budget_line} A typical build ships in 48 hours with a fixed price and no surprises.\n\n"
        "Worth a 10-minute call to see if it's a fit? Reply and I'll send two times that work."
        + SIGNOFF
    )
    return {"subject": subject, "body": body}


def draft_response(inbound: dict) -> dict:
    subject = "Re: " + inbound.get("subject", "your message")
    cls = inbound.get("classification", "routine")
    if cls == "nibs":
        opener = "Thank you for reaching out about the NIBS opportunity — I'd genuinely welcome it."
    elif cls == "ama":
        opener = "Thanks for the invite — happy to do an AMA/session."
    elif cls == "urgent":
        opener = "Got it — flagging this as urgent and replying right away."
    else:
        opener = "Thanks for your message — I've received it and I'm on it."
    body = (
        f"Hi,\n\n{opener}\n\n"
        "Tell me a bit more about scope and timing and I'll come back with concrete next steps "
        "(usually within a few hours)." + SIGNOFF
    )
    return {"subject": subject, "body": body}


def draft_followup(outreach_rec: dict, n: int = 1) -> dict:
    subject = outreach_rec.get("subject", "Following up")
    if not subject.lower().startswith(("re:", "fwd:")):
        subject = "Following up: " + subject
    body = (
        "Hi,\n\nCircling back on my note below — still happy to help and can start quickly. "
        "If now isn't the right time, just let me know and I'll close the loop.\n\n"
        "Either way, no pressure." + SIGNOFF
    )
    return {"subject": subject, "body": body}
