"""SQLite-backed task queue for the Agent Factory.

A single file (data/factory.db) is shared by the orchestrator and every spawned
worker subprocess. Claims are atomic: a worker grabs the next pending task inside
a BEGIN IMMEDIATE transaction so two workers can never take the same task.

Stdlib only. No external dependencies.
"""
import json
import os
import sqlite3
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, "data", "factory.db")

STATUSES = ("pending", "claimed", "running", "done", "failed")


def _connect(db_path=DB_PATH):
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=30, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=30000;")
    return conn


def init_db(db_path=DB_PATH):
    conn = _connect(db_path)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS tasks (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            type         TEXT NOT NULL,
            title        TEXT NOT NULL,
            payload      TEXT NOT NULL,
            priority     INTEGER NOT NULL DEFAULT 5,
            status       TEXT NOT NULL DEFAULT 'pending',
            attempts     INTEGER NOT NULL DEFAULT 0,
            worker_id    TEXT,
            tier         TEXT,
            model        TEXT,
            confidence   REAL,
            tokens_in    INTEGER,
            tokens_out   INTEGER,
            cost_usd     REAL,
            latency_ms   INTEGER,
            result       TEXT,
            error        TEXT,
            created_at   REAL NOT NULL,
            started_at   REAL,
            finished_at  REAL
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status, priority, id);
        """
    )
    conn.close()


def enqueue(task_type, title, payload, priority=5, db_path=DB_PATH):
    conn = _connect(db_path)
    cur = conn.execute(
        "INSERT INTO tasks (type, title, payload, priority, status, created_at) "
        "VALUES (?, ?, ?, ?, 'pending', ?)",
        (task_type, title, json.dumps(payload), priority, time.time()),
    )
    task_id = cur.lastrowid
    conn.close()
    return task_id


def claim_next(worker_id, db_path=DB_PATH):
    """Atomically claim the highest-priority pending task. Returns a dict or None."""
    conn = _connect(db_path)
    try:
        conn.execute("BEGIN IMMEDIATE;")
        row = conn.execute(
            "SELECT * FROM tasks WHERE status='pending' "
            "ORDER BY priority ASC, id ASC LIMIT 1"
        ).fetchone()
        if row is None:
            conn.execute("COMMIT;")
            return None
        conn.execute(
            "UPDATE tasks SET status='claimed', worker_id=?, attempts=attempts+1, "
            "started_at=? WHERE id=?",
            (worker_id, time.time(), row["id"]),
        )
        conn.execute("COMMIT;")
        return dict(row)
    except Exception:
        conn.execute("ROLLBACK;")
        raise
    finally:
        conn.close()


def mark_running(task_id, tier, model, db_path=DB_PATH):
    conn = _connect(db_path)
    conn.execute(
        "UPDATE tasks SET status='running', tier=?, model=? WHERE id=?",
        (tier, model, task_id),
    )
    conn.close()


def complete(task_id, result, tier, model, confidence, tokens_in, tokens_out,
             cost_usd, latency_ms, db_path=DB_PATH):
    conn = _connect(db_path)
    conn.execute(
        "UPDATE tasks SET status='done', result=?, tier=?, model=?, confidence=?, "
        "tokens_in=?, tokens_out=?, cost_usd=?, latency_ms=?, finished_at=? "
        "WHERE id=?",
        (json.dumps(result), tier, model, confidence, tokens_in, tokens_out,
         cost_usd, latency_ms, time.time(), task_id),
    )
    conn.close()


def fail(task_id, error, db_path=DB_PATH):
    conn = _connect(db_path)
    conn.execute(
        "UPDATE tasks SET status='failed', error=?, finished_at=? WHERE id=?",
        (str(error), time.time(), task_id),
    )
    conn.close()


def requeue_stale(timeout_sec=120, db_path=DB_PATH):
    """Return claimed/running tasks that have been stuck too long to pending."""
    conn = _connect(db_path)
    cutoff = time.time() - timeout_sec
    cur = conn.execute(
        "UPDATE tasks SET status='pending', worker_id=NULL "
        "WHERE status IN ('claimed','running') AND started_at < ?",
        (cutoff,),
    )
    n = cur.rowcount
    conn.close()
    return n


def counts(db_path=DB_PATH):
    conn = _connect(db_path)
    out = {s: 0 for s in STATUSES}
    for row in conn.execute("SELECT status, COUNT(*) c FROM tasks GROUP BY status"):
        out[row["status"]] = row["c"]
    out["total"] = sum(out[s] for s in STATUSES)
    conn.close()
    return out


def pending_count(db_path=DB_PATH):
    conn = _connect(db_path)
    n = conn.execute("SELECT COUNT(*) c FROM tasks WHERE status='pending'").fetchone()["c"]
    conn.close()
    return n


def stats(db_path=DB_PATH):
    """Aggregate stats for the dashboard and self-improvement loop."""
    conn = _connect(db_path)
    row = conn.execute(
        "SELECT "
        " COUNT(*) total, "
        " SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) done, "
        " SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) failed, "
        " COALESCE(SUM(cost_usd),0) total_cost, "
        " COALESCE(AVG(cost_usd),0) avg_cost, "
        " COALESCE(AVG(latency_ms),0) avg_latency, "
        " COALESCE(AVG(confidence),0) avg_confidence, "
        " COALESCE(SUM(tokens_in),0) tokens_in, "
        " COALESCE(SUM(tokens_out),0) tokens_out "
        "FROM tasks"
    ).fetchone()
    by_tier = {}
    for r in conn.execute(
        "SELECT tier, COUNT(*) n, COALESCE(SUM(cost_usd),0) cost "
        "FROM tasks WHERE tier IS NOT NULL GROUP BY tier"
    ):
        by_tier[r["tier"]] = {"n": r["n"], "cost": round(r["cost"], 6)}
    conn.close()
    done = row["done"] or 0
    failed = row["failed"] or 0
    finished = done + failed
    return {
        "total": row["total"] or 0,
        "done": done,
        "failed": failed,
        "success_rate": (done / finished) if finished else 0.0,
        "total_cost_usd": round(row["total_cost"], 6),
        "avg_cost_usd": round(row["avg_cost"], 6),
        "avg_latency_ms": round(row["avg_latency"], 1),
        "avg_confidence": round(row["avg_confidence"], 3),
        "tokens_in": row["tokens_in"],
        "tokens_out": row["tokens_out"],
        "by_tier": by_tier,
    }


def recent(limit=20, db_path=DB_PATH):
    conn = _connect(db_path)
    rows = [dict(r) for r in conn.execute(
        "SELECT id, type, title, status, tier, model, cost_usd, confidence, "
        "latency_ms FROM tasks ORDER BY id DESC LIMIT ?", (limit,)
    )]
    conn.close()
    return rows


if __name__ == "__main__":
    init_db()
    print("Initialized", DB_PATH)
    print(counts())
