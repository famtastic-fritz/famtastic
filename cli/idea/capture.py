#!/usr/bin/env python3
"""capture — Capture a new idea into the think-tank.

Usage:
    python3 cli/capture.py "<idea text>" [--tag <tag>]

Python equivalent of scripts/capture.sh with richer metadata.
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

HUB_ROOT = Path(__file__).resolve().parent.parent.parent; IDEAS_DIR = HUB_ROOT / "ideas"


def slugify(text, max_len=20):
    slug = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
    return slug[:max_len]


def main():
    if len(sys.argv) < 2:
        print('Usage: python3 cli/capture.py "<idea text>" [--tag <tag>]')
        sys.exit(1)

    idea_text = sys.argv[1]
    tag = None

    if "--tag" in sys.argv:
        idx = sys.argv.index("--tag")
        if idx + 1 < len(sys.argv):
            tag = sys.argv[idx + 1]

    ts = datetime.now(timezone.utc)
    ts_str = ts.strftime("%Y%m%d-%H%M")
    slug = tag or slugify(idea_text)
    capture_dir = IDEAS_DIR / "capture" / f"{ts_str}_{slug}"
    capture_dir.mkdir(parents=True, exist_ok=True)

    idea_md = f"""# Idea: {idea_text}

- Author: {os.environ.get('USER', 'unknown')}
- Source: CLI (Python)
- Captured: {ts.isoformat()}
- Tag: {slug}

## Notes

{idea_text}
"""
    (capture_dir / "idea.md").write_text(idea_md)

    manifest = {
        "tag": slug,
        "state": "captured",
        "created_at": ts.isoformat(),
        "author": os.environ.get("USER", "unknown"),
        "source": "cli",
        "idea": idea_text,
    }
    (capture_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))

    print(f"[capture] Idea saved at: {capture_dir / 'idea.md'}")


if __name__ == "__main__":
    main()
