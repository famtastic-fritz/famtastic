// app.js — Lucid front-end. Vanilla ES modules, no framework.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const api = {
  async get(url) { return (await fetch(url)).json(); },
  async post(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    return res.json();
  },
  async del(url) { return (await fetch(url, { method: "DELETE" })).json(); },
};

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 2600);
}

function fmtDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// ---------- view switching ----------
function showView(name) {
  $$(".tab").forEach((t) => t.classList.toggle("is-active", t.dataset.view === name));
  $$(".view").forEach((v) => v.classList.toggle("is-active", v.id === `view-${name}`));
  if (name === "journal") loadJournal();
  if (name === "patterns") loadPatterns();
}
$$(".tab").forEach((t) => t.addEventListener("click", () => showView(t.dataset.view)));

// ---------- capture ----------
$("#prompts-toggle").addEventListener("click", () => {
  const p = $("#prompts");
  p.hidden = !p.hidden;
});

function gatherPrompts() {
  const prompts = {};
  $$("#prompts [data-prompt]").forEach((el) => {
    const key = el.dataset.prompt;
    const val = el.type === "checkbox" ? el.checked : el.value.trim();
    if (val !== "" && val !== false) prompts[key] = val;
  });
  return prompts;
}

let currentDream = null;

$("#capture-submit").addEventListener("click", async () => {
  const text = $("#dream-text").value.trim();
  if (!text) return toast("Write a little of the dream first.");
  const btn = $("#capture-submit");
  btn.disabled = true;
  btn.textContent = "Reflecting…";
  try {
    const { dream, clarify } = await api.post("/api/dreams", { text, prompts: gatherPrompts() });
    currentDream = dream;
    renderClarify(clarify);
  } catch {
    toast("Couldn't save that dream.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Reflect on this dream";
  }
});

function renderClarify(clarify) {
  const conv = $("#conversation");
  conv.hidden = false;
  conv.innerHTML = "";

  const bubble = document.createElement("div");
  bubble.className = "bubble lucid";
  bubble.innerHTML = `<div class="who">Lucid</div>
    <div class="body">Before I reflect it back — two small things help me read it more honestly.</div>`;

  const form = document.createElement("div");
  clarify.forEach((q) => {
    const wrap = document.createElement("div");
    wrap.className = "clarify-q";
    wrap.innerHTML = `<p>${q.text}</p>
      <input class="dream-input" data-clarify="${q.key}" rows="1" placeholder="optional — or skip" />`;
    form.appendChild(wrap);
  });

  const go = document.createElement("button");
  go.className = "primary";
  go.textContent = "Interpret my dream";
  go.addEventListener("click", () => runInterpret(conv, go));

  bubble.appendChild(form);
  bubble.appendChild(go);
  conv.appendChild(bubble);
  conv.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function runInterpret(conv, go) {
  const clarifications = {};
  $$("[data-clarify]", conv).forEach((el) => {
    if (el.value.trim()) clarifications[el.dataset.clarify] = el.value.trim();
  });
  go.disabled = true;
  go.textContent = "Listening…";
  try {
    const { interpretation } = await api.post(`/api/dreams/${currentDream.id}/interpret`, { clarifications });
    renderInterpretation(interpretation);
  } catch {
    toast("Interpretation hiccuped — try again.");
    go.disabled = false;
    go.textContent = "Interpret my dream";
  }
}

function renderInterpretation(interp) {
  const conv = $("#conversation");
  const bubble = document.createElement("div");
  bubble.className = "bubble lucid";
  const themes = (interp.themes || [])
    .map((t) => `<span class="theme-chip">${t}</span>`)
    .join("");
  const sourceNote = interp.source && interp.source !== "local"
    ? `<div class="who">Lucid · ${interp.source}</div>`
    : `<div class="who">Lucid</div>`;
  bubble.innerHTML = `${sourceNote}
    <div class="body">${escapeHtml(interp.body)}</div>
    ${themes ? `<div class="themes">${themes}</div>` : ""}`;
  conv.appendChild(bubble);
  bubble.scrollIntoView({ behavior: "smooth", block: "center" });

  // reset capture for the next dream
  const newBtn = document.createElement("button");
  newBtn.className = "ghost";
  newBtn.style.marginTop = "1rem";
  newBtn.textContent = "Log another dream";
  newBtn.addEventListener("click", resetCapture);
  conv.appendChild(newBtn);
  toast("Saved to your journal.");
}

function resetCapture() {
  $("#dream-text").value = "";
  $$("#prompts [data-prompt]").forEach((el) => {
    if (el.type === "checkbox") el.checked = false; else el.value = "";
  });
  $("#conversation").hidden = true;
  $("#conversation").innerHTML = "";
  currentDream = null;
  $("#dream-text").focus();
}

// ---------- voice capture ----------
let mediaRecorder = null;
let chunks = [];

$("#mic-btn").addEventListener("click", async () => {
  const btn = $("#mic-btn");
  const status = $("#mic-status");

  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    return;
  }

  if (!navigator.mediaDevices || !window.MediaRecorder) {
    status.hidden = false;
    status.textContent = "This browser can't record audio — type your dream instead.";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    chunks = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      btn.classList.remove("is-recording");
      btn.innerHTML = `<span class="mic-dot"></span> Record`;
      status.hidden = false;
      status.textContent = "Transcribing…";
      const blob = new Blob(chunks, { type: "audio/webm" });
      const res = await fetch("/api/transcribe", { method: "POST", body: blob });
      const data = await res.json();
      if (data.ok && data.text) {
        const ta = $("#dream-text");
        ta.value = (ta.value ? ta.value + " " : "") + data.text;
        status.textContent = "Transcribed.";
      } else {
        status.textContent = data.message || "Voice capture isn't configured — type what you said.";
        $("#dream-text").focus();
      }
    };
    mediaRecorder.start();
    btn.classList.add("is-recording");
    btn.innerHTML = `<span class="mic-dot"></span> Stop`;
    status.hidden = false;
    status.textContent = "Recording… speak your dream, then press Stop.";
  } catch {
    status.hidden = false;
    status.textContent = "Microphone blocked — type your dream instead.";
  }
});

