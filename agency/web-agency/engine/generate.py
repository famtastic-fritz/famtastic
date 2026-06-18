#!/usr/bin/env python3
"""
generate.py — FAMtastic Web-Agency mockup engine.

Renders MULTIPLE design variants per lead so you choose, not one fixed template.
Two axes:
  • vertical  — palette + copy per business type (taqueria, nail, detailing, lawn)
  • variant   — design direction: "warm" (light editorial), "bold" (dark
                statement), "minimal" (clean whitespace)

Pure stdlib. No API key. Output: mockups/<lead-slug>/<variant>/index.html

Namespaced under agency/web-agency/ on purpose: several agents were asked to
build into agency/, so generic paths (agency/leads, agency/dashboard) collide.
This whole initiative lives under agency/web-agency/.
"""
from __future__ import annotations
import html
import json
import re
from pathlib import Path

# ----------------------------------------------------------------------------
# VERTICALS — palette + copy per business type
# ----------------------------------------------------------------------------
VERTICALS = {
    "taqueria": {
        "accent": "#C8451E", "accent2": "#E8A427", "tint": "#FBF6EE", "ink": "#2A1A12",
        "kicker": "Authentic Mexican kitchen",
        "headline": ["Hand-pressed.", "Slow-cooked.", "Worth the drive."],
        "primary_cta": "View the Menu", "secondary_cta": "Call to Order",
        "section_label": "menu", "section_kicker": "On the menu", "section_title": "What people come for",
    },
    "nail": {
        "accent": "#C04B7A", "accent2": "#9A6CB0", "tint": "#FBF4F6", "ink": "#2B2230",
        "kicker": "Nail studio & spa",
        "headline": ["Polished.", "Precise.", "Pampered."],
        "primary_cta": "Book an Appointment", "secondary_cta": "Call the Studio",
        "section_label": "services", "section_kicker": "What we do", "section_title": "Services",
    },
    "detailing": {
        "accent": "#1E6FC8", "accent2": "#27B0A6", "tint": "#F2F5F8", "ink": "#10171F",
        "kicker": "Mobile auto detailing",
        "headline": ["Showroom shine.", "At your door.", "Every time."],
        "primary_cta": "Get a Quote", "secondary_cta": "Call Now",
        "section_label": "services", "section_kicker": "What we do", "section_title": "Detailing services",
    },
    "lawn": {
        "accent": "#3E7C2E", "accent2": "#86B049", "tint": "#F4F7EE", "ink": "#16210F",
        "kicker": "Lawn care & landscaping",
        "headline": ["Sharp edges.", "Clean lines.", "Done right."],
        "primary_cta": "Request a Quote", "secondary_cta": "Call the Crew",
        "section_label": "services", "section_kicker": "What we do", "section_title": "Services",
    },
    "general": {
        "accent": "#1F6FEB", "accent2": "#E8A427", "tint": "#F7F7F5", "ink": "#1A1A1A",
        "kicker": "Local business",
        "headline": ["Built to be", "found & trusted,", "and booked."],
        "primary_cta": "Get in Touch", "secondary_cta": "Call Us",
        "section_label": "services", "section_kicker": "What we do", "section_title": "Services",
    },
}

# ----------------------------------------------------------------------------
# VARIANTS — design direction applied on top of a vertical
# ----------------------------------------------------------------------------
VARIANTS = {
    "warm": {
        "label": "Warm Editorial",
        "blurb": "Light, premium, serif-led. Friendly and inviting.",
        "head_font": "Fraunces", "head_url": "Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900",
        "body_font": "Inter", "body_url": "Inter:wght@400;500;600;700",
        "mode": "light",         # uses vertical tint bg + dark ink
        "hero_align": "split",   # split hero with info card
        "head_transform": "none",
    },
    "bold": {
        "label": "Bold Statement",
        "blurb": "Dark, high-contrast, oversized type. Confident and modern.",
        "head_font": "Archivo Black", "head_url": "Archivo+Black",
        "body_font": "Inter", "body_url": "Inter:wght@400;500;600;700",
        "mode": "dark",          # dark bg, light text, accent pops
        "hero_align": "center",
        "head_transform": "uppercase",
    },
    "minimal": {
        "label": "Clean Minimal",
        "blurb": "White space, restrained, understated. Quiet confidence.",
        "head_font": "Space Grotesk", "head_url": "Space+Grotesk:wght@500;700",
        "body_font": "Inter", "body_url": "Inter:wght@400;500;600",
        "mode": "white",         # pure white bg, near-black ink, thin accent
        "hero_align": "left",
        "head_transform": "none",
    },
}
VARIANT_ORDER = ["warm", "bold", "minimal"]

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

