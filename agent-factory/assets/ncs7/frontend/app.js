/* ============================================================
   app.js — NCS7 React SPA (no build step)
   React 18 UMD + Babel standalone (JSX in <script type="text/babel">)
   ------------------------------------------------------------
   - Hash routing (#/, #/about, #/products, #/pricing, #/resources, #/contact)
   - Content-driven: fetch /api/content (CMS) with fallback to ./content.json
   - Re-inits the Three.js hero (window.NCSHero) when Home mounts
   ============================================================ */
const { useState, useEffect, useRef, useCallback } = React;

/* ---------- tiny inline icon set (blueprint stroke) ---------- */
function Icon({ name, ...rest }) {
  const paths = {
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    cpu: <><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    cart: <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/></>,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>,
    pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    arrow: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    cube: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {paths[name] || null}
    </svg>
  );
}

/* ---------- brand marks (faithful recreations of the NCS + NIBS logos) ---------- */
function BrandMark({ className }) {
  // NCS "exploded star": top shard red, remaining shards grey, flying apart.
  return (
    <svg className={className} viewBox="0 0 84 84" aria-hidden="true">
      <polygon points="42,4 51,30 40,32" fill="#E0301E"/>
      <polygon points="42,4 40,32 30,20" fill="#C8281A"/>
      <polygon points="78,34 54,32 62,24" fill="#9A9C9F"/>
      <polygon points="82,40 58,38 66,44" fill="#B7B9BB"/>
      <polygon points="70,74 52,48 60,46" fill="#7E8083"/>
      <polygon points="64,82 46,54 54,54" fill="#9A9C9F"/>
      <polygon points="18,82 40,54 44,58" fill="#B7B9BB"/>
      <polygon points="8,72 34,48 36,54" fill="#7E8083"/>
      <polygon points="2,40 28,38 24,44" fill="#9A9C9F"/>
      <polygon points="6,34 30,32 24,26" fill="#B7B9BB"/>
      <polygon points="40,32 47,37 42,44 37,37" fill="#6B6D70"/>
    </svg>
  );
}

function NibsMark({ className }) {
  // NIBS green "building bars" + swoosh, with wordmark.
  return (
    <svg className={className} viewBox="0 0 300 70" aria-label="Published by the National Institute of Building Sciences">
      <g>
        <polygon points="4,58 14,58 24,14 16,14" fill="#5FA544"/>
        <polygon points="20,58 30,58 38,4 30,4" fill="#3F7E2E"/>
        <polygon points="34,58 44,58 50,18 42,18" fill="#7CC04A"/>
        <polygon points="48,58 58,58 63,28 55,28" fill="#4E9438"/>
        <path d="M2 63 C 22 52, 48 52, 72 61" stroke="#7CC04A" strokeWidth="4" fill="none" strokeLinecap="round"/>
      </g>
      <text x="84" y="24" fontFamily="Arial, sans-serif" fontSize="13" fill="#1f3b66">National Institute of</text>
      <text x="84" y="46" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="20" fill="#1f3b66">BUILDING SCIENCES</text>
      <text x="84" y="63" fontFamily="Georgia, serif" fontStyle="italic" fontSize="11.5" fill="#2f5e8f">Building American Innovation</text>
    </svg>
  );
}

/* ---------- NAV ---------- */
function Nav({ content, route }) {
  const [open, setOpen] = useState(false);
  const nav = content.nav || [];
  useEffect(() => { setOpen(false); }, [route]);
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <a className="brand" href="#/">
          <BrandMark className="brand-mark" />
          <span className="brand-text">
            <strong>{content.site?.name || "National CAD Standard"}</strong>
            <span>{content.site?.edition || "NCS7"}</span>
          </span>
        </a>
        <a className="cobrand" href="#/about" title="Published by the National Institute of Building Sciences">
          <NibsMark className="nibs-mark" />
        </a>
        <button className="nav-toggle" aria-label="Menu" onClick={() => setOpen(o => !o)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <ul className={"nav-links" + (open ? " open" : "")}>
          {nav.map(item => (
            <li key={item.route}>
              <a href={item.route} className={route === item.route ? "active" : ""}>{item.label}</a>
            </li>
          ))}
          <li><a className="nav-cta" href="#/pricing">Subscribe</a></li>
        </ul>
      </div>
    </nav>
  );
}

