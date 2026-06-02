'use strict';

/*
 * growth-agent — the demand engine.
 *
 * Turns a prospect list into a daily, ready-to-send outreach worklist: it picks
 * the next N untouched prospects (capped — outreach discipline), renders a
 * channel-specific message personalized from templates, writes a worklist file
 * you can act on in 20 minutes, and tracks touches so nobody is hit twice.
 *
 * It does NOT blast strangers automatically — that burns domains and is illegal
 * spam. It produces the list + the copy; sending is a deliberate step (warm
 * channels convert far better than cold blasts anyway). Wire real sending later
 * via the Resend email capability for opted-in/warm lists only.
 *
 * Prospects: growth/prospects.json (or ABOS_PROSPECTS=<path>), array of
 *   { id?, name, company?, email?, channel, handle?, note? }
 *   channel ∈ email | linkedin | x | reddit | referral
 */

const fs = require('fs');
const path = require('path');
const store = require('./lib/store');

// Read at call time, not module load, so the cap is configurable per run.
function dailyCap() { return parseInt(process.env.ABOS_OUTREACH_CAP || '25', 10); }

function prospectsPath() {
  return process.env.ABOS_PROSPECTS || path.join(__dirname, '..', 'growth', 'prospects.json');
}
function touchesPath() {
  return path.join(path.dirname(store.storePath()), 'touches.json');
}
function worklistDir() {
  return process.env.ABOS_WORKLIST_DIR || path.join(path.dirname(store.storePath()));
}

function loadJson(p, fallback) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return fallback; } }
function idOf(p) { return p.id || (p.channel + ':' + (p.email || p.handle || p.name || JSON.stringify(p))); }

const TEMPLATES = {
  email: (p) => ({
    subject: `quick idea for ${p.company || 'your team'}`,
    body:
`Hi ${first(p)},

I help ${segment(p)} stop losing deals to slow follow-up — by setting up an AI system that captures every lead, qualifies it, and follows up within 5 minutes, with you in control of every gate.

${p.note ? p.note + '\n\n' : ''}Worth a 15-min look at your numbers? I'll show you the math on what slow follow-up is costing you.

— Fritz
Cash App / details: agentbusinessos.com`
  }),
  linkedin: (p) => ({
    subject: 'LinkedIn connect + note',
    body:
`Hey ${first(p)} — saw ${p.company ? p.company + ' and ' : ''}your work. I set up done-for-you AI revenue ops for ${segment(p)} (capture → qualify → follow-up in <5 min, founder-controlled). ${p.note || ''} Open to a quick idea swap?`
  }),
  x: (p) => ({
    subject: 'X reply/DM',
    body:
`${first(p)} — if follow-up speed is capping your close rate, I build the system that fixes it in 7 days (capture→qualify→follow-up, you keep control). Happy to show the math. agentbusinessos.com`
  }),
  reddit: (p) => ({
    subject: 'community value post (not a pitch)',
    body:
`Post VALUE first, pitch never in-thread. Share a concrete teardown: "How I cut a ${segment(p)}'s lead-response time from 9 hours to 5 minutes (and what it did to close rate)." End with "happy to share the playbook" → DMs come to you. Link agentbusinessos.com only if asked.`
  }),
  referral: (p) => ({
    subject: 'warm referral ask',
    body:
`Hey ${first(p)} — quick ask. I'm taking on a few founder-led ${segment(p)} to set up their AI lead/follow-up system (done in 7 days). Know anyone drowning in manual follow-up who'd want first crack? Intro = I'll comp you.`
  })
};

function first(p) { return (p.name || 'there').split(' ')[0]; }
function segment(p) { return p.segment || 'agencies & founder-led service businesses'; }

function render(p) {
  const t = (TEMPLATES[p.channel] || TEMPLATES.email)(p);
  return { channel: p.channel || 'email', to: p.email || p.handle || p.name || '(unknown)', subject: t.subject, body: t.body };
}

function run() {
  const prospects = loadJson(prospectsPath(), []);
  const touches = loadJson(touchesPath(), { touched: {} });
  const today = new Date().toISOString().slice(0, 10);

  const cap = dailyCap();
  const untouched = prospects.filter((p) => !touches.touched[idOf(p)]);
  const batch = untouched.slice(0, cap);

  const lines = [`# Outreach worklist — ${today}`, '', `${batch.length} prospect(s) · ${untouched.length - batch.length} remaining after today · cap ${cap}`, ''];
  for (const p of batch) {
    const m = render(p);
    lines.push(`## ${p.name || m.to} — ${m.channel}${p.company ? ' · ' + p.company : ''}`);
    lines.push(`**To:** ${m.to}`);
    if (m.subject && m.channel !== 'x') lines.push(`**Subject:** ${m.subject}`);
    lines.push('', '```', m.body, '```', '');
    touches.touched[idOf(p)] = today;
  }

  fs.mkdirSync(worklistDir(), { recursive: true });
  const out = path.join(worklistDir(), `worklist-${today}.md`);
  fs.writeFileSync(out, lines.join('\n'));
  fs.writeFileSync(touchesPath(), JSON.stringify(touches, null, 2));
  store.logEvent('growth-agent', 'worklist_generated', out, { count: batch.length, remaining: untouched.length - batch.length });

  return { worklisted: batch.length, remaining: untouched.length - batch.length, file: out };
}

module.exports = { run, render };

if (require.main === module) {
  const r = run();
  console.log(`growth-agent: ${r.worklisted} queued, ${r.remaining} remaining → ${r.file}`);
}
