/* ============================================================================
 * NCS 3D CAD Viewer — Floor Plan Exploded into Layers
 * ----------------------------------------------------------------------------
 * Offline, no-build Three.js demo for the National CAD Standard (NCS7) site.
 * Renders a small architectural building as multiple STACKED FLOOR PLATES
 * exploded vertically in 3D space, plus a discipline-LAYER explosion
 * (Architectural / Structural / MEP) on one level — a nod to the AIA CAD
 * Layer Guidelines that NCS is built around.
 *
 * ----------------------------------------------------------------------------
 * HOW A REAL UPLOADED CAD PDF WOULD FEED INTO THIS VIEWER
 * ----------------------------------------------------------------------------
 * This demo procedurally DRAWS its floor plans (no real PDF exists). In a
 * production pipeline the geometry below would be replaced by real sheets:
 *
 *   1. LOAD the PDF with pdf.js:
 *        const pdf = await pdfjsLib.getDocument(url).promise;
 *
 *   2. RENDER each page to an offscreen <canvas> at a chosen scale:
 *        const page = await pdf.getPage(n);
 *        const viewport = page.getViewport({ scale: 2 });
 *        const canvas = document.createElement('canvas');
 *        canvas.width = viewport.width; canvas.height = viewport.height;
 *        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
 *
 *   3. WRAP the canvas as a Three.js texture and put it on a plane:
 *        const tex = new THREE.CanvasTexture(canvas);
 *        const plane = new THREE.Mesh(
 *          new THREE.PlaneGeometry(w, h),
 *          new THREE.MeshBasicMaterial({ map: tex, transparent: true })
 *        );
 *
 *   4. STACK the planes by sheet / level (A-101, A-102, ...), offset on Y,
 *      then orbit — exactly the layout this demo produces with line geometry.
 *
 *   TRUE LAYER EXTRACTION (optional, for the discipline-layer explosion):
 *   PDFs authored from CAD often carry Optional Content Groups (OCGs) — the
 *   PDF equivalent of CAD layers. pdf.js exposes them via
 *   page.getOptionalContentConfig(); you can toggle individual OCGs visible/
 *   hidden and re-render the page per layer, producing one canvas/texture per
 *   discipline (A-WALL, S-COLS, M-HVAC ...). Each becomes its own offset plane,
 *   giving the Architectural / Structural / MEP separation shown here. For
 *   vector-accurate extraction you can instead walk page.getOperatorList() and
 *   re-emit drawing ops per layer to a canvas. Either way: canvas -> texture
 *   -> plane -> stack -> orbit. The 3D scaffolding is identical to this demo.
 * ============================================================================
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// Palette (blueprint)
// ---------------------------------------------------------------------------
const COL = {
  bg:        0x07142b,
  wall:      0x1ca7ec, // cyan blueprint line
  wallBright:0xe8f4ff, // white-ish bright line
  grid:      0x16385f,
  gridSub:   0x0e2546,
  dim:       0x5fb8e6, // dimension lines
  arch:      0x1ca7ec, // architectural layer
  struct:    0xff9f43, // structural layer (amber)
  mep:       0x4ee5a1, // MEP layer (green)
  plate:     0x0b1f3d, // floor plate fill
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------
let renderer, scene, camera, controls;
let buildingGroup;            // holds all floors; we explode by moving floors on Y
let floors = [];              // [{ group, baseY, level, levelName }]
let layerPlanes = [];         // discipline layer groups for the layer-explosion level
let labels = [];              // [{ el, getWorldPos() }] HTML labels tracked to 3D points
let explodeAmount = 0.6;      // 0..1 from the slider
let autoRotate = true;
let lastInteraction = 0;
const AUTO_RESUME_MS = 3500;  // resume auto-rotate this long after interaction

const PLAN_W = 120;           // plan footprint width  (scene units)
const PLAN_D = 90;            // plan footprint depth
const FLOOR_GAP_MAX = 70;     // max vertical gap when fully exploded
const LAYER_GAP_MAX = 16;     // max gap between discipline layers

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
init();

function init() {
  const canvas = document.getElementById('cad-canvas');

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap pixel ratio
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(COL.bg, 1);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(COL.bg, 220, 520);

  camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.1, 2000
  );
  camera.position.set(160, 150, 200);
  camera.lookAt(0, 30, 0);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 80;
  controls.maxDistance = 600;
  controls.maxPolarAngle = Math.PI * 0.92;
  controls.target.set(0, 30, 0);
  controls.addEventListener('start', onUserInteract);

  // soft lights (materials are mostly emissive line/basic, but lights help the plates)
  scene.add(new THREE.AmbientLight(0x88bbee, 0.7));
  const dir = new THREE.DirectionalLight(0xffffff, 0.5);
  dir.position.set(120, 200, 80);
  scene.add(dir);

  // ground grid
  buildGroundGrid();

  // building (stacked exploded floors)
  buildBuilding();

  // labels
  setupLabels();

  // UI wiring
  wireUI();

  // resize
  window.addEventListener('resize', onResize);

  // hide loader
  const loader = document.getElementById('cad-loading');
  if (loader) loader.classList.add('hidden');

  animate();
}

// ---------------------------------------------------------------------------
// Ground grid — faint blueprint grid on the floor
// ---------------------------------------------------------------------------
function buildGroundGrid() {
  const grid = new THREE.GridHelper(600, 60, COL.grid, COL.gridSub);
  grid.position.y = -2;
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  scene.add(grid);
}

// ---------------------------------------------------------------------------
// Building assembly
// ---------------------------------------------------------------------------
function buildBuilding() {
  buildingGroup = new THREE.Group();
  scene.add(buildingGroup);

  const levels = [
    { name: 'LEVEL 1',  variant: 0, layered: false },
    { name: 'LEVEL 2',  variant: 1, layered: true  }, // this one explodes into disciplines
    { name: 'LEVEL 3',  variant: 2, layered: false },
    { name: 'ROOF',     variant: 3, layered: false },
  ];

  levels.forEach((lvl, i) => {
    const group = new THREE.Group();
    const baseY = i * 26; // collapsed stacking height

    if (lvl.layered) {
      // Build three discipline layers (Arch / Struct / MEP) as offset planes.
      const arch = buildFloorPlan(lvl.variant, COL.arch);
      arch.userData.layerName = 'ARCHITECTURAL';
      const struct = buildStructuralLayer();
      struct.userData.layerName = 'STRUCTURAL';
      const mep = buildMepLayer();
      mep.userData.layerName = 'MEP';

      group.add(arch, struct, mep);
      layerPlanes = [arch, struct, mep];
    } else {
      const plan = buildFloorPlan(lvl.variant, lvl.variant === 3 ? COL.wallBright : COL.wall);
      group.add(plan);
    }

    group.position.y = baseY;
    buildingGroup.add(group);
    floors.push({ group, baseY, level: i, levelName: lvl.name, layered: !!lvl.layered });
  });

  buildColumnLines();
  applyExplode(explodeAmount);
}

// Faint vertical "column" lines connecting floor corners so it reads as a building.
let columnLines;
function buildColumnLines() {
  const hw = PLAN_W / 2, hd = PLAN_D / 2;
  const corners = [
    [-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd],
    [0, -hd], [0, hd], [-hw, 0], [hw, 0], // mid points for more structure
  ];
  const positions = [];
  // these are placeholders; real Y is set every frame in applyExplode via update.
  columnLines = new THREE.Group();
  corners.forEach(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const mat = new THREE.LineBasicMaterial({
      color: COL.wall, transparent: true, opacity: 0.18,
    });
    const line = new THREE.Line(geom, mat);
    columnLines.add(line);
  });
  columnLines.userData.corners = corners;
  buildingGroup.add(columnLines);
  void positions;
}

function updateColumnLines() {
  if (!columnLines || floors.length < 2) return;
  const corners = columnLines.userData.corners;
  const yBottom = floors[0].group.position.y;
  const yTop = floors[floors.length - 1].group.position.y;
  columnLines.children.forEach((line, i) => {
    const [x, z] = corners[i];
    const arr = line.geometry.attributes.position.array;
    arr[0] = x; arr[1] = yBottom; arr[2] = z;
    arr[3] = x; arr[4] = yTop;    arr[5] = z;
    line.geometry.attributes.position.needsUpdate = true;
  });
}

// ---------------------------------------------------------------------------
// Floor plan generator
// ---------------------------------------------------------------------------
// Procedurally draws a believable small-building plan:
//   - outer walls (with a door gap)
//   - interior partitions making 3-5 rooms (with door openings)
//   - a stair symbol
//   - dimension lines with ticks
//   - column grid dots
// Returns a THREE.Group laid out flat on the XZ plane (Y up = stack direction).
// `variant` shifts partitions per level so floors differ at a glance.
// ---------------------------------------------------------------------------
function buildFloorPlan(variant, color) {
  const g = new THREE.Group();
  const hw = PLAN_W / 2, hd = PLAN_D / 2;

  // Collect line segments as [x1,z1,x2,z2]. Doors are represented by GAPS.
  const wallSegs = [];

  // --- Outer shell with a front door gap (front = +z edge) ---
  const doorW = 12;
  // top edge (z = -hd) full
  wallSegs.push([-hw, -hd, hw, -hd]);
  // right edge
  wallSegs.push([hw, -hd, hw, hd]);
  // left edge
  wallSegs.push([-hw, hd, -hw, -hd]);
  // bottom (front) edge with a centered door gap
  wallSegs.push([-hw, hd, -doorW / 2, hd]);
  wallSegs.push([doorW / 2, hd, hw, hd]);

  // --- Interior partitions (vary by level) ---
  // A vertical spine partition with a doorway, plus horizontal partitions.
  const spineX = -hw + PLAN_W * (0.42 + variant * 0.04); // shifts per level
  const passH = 14;
  // vertical spine, split around a doorway near front
  wallSegs.push([spineX, -hd, spineX, hd * 0.15]);
  wallSegs.push([spineX, hd * 0.15 + passH, spineX, hd]);

  // horizontal partition on the left block, with a door gap
  const leftMidZ = -hd + PLAN_D * (0.5 + (variant % 2) * 0.08);
  wallSegs.push([-hw, leftMidZ, spineX - PLAN_W * 0.18, leftMidZ]);
  wallSegs.push([spineX - PLAN_W * 0.18 + passH, leftMidZ, spineX, leftMidZ]);

  // horizontal partition on the right block (different z so rooms vary)
  const rightMidZ = -hd + PLAN_D * (0.4 + variant * 0.06);
  wallSegs.push([spineX, rightMidZ, hw - PLAN_W * 0.2, rightMidZ]);
  wallSegs.push([spineX, rightMidZ, spineX, rightMidZ]); // tiny stub (kept for clarity)
  wallSegs.push([hw - PLAN_W * 0.2 + passH, rightMidZ, hw, rightMidZ]);

  // an extra small room divider on level variants 2/3
  if (variant >= 2) {
    const subX = hw - PLAN_W * 0.3;
    wallSegs.push([subX, rightMidZ, subX, hd]);
  }

  // Build extruded thin wall geometry from segments (thick lines that read as walls).
  const wallMat = new THREE.MeshBasicMaterial({ color });
  const wallThickness = 1.4;
  const wallHeight = 1.6;
  wallSegs.forEach((s) => {
    const mesh = makeWallMesh(s[0], s[1], s[2], s[3], wallThickness, wallHeight, wallMat);
    if (mesh) g.add(mesh);
  });

  // --- Door swing arcs (thin lines) at the front door + a couple interior doors ---
  addDoorSwing(g, 0, hd, doorW, color, Math.PI);             // front door
  addDoorSwing(g, spineX, hd * 0.15, passH, color, -Math.PI / 2); // interior

  // --- Stair symbol (a run of parallel treads with a direction arrow) ---
  addStairSymbol(g, hw - PLAN_W * 0.16, -hd + PLAN_D * 0.2, color);

  // --- Column grid dots (structural grid intersections) ---
  addColumnGrid(g, hw, hd, color);

  // --- Dimension lines with ticks along bottom + left ---
  addDimensionLine(g, -hw, hd + 8, hw, hd + 8, color, 'horizontal');
  addDimensionLine(g, -hw - 8, -hd, -hw - 8, hd, color, 'vertical');

  // --- Faint floor plate (so the plan reads as a slab when exploded) ---
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(PLAN_W + 16, PLAN_D + 16),
    new THREE.MeshBasicMaterial({
      color: COL.plate, transparent: true, opacity: 0.32, side: THREE.DoubleSide,
    })
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = -0.4;
  g.add(plate);

  // A thin border outline around the plate
  addPlateOutline(g, PLAN_W + 16, PLAN_D + 16, color);

  return g;
}

// Build a thin box mesh representing a wall segment lying on the XZ plane.
function makeWallMesh(x1, z1, x2, z2, thickness, height, material) {
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  if (len < 0.001) return null;
  const geom = new THREE.BoxGeometry(len, height, thickness);
  const mesh = new THREE.Mesh(geom, material);
  mesh.position.set((x1 + x2) / 2, height / 2, (z1 + z2) / 2);
  mesh.rotation.y = -Math.atan2(dz, dx);
  return mesh;
}

// Door swing: a quarter-circle arc + leaf line, drawn as thin lines on the plate.
function addDoorSwing(group, cx, cz, width, color, startAngle) {
  const r = width;
  const pts = [];
  const seg = 16;
  for (let i = 0; i <= seg; i++) {
    const a = startAngle + (i / seg) * (Math.PI / 2);
    pts.push(new THREE.Vector3(cx + Math.cos(a) * r * 0.5, 0.2, cz + Math.sin(a) * r * 0.5));
  }
  const arc = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })
  );
  group.add(arc);
}

// Stair symbol: parallel treads + a center direction line.
function addStairSymbol(group, x, z, color) {
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75 });
  const treads = 7, w = 16, depth = 22;
  const segs = [];
  for (let i = 0; i <= treads; i++) {
    const zz = z - depth / 2 + (i / treads) * depth;
    segs.push(
      new THREE.Vector3(x - w / 2, 0.2, zz),
      new THREE.Vector3(x + w / 2, 0.2, zz)
    );
  }
  // side rails
  segs.push(new THREE.Vector3(x - w / 2, 0.2, z - depth / 2), new THREE.Vector3(x - w / 2, 0.2, z + depth / 2));
  segs.push(new THREE.Vector3(x + w / 2, 0.2, z - depth / 2), new THREE.Vector3(x + w / 2, 0.2, z + depth / 2));
  // direction line
  segs.push(new THREE.Vector3(x, 0.3, z - depth / 2), new THREE.Vector3(x, 0.3, z + depth / 2));
  const geom = new THREE.BufferGeometry().setFromPoints(segs);
  group.add(new THREE.LineSegments(geom, mat));
}

// Column grid: small + markers at a regular grid (structural columns).
function addColumnGrid(group, hw, hd, color) {
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 });
  const segs = [];
  const cols = 4, rows = 3, s = 2;
  for (let cx = 0; cx <= cols; cx++) {
    for (let cz = 0; cz <= rows; cz++) {
      const x = -hw + (cx / cols) * (hw * 2);
      const z = -hd + (cz / rows) * (hd * 2);
      segs.push(new THREE.Vector3(x - s, 0.15, z), new THREE.Vector3(x + s, 0.15, z));
      segs.push(new THREE.Vector3(x, 0.15, z - s), new THREE.Vector3(x, 0.15, z + s));
    }
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), mat));
}

// Dimension line with end ticks (architectural dimension style).
function addDimensionLine(group, x1, z1, x2, z2, color, orient) {
  const mat = new THREE.LineBasicMaterial({ color: COL.dim, transparent: true, opacity: 0.7 });
  const segs = [
    new THREE.Vector3(x1, 0.2, z1), new THREE.Vector3(x2, 0.2, z2),
  ];
  const t = 3;
  if (orient === 'horizontal') {
    segs.push(new THREE.Vector3(x1, 0.2, z1 - t), new THREE.Vector3(x1, 0.2, z1 + t));
    segs.push(new THREE.Vector3(x2, 0.2, z2 - t), new THREE.Vector3(x2, 0.2, z2 + t));
  } else {
    segs.push(new THREE.Vector3(x1 - t, 0.2, z1), new THREE.Vector3(x1 + t, 0.2, z1));
    segs.push(new THREE.Vector3(x2 - t, 0.2, z2), new THREE.Vector3(x2 + t, 0.2, z2));
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), mat));
  void color;
}

function addPlateOutline(group, w, d, color) {
  const hw = w / 2, hd = d / 2;
  const pts = [
    new THREE.Vector3(-hw, 0.05, -hd),
    new THREE.Vector3(hw, 0.05, -hd),
    new THREE.Vector3(hw, 0.05, hd),
    new THREE.Vector3(-hw, 0.05, hd),
    new THREE.Vector3(-hw, 0.05, -hd),
  ];
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 })
  );
  group.add(line);
}

// ---------------------------------------------------------------------------
// Discipline layers for the layer-explosion level
// ---------------------------------------------------------------------------
// STRUCTURAL: column grid + beam lines + grid bubbles.
function buildStructuralLayer() {
  const g = new THREE.Group();
  const hw = PLAN_W / 2, hd = PLAN_D / 2;
  const mat = new THREE.LineBasicMaterial({ color: COL.struct, transparent: true, opacity: 0.85 });
  const segs = [];
  const cols = 4, rows = 3;
  // beam grid
  for (let cx = 0; cx <= cols; cx++) {
    const x = -hw + (cx / cols) * (hw * 2);
    segs.push(new THREE.Vector3(x, 0.1, -hd), new THREE.Vector3(x, 0.1, hd));
  }
  for (let cz = 0; cz <= rows; cz++) {
    const z = -hd + (cz / rows) * (hd * 2);
    segs.push(new THREE.Vector3(-hw, 0.1, z), new THREE.Vector3(hw, 0.1, z));
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), mat));

  // column markers (squares at intersections)
  const colMat = new THREE.MeshBasicMaterial({ color: COL.struct });
  for (let cx = 0; cx <= cols; cx++) {
    for (let cz = 0; cz <= rows; cz++) {
      const x = -hw + (cx / cols) * (hw * 2);
      const z = -hd + (cz / rows) * (hd * 2);
      const m = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1, 3.2), colMat);
      m.position.set(x, 0.5, z);
      g.add(m);
    }
  }
  addPlateOutline(g, PLAN_W + 16, PLAN_D + 16, COL.struct);
  return g;
}

// MEP: ducts (thick lines) + diffuser markers + a pipe run.
function buildMepLayer() {
  const g = new THREE.Group();
  const hw = PLAN_W / 2, hd = PLAN_D / 2;
  const mat = new THREE.LineBasicMaterial({ color: COL.mep, transparent: true, opacity: 0.85 });
  const segs = [];
  // main supply duct (spine)
  segs.push(new THREE.Vector3(-hw + 10, 0.1, 0), new THREE.Vector3(hw - 10, 0.1, 0));
  // branch ducts
  for (let i = -1; i <= 1; i++) {
    const x = i * (hw * 0.5);
    segs.push(new THREE.Vector3(x, 0.1, 0), new THREE.Vector3(x, 0.1, -hd + 14));
    segs.push(new THREE.Vector3(x, 0.1, 0), new THREE.Vector3(x, 0.1, hd - 14));
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), mat));

  // diffuser markers (small crosses in circles approximated by X)
  const diffMat = new THREE.LineBasicMaterial({ color: COL.mep, transparent: true, opacity: 0.7 });
  const diff = [];
  const spots = [
    [-hw * 0.5, -hd + 14], [-hw * 0.5, hd - 14],
    [0, -hd + 14], [0, hd - 14],
    [hw * 0.5, -hd + 14], [hw * 0.5, hd - 14],
  ];
  spots.forEach(([x, z]) => {
    const s = 4;
    diff.push(new THREE.Vector3(x - s, 0.2, z - s), new THREE.Vector3(x + s, 0.2, z + s));
    diff.push(new THREE.Vector3(x - s, 0.2, z + s), new THREE.Vector3(x + s, 0.2, z - s));
  });
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(diff), diffMat));

  addPlateOutline(g, PLAN_W + 16, PLAN_D + 16, COL.mep);
  return g;
}

// ---------------------------------------------------------------------------
// Explode logic — drives the vertical gaps from the slider (0..1)
// ---------------------------------------------------------------------------
function applyExplode(amount) {
  explodeAmount = amount;
  // Floor plates spread vertically.
  floors.forEach((f) => {
    f.group.position.y = f.baseY + f.level * FLOOR_GAP_MAX * amount;
  });
  // Within the layered level, push discipline layers apart too.
  if (layerPlanes.length === 3) {
    const order = [-1, 0, 1];
    layerPlanes.forEach((p, i) => {
      p.position.y = order[i] * LAYER_GAP_MAX * amount;
    });
  }
  updateColumnLines();
}

// ---------------------------------------------------------------------------
// HTML labels tracked to 3D anchor points
// ---------------------------------------------------------------------------
function setupLabels() {
  const layer = document.getElementById('cad-label-layer');
  if (!layer) return;

  // floor level labels — anchored at the front-right corner of each plate
  floors.forEach((f) => {
    const el = document.createElement('div');
    el.className = 'cad-label';
    el.textContent = f.levelName;
    layer.appendChild(el);
    labels.push({
      el,
      anchor: () => {
        const v = new THREE.Vector3(PLAN_W / 2 + 14, 0, -PLAN_D / 2 - 6);
        return f.group.localToWorld(v.clone());
      },
    });
  });

  // discipline layer labels for the layered level
  const layered = floors.find((f) => f.layered);
  if (layered && layerPlanes.length === 3) {
    const names = ['ARCHITECTURAL', 'STRUCTURAL', 'MEP'];
    layerPlanes.forEach((p, i) => {
      const el = document.createElement('div');
      el.className = 'cad-label layer-label';
      el.textContent = names[i];
      layer.appendChild(el);
      labels.push({
        el,
        anchor: () => {
          const v = new THREE.Vector3(-PLAN_W / 2 - 14, 0, PLAN_D / 2 + 6);
          // p is child of layered.group; localToWorld must chain through both
          return layered.group.localToWorld(p.position.clone().add(v));
        },
      });
    });
  }
}

function updateLabels() {
  const w = window.innerWidth, h = window.innerHeight;
  labels.forEach((lbl) => {
    const world = lbl.anchor();
    const proj = world.clone().project(camera);
    const behind = proj.z > 1;
    const x = (proj.x * 0.5 + 0.5) * w;
    const y = (-proj.y * 0.5 + 0.5) * h;
    if (behind || x < -50 || x > w + 50 || y < -50 || y > h + 50) {
      lbl.el.classList.remove('show');
    } else {
      lbl.el.style.left = x + 'px';
      lbl.el.style.top = y + 'px';
      lbl.el.classList.add('show');
    }
  });
}

// ---------------------------------------------------------------------------
// UI wiring
// ---------------------------------------------------------------------------
function wireUI() {
  const slider = document.getElementById('explode-slider');
  if (slider) {
    slider.value = String(Math.round(explodeAmount * 100));
    slider.addEventListener('input', (e) => {
      applyExplode(Number(e.target.value) / 100);
      onUserInteract();
    });
  }

  const resetBtn = document.getElementById('reset-view');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      camera.position.set(160, 150, 200);
      controls.target.set(0, 30, 0);
      controls.update();
      onUserInteract();
    });
  }

  const autoBtn = document.getElementById('toggle-autorotate');
  if (autoBtn) {
    autoBtn.classList.toggle('is-active', autoRotate);
    autoBtn.addEventListener('click', () => {
      autoRotate = !autoRotate;
      autoBtn.classList.toggle('is-active', autoRotate);
      if (autoRotate) lastInteraction = 0;
    });
  }

  const infoBtn = document.getElementById('info-toggle');
  const infoPanel = document.getElementById('info-panel');
  if (infoBtn && infoPanel) {
    infoBtn.addEventListener('click', () => infoPanel.classList.toggle('open'));
  }
}

function onUserInteract() {
  lastInteraction = performance.now();
}

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

// ---------------------------------------------------------------------------
// Animation loop (single rAF)
// ---------------------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  // gentle auto-rotate that pauses on interaction
  const now = performance.now();
  const idle = autoRotate && (lastInteraction === 0 || now - lastInteraction > AUTO_RESUME_MS);
  if (idle && buildingGroup) {
    buildingGroup.rotation.y += 0.0016;
  }

  controls.update();
  updateLabels();
  renderer.render(scene, camera);
}