/* ---------- HERO ---------- */
function Hero({ home }) {
  const hero = home?.hero || {};
  useEffect(() => {
    // (Re)initialise the Three.js hero scene now that the canvas is in the DOM.
    if (window.NCSHero && window.NCSHero.initHero) {
      // slight delay to ensure layout is settled
      const id = setTimeout(() => window.NCSHero.initHero(), 30);
      return () => clearTimeout(id);
    }
  }, []);
  function go(route) {
    if (!route) return;
    if (route.startsWith("#")) window.location.hash = route;
    else window.open(route, "_blank");
  }
  return (
    <header className="hero">
      <canvas id="hero-canvas"></canvas>
      <div className="hero-grid-overlay"></div>
      <div className="container hero-inner fade-in">
        {hero.kicker && <div className="kicker">{hero.kicker}</div>}
        <h1>{renderTitle(hero.title)}</h1>
        <p className="lead">{hero.subtitle}</p>
        <div className="hero-cta">
          {hero.primaryCta &&
            <button className="btn btn-primary" onClick={() => go(hero.primaryCta.route)}>
              {hero.primaryCta.label} <Icon name="arrow" width="18" height="18" />
            </button>}
          {hero.secondaryCta &&
            <button className="btn btn-ghost" onClick={() => go(hero.secondaryCta.route)}>
              <Icon name="cube" width="18" height="18" /> {hero.secondaryCta.label}
            </button>}
        </div>
      </div>
    </header>
  );
}
// highlight the last word of the hero title
function renderTitle(title) {
  if (!title) return "Built on one standard.";
  const words = title.split(" ");
  const last = words.pop();
  return <>{words.join(" ")} <span className="hl">{last}</span></>;
}

