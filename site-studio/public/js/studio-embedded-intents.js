(function () {
  if (!document.documentElement.classList.contains('studio-embedded')) return;

  function ack(intent, status, detail) {
    try {
      window.parent.postMessage(
        { source: 'studio-builder', ack: intent, status: status, detail: detail || null, at: new Date().toISOString() },
        '*'
      );
    } catch (_e) {}
  }

  function focusChatInput() {
    var sel = ['#chat-input', '#chat-textarea', 'textarea[name="chat"]', '.chat-input textarea', 'input[type="text"][placeholder*="message" i]'];
    for (var i = 0; i < sel.length; i++) {
      var el = document.querySelector(sel[i]);
      if (el && typeof el.focus === 'function') { el.focus(); return true; }
    }
    return false;
  }

  function broadcastIntent(msg) {
    try {
      document.dispatchEvent(new CustomEvent('studio-shell-intent', { detail: msg }));
    } catch (_e) {}
  }

  window.addEventListener('message', function (ev) {
    var data = ev && ev.data;
    if (!data || data.source !== 'studio-shell') return;
    var intent = data.intent;
    broadcastIntent(data);
    switch (intent) {
      case 'continue':
      case 'new-site': {
        var ok = focusChatInput();
        ack(intent, ok ? 'focus' : 'no-input-found');
        break;
      }
      case 'preview':
        ack(intent, 'acked-preview-implicit');
        break;
      case 'inspect':
        ack(intent, 'acked-no-target-action', 'inspect targeting not yet wired in legacy shell');
        break;
      case 'refine': {
        var payload = data.payload || {};
        var req = String(payload.request || '');
        if (req) {
          var inputEl = document.querySelector('#chat-input') ||
                        document.querySelector('#chat-textarea') ||
                        document.querySelector('.chat-input textarea') ||
                        document.querySelector('textarea[name="chat"]');
          if (inputEl) {
            inputEl.value = req;
            try { inputEl.dispatchEvent(new Event('input', { bubbles: true })); } catch (_e) {}
            inputEl.focus();
            ack(intent, 'prefilled', { length: req.length });
          } else {
            ack(intent, 'no-input-found');
          }
        } else {
          ack(intent, 'empty-payload');
        }
        break;
      }
      default:
        try { console.warn('[studio-builder] unhandled intent:', intent); } catch (_e) {}
        ack(intent, 'unhandled');
    }
  });

  try {
    window.parent.postMessage(
      { source: 'studio-builder', ready: true, at: new Date().toISOString() },
      '*'
    );
  } catch (_e) {}
})();
