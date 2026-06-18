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

/* ---------- brand marks (the real NCS + NIBS logos, recreated as SVG) ---------- */
function BrandMark({ className }) {
  // NCS "shattered star": grey star body, red top point, fragments flying right.
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      {/* full star body in grey */}
      <polygon points="50,6 60,36.25 91.8,36.4 66.2,55.25 75.9,85.6 50,67 24.1,85.6 33.83,55.25 8.2,36.4 40,36.25"
               fill="#939598"/>
      {/* red top point + upper accent */}
      <polygon points="50,6 60,36.25 40,36.25" fill="#ED1C24"/>
      <polygon points="50,6 61,38 67,42 54,29" fill="#C8161D"/>
      {/* shatter gaps (paper-colour) + flying shards on the right */}
      <polygon points="62,48 71,46 66,56" fill="#ffffff"/>
      <polygon points="57,60 66,63 60,69" fill="#ffffff"/>
      <polygon points="46,46 53,48 49,55" fill="#ffffff"/>
      <polygon points="80,40 89,38 84,47" fill="#bcbec0"/>
      <polygon points="87,52 96,51 91,59" fill="#d0d2d3"/>
      <polygon points="78,59 86,61 80,67" fill="#bcbec0"/>
    </svg>
  );
}

function NcsLogo() {
  // Full lockup used as the nav brand: star + "NCS" + registered tagline.
  return (
    <span className="ncs-logo">
      <BrandMark className="brand-mark" />
      <span className="ncs-word">
        <strong>NCS</strong>
        <small>United States National CAD Standard<sup>®</sup></small>
      </span>
    </span>
  );
}

function NibsMark({ className }) {
  // NIBS: four ascending angled bars (green/navy) + green swoosh, navy wordmark.
  return (
    <svg className={className} viewBox="0 0 300 70" aria-label="National Institute of Building Sciences">
      <g>
        <polygon points="4,58 13,58 21,20 12,20" fill="#7AC143"/>
        <polygon points="17,58 26,58 33,13 24,13" fill="#1B3A5B"/>
        <polygon points="30,58 39,58 45,18 36,18" fill="#7AC143"/>
        <polygon points="43,58 52,58 57,11 48,11" fill="#1B3A5B"/>
        <path d="M2 62 C 22 52, 48 52, 70 60" stroke="#7AC143" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
      </g>
      <text x="84" y="24" fontFamily="Arial, Helvetica, sans-serif" fontSize="15" fill="#1B3A5B">National Institute of</text>
      <text x="84" y="47" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="22" fill="#15294a" letterSpacing="0.3">BUILDING SCIENCES</text>
      <text x="278" y="34" fontFamily="Arial, sans-serif" fontSize="9" fill="#15294a">&#8482;</text>
      <text x="86" y="63" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontSize="12.5" fill="#2f5e8f">Building American Innovation</text>
    </svg>
  );
}

