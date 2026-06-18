"""Observability — terminal readout and a static dashboard.html.

    python -m src.dashboard          # print a terminal readout
    python -m src.dashboard --html   # also (re)write dashboard.html

Reads the queue DB, the cost ledger, and the orchestrator's data/state.json.
"""
import argparse
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from src import queue_db  # noqa: E402

STATE_PATH = os.path.join(ROOT, "data", "state.json")
HTML_PATH = os.path.join(ROOT, "dashboard.html")


def _load_state():
    if os.path.exists(STATE_PATH):
        with open(STATE_PATH) as f:
            return json.load(f)
    return {}


def _bar(n, total, width=24):
    if total <= 0:
        return " " * width
    filled = int(round(width * n / total))
    return "█" * filled + "·" * (width - filled)


def terminal():
    counts = queue_db.counts()
    st = queue_db.stats()
    state = _load_state()
    total = max(1, counts["total"])
    active = state.get("active_workers", [])

    out = []
    out.append("=" * 60)
    out.append("  AGENT FACTORY — STATUS")
    out.append("=" * 60)
    out.append(f"  updated      : {state.get('updated', 'n/a')}   mode: {state.get('mode','n/a')}")
    out.append(f"  live models  : {state.get('live_models', False)} (False = offline stub, no spend)")
    cfg = state.get("config", {})
    if cfg:
        out.append(f"  config       : concurrency={cfg.get('concurrency')} "
                   f"tasks/worker={cfg.get('tasks_per_worker')}")
    out.append("-" * 60)
    out.append("  QUEUE DEPTH")
    for s in ("pending", "claimed", "running", "done", "failed"):
        out.append(f"    {s:<8} {counts[s]:>4}  {_bar(counts[s], total)}")
    out.append("-" * 60)
    out.append("  ACTIVE AGENTS")
    if active:
        for w in active:
            out.append(f"    {w['worker_id']:<5} spec={w['spec']:<9} up={w['uptime_sec']}s")
    else:
        out.append("    (none active)")
    out.append("-" * 60)
    out.append("  THROUGHPUT & COST")
    out.append(f"    tasks done       : {st['done']} / {st['total']}")
    out.append(f"    success rate     : {st['success_rate']:.1%}")
    out.append(f"    total cost       : ${st['total_cost_usd']:.6f}")
    out.append(f"    avg cost / task  : ${st['avg_cost_usd']:.6f}")
    out.append(f"    avg latency      : {st['avg_latency_ms']} ms")
    out.append(f"    tokens in/out    : {st['tokens_in']} / {st['tokens_out']}")
    out.append(f"    tier usage       : {json.dumps(st['by_tier'])}")
    if st["total_cost_usd"] > 0:
        tpd = st["done"] / st["total_cost_usd"]
        out.append(f"    throughput/$     : {tpd:.0f} tasks per dollar")
    out.append("=" * 60)
    text = "\n".join(out)
    print(text)
    return text


