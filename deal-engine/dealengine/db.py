"""Task queue + run ledger, backed by SQLite (stdlib, no deps).

The queue is the single source of truth the orchestrator pulls from. It also
stores per-task results, cost, latency, and the run/batch metrics the
self-improvement loop reads back.

Tables
------
tasks         : the work queue (status: queued|claimed|running|done|failed)
runs          : one row per worker invocation (cost + latency ledger)
batches       : one row per orchestrator self-improvement pass
config_history: append-only record of every tunable adjustment
"""
from __future__ import annotations

import json
import sqlite3
import time
from contextlib import contextmanager
from typing import Any, Iterable, Optional

from .paths import DB_PATH, ensure_dirs

SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    kind         TEXT NOT NULL,
    title        TEXT NOT NULL,
    payload      TEXT NOT NULL DEFAULT '{}',
    complexity   REAL NOT NULL DEFAULT 0.5,
    priority     INTEGER NOT NULL DEFAULT 5,
    status       TEXT NOT NULL DEFAULT 'queued',
    attempts     INTEGER NOT NULL DEFAULT 0,
    worker_id    TEXT,
    result       TEXT,
    model_used   TEXT,
    cost_usd     REAL,
    latency_ms   INTEGER,
    created_at   REAL NOT NULL,
    claimed_at   REAL,
    finished_at  REAL
);

