"""
api/routes/board.py — the kanban board, read from ~/.shay/kanban.db.

This is the laptop dashboard's board view. It reads Shay's REAL task system
(`kanban.db`, table `tasks`) — the single job store the phone also writes to via
`shay kanban create` — and groups tasks into lanes for rendering. Read-only: the
dashboard renders lanes; creating/moving tasks goes through `shay kanban` (the one
write path), never a parallel INSERT here.

Schema reference (STEP 0 dump, 2026-06-06): tasks(id, title, body, assignee, status,
priority, created_by, created_at, started_at, completed_at, result, idempotency_key,
session_id, …). status ∈ VALID_STATUSES below.
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter

router = APIRouter()

# The lanes, in board order. `blocked`/`archived` are off the main flow but shown.
LANES = ["triage", "todo", "scheduled", "ready", "running", "review", "done", "blocked", "archived"]

# Columns we surface to the UI (a card's worth — not all 33).
CARD_COLS = [
    "id", "title", "status", "assignee", "priority", "created_by",
    "created_at", "started_at", "completed_at", "result", "session_id",
]


def kanban_db_path() -> Path:
    """~/.shay/kanban.db, overridable via $SHAY_KANBAN_DB (tests / non-default home)."""
    override = os.environ.get("SHAY_KANBAN_DB")
    if override:
        return Path(override).expanduser()
    home = os.environ.get("SHAY_HOME")
    base = Path(home).expanduser() if home else Path.home() / ".shay"
    return base / "kanban.db"


def _existing_cols(conn: sqlite3.Connection) -> List[str]:
    cur = conn.execute("PRAGMA table_info(tasks)")
    return [row[1] for row in cur.fetchall()]


@router.get("")
async def get_board(limit_per_lane: int = 100) -> Dict[str, Any]:
    """Return tasks grouped by lane, newest first, + per-lane counts.

    Degrades gracefully: if kanban.db or the tasks table is absent (e.g. a fresh
    machine), returns empty lanes instead of erroring, so the board still renders.
    """
    path = kanban_db_path()
    empty = {lane: [] for lane in LANES}
    if not path.exists():
        return {"lanes": empty, "counts": {lane: 0 for lane in LANES}, "total": 0,
                "source": str(path), "available": False}

    try:
        conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
    except sqlite3.Error:
        return {"lanes": empty, "counts": {lane: 0 for lane in LANES}, "total": 0,
                "source": str(path), "available": False}

    try:
        cols = _existing_cols(conn)
        if "tasks" not in [r[0] for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'").fetchall()] or not cols:
            return {"lanes": empty, "counts": {lane: 0 for lane in LANES}, "total": 0,
                    "source": str(path), "available": False}
        select_cols = [c for c in CARD_COLS if c in cols]
        col_sql = ", ".join(select_cols)
        order = "created_at DESC" if "created_at" in cols else "rowid DESC"
        rows = conn.execute(f"SELECT {col_sql} FROM tasks ORDER BY {order}").fetchall()
    except sqlite3.Error:
        return {"lanes": empty, "counts": {lane: 0 for lane in LANES}, "total": 0,
                "source": str(path), "available": False}
    finally:
        conn.close()

    lanes: Dict[str, List[Dict[str, Any]]] = {lane: [] for lane in LANES}
    total = 0
    for row in rows:
        task = {c: row[c] for c in select_cols}
        lane = task.get("status") or "triage"
        if lane not in lanes:
            lanes[lane] = []  # tolerate an unexpected status rather than drop the task
        if len(lanes[lane]) < limit_per_lane:
            lanes[lane].append(task)
        total += 1

    return {
        "lanes": lanes,
        "counts": {lane: len(items) for lane, items in lanes.items()},
        "total": total,
        "source": str(path),
        "available": True,
    }
