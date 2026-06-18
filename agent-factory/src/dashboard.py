"""Observability: a static HTML dashboard + a terminal readout.

`render()` writes dashboard/status.html and returns a compact text block the
orchestrator prints to the console. No server needed — open the file directly,
or run `python3 src/dashboard.py --serve` for a localhost view (sandboxed).
"""
from __future__ import annotations

import sys

import queue as q
from common import DASHBOARD_DIR, load_config, now_iso

HTML = """<!doctype html><html><head><meta charset="utf-8">
<title>Agent Factory — Status</title>
<meta http-equiv="refresh" content="3">
<style>
 body{{font:14px/1.5 ui-monospace,Menlo,monospace;background:#0b0e14;color:#cbd5e1;margin:0;padding:24px}}
 h1{{color:#e2e8f0;font-size:20px;margin:0 0 4px}} .sub{{color:#64748b;margin-bottom:20px}}
 .grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px}}
 .card{{background:#111827;border:1px solid #1f2937;border-radius:10px;padding:14px}}
 .k{{color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.05em}}
 .v{{color:#f1f5f9;font-size:26px;font-weight:600;margin-top:4px}}
 .good{{color:#34d399}} .warn{{color:#fbbf24}} table{{width:100%;border-collapse:collapse}}
 th,td{{text-align:left;padding:6px 10px;border-bottom:1px solid #1f2937;font-size:13px}}
 th{{color:#64748b;font-weight:500}} .pill{{padding:2px 8px;border-radius:999px;font-size:11px}}
 .working{{background:#064e3b;color:#34d399}} .idle{{background:#1e293b;color:#94a3b8}}
 .retired{{background:#3f1d2e;color:#fb7185}} .spawned{{background:#1e3a5f;color:#60a5fa}}
</style></head><body>
<h1>🏭 Agent Factory — Live Status</h1><div class="sub">updated {ts} · auto-refresh 3s · sandboxed</div>
<div class="grid">
 <div class="card"><div class="k">Queue depth</div><div class="v">{pending}</div></div>
 <div class="card"><div class="k">Active agents</div><div class="v">{active}</div></div>
 <div class="card"><div class="k">Tasks done</div><div class="v good">{done}</div></div>
 <div class="card"><div class="k">Failed</div><div class="v {failcls}">{failed}</div></div>
 <div class="card"><div class="k">Success rate</div><div class="v">{sr:.0%}</div></div>
 <div class="card"><div class="k">Total cost</div><div class="v">${cost:.5f}</div></div>
 <div class="card"><div class="k">Avg latency</div><div class="v">{lat:.0f}ms</div></div>
 <div class="card"><div class="k">Max workers</div><div class="v">{maxw}</div></div>
</div>
<h3 style="color:#94a3b8">Worker agents</h3>
<table><tr><th>worker</th><th>pid</th><th>status</th><th>tasks</th><th>last seen</th></tr>
{wrows}</table>
<h3 style="color:#94a3b8;margin-top:24px">Recent tasks</h3>
<table><tr><th>id</th><th>type</th><th>status</th><th>model</th><th>cost</th><th>latency</th></tr>
{trows}</table>
</body></html>"""


def render() -> str:
    s = q.stats()
    cfg = load_config()
    with q.connect() as conn:
        workers = conn.execute("SELECT * FROM workers ORDER BY spawned_at DESC LIMIT 12").fetchall()
        tasks = conn.execute("SELECT * FROM tasks ORDER BY id DESC LIMIT 12").fetchall()

    wrows = "".join(
        f"<tr><td>{w['worker_id']}</td><td>{w['pid'] or '-'}</td>"
        f"<td><span class='pill {w['status']}'>{w['status']}</span></td>"
        f"<td>{w['tasks_done']}</td><td>{w['last_seen'] or '-'}</td></tr>"
        for w in workers) or "<tr><td colspan=5>no workers yet</td></tr>"
    trows = "".join(
        f"<tr><td>{t['id']}</td><td>{t['type']}</td><td>{t['status']}</td>"
        f"<td>{t['model_used'] or '-'}</td>"
        f"<td>{('$%.5f' % t['cost_usd']) if t['cost_usd'] else '-'}</td>"
        f"<td>{(str(t['latency_ms'])+'ms') if t['latency_ms'] else '-'}</td></tr>"
        for t in tasks) or "<tr><td colspan=6>no tasks</td></tr>"

    html = HTML.format(
        ts=now_iso(), pending=s["pending"], active=s["active_workers"], done=s["done"],
        failed=s["failed"], failcls="good" if s["failed"] == 0 else "warn",
        sr=s["success_rate"], cost=s["total_cost_usd"], lat=s["avg_latency_ms"],
        maxw=cfg["tunables"]["max_workers"], wrows=wrows, trows=trows,
    )
    out = DASHBOARD_DIR / "status.html"
    out.write_text(html)

    return (
        f"┌─ AGENT FACTORY STATUS ─ {now_iso()} ─────────────\n"
        f"│ queue={s['pending']:<3} active_agents={s['active_workers']:<3} "
        f"done={s['done']:<3} failed={s['failed']:<3} success={s['success_rate']:.0%}\n"
        f"│ total_cost=${s['total_cost_usd']:.5f}  avg_latency={s['avg_latency_ms']:.0f}ms  "
        f"max_workers={cfg['tunables']['max_workers']}\n"
        f"└─ dashboard → {out.relative_to(out.parents[2])}\n"
    )


if __name__ == "__main__":
    if "--serve" in sys.argv:
        import http.server
        import os
        import socketserver
        os.chdir(DASHBOARD_DIR)
        render()
        port = 8787
        with socketserver.TCPServer(("127.0.0.1", port), http.server.SimpleHTTPRequestHandler) as httpd:
            print(f"dashboard at http://127.0.0.1:{port}/status.html (sandboxed, ctrl-c to stop)")
            httpd.serve_forever()
    else:
        print(render())
