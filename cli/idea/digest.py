#!/usr/bin/env python3
"""digest — Summarize ideas and activity across the think-tank.

Usage:
    python3 cli/digest.py [--stage <stage>] [--all]

Shows a summary of ideas at each lifecycle stage.
"""

import json
import sys
from pathlib import Path

HUB_ROOT = Path(__file__).resolve().parent.parent.parent; IDEAS_DIR = HUB_ROOT / "ideas"
# HUB_ROOT already defined above

STAGES = ["capture", "incubate", "blueprint", "prototype", "validate", "exports", "vault"]


def count_items(stage_dir):
    """Count items in a stage directory."""
    if not stage_dir.exists():
        return []
    items = []
    for d in sorted(stage_dir.iterdir()):
        if not d.is_dir() or d.name.startswith("."):
            continue
        title = d.name
        manifest = d / "manifest.json"
        if manifest.exists():
            m = json.loads(manifest.read_text())
            title = m.get("tag", d.name)
        items.append({"name": d.name, "title": title, "path": d})
    return items


def count_sites():
    """Count sites in agent-hub."""
    sites_dir = HUB_ROOT / "sites"
    if not sites_dir.exists():
        return []
    sites = []
    for d in sorted(sites_dir.iterdir()):
        if not d.is_dir():
            continue
        spec = d / "spec.json"
        if spec.exists():
            s = json.loads(spec.read_text())
            sites.append({
                "tag": s.get("tag", d.name),
                "name": s.get("site_name", d.name),
                "state": s.get("state", "unknown"),
            })
    return sites


def main():
    show_all = "--all" in sys.argv
    filter_stage = None
    if "--stage" in sys.argv:
        idx = sys.argv.index("--stage")
        if idx + 1 < len(sys.argv):
            filter_stage = sys.argv[idx + 1]

    print("\n=== FAMtastic Think-Tank Digest ===\n")

    total = 0
    for stage in STAGES:
        if filter_stage and stage != filter_stage:
            continue
        stage_dir = IDEAS_DIR / stage
        items = count_items(stage_dir)
        total += len(items)
        print(f"  {stage:12s}  {len(items):3d} items")
        if show_all and items:
            for item in items:
                print(f"                  - {item['title']}")

    print(f"\n  {'TOTAL':12s}  {total:3d} items")

    # Also show sites from agent-hub
    sites = count_sites()
    if sites:
        print(f"\n--- Sites (Agent-Hub) ---\n")
        for site in sites:
            print(f"  {site['tag']:25s}  {site['name']:30s}  [{site['state']}]")
        print(f"\n  {len(sites)} site(s) total")

    print()


if __name__ == "__main__":
    main()
