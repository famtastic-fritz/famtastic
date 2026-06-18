/* ============================================================
   three-hero.js — NCS7 immersive 3D system
   ------------------------------------------------------------
   Two scenes, both intentional (not a spinning cube):

   1) HERO scene  (#hero-canvas) — floating wireframe "blueprint
      planes" that drift in depth, with a particle field forming
      a faint building grid. Parallaxes to mouse movement.

   2) BACKGROUND scene (#bg-canvas) — a fixed, full-page
      wireframe building grid of extruded blocks that slowly
      reveals/rotates as the user SCROLLS, so the whole page
      feels like it sits inside a technical model.

   Loaded as a classic <script> AFTER three.min.js (UMD global
   THREE). No modules, no build. Degrades gracefully if THREE
   or WebGL is unavailable.
   ============================================================ */
(function () {
  "use strict";

  if (typeof THREE === "undefined") {
    console.warn("[three-hero] THREE not loaded — 3D disabled, page still works.");
    return;
  }

  // Respect reduced-motion + low-power devices.
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var BLUE = 0x1ca7ec;
  var BLUE_SOFT = 0x6fc6f5;
  var TEAL = 0x36e0c4;

  function clampPixelRatio() {
    return Math.min(window.devicePixelRatio || 1, 1.8);
  }

  function supportsWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext &&
        (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  if (!supportsWebGL()) {
    console.warn("[three-hero] WebGL unavailable — 3D disabled.");
    return;
  }

  /* ----------------------------------------------------------
     HERO SCENE
     ---------------------------------------------------------- */
  function initHero() {
    var canvas = document.getElementById("hero-canvas");
    if (!canvas) return null;

    var renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance"
    });
    renderer.setPixelRatio(clampPixelRatio());

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x061226, 0.045);

    var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 14);

    var group = new THREE.Group();
    scene.add(group);

    // --- Floating blueprint planes (wireframe grids at varied depth) ---
    var planes = [];
    var planeCount = 6;
    for (var i = 0; i < planeCount; i++) {
      var w = 9 + Math.random() * 5;
      var h = 6 + Math.random() * 4;
      var seg = 8;
      var geo = new THREE.PlaneGeometry(w, h, seg, Math.round(seg * 0.66));
      var mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? TEAL : BLUE,
        wireframe: true,
        transparent: true,
        opacity: 0.10 + Math.random() * 0.16
      });
      var mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 9,
        -2 - i * 2.4
      );
      mesh.rotation.x = (Math.random() - 0.5) * 0.5;
      mesh.rotation.y = (Math.random() - 0.5) * 0.7;
      mesh.userData.spin = (Math.random() - 0.5) * 0.0008;
      mesh.userData.floatPhase = Math.random() * Math.PI * 2;
      mesh.userData.baseY = mesh.position.y;
      group.add(mesh);
      planes.push(mesh);
    }

    // --- Particle field forming a loose building grid ---
    var pCount = 900;
    var positions = new Float32Array(pCount * 3);
    for (var p = 0; p < pCount; p++) {
      // bias particles into a grid lattice so it reads as structure
      var gx = (Math.round((Math.random() - 0.5) * 8) ) * 1.6 + (Math.random()-0.5)*0.5;
      var gy = (Math.round((Math.random() - 0.5) * 6) ) * 1.4 + (Math.random()-0.5)*0.5;
      var gz = -Math.random() * 22;
      positions[p * 3] = gx;
      positions[p * 3 + 1] = gy;
      positions[p * 3 + 2] = gz;
    }
    var pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    var pMat = new THREE.PointsMaterial({
      color: BLUE_SOFT, size: 0.05, transparent: true, opacity: 0.7, sizeAttenuation: true
    });
    var points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    // --- A central, slowly rotating wireframe "tower" of stacked frames ---
    var tower = new THREE.Group();
    var floors = 7;
    for (var f = 0; f < floors; f++) {
      var fg = new THREE.BoxGeometry(3.2, 0.65, 3.2);
      var edges = new THREE.EdgesGeometry(fg);
      var lm = new THREE.LineBasicMaterial({
        color: BLUE, transparent: true, opacity: 0.5 - f * 0.03
      });
      var frame = new THREE.LineSegments(edges, lm);
      frame.position.y = (f - floors / 2) * 0.95;
      frame.userData.baseY = frame.position.y;
      tower.add(frame);
    }
    tower.position.set(0.5, 0, -1);
    tower.rotation.x = 0.18;
    scene.add(tower);

    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    function onMove(e) {
      var t = e.touches ? e.touches[0] : e;
      mouse.tx = (t.clientX / window.innerWidth - 0.5);
      mouse.ty = (t.clientY / window.innerHeight - 0.5);
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      var w = rect.width || window.innerWidth;
      var h = rect.height || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener("resize", resize);

    var t0 = performance.now();
    var running = true;

    function frame() {
      if (!running) return;
      requestAnimationFrame(frame);
      var t = (performance.now() - t0) * 0.001;

      // parallax easing
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      group.rotation.y = mouse.x * 0.35;
      group.rotation.x = mouse.y * 0.2;

      if (!reduceMotion) {
        for (var i = 0; i < planes.length; i++) {
          var m = planes[i];
          m.rotation.z += m.userData.spin;
          m.position.y = m.userData.baseY + Math.sin(t * 0.5 + m.userData.floatPhase) * 0.4;
        }
        points.rotation.y = t * 0.02 + mouse.x * 0.25;
        tower.rotation.y = t * 0.18;
        for (var k = 0; k < tower.children.length; k++) {
          var fr = tower.children[k];
          fr.position.y = fr.userData.baseY + Math.sin(t * 0.8 + k * 0.5) * 0.05;
        }
      }

      camera.position.x = mouse.x * 1.4;
      camera.position.y = -mouse.y * 0.9;
      camera.lookAt(0, 0, -4);

      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);

    // pause when hero scrolled out of view
    var heroEl = canvas.closest(".hero") || canvas.parentElement;
    if ("IntersectionObserver" in window && heroEl) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && !running) { running = true; requestAnimationFrame(frame); }
          else if (!en.isIntersecting) { running = false; }
        });
      }, { threshold: 0.02 });
      io.observe(heroEl);
    }

    return { renderer: renderer, resize: resize };
  }

  /* ----------------------------------------------------------
     BACKGROUND SCENE — scroll-reactive building grid
     ---------------------------------------------------------- */
  function initBackground() {
    var canvas = document.getElementById("bg-canvas");
    if (!canvas) return null;

    var renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance"
    });
    renderer.setPixelRatio(clampPixelRatio());
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 6, 26);

    var city = new THREE.Group();
    scene.add(city);

    // grid of extruded wireframe "blocks" arranged like a site plan
    var cols = 9, rows = 9, spacing = 4.2;
    for (var ix = 0; ix < cols; ix++) {
      for (var iz = 0; iz < rows; iz++) {
        var hgt = 1 + Math.abs(Math.sin(ix * 1.7) * Math.cos(iz * 1.3)) * 7 + Math.random() * 1.5;
        var bg = new THREE.BoxGeometry(2.2, hgt, 2.2);
        var eg = new THREE.EdgesGeometry(bg);
        var dist = Math.hypot(ix - cols / 2, iz - rows / 2);
        var op = Math.max(0.04, 0.22 - dist * 0.02);
        var lm = new THREE.LineBasicMaterial({
          color: (ix + iz) % 5 === 0 ? TEAL : BLUE,
          transparent: true, opacity: op
        });
        var box = new THREE.LineSegments(eg, lm);
        box.position.set(
          (ix - cols / 2) * spacing,
          hgt / 2 - 2,
          (iz - rows / 2) * spacing
        );
        city.add(box);
      }
    }

    // ground grid helper (blueprint floor)
    var grid = new THREE.GridHelper(cols * spacing + 6, 26, BLUE, BLUE);
    grid.material.transparent = true;
    grid.material.opacity = 0.10;
    grid.position.y = -2;
    scene.add(grid);

    var scrollY = 0, targetScroll = 0;
    function onScroll() {
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      targetScroll = window.scrollY / max; // 0..1
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    function resize() {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize);

    var t0 = performance.now();
    function frame() {
      requestAnimationFrame(frame);
      var t = (performance.now() - t0) * 0.001;
      scrollY += (targetScroll - scrollY) * 0.06;

      // as you scroll, the camera flies over and through the model
      city.rotation.y = scrollY * Math.PI * 1.1 + (reduceMotion ? 0 : t * 0.01);
      camera.position.y = 6 + scrollY * 10;
      camera.position.z = 26 - scrollY * 14;
      camera.lookAt(0, 2, 0);

      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);

    return { renderer: renderer, resize: resize };
  }

  function boot() {
    try { initBackground(); } catch (e) { console.warn("[three-hero] bg init failed", e); }
    try { initHero(); } catch (e) { console.warn("[three-hero] hero init failed", e); }
  }

  // The hero canvas may be (re)created by React on route change.
  // Expose a re-init hook the app can call when Home mounts.
  window.NCSHero = {
    boot: boot,
    initHero: function () { try { return initHero(); } catch (e) { console.warn(e); } }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
