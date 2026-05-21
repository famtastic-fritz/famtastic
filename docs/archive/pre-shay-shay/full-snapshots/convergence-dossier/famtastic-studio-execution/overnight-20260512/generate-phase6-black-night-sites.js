#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..', '..');
const sitesRoot = path.join(repoRoot, 'sites');
const tasksRoot = path.join(repoRoot, 'tasks');
const runId = 'phase-6-build-sites-20260512';
const now = new Date().toISOString();

const sharedCss = `
:root{--ink:#050507;--panel:#0c0d13;--glass:rgba(255,255,255,.075);--line:rgba(255,255,255,.16);--text:#f7f3ea;--muted:#b6ad9b;--gold:#d8ad5f;--chrome:#c8d1dc;--ember:#f05d3c;--violet:#8e6cff;--jade:#4bd0a0;--blue:#4f8cff}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 20% 0%,rgba(216,173,95,.2),transparent 30%),radial-gradient(circle at 80% 15%,rgba(142,108,255,.16),transparent 28%),linear-gradient(135deg,#020204,#090a10 48%,#050506);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}a{color:inherit}.shell{min-height:100vh;overflow:hidden}.noise{position:fixed;inset:0;pointer-events:none;opacity:.23;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(#000,transparent 88%)}.nav{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;padding:18px clamp(18px,4vw,56px);backdrop-filter:blur(20px);background:rgba(2,2,4,.62);border-bottom:1px solid var(--line)}.wordmark{font-family:Georgia,serif;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.navlinks{display:flex;gap:18px;flex-wrap:wrap;color:var(--muted);font-size:.9rem}.navlinks a{text-decoration:none}.btn{display:inline-flex;align-items:center;gap:10px;padding:13px 18px;border:1px solid rgba(216,173,95,.5);border-radius:999px;background:linear-gradient(135deg,rgba(216,173,95,.23),rgba(255,255,255,.06));color:#fff;text-decoration:none;font-weight:800;box-shadow:0 18px 60px rgba(0,0,0,.35)}.btn.secondary{border-color:var(--line);background:rgba(255,255,255,.06);color:var(--chrome)}.hero{padding:86px clamp(20px,6vw,86px) 56px;display:grid;grid-template-columns:minmax(0,1.07fr) minmax(280px,.93fr);gap:42px;align-items:center}.eyebrow{color:var(--gold);text-transform:uppercase;letter-spacing:.22em;font-size:.78rem;font-weight:900}.hero h1{font-family:Georgia,serif;font-size:clamp(3.4rem,8vw,8.5rem);line-height:.86;margin:14px 0 22px;letter-spacing:-.07em}.lede{max-width:760px;color:#d8d2c6;font-size:clamp(1.08rem,2vw,1.35rem)}.hero-card,.card,.feature,.panel{border:1px solid var(--line);background:linear-gradient(145deg,rgba(255,255,255,.105),rgba(255,255,255,.035));box-shadow:0 30px 100px rgba(0,0,0,.48),inset 0 1px rgba(255,255,255,.12);backdrop-filter:blur(18px);border-radius:30px}.hero-card{min-height:520px;padding:28px;position:relative;overflow:hidden}.orb{position:absolute;border-radius:999px;filter:blur(3px);opacity:.78}.orb.one{width:250px;height:250px;background:radial-gradient(circle,var(--gold),transparent 68%);right:-60px;top:-40px}.orb.two{width:360px;height:360px;background:radial-gradient(circle,rgba(79,140,255,.85),transparent 64%);left:-90px;bottom:-110px}.poster{position:absolute;inset:28px;border:1px solid rgba(255,255,255,.2);border-radius:24px;padding:26px;display:flex;flex-direction:column;justify-content:space-between;background:linear-gradient(160deg,rgba(0,0,0,.18),rgba(255,255,255,.055))}.poster strong{font-family:Georgia,serif;font-size:clamp(2rem,4vw,4.2rem);line-height:.9}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:30px}.stat{padding:16px;border-radius:20px;background:rgba(255,255,255,.06);border:1px solid var(--line)}.stat b{display:block;font-size:1.5rem;color:#fff}.section{padding:58px clamp(20px,6vw,86px)}.section h2{font-family:Georgia,serif;font-size:clamp(2.2rem,5vw,5rem);letter-spacing:-.045em;line-height:.95;margin:0 0 16px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.card,.feature,.panel{padding:24px}.card h3,.feature h3{margin-top:0;font-size:1.3rem}.kicker{color:var(--muted);max-width:800px}.band{margin:30px clamp(20px,6vw,86px);padding:28px;border-block:1px solid var(--line);display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;color:var(--chrome)}.cta{margin:48px clamp(20px,6vw,86px) 78px;padding:42px;border-radius:34px;background:linear-gradient(135deg,rgba(216,173,95,.22),rgba(79,140,255,.14));border:1px solid rgba(216,173,95,.32);display:flex;justify-content:space-between;gap:24px;align-items:center;flex-wrap:wrap}.footer{padding:30px clamp(20px,6vw,86px);border-top:1px solid var(--line);color:var(--muted);display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap}.badge{display:inline-flex;border:1px solid var(--line);padding:8px 11px;border-radius:999px;color:var(--chrome);background:rgba(255,255,255,.05);margin:4px}.table{width:100%;border-collapse:collapse;overflow:hidden;border-radius:24px}.table th,.table td{text-align:left;padding:16px;border-bottom:1px solid var(--line)}.table th{color:var(--gold);font-size:.8rem;letter-spacing:.14em;text-transform:uppercase}.form{display:grid;gap:12px;max-width:560px}.form input,.form textarea,.form select{width:100%;padding:14px 16px;border-radius:16px;border:1px solid var(--line);background:rgba(0,0,0,.35);color:var(--text)}.form button{border:0;cursor:pointer}.note{font-size:.88rem;color:var(--muted)}@media(max-width:860px){.hero{grid-template-columns:1fr;padding-top:50px}.hero-card{min-height:360px}.grid,.grid.two{grid-template-columns:1fr}.stats{grid-template-columns:1fr}.nav{align-items:flex-start;gap:12px;flex-direction:column}.hero h1{font-size:clamp(3rem,17vw,5rem)}}
`;

