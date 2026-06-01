#!/usr/bin/env python3
"""Nightly memory reflection / consolidation pass for the Shay-Memory vault.

Implements the L0 -> L1 -> L2 -> L3 condensation described in
``_system/MEMORY-SCHEMA-L0-L3.md``. It is intentionally dependency-free
(stdlib only) so it can run from a bare launchd entry or by hand. No network,
no config read, no gateway touch.

Behaviour (idempotent):
  * Scan the vault for L0/L1 notes modified in the last ``--window-hours`` hours
    (default 24), excluding the ``reflections/`` and ``_system/`` trees so the
    pass never feeds on its own output.
  * Write one dated note per layer into ``reflections/{episodic,semantic,reflective}/``.
    Re-running for the same date overwrites only that single dated note.
  * Never edits or moves a pre-existing note outside ``reflections/``.

This pass produces *extractive* summaries (headings + first lines + links) with
zero LLM call, so it is safe to run unattended. A future attended upgrade can
swap ``summarise_episode`` for an auxiliary-model call; the contract stays the
same. ``--dry-run`` prints what it would write and touches nothing.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import os
import sys
from pathlib import Path

VAULT = Path(__file__).resolve().parent.parent  # .../Shay-Memory
REFLECT_DIR = VAULT / "reflections"
EPISODIC = REFLECT_DIR / "episodic"
SEMANTIC = REFLECT_DIR / "semantic"
REFLECTIVE = REFLECT_DIR / "reflective"

# Trees the pass must never read FROM (its own output) or recurse into.
EXCLUDE_DIRS = {"reflections", "_system", ".git", ".obsidian", ".trash"}


def _parse_frontmatter(text: str) -> dict:
    """Minimal YAML-ish front-matter reader (key: value + simple lists)."""
    fm: dict = {}
    if not text.startswith("---"):
        return fm
    end = text.find("\n---", 3)
    if end == -1:
        return fm
    block = text[3:end].strip().splitlines()
    key = None
    for line in block:
        if line.startswith("  - ") or line.startswith("- "):
            if key:
                fm.setdefault(key, [])
                if isinstance(fm[key], list):
                    fm[key].append(line.split("-", 1)[1].strip())
            continue
        if ":" in line:
            key, val = line.split(":", 1)
            key = key.strip()
            val = val.strip()
            fm[key] = val if val else []
    return fm


def _iter_source_notes(window_hours: int):
    """Yield (path, mtime) for L0/L1 notes modified within the window."""
    cutoff = _dt.datetime.now().timestamp() - window_hours * 3600
    for root, dirs, files in os.walk(VAULT):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for name in files:
            if not name.endswith(".md"):
                continue
            p = Path(root) / name
            try:
                mtime = p.stat().st_mtime
            except OSError:
                continue
            if mtime < cutoff:
                continue
            yield p, mtime


def summarise_episode(path: Path) -> str:
    """Extractive one-block summary of a single source note (no LLM)."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""
    fm = _parse_frontmatter(text)
    title = fm.get("title") or path.stem
    if isinstance(title, list):
        title = " ".join(title)
    # Body = everything after front-matter.
    body = text
    if text.startswith("---"):
        e = text.find("\n---", 3)
        if e != -1:
            body = text[e + 4 :]
    headings = [l.strip() for l in body.splitlines() if l.lstrip().startswith("#")][:6]
    rel = path.relative_to(VAULT)
    lines = [f"### {title}", f"- source: `{rel}`"]
    if headings:
        lines.append("- sections: " + "; ".join(h.lstrip("# ") for h in headings))
    return "\n".join(lines)


def _write(path: Path, content: str, dry: bool) -> None:
    if dry:
        print(f"[dry-run] would write {path} ({len(content)} bytes)")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"wrote {path}")


def run(window_hours: int, dry: bool) -> int:
    today = _dt.date.today().isoformat()
    now_iso = _dt.datetime.now().isoformat(timespec="seconds")
    sources = sorted(_iter_source_notes(window_hours), key=lambda t: t[1], reverse=True)

    if not sources:
        print(f"reflect: no L0/L1 notes modified in the last {window_hours}h — nothing to do.")
        return 0

    episodes = [summarise_episode(p) for p, _ in sources]
    episodes = [e for e in episodes if e]
    src_links = [f"- [[{p.relative_to(VAULT).with_suffix('')}]]" for p, _ in sources]

    # L1 episodic
    l1 = (
        f"---\ntitle: Episodic reflection — {today}\ndate: {today}\n"
        f"memory_layer: L1\nmemory_reflected_at: {now_iso}\n"
        f"tags:\n- memory/l1\n- reflection\n---\n\n"
        f"# Episodic reflection — {today}\n\n"
        f"Auto-generated from {len(sources)} source note(s) modified in the last "
        f"{window_hours}h. Extractive; ratify into L2/L3 as needed.\n\n"
        + "\n\n".join(episodes)
        + "\n\n## Sources\n"
        + "\n".join(src_links)
        + "\n"
    )
    _write(EPISODIC / f"{today}.md", l1, dry)

    # L2 semantic (candidate durable facts — human/LLM refines later)
    l2 = (
        f"---\ntitle: Semantic candidates — {today}\ndate: {today}\n"
        f"memory_layer: L2\nmemory_source:\n- shay-memory/reflections/episodic/{today}\n"
        f"memory_reflected_at: {now_iso}\ntags:\n- memory/l2\n- reflection\n---\n\n"
        f"# Semantic candidates — {today}\n\n"
        "Durable-fact candidates distilled from today's episodic note. Review for "
        "duplicates against existing `learnings/` and `reflections/semantic/` notes "
        "before promoting. This pass annotates; it never auto-deletes.\n\n"
        f"- {len(episodes)} episode(s) processed; see [[reflections/episodic/{today}]].\n"
    )
    _write(SEMANTIC / f"{today}.md", l2, dry)

    # L3 reflective (meta — candidate standing patterns for human ratification)
    l3 = (
        f"---\ntitle: Reflective candidates — {today}\ndate: {today}\n"
        f"memory_layer: L3\nmemory_source:\n- shay-memory/reflections/semantic/{today}\n"
        f"memory_reflected_at: {now_iso}\ntags:\n- memory/l3\n- reflection\n---\n\n"
        f"# Reflective candidates — {today}\n\n"
        "Recurring patterns / standing-constraint candidates. **Requires human "
        "ratification** before being treated as identity-level (L3) truth.\n\n"
        f"- Derived from [[reflections/semantic/{today}]].\n"
    )
    _write(REFLECTIVE / f"{today}.md", l3, dry)

    print(f"reflect: processed {len(sources)} source note(s) for {today}{' (dry-run)' if dry else ''}.")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Shay-Memory L0->L3 reflection pass.")
    ap.add_argument("--window-hours", type=int, default=24)
    ap.add_argument("--dry-run", action="store_true", help="print actions, write nothing")
    args = ap.parse_args(argv)
    return run(args.window_hours, args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