CREATE TABLE IF NOT EXISTS runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id     INTEGER NOT NULL,
    worker_id   TEXT NOT NULL,
    model_used  TEXT,
    tier        TEXT,
    cost_usd    REAL NOT NULL DEFAULT 0,
    latency_ms  INTEGER NOT NULL DEFAULT 0,
    success     INTEGER NOT NULL DEFAULT 0,
    ts          REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS batches (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle           INTEGER NOT NULL,
    tasks_done      INTEGER NOT NULL DEFAULT 0,
    tasks_failed    INTEGER NOT NULL DEFAULT 0,
    success_rate    REAL NOT NULL DEFAULT 0,
    avg_cost_usd    REAL NOT NULL DEFAULT 0,
    avg_latency_ms  REAL NOT NULL DEFAULT 0,
    total_cost_usd  REAL NOT NULL DEFAULT 0,
    concurrency     INTEGER NOT NULL DEFAULT 1,
    ts              REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS config_history (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle     INTEGER NOT NULL,
    key       TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason    TEXT,
    ts        REAL NOT NULL
);
"""


@contextmanager
def connect():
    ensure_dirs()
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with connect() as c:
        c.executescript(SCHEMA)


# ── enqueue / inspect ───────────────────────────────────────────────────────

def enqueue(kind: str, title: str, payload: dict | None = None,
            complexity: float = 0.5, priority: int = 5) -> int:
    with connect() as c:
        cur = c.execute(
            "INSERT INTO tasks (kind,title,payload,complexity,priority,created_at) "
            "VALUES (?,?,?,?,?,?)",
            (kind, title, json.dumps(payload or {}), complexity, priority, time.time()),
        )
        return cur.lastrowid


def queue_depth() -> int:
    with connect() as c:
        return c.execute(
            "SELECT COUNT(*) FROM tasks WHERE status='queued'"
        ).fetchone()[0]


def counts_by_status() -> dict:
    with connect() as c:
        rows = c.execute(
            "SELECT status, COUNT(*) n FROM tasks GROUP BY status"
        ).fetchall()
    return {r["status"]: r["n"] for r in rows}


# ── claim / complete (atomic) ────────────────────────────────────────────────

def claim_next(worker_id: str) -> Optional[dict]:
    """Atomically claim the highest-priority queued task for a worker."""
    with connect() as c:
        row = c.execute(
            "SELECT * FROM tasks WHERE status='queued' "
            "ORDER BY priority ASC, id ASC LIMIT 1"
        ).fetchone()
        if not row:
            return None
        c.execute(
            "UPDATE tasks SET status='claimed', worker_id=?, claimed_at=?, "
            "attempts=attempts+1 WHERE id=? AND status='queued'",
            (worker_id, time.time(), row["id"]),
        )
        if c.total_changes == 0:
            return None  # lost the race to another worker
        d = dict(row)
        d["payload"] = json.loads(d["payload"])
        return d


def mark_running(task_id: int) -> None:
    with connect() as c:
        c.execute("UPDATE tasks SET status='running' WHERE id=?", (task_id,))


def complete_task(task_id: int, worker_id: str, *, success: bool, result: str,
                  model_used: str, tier: str, cost_usd: float, latency_ms: int) -> None:
    status = "done" if success else "failed"
    now = time.time()
    with connect() as c:
        c.execute(
            "UPDATE tasks SET status=?, result=?, model_used=?, cost_usd=?, "
            "latency_ms=?, finished_at=? WHERE id=?",
            (status, result, model_used, cost_usd, latency_ms, now, task_id),
        )
        c.execute(
            "INSERT INTO runs (task_id,worker_id,model_used,tier,cost_usd,"
            "latency_ms,success,ts) VALUES (?,?,?,?,?,?,?,?)",
            (task_id, worker_id, model_used, tier, cost_usd, latency_ms,
             1 if success else 0, now),
        )


def requeue_stale(timeout_seconds: int) -> int:
    """Return claimed/running tasks that exceeded timeout back to the queue."""
    cutoff = time.time() - timeout_seconds
    with connect() as c:
        cur = c.execute(
            "UPDATE tasks SET status='queued', worker_id=NULL "
            "WHERE status IN ('claimed','running') AND claimed_at < ?",
            (cutoff,),
        )
        return cur.rowcount


# ── metrics for the self-improvement loop ─────────────────────────────────────

def total_cost() -> float:
    with connect() as c:
        v = c.execute("SELECT COALESCE(SUM(cost_usd),0) FROM runs").fetchone()[0]
    return float(v)


def batch_metrics_since(ts: float) -> dict:
    with connect() as c:
        row = c.execute(
            "SELECT COUNT(*) n, COALESCE(SUM(success),0) ok, "
            "COALESCE(AVG(cost_usd),0) avg_cost, COALESCE(AVG(latency_ms),0) avg_lat, "
            "COALESCE(SUM(cost_usd),0) total_cost FROM runs WHERE ts >= ?",
            (ts,),
        ).fetchone()
    n = row["n"] or 0
    ok = row["ok"] or 0
    return {
        "runs": n,
        "ok": ok,
        "failed": n - ok,
        "success_rate": (ok / n) if n else 1.0,
        "avg_cost_usd": float(row["avg_cost"]),
        "avg_latency_ms": float(row["avg_lat"]),
        "total_cost_usd": float(row["total_cost"]),
    }


def record_batch(cycle: int, m: dict, concurrency: int) -> None:
    with connect() as c:
        c.execute(
            "INSERT INTO batches (cycle,tasks_done,tasks_failed,success_rate,"
            "avg_cost_usd,avg_latency_ms,total_cost_usd,concurrency,ts) "
            "VALUES (?,?,?,?,?,?,?,?,?)",
            (cycle, m["ok"], m["failed"], m["success_rate"], m["avg_cost_usd"],
             m["avg_latency_ms"], m["total_cost_usd"], concurrency, time.time()),
        )


def record_config_change(cycle: int, key: str, old: Any, new: Any, reason: str) -> None:
    with connect() as c:
        c.execute(
            "INSERT INTO config_history (cycle,key,old_value,new_value,reason,ts) "
            "VALUES (?,?,?,?,?,?)",
            (cycle, key, json.dumps(old), json.dumps(new), reason, time.time()),
        )


def recent_runs(limit: int = 10) -> list[dict]:
    with connect() as c:
        rows = c.execute(
            "SELECT r.*, t.title, t.kind FROM runs r JOIN tasks t ON t.id=r.task_id "
            "ORDER BY r.id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def all_tasks() -> list[dict]:
    with connect() as c:
        rows = c.execute("SELECT * FROM tasks ORDER BY id ASC").fetchall()
    out = []
    for r in rows:
        d = dict(r)
        try:
            d["payload"] = json.loads(d["payload"])
        except Exception:
            pass
        out.append(d)
    return out
