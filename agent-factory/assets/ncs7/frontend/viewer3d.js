/* In-app 3D CAD viewer using the GLOBAL THREE (UMD) — no ES modules, so it works
   when served, on static hosts, and in the single-file standalone (file://).
   Renders a construction drawing exploded into stacked discipline layers
   (Architectural / Structural / MEP) you can orbit by dragging.
   Exposed as window.NCSViewer.init(canvas) -> returns a dispose() function. */
(function () {
  if (typeof THREE === "undefined") { window.NCSViewer = { init: function () {} }; return; }

  function makeFloorPlan(color, accent) {
    const g = new THREE.Group();
    // slab outline
    const W = 9, D = 6;
    const mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.95 });
    const faint = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.28 });

    const rect = (w, d) => {
      const pts = [
        new THREE.Vector3(-w/2,0,-d/2), new THREE.Vector3(w/2,0,-d/2),
        new THREE.Vector3(w/2,0,d/2), new THREE.Vector3(-w/2,0,d/2), new THREE.Vector3(-w/2,0,-d/2)
      ];
      return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
    };
    g.add(rect(W, D));

    // interior grid
    for (let x = -W/2 + 1; x < W/2; x++) {
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
        [new THREE.Vector3(x,0,-D/2), new THREE.Vector3(x,0,D/2)]), faint));
    }
    for (let z = -D/2 + 1; z < D/2; z++) {
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
        [new THREE.Vector3(-W/2,0,z), new THREE.Vector3(W/2,0,z)]), faint));
    }

    // a few "rooms" / elements drawn as rectangles to feel like a plan
    const rooms = [[-2.6,-1.4,3,2],[1.4,-1.6,3.2,1.6],[-3,1.2,2.4,2],[0.6,1.0,3.6,2.4]];
    rooms.forEach(([cx,cz,w,d]) => {
      const pts = [
        new THREE.Vector3(cx-w/2,0.01,cz-d/2), new THREE.Vector3(cx+w/2,0.01,cz-d/2),
        new THREE.Vector3(cx+w/2,0.01,cz+d/2), new THREE.Vector3(cx-w/2,0.01,cz+d/2), new THREE.Vector3(cx-w/2,0.01,cz-d/2)
      ];
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: accent })));
    });
    // glow plane
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(W, D),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.05, side: THREE.DoubleSide }));
    plane.rotation.x = -Math.PI/2;
    g.add(plane);
    return g;
  }

  function init(canvas) {
    if (!canvas) return function () {};
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);

    const layers = [
      { name: "Architectural", color: 0x46c2ff, accent: 0x9be7ff, y: 0 },
      { name: "Structural",    color: 0xffd166, accent: 0xffe6a8, y: 3.2 },
      { name: "MEP",           color: 0x6ee7b7, accent: 0xbdf5dd, y: 6.4 }
    ];
    const group = new THREE.Group();
    layers.forEach(L => { const fp = makeFloorPlan(L.color, L.accent); fp.position.y = L.y; group.add(fp); });
    group.position.y = -3.2;
    scene.add(group);

    // orbit state
    let theta = 0.9, phi = 1.0, radius = 18, target = new THREE.Vector3(0, 0, 0);
    let dragging = false, lastX = 0, lastY = 0, auto = true;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function applyCam() {
      camera.position.x = target.x + radius * Math.sin(phi) * Math.cos(theta);
      camera.position.y = target.y + radius * Math.cos(phi);
      camera.position.z = target.z + radius * Math.sin(phi) * Math.sin(theta);
      camera.lookAt(target);
    }
    function onDown(e) { dragging = true; auto = false; const p = e.touches ? e.touches[0] : e; lastX = p.clientX; lastY = p.clientY; }
    function onUp() { dragging = false; }
    function onMove(e) {
      if (!dragging) return;
      const p = e.touches ? e.touches[0] : e;
      theta += (p.clientX - lastX) * 0.01;
      phi = Math.max(0.25, Math.min(1.45, phi + (p.clientY - lastY) * 0.01));
      lastX = p.clientX; lastY = p.clientY;
    }
    function onWheel(e) { e.preventDefault(); radius = Math.max(9, Math.min(40, radius + e.deltaY * 0.02)); }
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    canvas.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("touchend", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    canvas.addEventListener("wheel", onWheel, { passive: false });

    function resize() {
      const w = canvas.clientWidth || canvas.parentElement.clientWidth || 800;
      const h = canvas.clientHeight || 460;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    resize();

    let raf, t0 = performance.now();
    function loop() {
      raf = requestAnimationFrame(loop);
      if (auto && !reduce) theta += 0.0016;
      // gentle vertical "breathing" of the explode
      const t = (performance.now() - t0) / 1000;
      if (!reduce) layers.forEach((L, i) => { group.children[i].position.y = L.y + Math.sin(t * 0.6 + i) * 0.12; });
      applyCam();
      renderer.render(scene, camera);
    }
    loop();

    return function dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("wheel", onWheel);
      renderer.dispose();
    };
  }

  window.NCSViewer = { init: init, layers: ["Architectural", "Structural", "MEP"] };
})();
