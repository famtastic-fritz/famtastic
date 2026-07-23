(function () {
  window.escapeHtml = function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/\"/g,'&quot;')
      .replace(/'/g,'&#039;');
  };

  window.isSafeUrl = function isSafeUrl(url) {
    if (!url) return false;
    return /^(https?:|\/|\.\/|assets\/)/.test(url);
  };

  window.showConnectionBanner = function showConnectionBanner(show) {
    var banner = document.getElementById('ws-disconnect-banner');
    if (banner) banner.style.display = show ? 'block' : 'none';
  };

  window.steps = window.steps || [];
  window.stepTimer = window.stepTimer || null;
  window.stepStart = window.stepStart || null;

  window.addStep = function addStep(text) {
    window.steps.forEach(function(s) { if (s.status === 'active') s.status = 'done'; });
    window.steps.push({ text: text, status: 'active' });
    if (!window.stepStart) window.stepStart = Date.now();
    window.renderStepLog();
    var cancelBtn = document.getElementById('chat-cancel-btn');
    if (cancelBtn) cancelBtn.style.display = '';
    if (!window.stepTimer) window.stepTimer = setInterval(function() { window.renderStepLog(); }, 1000);
  };

  window.renderStepLog = function renderStepLog() {
    var el = document.getElementById('step-log');
    if (!el) {
      var container = document.getElementById('chat-messages');
      if (!container) return;
      el = document.createElement('div');
      el.id = 'step-log';
      el.className = 'msg-assistant rounded-lg px-4 py-3 max-w-[90%]';
      container.appendChild(el);
    }
    var elapsed = window.stepStart ? Math.floor((Date.now() - window.stepStart) / 1000) : 0;
    var html = '';
    window.steps.forEach(function(s) {
      if (s.status === 'done') {
        html += '<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--fam-green)">\u2713 ' + window.escapeHtml(s.text) + '</div>';
      } else {
        html += '<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--fam-text)"><span style="animation:pulse 1s infinite">\u25cf</span> ' + window.escapeHtml(s.text) + (elapsed > 2 ? ' <span style="margin-left:auto;color:var(--fam-text-3)">' + elapsed + 's</span>' : '') + '</div>';
      }
    });
    el.innerHTML = html;
    var c2 = document.getElementById('chat-messages');
    if (c2) c2.scrollTop = c2.scrollHeight;
  };

  window.hideStepLog = function hideStepLog() {
    if (window.stepTimer) { clearInterval(window.stepTimer); window.stepTimer = null; }
    var el = document.getElementById('step-log');
    if (el) el.remove();
    window.steps = [];
    window.stepStart = null;
    var cancelBtn = document.getElementById('chat-cancel-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';
  };

  window.cancelBuild = function cancelBuild() {
    fetch('/api/build/cancel', { method: 'POST' }).then(function(r) { return r.json(); }).then(function() {
      window.hideStepLog();
      window.addMessage('assistant', 'Build cancelled.');
    }).catch(function(err) { console.error('[cancel]', err); });
  };

  window.flushStream = function flushStream() {
    if (window.streamBuffer && window.streamBuffer.trim()) window.streamBuffer = '';
  };

  window.addMessage = function addMessage(role, content, scroll) {
    if (scroll === undefined) scroll = true;
    window.hideStepLog();
    var container = document.getElementById('chat-messages');
    if (!container) return;
    var div = document.createElement('div');
    if (role === 'assistant' && content && content.indexOf('\n-') !== -1) {
      var parts = content.split('\n');
      var firstLine = parts[0];
      var bullets = parts.filter(function(l) { return l.charAt(0) === '-' || l.charAt(0) === '*'; });
      if (bullets.length > 0 && firstLine.match(/updated|built|changed/i)) {
        div.className = 'msg-changes rounded-lg px-4 py-3 max-w-[90%] text-sm';
        var bHtml = '<div style="font-weight:600;margin-bottom:6px;">' + window.escapeHtml(firstLine) + '</div><div style="font-size:11px;color:var(--fam-text-2);">';
        bullets.forEach(function(b) { bHtml += '<div>' + window.escapeHtml(b) + '</div>'; });
        bHtml += '</div>';
        div.innerHTML = bHtml;
        container.appendChild(div);
        if (scroll) container.scrollTop = container.scrollHeight;
        return;
      }
    }
    var isBrainstorm = document.body.classList.contains('mode-brainstorm');
    var styleMap = {
      user: 'msg-user',
      status: 'msg-status',
      error: 'msg-error',
      brainstorm: 'msg-brainstorm',
      assistant: isBrainstorm ? 'msg-brainstorm' : 'msg-assistant',
    };
    div.className = (styleMap[role] || 'msg-assistant') + ' rounded-lg px-4 py-3 max-w-[90%] text-sm whitespace-pre-wrap';
    if (role === 'user') div.style.marginLeft = 'auto';
    div.textContent = content;
    container.appendChild(div);
    if (scroll) container.scrollTop = container.scrollHeight;
  };

  window.showBriefCard = function showBriefCard(brief, techRecommendations) {
    var container = document.getElementById('chat-messages');
    if (!container) return;
    var div = document.createElement('div');
    div.className = 'msg-brief rounded-lg px-5 py-4 max-w-[95%]';
    var vd = brief.visual_direction || {};
    var avoidHtml = '';
    if ((brief.avoid || []).length > 0) {
      avoidHtml = '<div style="margin-top:8px;"><span style="color:var(--fam-red)">Avoid:</span> ';
      brief.avoid.forEach(function(a) {
        avoidHtml += '<span style="background:rgba(232,53,42,0.15);color:#fca5a5;font-size:11px;padding:1px 5px;border-radius:3px;">' + window.escapeHtml(a) + '</span> ';
      });
      avoidHtml += '</div>';
    }
    var qHtml = '';
    if ((brief.open_questions || []).length > 0) {
      qHtml = '<div style="margin-top:8px;padding:8px;background:var(--fam-bg);border-radius:5px;"><span style="color:var(--fam-gold);font-size:11px;font-weight:600;">Open questions:</span>';
      brief.open_questions.forEach(function(q) {
        qHtml += '<div style="font-size:11px;color:var(--fam-text-2);margin-top:2px;">- ' + window.escapeHtml(q) + '</div>';
      });
      qHtml += '</div>';
    }
    var toneHtml = '';
    (brief.tone || []).forEach(function(t) {
      toneHtml += '<span style="background:rgba(232,53,42,0.15);color:var(--fam-red);font-size:11px;padding:1px 6px;border-radius:10px;">' + window.escapeHtml(t) + '</span> ';
    });
    var sectionsText = (brief.must_have_sections || []).map(function(s) { return window.escapeHtml(s); }).join(', ');
    div.innerHTML = '<div style="font-weight:600;color:white;margin-bottom:10px;font-size:14px;">Design Brief</div>'
      + '<div style="display:grid;gap:6px;font-size:12px;">'
      + '<div><span style="color:var(--fam-text-3);">Goal:</span> ' + window.escapeHtml(brief.goal || '') + '</div>'
      + '<div><span style="color:var(--fam-text-3);">Audience:</span> ' + window.escapeHtml(brief.audience || '') + '</div>'
      + '<div><span style="color:var(--fam-text-3);">Tone:</span> ' + toneHtml + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:8px;background:var(--fam-bg);border-radius:5px;margin-top:4px;">'
      + '<div><span style="color:var(--fam-text-3);">Layout:</span> ' + window.escapeHtml(vd.layout || '-') + '</div>'
      + '<div><span style="color:var(--fam-text-3);">Type:</span> ' + window.escapeHtml(vd.typography || '-') + '</div>'
      + '</div>'
      + '<div><span style="color:var(--fam-text-3);">Sections:</span> ' + sectionsText + '</div>'
      + avoidHtml + qHtml
      + '</div>'
      + '<div style="margin-top:12px;display:flex;gap:6px;">'
      + '<button onclick="approveBrief(this)" style="flex:1;padding:7px;background:var(--fam-red);color:white;border:none;border-radius:5px;font-size:12px;cursor:pointer;">\u2713 Build from this brief</button>'
      + '<button onclick="skipBrief()" style="padding:7px 12px;background:var(--fam-bg-3);color:var(--fam-text-2);border:1px solid var(--fam-border);border-radius:5px;font-size:12px;cursor:pointer;">Skip</button>'
      + '</div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  };

  window.approveBrief = function approveBrief(btn) {
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      window.ws.send(JSON.stringify({ type: 'chat', content: 'Build from brief' }));
      var card = btn && btn.closest ? btn.closest('.msg-brief') : null;
      if (card) card.style.opacity = '0.6';
    }
  };

  window.skipBrief = function skipBrief() {
    if (window.ws && window.ws.readyState === WebSocket.OPEN) window.ws.send(JSON.stringify({ type: 'chat', content: 'Skip brief' }));
  };

  window.editBrief = function editBrief() {
    window.addMessage('assistant', 'Send your edits in chat and I will update the brief.');
  };

  window.approvePlan = function approvePlan(planId, btn) {
    var card = btn && btn.closest ? btn.closest('[data-plan-id]') : null;
    var editArea = card ? card.querySelector('textarea') : null;
    var editedMessage = (editArea && editArea.value) ? editArea.value.trim() : '';
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      window.ws.send(JSON.stringify({ type: 'execute-plan', planId: planId, approved: true, editedMessage: editedMessage }));
      if (card) {
        card.style.opacity = '0.6';
        card.querySelectorAll('button').forEach(function(b) { b.disabled = true; });
      }
    }
  };

  window.cancelPlan = function cancelPlan(planId, btn) {
    if (window.ws && window.ws.readyState === WebSocket.OPEN) window.ws.send(JSON.stringify({ type: 'execute-plan', planId: planId, approved: false, editedMessage: '' }));
    var card = btn && btn.closest ? btn.closest('[data-plan-id]') : null;
    if (card) card.remove();
  };

  window.addBrainstormActions = function addBrainstormActions() {
    var container = document.getElementById('chat-messages');
    if (!container) return;
    var bar = document.createElement('div');
    bar.className = 'brainstorm-actions';
    bar.style.cssText = 'display:flex;gap:6px;padding:8px 0;';
    var actions = [
      { label: 'Use this idea', type: 'chat', key: 'content', val: 'Build from this brainstorm' },
      { label: 'Capture idea', type: 'idea', key: '', val: '' }
    ];
    actions.forEach(function(a) {
      var btn2 = document.createElement('button');
      btn2.style.cssText = 'padding:5px 10px;font-size:11px;background:rgba(245,196,0,0.15);border:1px solid rgba(245,196,0,0.3);border-radius:4px;color:var(--fam-gold);cursor:pointer;';
      btn2.textContent = a.label;
      var captured = a;
      btn2.onclick = function() {
        if (captured.type === 'chat' && window.ws && window.ws.readyState === WebSocket.OPEN) {
          window.ws.send(JSON.stringify({ type: captured.type, content: captured.val }));
        }
      };
      bar.appendChild(btn2);
    });
    container.appendChild(bar);
    container.scrollTop = container.scrollHeight;
  };

  window.updateModeIndicator = function updateModeIndicator(mode) {
    if (mode) {
      document.body.classList.remove('mode-build','mode-review','mode-brainstorm');
      document.body.classList.add('mode-' + mode);
    }
  };
})();