/* ---------- HOME ---------- */
function Home({ content }) {
  const home = content.home || {};
  return (
    <>
      <Hero home={home} />
      <div className="hero-stats">
        <div className="container">
          {(home.stats || []).map((s, i) => (
            <div className="stat" key={i}>
              <div className="v">{s.value}</div>
              <div className="l">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">The problem it solves</p>
            <h2>{home.intro?.title}</h2>
            <p className="sub">{home.intro?.body}</p>
          </div>
          <div className="feature-grid">
            {(home.features || []).map((f, i) => (
              <div className="card" key={i}>
                <div className="ico"><Icon name={f.icon} /></div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">What's inside NCS7</p>
            <h2>Six integrated modules</h2>
            <p className="sub">Each module is available as a professionally typeset PDF — buy one, or get the complete set.</p>
          </div>
          <div className="product-grid">
            {(content.products || []).slice(0, 4).map(p => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 36 }}>
            <a className="btn btn-outline" href="#/products">View all modules <Icon name="arrow" width="18" height="18" /></a>
          </div>
        </div>
      </section>

      <CtaStrip />
    </>
  );
}

/* ---------- ABOUT ---------- */
function About({ content }) {
  const a = content.about || {};
  return (
    <section className="section" style={{ paddingTop: 130 }}>
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">About</p>
          <h2>{a.title}</h2>
        </div>
        <p className="about-lead">{a.lead}</p>
        <p className="about-body">{a.body}</p>

        <div className="principles">
          {(a.principles || []).map((p, i) => (
            <div className="principle" key={i}>
              <h4>{p.title}</h4>
              <p>{p.body}</p>
            </div>
          ))}
        </div>

        <div className="timeline">
          <h3 style={{ fontSize: 22, margin: "0 0 8px" }}>How we got to Version 7</h3>
          {(a.timeline || []).map((t, i) => (
            <div className="timeline-item" key={i}>
              <div className="timeline-year">{t.year}</div>
              <div className="timeline-event">{t.event}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- PRODUCT CARD + MODAL ---------- */
function ProductCard({ product, compact }) {
  const [modal, setModal] = useState(null); // 'view' | 'buy' | null
  return (
    <>
      <div className="product fade-in">
        <div className="product-top">
          <div className="product-cat">{product.category}</div>
          <h3>{product.title}</h3>
          <div className="product-sku">{product.sku} · {product.format} · {product.pages} pp</div>
        </div>
        <div className="product-body">
          <p>{compact ? product.summary : (product.description || product.summary)}</p>
          {!compact && (
            <>
              <div className="product-meta">
                <span><b>{product.pages}</b> pages</span>
                <span>Format <b>{product.format}</b></span>
                <span>SKU <b>{product.sku}</b></span>
              </div>
              <div className="tags">
                {(product.highlights || []).map((h, i) => <span className="tag" key={i}>{h}</span>)}
              </div>
            </>
          )}
        </div>
        <div className="product-foot">
          <div className="price">${product.price}<small> /PDF</small></div>
          <div className="product-actions">
            <button className="btn btn-sm btn-outline" onClick={() => setModal("view")}><Icon name="eye" width="15" height="15" /> View</button>
            <button className="btn btn-sm btn-primary" onClick={() => setModal("buy")}><Icon name="cart" width="15" height="15" /> Buy</button>
          </div>
        </div>
      </div>
      {modal && <ProductModal product={product} mode={modal} onClose={() => setModal(null)} />}
    </>
  );
}

function ProductModal({ product, mode, onClose }) {
  const buy = mode === "buy";
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{buy ? "Purchase" : "Preview"} — {product.title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          {!buy && (
            <>
              <p>This is a demo preview of the <b>{product.sku}</b> PDF ({product.pages} pages). In production, the licensed PDF renders inline via pdf.js or downloads on purchase.</p>
              <div className="pdf-mock">
                <div className="pdf-title">{product.title} — {product.category}</div>
              </div>
            </>
          )}
          {buy && (
            <>
              <p>You're purchasing <b>{product.title}</b> ({product.sku}) as a downloadable {product.format}.</p>
              <div className="product-meta" style={{ marginBottom: 6 }}>
                <span>Price <b>${product.price}</b></span>
                <span>Format <b>{product.format}</b></span>
                <span>Pages <b>{product.pages}</b></span>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)" }}>Demo checkout — no payment is processed. In production this hands off to Stripe and unlocks the PDF for the licensed user.</p>
            </>
          )}
        </div>
        <div className="modal-foot">
          {!buy
            ? <><a className="btn btn-outline" href="#/viewer" onClick={onClose}><Icon name="cube" width="16" height="16" /> Open in 3D viewer</a>
                <button className="btn btn-primary" onClick={onClose}>Close</button></>
            : <><button className="btn btn-outline" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={() => { alert("Demo: purchase confirmed for " + product.sku); onClose(); }}><Icon name="download" width="16" height="16" /> Confirm & download</button></>}
        </div>
      </div>
    </div>
  );
}

/* ---------- PRODUCTS PAGE ---------- */
function Products({ content }) {
  return (
    <section className="section" style={{ paddingTop: 130 }}>
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Standards</p>
          <h2>The NCS7 module library</h2>
          <p className="sub">Every chapter of the National CAD Standard, available as a downloadable PDF. View a preview, download, or buy — individually or as the complete set.</p>
        </div>
        <div className="product-grid">
          {(content.products || []).map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}

/* ---------- PRICING ---------- */
function Pricing({ content }) {
  const pr = content.pricing || {};
  return (
    <section className="section" style={{ paddingTop: 130 }}>
      <div className="container">
        <div className="section-head center">
          <p className="eyebrow">Pricing</p>
          <h2>{pr.title}</h2>
          <p className="sub">{pr.subtitle}</p>
        </div>
        <div className="pricing-grid">
          {(pr.plans || []).map(plan => (
            <div className={"plan" + (plan.featured ? " featured" : "")} key={plan.id}>
              {plan.featured && <span className="ribbon">Most popular</span>}
              <h3>{plan.name}</h3>
              <div className="plan-price">{plan.price}</div>
              <div className="plan-period">{plan.period}</div>
              <p className="plan-blurb">{plan.blurb}</p>
              <ul>
                {(plan.features || []).map((f, i) => (
                  <li key={i}><Icon name="check" /> {f}</li>
                ))}
              </ul>
              <a className={"btn " + (plan.featured ? "btn-primary" : "btn-outline")}
                 href={plan.id === "enterprise" ? "#/contact" : "#/products"}>{plan.cta}</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- RESOURCES ---------- */
function Resources({ content }) {
  const r = content.resources || {};
  function act(item) {
    if (item.title.toLowerCase().includes("3d") || item.type === "Immersive") window.location.hash = "#/viewer";
    else alert("Demo: \"" + item.action + "\" — " + item.title);
  }
  return (
    <section className="section" style={{ paddingTop: 130 }}>
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Resources</p>
          <h2>{r.title}</h2>
          <p className="sub">{r.subtitle}</p>
        </div>
        <div className="resource-grid">
          {(r.items || []).map((item, i) => (
            <div className="resource" key={i}>
              <div className="rtype">{item.type}</div>
              <h4>{item.title}</h4>
              <p>{item.body}</p>
              <div><button className="btn btn-sm btn-outline" onClick={() => act(item)}>{item.action}</button></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- CONTACT ---------- */
function Contact({ content }) {
  const c = content.contact || {};
  const [sent, setSent] = useState(false);
  return (
    <section className="section" style={{ paddingTop: 130 }}>
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Contact</p>
          <h2>{c.title}</h2>
          <p className="sub">{c.subtitle}</p>
        </div>
        <div className="contact-wrap">
          <form onSubmit={e => { e.preventDefault(); setSent(true); }}>
            {sent && <div className="alert-ok">Thanks — your message was received (demo, nothing was sent).</div>}
            <div className="field"><label>Name</label><input required placeholder="Jane Architect" /></div>
            <div className="field"><label>Organization</label><input placeholder="Firm or agency" /></div>
            <div className="field"><label>Email</label><input type="email" required placeholder="you@firm.com" /></div>
            <div className="field"><label>Message</label><textarea required placeholder="How can we help?"></textarea></div>
            <button className="btn btn-primary" type="submit"><Icon name="mail" width="18" height="18" /> Send message</button>
            <p className="form-note">Demo form — submissions are not stored or emailed.</p>
          </form>
          <aside className="contact-info">
            <h4>{c.office?.name}</h4>
            <div className="ci-row"><Icon name="pin" /> <span>{c.office?.address}</span></div>
            <div className="ci-row"><Icon name="mail" /> <span>{c.office?.email}</span></div>
            <div className="ci-row"><Icon name="phone" /> <span>{c.office?.phone}</span></div>
          </aside>
        </div>
      </div>
    </section>
  );
}

/* ---------- CTA STRIP + FOOTER ---------- */
function CtaStrip() {
  return (
    <section className="cta-strip">
      <div className="container">
        <h2>Speak the standard fluently.</h2>
        <p>Equip your team with the complete National CAD Standard, Version 7 — and see it come alive in 3D.</p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <a className="btn btn-primary" href="#/pricing">Order the NCS</a>
          <a className="btn btn-ghost" href="#/viewer"><Icon name="cube" width="18" height="18" /> Try the 3D viewer</a>
        </div>
      </div>
    </section>
  );
}

function Footer({ content }) {
  const f = content.footer || {};
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <a className="brand" href="#/">
              <BrandMark className="brand-mark" />
              <span className="brand-text">
                <strong>{content.site?.name}</strong>
                <span>{content.site?.edition}</span>
              </span>
            </a>
            <p className="footer-blurb">{f.blurb}</p>
            <a className="footer-nibs" href="#/about" title="National Institute of Building Sciences">
              <NibsMark className="nibs-mark-footer" />
            </a>
          </div>
          {(f.columns || []).map((col, i) => (
            <div className="footer-col" key={i}>
              <h5>{col.title}</h5>
              {(col.links || []).map((l, j) => <a key={j} href={l.route}>{l.label}</a>)}
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>{f.legal}</span>
          <span className="badge">A product of AIA · CSI · NIBS</span>
        </div>
      </div>
    </footer>
  );
}

/* ---------- ROUTER + APP SHELL ---------- */
function useHashRoute() {
  const [route, setRoute] = useState(window.location.hash || "#/");
  useEffect(() => {
    const onHash = () => {
      setRoute(window.location.hash || "#/");
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

/* ---------- 3D CAD VIEWER (in-app, uses global THREE — works everywhere) ---------- */
function Viewer() {
  const ref = useRef(null);
  useEffect(() => {
    let dispose = function () {};
    const id = setTimeout(() => {
      if (window.NCSViewer && ref.current) dispose = window.NCSViewer.init(ref.current);
    }, 40);
    return () => { clearTimeout(id); try { dispose(); } catch (e) {} };
  }, []);
  return (
    <section className="section viewer-section" style={{ paddingTop: 120 }}>
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Immersive · Bonus</p>
          <h2>The drawing, exploded in 3D</h2>
          <p className="sub">Instead of a flat PDF, present the standard as an explorable model — disciplines stacked as layers. Drag to orbit, scroll to zoom.</p>
        </div>
        <div className="viewer-stage">
          <canvas ref={ref} className="viewer-canvas"></canvas>
          <div className="viewer-legend">
            <span><i style={{ background: "#46c2ff" }}></i> Architectural</span>
            <span><i style={{ background: "#ffd166" }}></i> Structural</span>
            <span><i style={{ background: "#6ee7b7" }}></i> MEP</span>
          </div>
        </div>
        <p className="viewer-note">Built with Three.js and free tooling. In production, an uploaded CAD PDF is parsed (pdf.js) and its layers mapped onto this 3D presentation.</p>
      </div>
    </section>
  );
}

const ROUTES = {
  "#/": Home,
  "#/about": About,
  "#/products": Products,
  "#/pricing": Pricing,
  "#/resources": Resources,
  "#/viewer": Viewer,
  "#/contact": Contact
};

function App() {
  const [content, setContent] = useState(null);
  const [source, setSource] = useState("");
  const route = useHashRoute();

  useEffect(() => {
    let alive = true;
    async function load() {
      // Try the live CMS first; fall back to the static seed so the
      // SPA works with or without the backend.
      try {
        const res = await fetch("/api/content", { cache: "no-store" });
        if (!res.ok) throw new Error("api " + res.status);
        const data = await res.json();
        if (alive) { setContent(data); setSource("live CMS · /api/content"); }
        return;
      } catch (e) {
        try {
          const res2 = await fetch("./content.json", { cache: "no-store" });
          const data2 = await res2.json();
          if (alive) { setContent(data2); setSource("static fallback · content.json"); }
        } catch (e2) {
          console.error("Failed to load content", e2);
        }
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  if (!content) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  const Page = ROUTES[route.split("?")[0]] || Home;

  return (
    <>
      <Nav content={content} route={route} />
      <main key={route}>
        <Page content={content} />
      </main>
      <Footer content={content} />
      <div className="src-badge">content: {source}</div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<App />);