REVIEWS = {
    "taqueria": [
        ("The birria is the real deal — crispy, juicy, and that consommé is everything.", "Marisol R."),
        ("Been coming here for years. Best tacos in St. Lucie County, hands down.", "Danny T."),
        ("Family-run and you can taste it. Fresh tortillas, fair prices, huge portions.", "Alicia M."),
    ],
    "nail": [
        ("My gel-X set lasted three weeks with zero lifting. Best in PSL.", "Jasmine K."),
        ("Clean, relaxing, and the nail art is unreal. My go-to spot now.", "Brittany S."),
        ("They take their time and it shows. Never rushed, always perfect.", "Nicole D."),
    ],
    "detailing": [
        ("Showed up on time, left my truck looking better than the day I bought it.", "Marcus L."),
        ("Ceramic coat was worth every penny — water just rolls right off.", "Tyler B."),
        ("Came to my driveway, super professional, interior looks brand new.", "Steph A."),
    ],
    "lawn": [
        ("Reliable every single week. Edges are crisp, never leave a mess.", "Robert H."),
        ("Pressure washed my driveway and it looks ten years younger.", "Carol P."),
        ("Honest pricing and they actually show up when they say they will.", "Gary W."),
    ],
}
REVIEWS["general"] = REVIEWS["lawn"]

GALLERY = {
    "taqueria": ["Tacos", "Birria", "The kitchen", "Horchata", "Elote", "Salsa bar"],
    "nail": ["Gel-X", "Nail art", "Spa pedi", "The studio", "Chrome", "French"],
    "detailing": ["Before/after", "Ceramic", "Interior", "Paint", "Wheels", "The rig"],
    "lawn": ["Fresh cut", "Edging", "Hedges", "Pressure wash", "Beds", "Cleanup"],
}
GALLERY["general"] = GALLERY["lawn"]


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
    return re.sub(r"[^a-z0-9]+", "-", (name or "site").lower()).strip("-") or "site"


def tel(phone: str) -> str:
    d = re.sub(r"[^0-9]", "", phone or "")
    return ("+1" + d) if len(d) == 10 else (("+" + d) if d else "#")


def _palette(v: dict, var: dict) -> dict:
    """Resolve concrete colors for a vertical+variant."""
    mode = var["mode"]
    if mode == "dark":
        return dict(bg=v["ink"], ink="#F4EFE9", card="rgba(255,255,255,.06)",
                    cardln="rgba(255,255,255,.12)", muted="rgba(244,239,233,.65)",
                    accent=v["accent"], accent2=v["accent2"], soft="rgba(255,255,255,.04)")
    if mode == "white":
        return dict(bg="#FFFFFF", ink="#141414", card="#FFFFFF",
                    cardln="rgba(0,0,0,.10)", muted="rgba(20,20,20,.60)",
                    accent=v["accent"], accent2=v["accent2"], soft="#FAFAF9")
    # warm / light
    return dict(bg=v["tint"], ink=v["ink"], card="#FFFFFF",
                cardln="rgba(0,0,0,.07)", muted="rgba(0,0,0,.62)",
                accent=v["accent"], accent2=v["accent2"], soft="rgba(0,0,0,.025)")


def _cards(vert: str, p: dict) -> str:
    out = []
    for name, price, desc in SAMPLE.get(vert, SAMPLE["general"]):
        out.append(f"""<article class="card"><div class="card-row"><h3>{html.escape(name)}</h3>
        <span class="price">{html.escape(price)}</span></div><p>{html.escape(desc)}</p></article>""")
    return "".join(out)


def _reviews(vert: str) -> str:
    out = []
    for q, who in REVIEWS.get(vert, REVIEWS["general"]):
        out.append(f"""<article class="rev"><div class="stars">★★★★★</div>
        <p>&ldquo;{html.escape(q)}&rdquo;</p><div class="who">{html.escape(who)}</div></article>""")
    return "".join(out)


def _gallery(vert: str, p: dict) -> str:
    out = []
    for i, lab in enumerate(GALLERY.get(vert, GALLERY["general"])):
        ang = 120 + i * 35
        out.append(f'<div class="tile" style="background:linear-gradient({ang}deg,{p["accent"]},{p["accent2"]})">'
                   f'<!-- Replace with your own photo -->{html.escape(lab)}</div>')
    return "".join(out)