// ---------- journal ----------
let journalCache = [];

async function loadJournal() {
  const { dreams } = await api.get("/api/dreams");
  journalCache = dreams || [];
  renderJournal(journalCache);
}

$("#journal-search").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  renderJournal(journalCache.filter((d) =>
    d.text.toLowerCase().includes(q) ||
    (d.tags || []).some((t) => t.includes(q)) ||
    (d.interpretation?.body || "").toLowerCase().includes(q)
  ));
});

function renderJournal(dreams) {
  const list = $("#journal-list");
  if (!dreams.length) {
    list.innerHTML = `<div class="empty">No dreams yet. The first one is waiting on the Capture tab.</div>`;
    return;
  }
  list.innerHTML = "";
  dreams.forEach((d) => {
    const el = document.createElement("div");
    el.className = "entry";
    const tags = (d.tags || []).map((t) => `<span class="tag">${t.replace(/_/g, " ")}</span>`).join("");
    const interp = d.interpretation?.body
      ? `<div class="interp">${escapeHtml(truncate(d.interpretation.body, 240))}</div>` : "";
    el.innerHTML = `
      <div class="date">${fmtDate(d.createdAt)}</div>
      <div class="excerpt">${escapeHtml(truncate(d.text, 180))}</div>
      <div class="tags">${tags}</div>
      ${interp}
      <button class="del" data-id="${d.id}">forget this dream</button>`;
    el.querySelector(".del").addEventListener("click", async (ev) => {
      ev.stopPropagation();
      await api.del(`/api/dreams/${d.id}`);
      toast("Dream forgotten.");
      loadJournal();
    });
    list.appendChild(el);
  });
}

// ---------- patterns ----------
async function loadPatterns() {
  const data = await api.get("/api/patterns");
  const insights = $("#patterns-insights");
  const chips = $("#patterns-symbols");

  if (!data.totalDreams) {
    insights.innerHTML = `<div class="empty">Patterns appear once you've logged a few dreams.</div>`;
    chips.innerHTML = "";
    return;
  }
  insights.innerHTML = (data.insights.length
    ? data.insights
    : ["No symbol has recurred yet — keep logging and the threads will show."]
  ).map((line) => `<div class="insight">${escapeHtml(line)}</div>`).join("");

  chips.innerHTML = data.symbols.map((s) =>
    `<div class="symbol-chip ${s.recurring ? "recurring" : ""}">
      ${escapeHtml(s.label)}<span class="count">×${s.count}</span>
    </div>`).join("");
}

// ---------- utils ----------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function truncate(str, n) {
  return str.length > n ? str.slice(0, n).trimEnd() + "…" : str;
}

// initial focus
$("#dream-text")?.focus();
