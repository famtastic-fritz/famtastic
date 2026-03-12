#!/usr/bin/env python3
"""blueprint — Move an idea from incubation to structured plan.

Usage:
    python3 cli/blueprint.py <tag> [--from-site]

Reads an incubated idea (or site spec) and produces a structured blueprint
in the blueprint/ directory with goals, architecture, and action items.
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

HUB_ROOT = Path(__file__).resolve().parent.parent.parent; IDEAS_DIR = HUB_ROOT / "ideas"
# HUB_ROOT already defined above


def find_idea(tag):
    """Find an idea by tag in capture/ or incubate/ directories."""
    for stage in ["incubate", "capture"]:
        stage_dir = IDEAS_DIR / stage
        if not stage_dir.exists():
            continue
        for d in sorted(stage_dir.iterdir(), reverse=True):
            if d.is_dir() and tag in d.name:
                idea_file = d / "idea.md"
                if idea_file.exists():
                    return idea_file, stage
    return None, None


def find_site_spec(tag):
    """Find a site spec.json in agent-hub."""
    site_tag = tag if tag.startswith("site-") else f"site-{tag}"
    spec = HUB_ROOT / "sites" / site_tag / "spec.json"
    if spec.exists():
        return json.loads(spec.read_text())
    return None


def create_blueprint(tag, source_content, source_type="idea"):
    """Create a blueprint document from source material."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    slug = tag.replace(" ", "-").lower()[:30]
    bp_dir = IDEAS_DIR / "blueprint" / f"{ts}_{slug}"
    bp_dir.mkdir(parents=True, exist_ok=True)

    blueprint = f"""# Blueprint: {tag}

- Created: {datetime.now(timezone.utc).isoformat()}
- Source: {source_type}
- State: blueprint

## Overview

{source_content}

## Goals

- [ ] Define primary objective
- [ ] Identify target audience
- [ ] Set success metrics

## Architecture

- Tech stack: TBD
- Hosting: TBD
- Integrations: TBD

## Action Items

- [ ] Complete blueprint details
- [ ] Move to prototype phase
- [ ] Assign resources

## Notes

Created via `fam-idea blueprint {tag}`
"""
    (bp_dir / "blueprint.md").write_text(blueprint)

    manifest = {
        "tag": tag,
        "state": "blueprint",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source_type": source_type,
        "blueprint_dir": str(bp_dir),
    }
    (bp_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))

    return bp_dir


def blueprint_from_site(tag):
    """Create a blueprint from a site spec."""
    spec = find_site_spec(tag)
    if not spec:
        print(f"[blueprint] No site spec found for {tag}")
        return None

    content = f"""Site: {spec.get('site_name', tag)}
Business type: {spec.get('business_type', 'general')}
Tone: {spec.get('tone', 'professional')}
Pages: {', '.join(spec.get('pages', ['home']))}
Features: {', '.join(spec.get('features', []))}
Current state: {spec.get('state', 'unknown')}"""

    bp_dir = create_blueprint(tag, content, source_type="site-spec")

    # Update site spec state to blueprint
    site_tag = tag if tag.startswith("site-") else f"site-{tag}"
    spec_path = HUB_ROOT / "sites" / site_tag / "spec.json"
    if spec_path.exists():
        spec["state"] = "blueprint"
        spec_path.write_text(json.dumps(spec, indent=2))
        print(f"[blueprint] Updated site state to 'blueprint'")

    return bp_dir


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 cli/blueprint.py <tag> [--from-site]")
        sys.exit(1)

    tag = sys.argv[1]
    from_site = "--from-site" in sys.argv

    if from_site:
        bp_dir = blueprint_from_site(tag)
    else:
        idea_file, stage = find_idea(tag)
        if idea_file:
            content = idea_file.read_text()
            bp_dir = create_blueprint(tag, content, source_type=stage)
        else:
            print(f"[blueprint] No idea found matching '{tag}'. Creating empty blueprint.")
            bp_dir = create_blueprint(tag, "(No source material -- fill in manually)", source_type="manual")

    if bp_dir:
        print(f"[blueprint] Created at: {bp_dir}")
        print(f"[blueprint] Edit: {bp_dir / 'blueprint.md'}")


if __name__ == "__main__":
    main()
