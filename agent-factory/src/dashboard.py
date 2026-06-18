"""Observability — terminal readout + static HTML dashboard.

render_terminal() prints a status block; write_html() writes a self-contained
static dashboard to dashboard/status.html (no server, no JS deps — just open it).
"""
import os
from datetime import datetime, timezone

from . import db, ledger, queue

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML_PATH = os.path.join(ROOT, "dashboard", "status.html")


def _agent_counts():
    conn = db.connect()
    rows = conn.execute("SELECT status, COUNT(*) c FROM agents GROUP BY status").fetchall()
    conn.close()
    return {r["status"]: r["c"] for r in rows}


def gather():
    tasks = queue.snapshot()
    agents = _agent_counts()
    cost = ledger.total()
    done = tasks.get("done", 0)
    return {
        "queue_depth": tasks.get("queued", 0),
        "claimed": tasks.get("claimed", 0),
        "done": done,
        "failed": tasks.get("failed", 0),
        "agents": agents,
        "active_agents": agents.get("busy", 0) + agents.get("spawning", 0),
        "total_spawned": sum(agents.values()),
        "cost_usd": cost["usd"],
        "calls": cost["calls"],
        "tokens": cost["tokens"],
        "throughput_per_dollar": round(done / cost["usd"], 2) if cost["usd"] > 0 else done,
        "by_model": ledger.by_model(),
    }


def render_terminal():
    s = gather()
    bar = "=" * 58
    lines = [
        bar,
        " AGENT FACTORY — STATUS",
        bar,
        f" Queue depth        : {s['queue_depth']}",
        f" In flight (claimed): {s['claimed']}",
        f" Completed          : {s['done']}    Failed: {s['failed']}",
        f" Active agents      : {s['active_agents']}    Total spawned: {s['total_spawned']}",
        f" Total est. cost    : ${s['cost_usd']:.6f}   ({s['calls']} calls, {s['tokens']} tok)",
        f" Throughput         : {s['throughput_per_dollar']} tasks/$",
        " Cost by model      :",
    ]
    for r in s["by_model"]:
        lines.append(f"   - {r['model']:<26} {r['calls']:>3} calls  ${r['usd']:.6f}")
    lines.append(bar)
    print("\n".join(lines), flush=True)
    return s


def write_html():
    s = gather()
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")
    rows = "".join(
        f"<tr><td>{r['model']}</td><td>{r['calls']}</td><td>${r['usd']:.6f}</td></tr>"
        for r in s["by_model"]
    ) or "<tr><td colspan=3>no calls yet</td></tr>"
    html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agent Factory — Status</title>
<style>
  :root {{ color-scheme: dark; }}
  body {{ font-family: ui-monospace, Menlo, Consolas, monospace; background:#0b0f14;
         color:#d7e0ea; margin:0; padding:32px; }}
  h1 {{ font-size:20px; letter-spacing:1px; margin:0 0 4px; }}
  .ts {{ color:#6b7a8d; margin-bottom:24px; font-size:12px; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
          gap:14px; margin-bottom:24px; }}
  .card {{ background:#121a24; border:1px solid #1e2b3a; border-radius:10px; padding:16px; }}
  .k {{ color:#7f93a8; font-size:11px; text-transform:uppercase; letter-spacing:1px; }}
  .v {{ font-size:26px; margin-top:6px; color:#5ad1a8; }}
  table {{ width:100%; border-collapse:collapse; background:#121a24;
          border:1px solid #1e2b3a; border-radius:10px; overflow:hidden; }}
  th,td {{ text-align:left; padding:10px 14px; border-bottom:1px solid #1e2b3a; font-size:13px; }}
  th {{ color:#7f93a8; text-transform:uppercase; font-size:11px; letter-spacing:1px; }}
</style></head><body>
<h1>AGENT FACTORY — STATUS</h1>
<div class="ts">generated {ts} · static snapshot · refresh by re-running the demo</div>
<div class="grid">
  <div class="card"><div class="k">Queue depth</div><div class="v">{s['queue_depth']}</div></div>
  <div class="card"><div class="k">In flight</div><div class="v">{s['claimed']}</div></div>
  <div class="card"><div class="k">Completed</div><div class="v">{s['done']}</div></div>
  <div class="card"><div class="k">Failed</div><div class="v">{s['failed']}</div></div>
  <div class="card"><div class="k">Active agents</div><div class="v">{s['active_agents']}</div></div>
  <div class="card"><div class="k">Total spawned</div><div class="v">{s['total_spawned']}</div></div>
  <div class="card"><div class="k">Est. cost (USD)</div><div class="v">${s['cost_usd']:.5f}</div></div>
  <div class="card"><div class="k">Throughput</div><div class="v">{s['throughput_per_dollar']}<span style="font-size:12px"> /$</span></div></div>
</div>
<table><thead><tr><th>Model</th><th>Calls</th><th>Est. cost</th></tr></thead>
<tbody>{rows}</tbody></table>
</body></html>
"""
    os.makedirs(os.path.dirname(HTML_PATH), exist_ok=True)
    with open(HTML_PATH, "w", encoding="utf-8") as fh:
        fh.write(html)
    return HTML_PATH