const sites = [
  {
    tag: 'site-bam-bam-civic', name: 'Bam Bam Civic', type: 'campaign civic movement', accent: '#d8ad5f',
    eyebrow: 'Tim “BAM BAM” Johnson · Civic movement',
    headline: 'From the charts to the city charter.',
    lede: 'A midnight-polished campaign home for a famous rapper turned public servant: culture fluent, policy serious, and built to turn attention into organized civic action.',
    cta: 'Join the movement', secondary: 'Read the platform', poster: 'BAM BAM\nCIVIC',
    nav: [['Platform','platform.html'],['Events','events.html'],['Volunteer','contact.html']],
    stats: [['47','neighborhood listening stops'],['3','pillar platform'],['24/7','organizer intake']],
    sections: [
      ['Platform with rhythm', 'Housing stability, youth creative economy, safe blocks, and small-business corridors written in clear language — no empty slogans.'],
      ['Movement infrastructure', 'Volunteer captains, barbershop roundtables, Sunday after-service canvasses, and a press kit that respects the community’s time.'],
      ['Culture-to-civic bridge', 'The site uses campaign polish without sanding off BAM BAM’s voice, history, or charisma.']
    ],
    pageDetails: {
      'platform.html': ['Platform', 'Three priorities for a city that can move like a chorus: safe blocks, ownership corridors, and youth creative capital.', ['Safe Blocks / Open Doors', 'Black-owned small business corridors', 'Arts, sports, and technical apprenticeships']],
      'events.html': ['Campaign stops', 'A night-screen schedule for rallies, listening sessions, and block captain trainings.', ['Barbershop policy roundtable', 'Mothers of the movement brunch', 'Late-night youth studio town hall']],
      'contact.html': ['Volunteer and press', 'A conversion-focused intake page for volunteers, donors, press, and local organizers.', ['Volunteer captain', 'Host a listening session', 'Press / booking request']]
    }
  },
  {
    tag: 'site-black-night-barbershop', name: 'Black Night Barbershop', type: 'premium barbershop lounge', accent: '#c8d1dc',
    eyebrow: 'Cuts · lounge · appointment culture', headline: 'The chair, the mirror, the night.',
    lede: 'A luxury neighborhood barbershop and lounge with crisp appointments, grown-man polish, reflective chrome details, and a premium Black grooming point of view.',
    cta: 'Book a chair', secondary: 'See services', poster: 'BLACK\nNIGHT\nCUTS',
    nav: [['Services','services.html'],['Membership','membership.html'],['Book','contact.html']],
    stats: [['45m','signature cut window'],['6','master barbers'],['VIP','after-hours lounge']],
    sections: [
      ['Signature services', 'Precision fades, beard architecture, scalp care, gray blending, and photo-ready finish work.'],
      ['Lounge energy', 'Dark leather, low music, chrome mirrors, private-event grooming, and respectful neighborhood conversation.'],
      ['Appointment-first flow', 'The site pushes clear booking intent without losing the warm barbershop feel.']
    ],
    pageDetails: {
      'services.html': ['Services', 'A premium menu for cuts, beard work, scalp care, and wedding/event grooming.', ['Executive cut', 'Beard architecture', 'After-dark grooming package']],
      'membership.html': ['Membership', 'Monthly chair priority, product lockers, lounge invites, and family-day perks.', ['Priority Saturdays', 'Private product shelf', 'Members-only listening nights']],
      'contact.html': ['Book', 'A simple lead form for appointments, barber preference, and event grooming requests.', ['Choose your barber', 'Pick your service', 'Lock your slot']]
    }
  },
  {
    tag: 'site-glasshouse-records', name: 'Glasshouse Records', type: 'record label launch', accent: '#4bd0a0',
    eyebrow: 'New label · hottest song · midnight launch', headline: 'Break the song. Build the house.',
    lede: 'A glassy Black-night label launch for a new record company pushing the latest hottest song, artist roster energy, playlist conversion, and culture-first momentum.',
    cta: 'Hear the single', secondary: 'Meet the roster', poster: 'GLASS\nHOUSE\nRECORDS',
    nav: [['Single','single.html'],['Roster','roster.html'],['Contact','contact.html']],
    stats: [['1','hottest song campaign'],['5','launch artists'],['88k','street-team target']],
    sections: [
      ['The latest hottest song', 'A hero campaign for the single with streaming CTAs, radio copy, DJ pack request, and social proof slots.'],
      ['Transparent but untouchable', 'Glasshouse feels reflective and premium: you see the talent, but the brand remains mysterious and elevated.'],
      ['Street team to dashboard', 'Capture DJs, playlist curators, dancers, creators, and fans with different conversion paths.']
    ],
    pageDetails: {
      'single.html': ['The single', 'A launch page for the hottest song with lyrics tease, visualizer direction, and streaming links.', ['Stream now', 'DJ clean pack request', 'Creator challenge']],
      'roster.html': ['Roster', 'Five launch artists framed like high-fashion trading cards, with sound lanes and release windows.', ['Trap soul futurist', 'South Florida pressure', 'Velvet R&B closer']],
      'contact.html': ['Industry contact', 'Label intake for press, sync, DJs, playlist curators, and brand partnerships.', ['Press inquiry', 'Sync/licensing', 'DJ pool']]
    }
  },
  {
    tag: 'site-oscars-after-dark-china-edition', name: 'Oscars After Dark: China Edition', type: 'cinematic awards nightlife event', accent: '#e34234',
    eyebrow: 'Awards night · China-style cinema · after dark', headline: 'Red carpet under a black silk sky.',
    lede: 'A cinematic China-style awards and nightlife event site: lacquer red, gold flash, glass reflections, film-premiere drama, VIP tables, and editorial event storytelling.',
    cta: 'Request VIP access', secondary: 'View the program', poster: 'OSCARS\nAFTER\nDARK',
    nav: [['Program','program.html'],['VIP','vip.html'],['Contact','contact.html']],
    stats: [['9pm','doors'],['3','cinematic acts'],['VIP','banquet lounge']],
    sections: [
      ['China-style ceremony drama', 'Lantern glow, black lacquer surfaces, gold typography, modern Shanghai-night energy, and respectful event framing.'],
      ['After-party conversion', 'VIP tables, sponsor packages, arrival windows, dress code, and private concierge request.'],
      ['Editorial event page', 'Built to sell the night without feeling like a generic ticketing template.']
    ],
    pageDetails: {
      'program.html': ['Program', 'A structured evening: arrivals, ceremony moments, performances, banquet lounge, and late-night DJ set.', ['Red carpet arrivals', 'Cinema honors', 'After-dark DJ set']],
      'vip.html': ['VIP tables', 'Concierge-driven packages for tables, sponsors, and hosted guests.', ['Dragon room booth', 'Gold balcony table', 'Sponsor arrival package']],
      'contact.html': ['Concierge', 'Request access, press credentials, or sponsor discussion.', ['VIP request', 'Press credential', 'Sponsor package']]
    }
  },
  {
    tag: 'site-spades-royale-online', name: 'Spades Royale Online', type: 'online spades tournament', accent: '#8e6cff',
    eyebrow: 'Online tournament · brackets · table talk', headline: 'Cut books. Crown legends.',
    lede: 'A premium online Spades tournament site with bracket energy, registration, rules, pot/prize clarity, partner matching, and culturally familiar table-talk confidence.',
    cta: 'Register your team', secondary: 'See the bracket', poster: 'SPADES\nROYALE',
    nav: [['Bracket','bracket.html'],['Rules','rules.html'],['Register','contact.html']],
    stats: [['64','team bracket'],['$5k','prize pool placeholder'],['0','reneges tolerated']],
    sections: [
      ['Tournament-ready', 'Bracket, schedule, rules, prize pool placeholder, Discord/community CTA, and team registration.'],
      ['Black card-table fluency', 'Confident copy that understands partners, books, bags, trash talk, and house rules.'],
      ['Sponsor friendly', 'A polished enough surface for stream sponsors without losing the cookout competitive feel.']
    ],
    pageDetails: {
      'bracket.html': ['Bracket', 'A 64-team royale structure with featured tables, semifinals, and championship stream slots.', ['Round of 64', 'Money table semifinals', 'Final boss table']],
      'rules.html': ['Rules', 'Clear house rules for books, bags, blind bids, misdeals, and disputes.', ['No table talk during play', '10 bags = penalty', 'Judge handles disputes']],
      'contact.html': ['Register', 'Team registration intake with partner info, payment placeholder, and stream consent.', ['Team captain', 'Partner handle', 'Preferred time slot']]
    }
  },
  {
    tag: 'site-the-love-seat', name: 'The Love Seat', type: 'love and dating show', accent: '#ff6f91',
    eyebrow: 'Casting · episodes · grown romance', headline: 'Sit down. Tell the truth. Find the spark.',
    lede: 'A stylish casting and episode hub for a love and dating show with Black-night elegance, grown conversation, tasteful drama, and strong applicant conversion.',
    cta: 'Apply for casting', secondary: 'Watch episodes', poster: 'THE\nLOVE\nSEAT',
    nav: [['Casting','casting.html'],['Episodes','episodes.html'],['Contact','contact.html']],
    stats: [['12','featured singles'],['6','episode arc'],['1','truth seat']],
    sections: [
      ['Casting with taste', 'Applications for singles who can communicate, look good, and bring an actual story.'],
      ['Episode-first storytelling', 'Promos, recaps, host notes, and clips structured like a premium streaming show page.'],
      ['Romance without corniness', 'Warm, seductive, funny, and grown — not generic dating-app gloss.']
    ],
    pageDetails: {
      'casting.html': ['Casting', 'Applicant intake for singles, couples twists, friend nominations, and episode themes.', ['Single applicant', 'Nominate a friend', 'Couples twist']],
      'episodes.html': ['Episodes', 'A polished episode guide with trailer slots, recap copy, and watch CTAs.', ['The First Sit', 'Receipts on the Table', 'Choose or Fold']],
      'contact.html': ['Production contact', 'Casting, sponsor, location, and production inquiry intake.', ['Casting team', 'Sponsor inquiry', 'Location partner']]
    }
  }
];

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function esc(s) { return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function page(site, pageName='Home', intro=site.lede, bullets=[]) {
  const nav = site.nav.map(([label, href]) => `<a href="${href}">${esc(label)}</a>`).join('');
  const cards = site.sections.map(([h, p]) => `<article class="card"><span class="badge">${esc(site.type)}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></article>`).join('');
  const bulletCards = bullets.map((b, i) => `<article class="feature"><span class="badge">${String(i+1).padStart(2,'0')}</span><h3>${esc(b)}</h3><p>Designed as a real conversion moment with proof, details, and a clear next step.</p></article>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(pageName === 'Home' ? site.name : `${pageName} · ${site.name}`)}</title>
<meta name="description" content="${esc(site.lede)}">
<meta property="og:title" content="${esc(site.name)}"><meta property="og:description" content="${esc(site.lede)}">
<style>${sharedCss}:root{--gold:${site.accent}}</style>
</head>
<body><div class="shell"><div class="noise"></div>
<header class="nav"><a class="wordmark" href="index.html">${esc(site.name)}</a><nav class="navlinks"><a href="index.html">Home</a>${nav}</nav></header>
<main>
<section class="hero"><div><p class="eyebrow">${esc(site.eyebrow)}</p><h1>${esc(site.headline)}</h1><p class="lede">${esc(intro)}</p><p><a class="btn" href="contact.html">${esc(site.cta)}</a> <a class="btn secondary" href="${site.nav[0][1]}">${esc(site.secondary)}</a></p><div class="stats">${site.stats.map(([n,l])=>`<div class="stat"><b>${esc(n)}</b><span>${esc(l)}</span></div>`).join('')}</div></div><aside class="hero-card"><div class="orb one"></div><div class="orb two"></div><div class="poster"><span class="badge">Black Night Screen Elegant</span><strong>${esc(site.poster).replace(/\n/g,'<br>')}</strong><p>${esc(site.type)} · glass · chrome · midnight polish</p></div></aside></section>
<div class="band"><span>No final FAMtastic logo used — elegant wordmark placeholder only.</span><span>Local preview/staging-safe MVP build.</span></div>
<section class="section"><p class="eyebrow">${esc(pageName)}</p><h2>${pageName === 'Home' ? 'Built for attention that converts.' : esc(pageName)}</h2><p class="kicker">${esc(intro)}</p><div class="grid">${bulletCards || cards}</div></section>
<section class="section"><h2>What the page proves</h2><div class="grid">${cards}</div></section>
<section class="section"><h2>Conversion path</h2><table class="table"><tr><th>Step</th><th>Visitor sees</th><th>Action</th></tr><tr><td>1</td><td>High-taste positioning and clear story</td><td>Trust the brand</td></tr><tr><td>2</td><td>Specific offers, schedule, or proof</td><td>Choose a path</td></tr><tr><td>3</td><td>Simple intake with no production-domain claim</td><td>${esc(site.cta)}</td></tr></table></section>
<section class="cta"><div><p class="eyebrow">Next move</p><h2>${esc(site.cta)}</h2><p class="kicker">This is a functional preview build. Replace placeholders with final photography, logo, legal copy, and live integrations before production.</p></div><form class="form"><input aria-label="Name" placeholder="Name"><input aria-label="Email" placeholder="Email"><select aria-label="Interest"><option>${esc(site.cta)}</option><option>Press / partnership</option><option>General question</option></select><textarea aria-label="Message" placeholder="Tell us what you need"></textarea><button class="btn" type="button">Submit preview request</button><p class="note">Preview form only — no production submission wired.</p></form></section>
</main><footer class="footer"><span>${esc(site.name)} · Preview/staging MVP</span><span>Black Night Screen Elegant direction · Built 2026-05-12</span></footer>
</div></body></html>`;
}

function writeSite(site) {
  const siteDir = path.join(sitesRoot, site.tag);
  const dist = path.join(siteDir, 'dist');
  ensureDir(dist);
  const pages = [{slug:'index.html', title:'Home', intro:site.lede, bullets:[]}].concat(Object.entries(site.pageDetails).map(([slug, [title, intro, bullets]]) => ({slug, title, intro, bullets})));
  for (const p of pages) fs.writeFileSync(path.join(dist, p.slug), page(site, p.title, p.intro, p.bullets), 'utf8');
  const spec = {
    tag: site.tag,
    site_name: site.name,
    business_type: site.type,
    state: 'built',
    tier: 'famtastic',
    created_at: fs.existsSync(path.join(siteDir, 'spec.json')) ? (JSON.parse(fs.readFileSync(path.join(siteDir, 'spec.json'), 'utf8')).created_at || now) : now,
    updated_at: now,
    phase_6_fallback_build: true,
    fallback_reason: 'Existing Studio builder bridge created/briefed site but stalled during Claude template generation with zero pages; deterministic static fallback used to create real previewable site artifacts.',
    local_preview_url: 'http://127.0.0.1:3436',
    dist_dir: `sites/${site.tag}/dist`,
    pages: pages.map(p => p.slug),
    client_brief: { business_description: site.lede, ideal_customer: 'Culturally fluent Black audience plus adjacent buyers/press/partners.', differentiator: site.sections[0][1], primary_cta: site.cta, style_notes: 'Black Night Screen Elegant: night-black, glass, chrome/reflective accents, elevated editorial/luxury energy.' },
    design_brief: { goal: site.lede, audience: 'Black audience and culture-forward visitors', tone: ['elevated','cinematic','direct'], visual_direction: { layout: 'editorial landing page with glass cards and dark luxury surfaces', typography: 'large serif headlines with clean sans body', color_usage: 'black base with metallic/accent highlights', motion: 'subtle-ready', density: 'balanced' }, content_priorities: [site.cta, site.secondary, 'proof and conversion'], must_have_sections: ['hero','proof cards','conversion CTA','contact form'], avoid: ['generic bright startup look','fake final FAMtastic logo','production claims'], approved: true },
    environments: { local: { url: 'http://127.0.0.1:3436', state: 'preview-only' }, staging: { state: 'not deployed', reason: 'Netlify staging not attempted in Phase 6 fallback pass' }, production: { state: 'blocked' } }
  };
  fs.writeFileSync(path.join(siteDir, 'spec.json'), JSON.stringify(spec, null, 2), 'utf8');
  fs.writeFileSync(path.join(siteDir, '.studio.json'), JSON.stringify({ tag: site.tag, currentPage: 'index.html', updated_at: now }, null, 2), 'utf8');
  fs.appendFileSync(path.join(siteDir, 'build-metrics.jsonl'), JSON.stringify({ run_id: runId, type: 'phase6-fallback-static-build', status: 'built', pages_built: pages.length, elapsed_seconds: 0, cost_usd_actual: 0, provider: 'local-deterministic', created_at: now }) + '\n', 'utf8');
  return { tag: site.tag, name: site.name, pages: pages.map(p => p.slug), dist: `sites/${site.tag}/dist` };
}

ensureDir(sitesRoot); ensureDir(tasksRoot);
const built = sites.map(writeSite);
fs.appendFileSync(path.join(tasksRoot, 'studio-outcomes.jsonl'), JSON.stringify({ outcome_id: `outcome-${Date.now()}-phase6-sites`, source_type: 'phase-6-build-sites', source_id: runId, outcome: 'fallback_built', summary: 'Built six Black Night Screen Elegant previewable local site artifacts after existing builder engine stalled at template generation on Bam Bam Civic.', evidence: built.map(b => `${b.tag}: ${b.dist} (${b.pages.length} pages)`).slice(0,8), recorded_at: now }) + '\n', 'utf8');
fs.appendFileSync(path.join(tasksRoot, 'studio-learning-candidates.jsonl'), JSON.stringify({ learning_id: `learning-${Date.now()}-phase6-builder-stall`, section: 'sites', note: 'Phase 6 real builder bridge can create/brief a site but may stall at Claude template generation and leave zero dist pages; fallback static build path was needed for preview artifacts.', source_id: runId, captured_at: now, status: 'candidate' }) + '\n', 'utf8');
fs.appendFileSync(path.join(tasksRoot, 'studio-prompt-improvements.jsonl'), JSON.stringify({ improvement_id: `prompt-${Date.now()}-phase6-style`, target: 'site-blueprint', recommendation: 'Carry explicit pages from the Studio blueprint into synthesizeDesignBriefForBuild; current bridge collapsed Bam Bam Civic requested pages to home/about/contact and weakened Black Night Screen Elegant style notes.', evidence: ['Bam Bam Civic API payload requested platform/events/contact; spec after bridge listed home/about/contact and generic visual_direction.'], status: 'candidate', captured_at: now }) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, run_id: runId, built }, null, 2));
