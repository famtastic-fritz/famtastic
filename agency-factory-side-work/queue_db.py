"""File-backed task queue on SQLite. Atomic claim so workers never collide.

Statuses: pending -> claimed -> done | failed
The queue is the single coordination point between the orchestrator (producer of
claims) and worker agents (consumers).
"""
from __future__ import annotations

import datetime as _dt
import json
import sqlite3
from contextlib import contextmanager

from factory_paths import DB_PATH, assert_inside

SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT NOT NULL,
    title       TEXT NOT NULL,
    payload     TEXT NOT NULL DEFAULT '{}',
    priority    INTEGER NOT NULL DEFAULT 5,
    complexity  REAL NOT NULL DEFAULT 0.5,
    status      TEXT NOT NULL DEFAULT 'pending',
    attempts    INTEGER NOT NULL DEFAULT 0,
    claimed_by  TEXT,
    model_used  TEXT,
    cost_usd    REAL DEFAULT 0,
    result_path TEXT,
    error       TEXT,
    created_at  TEXT NOT NULL,
    started_at  TEXT,
    finished_at TEXT
);
CREATE TABLE IF NOT EXISTS batches (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    ended_at   TEXT,
    summary    TEXT
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status, priority);
"""


def _now() -> str:
    return _dt.datetime.now().isoformat(timespec="seconds")


@contextmanager
def connect():
    assert_inside(DB_PATH)
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)


def add_task(
    type: str, title: str, payload: dict | None = None,
    priority: int = 5, complexity: float = 0.5,
) -> int:
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO tasks (type, title, payload, priority, complexity, created_at)"
            " VALUES (?,?,?,?,?,?)",
            (type, title, json.dumps(payload or {}), priority, complexity, _now()),
        )
        return int(cur.lastrowid)


def count_by_status() -> dict[str, int]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT status, COUNT(*) c FROM tasks GROUP BY status"
        ).fetchall()
    return {r["status"]: r["c"] for r in rows}


def pending_count() -> int:
    with connect() as conn:
        row = conn.execute(
            "SELECT COUNT(*) c FROM tasks WHERE status='pending'"
        ).fetchone()
    return int(row["c"])


def claim_next(worker_id: str) -> dict | None:
    """Atomically claim the highest-priority pending task. Returns task or None."""
    with connect() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        row = conn.execute(
            "SELECT * FROM tasks WHERE status='pending' "
            "ORDER BY priority ASC, id ASC LIMIT 1"
        ).fetchone()
        if row is None:
            return None
        conn.execute(
            "UPDATE tasks SET status='claimed', claimed_by=?, attempts=attempts+1,"
            " started_at=? WHERE id=?",
            (worker_id, _now(), row["id"]),
        )
        return dict(row)


def claim_specific(task_id: int, worker_id: str) -> dict | None:
    with connect() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        row = conn.execute(
            "SELECT * FROM tasks WHERE id=? AND status='pending'", (task_id,)
        ).fetchone()
        if row is None:
            return None
        conn.execute(
            "UPDATE tasks SET status='claimed', claimed_by=?, attempts=attempts+1,"
            " started_at=? WHERE id=?",
            (worker_id, _now(), task_id),
        )
        return dict(row)


def complete_task(
    task_id: int, result_path: str, model_used: str, cost_usd: float
) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE tasks SET status='done', result_path=?, model_used=?,"
            " cost_usd=?, finished_at=? WHERE id=?",
            (result_path, model_used, cost_usd, _now(), task_id),
        )


def fail_task(task_id: int, error: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE tasks SET status='failed', error=?, finished_at=? WHERE id=?",
            (error, _now(), task_id),
        )


def requeue_stale(max_age_seconds: int = 120) -> int:
    """Return claimed tasks whose worker died back to pending. Returns count."""
    cutoff = (
        _dt.datetime.now() - _dt.timedelta(seconds=max_age_seconds)
    ).isoformat(timespec="seconds")
    with connect() as conn:
        cur = conn.execute(
            "UPDATE tasks SET status='pending', claimed_by=NULL "
            "WHERE status='claimed' AND started_at < ?",
            (cutoff,),
        )
        return cur.rowcount


def all_tasks() -> list[dict]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM tasks ORDER BY id ASC").fetchall()
    return [dict(r) for r in rows]


def start_batch() -> int:
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO batches (started_at) VALUES (?)", (_now(),)
        )
        return int(cur.lastrowid)


def end_batch(batch_id: int, summary: dict) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE batches SET ended_at=?, summary=? WHERE id=?",
            (_now(), json.dumps(summary), batch_id),
        )


def metrics() -> dict:
    """Aggregate metrics for the self-improvement loop and dashboard."""
    with connect() as conn:
        rows = conn.execute("SELECT * FROM tasks").fetchall()
    done = [r for r in rows if r["status"] == "done"]
    failed = [r for r in rows if r["status"] == "failed"]
    total_finished = len(done) + len(failed)
    latencies = []
    for r in done:
        if r["started_at"] and r["finished_at"]:
            s = _dt.datetime.fromisoformat(r["started_at"])
            f = _dt.datetime.fromisoformat(r["finished_at"])
            latencies.append((f - s).total_seconds())
    total_cost = round(sum((r["cost_usd"] or 0) for r in rows), 6)
    return {
        "total": len(rows),
        "done": len(done),
        "failed": len(failed),
        "pending": len([r for r in rows if r["status"] == "pending"]),
        "claimed": len([r for r in rows if r["status"] == "claimed"]),
        "success_rate": round(len(done) / total_finished, 4) if total_finished else 0.0,
        "total_cost_usd": total_cost,
        "cost_per_task_usd": round(total_cost / len(done), 6) if done else 0.0,
        "avg_latency_s": round(sum(latencies) / len(latencies), 3) if latencies else 0.0,
    }


if __name__ == "__main__":
    init_db()
    print("DB initialized at", DB_PATH)
    print(json.dumps(count_by_status(), indent=2))
