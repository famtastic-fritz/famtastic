#!/usr/bin/env python3
"""
generate.py — FAMtastic Agency site generator (local sandbox).

Pure stdlib. Takes a qualified-lead record and renders a clean, premium
multi-section site into the output directory. Vertical-aware: the palette,
hero copy, and section content adapt to the business type (taqueria, nail
salon, auto detailing, lawn care, ...).

This is the deterministic template engine — it runs instantly with no API key
so the sandbox is reliable and watchable. The same lead JSON can later be fed
to the Claude-backed factory for bespoke builds; this gives you a fast,
good-looking baseline you can see and iterate on first.
"""
from __future__ import annotations
import html
import json
import os
import re
from pathlib import Path

# ----------------------------------------------------------------------------
# Vertical themes — clean, premium, restrained. Light-forward by default
# (reads more "$5k agency" than a dark busy hero).
# ----------------------------------------------------------------------------
THEMES = {
    "taqueria": {
        "ink": "#2A1A12", "bg": "#FBF6EE", "accent": "#C8451E", "accent2": "#E8A427",
        "kicker": "Authentic Mexican kitchen",
        "headline": ["Hand-pressed.", "Slow-cooked.", "Worth the drive."],
        "primary_cta": "View the Menu", "secondary_cta": "Call to Order",
        "serif": "Fraunces", "sans": "Inter",
        "sections": ["menu"],
    },
    "nail": {
        "ink": "#2B2230", "bg": "#FBF4F6", "accent": "#C04B7A", "accent2": "#9A6CB0",
        "kicker": "Nail studio & spa",
        "headline": ["Polished.", "Precise.", "Pampered."],
        "primary_cta": "Book an Appointment", "secondary_cta": "Call the Studio",
        "serif": "Fraunces", "sans": "Inter",
        "sections": ["services"],
    },
    "detailing": {
        "ink": "#10171F", "bg": "#F2F5F8", "accent": "#1E6FC8", "accent2": "#27B0A6",
        "kicker": "Mobile auto detailing",
        "headline": ["Showroom shine.", "At your door.", "Every time."],
        "primary_cta": "Get a Quote", "secondary_cta": "Call Now",
        "serif": "Fraunces", "sans": "Inter",
        "sections": ["services"],
    },
    "lawn": {
        "ink": "#16210F", "bg": "#F4F7EE", "accent": "#3E7C2E", "accent2": "#86B049",
        "kicker": "Lawn care & landscaping",
        "headline": ["Sharp edges.", "Clean lines.", "Done right."],
        "primary_cta": "Request a Quote", "secondary_cta": "Call the Crew",
        "serif": "Fraunces", "sans": "Inter",
        "sections": ["services"],
    },
    "general": {
        "ink": "#1A1A1A", "bg": "#F7F7F5", "accent": "#1F6FEB", "accent2": "#E8A427",
        "kicker": "Local business",
        "headline": ["Built to be", "found, trusted,", "and booked."],
        "primary_cta": "Get in Touch", "secondary_cta": "Call Us",
        "serif": "Fraunces", "sans": "Inter",
        "sections": ["services"],
    },
}

