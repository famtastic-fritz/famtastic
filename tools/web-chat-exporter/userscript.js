// ==UserScript==
// @name         FAMtastic Claude Chat Exporter
// @namespace    https://famtastic.com/
// @version      0.1.0
// @description  Export claude.ai conversations to markdown for the FAMtastic capture flywheel.
// @match        https://claude.ai/*
// @match        https://claude.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // SHAY V2 (2026-05-02): MVP. If claude.ai DOM changes, update SELECTORS.
  const SELECTORS = [
    '[data-testid="message"]',
    '[role="article"]',
    'div[class*="message"]'
  ];

  function findMessages() {
    for (const sel of SELECTORS) {
      const els = document.querySelectorAll(sel);
      if (els.length > 1) return Array.from(els);
    }
    return null;
  }

  function inferRole(el, idx) {
    const explicit = el.getAttribute('data-message-author-role')
      || el.getAttribute('data-author')
      || el.getAttribute('data-role');
    if (explicit) return explicit;
    // Fallback: alternate human/assistant
    return idx % 2 === 0 ? 'human' : 'assistant';
  }

  function buildMarkdown(messages) {
    const T = new Date().toISOString();
    const url = location.href;
    const title = document.title || '(unknown)';
    let md = '# Claude Web Chat Export\n\n';
    md += '**Exported:** ' + T + '\n';
    md += '**URL:** ' + url + '\n';
    md += '**Conversation title:** ' + title + '\n';
    md += '**Message count:** ' + messages.length + '\n';
    md += '**Source:** userscript\n\n---\n\n';
    for (let i = 0; i < messages.length; i++) {
      const role = inferRole(messages[i], i);
      const text = (messages[i].innerText || '').trim();
      md += '## ' + role.charAt(0).toUpperCase() + role.slice(1)
         + ' (turn ' + (Math.floor(i / 2) + 1) + ')\n\n'
         + text + '\n\n---\n\n';
    }
    return md;
  }

  function downloadMarkdown(md) {
    const T = new Date().toISOString().slice(0, 10);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'claude-chat-' + T + '.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportNow() {
    const msgs = findMessages();
    if (!msgs) {
      alert('No chat messages found. Selectors: ' + SELECTORS.join(', ')
        + '\n\nFall back to Option C (manual paste) in README.');
      return;
    }
    const md = buildMarkdown(msgs);
    downloadMarkdown(md);
  }

  function injectButton() {
    if (document.getElementById('famtastic-chat-exporter-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'famtastic-chat-exporter-btn';
    btn.textContent = 'Export ↓';
    btn.title = 'Export this chat to FAMtastic capture format';
    Object.assign(btn.style, {
      position: 'fixed',
      top: '10px',
      right: '12px',
      zIndex: '99999',
      padding: '6px 12px',
      background: '#f5c400',
      color: '#1a1a00',
      border: 'none',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '700',
      cursor: 'pointer',
      letterSpacing: '0.04em',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
    });
    btn.onclick = exportNow;
    document.body.appendChild(btn);
  }

  // Re-inject on SPA navigation
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(injectButton, 500);
    }
  }, 1000);

  injectButton();
})();
