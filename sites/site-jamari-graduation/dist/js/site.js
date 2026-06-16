/* site.js — nav, scroll-reveal, counters, lightbox, typed terminal */
(function () {
  "use strict";

  /* ---- nav: scrolled state + mobile toggle ---- */
  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav-toggle");
  if (toggle && nav) {
    toggle.addEventListener("click", function () { nav.classList.toggle("open"); });
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); });
    });
  }
  function onScroll() { if (nav) nav.classList.toggle("scrolled", window.scrollY > 30); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---- scroll reveal ---- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.14 });
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

  /* ---- animated counters ---- */
  var counted = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target, target = parseFloat(el.dataset.count), suffix = el.dataset.suffix || "", dur = 1400, start = 0, t0 = null;
      function step(ts) {
        if (!t0) t0 = ts; var p = Math.min((ts - t0) / dur, 1);
        var val = Math.floor((start + (target - start) * (1 - Math.pow(1 - p, 3))));
        el.textContent = (target >= 10000 ? val.toLocaleString() : String(val)) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step); counted.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll("[data-count]").forEach(function (el) { counted.observe(el); });

  /* ---- typed terminal (home + journey) ----
     Types PLAIN text safely (no partial HTML tags), then commits each
     finished line with whole-line syntax coloring. ---- */
  document.querySelectorAll("[data-type]").forEach(function (typeEl) {
    var lines;
    try { lines = JSON.parse(typeEl.getAttribute("data-type")); } catch (e) { return; }
    var committed = document.createElement("span");
    var liveLine = document.createElement("span");
    var cursor = document.createElement("span"); cursor.className = "term-cursor";
    typeEl.textContent = ""; typeEl.appendChild(committed); typeEl.appendChild(liveLine); typeEl.appendChild(cursor);

    function colorFor(text) {
      var t = text.trimStart();
      if (t.indexOf("//") === 0) return "c-com";
      if (t.indexOf("$") === 0) return "c-key";
      if (t.indexOf(">") === 0) return "c-str";
      return "";
    }
    var li = 0, ci = 0;
    function tick() {
      if (li >= lines.length) { cursor.remove(); return; }
      var line = lines[li];
      if (ci <= line.length) { liveLine.textContent = line.slice(0, ci); ci++; setTimeout(tick, 26 + Math.random() * 38); }
      else {
        var done = document.createElement("span");
        var cls = colorFor(line); if (cls) done.className = cls;
        done.textContent = line + "\n";
        committed.appendChild(done); liveLine.textContent = "";
        li++; ci = 0; setTimeout(tick, 360);
      }
    }
    var tio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { tick(); tio.disconnect(); } }, { threshold: 0.35 });
    tio.observe(typeEl);
  });

  /* ---- gallery lightbox ---- */
  var lb = document.querySelector(".lightbox");
  if (lb) {
    var lbImg = lb.querySelector("img");
    var shots = Array.prototype.map.call(document.querySelectorAll(".gallery .shot img"), function (i) { return i.src; });
    var cur = 0;
    var alts = Array.prototype.map.call(document.querySelectorAll(".gallery .shot img"), function (i) { return i.alt || "Graduation photo"; });
    function show(i) { cur = (i + shots.length) % shots.length; lbImg.src = shots[cur]; lbImg.alt = alts[cur]; }
    document.querySelectorAll(".gallery .shot img").forEach(function (img, i) {
      img.parentElement.addEventListener("click", function () { show(i); lb.classList.add("open"); });
    });
    lb.querySelector(".lb-close").addEventListener("click", function () { lb.classList.remove("open"); });
    lb.querySelector(".lb-prev").addEventListener("click", function (e) { e.stopPropagation(); show(cur - 1); });
    lb.querySelector(".lb-next").addEventListener("click", function (e) { e.stopPropagation(); show(cur + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) lb.classList.remove("open"); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") lb.classList.remove("open");
      if (e.key === "ArrowLeft") show(cur - 1);
      if (e.key === "ArrowRight") show(cur + 1);
    });
  }

  /* ---- footer year ---- */
  var yr = document.querySelector("[data-year]"); if (yr) yr.textContent = new Date().getFullYear();

  /* ---- init 3D scenes if present ---- */
  if (window.JamariScenes) {
    var hero = document.getElementById("hero-canvas"); if (hero) window.JamariScenes.initHeroScene(hero);
    var dev = document.getElementById("dev-canvas"); if (dev) window.JamariScenes.initDevScene(dev);
  }
})();
