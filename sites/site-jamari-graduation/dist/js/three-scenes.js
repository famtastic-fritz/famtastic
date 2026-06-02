/* ============================================================
   three-scenes.js — out-of-the-box 3D for Jamari '26
   Requires global THREE (r128 UMD build, loaded in <head>).
   Two scenes:
     initHeroScene(canvas)  — floating graduation cap + confetti + starfield
     initDevScene(canvas)   — particle-network icosahedron (future-dev)
   Both: DPR-capped, resize-aware, reduced-motion aware, auto-pause off-screen.
   ============================================================ */
(function () {
  "use strict";
  if (typeof THREE === "undefined") { console.warn("[3d] THREE not loaded"); return; }

  var REDUCE = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var COLORS = {
    navy:   0x14264f,
    orange: 0xff6a1a,
    gold:   0xffc24b,
    white:  0xeaf0ff,
    blue:   0x3a6bd6
  };

  function makeRenderer(canvas) {
    var r = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setClearColor(0x000000, 0);
    return r;
  }

  /* ---------- build a stylised graduation cap (mortarboard) ---------- */
  function buildCap() {
    var cap = new THREE.Group();
    var matNavy = new THREE.MeshStandardMaterial({ color: COLORS.navy, roughness: 0.45, metalness: 0.35 });
    var matGold = new THREE.MeshStandardMaterial({ color: COLORS.gold, roughness: 0.3, metalness: 0.7, emissive: 0x4a2a00, emissiveIntensity: 0.4 });
    var matOrange = new THREE.MeshStandardMaterial({ color: COLORS.orange, roughness: 0.4, metalness: 0.3, emissive: 0x6a2400, emissiveIntensity: 0.35 });

    // skull / band (the part that sits on the head)
    var band = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.5, 40), matNavy);
    band.position.y = -0.28; cap.add(band);
    // orange trim ring
    var trim = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.05, 16, 48), matOrange);
    trim.rotation.x = Math.PI / 2; trim.position.y = -0.04; cap.add(trim);

    // mortarboard (flat top), slightly tilted for swagger
    var board = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.07, 1.85), matNavy);
    board.position.y = 0.06; cap.add(board);
    // bevel edge highlight
    var edge = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.02, 1.9), matOrange);
    edge.position.y = 0.02; cap.add(edge);

    // center button
    var button = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 24), matGold);
    button.position.y = 0.12; cap.add(button);

    // tassel: cord from button to a corner, then a hanging bunch
    var corner = new THREE.Vector3(0.8, 0.1, 0.8);
    var cordPts = [ new THREE.Vector3(0, 0.13, 0), corner.clone(), new THREE.Vector3(0.95, -0.55, 0.95) ];
    var cord = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(cordPts).getPoints(24)),
      new THREE.LineBasicMaterial({ color: COLORS.gold })
    );
    cap.add(cord);
    // tassel bunch
    var bunch = new THREE.Group();
    for (var i = 0; i < 9; i++) {
      var strand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 6), matGold);
      strand.position.set((Math.random() - 0.5) * 0.1, -0.16, (Math.random() - 0.5) * 0.1);
      strand.rotation.z = (Math.random() - 0.5) * 0.3;
      bunch.add(strand);
    }
    bunch.position.set(0.95, -0.45, 0.95);
    cap.add(bunch);
    var topper = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), matGold);
    topper.position.set(0.95, -0.28, 0.95); cap.add(topper);

    cap.rotation.x = -0.18;
    cap.scale.set(1.15, 1.15, 1.15);
    return cap;
  }

  /* ---------- confetti point cloud ---------- */
  function buildConfetti(count, spread) {
    var g = new THREE.BufferGeometry();
    var pos = new Float32Array(count * 3);
    var col = new Float32Array(count * 3);
    var vel = new Float32Array(count); // fall speed
    var palette = [new THREE.Color(COLORS.orange), new THREE.Color(COLORS.gold), new THREE.Color(COLORS.white), new THREE.Color(COLORS.blue)];
    for (var i = 0; i < count; i++) {
      pos[i*3]   = (Math.random() - 0.5) * spread;
      pos[i*3+1] = (Math.random() - 0.5) * spread;
      pos[i*3+2] = (Math.random() - 0.5) * spread;
      var c = palette[(Math.random() * palette.length) | 0];
      col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
      vel[i] = 0.006 + Math.random() * 0.014;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    var m = new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
    var pts = new THREE.Points(g, m);
    pts.userData = { vel: vel, spread: spread, count: count };
    return pts;
  }

  /* ============================================================ HERO */
  function initHeroScene(canvas) {
    if (!canvas) return;
    var renderer = makeRenderer(canvas);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0.2, 5);

    scene.add(new THREE.AmbientLight(0x6a7ab0, 0.7));
    var key = new THREE.DirectionalLight(0xfff0e0, 1.5); key.position.set(3, 5, 4); scene.add(key);
    var rim = new THREE.PointLight(COLORS.orange, 2.2, 18); rim.position.set(-4, 2, 2); scene.add(rim);
    var fill = new THREE.PointLight(COLORS.blue, 1.4, 18); fill.position.set(4, -2, 3); scene.add(fill);

    var cap = buildCap(); scene.add(cap);

    var confetti = buildConfetti(420, 12); scene.add(confetti);

    // faint starfield
    var starG = new THREE.BufferGeometry(); var sN = 600; var sp = new Float32Array(sN * 3);
    for (var s = 0; s < sN; s++) { sp[s*3]=(Math.random()-0.5)*40; sp[s*3+1]=(Math.random()-0.5)*40; sp[s*3+2]=(Math.random()-0.5)*40 - 8; }
    starG.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    var stars = new THREE.Points(starG, new THREE.PointsMaterial({ color: 0x9fb0d6, size: 0.05, transparent: true, opacity: 0.5 }));
    scene.add(stars);

    var mouse = { x: 0, y: 0 };
    window.addEventListener("pointermove", function (e) {
      mouse.x = (e.clientX / window.innerWidth - 0.5);
      mouse.y = (e.clientY / window.innerHeight - 0.5);
    });

    function resize() {
      var w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize); resize();

    var visible = true;
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(canvas);

    var t = 0;
    function loop() {
      requestAnimationFrame(loop);
      if (!visible) return;
      t += 0.01;
      // cap float + spin
      cap.rotation.y += REDUCE ? 0.002 : 0.006;
      cap.position.y = Math.sin(t) * 0.12 + 0.1;
      cap.rotation.z = Math.sin(t * 0.7) * 0.05;
      // confetti fall + recycle
      var p = confetti.geometry.attributes.position.array, vel = confetti.userData.vel, sprd = confetti.userData.spread;
      for (var i = 0; i < confetti.userData.count; i++) {
        p[i*3+1] -= vel[i] * (REDUCE ? 0.3 : 1);
        p[i*3]   += Math.sin(t + i) * 0.002;
        if (p[i*3+1] < -sprd/2) p[i*3+1] = sprd/2;
      }
      confetti.geometry.attributes.position.needsUpdate = true;
      confetti.rotation.y += 0.0008;
      stars.rotation.y += 0.0003;
      // parallax
      camera.position.x += (mouse.x * 1.2 - camera.position.x) * 0.05;
      camera.position.y += (-mouse.y * 0.8 + 0.2 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }
    loop();
  }

  /* ============================================================ DEV SCENE */
  function initDevScene(canvas) {
    if (!canvas) return;
    var renderer = makeRenderer(canvas);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    scene.add(new THREE.AmbientLight(0x5566aa, 0.8));
    var l1 = new THREE.PointLight(COLORS.orange, 2, 20); l1.position.set(4, 3, 4); scene.add(l1);
    var l2 = new THREE.PointLight(COLORS.blue, 1.6, 20); l2.position.set(-4, -2, 3); scene.add(l2);

    var group = new THREE.Group(); scene.add(group);

    // glowing core
    var core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.1, 1),
      new THREE.MeshStandardMaterial({ color: COLORS.navy, roughness: 0.3, metalness: 0.6, emissive: COLORS.orange, emissiveIntensity: 0.25, flatShading: true })
    );
    group.add(core);

    // wireframe shell
    var shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.0, 1),
      new THREE.MeshBasicMaterial({ color: COLORS.gold, wireframe: true, transparent: true, opacity: 0.28 })
    );
    group.add(shell);

    // orbiting nodes (particles on a sphere) + connecting feel
    var nN = 90; var nodeG = new THREE.BufferGeometry(); var np = new Float32Array(nN * 3);
    for (var i = 0; i < nN; i++) {
      var th = Math.acos(2 * Math.random() - 1), ph = Math.random() * Math.PI * 2, r = 2.6 + Math.random() * 0.5;
      np[i*3] = r * Math.sin(th) * Math.cos(ph); np[i*3+1] = r * Math.sin(th) * Math.sin(ph); np[i*3+2] = r * Math.cos(th);
    }
    nodeG.setAttribute("position", new THREE.BufferAttribute(np, 3));
    var nodes = new THREE.Points(nodeG, new THREE.PointsMaterial({ color: COLORS.white, size: 0.06, transparent: true, opacity: 0.85 }));
    group.add(nodes);

    var mouse = { x: 0, y: 0 };
    window.addEventListener("pointermove", function (e) { mouse.x = (e.clientX / window.innerWidth - 0.5); mouse.y = (e.clientY / window.innerHeight - 0.5); });

    function resize() {
      var w = canvas.clientWidth || canvas.offsetWidth || 600, h = canvas.clientHeight || canvas.offsetHeight || 600;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize); resize();

    var visible = true;
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(canvas);

    function loop() {
      requestAnimationFrame(loop);
      if (!visible) return;
      group.rotation.y += REDUCE ? 0.001 : 0.004;
      group.rotation.x += 0.0012;
      shell.rotation.z += 0.002;
      nodes.rotation.y -= 0.002;
      camera.position.x += (mouse.x * 1.5 - camera.position.x) * 0.04;
      camera.position.y += (-mouse.y * 1.5 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }
    loop();
  }

  window.JamariScenes = { initHeroScene: initHeroScene, initDevScene: initDevScene };
})();
