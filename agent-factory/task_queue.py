"""task_queue.py — a small SQLite-backed task queue.

Tasks enter via enqueue() (or seed_tasks.py). The orchestrator claims them
atomically; workers run them and record results + cost back here. This is the
single source of truth for throughput and spend.
"""
from __future__ import annotations

import json
from typing import Optional

import core

SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    kind         TEXT NOT NULL,          -- triage | summarize | research | codegen | classify
    prompt       TEXT NOT NULL,
    priority     INTEGER NOT NULL DEFAULT 5,
    complexity   REAL,                   -- filled by the router at run time
    status       TEXT NOT NULL DEFAULT 'pending',  -- pending|claimed|running|done|failed
    worker_id    TEXT,
    model_used   TEXT,
    result       TEXT,
    cost_usd     REAL DEFAULT 0,
    tokens_in    INTEGER DEFAULT 0,
    tokens_out   INTEGER DEFAULT 0,
    latency_ms   INTEGER,
    attempts     INTEGER NOT NULL DEFAULT 0,
    batch        INTEGER,
    created_at   TEXT NOT NULL,
    claimed_at   TEXT,
    finished_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_status ON tasks(status);
"""

TERMINAL = ("done", "failed")


def init_db() -> None:
    conn = core.db()
    try:
        conn.executescript(SCHEMA)
    finally:
        conn.close()


def enqueue(kind: str, prompt: str, priority: int = 5) -> int:
    conn = core.db()
    try:
        cur = conn.execute(
            "INSERT INTO tasks (kind, prompt, priority, created_at) VALUES (?,?,?,?)",
            (kind, prompt, priority, core.now_iso()),
        )
        return int(cur.lastrowid)
    finally:
        conn.close()


def claim_next(worker_id: str, batch: int) -> Optional[dict]:
    """Atomically move one highest-priority pending task to 'claimed'.

    The UPDATE...WHERE id IN (SELECT ... LIMIT 1) is a single statement, so two
    concurrent workers can never grab the same row.
    """
    conn = core.db()
    try:
        conn.execute("BEGIN IMMEDIATE;")
        row = conn.execute(
            "SELECT id FROM tasks WHERE status='pending' "
            "ORDER BY priority ASC, id ASC LIMIT 1"
        ).fetchone()
        if row is None:
            conn.execute("COMMIT;")
            return None
        tid = row["id"]
        conn.execute(
            "UPDATE tasks SET status='claimed', worker_id=?, batch=?, "
            "claimed_at=?, attempts=attempts+1 WHERE id=?",
            (worker_id, batch, core.now_iso(), tid),
        )
        conn.execute("COMMIT;")
        return dict(conn.execute("SELECT * FROM tasks WHERE id=?", (tid,)).fetchone())
    except Exception:
        conn.execute("ROLLBACK;")
        raise
    finally:
        conn.close()


def mark_running(task_id: int) -> None:
    conn = core.db()
    try:
        conn.execute("UPDATE tasks SET status='running' WHERE id=?", (task_id,))
    finally:
        conn.close()


def complete(task_id: int, *, model_used: str, result: str, cost_usd: float,
             tokens_in: int, tokens_out: int, latency_ms: int,
             complexity: float) -> None:
    conn = core.db()
    try:
        conn.execute(
            "UPDATE tasks SET status='done', model_used=?, result=?, cost_usd=?, "
            "tokens_in=?, tokens_out=?, latency_ms=?, complexity=?, finished_at=? "
            "WHERE id=?",
            (model_used, result, cost_usd, tokens_in, tokens_out, latency_ms,
             complexity, core.now_iso(), task_id),
        )
    finally:
        conn.close()


def fail(task_id: int, reason: str) -> None:
    conn = core.db()
    try:
        conn.execute(
            "UPDATE tasks SET status='failed', result=?, finished_at=? WHERE id=?",
            (f"ERROR: {reason}", core.now_iso(), task_id),
        )
    finally:
        conn.close()


def counts() -> dict:
    conn = core.db()
    try:
        rows = conn.execute(
            "SELECT status, COUNT(*) n FROM tasks GROUP BY status"
        ).fetchall()
        out = {"pending": 0, "claimed": 0, "running": 0, "done": 0, "failed": 0}
        for r in rows:
            out[r["status"]] = r["n"]
        out["total"] = sum(out.values())
        return out
    finally:
        conn.close()


def pending_kinds() -> dict:
    """How many pending tasks of each kind — drives 'what agents do I need?'."""
    conn = core.db()
    try:
        rows = conn.execute(
            "SELECT kind, COUNT(*) n FROM tasks WHERE status='pending' GROUP BY kind"
        ).fetchall()
        return {r["kind"]: r["n"] for r in rows}
    finally:
        conn.close()


def batch_stats(batch: int) -> dict:
    conn = core.db()
    try:
        rows = conn.execute(
            "SELECT status, cost_usd, latency_ms, model_used FROM tasks WHERE batch=?",
            (batch,),
        ).fetchall()
    finally:
        conn.close()
    done = [r for r in rows if r["status"] == "done"]
    failed = [r for r in rows if r["status"] == "failed"]
    total = len(done) + len(failed)
    cost = sum((r["cost_usd"] or 0) for r in rows)
    lats = [r["latency_ms"] for r in done if r["latency_ms"] is not None]
    models = {}
    for r in done:
        models[r["model_used"]] = models.get(r["model_used"], 0) + 1
    return {
        "batch": batch,
        "completed": len(done),
        "failed": len(failed),
        "total": total,
        "success_rate": (len(done) / total) if total else 1.0,
        "total_cost_usd": round(cost, 6),
        "avg_cost_usd": round(cost / len(done), 6) if done else 0.0,
        "avg_latency_ms": round(sum(lats) / len(lats), 1) if lats else 0.0,
        "model_mix": models,
    }


def global_stats() -> dict:
    conn = core.db()
    try:
        row = conn.execute(
            "SELECT COUNT(*) n, COALESCE(SUM(cost_usd),0) c, "
            "COALESCE(SUM(tokens_in),0) ti, COALESCE(SUM(tokens_out),0) to_ "
            "FROM tasks WHERE status='done'"
        ).fetchone()
        models = conn.execute(
            "SELECT model_used, COUNT(*) n, COALESCE(SUM(cost_usd),0) c "
            "FROM tasks WHERE status='done' GROUP BY model_used"
        ).fetchall()
    finally:
        conn.close()
    return {
        "done": row["n"],
        "total_cost_usd": round(row["c"], 6),
        "tokens_in": row["ti"],
        "tokens_out": row["to_"],
        "by_model": [
            {"model": m["model_used"], "tasks": m["n"], "cost_usd": round(m["c"], 6)}
            for m in models
        ],
    }


if __name__ == "__main__":
    init_db()
    print(json.dumps(counts(), indent=2))