# Sample content blocks per vertical (replaced with real listing data at build)
SAMPLE = {
    "taqueria": [
        ("Birria Tacos", "$13", "Slow-braised beef, crispy-dipped tortilla, consommé for dunking."),
        ("Street Tacos", "$3.50", "Al pastor, carne asada, pollo — onion, cilantro, lime."),
        ("Quesabirria", "$15", "Melted cheese, birria, griddled crisp."),
        ("Loaded Nachos", "$11", "House chips, queso, beans, pico, your choice of meat."),
        ("Horchata", "$4", "House-made, cinnamon, just-sweet-enough."),
        ("Elote", "$5", "Grilled street corn, cotija, lime, chile."),
    ],
    "nail": [
        ("Gel-X Full Set", "$55", "Lightweight, durable, any length or shape."),
        ("Classic Manicure", "$25", "Shape, cuticle care, polish that lasts."),
        ("Spa Pedicure", "$40", "Soak, scrub, massage, and a flawless finish."),
        ("Dip Powder", "$45", "No-lamp, long-wear color with a glass shine."),
        ("Nail Art", "from $10", "Hand-painted designs, chrome, French, and more."),
        ("Acrylic Fill", "$35", "Keep your set fresh and strong."),
    ],
    "detailing": [
        ("Express Wash & Wax", "$80", "Foam bath, hand dry, spray wax, tire shine."),
        ("Full Interior Detail", "$150", "Shampoo, steam, leather care, deep vacuum."),
        ("Ceramic Coat", "from $400", "Months of gloss and protection."),
        ("Paint Correction", "from $250", "Cut the swirls, bring back the depth."),
        ("Headlight Restore", "$60", "Clear, bright, road-legal again."),
        ("Boat / RV", "Call", "Big jobs welcome — we come to you."),
    ],
    "lawn": [
        ("Mow & Edge", "from $45", "Cut, edge, blow — crisp every visit."),
        ("Pressure Washing", "from $150", "Driveways, walks, and siding, like new."),
        ("Hedge & Trim", "from $60", "Shaped, tidy, and healthy."),
        ("Mulch & Beds", "Call", "Fresh mulch, clean lines, weed control."),
        ("Cleanups", "Call", "Storm, seasonal, and hurricane cleanup."),
        ("Maintenance Plan", "Custom", "Weekly or biweekly — set it and forget it."),
    ],
}
SAMPLE["general"] = SAMPLE["lawn"]


def vertical_of(lead: dict) -> str:
    t = (lead.get("type") or "").lower()
    if "taquer" in t or "mexican" in t or "restaurant" in t or "food" in t:
        return "taqueria"
    if "nail" in t:
        return "nail"
    if "detail" in t or "auto" in t or "car" in t:
        return "detailing"
    if "lawn" in t or "landscap" in t or "pressure" in t:
        return "lawn"
    return "general"


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "site"


def tel(phone: str) -> str:
    digits = re.sub(r"[^0-9]", "", phone or "")
    if len(digits) == 10:
        return "+1" + digits
    return "+" + digits if digits else "#"


def _section_html(theme: dict, vert: str, label: str) -> str:
    items = SAMPLE.get(vert, SAMPLE["general"])
    cards = []
    for name, price, desc in items:
        cards.append(f"""
        <article class="card">
          <div class="card-row"><h3>{html.escape(name)}</h3><span class="price">{html.escape(price)}</span></div>
          <p>{html.escape(desc)}</p>
        </article>""")
    return f"""
  <section id="{label}" class="section">
    <div class="wrap">
      <p class="kicker">{ 'On the menu' if vert=='taqueria' else 'What we do' }</p>
      <h2 class="h2">{ 'What people come for' if vert=='taqueria' else 'Services' }</h2>
      <div class="grid">{''.join(cards)}</div>
      <p class="note">Sample {'menu' if vert=='taqueria' else 'services'} &amp; pricing — real items wired from the live listing at build.</p>
    </div>
  </section>"""


