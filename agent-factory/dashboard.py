"""dashboard.py — observability: terminal readout + static HTML.

Reads the DB (truth for tasks/cost) and data/state.json (live orchestrator
runtime) and renders:
  * a terminal status block (dashboard.render_terminal / `python dashboard.py`)
  * dashboard/index.html (static, auto-refreshing, no server needed)
"""
from __future__ import annotations

import html
import json

import core
import task_queue


def snapshot() -> dict:
    state = core.read_state()
    counts = task_queue.counts()
    g = task_queue.global_stats()
    return {"state": state, "counts": counts, "global": g}


def render_terminal() -> str:
    s = snapshot()
    st, c, g = s["state"], s["counts"], s["global"]
    active = st.get("active_workers", [])
    bar = _bar(c)
    lines = [
        "┌─ AGENT FACTORY ─────────────────────────────────────────────┐",
        f"│ batch {st.get('batch','-'):<3} "
        f" concurrency {st.get('concurrency','-')}"
        f"  esc-threshold {st.get('complexity_threshold','-')}"
        f"  poll {st.get('poll_interval_seconds','-')}s",
        f"│ queue: {bar}",
        f"│   pending {c['pending']}  running {c['running']+c['claimed']}  "
        f"done {c['done']}  failed {c['failed']}  total {c['total']}",
        f"│ active workers: {len(active)}   "
        f"spawned total: {st.get('spawned_total', 0)}",
    ]
    for w in active:
        lines.append(f"│   • {w['worker_id']}  {w['kind']:<9} task#{w['task_id']} "
                     f"({w['age_s']}s)")
    lines.append(f"│ minted kinds: {', '.join(st.get('minted_kinds', [])) or '—'}")
    lines.append(f"│ THROUGHPUT-PER-DOLLAR: "
                 f"{_tpd(g)}  (done {g['done']} for ${g['total_cost_usd']:.5f})")
    for m in g["by_model"]:
        lines.append(f"│   {m['model']:<14} {m['tasks']:>3} tasks  "
                     f"${m['cost_usd']:.5f}")
    sched = st.get("scheduler", [])
    if sched:
        jobs = ", ".join(f"{j['name']}({j['runs']}x@{j['interval_s']}s)" for j in sched)
        lines.append(f"│ scheduler: {jobs}")
    lines.append("└─────────────────────────────────────────────────────────────┘")
    return "\n".join(lines)


def _bar(c: dict, width: int = 30) -> str:
    total = max(1, c["total"])
    done = int(width * c["done"] / total)
    run = int(width * (c["running"] + c["claimed"]) / total)
    pend = width - done - run
    return "█" * done + "▒" * run + "·" * pend


def _tpd(g: dict) -> str:
    if g["total_cost_usd"] <= 0:
        return "n/a"
    return f"{g['done'] / g['total_cost_usd']:.0f} tasks/$"


