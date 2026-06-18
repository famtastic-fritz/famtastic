"""SQLite-backed task queue, cost ledger, agent registry, and run history.

A single file DB at data/factory.db. WAL mode so the orchestrator and the
spawned worker subprocesses can read/write concurrently without locking each
other out.
"""
import os
import sqlite3
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, "data", "factory.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    kind         TEXT NOT NULL,
    payload      TEXT NOT NULL,
    complexity   REAL NOT NULL DEFAULT 0.5,
    priority     INTEGER NOT NULL DEFAULT 5,
    status       TEXT NOT NULL DEFAULT 'queued',   -- queued|claimed|done|failed
    claimed_by   TEXT,
    model        TEXT,
    result       TEXT,
    artifact     TEXT,
    cost_usd     REAL,
    latency_ms   INTEGER,
    attempts     INTEGER NOT NULL DEFAULT 0,
    created_at   REAL NOT NULL,
    updated_at   REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS agents (
    id          TEXT PRIMARY KEY,
    pid         INTEGER,
    task_id     INTEGER,
    status      TEXT NOT NULL,                      -- spawning|busy|done|retired|crashed
    spawned_at  REAL NOT NULL,
    retired_at  REAL
);

CREATE TABLE IF NOT EXISTS ledger (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id     INTEGER,
    model       TEXT,
    tokens_in   INTEGER,
    tokens_out  INTEGER,
    usd         REAL,
    mode        TEXT,
    at          REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    batch       INTEGER,
    metric      TEXT,
    value       REAL,
    note        TEXT,
    at          REAL NOT NULL
);
"""


def connect():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    return conn


def init():
    conn = connect()
    with conn:
        conn.executescript(SCHEMA)
    conn.close()


def reset():
    """Drop the DB file entirely — used by run_demo for a clean proof run."""
    for suffix in ("", "-wal", "-shm", "-journal"):
        p = DB_PATH + suffix
        if os.path.exists(p):
            os.remove(p)
    init()


def now():
    return time.time()
