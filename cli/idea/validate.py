#!/usr/bin/env python3
"""validate — Run validation checks on a prototype.

Usage:
    python3 cli/validate.py <tag> [--from-site]

For sites: checks HTML validity, asset completeness, spec consistency.
For general ideas: creates a validation checklist.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

HUB_ROOT = Path(__file__).resolve().parent.parent.parent; IDEAS_DIR = HUB_ROOT / "ideas"
# HUB_ROOT already defined above


def validate_site(tag):
    """Validate a site prototype."""
    site_tag = tag if tag.startswith("site-") else f"site-{tag}"
    site_dir = HUB_ROOT / "sites" / site_tag
    spec_path = site_dir / "spec.json"
    dist_dir = site_dir / "dist"
    index_html = dist_dir / "index.html"

    results = {"tag": site_tag, "checks": [], "passed": 0, "failed": 0}

    def check(name, condition, detail=""):
        status = "PASS" if condition else "FAIL"
        results["checks"].append({"name": name, "status": status, "detail": detail})
        if condition:
            results["passed"] += 1
        else:
            results["failed"] += 1
        icon = "+" if condition else "x"
        print(f"  [{icon}] {name}{f': {detail}' if detail else ''}")

    print(f"\n[validate] Checking site: {site_tag}\n")

    # Check spec exists
    check("spec.json exists", spec_path.exists())

    if spec_path.exists():
        spec = json.loads(spec_path.read_text())

        # Check required fields
        check("site_name set", bool(spec.get("site_name")), spec.get("site_name", ""))
        check("tag matches", spec.get("tag") == site_tag, f"spec={spec.get('tag')} expected={site_tag}")
        check("colors defined", bool(spec.get("colors", {}).get("primary")))
        check("pages defined", bool(spec.get("pages")), str(spec.get("pages", [])))
        check("features defined", bool(spec.get("features")), str(spec.get("features", [])))
        check("state is valid",
              spec.get("state") in ["drafting", "incubating", "blueprint", "prototype", "validating", "deployed"],
              spec.get("state", ""))

    # Check dist output
    check("dist/ exists", dist_dir.exists())
    check("index.html exists", index_html.exists())

    if index_html.exists():
        html = index_html.read_text()
        check("HTML has doctype", html.strip().lower().startswith("<!doctype html"))
        check("HTML has <title>", "<title>" in html.lower())
        check("Tailwind CSS included", "tailwindcss" in html.lower() or "tailwind" in html.lower())
        check("Responsive meta tag", "viewport" in html.lower())
        check("No unreplaced placeholders", "{{" not in html)
        size_kb = len(html) / 1024
        check("HTML size reasonable", 1 < size_kb < 500, f"{size_kb:.1f} KB")

    # Check assets
    assets_dir = dist_dir / "assets"
    if assets_dir.exists():
        assets = [f for f in assets_dir.iterdir() if f.is_file()]
        check("Assets present", len(assets) > 0, f"{len(assets)} files")
    else:
        check("Assets directory", False, "no assets/ dir (optional)")

    # Check state file
    state_path = site_dir / "state.json"
    check("state.json exists", state_path.exists())

    # Summary
    total = results["passed"] + results["failed"]
    print(f"\n[validate] Results: {results['passed']}/{total} passed")

    # Update spec state if all pass
    if spec_path.exists() and results["failed"] == 0:
        spec = json.loads(spec_path.read_text())
        spec["state"] = "validating"
        spec_path.write_text(json.dumps(spec, indent=2))
        print(f"[validate] State updated to 'validating'")

    # Save validation report
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    report_dir = IDEAS_DIR / "validate" / f"{ts}_{site_tag}"
    report_dir.mkdir(parents=True, exist_ok=True)
    report = {
        **results,
        "validated_at": datetime.now(timezone.utc).isoformat(),
    }
    (report_dir / "report.json").write_text(json.dumps(report, indent=2))
    print(f"[validate] Report saved: {report_dir / 'report.json'}")

    return results["failed"] == 0


def validate_general(tag):
    """Create validation checklist for non-site prototypes."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    slug = tag.replace(" ", "-").lower()[:30]
    val_dir = IDEAS_DIR / "validate" / f"{ts}_{slug}"
    val_dir.mkdir(parents=True, exist_ok=True)

    checklist = f"""# Validation: {tag}

- Created: {datetime.now(timezone.utc).isoformat()}
- State: validating

## Checklist

- [ ] Core functionality works as expected
- [ ] Edge cases handled
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Ready for export/deployment

## Test Results

(Run tests and record results here)

## Decision

- [ ] PASS -- ready for export
- [ ] ITERATE -- needs more work
- [ ] ARCHIVE -- move to vault
"""
    (val_dir / "checklist.md").write_text(checklist)

    manifest = {
        "tag": tag,
        "state": "validating",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    (val_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))

    print(f"[validate] Checklist created at: {val_dir}")
    return val_dir


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 cli/validate.py <tag> [--from-site]")
        sys.exit(1)

    tag = sys.argv[1]
    from_site = "--from-site" in sys.argv

    if from_site or tag.startswith("site-"):
        success = validate_site(tag)
        sys.exit(0 if success else 1)
    else:
        validate_general(tag)


if __name__ == "__main__":
    main()