def render_html() -> str:
    s = snapshot()
    st, c, g = s["state"], s["counts"], s["global"]
    active_rows = "".join(
        f"<tr><td>{html.escape(w['worker_id'])}</td><td>{html.escape(w['kind'])}</td>"
        f"<td>#{w['task_id']}</td><td>{w['age_s']}s</td></tr>"
        for w in st.get("active_workers", [])
    ) or "<tr><td colspan=4 class=dim>none active</td></tr>"
    model_rows = "".join(
        f"<tr><td>{html.escape(m['model'])}</td><td>{m['tasks']}</td>"
        f"<td>${m['cost_usd']:.5f}</td></tr>"
        for m in g["by_model"]
    ) or "<tr><td colspan=3 class=dim>no completed tasks yet</td></tr>"
    sched_rows = "".join(
        f"<tr><td>{html.escape(j['name'])}</td><td>{j['interval_s']}s</td>"
        f"<td>{j['runs']}</td><td>{j['due_in_s']}s</td></tr>"
        for j in st.get("scheduler", [])
    ) or "<tr><td colspan=4 class=dim>scheduler idle (demo mode)</td></tr>"
    tpd = _tpd(g)
    total = max(1, c["total"])
    pct_done = round(100 * c["done"] / total)
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="refresh" content="3">
<title>Agent Factory — Status</title>
<style>
  :root {{ --bg:#0b0f14; --card:#131a22; --ink:#e6edf3; --dim:#7d8a99;
           --ok:#3fb950; --warn:#d29922; --acc:#58a6ff; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:var(--bg); color:var(--ink);
          font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; padding:24px; }}
  h1 {{ font-size:18px; margin:0 0 4px; letter-spacing:.04em; }}
  .sub {{ color:var(--dim); margin-bottom:20px; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
           gap:16px; }}
  .card {{ background:var(--card); border:1px solid #20303f; border-radius:10px;
           padding:16px; }}
  .card h2 {{ font-size:12px; text-transform:uppercase; letter-spacing:.08em;
              color:var(--dim); margin:0 0 10px; }}
  .big {{ font-size:30px; font-weight:700; }}
  .acc {{ color:var(--acc); }} .ok {{ color:var(--ok); }} .dim {{ color:var(--dim); }}
  table {{ width:100%; border-collapse:collapse; }}
  td {{ padding:4px 6px; border-bottom:1px solid #1d2a36; }}
  .progress {{ height:10px; background:#1d2a36; border-radius:6px; overflow:hidden;
               margin-top:8px; }}
  .progress > span {{ display:block; height:100%; background:var(--ok);
                      width:{pct_done}%; }}
</style></head><body>
<h1>AGENT FACTORY</h1>
<div class="sub">live status · auto-refresh 3s · batch {st.get('batch','—')} ·
  generated {html.escape(st.get('ts',''))}</div>
<div class="grid">
  <div class="card"><h2>Queue depth</h2>
    <div class="big">{c['pending']}<span class="dim"> pending</span></div>
    <div class="progress"><span></span></div>
    <div class="dim">done {c['done']} · running {c['running']+c['claimed']} ·
      failed {c['failed']} · total {c['total']}</div></div>
  <div class="card"><h2>Throughput / $</h2>
    <div class="big acc">{tpd}</div>
    <div class="dim">{g['done']} done for ${g['total_cost_usd']:.5f}</div></div>
  <div class="card"><h2>Active agents</h2>
    <div class="big">{len(st.get('active_workers', []))}</div>
    <div class="dim">spawned total {st.get('spawned_total',0)} ·
      kinds: {', '.join(st.get('minted_kinds', [])) or '—'}</div></div>
  <div class="card"><h2>Self-tuned knobs</h2>
    <div>concurrency <b>{st.get('concurrency','—')}</b></div>
    <div>escalation threshold <b>{st.get('complexity_threshold','—')}</b></div>
    <div>poll interval <b>{st.get('poll_interval_seconds','—')}s</b></div></div>
</div>
<div class="grid" style="margin-top:16px">
  <div class="card"><h2>Active workers</h2>
    <table><tr><td>worker</td><td>kind</td><td>task</td><td>age</td></tr>
    {active_rows}</table></div>
  <div class="card"><h2>Spend by model</h2>
    <table><tr><td>model</td><td>tasks</td><td>cost</td></tr>
    {model_rows}</table></div>
  <div class="card"><h2>In-process scheduler</h2>
    <table><tr><td>job</td><td>interval</td><td>runs</td><td>due in</td></tr>
    {sched_rows}</table></div>
</div>
</body></html>"""


def render_all() -> None:
    core.ensure_dirs()
    (core.DASH_DIR / "index.html").write_text(render_html(), encoding="utf-8")


if __name__ == "__main__":
    render_all()
    print(render_terminal())
    print(f"\nHTML dashboard: {core.DASH_DIR / 'index.html'}")
