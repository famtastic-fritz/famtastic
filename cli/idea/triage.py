#!/usr/bin/env python3
"""triage — Categorize and prioritize captured ideas.

Usage:
    python3 cli/triage.py [<tag>] [--list] [--move-to incubate]

Lists captured ideas and moves selected ones to incubation.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
import shutil

HUB_ROOT = Path(__file__).resolve().parent.parent.parent; IDEAS_DIR = HUB_ROOT / "ideas"


def list_captured():
    """List all captured ideas."""
    capture_dir = IDEAS_DIR / "capture"
    if not capture_dir.exists():
        print("[triage] No capture/ directory found.")
        return []

    ideas = []
    for d in sorted(capture_dir.iterdir()):
        if not d.is_dir() or d.name.startswith("."):
            continue
        idea_file = d / "idea.md"
        manifest_file = d / "manifest.json"
        if idea_file.exists():
            title = idea_file.read_text().split("\n")[0].replace("# Idea: ", "").strip()
            tag = d.name
            state = "captured"
            if manifest_file.exists():
                m = json.loads(manifest_file.read_text())
                state = m.get("state", "captured")
            ideas.append({"dir": d, "title": title, "tag": tag, "state": state})

    return ideas


def move_to_incubate(tag):
    """Move a captured idea to the incubate stage."""
    capture_dir = IDEAS_DIR / "capture"
    target = None
    for d in capture_dir.iterdir():
        if d.is_dir() and tag in d.name:
            target = d
            break

    if not target:
        print(f"[triage] No idea matching '{tag}' in capture/")
        return False

    dest = IDEAS_DIR / "incubate" / target.name
    shutil.move(str(target), str(dest))

    # Update manifest
    manifest_path = dest / "manifest.json"
    if manifest_path.exists():
        m = json.loads(manifest_path.read_text())
        m["state"] = "incubating"
        m["triaged_at"] = datetime.now(timezone.utc).isoformat()
        manifest_path.write_text(json.dumps(m, indent=2))

    print(f"[triage] Moved to incubate: {dest}")
    return True


def main():
    list_mode = "--list" in sys.argv
    move_mode = "--move-to" in sys.argv

    if list_mode or len(sys.argv) < 2:
        ideas = list_captured()
        if not ideas:
            print("[triage] No captured ideas found.")
            return
        print(f"\n[triage] Captured ideas ({len(ideas)}):\n")
        for i, idea in enumerate(ideas, 1):
            print(f"  {i}. [{idea['state']}] {idea['title']}")
            print(f"     Dir: {idea['dir'].name}")
        print(f"\nTo incubate: python3 cli/triage.py <tag> --move-to incubate")
        return

    tag = sys.argv[1]

    if move_mode:
        move_to_incubate(tag)
    else:
        ideas = list_captured()
        for idea in ideas:
            if tag in idea["tag"]:
                print(f"\n  Title: {idea['title']}")
                print(f"  State: {idea['state']}")
                print(f"  Dir: {idea['dir']}")
                idea_file = idea["dir"] / "idea.md"
                if idea_file.exists():
                    print(f"\n{idea_file.read_text()}")
                return
        print(f"[triage] No idea matching '{tag}'")


if __name__ == "__main__":
    main()
