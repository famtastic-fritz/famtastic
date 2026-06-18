#!/usr/bin/env python3
"""
serve.py — FAMtastic Web-Agency local sandbox.

Builds every lead in THREE design variants, generates a comparison hub, serves
it on localhost, and opens your browser. You pick the direction per business.

Pure stdlib. Run on the Mac:
    python3 agency/web-agency/engine/serve.py
    python3 agency/web-agency/engine/serve.py --port 9000 --no-open
"""
from __future__ import annotations
import argparse
import http.server
import json
import socketserver
import threading
import webbrowser
from pathlib import Path

import generate

HERE = Path(__file__).resolve().parent
BUILD = HERE.parent / "build"


def build_all() -> list[dict]:
    leads = json.loads((HERE.parent / "leads" / "psl-2026-06-18.json").read_text())["leads"]
    built = [generate.build_lead(l, BUILD) for l in leads]
    write_hub(built, leads)
    (BUILD / "manifest.json").write_text(json.dumps({"built": built}, indent=2))
    return built


def write_hub(built: list[dict], leads: list[dict]) -> None:
    by_slug = {generate.slugify(l["business"]): l for l in leads}
    blocks = []
    for b in built:
        lead = by_slug.get(b["slug"], {})
        rating, reviews = lead.get("rating"), lead.get("reviews")
        meta = f"★ {rating} · {reviews} reviews" if rating and reviews else (lead.get("web_status") or "")
        chips = "".join(
            f'<a class="variant" href="{v["path"]}" target="preview" '
            f'onclick="pick(this)"><b>{v["label"]}</b><span>{v["blurb"]}</span></a>'
            for v in b["variants"])
        blocks.append(f"""
      <div class="lead">
        <div class="lead-head">
          <span class="tag tag-{b['vertical']}">{b['vertical']}</span>
          <div><h3>{b['name']}</h3><p class="t">{b['type']} · {meta}</p></div>
        </div>
        <div class="variants">{chips}</div>
      </div>""")
    first = built[0]["variants"][0]["path"]
    hub = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FAMtastic Web-Agency — Mockups</title>
<style>
  :root{{--bg:#0d1117;--panel:#161b22;--line:#21262d;--ink:#e6edf3;--mut:#8b949e;--acc:#f0a500;}}
  *{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--ink);
    font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}}
  header{{padding:18px 24px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center}}
  h1{{margin:0;font-size:18px}} h1 span{{color:var(--acc)}} .sub{{color:var(--mut);font-size:13px}}
  .layout{{display:grid;grid-template-columns:430px 1fr;height:calc(100vh - 60px)}}
  @media(max-width:860px){{.layout{{grid-template-columns:1fr;height:auto}}}}
  .list{{overflow:auto;padding:16px;border-right:1px solid var(--line)}}
  .lead{{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:14px}}
  .lead-head{{display:flex;gap:10px;align-items:flex-start;margin-bottom:10px}}
  .lead-head h3{{margin:0;font-size:15px}} .lead-head .t{{margin:2px 0 0;color:var(--mut);font-size:12px}}
  .tag{{font-size:10px;text-transform:uppercase;letter-spacing:.5px;padding:3px 8px;border-radius:20px;font-weight:700;white-space:nowrap}}
  .tag-taqueria{{background:rgba(200,69,30,.16);color:#e8895f}}
  .tag-nail{{background:rgba(192,75,122,.16);color:#d98bb0}}
  .tag-detailing{{background:rgba(30,111,200,.16);color:#6fa8e8}}
  .tag-lawn{{background:rgba(62,124,46,.18);color:#86b049}}
  .tag-general{{background:rgba(139,148,158,.16);color:#b9c1cb}}
  .variants{{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}}
  .variant{{display:block;background:#0d1117;border:1px solid var(--line);border-radius:10px;padding:10px;
    text-decoration:none;color:var(--ink);transition:border-color .15s}}
  .variant:hover,.variant.on{{border-color:var(--acc)}}
  .variant b{{font-size:12.5px;display:block}} .variant span{{font-size:10.5px;color:var(--mut);display:block;margin-top:3px;line-height:1.35}}
  .preview{{position:relative;background:#fff}} iframe{{width:100%;height:100%;border:0;background:#fff}}
</style></head>
<body>
<header>
  <div><h1>FAMtastic <span>Web-Agency</span> · Mockups</h1>
  <div class="sub">{len(built)} leads × 3 directions — click a variant to compare. Pick one per business.</div></div>
  <div class="sub">localhost</div>
</header>
<div class="layout">
  <div class="list">{''.join(blocks)}</div>
  <div class="preview"><iframe name="preview" src="{first}" title="preview"></iframe></div>
</div>
<script>
  function pick(el){{document.querySelectorAll('.variant.on').forEach(x=>x.classList.remove('on'));el.classList.add('on');}}
  document.querySelector('.variant') && document.querySelector('.variant').classList.add('on');
</script>
</body></html>"""
    (BUILD / "index.html").write_text(hub, encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8788)
    ap.add_argument("--no-open", action="store_true")
    args = ap.parse_args()

    print("→ Building mockups (3 variants per lead)…")
    built = build_all()
    total = sum(len(b["variants"]) for b in built)
    print(f"✓ {len(built)} leads × 3 = {total} mockups in {BUILD}")

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(BUILD), **kw)
        def log_message(self, *a):
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
            print("\n→ Stopped.")


if __name__ == "__main__":
    main()
