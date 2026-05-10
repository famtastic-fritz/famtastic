/* Studio icon set — stroke-based, viewBox=24, size default 16.
   Usage: <I name="sites" />
   Includes the design-template set + 3 added icons (builder, library, site-cog)
   so all 12 rail entries can render. */

const STUDIO_ICONS = {
  // Platform rail
  home:        <><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></>,
  sites:       <><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 9h18"/><path d="M7 13h6"/></>,
  builder:     <><path d="M4 21h16"/><path d="M5 17l5-9 5 5 4-7"/><circle cx="10" cy="8" r="1.4"/></>,
  siteCog:     <><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 9h18"/><circle cx="13" cy="14" r="2"/><path d="M13 11v1M13 16v1M10 14h1M15 14h1"/></>,
  brain:       <><path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 2.83V13a3 3 0 0 0 3 3v1a3 3 0 0 0 5 1 3 3 0 0 0 5-1v-1a3 3 0 0 0 3-3v-2.17A3 3 0 0 0 18 8V7a3 3 0 0 0-3-3 3 3 0 0 0-3 1 3 3 0 0 0-3-1z"/><path d="M12 5v14"/></>,
  research:    <><circle cx="11" cy="11" r="6"/><path d="M21 21l-5.2-5.2M11 8v6M8 11h6"/></>,
  components:  <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M17.5 14v7M14 17.5h7"/></>,
  media:       <><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 15l5-4 4 3 3-2 6 4"/><circle cx="9" cy="9" r="1.5"/></>,
  library:     <><path d="M4 4h4v16H4z"/><path d="M10 4h4v16h-4z"/><path d="M16 6l4 1-3 14-4-1z"/></>,
  shay:        <><path d="M7 5h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-3l-4 3v-3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z"/><path d="M9 10h.01M12 10h.01M15 10h.01"/></>,
  mission:     <><circle cx="12" cy="12" r="9"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="3"/></>,
  settings:    <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.5a7 7 0 0 0-2 1.2L5 5.8 3 9.3l2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.5a7 7 0 0 0 2-1.2l2.4.9 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z"/></>,
  // Misc
  plus:        <><path d="M12 5v14M5 12h14"/></>,
  minus:       <><path d="M5 12h14"/></>,
  arrowRight:  <><path d="M5 12h14M13 5l7 7-7 7"/></>,
  arrowUpRight:<><path d="M7 17L17 7M9 7h8v8"/></>,
  chev:        <><path d="M9 6l6 6-6 6"/></>,
  chevDown:    <><path d="M6 9l6 6 6-6"/></>,
  search:      <><circle cx="11" cy="11" r="6"/><path d="M21 21l-5.2-5.2"/></>,
  spark:       <><path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z"/></>,
  zap:         <><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></>,
  send:        <><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></>,
  play:        <><path d="M6 4l14 8L6 20z"/></>,
  refresh:     <><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></>,
  check:       <><path d="M5 12l5 5 9-11"/></>,
  x:           <><path d="M6 6l12 12M18 6L6 18"/></>,
  more:        <><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></>,
  cube:        <><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/></>,
  link:        <><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 1 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>,
  bell:        <><path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16zM10 21a2 2 0 0 0 4 0"/></>,
  history:     <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
  doc:         <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></>,
  bookmark:    <><path d="M6 3h12v18l-6-4-6 4z"/></>,
  download:    <><path d="M12 3v12M6 11l6 6 6-6M5 21h14"/></>,
  upload:      <><path d="M12 21V9M6 13l6-6 6 6M5 3h14"/></>,
  flow:        <><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h10M7 18h10M5 8v8M19 8v8"/></>,
  filter:      <><path d="M3 4h18l-7 9v6l-4 2v-8z"/></>,
  layers:      <><path d="M12 2l9 5-9 5-9-5z"/><path d="M3 12l9 5 9-5M3 17l9 5 9-5"/></>,
  edit:        <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/></>,
  eye:         <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
  diff:        <><path d="M6 3v12M18 9v12"/><path d="M3 6h6M15 12h6"/><path d="M9 18l-3 3-3-3M15 6l3-3 3 3"/></>,
  bolt:        <><path d="M13 3L4 14h6l-1 7 9-12h-6z"/></>,
  globe:       <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
  copy:        <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></>,
  trash:       <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>,
  branch:      <><circle cx="6" cy="3" r="2"/><circle cx="6" cy="21" r="2"/><circle cx="18" cy="9" r="2"/><path d="M6 5v14"/><path d="M18 11v2a4 4 0 0 1-4 4H6"/></>,
  monitor:     <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M9 21h6M12 17v4"/></>,
  phone:       <><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M11 18h2"/></>,
};

function I({ name, size = 16, style }) {
  const d = STUDIO_ICONS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
         style={{ flexShrink: 0, ...style }}>
      {d}
    </svg>
  );
}

Object.assign(window, { STUDIO_ICONS, I });
