/* Shay — Command · companion app logic
 * Pure static, no build step, no deps. Talks to a pluggable chat backend
 * and falls back to a labeled local mock so the app is fully usable offline.
 */
(function () {
  'use strict';

  // ── Config: where the chat backend lives ──────────────────────────────
  // Resolution order: window.SHAY_ENDPOINT  ->  <meta name="shay-endpoint">
  // ->  built-in mock. Empty / missing => mock.
  function resolveEndpoint() {
    if (typeof window.SHAY_ENDPOINT === 'string' && window.SHAY_ENDPOINT.trim()) {
      return window.SHAY_ENDPOINT.trim();
    }
    var meta = document.querySelector('meta[name="shay-endpoint"]');
    if (meta && meta.content && meta.content.trim()) return meta.content.trim();
    return null; // null => use mock
  }

  var CHAT_ENDPOINT = resolveEndpoint();
  var USING_MOCK = !CHAT_ENDPOINT;
  var STORAGE_KEY = 'shay.conversation.v1';
  var MAX_HISTORY = 40; // messages sent to backend / persisted

  // ── State ──────────────────────────────────────────────────────────────
  var history = loadHistory(); // [{role:'user'|'shay', text, mock?}]
  var sending = false;

  // ── DOM ──────────────────────────────────────────────────────────────
  var $messages = document.getElementById('messages');
  var $input = document.getElementById('input');
  var $send = document.getElementById('btn-send');
  var $clear = document.getElementById('btn-clear');
  var $statusDot = document.getElementById('status-dot');
  var $statusText = document.getElementById('status-text');
  var $today = document.getElementById('today');
  var $needsBadge = document.getElementById('needs-badge');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));

  // ── Init ─────────────────────────────────────────────────────────────
  function init() {
    if (USING_MOCK) {
      $statusDot.classList.add('mock');
      $statusText.textContent = 'mock — no backend wired';
    } else {
      $statusText.textContent = 'Connected';
    }
    renderConversation();
    wireComposer();
    wireTabs();
    wireClear();
    loadToday();
  }

  // ── Conversation rendering ────────────────────────────────────────────
  function renderConversation() {
    $messages.innerHTML = '';
    if (!history.length) {
      $messages.appendChild(renderEmptyState());
      return;
    }
    history.forEach(function (m) { $messages.appendChild(bubble(m.role, m.text, m.mock)); });
    scrollToBottom();
  }

  function renderEmptyState() {
    var wrap = document.createElement('div');
    wrap.className = 'empty';
    wrap.innerHTML =
      '<div class="big">⬡</div>' +
      '<b>Your second-in-command</b>' +
      'Ask a question, get an answer, run the operation — from your pocket.';
    var sug = document.createElement('div');
    sug.className = 'suggestions';
    ['What needs me today?', "What's stalled?", 'Brief me on the priorities'].forEach(function (t) {
      var c = document.createElement('button');
      c.className = 'chip';
      c.textContent = t;
      c.addEventListener('click', function () { $input.value = t; sendMessage(); });
      sug.appendChild(c);
    });
    wrap.appendChild(sug);
    return wrap;
  }

  function bubble(role, text, isMock) {
    var el = document.createElement('div');
    el.className = 'msg ' + role;
    if (role === 'shay' && isMock) {
      el.appendChild(document.createTextNode(text));
      var tag = document.createElement('span');
      tag.className = 'tag-mock';
      tag.textContent = '(mock — no backend wired)';
      el.appendChild(tag);
    } else {
      el.textContent = text;
    }
    return el;
  }

  function scrollToBottom() {
    requestAnimationFrame(function () { $messages.scrollTop = $messages.scrollHeight; });
  }

  // ── Composer ────────────────────────────────────────────────────────
  function wireComposer() {
    autoGrow();
    $input.addEventListener('input', autoGrow);
    $input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    $send.addEventListener('click', sendMessage);
  }

  function autoGrow() {
    $input.style.height = 'auto';
    $input.style.height = Math.min($input.scrollHeight, 140) + 'px';
    $send.disabled = sending || !$input.value.trim();
  }

  function sendMessage() {
    var text = $input.value.trim();
    if (!text || sending) return;

    // remove empty state if present
    var empty = $messages.querySelector('.empty');
    if (empty) empty.remove();

    addMessage('user', text);
    $input.value = '';
    autoGrow();

    sending = true;
    $send.disabled = true;
    var $typing = showTyping();

    var payloadHistory = history.slice(-MAX_HISTORY).map(function (m) {
      return { role: m.role === 'shay' ? 'assistant' : 'user', content: m.text };
    });

    requestReply(text, payloadHistory)
      .then(function (reply) {
        $typing.remove();
        streamReveal(reply.text, reply.mock);
      })
      .catch(function (err) {
        $typing.remove();
        addMessage('shay', "I couldn't reach the backend (" + (err && err.message || 'error') +
          '). Falling back to mock.', false);
        var m = mockReply(text);
        streamReveal(m.text, true);
      })
      .then(function () {
        sending = false;
        autoGrow();
      });
  }

  function addMessage(role, text, isMock) {
    history.push({ role: role, text: text, mock: !!isMock });
    saveHistory();
    $messages.appendChild(bubble(role, text, isMock));
    scrollToBottom();
  }

  function showTyping() {
    var t = document.createElement('div');
    t.className = 'typing';
    t.innerHTML = '<i></i><i></i><i></i>';
    $messages.appendChild(t);
    scrollToBottom();
    return t;
  }

  // Reveal text progressively into a new shay bubble, then persist.
  function streamReveal(fullText, isMock) {
    var el = bubble('shay', '', isMock);
    // start empty: clear text node content
    if (isMock) {
      el.firstChild.textContent = '';
    } else {
      el.textContent = '';
    }
    $messages.appendChild(el);

    var i = 0;
    var step = Math.max(1, Math.round(fullText.length / 120)); // ~120 frames max
    function tick() {
      i = Math.min(fullText.length, i + step);
      var slice = fullText.slice(0, i);
      if (isMock) { el.firstChild.textContent = slice; }
      else { el.textContent = slice; }
      scrollToBottom();
      if (i < fullText.length) {
        setTimeout(tick, 16);
      } else {
        history.push({ role: 'shay', text: fullText, mock: !!isMock });
        saveHistory();
      }
    }
    tick();
  }

  // ── Backend request (pluggable) ───────────────────────────────────────
  // Returns Promise<{text, mock}>. Supports both JSON and text/event-stream
  // style responses; for plain JSON expects { reply } or { text } or { message }.
  function requestReply(message, payloadHistory) {
    if (USING_MOCK) {
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(mockReply(message)); }, 320 + Math.random() * 280);
      });
    }
    return fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message, history: payloadHistory })
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var ct = res.headers.get('content-type') || '';
      if (ct.indexOf('application/json') !== -1) {
        return res.json().then(function (j) {
          var text = j.reply || j.text || j.message || j.content || JSON.stringify(j);
          return { text: String(text), mock: false };
        });
      }
      // treat anything else as plain text
      return res.text().then(function (t) { return { text: t, mock: false }; });
    });
  }

  // ── Built-in mock (works with NO backend) ─────────────────────────────
  function mockReply(message) {
    var lower = message.toLowerCase();
    var snap = window.__SHAY_TODAY__; // populated by loadToday(), may be null
    var canned;

    if (snap && /(need|today|now|brief|priorit|stall|status|what.*up)/.test(lower)) {
      canned = buildBriefingAnswer(snap);
    } else if (/hello|hey|hi\b|yo\b/.test(lower)) {
      canned = "I'm here. Ask me what needs you today, what's stalled, or to brief you on the priorities.";
    } else if (/help|what can you/.test(lower)) {
      canned = "I'm your pocket second-in-command. I can summarize your Command Center briefing, " +
        "flag what needs you, and (once wired to the Shay gateway) run operations. " +
        "Try \"What needs me today?\"";
    } else {
      canned = "Heard you. Once I'm wired to the Shay gateway I'll act on this. " +
        "For now I can brief you from your Command Center snapshot — ask \"What needs me today?\"";
    }
    return { text: canned + '\n\nYou said: "' + message + '"', mock: true };
  }

  function buildBriefingAnswer(snap) {
    var k = snap.kpis || {};
    var needs = (snap.plans || []).filter(function (p) { return p.needsYou; });
    var prios = (snap.plans || []).filter(function (p) { return p.priorityHigh; });
    var lines = [];
    lines.push('Here\'s where things stand:');
    lines.push('• ' + (k.activePlans || 0) + ' active plans, ' + (k.needsYou || 0) + ' need you, ' +
      (k.inProgress || 0) + ' in progress.');
    if (needs.length) {
      lines.push('\nNeeds you now:');
      needs.slice(0, 4).forEach(function (p) { lines.push('  – ' + p.title); });
      if (needs.length > 4) lines.push('  …and ' + (needs.length - 4) + ' more.');
    }
    if (prios.length) {
      lines.push('\nYour priorities: ' + prios.map(function (p) { return p.title; }).join(', ') + '.');
    }
    lines.push('\nOpen the Today tab for the full picture.');
    return lines.join('\n');
  }

  // ── localStorage persistence ──────────────────────────────────────────
  function loadHistory() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY) : [];
    } catch (e) { return []; }
  }
  function saveHistory() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY))); }
    catch (e) { /* quota / private mode — non-fatal */ }
  }

  function wireClear() {
    $clear.addEventListener('click', function () {
      if (history.length && !confirm('Clear this conversation?')) return;
      history = [];
      saveHistory();
      renderConversation();
    });
  }

  // ── Tabs ───────────────────────────────────────────────────────────────
  function wireTabs() {
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { switchView(tab.dataset.view); });
    });
  }
  function switchView(name) {
    tabs.forEach(function (t) { t.classList.toggle('active', t.dataset.view === name); });
    document.getElementById('view-chat').classList.toggle('active', name === 'chat');
    document.getElementById('view-today').classList.toggle('active', name === 'today');
    if (name === 'today') loadToday(); // refresh on each open
  }

  // ── Today tab (renders command-center state.json) ─────────────────────
  function loadToday() {
    fetch('./state.json', { cache: 'no-store' })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function (snap) {
        window.__SHAY_TODAY__ = snap;
        renderToday(snap);
        updateNeedsBadge(snap);
      })
      .catch(function (err) {
        $today.innerHTML = '<div class="errbox">Couldn\'t load your briefing.<br>' +
          '<small>(' + (err && err.message || 'error') + ' — state.json missing or offline)</small></div>';
      });
  }

  function updateNeedsBadge(snap) {
    var n = (snap.kpis && snap.kpis.needsYou) || 0;
    if (n > 0) { $needsBadge.style.display = 'grid'; $needsBadge.textContent = String(n); }
    else { $needsBadge.style.display = 'none'; }
  }

  function renderToday(snap) {
    var k = snap.kpis || {};
    var plans = snap.plans || [];
    var needs = plans.filter(function (p) { return p.needsYou; });
    var prios = plans.filter(function (p) { return p.priorityHigh; });

    var html = '';
    html += '<div class="briefing-head">' + fmtWhen(snap.generated_at) + ' · live repo ledgers</div>';

    // KPIs
    html += '<h2>The picture</h2><div class="kpis">';
    html += kpi(k.activePlans, 'Active plans');
    html += kpi(k.priorities, '⭐ Priorities', 'star');
    html += kpi(k.needsYou, 'Need you', 'alert');
    html += kpi(k.inProgress, 'In progress');
    html += '</div>';

    // Needs you now
    if (needs.length) {
      html += '<h2>🔴 Needs you now</h2>';
      needs.forEach(function (p) {
        html += '<div class="needs-card">' +
          '<b>' + esc(p.title) + '</b>' +
          '<p class="why">' + esc(p.needsYouReason || 'Needs a decision.') + '</p>' +
          (p.nextAction ? '<p class="next"><b>Next:</b> ' + esc(p.nextAction) + '</p>' : '') +
          '<button class="ask" data-ask="' + escAttr('Brief me on ' + p.title + ' — what do you need from me?') + '">Ask Shay →</button>' +
          '</div>';
      });
    }

    // Your priorities
    if (prios.length) {
      html += '<h2>⭐ Your priorities</h2>';
      prios.forEach(function (p) {
        html += '<div class="prio">' +
          '<div class="row"><b>' + esc(p.title) + '</b>' +
          '<span class="stage">' + esc(p.stageEmoji || '') + ' ' + esc(p.stageLabel || '') + '</span></div>' +
          (p.nextAction ? '<p class="next"><b>Next:</b> ' + esc(p.nextAction) + '</p>' : '') +
          '<button class="ask" data-ask="' + escAttr('Give me the status on ' + p.title) + '">Ask Shay →</button>' +
          '</div>';
      });
    }

    html += stampHtml(snap);

    $today.innerHTML = html;

    // wire "Ask Shay" deep links into chat
    Array.prototype.forEach.call($today.querySelectorAll('button.ask'), function (b) {
      b.addEventListener('click', function () {
        switchView('chat');
        $input.value = b.getAttribute('data-ask');
        autoGrow();
        sendMessage();
      });
    });
  }

  function kpi(val, label, cls) {
    return '<div class="kpi' + (cls ? ' ' + cls : '') + '"><b>' + (val == null ? '—' : val) +
      '</b><span>' + label + '</span></div>';
  }

  function stampHtml(snap) {
    var when = snap.generated_at ? new Date(snap.generated_at) : null;
    var stale = false;
    if (when) {
      var ageH = (Date.now() - when.getTime()) / 36e5;
      stale = ageH > 26; // briefing is daily; >~1 day old is stale
    }
    return '<div class="stamp' + (stale ? ' stale' : '') + '">' +
      (stale ? '⚠ Briefing is more than a day old. ' : '') +
      'Snapshot generated ' + fmtWhen(snap.generated_at) + '</div>';
  }

  // ── helpers ──────────────────────────────────────────────────────────
  function fmtWhen(iso) {
    if (!iso) return 'unknown time';
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }

  init();
})();
