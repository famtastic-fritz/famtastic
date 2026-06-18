#!/usr/bin/env python3
"""
serve.py — FAMtastic Agency local sandbox.

Builds every qualified lead into a site, generates a preview hub, serves it on
http://localhost:8788, and opens your browser. Pure stdlib — no installs.

Run it:
    python3 agency/sandbox/serve.py
    python3 agency/sandbox/serve.py --port 9000 --no-open

You watch the whole pipeline: leads -> generated sites -> live preview, all on
your own machine in a sandbox you control.
"""
from __future__ import annotations
import argparse
import http.server
import json
import socketserver
import threading
import webbrowser
from pathlib import Path

import generate  # local module

HERE = Path(__file__).resolve().parent
OUT = HERE / "output"


def build_all() -> list[dict]:
    leads_path = HERE.parent / "leads" / "psl-2026-06-18.json"
    data = json.loads(leads_path.read_text())
    built = [generate.build_lead(l, OUT) for l in data["leads"]]
    write_hub(built, data["leads"])
    (OUT / "manifest.json").write_text(json.dumps({"built": built}, indent=2))
    return built


def write_hub(built: list[dict], leads: list[dict]) -> None:
    by_slug = {generate.slugify(l["business"]): l for l in leads}
    cards = []
    for b in built:
        lead = by_slug.get(b["slug"], {})
        rating = lead.get("rating")
        reviews = lead.get("reviews")
        meta = f"★ {rating} · {reviews} reviews" if rating and reviews else (lead.get("web_status") or "")
        cards.append(f"""
      <a class="card" href="sites/{b['slug']}/index.html" target="preview">
        <span class="tag tag-{b['vertical']}">{b['vertical']}</span>
        <h3>{b['name']}</h3>
        <p class="t">{b['type']}</p>
        <p class="m">{meta}</p>
        <span class="open">Open preview →</span>
      </a>""")
    hub = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FAMtastic Agency — Sandbox</title>
<style>
  :root{{--bg:#0d1117;--panel:#161b22;--line:#21262d;--ink:#e6edf3;--mut:#8b949e;--acc:#f0a500;}}
  *{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--ink);
    font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}}
  header{{padding:22px 26px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center}}
  h1{{margin:0;font-size:19px}} h1 span{{color:var(--acc)}}
  .sub{{color:var(--mut);font-size:13px}}
  .layout{{display:grid;grid-template-columns:380px 1fr;height:calc(100vh - 66px)}}
  @media(max-width:820px){{.layout{{grid-template-columns:1fr;height:auto}}}}
  .list{{overflow:auto;padding:18px;border-right:1px solid var(--line)}}
  .card{{display:block;background:var(--panel);border:1px solid var(--line);border-radius:14px;
    padding:16px 18px;margin-bottom:12px;text-decoration:none;color:var(--ink);transition:border-color .15s}}
  .card:hover{{border-color:var(--acc)}}
  .card h3{{margin:8px 0 2px;font-size:16px}}
  .card .t{{margin:0;color:var(--mut);font-size:13px}}
  .card .m{{margin:6px 0 0;color:var(--acc);font-size:12px;font-weight:600}}
  .card .open{{display:inline-block;margin-top:10px;font-size:12px;color:var(--mut)}}
  .tag{{font-size:10px;text-transform:uppercase;letter-spacing:.5px;padding:3px 8px;border-radius:20px;font-weight:700}}
  .tag-taqueria{{background:rgba(200,69,30,.16);color:#e8895f}}
  .tag-nail{{background:rgba(192,75,122,.16);color:#d98bb0}}
  .tag-detailing{{background:rgba(30,111,200,.16);color:#6fa8e8}}
  .tag-lawn{{background:rgba(62,124,46,.18);color:#86b049}}
  .tag-general{{background:rgba(139,148,158,.16);color:#b9c1cb}}
  .preview{{position:relative}}
  iframe{{width:100%;height:100%;border:0;background:#fff}}
  .empty{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--mut);text-align:center;padding:30px}}
</style></head>
<body>
<header>
  <div><h1>FAMtastic <span>Agency</span> · Sandbox</h1>
  <div class="sub">{len(built)} sites built from your Port St. Lucie leads · click any card to preview</div></div>
  <div class="sub">localhost:8788</div>
</header>
<div class="layout">
  <div class="list">{''.join(cards)}</div>
  <div class="preview">
    <iframe name="preview" src="sites/{built[0]['slug']}/index.html" title="preview"></iframe>
  </div>
</div>
</body></html>"""
    (OUT / "index.html").write_text(hub, encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8788)
    ap.add_argument("--no-open", action="store_true")
    args = ap.parse_args()

    print("→ Building sites from leads…")
    built = build_all()
    print(f"✓ Built {len(built)} sites into {OUT}")

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(OUT), **kw)
        def log_message(self, *a):  # quiet
            pass

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", args.port), Handler) as httpd:
        url = f"http://localhost:{args.port}/"
        print(f"✓ Sandbox live at {url}  (Ctrl-C to stop)")
        if not args.no_open:
            threading.Timer(0.6, lambda: webbrowser.open(url)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n→ Sandbox stopped.")


if __name__ == "__main__":
    main()
