#!/usr/bin/env python3
"""
sync_lessons_to_shay.py — Durable bridge so Shay's BRAIN can read every lesson.

Problem this fixes: lessons were written to Claude Code's memory (.wolf/cerebrum.md,
.wolf/buglog.json) and to obsidian/Shay-Memory/learnings/, but Shay's gateway chat
brain reads NONE of those — only her swarm pipeline reads buglog. Hours of lessons
were effectively invisible to the assistant the user actually talks to.

This script mirrors the .wolf lessons into Shay's vault (which basic-memory +
vault-search index) so Shay can retrieve them, and is idempotent (safe to re-run,
e.g. on a cron or after every build session).

Shay's brain has TWO lesson channels after this:
  1. ~/.shay/memories/MEMORY.md  → injected into the system prompt every session
                                    (durable rules go here, manually/curated)
  2. vault lessons-mirror/        → retrievable via basic-memory/vault-search
                                    (full detail, auto-synced here)

Run:  python3 sync_lessons_to_shay.py
"""
import json
from pathlib import Path
from datetime import datetime

WOLF = Path.home() / "famtastic" / ".wolf"
VAULT = Path.home() / "famtastic" / "obsidian" / "Shay-Memory"
MIRROR = VAULT / "lessons-mirror"


def sync_cerebrum() -> str:
    src = WOLF / "cerebrum.md"
    if not src.exists():
        return "cerebrum.md not found"
    dst = MIRROR / "cerebrum-mirror.md"
    MIRROR.mkdir(parents=True, exist_ok=True)
    body = src.read_text(errors="ignore")
    header = (f"---\ntitle: Cerebrum (mirrored for Shay)\n"
              f"synced: {datetime.now().isoformat()}\n"
              f"source: .wolf/cerebrum.md\ntags: [cerebrum, lessons, do-not-repeat, mirror]\n---\n\n")
    dst.write_text(header + body)
    return f"cerebrum → {dst.name} ({len(body)} chars)"


def sync_buglog(recent: int = 30) -> str:
    src = WOLF / "buglog.json"
    if not src.exists():
        return "buglog.json not found"
    d = json.loads(src.read_text())
    bugs = d.get("bugs", d) if isinstance(d, dict) else d
    sel = bugs[-recent:]
    lines = [f"---\ntitle: Buglog Lessons (mirrored for Shay)\n"
             f"synced: {datetime.now().isoformat()}\nsource: .wolf/buglog.json\n"
             f"tags: [buglog, lessons, mirror]\n---\n",
             f"# Buglog — last {len(sel)} lessons (mirrored into Shay's vault)\n"]
    for b in sel:
        lines += [f"## #{b.get('id')} ({b.get('timestamp','')})",
                  f"**Issue:** {b.get('error_message','')}",
                  f"**Root cause:** {b.get('root_cause','')}",
                  f"**Fix:** {b.get('fix','')}",
                  f"**Tags:** {b.get('tags',[])}", ""]
    dst = MIRROR / "buglog-mirror.md"
    MIRROR.mkdir(parents=True, exist_ok=True)
    dst.write_text("\n".join(lines))
    return f"buglog → {dst.name} ({len(sel)} entries)"


REPO_DOCS = [
    "FAMTASTIC-STATE.md", "CHANGELOG.md", "SITE-LEARNINGS.md", "famtastic-dna.md",
]


def sync_repo_docs() -> str:
    """GAP 3: repo-root knowledge files SOUL.md tells Shay to prioritize but she
    can't reach. Mirror them into the vault so basic-memory indexes them."""
    out = VAULT / "repo-docs"
    out.mkdir(parents=True, exist_ok=True)
    done = []
    for name in REPO_DOCS:
        src = Path.home() / "famtastic" / name
        if src.exists():
            (out / name).write_text(
                f"<!-- mirrored {datetime.now().isoformat()} from ~/famtastic/{name} -->\n\n"
                + src.read_text(errors="ignore"))
            done.append(name)
    return f"repo-docs → {done}"


def main():
    print("=== sync_lessons_to_shay (closes audit GAPs 1-4) ===")
    print(" ", sync_cerebrum())     # GAP 1
    print(" ", sync_buglog())       # GAP 2 + 4
    print(" ", sync_repo_docs())    # GAP 3
    print("Done. All repo/.wolf knowledge mirrored into Shay's indexed vault.")
    print("Durable rules also live in ~/.shay/memories/MEMORY.md (system-prompt channel).")
    print("Re-run after any build session, or wire to cron/launchd to prevent drift.")


if __name__ == "__main__":
    main()