def render(lead: dict, variant_key: str) -> str:
    vert = vertical_of(lead)
    v = VERTICALS[vert]
    var = VARIANTS[variant_key]
    p = _palette(v, var)
    name = lead.get("business", "Your Business")
    phone = lead.get("phone", "")
    address = lead.get("address", "") or "Port St. Lucie, FL"
    rating = lead.get("rating")
    reviews = lead.get("reviews")
    label = v["section_label"]
    head = v["headline"]
    htf = var["head_transform"]
    align = var["hero_align"]
    rating_pill = (f'<span class="pill">★ {rating} · {reviews} reviews</span>' if rating and reviews else "")
    fonts_url = f"https://fonts.googleapis.com/css2?family={var['head_url']}&family={var['body_url']}&display=swap"

    # hero markup differs by alignment
    if align == "center":
        hero = f"""
      <div class="hero-inner center">
        <div class="hero-col">
          <div class="pillrow">{rating_pill}</div>
          <p class="kicker">{html.escape(v['kicker'])}</p>
          <h1 class="hl">{head[0]} <span>{head[1]}</span> {head[2]}</h1>
          <p class="lede">{html.escape(name)} — a Port St. Lucie favorite. Real work, real reviews, now a home online worth sharing.</p>
          <div class="btns"><a href="#{label}" class="btn">{v['primary_cta']}</a>
          <a href="tel:{tel(phone)}" class="btn ghost">{v['secondary_cta']} →</a></div>
        </div>
      </div>"""
    elif align == "left":
        hero = f"""
      <div class="hero-inner left">
        <div class="hero-col">
          <div class="pillrow">{rating_pill}</div>
          <p class="kicker">{html.escape(v['kicker'])}</p>
          <h1 class="hl">{head[0]} {head[1]} <span>{head[2]}</span></h1>
          <p class="lede">{html.escape(name)} — a Port St. Lucie favorite, now online.</p>
          <div class="btns"><a href="#{label}" class="btn">{v['primary_cta']}</a>
          <a href="tel:{tel(phone)}" class="btn ghost">{v['secondary_cta']} →</a></div>
        </div>
      </div>"""
    else:  # split
        hero = f"""
      <div class="hero-inner split">
        <div class="hero-col">
          <div class="pillrow">{rating_pill}</div>
          <p class="kicker">{html.escape(v['kicker'])}</p>
          <h1 class="hl">{head[0]}<br><span>{head[1]}</span><br>{head[2]}</h1>
          <p class="lede">{html.escape(name)} — a Port St. Lucie favorite. Real work, real reviews, and now a home online worth sharing.</p>
          <div class="btns"><a href="#{label}" class="btn">{v['primary_cta']}</a>
          <a href="tel:{tel(phone)}" class="btn ghost">{v['secondary_cta']} →</a></div>
        </div>
        <aside class="hero-card">
          <div class="stats"><div><b>{rating or '5.0'}★</b><span>{(str(reviews)+' reviews') if reviews else 'Loved locally'}</span></div>
          <div><b>PSL</b><span>Port St. Lucie</span></div></div>
          <hr><p class="addr">{html.escape(address)}</p>
          <p class="muted-sm">Tap to call · {html.escape(phone)}</p>
        </aside>
      </div>"""

    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(name)} — {var['label']}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="{fonts_url}" rel="stylesheet">