/* ---------- NAV ---------- */
function Nav({ content, route, auth }) {
  const [open, setOpen] = useState(false);
  const nav = content.nav || [];
  useEffect(() => { setOpen(false); }, [route]);
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <a className="brand" href="#/" aria-label="United States National CAD Standard home">
          <NcsLogo />
        </a>
        <a className="cobrand" href="#/about" title="A program of the National Institute of Building Sciences">
          <span className="cobrand-label">A program of</span>
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
          {auth && auth.user
            ? <>
                <li><a href="#/member" className={route === "#/member" ? "active" : ""}>My NCS</a></li>
                <li><a className="nav-cta" href="#/member" onClick={(e) => { e.preventDefault(); auth.logout(); }}>Log out</a></li>
              </>
            : <li><a className="nav-cta" href="#/login">Log in</a></li>}
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
function Home({ content, auth }) {
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
              <ProductCard key={p.id} product={p} compact auth={auth} />
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
function ProductCard({ product, compact, auth }) {
  const [modal, setModal] = useState(null); // 'view' | null
  const signedIn = auth && auth.user;
  return (
    <>
      <div className="product fade-in">
        <div className="product-top">
          <div className="product-cat">{product.category}</div>
          <h3>{product.title}</h3>
          <div className="product-sku">{product.sku} · {product.format}{product.pages ? " · " + product.pages + " pp" : ""}</div>
        </div>
        <div className="product-body">
          <p>{compact ? product.summary : (product.description || product.summary)}</p>
          {!compact && (
            <div className="tags">
              {(product.highlights || []).map((h, i) => <span className="tag" key={i}>{h}</span>)}
            </div>
          )}
        </div>
        <div className="product-foot">
          {signedIn
            ? <><span className="access-ok"><Icon name="check" /> Licensed</span>
                <div className="product-actions">
                  <button className="btn btn-sm btn-outline" onClick={() => setModal("view")}><Icon name="eye" width="15" height="15" /> View PDF</button>
                </div></>
            : <><span className="access-lock">🔒 Members</span>
                <div className="product-actions">
                  <a className="btn btn-sm btn-primary" href="#/login"><Icon name="arrow" width="15" height="15" /> Log in to access</a>
                </div></>}
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
function Products({ content, auth }) {
  const signedIn = auth && auth.user;
  return (
    <section className="section" style={{ paddingTop: 130 }}>
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">NCS Content</p>
          <h2>What's in the Standard</h2>
          <p className="sub">The National CAD Standard combines the AIA CAD Layer Guidelines, the CSI Uniform Drawing System (8 modules), and the NIBS BIM &amp; Plotting Guidelines. The full text and data files are available to licensed users after sign-in.</p>
        </div>
        {!signedIn && (
          <div className="access-banner">
            <span>🔒 This page shows the program contents only. <b>Licensed users log in</b> to view and download the full standard.</span>
            <span className="ab-actions"><a className="btn btn-sm btn-primary" href="#/login">Log in</a><a className="btn btn-sm btn-outline" href="#/pricing">Order a license</a></span>
          </div>
        )}
        <div className="product-grid">
          {(content.products || []).map(p => <ProductCard key={p.id} product={p} auth={auth} />)}
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
            <a className="brand" href="#/"><NcsLogo /></a>
            <p className="footer-blurb">{f.blurb}</p>
            <div className="footer-nibs-wrap">
              <span className="cobrand-label">A program of the National Institute of Building Sciences</span>
              <NibsMark className="nibs-mark-footer" />
            </div>
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

/* ---------- AUTH (client-side session; works with no server) ---------- */
const SESSION_KEY = "ncs_session";
function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; } }
function saveSession(s) { try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch (e) {} }

/* ---------- LOGIN ---------- */
function Login({ auth }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  function submit(e) {
    e.preventDefault();
    if (!u.trim() || !p.trim()) { setErr("Enter any username and password (demo)."); return; }
    auth.login(u.trim());
    window.location.hash = "#/member";
  }
  return (
    <section className="section" style={{ paddingTop: 130 }}>
      <div className="container narrow">
        <div className="section-head">
          <p className="eyebrow">Licensee access</p>
          <h2>Log in to the NCS</h2>
          <p className="sub">The public site shows program information only. The full standard — every module PDF and data file — is available to licensed users after sign-in.</p>
        </div>
        <form className="login-card" onSubmit={submit}>
          {err && <div className="alert-warn">{err}</div>}
          <div className="field"><label>Username or license email</label><input value={u} onChange={e => setU(e.target.value)} placeholder="you@firm.com" /></div>
          <div className="field"><label>Password</label><input type="password" value={p} onChange={e => setP(e.target.value)} placeholder="••••••••" /></div>
          <button className="btn btn-primary" type="submit"><Icon name="arrow" width="18" height="18" /> Sign in</button>
          <p className="form-note">Demo sign-in — <b>any</b> username and password work. No real authentication or payment is performed; this mirrors the real "access after login" model.</p>
        </form>
      </div>
    </section>
  );
}

/* ---------- MEMBER AREA (post-login access to the standard) ---------- */
function Member({ content, auth }) {
  const [view, setView] = useState(null);
  if (!auth.user) return <Login auth={auth} />;
  const products = content.products || [];
  return (
    <section className="section" style={{ paddingTop: 120 }}>
      <div className="container">
        <div className="member-head">
          <div>
            <p className="eyebrow">My NCS · Licensed access</p>
            <h2>The Standard — full access</h2>
            <p className="sub">Signed in as <b>{auth.user}</b>. View any module or download the accompanying data files. (Public visitors never see this — it is behind login.)</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => auth.logout()}>Log out</button>
        </div>
        <div className="member-grid">
          {products.map(p => (
            <div className="member-item" key={p.id}>
              <div className="member-cat">{p.category}</div>
              <h3>{p.title}</h3>
              <p>{p.summary}</p>
              <div className="member-meta">{p.format}{p.pages ? " · " + p.pages + " pp" : ""} · {p.sku}</div>
              <div className="member-actions">
                <button className="btn btn-sm btn-primary" onClick={() => setView(p)}><Icon name="eye" width="15" height="15" /> View PDF</button>
                <button className="btn btn-sm btn-outline" onClick={() => alert("Demo download: " + p.sku + " (" + p.format + "). In production the licensed file streams to the signed-in user.")}><Icon name="download" width="15" height="15" /> Download</button>
              </div>
            </div>
          ))}
          <div className="member-item member-3d">
            <div className="member-cat">Immersive</div>
            <h3>3D drawing viewer</h3>
            <p>Explore a construction drawing exploded into discipline layers.</p>
            <div className="member-actions"><a className="btn btn-sm btn-primary" href="#/viewer"><Icon name="cube" width="15" height="15" /> Open 3D viewer</a></div>
          </div>
        </div>
      </div>
      {view && <ProductModal product={view} mode="view" onClose={() => setView(null)} />}
    </section>
  );
}

/* ---------- generic content page (What's New, FAQs, News, Press, Copyright) ---------- */
function InfoPage({ content, pageKey, eyebrow }) {
  const page = (content.pages && content.pages[pageKey]) || { title: "Page", sections: [] };
  return (
    <section className="section" style={{ paddingTop: 130 }}>
      <div className="container narrow-md">
        <div className="section-head">
          <p className="eyebrow">{eyebrow || "Information"}</p>
          <h2>{page.title}</h2>
          {page.intro && <p className="sub">{page.intro}</p>}
        </div>
        <div className="info-body">
          {(page.sections || []).map((s, i) => (
            <div className="info-block" key={i}>
              {s.h && <h3>{s.h}</h3>}
              {s.body && <p>{s.body}</p>}
              {Array.isArray(s.items) && <ul>{s.items.map((it, j) => <li key={j}>{it}</li>)}</ul>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
const WhatsNew  = ({ content }) => <InfoPage content={content} pageKey="whatsnew" eyebrow="Version 7" />;
const Faqs      = ({ content }) => <InfoPage content={content} pageKey="faqs" eyebrow="FAQs" />;
const News      = ({ content }) => <InfoPage content={content} pageKey="news" eyebrow="News" />;
const Press     = ({ content }) => <InfoPage content={content} pageKey="press" eyebrow="Press" />;
const Copyright = ({ content }) => <InfoPage content={content} pageKey="copyright" eyebrow="Legal" />;

const ROUTES = {
  "#/": Home,
  "#/whatsnew": WhatsNew,
  "#/faqs": Faqs,
  "#/news": News,
  "#/press": Press,
  "#/copyright": Copyright,
  "#/about": About,
  "#/products": Products,
  "#/pricing": Pricing,
  "#/resources": Resources,
  "#/viewer": Viewer,
  "#/login": Login,
  "#/member": Member,
  "#/contact": Contact
};

function App() {
  const [content, setContent] = useState(null);
  const [source, setSource] = useState("");
  const [user, setUser] = useState(loadSession());
  const route = useHashRoute();

  const auth = {
    user,
    login: (name) => { setUser(name); saveSession(name); },
    logout: () => { setUser(null); saveSession(null); window.location.hash = "#/"; },
  };

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
      <Nav content={content} route={route} auth={auth} />
      <main key={route}>
        <Page content={content} auth={auth} />
      </main>
      <Footer content={content} />
      <div className="src-badge">content: {source}{user ? " · signed in" : " · public view"}</div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<App />);
