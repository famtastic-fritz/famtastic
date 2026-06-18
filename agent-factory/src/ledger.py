"""Running cost ledger. Records every (estimated) model charge to the DB and to
logs/COSTS.log, and can report the running total. No money ever moves — these
are estimates for throughput-per-dollar optimization only.
"""
from . import db, log


def record(task_id, model, tokens_in, tokens_out, usd, mode):
    conn = db.connect()
    with conn:
        conn.execute(
            "INSERT INTO ledger (task_id,model,tokens_in,tokens_out,usd,mode,at) "
            "VALUES (?,?,?,?,?,?,?)",
            (task_id, model, tokens_in, tokens_out, usd, mode, db.now()),
        )
    conn.close()
    log.cost(model, task_id, tokens_in, tokens_out, usd, mode)


def total():
    conn = db.connect()
    row = conn.execute(
        "SELECT COALESCE(SUM(usd),0) usd, COALESCE(SUM(tokens_in+tokens_out),0) tok, "
        "COUNT(*) calls FROM ledger"
    ).fetchone()
    conn.close()
    return {"usd": row["usd"], "tokens": row["tok"], "calls": row["calls"]}


def by_model():
    conn = db.connect()
    rows = conn.execute(
        "SELECT model, COUNT(*) calls, SUM(usd) usd FROM ledger GROUP BY model ORDER BY usd DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
