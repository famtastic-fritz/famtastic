"""Observability: terminal readout + a static HTML dashboard.

No server required for the HTML (it's a static file you can open). A tiny
optional HTTP server is included for convenience.
"""
from __future__ import annotations

import datetime as _dt
import json

import queue_db
import router
from config_io import load_config
from factory_paths import DASHBOARD_HTML, assert_inside


def snapshot() -> dict:
    m = queue_db.metrics()
    cfg = load_config()
    tasks = queue_db.all_tasks()
    return {
        "ts": _dt.datetime.now().isoformat(timespec="seconds"),
        "metrics": m,
        "total_cost_usd": router.read_total_cost(),
        "concurrency_max": cfg["concurrency"]["current_max"],
        "complexity_threshold": cfg["routing"]["complexity_threshold"],
        "base_interval_s": cfg["scheduler"]["base_interval_seconds"],
        "active_workers": [t["claimed_by"] for t in tasks if t["status"] == "claimed"],
        "tasks": tasks,
    }


def terminal_readout() -> str:
    s = snapshot()
    m = s["metrics"]
    bar_total = max(m["total"], 1)

    def bar(n):
        width = 24
        filled = int(width * n / bar_total)
        return "█" * filled + "·" * (width - filled)

    lines = [
        "╔══════════════════════════════════════════════════════════════╗",
        "║              AGENT FACTORY — STATUS DASHBOARD                 ║",
        "╠══════════════════════════════════════════════════════════════╣",
        f"║ {s['ts']}",
        f"║ Queue depth (pending):  {m['pending']:>3}   {bar(m['pending'])}",
        f"║ In flight (claimed):    {m['claimed']:>3}   {bar(m['claimed'])}",
        f"║ Done:                   {m['done']:>3}   {bar(m['done'])}",
        f"║ Failed:                 {m['failed']:>3}   {bar(m['failed'])}",
        "║ ----------------------------------------------------------",
        f"║ Success rate:        {m['success_rate']:.0%}",
        f"║ Avg latency:         {m['avg_latency_s']}s",
        f"║ Total cost:          ${m['total_cost_usd']:.4f}",
        f"║ Cost / task:         ${m['cost_per_task_usd']:.4f}",
        "║ ----------------------------------------------------------",
        f"║ Concurrency max:     {s['concurrency_max']}",
        f"║ Complexity thresh:   {s['complexity_threshold']}",
        f"║ Scheduler base int:  {s['base_interval_s']}s",
        f"║ Active workers:      {', '.join(s['active_workers']) or '(none)'}",
        "╚══════════════════════════════════════════════════════════════╝",
    ]
    return "\n".join(lines)


def write_html() -> str:
    s = snapshot()
    m = s["metrics"]
    rows = "\n".join(
        f"<tr class='{t['status']}'><td>{t['id']}</td><td>{t['type']}</td>"
        f"<td>{t['title']}</td><td><span class='badge {t['status']}'>{t['status']}</span></td>"
        f"<td>{t['model_used'] or '—'}</td><td>${(t['cost_usd'] or 0):.4f}</td>"
        f"<td>{t.get('claimed_by') or '—'}</td></tr>"
        for t in s["tasks"]
    )
    html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="refresh" content="5">
<title>Agent Factory · Dashboard</title>
<style>
  :root {{ color-scheme: dark; }}
  body {{ font-family: ui-monospace,Menlo,Consolas,monospace; background:#0b0e14;
          color:#cdd6f4; margin:0; padding:2rem; }}
  h1 {{ font-size:1.4rem; letter-spacing:.04em; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
           gap:1rem; margin:1.5rem 0; }}
  .card {{ background:#151a23; border:1px solid #232a36; border-radius:12px;
           padding:1rem; }}
  .card .k {{ font-size:.75rem; opacity:.6; text-transform:uppercase; }}
  .card .v {{ font-size:1.8rem; font-weight:700; margin-top:.3rem; }}
  table {{ width:100%; border-collapse:collapse; font-size:.85rem; }}
  th,td {{ text-align:left; padding:.5rem .6rem; border-bottom:1px solid #232a36; }}
  th {{ opacity:.6; font-weight:600; }}
  .badge {{ padding:.15rem .5rem; border-radius:999px; font-size:.7rem; }}
  .badge.done {{ background:#1e3a2a; color:#a6e3a1; }}
  .badge.pending {{ background:#3a371e; color:#f9e2af; }}
  .badge.claimed {{ background:#1e2e3a; color:#89dceb; }}
  .badge.failed {{ background:#3a1e22; color:#f38ba8; }}
  .accent {{ color:#89b4fa; }}
  footer {{ opacity:.5; font-size:.75rem; margin-top:2rem; }}
</style></head>
<body>
  <h1>🏭 AGENT FACTORY <span class="accent">· live dashboard</span></h1>
  <div style="opacity:.6">{s['ts']} · auto-refresh 5s · offline-safe</div>
  <div class="grid">
    <div class="card"><div class="k">Queue depth</div><div class="v">{m['pending']}</div></div>
    <div class="card"><div class="k">In flight</div><div class="v">{m['claimed']}</div></div>
    <div class="card"><div class="k">Done</div><div class="v accent">{m['done']}</div></div>
    <div class="card"><div class="k">Failed</div><div class="v">{m['failed']}</div></div>
    <div class="card"><div class="k">Success</div><div class="v">{m['success_rate']:.0%}</div></div>
    <div class="card"><div class="k">Total cost</div><div class="v">${m['total_cost_usd']:.4f}</div></div>
    <div class="card"><div class="k">Cost / task</div><div class="v">${m['cost_per_task_usd']:.4f}</div></div>
    <div class="card"><div class="k">Avg latency</div><div class="v">{m['avg_latency_s']}s</div></div>
    <div class="card"><div class="k">Concurrency max</div><div class="v">{s['concurrency_max']}</div></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Type</th><th>Title</th><th>Status</th>
    <th>Model</th><th>Cost</th><th>Worker</th></tr></thead>
    <tbody>{rows}</tbody>
  </table>
  <footer>Self-contained sandbox · no live spend · scheduling stays in-process.
  Data: data/factory.db · Cost ledger: logs/COSTS.log</footer>
</body></html>"""
    assert_inside(DASHBOARD_HTML)
    DASHBOARD_HTML.write_text(html, encoding="utf-8")
    return str(DASHBOARD_HTML)


if __name__ == "__main__":
    import sys
    if "--html" in sys.argv:
        print("Wrote", write_html())
    elif "--json" in sys.argv:
        print(json.dumps(snapshot(), indent=2, default=str))
    else:
        print(terminal_readout())