<style>
  :root{{--bg:{p['bg']};--ink:{p['ink']};--accent:{p['accent']};--accent2:{p['accent2']};
    --card:{p['card']};--cardln:{p['cardln']};--muted:{p['muted']};--soft:{p['soft']};}}
  *{{box-sizing:border-box}}
  body{{margin:0;background:var(--bg);color:var(--ink);line-height:1.6;
    font-family:"{var['body_font']}",system-ui,sans-serif;}}
  .wrap{{max-width:1080px;margin:0 auto;padding:0 24px;}}
  nav{{display:flex;align-items:center;justify-content:space-between;padding:22px 24px;max-width:1080px;margin:0 auto;}}
  .brand{{font-family:"{var['head_font']}",serif;font-weight:700;font-size:21px;letter-spacing:-.01em;text-decoration:none;color:var(--ink);text-transform:{htf};}}
  .brand b{{color:var(--accent);}}
  .nav-links{{display:flex;gap:28px;list-style:none;margin:0;padding:0;font-weight:600;font-size:15px;}}
  .nav-links a{{color:var(--ink);text-decoration:none;opacity:.72;}}
  .nav-links a:hover{{opacity:1;color:var(--accent);}}
  .nav-cta{{background:var(--accent);color:#fff;text-decoration:none;padding:11px 20px;border-radius:999px;font-weight:700;font-size:14px;}}
  @media(max-width:760px){{.nav-links,.nav-cta{{display:none;}}}}
  .hero-inner{{max-width:1080px;margin:0 auto;padding:56px 24px 72px;}}
  .hero-inner.split{{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;}}
  .hero-inner.center{{text-align:center;max-width:880px;}}
  .hero-inner.center .lede{{margin-left:auto;margin-right:auto;}}
  .hero-inner.center .btns{{justify-content:center;}}
  @media(max-width:860px){{.hero-inner.split{{grid-template-columns:1fr;}}}}
  .pillrow{{margin-bottom:16px;min-height:10px;}}
  .pill{{display:inline-block;background:var(--card);border:1px solid var(--cardln);border-radius:999px;padding:6px 14px;font-size:13px;font-weight:600;}}
  .kicker{{color:var(--accent);font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:13px;margin:0 0 10px;}}
  h1.hl{{font-family:"{var['head_font']}",serif;font-weight:{ '900' if var['head_font']!='Archivo Black' else '400' };
    font-size:clamp(38px,7vw,74px);line-height:.99;letter-spacing:-.02em;margin:10px 0 18px;text-transform:{htf};}}
  h1.hl span{{color:var(--accent);}}
  .lede{{font-size:18px;color:var(--muted);max-width:48ch;margin:0 0 26px;}}
  .btns{{display:flex;gap:14px;flex-wrap:wrap;align-items:center;}}
  .btn{{background:var(--accent);color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:700;}}
  .btn.ghost{{background:transparent;color:var(--ink);text-decoration:underline;text-underline-offset:5px;text-decoration-color:var(--accent2);}}
  .hero-card{{background:var(--card);border:1px solid var(--cardln);border-radius:20px;padding:26px;}}
  .stats{{display:flex;gap:24px;}}
  .stats b{{font-family:"{var['head_font']}",serif;font-size:28px;display:block;color:var(--accent);}}
  .stats span{{font-size:13px;color:var(--muted);font-weight:600;}}
  .hero-card hr{{border:none;border-top:1px solid var(--cardln);margin:18px 0;}}
  .addr{{margin:0;font-weight:600;}} .muted-sm{{margin:6px 0 0;color:var(--muted);font-size:14px;}}
  .divider{{display:block;width:100%;height:44px;}}
  .section{{padding:60px 0;}}
  .section.alt{{background:var(--soft);}}
  .kick2{{color:var(--accent);font-weight:700;letter-spacing:.07em;text-transform:uppercase;font-size:13px;margin:0 0 6px;}}
  .h2{{font-family:"{var['head_font']}",serif;font-weight:{ '700' if var['head_font']=='Space Grotesk' else '900' };
    font-size:clamp(26px,4vw,42px);letter-spacing:-.02em;margin:0 0 26px;text-transform:{htf};}}
  .grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}}
  @media(max-width:820px){{.grid{{grid-template-columns:1fr;}}}}
  .card{{background:var(--card);border:1px solid var(--cardln);border-radius:15px;padding:20px;}}
  .card-row{{display:flex;justify-content:space-between;align-items:baseline;gap:10px;}}
  .card h3{{margin:0;font-size:17px;}} .price{{font-family:"{var['head_font']}",serif;font-weight:700;color:var(--accent);}}
  .card p{{margin:8px 0 0;font-size:14px;color:var(--muted);}}
  .note{{text-align:center;font-size:12px;color:var(--muted);opacity:.7;margin-top:16px;}}
  .rev{{background:var(--card);border:1px solid var(--cardln);border-radius:15px;padding:20px;}}
  .rev .stars{{color:var(--accent2);letter-spacing:2px;}} .rev p{{font-size:15px;margin:10px 0 12px;}}
  .rev .who{{font-weight:700;font-size:14px;}}
  .gal{{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}}
  @media(max-width:760px){{.gal{{grid-template-columns:repeat(2,1fr);}}}}
  .tile{{aspect-ratio:4/3;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;
    font-weight:700;font-family:"{var['head_font']}",serif;font-size:19px;}}
  .visit{{background:var(--accent);color:#fff;padding:52px 0;}}
  .visit .wrap{{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;}}
  @media(max-width:760px){{.visit .wrap{{grid-template-columns:1fr;}}}}
  .visit h3{{font-size:14px;letter-spacing:.05em;text-transform:uppercase;opacity:.85;margin:0 0 8px;}}
  .visit a.call{{display:inline-block;background:#fff;color:var(--accent);text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:800;margin-top:4px;}}
  footer{{text-align:center;padding:28px;font-size:14px;color:var(--muted);}}
  .sticky{{display:none;}}
  @media(max-width:760px){{.sticky{{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:60;background:var(--accent);
    color:#fff;text-decoration:none;align-items:center;justify-content:center;gap:8px;padding:15px;font-weight:800;}}
    body{{padding-bottom:58px;}}}}
</style></head>
<body>
  <nav>
    <a href="#" class="brand">{html.escape(name.split()[0])} <b>{html.escape(' '.join(name.split()[1:]))}</b></a>
    <ul class="nav-links">
      <li><a href="#{label}">{'Menu' if vert=='taqueria' else 'Services'}</a></li>
      <li><a href="#reviews">Reviews</a></li>
      <li><a href="#visit">Visit</a></li>
    </ul>
    <a href="tel:{tel(phone)}" class="nav-cta">{html.escape(phone) or 'Call'}</a>
  </nav>

  <header class="hero">{hero}</header>

  <svg class="divider" viewBox="0 0 1440 44" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,44 C360,4 1080,4 1440,44 L1440,44 L0,44 Z" fill="var(--accent)" opacity="0.12"/>
  </svg>

  <section id="{label}" class="section">
    <div class="wrap"><p class="kick2">{v['section_kicker']}</p><h2 class="h2">{v['section_title']}</h2>
    <div class="grid">{_cards(vert, p)}</div>
    <p class="note">Sample {'menu' if vert=='taqueria' else 'services'} — real items wired from the live listing at build.</p></div>
  </section>

  <section id="reviews" class="section alt">
    <div class="wrap"><p class="kick2">Loved locally</p><h2 class="h2">What people say</h2>
    <div class="grid">{_reviews(vert)}</div>
    <p class="note">Sample testimonials — real review quotes wired at build.</p></div>
  </section>

  <section class="section">
    <div class="wrap"><p class="kick2">A look inside</p><h2 class="h2">Gallery</h2>
    <div class="gal">{_gallery(vert, p)}</div>
    <p class="note">Placeholder tiles — owner swaps in real photos (marked in the HTML).</p></div>
  </section>

  <section id="visit" class="visit">
    <div class="wrap">
      <div><h3>Find Us</h3><p>{html.escape(address)}</p></div>
      <div><h3>Hours</h3><p>Open daily — call ahead<br>or tap to reach us now.</p></div>
      <div><h3>Get in touch</h3><a class="call" href="tel:{tel(phone)}">{html.escape(phone) or 'Call us'}</a></div>
    </div>
  </section>

  <footer>{html.escape(name)} · Port St. Lucie, FL · FAMtastic Agency — {var['label']} mockup</footer>
  <a class="sticky" href="tel:{tel(phone)}">📞 Call · {html.escape(phone)}</a>
</body></html>"""


def build_lead(lead: dict, out_root: Path) -> dict:
    slug = slugify(lead.get("business", "site"))
    variants = []
    for vk in VARIANT_ORDER:
        d = out_root / "mockups" / slug / vk
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(render(lead, vk), encoding="utf-8")
        variants.append({"key": vk, "label": VARIANTS[vk]["label"],
                         "blurb": VARIANTS[vk]["blurb"], "path": f"mockups/{slug}/{vk}/index.html"})
    return {"slug": slug, "name": lead.get("business"), "type": lead.get("type"),
            "vertical": vertical_of(lead), "variants": variants}


if __name__ == "__main__":
    here = Path(__file__).resolve().parent
    leads_path = here.parent / "leads" / "psl-2026-06-18.json"
    out = here.parent / "build"
    data = json.loads(leads_path.read_text())
    built = [build_lead(l, out) for l in data["leads"]]
    (out / "manifest.json").write_text(json.dumps({"built": built}, indent=2))
    n = sum(len(b["variants"]) for b in built)
    print(f"Built {len(built)} leads × {len(VARIANT_ORDER)} variants = {n} mockups -> {out}")