def render(lead: dict) -> str:
    vert = vertical_of(lead)
    t = THEMES[vert]
    name = lead.get("business", "Your Business")
    phone = lead.get("phone", "")
    address = lead.get("address", "")
    rating = lead.get("rating")
    reviews = lead.get("reviews")
    label = t["sections"][0]
    rating_pill = ""
    if rating and reviews:
        rating_pill = f'<span class="pill">★ {rating} · {reviews} reviews</span>'
    head = t["headline"]

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(name)} — {t['kicker'].title()}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family={t['serif']}:opsz,wght@9..144,400;9..144,600;9..144,900&family={t['sans']}:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{{--ink:{t['ink']};--bg:{t['bg']};--accent:{t['accent']};--accent2:{t['accent2']};}}
  *{{box-sizing:border-box;}}
  body{{margin:0;font-family:"{t['sans']}",system-ui,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6;}}
  .serif{{font-family:"{t['serif']}",Georgia,serif;}}
  .wrap{{max-width:1080px;margin:0 auto;padding:0 24px;}}
  /* nav */
  nav{{display:flex;align-items:center;justify-content:space-between;padding:22px 24px;max-width:1080px;margin:0 auto;}}
  .brand{{font-family:"{t['serif']}",serif;font-weight:900;font-size:22px;letter-spacing:-.02em;text-decoration:none;color:var(--ink);}}
  .brand b{{color:var(--accent);}}
  .nav-links{{display:flex;gap:30px;list-style:none;margin:0;padding:0;font-weight:600;font-size:15px;}}
  .nav-links a{{color:var(--ink);text-decoration:none;opacity:.75;}}
  .nav-links a:hover{{opacity:1;color:var(--accent);}}
  .nav-cta{{background:var(--accent);color:#fff;text-decoration:none;padding:11px 20px;border-radius:999px;font-weight:700;font-size:14px;}}
  @media(max-width:760px){{.nav-links,.nav-cta{{display:none;}}}}
  /* hero */
  .hero{{position:relative;overflow:hidden;}}
  .hero-inner{{max-width:1080px;margin:0 auto;padding:60px 24px 80px;display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;}}
  @media(max-width:860px){{.hero-inner{{grid-template-columns:1fr;padding:30px 24px 50px;}}}}
  .pill{{display:inline-block;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:6px 14px;font-size:13px;font-weight:600;box-shadow:0 4px 14px -8px rgba(0,0,0,.3);}}
  .kicker{{color:var(--accent);font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:13px;margin:0 0 10px;}}
  h1.hl{{font-family:"{t['serif']}",serif;font-weight:900;font-size:clamp(40px,7vw,76px);line-height:.98;letter-spacing:-.03em;margin:14px 0 18px;}}
  h1.hl span{{color:var(--accent);}}
  .lede{{font-size:18px;opacity:.8;max-width:46ch;margin:0 0 28px;}}
  .btns{{display:flex;gap:14px;flex-wrap:wrap;align-items:center;}}
  .btn{{background:var(--accent);color:#fff;text-decoration:none;padding:15px 28px;border-radius:999px;font-weight:700;box-shadow:0 12px 30px -10px var(--accent);}}
  .btn.ghost{{background:transparent;color:var(--ink);text-decoration:underline;text-underline-offset:5px;text-decoration-color:var(--accent2);box-shadow:none;}}
  .hero-card{{background:linear-gradient(160deg,#fff,rgba(255,255,255,.6));border:1px solid rgba(0,0,0,.06);border-radius:22px;padding:28px;box-shadow:0 30px 60px -30px rgba(0,0,0,.35);}}
  .hero-blob{{position:absolute;inset:auto -10% -40% auto;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle at 30% 30%,var(--accent2),transparent 60%);opacity:.30;filter:blur(10px);}}
  .stats{{display:flex;gap:26px;margin-top:8px;}}
  .stats div b{{font-family:"{t['serif']}",serif;font-size:30px;display:block;color:var(--accent);}}
  .stats div span{{font-size:13px;opacity:.7;font-weight:600;}}
  /* divider (real SVG, not a line) */
  .divider{{display:block;width:100%;height:46px;}}
  /* sections */
  .section{{padding:64px 0;}}
  .h2{{font-family:"{t['serif']}",serif;font-weight:900;font-size:clamp(28px,4vw,44px);letter-spacing:-.02em;margin:6px 0 28px;}}
  .grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}}
  @media(max-width:820px){{.grid{{grid-template-columns:1fr;}}}}
  .card{{background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:16px;padding:22px;box-shadow:0 14px 30px -22px rgba(0,0,0,.4);}}
  .card-row{{display:flex;justify-content:space-between;align-items:baseline;gap:10px;}}
  .card h3{{margin:0;font-size:18px;}}
  .price{{font-family:"{t['serif']}",serif;font-weight:700;color:var(--accent);}}
  .card p{{margin:8px 0 0;font-size:14px;opacity:.72;}}
  .note{{text-align:center;font-size:12px;opacity:.45;margin-top:18px;}}
  /* visit */
  .visit{{background:var(--ink);color:#fff;padding:56px 0;}}
  .visit .wrap{{display:grid;grid-template-columns:repeat(3,1fr);gap:30px;}}
  @media(max-width:760px){{.visit .wrap{{grid-template-columns:1fr;}}}}
  .visit h3{{color:var(--accent2);font-size:15px;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;}}
  .visit a.call{{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;margin-top:4px;}}
  footer{{text-align:center;padding:30px;font-size:14px;opacity:.6;}}
</style>
</head>
<body>
  <nav>
    <a href="index.html" class="brand">{html.escape(name.split()[0])} <b>{html.escape(' '.join(name.split()[1:]) or '')}</b></a>
    <ul class="nav-links">
      <li><a href="#{label}">{'Menu' if vert=='taqueria' else 'Services'}</a></li>
      <li><a href="#story">About</a></li>
      <li><a href="#visit">Visit</a></li>
    </ul>
    <a href="tel:{tel(phone)}" class="nav-cta">{html.escape(phone) or 'Call'}</a>
  </nav>

  <header class="hero">
    <div class="hero-blob"></div>
    <div class="hero-inner">
      <div>
        <div style="margin-bottom:16px">{rating_pill}</div>
        <p class="kicker">{html.escape(t['kicker'])}</p>
        <h1 class="hl">{head[0]}<br><span>{head[1]}</span><br>{head[2]}</h1>
        <p class="lede">{html.escape(name)} — a Port St. Lucie favorite. Real work, real reviews, and now a home online worth sharing.</p>
        <div class="btns">
          <a href="#{label}" class="btn">{t['primary_cta']}</a>
          <a href="tel:{tel(phone)}" class="btn ghost">{t['secondary_cta']} →</a>
        </div>
      </div>
      <div class="hero-card">
        <div class="stats">
          <div><b>{rating or '5.0'}★</b><span>{(str(reviews)+' reviews') if reviews else 'Loved locally'}</span></div>
          <div><b>PSL</b><span>Port St. Lucie</span></div>
        </div>
        <hr style="border:none;border-top:1px solid rgba(0,0,0,.08);margin:20px 0">
        <p style="margin:0;font-weight:600">{html.escape(address) or 'Port St. Lucie, FL'}</p>
        <p style="margin:6px 0 0;opacity:.7;font-size:14px">Tap to call · {html.escape(phone)}</p>
      </div>
    </div>
  </header>

  <svg class="divider" viewBox="0 0 1440 46" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,46 C360,6 1080,6 1440,46 L1440,46 L0,46 Z" fill="var(--accent)" opacity="0.10"/>
  </svg>

  {_section_html(t, vert, label)}

  <section id="story" class="section" style="background:rgba(0,0,0,.02)">
    <div class="wrap" style="max-width:760px;text-align:center">
      <p class="kicker">Our story</p>
      <h2 class="h2">Local, and proud of it</h2>
      <p style="font-size:18px;opacity:.8">{html.escape(name)} has earned its reputation the hard way — one satisfied customer at a time, right here in Port St. Lucie. This is the kind of place neighbors recommend by name. Now there's a website that finally does that reputation justice.</p>
    </div>
  </section>

  <section id="visit" class="visit">
    <div class="wrap">
      <div><h3>Find Us</h3><p>{html.escape(address) or 'Port St. Lucie, FL'}</p></div>
      <div><h3>Hours</h3><p>Open daily — call ahead<br>or tap to reach us now.</p></div>
      <div><h3>Get in touch</h3><a class="call" href="tel:{tel(phone)}">{html.escape(phone) or 'Call us'}</a></div>
    </div>
  </section>

  <footer>{html.escape(name)} · Port St. Lucie, FL · A FAMtastic Agency demo build</footer>
</body>
</html>"""


def build_lead(lead: dict, out_root: Path) -> dict:
    slug = slugify(lead.get("business", "site"))
    site_dir = out_root / "sites" / slug
    site_dir.mkdir(parents=True, exist_ok=True)
    (site_dir / "index.html").write_text(render(lead), encoding="utf-8")
    return {"slug": slug, "name": lead.get("business"), "type": lead.get("type"),
            "vertical": vertical_of(lead), "path": f"sites/{slug}/index.html"}


if __name__ == "__main__":
    import sys
    here = Path(__file__).resolve().parent
    leads_path = here.parent / "leads" / "psl-2026-06-18.json"
    out = here / "output"
    data = json.loads(leads_path.read_text())
    built = [build_lead(l, out) for l in data["leads"]]
    (out / "manifest.json").write_text(json.dumps({"built": built}, indent=2))
    print(f"Built {len(built)} sites -> {out}")
