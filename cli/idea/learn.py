#!/usr/bin/env python3
"""learn — Extract lessons learned from completed or archived ideas.

Usage:
    python3 cli/learn.py <tag> [--note "<lesson>"]
    python3 cli/learn.py --list

Records insights from prototypes, validations, and deployments.
Feeds into SITE-LEARNINGS.md pattern.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

HUB_ROOT = Path(__file__).resolve().parent.parent.parent; IDEAS_DIR = HUB_ROOT / "ideas"
LEARNINGS_FILE = Path.home() / "SITE-LEARNINGS.md"


def load_learnings():
    """Load existing learnings if file exists."""
    if LEARNINGS_FILE.exists():
        return LEARNINGS_FILE.read_text()
    return ""


def add_learning(tag, note):
    """Append a learning entry."""
    ts = datetime.now(timezone.utc).isoformat()
    entry = f"\n### {tag} -- {ts[:10]}\n\n{note}\n"

    current = load_learnings()
    if "## Learnings Log" not in current:
        current += "\n\n## Learnings Log\n"

    current += entry
    LEARNINGS_FILE.write_text(current)
    print(f"[learn] Added learning for '{tag}' to {LEARNINGS_FILE}")


def list_learnings():
    """Show all recorded learnings."""
    content = load_learnings()
    if not content or "## Learnings Log" not in content:
        print("[learn] No learnings recorded yet.")
        print('[learn] Add one: python3 cli/learn.py <tag> --note "what you learned"')
        return

    idx = content.index("## Learnings Log")
    print(content[idx:])


def find_project_notes(tag):
    """Find any notes/manifests related to a tag across all stages."""
    notes = []
    for stage in ["capture", "incubate", "blueprint", "prototype", "validate", "exports", "vault"]:
        stage_dir = IDEAS_DIR / stage
        if not stage_dir.exists():
            continue
        for d in stage_dir.iterdir():
            if d.is_dir() and tag in d.name:
                manifest = d / "manifest.json"
                if manifest.exists():
                    notes.append({"stage": stage, "dir": d, "manifest": json.loads(manifest.read_text())})
    return notes


def main():
    if "--list" in sys.argv or len(sys.argv) < 2:
        list_learnings()
        return

    tag = sys.argv[1]

    if "--note" in sys.argv:
        idx = sys.argv.index("--note")
        if idx + 1 < len(sys.argv):
            note = sys.argv[idx + 1]
            add_learning(tag, note)
            return
        else:
            print('[learn] Missing note text. Usage: --note "your lesson"')
            sys.exit(1)

    # Show project history
    notes = find_project_notes(tag)
    if notes:
        print(f"\n[learn] Project history for '{tag}':\n")
        for n in notes:
            print(f"  Stage: {n['stage']}")
            print(f"  Dir:   {n['dir']}")
            m = n["manifest"]
            for k, v in m.items():
                if k not in ("tag",):
                    print(f"    {k}: {v}")
            print()
    else:
        print(f"[learn] No project history found for '{tag}'")
        print(f'[learn] To add a learning: python3 cli/learn.py {tag} --note "what you learned"')


if __name__ == "__main__":
    main()
