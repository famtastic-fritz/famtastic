"""SQLite-backed task queue with atomic claim semantics.

The queue is a real concurrency primitive: multiple worker subprocesses claim
tasks at once, and `BEGIN IMMEDIATE` + a single-row UPDATE guarantees no two
workers ever grab the same task.
"""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from typing import Optional

from common import DB_PATH, now_iso

SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    type         TEXT NOT NULL,
    payload      TEXT NOT NULL,           -- JSON
    priority     INTEGER NOT NULL DEFAULT 5,
    complexity   REAL NOT NULL DEFAULT 0.5,
    status       TEXT NOT NULL DEFAULT 'pending',  -- pending|claimed|done|failed
    worker_id    TEXT,
    model_used   TEXT,
    cost_usd     REAL,
    latency_ms   INTEGER,
    result_path  TEXT,
    error        TEXT,
    batch_id     TEXT,
    created_at   TEXT NOT NULL,
    started_at   TEXT,
    finished_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_status ON tasks(status, priority, id);

CREATE TABLE IF NOT EXISTS workers (
    worker_id    TEXT PRIMARY KEY,
    pid          INTEGER,
    status       TEXT,                    -- spawned|working|idle|retired
    spawned_at   TEXT,
    last_seen    TEXT,
    tasks_done   INTEGER DEFAULT 0
);
"""


@contextmanager
def connect():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=30000;")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)


def reset_db() -> None:
    with connect() as conn:
        conn.executescript("DROP TABLE IF EXISTS tasks; DROP TABLE IF EXISTS workers;")
        conn.executescript(SCHEMA)


def add_task(type: str, payload: dict, *, priority: int = 5, complexity: float = 0.5) -> int:
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO tasks(type, payload, priority, complexity, created_at) VALUES (?,?,?,?,?)",
            (type, json.dumps(payload), priority, complexity, now_iso()),
        )
        return cur.lastrowid


def queue_depth() -> int:
    with connect() as conn:
        return conn.execute("SELECT COUNT(*) FROM tasks WHERE status='pending'").fetchone()[0]


def claim_next(worker_id: str) -> Optional[dict]:
    """Atomically claim the highest-priority pending task. Returns None if empty."""
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout=30000;")
    try:
        conn.execute("BEGIN IMMEDIATE;")
        row = conn.execute(
            "SELECT * FROM tasks WHERE status='pending' ORDER BY priority ASC, id ASC LIMIT 1"
        ).fetchone()
        if row is None:
            conn.commit()
            return None
        conn.execute(
            "UPDATE tasks SET status='claimed', worker_id=?, started_at=? WHERE id=?",
            (worker_id, now_iso(), row["id"]),
        )
        conn.commit()
        d = dict(row)
        d["payload"] = json.loads(d["payload"])
        return d
    finally:
        conn.close()


def complete_task(task_id: int, *, model_used: str, cost_usd: float, latency_ms: int,
                  result_path: str, batch_id: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE tasks SET status='done', model_used=?, cost_usd=?, latency_ms=?, "
            "result_path=?, batch_id=?, finished_at=? WHERE id=?",
            (model_used, cost_usd, latency_ms, result_path, batch_id, now_iso(), task_id),
        )


def fail_task(task_id: int, error: str, batch_id: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE tasks SET status='failed', error=?, batch_id=?, finished_at=? WHERE id=?",
            (error, batch_id, now_iso(), task_id),
        )


def register_worker(worker_id: str, pid: int) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO workers(worker_id, pid, status, spawned_at, last_seen, tasks_done) "
            "VALUES (?,?,?,?,?, COALESCE((SELECT tasks_done FROM workers WHERE worker_id=?),0))",
            (worker_id, pid, "spawned", now_iso(), now_iso(), worker_id),
        )


def heartbeat(worker_id: str, status: str, *, did_task: bool = False) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE workers SET status=?, last_seen=?, tasks_done=tasks_done+? WHERE worker_id=?",
            (status, now_iso(), 1 if did_task else 0, worker_id),
        )


def retire_worker(worker_id: str) -> None:
    with connect() as conn:
        conn.execute("UPDATE workers SET status='retired', last_seen=? WHERE worker_id=?",
                     (now_iso(), worker_id))


def stats(batch_id: Optional[str] = None) -> dict:
    with connect() as conn:
        where = "WHERE batch_id=?" if batch_id else ""
        args = (batch_id,) if batch_id else ()
        done = conn.execute(f"SELECT * FROM tasks {where} AND status='done'" if batch_id
                            else "SELECT * FROM tasks WHERE status='done'", args).fetchall()
        failed = conn.execute(f"SELECT COUNT(*) FROM tasks {where} AND status='failed'" if batch_id
                              else "SELECT COUNT(*) FROM tasks WHERE status='failed'", args).fetchone()[0]
        pending = conn.execute("SELECT COUNT(*) FROM tasks WHERE status='pending'").fetchone()[0]
        active = conn.execute("SELECT COUNT(*) FROM workers WHERE status IN ('spawned','working','idle')").fetchone()[0]
        total_cost = conn.execute("SELECT COALESCE(SUM(cost_usd),0) FROM tasks WHERE status='done'").fetchone()[0]
        n = len(done)
        avg_cost = sum(r["cost_usd"] or 0 for r in done) / n if n else 0
        avg_latency = sum(r["latency_ms"] or 0 for r in done) / n if n else 0
        return {
            "done": n,
            "failed": failed,
            "pending": pending,
            "active_workers": active,
            "success_rate": n / (n + failed) if (n + failed) else 1.0,
            "avg_cost_usd": avg_cost,
            "avg_latency_ms": avg_latency,
            "total_cost_usd": total_cost,
        }
