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

WOLF = Path.home() / "famtastic" / ".wolf"
VAULT = Path.home() / "famtastic" / "obsidian" / "Shay-Memory"
MIRROR = VAULT / "lessons-mirror"

REPO_DOCS = {
    "FAMTASTIC-STATE.md": {
        "title": "FAMTASTIC-STATE",
        "type": "note",
        "permalink": "shay-memory/repo-docs/famtastic-state",
    },
    "CHANGELOG.md": {
        "title": "CHANGELOG",
        "type": "note",
        "permalink": "shay-memory/repo-docs/changelog",
    },
    "SITE-LEARNINGS.md": {
        "title": "SITE-LEARNINGS",
        "type": "note",
        "permalink": "shay-memory/repo-docs/site-learnings",
    },
    "famtastic-dna.md": {
        "title": "famtastic-dna",
        "type": "note",
        "permalink": "shay-memory/repo-docs/famtastic-dna",
    },
}


def write_if_changed(dst: Path, content: str) -> bool:
    dst.parent.mkdir(parents=True, exist_ok=True)
    current = dst.read_text(errors="ignore") if dst.exists() else None
    if current == content:
        return False
    dst.write_text(content)
    return True


def frontmatter_block(**fields: str) -> str:
    lines = ["---"]
    for key, value in fields.items():
        lines.append(f"{key}: {value}")
    lines.append("---")
    return "\n".join(lines)


def sync_cerebrum() -> str:
    src = WOLF / "cerebrum.md"
    if not src.exists():
        return "cerebrum.md not found"
    dst = MIRROR / "cerebrum-mirror.md"
    body = src.read_text(errors="ignore")
    header = frontmatter_block(
        title="Cerebrum (mirrored for Shay)",
        source=".wolf/cerebrum.md",
        tags="[cerebrum, lessons, do-not-repeat, mirror]",
        permalink="shay-memory/lessons-mirror/cerebrum-mirror",
    )
    changed = write_if_changed(dst, f"{header}\n\n{body}")
    status = "updated" if changed else "unchanged"
    return f"cerebrum → {dst.name} ({len(body)} chars, {status})"


def sync_buglog(recent: int = 30) -> str:
    src = WOLF / "buglog.json"
    if not src.exists():
        return "buglog.json not found"
    d = json.loads(src.read_text())
    bugs = d.get("bugs", d) if isinstance(d, dict) else d
    sel = bugs[-recent:]
    header = frontmatter_block(
        title="Buglog Lessons (mirrored for Shay)",
        source=".wolf/buglog.json",
        tags="[buglog, lessons, mirror]",
        permalink="shay-memory/lessons-mirror/buglog-mirror",
    )
    lines = [header, "", f"# Buglog — last {len(sel)} lessons (mirrored into Shay's vault)", ""]
    for b in sel:
        lines += [
            f"## #{b.get('id')} ({b.get('timestamp', '')})",
            f"**Issue:** {b.get('error_message', '')}",
            f"**Root cause:** {b.get('root_cause', '')}",
            f"**Fix:** {b.get('fix', '')}",
            f"**Tags:** {b.get('tags', [])}",
            "",
        ]
    dst = MIRROR / "buglog-mirror.md"
    changed = write_if_changed(dst, "\n".join(lines).rstrip() + "\n")
    status = "updated" if changed else "unchanged"
    return f"buglog → {dst.name} ({len(sel)} entries, {status})"


def sync_repo_docs() -> str:
    """GAP 3: repo-root knowledge files SOUL.md tells Shay to prioritize but she
    can't reach. Mirror them into the vault so basic-memory indexes them."""
    out = VAULT / "repo-docs"
    out.mkdir(parents=True, exist_ok=True)
    done = []
    for name, meta in REPO_DOCS.items():
        src = Path.home() / "famtastic" / name
        if src.exists():
            header = frontmatter_block(**meta)
            content = (
                f"{header}\n\n"
                f"<!-- mirrored from ~/famtastic/{name} -->\n\n"
                + src.read_text(errors="ignore")
            )
            changed = write_if_changed(out / name, content)
            done.append(f"{name} ({'updated' if changed else 'unchanged'})")
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
