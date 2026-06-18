/*
 * NCS7 CMS Tutor — embedded, offline-capable AI help widget.
 * Pure vanilla JS, no build step. Load with:
 *   <script src="/tutor/tutor.js"></script>
 *
 * Behavior:
 *  - Renders a chat widget into #tutor-root, or a floating launcher
 *    button (bottom-right) if no #tutor-root exists.
 *  - On send: POST {question} to /api/tutor. If that fails (e.g. opened
 *    via file:// or server offline), falls back to fetching
 *    /tutor/knowledge.json and doing local keyword retrieval. If that
 *    also fails, uses a tiny built-in mini knowledge set.
 *  - Exposes window.NCSTutor = { open, close, ask }.
 */
(function () {
  "use strict";

  if (window.NCSTutor && window.NCSTutor.__installed) return;

  /* -------------------------------------------------------------- *
   * Built-in mini knowledge (last-resort fallback)                 *
   * -------------------------------------------------------------- */
  var MINI_KNOWLEDGE = [
    {
      id: "login",
      q: "How do I log in?",
      a: "This demo uses a stubbed login.\n1. Open the admin page (ends in /cms/admin/).\n2. Type ANY username and ANY password (just don't leave them blank).\n3. Click Sign In to reach the Dashboard.",
      keywords: ["log", "login", "sign", "in", "password", "username", "access"],
      category: "Login"
    },
    {
      id: "create-page",
      q: "How do I create a page from a template?",
      a: "1. Click \"Pages\" in the left menu.\n2. Click \"New Page\".\n3. Pick a Template (a ready-made layout of blocks).\n4. Give the page a Title and web address.\n5. Fill in each block's words and images.\n6. Click Save, then Publish when it's ready.",
      keywords: ["create", "new", "page", "template", "make", "add", "build"],
      category: "Templates"
    },
    {
      id: "add-product",
      q: "How do I add a product?",
      a: "1. Click \"Products\" in the left menu.\n2. Click \"New Product\".\n3. Fill in Title, SKU, Price, Description, and the PDF path.\n4. Click Save. It appears in your list and on the storefront.",
      keywords: ["add", "product", "pdf", "cad", "sku", "price", "new", "create"],
      category: "Products"
    },
    {
      id: "publish",
      q: "How do I publish a page?",
      a: "1. Click \"Pages\" and open the page.\n2. Click \"Publish\" — its status becomes Published and it goes live.\nTo hide it later, click \"Unpublish\" (this never deletes your work).",
      keywords: ["publish", "unpublish", "live", "draft", "hide", "show", "page"],
      category: "Pages"
    },
    {
      id: "edit-hero",
      q: "How do I edit the headline?",
      a: "1. Click \"Site Content\" in the left menu.\n2. Find the Hero section and edit the Headline box.\n3. Click Save — the live site updates on the next load.",
      keywords: ["hero", "headline", "home", "title", "edit", "content", "change"],
      category: "Content"
    },
    {
      id: "overview",
      q: "What can this CMS do?",
      a: "It's your website control panel. Sections: Dashboard (home base), Site Content (global text), Pages (individual pages), Templates (reusable layouts), Products (your CAD PDFs), and the AI Tutor (me). Edit your words, build pages, manage products, and publish — no code needed.",
      keywords: ["what", "can", "do", "overview", "cms", "help", "features", "general"],
      category: "General"
    }
  ];

  var SUGGESTIONS = [
    "How do I create a page from a template?",
    "How do I add a product?",
    "How do I publish a page?",
    "How do I edit the home page headline?"
  ];

  var STOP_WORDS = {
    "the": 1, "a": 1, "an": 1, "to": 1, "do": 1, "i": 1, "how": 1, "is": 1,
    "of": 1, "in": 1, "on": 1, "for": 1, "and": 1, "my": 1, "me": 1, "can": 1,
    "what": 1, "this": 1, "it": 1, "with": 1, "you": 1, "your": 1, "are": 1,
    "or": 1, "be": 1, "from": 1, "if": 1, "so": 1, "we": 1, "by": 1, "at": 1
  };

  /* -------------------------------------------------------------- *
   * State                                                          *
   * -------------------------------------------------------------- */
  var knowledgeCache = null;       // loaded knowledge.json (array) or null
  var knowledgeTried = false;      // whether we've attempted to load it
  var els = {};                    // cached DOM nodes
  var isOpen = false;
  var floating = false;            // true if we created a floating launcher

  /* -------------------------------------------------------------- *
   * Utilities                                                      *
   * -------------------------------------------------------------- */
  function tokenize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(function (w) { return w && !STOP_WORDS[w]; });
  }

  function escapeHTML(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Convert plain text answer into simple HTML (line breaks preserved).
  function renderAnswer(text) {
    return escapeHTML(text).replace(/\n/g, "<br>");
  }

  /* -------------------------------------------------------------- *
   * Local keyword retrieval (offline fallback brain)              *
   * -------------------------------------------------------------- */
  function scoreEntry(entry, qWords) {
    var score = 0;
    var kw = entry.keywords || [];
    var kwSet = {};
    var i;
    for (i = 0; i < kw.length; i++) kwSet[String(kw[i]).toLowerCase()] = 1;

    // Words from the canonical question, used for overlap matching.
    var entryQWords = tokenize(entry.q);
    var entryQSet = {};
    for (i = 0; i < entryQWords.length; i++) entryQSet[entryQWords[i]] = 1;

    for (i = 0; i < qWords.length; i++) {
      var w = qWords[i];
      if (kwSet[w]) score += 3;          // direct keyword hit (strongest)
      if (entryQSet[w]) score += 1;      // overlap with canonical question
    }
    return score;
  }

  function localAnswer(question, knowledge) {
    var qWords = tokenize(question);
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < knowledge.length; i++) {
      var s = scoreEntry(knowledge[i], qWords);
      if (s > bestScore) {
        bestScore = s;
        best = knowledge[i];
      }
    }
    if (best && bestScore > 0) {
      return {
        answer: best.a,
        source: "offline:" + best.id,
        score: bestScore,
        matched: true
      };
    }
    return {
      answer:
        "I'm not sure about that one. Try asking about pages, templates, " +
        "products, content, or logging in.\n\nFor example:\n• " +
        SUGGESTIONS.join("\n• "),
      source: "offline:none",
      score: 0,
      matched: false
    };
  }

  // Ensure knowledge.json (or mini set) is available; returns a Promise.
  function loadKnowledge() {
    if (knowledgeCache) return Promise.resolve(knowledgeCache);
    if (knowledgeTried) return Promise.resolve(knowledgeCache || MINI_KNOWLEDGE);
    knowledgeTried = true;
    return fetch("/tutor/knowledge.json", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("bad status " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (Array.isArray(data) && data.length) {
          knowledgeCache = data;
        } else {
          knowledgeCache = MINI_KNOWLEDGE;
        }
        return knowledgeCache;
      })
      .catch(function () {
        knowledgeCache = MINI_KNOWLEDGE;
        return knowledgeCache;
      });
  }

  function offlineRespond(question) {
    return loadKnowledge().then(function (kb) {
      return localAnswer(question, kb);
    });
  }

  /* -------------------------------------------------------------- *
   * Networking                                                     *
   * -------------------------------------------------------------- */
  function askServer(question) {
    return fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question })
    })
      .then(function (r) {
        if (!r.ok) throw new Error("bad status " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!data || typeof data.answer !== "string" || !data.answer.trim()) {
          throw new Error("empty answer");
        }
        return data;
      });
  }

  // Public ask(): try server, fall back to offline retrieval.
  function ask(question) {
    var q = String(question || "").trim();
    if (!q) return Promise.resolve({ answer: "Please type a question.", matched: false });
    return askServer(q).catch(function () {
      return offlineRespond(q);
    });
  }

  /* -------------------------------------------------------------- *
   * UI rendering                                                   *
   * -------------------------------------------------------------- */
  function injectStyles() {
    if (document.getElementById("ncs-tutor-styles")) return;
    var css = [
      ".ncs-tutor *{box-sizing:border-box;}",
      ".ncs-tutor{--navy:#0b1f3a;--navy2:#13294b;--cyan:#1ca7ec;--ink:#0b1f3a;",
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}",
      // floating launcher
      ".ncs-tutor-launcher{position:fixed;right:20px;bottom:20px;z-index:2147483000;",
      "background:var(--cyan);color:#fff;border:none;border-radius:999px;",
      "padding:14px 20px;font-size:15px;font-weight:600;cursor:pointer;",
      "box-shadow:0 8px 28px rgba(11,31,58,.35);display:flex;align-items:center;gap:8px;}",
      ".ncs-tutor-launcher:hover{background:#159bdd;}",
      ".ncs-tutor-launcher svg{width:18px;height:18px;}",
      // panel
      ".ncs-tutor-panel{display:flex;flex-direction:column;background:#fff;",
      "border-radius:16px;overflow:hidden;border:1px solid #d6e2f0;",
      "box-shadow:0 16px 48px rgba(11,31,58,.28);width:100%;height:100%;min-height:420px;}",
      ".ncs-tutor-floating .ncs-tutor-panel{position:fixed;right:20px;bottom:20px;z-index:2147483000;",
      "width:380px;height:560px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);}",
      // header
      ".ncs-tutor-header{background:linear-gradient(135deg,var(--navy),var(--navy2));color:#fff;",
      "padding:14px 16px;display:flex;align-items:center;justify-content:space-between;}",
      ".ncs-tutor-header .ncs-tt-title{font-size:14px;font-weight:700;line-height:1.25;}",
      ".ncs-tutor-header .ncs-tt-sub{font-size:11px;opacity:.75;margin-top:2px;}",
      ".ncs-tutor-header .ncs-tt-badge{display:inline-block;width:8px;height:8px;border-radius:50%;",
      "background:var(--cyan);margin-right:8px;box-shadow:0 0 0 3px rgba(28,167,236,.25);}",
      ".ncs-tt-close{background:transparent;border:none;color:#fff;font-size:20px;line-height:1;",
      "cursor:pointer;opacity:.8;padding:4px 6px;border-radius:6px;}",
      ".ncs-tt-close:hover{opacity:1;background:rgba(255,255,255,.12);}",
      // messages
      ".ncs-tt-messages{flex:1;overflow-y:auto;padding:16px;background:#f4f8fc;display:flex;",
      "flex-direction:column;gap:10px;}",
      ".ncs-tt-msg{max-width:85%;padding:10px 13px;border-radius:14px;font-size:13.5px;",
      "line-height:1.5;word-wrap:break-word;white-space:normal;}",
      ".ncs-tt-msg.user{align-self:flex-end;background:var(--cyan);color:#fff;border-bottom-right-radius:4px;}",
      ".ncs-tt-msg.bot{align-self:flex-start;background:#fff;color:var(--ink);border:1px solid #dbe7f3;",
      "border-bottom-left-radius:4px;}",
      ".ncs-tt-msg.bot strong{color:var(--navy);}",
      // typing indicator
      ".ncs-tt-typing{align-self:flex-start;background:#fff;border:1px solid #dbe7f3;border-radius:14px;",
      "border-bottom-left-radius:4px;padding:12px 14px;display:flex;gap:4px;}",
      ".ncs-tt-typing span{width:7px;height:7px;border-radius:50%;background:var(--cyan);opacity:.4;",
      "animation:ncs-tt-bounce 1.2s infinite;}",
      ".ncs-tt-typing span:nth-child(2){animation-delay:.18s;}",
      ".ncs-tt-typing span:nth-child(3){animation-delay:.36s;}",
      "@keyframes ncs-tt-bounce{0%,60%,100%{opacity:.3;transform:translateY(0);}30%{opacity:1;transform:translateY(-4px);}}",
      // chips
      ".ncs-tt-chips{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px 4px;background:#f4f8fc;}",
      ".ncs-tt-chip{background:#fff;border:1px solid var(--cyan);color:var(--navy);font-size:12px;",
      "padding:6px 11px;border-radius:999px;cursor:pointer;line-height:1.2;}",
      ".ncs-tt-chip:hover{background:var(--cyan);color:#fff;}",
      // input
      ".ncs-tt-input{display:flex;gap:8px;padding:12px;background:#fff;border-top:1px solid #e3edf6;}",
      ".ncs-tt-input input{flex:1;border:1px solid #cfdcec;border-radius:10px;padding:10px 12px;",
      "font-size:13.5px;outline:none;color:var(--ink);}",
      ".ncs-tt-input input:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(28,167,236,.18);}",
      ".ncs-tt-send{background:var(--navy);color:#fff;border:none;border-radius:10px;padding:0 16px;",
      "font-size:13.5px;font-weight:600;cursor:pointer;}",
      ".ncs-tt-send:hover{background:var(--navy2);}",
      ".ncs-tt-send:disabled{opacity:.5;cursor:not-allowed;}",
      ".ncs-tutor-hidden{display:none !important;}"
    ].join("");
    var style = document.createElement("style");
    style.id = "ncs-tutor-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function scrollToBottom() {
    if (els.messages) els.messages.scrollTop = els.messages.scrollHeight;
  }

  function addMessage(text, who) {
    var div = document.createElement("div");
    div.className = "ncs-tt-msg " + (who === "user" ? "user" : "bot");
    if (who === "user") {
      div.textContent = text;
    } else {
      div.innerHTML = renderAnswer(text);
    }
    els.messages.appendChild(div);
    scrollToBottom();
    return div;
  }

  function showTyping() {
    var t = document.createElement("div");
    t.className = "ncs-tt-typing";
    t.innerHTML = "<span></span><span></span><span></span>";
    els.messages.appendChild(t);
    scrollToBottom();
    return t;
  }

  function handleSend(text) {
    var q = String(text != null ? text : els.input.value).trim();
    if (!q) return;
    els.input.value = "";
    addMessage(q, "user");
    els.send.disabled = true;
    var typing = showTyping();
    ask(q)
      .then(function (res) {
        if (typing.parentNode) typing.parentNode.removeChild(typing);
        addMessage(res.answer, "bot");
      })
      .catch(function () {
        if (typing.parentNode) typing.parentNode.removeChild(typing);
        addMessage(
          "Sorry, something went wrong. Try asking about pages, templates, products, or content.",
          "bot"
        );
      })
      .then(function () {
        els.send.disabled = false;
        els.input.focus();
      });
  }

  function buildPanel() {
    var panel = document.createElement("div");
    panel.className = "ncs-tutor-panel";

    // header
    var header = document.createElement("div");
    header.className = "ncs-tutor-header";
    var titleWrap = document.createElement("div");
    titleWrap.innerHTML =
      '<div class="ncs-tt-title"><span class="ncs-tt-badge"></span>CMS Tutor</div>' +
      '<div class="ncs-tt-sub">Ask me how to do anything</div>';
    header.appendChild(titleWrap);
    if (floating) {
      var closeBtn = document.createElement("button");
      closeBtn.className = "ncs-tt-close";
      closeBtn.type = "button";
      closeBtn.setAttribute("aria-label", "Close tutor");
      closeBtn.innerHTML = "&times;";
      closeBtn.addEventListener("click", close);
      header.appendChild(closeBtn);
    }
    panel.appendChild(header);

    // messages
    var messages = document.createElement("div");
    messages.className = "ncs-tt-messages";
    panel.appendChild(messages);

    // chips
    var chips = document.createElement("div");
    chips.className = "ncs-tt-chips";
    SUGGESTIONS.forEach(function (s) {
      var c = document.createElement("button");
      c.type = "button";
      c.className = "ncs-tt-chip";
      c.textContent = s;
      c.addEventListener("click", function () { handleSend(s); });
      chips.appendChild(c);
    });
    panel.appendChild(chips);

    // input row
    var inputRow = document.createElement("div");
    inputRow.className = "ncs-tt-input";
    var input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Type your question…";
    input.setAttribute("aria-label", "Ask the CMS tutor");
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); handleSend(); }
    });
    var send = document.createElement("button");
    send.type = "button";
    send.className = "ncs-tt-send";
    send.textContent = "Send";
    send.addEventListener("click", function () { handleSend(); });
    inputRow.appendChild(input);
    inputRow.appendChild(send);
    panel.appendChild(inputRow);

    els.panel = panel;
    els.messages = messages;
    els.input = input;
    els.send = send;
    return panel;
  }

  function buildLauncher() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ncs-tutor-launcher";
    btn.setAttribute("aria-label", "Open CMS Tutor");
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' +
      '<span>CMS Tutor</span>';
    btn.addEventListener("click", open);
    els.launcher = btn;
    return btn;
  }

  function greet() {
    if (els.__greeted) return;
    els.__greeted = true;
    addMessage(
      "Hi! I'm your CMS Tutor. I can walk you through editing content, " +
      "creating pages from templates, managing your products, and publishing. " +
      "Pick a question below or type your own.",
      "bot"
    );
  }

  /* -------------------------------------------------------------- *
   * Public open/close                                             *
   * -------------------------------------------------------------- */
  function open() {
    if (!els.panel) return;
    isOpen = true;
    els.panel.classList.remove("ncs-tutor-hidden");
    if (floating && els.launcher) els.launcher.classList.add("ncs-tutor-hidden");
    greet();
    setTimeout(function () { if (els.input) els.input.focus(); }, 50);
  }

  function close() {
    if (!els.panel) return;
    isOpen = false;
    if (floating) {
      els.panel.classList.add("ncs-tutor-hidden");
      if (els.launcher) els.launcher.classList.remove("ncs-tutor-hidden");
    }
  }

  // Programmatic ask: opens widget, posts as a user message.
  function askProgrammatic(question) {
    if (floating && !isOpen) open();
    handleSend(question);
  }

  /* -------------------------------------------------------------- *
   * Bootstrap                                                      *
   * -------------------------------------------------------------- */
  function init() {
    try {
      injectStyles();
      var root = document.getElementById("tutor-root");
      var container = document.createElement("div");
      container.className = "ncs-tutor";

      if (root) {
        // Embedded mode: render panel directly into the host element.
        floating = false;
        container.appendChild(buildPanel());
        root.appendChild(container);
        open(); // embedded widget is visible immediately
      } else {
        // Floating mode: launcher + hidden panel appended to <body>.
        floating = true;
        container.className = "ncs-tutor ncs-tutor-floating";
        var panel = buildPanel();
        panel.classList.add("ncs-tutor-hidden");
        container.appendChild(buildLauncher());
        container.appendChild(panel);
        (document.body || document.documentElement).appendChild(container);
      }
    } catch (err) {
      // Never throw on a page without #tutor-root or under odd conditions.
      if (window.console && console.warn) {
        console.warn("[NCSTutor] init skipped:", err && err.message);
      }
    }
  }

  window.NCSTutor = {
    __installed: true,
    open: open,
    close: close,
    ask: askProgrammatic
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
