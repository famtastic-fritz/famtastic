#!/usr/bin/env python3
"""prototype — Move an idea from blueprint to working prototype.

Usage:
    python3 cli/prototype.py <tag> [--from-site]

For site-based ideas, this triggers the site builder in agent-hub.
For general ideas, it creates a prototype workspace.
"""

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

HUB_ROOT = Path(__file__).resolve().parent.parent.parent; IDEAS_DIR = HUB_ROOT / "ideas"
# HUB_ROOT already defined above


def find_blueprint(tag):
    """Find a blueprint by tag."""
    bp_dir = IDEAS_DIR / "blueprint"
    if not bp_dir.exists():
        return None, None
    for d in sorted(bp_dir.iterdir(), reverse=True):
        if d.is_dir() and tag in d.name:
            manifest = d / "manifest.json"
            if manifest.exists():
                return d, json.loads(manifest.read_text())
    return None, None


def prototype_site(tag):
    """Trigger site prototype via agent-hub orchestrator."""
    site_tag = tag if tag.startswith("site-") else f"site-{tag}"
    spec_path = HUB_ROOT / "sites" / site_tag / "spec.json"

    if not spec_path.exists():
        print(f"[prototype] No site spec found for {site_tag}")
        print(f"[prototype] Run: fam-hub site new {tag}")
        return False

    # Update state to prototype
    spec = json.loads(spec_path.read_text())
    spec["state"] = "prototype"
    spec_path.write_text(json.dumps(spec, indent=2))

    # Run orchestrator-site
    print(f"[prototype] Building site prototype for {site_tag}...")
    result = subprocess.run(
        [str(HUB_ROOT / "scripts" / "orchestrator-site"), site_tag],
        cwd=str(AGENT_HUB),
    )

    if result.returncode == 0:
        print(f"[prototype] Site built. Preview: fam-hub site preview {site_tag}")
        return True
    else:
        print(f"[prototype] Build failed (exit {result.returncode})")
        return False


def prototype_general(tag):
    """Create a prototype workspace for non-site ideas."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    slug = tag.replace(" ", "-").lower()[:30]
    proto_dir = IDEAS_DIR / "prototype" / f"{ts}_{slug}"
    proto_dir.mkdir(parents=True, exist_ok=True)

    # Look for blueprint content
    bp_dir, bp_manifest = find_blueprint(tag)
    source = ""
    if bp_dir:
        bp_file = bp_dir / "blueprint.md"
        if bp_file.exists():
            source = bp_file.read_text()

    readme = f"""# Prototype: {tag}

- Created: {datetime.now(timezone.utc).isoformat()}
- State: prototype

## Source Blueprint

{source if source else '(No blueprint found -- build from scratch)'}

## Prototype Notes

Start building here. Add code, mockups, or experiments.

## Next Steps

- [ ] Build initial prototype
- [ ] Test core functionality
- [ ] Move to validate phase
"""
    (proto_dir / "README.md").write_text(readme)

    manifest = {
        "tag": tag,
        "state": "prototype",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "prototype_dir": str(proto_dir),
    }
    (proto_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))

    return proto_dir


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 cli/prototype.py <tag> [--from-site]")
        sys.exit(1)

    tag = sys.argv[1]
    from_site = "--from-site" in sys.argv

    if from_site or tag.startswith("site-"):
        success = prototype_site(tag)
        if not success:
            sys.exit(1)
    else:
        proto_dir = prototype_general(tag)
        print(f"[prototype] Created at: {proto_dir}")
        print(f"[prototype] Start building in: {proto_dir}")


if __name__ == "__main__":
    main()
