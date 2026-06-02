'use strict';
const $ = (id) => document.getElementById(id);
const money = (n) => '$' + (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ago = (ts) => {
  if (!ts) return '';
  const s = Math.round(Date.now() / 1000 - ts);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.round(s / 60) + 'm ago';
  if (s < 86400) return Math.round(s / 3600) + 'h ago';
  return Math.round(s / 86400) + 'd ago';
};

async function refresh() {
  let d;
  try {
    d = await (await fetch('/api/status', { cache: 'no-store' })).json();
  } catch {
    return;
  }
  renderHealth(d.health);
  renderIncome(d.income);
  renderIdeas(d.ideas);
  renderAlerts(d.alerts, d.health, d.killSwitch);
  $('clock').textContent = new Date().toLocaleTimeString();
}

function renderHealth(h) {
  const wrap = $('agents');
  wrap.innerHTML = '';
  if (!h || !h.agents.length) { wrap.innerHTML = '<div class="empty">No agents registered.</div>'; return; }
  const s = h.summary || {};
  $('healthSub').textContent = `${s.up || 0} up · ${s.hung || 0} hung · ${(s.down || 0) + (s.stale || 0)} offline`;
  for (const a of h.agents) {
    const hb = a.heartbeat;
    let det = a.pids.length ? `pid ${a.pids.join(',')}` : 'no process';
    if (a.uptime) det += ` · up ${a.uptime}`;
    if (hb) det += ` · heartbeat ${hb.ageSec != null ? hb.ageSec + 's' : '—'}${hb.detail ? ' · ' + hb.detail : ''}`;
    const el = document.createElement('div');
    el.className = `agent s-${a.status}`;
    el.innerHTML = `<span class="ico"></span>
      <div class="meta"><span class="nm">${a.label}</span><span class="det">${det}</span></div>
      <span class="pill">${a.status}</span>`;
    wrap.appendChild(el);
  }
}

function renderIncome(inc) {
  $('incToday').textContent = money(inc.today);
  $('incWeek').textContent = money(inc.week);
  $('incMonth').textContent = money(inc.month);
  $('incAll').textContent = money(inc.allTime);
  const ul = $('incRecent');
  ul.innerHTML = '';
  if (!inc.recent.length) { ul.innerHTML = '<div class="empty">No income recorded yet. Webhooks + manual entry feed this.</div>'; return; }
  for (const e of inc.recent) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${esc(e.source)}${e.customer ? ' · ' + esc(e.customer) : ''}${e.verified ? '' : ' <span class="unv">(unverified)</span>'}<br><small style="color:#8b93a7">${ago(e.ts)}</small></span><span class="amt">${money(e.amount)}</span>`;
    ul.appendChild(li);
  }
}

function renderIdeas(idea) {
  $('ideaSub').textContent = `${idea.totalUnique} unique · ${idea.noiseCollapsed} noise collapsed`;
  const ul = $('ideasReal');
  ul.innerHTML = '';
  const list = idea.real.length ? idea.real : idea.backlog.slice(0, 10);
  if (!list.length) { ul.innerHTML = '<div class="empty">No ideas parsed.</div>'; return; }
  for (const i of list) {
    const price = i.low === i.high ? money(i.low) : `${money(i.low)}–${money(i.high)}`;
    const li = document.createElement('li');
    li.innerHTML = `<span class="score">${i.score}</span><div class="nm">${esc(i.name)}</div>
      <div class="meta">${price}${i.recurring ? '/mo' : ''} · ${i.sources.length} source(s)</div>`;
    ul.appendChild(li);
  }
}

function renderAlerts(alerts, health, kill) {
  const wrap = $('alerts');
  wrap.innerHTML = '';
  for (const a of alerts || []) {
    const el = document.createElement('div');
    el.className = `alert ${a.level}`;
    el.textContent = a.msg;
    wrap.appendChild(el);
  }
  const bad = !health.healthy || (kill && kill.engaged);
  $('topbar').classList.toggle('alarm', bad);
  $('globalDot').classList.toggle('bad', bad);
  const kb = $('killBtn');
  kb.classList.toggle('engaged', kill && kill.engaged);
  kb.textContent = kill && kill.engaged ? 'RESUME SENDING' : 'KILL SWITCH';
  kb.dataset.engaged = kill && kill.engaged ? '1' : '0';
}

$('killBtn').addEventListener('click', async () => {
  const engaged = $('killBtn').dataset.engaged !== '1';
  await fetch('/api/kill-switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ engaged, by: 'dashboard' }) });
  refresh();
});

$('mAdd').addEventListener('click', async () => {
  const amount = parseFloat($('mAmount').value);
  if (!amount) return;
  await fetch('/api/income/manual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, description: $('mDesc').value }) });
  $('mAmount').value = ''; $('mDesc').value = '';
  refresh();
});

refresh();
setInterval(refresh, 4000);