def write_html():
    counts = queue_db.counts()
    st = queue_db.stats()
    state = _load_state()
    recent = queue_db.recent(25)
    total = max(1, counts["total"])

    def row(t):
        return (f"<tr><td>{t['id']}</td><td>{t['type']}</td><td>{t['title']}</td>"
                f"<td><span class='st {t['status']}'>{t['status']}</span></td>"
                f"<td>{t['tier'] or ''}</td><td>{t['model'] or ''}</td>"
                f"<td>{('%.6f' % t['cost_usd']) if t['cost_usd'] is not None else ''}</td>"
                f"<td>{t['confidence'] if t['confidence'] is not None else ''}</td></tr>")

    def qbar(s):
        pct = 100.0 * counts[s] / total
        return (f"<div class='qrow'><span>{s}</span>"
                f"<div class='track'><div class='fill {s}' style='width:{pct:.1f}%'></div></div>"
                f"<b>{counts[s]}</b></div>")

    workers = "".join(
        f"<li><b>{w['worker_id']}</b> · {w['spec']} · {w['uptime_sec']}s</li>"
        for w in state.get("active_workers", [])
    ) or "<li>(none active)</li>"

    tpd = (st["done"] / st["total_cost_usd"]) if st["total_cost_usd"] > 0 else 0
    html = f"""<!doctype html><html><head><meta charset="utf-8">
<title>Agent Factory Status</title><meta http-equiv="refresh" content="5">
<style>
 body{{font:14px ui-monospace,Menlo,Consolas,monospace;background:#0b0f14;color:#d7e0ea;margin:0;padding:24px}}
 h1{{font-size:18px;letter-spacing:.08em;color:#7fd1ff}}
 .grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}}
 .card{{background:#121922;border:1px solid #1e2a36;border-radius:10px;padding:14px}}
 .card .k{{color:#7a8aa0;font-size:11px;text-transform:uppercase;letter-spacing:.1em}}
 .card .v{{font-size:22px;margin-top:6px;color:#eafff2}}
 .qrow{{display:flex;align-items:center;gap:10px;margin:6px 0}}
 .qrow span{{width:70px;color:#7a8aa0}} .qrow b{{width:36px;text-align:right}}
 .track{{flex:1;background:#0c1218;border-radius:6px;height:14px;overflow:hidden}}
 .fill{{height:100%}} .fill.pending{{background:#caa24a}} .fill.claimed{{background:#5a86c2}}
 .fill.running{{background:#4aa3c2}} .fill.done{{background:#48b07a}} .fill.failed{{background:#c25a5a}}
 table{{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}}
 th,td{{text-align:left;padding:6px 8px;border-bottom:1px solid #1a232e}}
 th{{color:#7a8aa0;text-transform:uppercase;font-size:10px;letter-spacing:.1em}}
 .st{{padding:2px 7px;border-radius:10px;font-size:11px}}
 .st.done{{background:#143a28;color:#7be0a8}} .st.failed{{background:#3a1414;color:#e08a8a}}
 .st.pending{{background:#3a3014;color:#e0c87b}} .st.running,.st.claimed{{background:#142a3a;color:#7bc0e0}}
 ul{{list-style:none;padding:0}} li{{padding:3px 0;color:#cfe}}
 .muted{{color:#5a6a80;font-size:12px}}
</style></head><body>
<h1>⚙ AGENT FACTORY — STATUS</h1>
<div class="muted">updated {state.get('updated','n/a')} · mode {state.get('mode','n/a')} ·
 live models: {state.get('live_models', False)} (False = offline stub, no spend) ·
 source: awesome-trading-agents</div>
<div class="grid">
 <div class="card"><div class="k">Tasks done</div><div class="v">{st['done']}/{st['total']}</div></div>
 <div class="card"><div class="k">Success rate</div><div class="v">{st['success_rate']:.0%}</div></div>
 <div class="card"><div class="k">Total cost</div><div class="v">${st['total_cost_usd']:.4f}</div></div>
 <div class="card"><div class="k">Throughput / $</div><div class="v">{tpd:.0f}</div></div>
</div>
<div class="grid" style="grid-template-columns:2fr 1fr">
 <div class="card"><div class="k">Queue depth</div>{qbar('pending')}{qbar('claimed')}{qbar('running')}{qbar('done')}{qbar('failed')}</div>
 <div class="card"><div class="k">Active agents</div><ul>{workers}</ul>
   <div class="k" style="margin-top:10px">Tier usage</div>
   <div class="muted">{json.dumps(st['by_tier'])}</div></div>
</div>
<div class="card"><div class="k">Recent tasks</div>
<table><tr><th>#</th><th>type</th><th>title</th><th>status</th><th>tier</th><th>model</th><th>cost $</th><th>conf</th></tr>
{''.join(row(t) for t in recent)}</table></div>
</body></html>"""
    with open(HTML_PATH, "w") as f:
        f.write(html)
    print(f"Wrote {os.path.relpath(HTML_PATH, ROOT)}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--html", action="store_true", help="also (re)write dashboard.html")
    args = p.parse_args()
    terminal()
    if args.html:
        write_html()
