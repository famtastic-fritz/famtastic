#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "_system" / "runtime" / "proactive"
REVIEW_FILE = ROOT / "private-review.json"
ACTIONS_FILE = ROOT / "private-review-actions.json"
VALID_ACTIONS = {"review", "approve", "suppress"}


def load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def save_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def current_entries() -> list[dict]:
    payload = load_json(REVIEW_FILE, {})
    entries = payload.get("entries") if isinstance(payload, dict) else None
    return entries if isinstance(entries, list) else []


def load_actions() -> dict:
    payload = load_json(ACTIONS_FILE, {"entries": []})
    if not isinstance(payload, dict):
        return {"entries": []}
    if not isinstance(payload.get("entries"), list):
        payload["entries"] = []
    return payload


def list_entries() -> int:
    actions = {entry.get("item_id"): entry for entry in load_actions().get("entries", []) if isinstance(entry, dict)}
    rows = []
    for entry in current_entries():
        item_id = entry.get("item_id")
        action = actions.get(item_id, {}).get("action", entry.get("current_action", "review"))
        excerpt = str(entry.get("excerpt", "")).replace("\n", " ")
        rows.append(f"{item_id}\t{action}\t{entry.get('lane','')}\t{entry.get('kind','')}\t{excerpt}")
    print("item_id\taction\tlane\tkind\texcerpt")
    for row in rows:
        print(row)
    return 0


def set_action(item_id: str, action: str, note: str | None) -> int:
    entries = {entry.get("item_id") for entry in current_entries() if isinstance(entry, dict)}
    if item_id not in entries:
        print(f"error: item_id not found in current private review: {item_id}", file=sys.stderr)
        return 2
    payload = load_actions()
    kept = [entry for entry in payload["entries"] if isinstance(entry, dict) and entry.get("item_id") != item_id]
    kept.append({
        "item_id": item_id,
        "action": action,
        "note": note,
        "acted_at": dt.datetime.now().isoformat(timespec="seconds"),
    })
    payload["entries"] = sorted(kept, key=lambda x: (str(x.get("item_id", ""))))
    payload["updated_at"] = dt.datetime.now().isoformat(timespec="seconds")
    save_json(ACTIONS_FILE, payload)
    print(f"set {item_id} -> {action}")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Manage approve/suppress/review actions for proactive private-review items.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list", help="List current private-review entries with action state")

    setp = sub.add_parser("set", help="Set action for one private-review item")
    setp.add_argument("item_id")
    setp.add_argument("action", choices=sorted(VALID_ACTIONS))
    setp.add_argument("--note", default=None)

    args = ap.parse_args(argv)
    if args.cmd == "list":
        return list_entries()
    if args.cmd == "set":
        return set_action(args.item_id, args.action, args.note)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
