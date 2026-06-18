"""Task queue API on top of the SQLite store.

The queue is the single source of truth for work. Tasks enter via add()/seed
scripts; the orchestrator claims them atomically; workers complete them.
"""
import json

from . import db


def add(kind, payload, complexity=0.5, priority=5):
    conn = db.connect()
    with conn:
        cur = conn.execute(
            "INSERT INTO tasks (kind,payload,complexity,priority,status,created_at,updated_at) "
            "VALUES (?,?,?,?, 'queued', ?, ?)",
            (kind, json.dumps(payload), float(complexity), int(priority), db.now(), db.now()),
        )
        return cur.lastrowid
    conn.close()


def depth(conn=None):
    """Number of tasks still waiting to be processed."""
    own = conn is None
    conn = conn or db.connect()
    n = conn.execute("SELECT COUNT(*) FROM tasks WHERE status='queued'").fetchone()[0]
    if own:
        conn.close()
    return n


def claim_next(agent_id):
    """Atomically claim the highest-priority queued task. Returns a row dict or None."""
    conn = db.connect()
    try:
        with conn:  # transaction => atomic claim, safe across worker subprocesses
            row = conn.execute(
                "SELECT * FROM tasks WHERE status='queued' "
                "ORDER BY priority ASC, complexity DESC, id ASC LIMIT 1"
            ).fetchone()
            if not row:
                return None
            conn.execute(
                "UPDATE tasks SET status='claimed', claimed_by=?, attempts=attempts+1, updated_at=? "
                "WHERE id=? AND status='queued'",
                (agent_id, db.now(), row["id"]),
            )
            if conn.total_changes == 0:
                return None  # lost a race with another worker
            return dict(row)
    finally:
        conn.close()


def complete(task_id, model, result, artifact, cost_usd, latency_ms, ok=True):
    conn = db.connect()
    with conn:
        conn.execute(
            "UPDATE tasks SET status=?, model=?, result=?, artifact=?, cost_usd=?, "
            "latency_ms=?, updated_at=? WHERE id=?",
            (
                "done" if ok else "failed",
                model,
                result,
                artifact,
                float(cost_usd),
                int(latency_ms),
                db.now(),
                task_id,
            ),
        )
    conn.close()


def snapshot():
    """Counts by status — used by the dashboard and self-improvement loop."""
    conn = db.connect()
    rows = conn.execute("SELECT status, COUNT(*) c FROM tasks GROUP BY status").fetchall()
    conn.close()
    return {r["status"]: r["c"] for r in rows}
