// studio-brief.js — Revenue-first brief interview screen
// Hooks into existing /api/interview/* endpoints.

(function () {
  'use strict';

  var STEP_LABELS = ['Name', 'Revenue', 'Purpose', 'Edge', 'CTA', 'Style'];

  var interviewState = null;
  var currentQuestion = null;
  var answers = {};
  var selectedChip = null;
  var freshMode = false; // true when running a new-site interview disconnected from active site

  // Static question definitions for fresh-mode (no server dependency)
  var FRESH_QUESTIONS = [
    {
      question_id: 'q_business', current: 1, total: 6, required: true,
      text: 'What is this site for? Describe the business in one sentence.',
      suggestion_chips: [],
    },
    {
      question_id: 'q_revenue', current: 2, total: 6, required: false,
      text: 'How will this site make money?',
      suggestion_chips: [
        { label: 'Not sure yet', value: 'not_sure' },
        { label: 'Registration / ticket fees', value: 'registration' },
        { label: 'Lead generation', value: 'lead_generation' },
        { label: 'Rank and rent', value: 'rank_and_rent' },
        { label: 'Affiliate / ad revenue', value: 'affiliate' },
        { label: 'E-commerce', value: 'ecommerce' },
        { label: "I'll add monetization later", value: 'later' },
      ],
    },
    {
      question_id: 'q_customer', current: 3, total: 6, required: false,
      text: 'Who is the ideal customer or visitor?',
      suggestion_chips: [],
    },
    {
      question_id: 'q_differentiator', current: 4, total: 6, required: false,
      text: 'What sets this apart from competitors?',
      suggestion_chips: [],
    },
    {
      question_id: 'q_cta', current: 5, total: 6, required: false,
      text: 'What is the one action you want visitors to take?',
      suggestion_chips: [],
    },
    {
      question_id: 'q_style', current: 6, total: 6, required: false,
      text: 'Describe the visual style and tone. Reference anything — brands, places, feelings.',
      suggestion_chips: [],
    },
  ];

  function clearEl(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  // mount() defined later (after mountFresh) to avoid hoisting conflicts

  function startInterview() {
    if (freshMode) {
      // Fresh mode: use local question set, no server dependency
      var q = FRESH_QUESTIONS[0];
      currentQuestion = q;
      renderQuestion(q, 0);
      updateBriefPanel();
      return;
    }
    fetch('/api/interview/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'quick' }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.firstQuestion) { currentQuestion = data.firstQuestion; renderQuestion(data.firstQuestion, 0); updateBriefPanel(); }
        else if (data.completed) { renderCompletedBrief(document.getElementById('tab-pane-brief'), data); }
      })
      .catch(function (e) { console.error('[brief] start:', e); });
  }

  function submitAnswer(questionId, answer) {
    answers[questionId] = answer || '';
    selectedChip = null;
    updateBriefPanel();

    if (freshMode) {
      // Advance locally through FRESH_QUESTIONS
      var current = FRESH_QUESTIONS.find(function (q) { return q.question_id === questionId; });
      var nextIdx = current ? FRESH_QUESTIONS.indexOf(current) + 1 : -1;
      if (nextIdx >= 0 && nextIdx < FRESH_QUESTIONS.length) {
        var next = FRESH_QUESTIONS[nextIdx];
        currentQuestion = next;
        renderQuestion(next, nextIdx);
        updateBriefPanel();
      } else {
        // All questions answered — show completion in-pane (build button already visible)
        updateBriefPanel();
      }
      return;
    }

    fetch('/api/interview/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: questionId, answer: answer || '' }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var q = data.nextQuestion || data.firstQuestion;
        if (q) { currentQuestion = q; renderQuestion(q, q.current - 1); updateBriefPanel(); }
        else if (data.completed || data.client_brief) { renderCompletedBrief(document.getElementById('tab-pane-brief'), data); }
      })
      .catch(function (e) { console.error('[brief] answer:', e); });
  }

  function renderInterviewShell(pane) {
    clearEl(pane);
    pane.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;';

    var stepBar = document.createElement('div');
    stepBar.id = 'brief-step-bar';
    stepBar.className = 'brief-step-indicator';
    renderStepBar(stepBar, 0);
    pane.appendChild(stepBar);

    var body = document.createElement('div');
    body.className = 'brief-screen';

    var qCol = document.createElement('div');
    qCol.id = 'brief-questions-col';
    qCol.className = 'brief-questions';
    body.appendChild(qCol);

    var panel = document.createElement('div');
    panel.id = 'brief-panel-col';
    panel.className = 'brief-panel';
    renderBriefPanel(panel);
    body.appendChild(panel);

    pane.appendChild(body);
  }

  function renderStepBar(container, activeIndex) {
    clearEl(container);
    STEP_LABELS.forEach(function (label, i) {
      if (i > 0) {
        var sep = document.createElement('span');
        sep.className = 'brief-step-sep';
        sep.textContent = '\u203A';
        container.appendChild(sep);
      }
      var step = document.createElement('span');
      var done = i < activeIndex;
      var active = i === activeIndex;
      step.className = 'brief-step' + (active ? ' active' : '') + (done ? ' done' : '');
      step.textContent = (done ? '\u2713 ' : '') + label;
      container.appendChild(step);
    });
  }

  function renderBriefPanel(container) {
    clearEl(container);

    var title = document.createElement('div');
    title.className = 'brief-panel-title';
    title.textContent = 'Brief Preview';
    container.appendChild(title);

    var completionPct = Math.min(100, Math.round((Object.keys(answers).length / 6) * 100));
    var barWrap = document.createElement('div');
    barWrap.className = 'brief-completion-bar-wrap';
    var barFill = document.createElement('div');
    barFill.className = 'brief-completion-bar-fill';
    barFill.id = 'brief-completion-fill';
    barFill.style.width = completionPct + '%';
    barWrap.appendChild(barFill);
    container.appendChild(barWrap);

    var pctLabel = document.createElement('div');
    pctLabel.className = 'brief-completion-pct';
    pctLabel.textContent = completionPct + '% complete';
    container.appendChild(pctLabel);

    var fieldMap = { q_business: 'Business', q_revenue: 'Revenue model', q_customer: 'Audience', q_differentiator: 'Differentiator', q_cta: 'Primary CTA', q_style: 'Style' };
    Object.keys(fieldMap).forEach(function (qId) {
      var val = answers[qId];
      if (!val) return;
      var row = document.createElement('div');
      row.className = 'brief-preview-field';
      var lbl = document.createElement('div');
      lbl.className = 'brief-preview-label';
      lbl.textContent = fieldMap[qId];
      row.appendChild(lbl);
      var vEl = document.createElement('div');
      vEl.className = 'brief-preview-value';
      vEl.textContent = val.length > 80 ? val.slice(0, 80) + '\u2026' : val;
      row.appendChild(vEl);
      container.appendChild(row);
    });

    var buildUnlocked = completionPct >= 60;
    var buildBtn = document.createElement('button');
    buildBtn.className = 'brief-build-btn';
    buildBtn.id = 'brief-build-btn';
    buildBtn.disabled = !buildUnlocked;
    buildBtn.textContent = buildUnlocked ? 'Build this site \u2192' : 'Complete more questions to build';
    buildBtn.addEventListener('click', buildFromBrief);
    container.appendChild(buildBtn);
  }

  function updateBriefPanel() {
    var panel = document.getElementById('brief-panel-col');
    if (panel) renderBriefPanel(panel);
  }

  function renderQuestion(q, stepIndex) {
    var col = document.getElementById('brief-questions-col');
    if (!col) return;
    clearEl(col);

    var stepBar = document.getElementById('brief-step-bar');
    if (stepBar) renderStepBar(stepBar, stepIndex);

    var block = document.createElement('div');
    block.className = 'brief-question-block';

    var num = document.createElement('div');
    num.className = 'brief-question-num';
    num.textContent = 'Step ' + q.current + ' of ' + q.total;
    block.appendChild(num);

    var qText = document.createElement('div');
    qText.className = 'brief-question-text';
    qText.textContent = q.text;
    block.appendChild(qText);

    // Suggestion chips
    if (q.suggestion_chips && q.suggestion_chips.length > 0) {
      var chips = document.createElement('div');
      chips.className = 'brief-chips';
      q.suggestion_chips.forEach(function (chip) {
        var btn = document.createElement('button');
        btn.className = 'brief-chip' + (q.question_id === 'q_revenue' ? ' revenue' : '');
        btn.type = 'button';
        btn.textContent = chip.label;
        btn.dataset.value = chip.value;
        btn.addEventListener('click', function () {
          chips.querySelectorAll('.brief-chip').forEach(function (c) { c.classList.remove('selected'); });
          btn.classList.add('selected');
          selectedChip = chip.value;
          var inp = block.querySelector('.brief-answer-input');
          if (inp) inp.value = chip.label;
        });
        chips.appendChild(btn);
      });
      block.appendChild(chips);
    }

    // Answer input
    var input = document.createElement('textarea');
    input.className = 'brief-answer-input';
    input.rows = (q.question_id === 'q_revenue' || q.question_id === 'q_business') ? 2 : 3;
    input.value = answers[q.question_id] || '';
    input.setAttribute('autocomplete', 'off');
    var placeholders = {
      q_business: 'e.g. "We offer mobile DJ services for weddings in Phoenix, AZ"',
      q_revenue: 'Select a chip above, or describe your monetization model',
      q_customer: 'e.g. "Engaged couples aged 25-35 planning weddings in Phoenix"',
      q_differentiator: 'e.g. "200+ 5-star reviews, same-day quotes, 10 years experience"',
      q_cta: 'e.g. "Request a quote" or "Check availability"',
      q_style: 'e.g. "Dark, elegant, modern. Think W Hotel. Avoid clipart."',
    };
    input.placeholder = placeholders[q.question_id] || 'Your answer\u2026';
    block.appendChild(input);

    // Nav
    var nav = document.createElement('div');
    nav.className = 'brief-nav';

    var nextBtn = document.createElement('button');
    nextBtn.className = 'brief-next-btn';
    nextBtn.type = 'button';
    nextBtn.textContent = (q.current === q.total) ? 'Finish \u2192' : 'Next \u2192';
    nextBtn.addEventListener('click', function () {
      var answer = selectedChip || input.value.trim();
      submitAnswer(q.question_id, answer);
    });
    nav.appendChild(nextBtn);

    if (!q.required) {
      var skipBtn = document.createElement('button');
      skipBtn.className = 'brief-skip-btn';
      skipBtn.type = 'button';
      skipBtn.textContent = 'Skip';
      skipBtn.addEventListener('click', function () { submitAnswer(q.question_id, ''); });
      nav.appendChild(skipBtn);
    }

    block.appendChild(nav);
    col.appendChild(block);
    requestAnimationFrame(function () { input.focus(); });
  }

  function renderCompletedBrief(pane, data) {
    if (!pane) return;
    clearEl(pane);
    pane.style.cssText = 'padding:20px;overflow-y:auto;height:100%;';

    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:16px;';

    var title = document.createElement('h2');
    title.style.cssText = 'font-size:14px;font-weight:600;color:var(--fam-text);';
    title.textContent = 'Design Brief';
    header.appendChild(title);

    var badge = document.createElement('span');
    badge.style.cssText = 'font-size:10px;padding:2px 7px;border-radius:10px;background:rgba(29,158,117,0.15);color:var(--fam-green);font-weight:600;';
    badge.textContent = 'Complete';
    header.appendChild(badge);

    var reBtn = document.createElement('button');
    reBtn.style.cssText = 'margin-left:auto;font-size:11px;padding:4px 10px;background:var(--fam-bg-3);border:1px solid var(--fam-border);border-radius:5px;color:var(--fam-text-2);cursor:pointer;';
    reBtn.textContent = 'Re-interview';
    reBtn.addEventListener('click', function () {
      answers = {}; selectedChip = null;
      renderInterviewShell(pane);
      startInterview();
    });
    header.appendChild(reBtn);
    pane.appendChild(header);

    var brief = (data && data.client_brief) || {};
    var fieldMap = { business_description: 'Business', revenue_model: 'Revenue model', ideal_customer: 'Ideal audience', differentiator: 'Differentiator', primary_cta: 'Primary CTA', style_notes: 'Style', geography: 'Geography', services: 'Services', social_proof: 'Social proof' };

    Object.keys(fieldMap).forEach(function (key) {
      var val = brief[key];
      if (!val) return;
      var row = document.createElement('div');
      row.style.cssText = 'padding:8px 0;border-bottom:1px solid var(--fam-border-2);';
      var lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--fam-text-3);margin-bottom:3px;';
      lbl.textContent = fieldMap[key];
      row.appendChild(lbl);
      var vEl = document.createElement('div');
      vEl.style.cssText = 'font-size:12px;color:var(--fam-text);line-height:1.5;';
      vEl.textContent = val;
      row.appendChild(vEl);
      pane.appendChild(row);
    });

    var buildBtn = document.createElement('button');
    buildBtn.style.cssText = 'margin-top:16px;width:100%;padding:10px;background:var(--fam-red);color:white;border:none;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;';
    buildBtn.textContent = 'Build this site \u2192';
    buildBtn.addEventListener('click', buildFromBrief);
    pane.appendChild(buildBtn);
  }

  function generateTagFromBusiness(text) {
    var words = (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(function (w) { return w.length > 2; })
      .slice(0, 3)
      .join('-');
    return 'site-' + (words || Date.now().toString(36));
  }

  function fireBuildMessage() {
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      if (window.addMessage) window.addMessage('user', 'Build from brief');
      window.ws.send(JSON.stringify({ type: 'chat', content: 'Build from brief' }));
      if (window.StudioShell) StudioShell.switchTab('chat');
      if (window.steps !== undefined) { window.steps = []; window.stepStart = null; }
      if (window.addStep) window.addStep('Starting build from brief\u2026');
    }
  }

  function buildFromBrief() {
    var currentTag = window.config && window.config.tag;
    var isNewSiteContext = !currentTag || currentTag === '' || currentTag === 'undefined';

    if (isNewSiteContext) {
      // No site yet — auto-generate a slug and create the site first
      var businessAnswer = answers['q_business'] || '';
      var tag = generateTagFromBusiness(businessAnswer);

      // Pass collected brief answers so server can pre-populate spec.client_brief
      var clientBrief = {
        business_description: answers['q_business'] || '',
        revenue_model: answers['q_revenue'] || '',
        ideal_customer: answers['q_customer'] || '',
        differentiator: answers['q_differentiator'] || '',
        primary_cta: answers['q_cta'] || '',
        style_notes: answers['q_style'] || '',
      };

      fetch('/api/new-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': window.location.origin },
        body: JSON.stringify({ tag: tag, name: businessAnswer.slice(0, 60), client_brief: clientBrief }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.tag) {
            if (window.switchSite) window.switchSite(data.tag);
            setTimeout(fireBuildMessage, 1200); // wait for site switch to propagate
          } else {
            if (window.addMessage) window.addMessage('error', data.error || 'Could not create site');
          }
        })
        .catch(function (e) { if (window.addMessage) window.addMessage('error', 'Error: ' + e.message); });
      return;
    }

    fireBuildMessage();
  }

  function mountFresh() {
    // Reset state for a brand-new interview (called when + New Site is clicked)
    // Uses local FRESH_QUESTIONS — no server dependency, no active site needed
    answers = {};
    selectedChip = null;
    interviewState = null;
    currentQuestion = null;
    freshMode = true;
    var pane = document.getElementById('tab-pane-brief');
    if (!pane) return;
    renderInterviewShell(pane);
    startInterview();
  }

  function mount() {
    // Regular mount — tied to active site's interview state
    freshMode = false;
    var pane = document.getElementById('tab-pane-brief');
    if (!pane) return;
    fetch('/api/interview/status')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.completed) {
          renderCompletedBrief(pane, data);
        } else {
          renderInterviewShell(pane);
          startInterview();
        }
      })
      .catch(function () { renderInterviewShell(pane); startInterview(); });
  }

  window.StudioBrief = { mount: mount, mountFresh: mountFresh };

  document.addEventListener('DOMContentLoaded', function () {
    // Mount brief tab on first click
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.ws-tab');
      if (btn && btn.dataset.tabId === 'brief') {
        setTimeout(function () {
          var p = document.getElementById('tab-pane-brief');
          if (p && !p.querySelector('.brief-screen') && !p.querySelector('h2')) mount();
        }, 50);
      }
    });
  });
})();
