"""Observability — terminal readout + static HTML snapshot.

`python -m factory.dashboard`           -> prints a terminal status board
`python -m factory.dashboard --html`    -> also writes public/dashboard.html
"""
from __future__ import annotations

import argparse
import html
import time

from . import db
from .paths import DASHBOARD_HTML, load_config


def gather() -> dict:
    cfg = load_config()
    counts = db.counts_by_status()
    with db.connect() as c:
        batches = c.execute(
            "SELECT * FROM batches ORDER BY id DESC LIMIT 5"
        ).fetchall()
        nbatch = c.execute("SELECT COUNT(*) FROM batches").fetchone()[0]
        by_tier = c.execute(
            "SELECT tier, COUNT(*) n, COALESCE(SUM(cost_usd),0) cost FROM runs "
            "GROUP BY tier ORDER BY cost DESC"
        ).fetchall()
        ntasks = c.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
    return {
        "cfg": cfg,
        "counts": counts,
        "queue_depth": db.queue_depth(),
        "total_cost": db.total_cost(),
        "ntasks": ntasks,
        "nbatch": nbatch,
        "batches": [dict(b) for b in batches],
        "by_tier": [dict(t) for t in by_tier],
        "recent": db.recent_runs(8),
    }


def terminal() -> str:
    d = gather()
    tun = d["cfg"]["tunables"]
    out = []
    out.append("=" * 64)
    out.append("  AGENT FACTORY — STATUS DASHBOARD")
    out.append("=" * 64)
    out.append(f"  Tasks total       : {d['ntasks']}")
    out.append(f"  Queue depth       : {d['queue_depth']}")
    out.append(f"  By status         : " +
               ", ".join(f"{k}={v}" for k, v in sorted(d["counts"].items())))
    out.append(f"  Total spend (est) : ${d['total_cost']:.5f}")
    out.append(f"  Batches run       : {d['nbatch']}")
    out.append(f"  Concurrency (cur) : max={tun['max_concurrency']} min={tun['min_concurrency']}")
    out.append(f"  Escalation thresh : {tun['complexity_escalation_threshold']}")
    out.append("-" * 64)
    out.append("  COST BY TIER (throughput-per-dollar)")
    for t in d["by_tier"]:
        out.append(f"    {t['tier']:<14} runs={t['n']:<4} cost=${t['cost']:.5f}")
    out.append("-" * 64)
    out.append("  RECENT RUNS")
    for r in d["recent"]:
        ok = "OK " if r["success"] else "ERR"
        out.append(f"    [{ok}] #{r['task_id']:<3} {r['kind']:<14} "
                   f"{r['tier']:<12} ${r['cost_usd']:.5f} {r['latency_ms']}ms")
    out.append("-" * 64)
    out.append("  SELF-IMPROVEMENT (last batches)")
    for b in d["batches"]:
        out.append(f"    cycle {b['cycle']:<3} success={b['success_rate']:.0%} "
                   f"avg_cost=${b['avg_cost_usd']:.5f} conc={b['concurrency']}")
    out.append("=" * 64)
    return "\n".join(out)


def render_html() -> str:
    d = gather()
    tun = d["cfg"]["tunables"]
    rows = "".join(
        f"<tr><td>{'✅' if r['success'] else '❌'}</td><td>#{r['task_id']}</td>"
        f"<td>{html.escape(r['kind'])}</td><td>{html.escape(r['title'][:48])}</td>"
        f"<td>{html.escape(r['tier'])}</td><td>${r['cost_usd']:.5f}</td>"
        f"<td>{r['latency_ms']}ms</td></tr>"
        for r in d["recent"]
    )
    tiers = "".join(
        f"<tr><td>{html.escape(t['tier'])}</td><td>{t['n']}</td>"
        f"<td>${t['cost']:.5f}</td></tr>" for t in d["by_tier"]
    )
    batches = "".join(
        f"<tr><td>{b['cycle']}</td><td>{b['success_rate']:.0%}</td>"
        f"<td>${b['avg_cost_usd']:.5f}</td><td>{b['concurrency']}</td></tr>"
        for b in d["batches"]
    )
    counts = ", ".join(f"{k}={v}" for k, v in sorted(d["counts"].items()))
    return f"""<!doctype html><html><head><meta charset="utf-8">
<title>Agent Factory — Dashboard</title>
<meta http-equiv="refresh" content="10">
<style>
 body{{font-family:ui-monospace,Menlo,monospace;background:#0b0f14;color:#e6edf3;margin:0;padding:24px}}
 h1{{color:#F89728;margin:0 0 4px}} .sub{{color:#008542;margin:0 0 20px}}
 .cards{{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:22px}}
 .card{{background:#11161d;border:1px solid #1f2730;border-radius:10px;padding:14px 18px;min-width:150px}}
 .card .k{{font-size:12px;color:#8b949e}} .card .v{{font-size:24px;font-weight:700}}
 table{{border-collapse:collapse;width:100%;margin:8px 0 24px;font-size:13px}}
 th,td{{text-align:left;padding:6px 10px;border-bottom:1px solid #1f2730}}
 th{{color:#8b949e;font-weight:600}} h2{{color:#F89728;font-size:15px;border-left:3px solid #008542;padding-left:8px}}
</style></head><body>
<h1>AGENT FACTORY</h1><p class="sub">self-managing multi-agent system · auto-refresh 10s</p>
<div class="cards">
 <div class="card"><div class="k">QUEUE DEPTH</div><div class="v">{d['queue_depth']}</div></div>
 <div class="card"><div class="k">TASKS TOTAL</div><div class="v">{d['ntasks']}</div></div>
 <div class="card"><div class="k">TOTAL SPEND (est)</div><div class="v">${d['total_cost']:.4f}</div></div>
 <div class="card"><div class="k">BATCHES</div><div class="v">{d['nbatch']}</div></div>
 <div class="card"><div class="k">MAX CONCURRENCY</div><div class="v">{tun['max_concurrency']}</div></div>
 <div class="card"><div class="k">ESCALATION θ</div><div class="v">{tun['complexity_escalation_threshold']}</div></div>
</div>
<p style="color:#8b949e">status: {html.escape(counts)}</p>
<h2>Recent runs</h2><table><tr><th></th><th>task</th><th>kind</th><th>title</th><th>tier</th><th>cost</th><th>latency</th></tr>{rows}</table>
<h2>Cost by tier</h2><table><tr><th>tier</th><th>runs</th><th>cost</th></tr>{tiers}</table>
<h2>Self-improvement (recent batches)</h2><table><tr><th>cycle</th><th>success</th><th>avg cost</th><th>concurrency</th></tr>{batches}</table>
<p style="color:#586069;font-size:11px">generated {time.strftime('%Y-%m-%d %H:%M:%S')} · sandboxed, no live spend</p>
</body></html>"""


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Agent Factory dashboard")
    ap.add_argument("--html", action="store_true", help="also write public/dashboard.html")
    args = ap.parse_args(argv)
    print(terminal())
    if args.html:
        DASHBOARD_HTML.write_text(render_html())
        print(f"\nWrote {DASHBOARD_HTML}")
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
