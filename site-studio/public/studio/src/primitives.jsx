/* Studio primitives — Card, Eyebrow, Chip, Dot, Tag, Avatar, Btn, Slot, MediaTile,
   Skel, Toggle, Hint, SectionHeader, ChatBubble, Meter, Field, Tabs, Seg.
   Adapted from the Claude Design template, scoped to .studio-shell. */

const Card = ({ children, hi, hover, style, className = "", onClick }) => (
  <div
    className={`card ${hi ? "card-hi" : ""} ${hover ? "card-hover" : ""} ${className}`}
    style={style} onClick={onClick}>
    {children}
  </div>
);

const Eyebrow = ({ children, style }) => <div className="eyebrow" style={style}>{children}</div>;

const Chip = ({ children, tone = "", style }) => (
  <span className={`chip ${tone ? "chip-" + tone : ""}`} style={style}>{children}</span>
);

const Dot = ({ tone = "" }) => <span className={`dot ${tone ? "dot-" + tone : ""}`} />;

const Tag = ({ children, tone, style }) => (
  <span className="tag" style={tone === "ember" ? { color: "var(--ember)", borderColor: "oklch(0.78 0.14 65 / 0.3)", ...style } : style}>
    {children}
  </span>
);

const Avatar = ({ kind = "default", initials = "F" }) => (
  <span className={`avatar ${kind}`}>{initials}</span>
);

const Btn = ({ children, kind = "default", icon, onClick, style, title, disabled }) => {
  const cls = kind === "primary" ? "btn btn-primary"
            : kind === "ghost"   ? "btn btn-ghost"
            : "btn";
  return (
    <button className={cls} onClick={onClick} style={style} title={title} disabled={disabled}>
      {icon ? <I name={icon} /> : null}
      {children}
    </button>
  );
};

const Slot = ({ filled, children, style }) => (
  <div className={`slot ${filled ? "filled" : ""}`} style={style}>{children}</div>
);

const MediaTile = ({ seed = 0, label, ratio = "1 / 1", style, badge }) => {
  const grads = [
    "linear-gradient(135deg, oklch(0.32 0.10 50), oklch(0.18 0.06 30))",
    "linear-gradient(135deg, oklch(0.30 0.08 200), oklch(0.16 0.05 230))",
    "linear-gradient(135deg, oklch(0.28 0.10 320), oklch(0.16 0.06 280))",
    "linear-gradient(135deg, oklch(0.30 0.07 150), oklch(0.16 0.05 180))",
    "linear-gradient(135deg, oklch(0.34 0.09 80), oklch(0.18 0.05 50))",
    "linear-gradient(135deg, oklch(0.26 0.08 260), oklch(0.14 0.05 280))",
    "linear-gradient(135deg, oklch(0.32 0.10 20), oklch(0.18 0.06 5))",
    "linear-gradient(135deg, oklch(0.30 0.10 100), oklch(0.16 0.05 70))",
  ];
  const g = grads[Math.abs(seed) % grads.length];
  return (
    <div className="media-tile" style={{ aspectRatio: ratio, background: g, ...style }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.4 }}>
        <circle cx="30" cy="30" r="30" fill="oklch(1 0 0 / 0.10)" />
        {[...Array(4)].map((_, i) => (
          <ellipse key={i} cx="50" cy="50" rx={20 + i * 6} ry={10 + i * 4} fill="none" stroke="oklch(1 0 0 / 0.06)" />
        ))}
      </svg>
      {label ? (
        <span className="mono" style={{ position: "absolute", left: 8, bottom: 6, fontSize: 9, color: "oklch(1 0 0 / 0.55)", letterSpacing: "0.05em" }}>
          {label}
        </span>
      ) : null}
      {badge ? <span style={{ position: "absolute", right: 6, top: 6 }}>{badge}</span> : null}
    </div>
  );
};

const Skel = ({ w = "100%", h = 12, style }) => <div className="skel" style={{ width: w, height: h, ...style }} />;

const Toggle = ({ on, onChange, label }) => (
  <label className="row" style={{ cursor: "pointer", gap: 8, fontSize: 12, color: "var(--ink-2)" }}>
    <span
      onClick={() => onChange?.(!on)}
      style={{
        width: 28, height: 16, borderRadius: 999,
        background: on ? "var(--ember)" : "oklch(1 0 0 / 0.10)",
        position: "relative", transition: "all 160ms",
      }}>
      <span style={{
        position: "absolute", top: 2, left: on ? 14 : 2,
        width: 12, height: 12, borderRadius: "50%",
        background: on ? "oklch(0.18 0.04 60)" : "oklch(0.85 0.005 265)",
        transition: "all 160ms",
      }} />
    </span>
    {label ? <span>{label}</span> : null}
  </label>
);

const Hint = ({ children, style }) => <div className="placeholder-note" style={style}>{children}</div>;

const SectionHeader = ({ eyebrow, title, sub, right, style }) => (
  <div className="between" style={{ marginBottom: 14, ...style }}>
    <div>
      {eyebrow ? <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div> : null}
      <div className="h-display">{title}</div>
      {sub ? <div className="muted mt-2" style={{ fontSize: 13, maxWidth: 720 }}>{sub}</div> : null}
    </div>
    {right ? <div className="row gap-2">{right}</div> : null}
  </div>
);

const ChatBubble = ({ who = "shay", children, meta }) => {
  const isShay = who === "shay";
  return (
    <div className="row" style={{ alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
      <Avatar kind={isShay ? "shay" : "fritz"} initials={isShay ? "S" : "F"} />
      <div className="grow">
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <span className="fw-500 fz-12">{isShay ? "Shay" : "Fritz"}</span>
          {meta ? <span className="dim fz-11">{meta}</span> : null}
        </div>
        <div className="fz-12" style={{ color: "var(--ink-2)", lineHeight: 1.55 }}>{children}</div>
      </div>
    </div>
  );
};

const Meter = ({ value = 50, tone }) => (
  <div className="meter">
    <i style={{ width: `${value}%`, background: tone === "good" ? "var(--good)" : tone === "warn" ? "var(--warn)" : undefined }} />
  </div>
);

const Field = ({ label, children, sub }) => (
  <div className="col" style={{ gap: 6 }}>
    <div className="between">
      <div className="fz-11" style={{ color: "var(--ink-3)", letterSpacing: "0.02em" }}>{label}</div>
      {sub ? <div className="dim fz-11">{sub}</div> : null}
    </div>
    {children}
  </div>
);

const Tabs = ({ items, value, onChange, right }) => (
  <div className="tabs between">
    <div style={{ display: "flex", gap: 14 }}>
      {items.map((t) => (
        <div key={t} className={`tab ${value === t ? "active" : ""}`} onClick={() => onChange?.(t)}>{t}</div>
      ))}
    </div>
    {right ? <div style={{ paddingBottom: 6 }}>{right}</div> : null}
  </div>
);

const Seg = ({ items, value, onChange }) => (
  <div className="seg">
    {items.map((it) => (
      <button key={it} className={value === it ? "on" : ""} onClick={() => onChange?.(it)}>{it}</button>
    ))}
  </div>
);

Object.assign(window, {
  Card, Eyebrow, Chip, Dot, Tag, Avatar, Btn, Slot, MediaTile, Skel, Toggle,
  Hint, SectionHeader, ChatBubble, Meter, Field, Tabs, Seg,
});
