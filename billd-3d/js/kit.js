/* BILLD 3D: a small toolkit for the "illustrated 3D" look.
   Toon (cel) shading in flat brand colours, ink outlines, drawn-style
   contact shadows, and the reusable props: the logo and the glove cursor. */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/RoundedBoxGeometry.js";
import { SVGLoader } from "three/addons/SVGLoader.js";
import { mergeVertices } from "three/addons/BufferGeometryUtils.js";

export { THREE };

export const C = {
  red: "#E8261C",
  orange: "#FF7A1A",
  white: "#FFFFFF",
  ink: "#170D0A",
  cream: "#FFF4EE",
  sand: "#F3DCCB",
  grey: "#A79E9A",
  greyDark: "#6E6460",
  dust: "#C9BBA8",
};

/* Materials ------------------------------------------------------------- */

// Three flat tones per colour: shadow, mid, lit.
const gradient = (() => {
  const data = new Uint8Array([110, 110, 110, 255, 185, 185, 185, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

const toonCache = new Map();
export const toon = (color, opts = {}) => {
  const key = color + JSON.stringify(opts);
  if (!opts.unique && toonCache.has(key)) return toonCache.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...opts.mat });
  if (!opts.unique) toonCache.set(key, m);
  return m;
};

export const flat = (color, opts = {}) => new THREE.MeshBasicMaterial({ color, ...opts });

// Ink outline: the back faces of a slightly inflated copy, in ink.
const outlineMat = (thickness, color = C.ink) =>
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    uniforms: { thickness: { value: thickness }, color: { value: new THREE.Color(color) }, opacity: { value: 1 } },
    vertexShader: `
      uniform float thickness;
      void main() {
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        p.xyz += n * thickness * (-p.z) * 0.1;
        gl_Position = projectionMatrix * p;
      }`,
    fragmentShader: `
      uniform vec3 color; uniform float opacity;
      void main() { gl_FragColor = vec4(color, opacity); }`,
  });

const smoothCache = new WeakMap();
const smoothed = (geo) => {
  if (smoothCache.has(geo)) return smoothCache.get(geo);
  const g = geo.clone();
  g.deleteAttribute("normal");
  if (g.attributes.uv) g.deleteAttribute("uv");
  const m = mergeVertices(g, 1e-3);
  m.computeVertexNormals();
  smoothCache.set(geo, m);
  return m;
};

// A toon mesh with an ink outline. thickness is a fraction of view distance.
export const mesh = (geo, color, { outline = 0.012, cast = true, material } = {}) => {
  const group = new THREE.Group();
  const m = new THREE.Mesh(geo, material || (typeof color === "string" ? toon(color) : color));
  group.add(m);
  if (outline) {
    const o = new THREE.Mesh(smoothed(geo), outlineMat(outline));
    o.renderOrder = -1;
    group.add(o);
    group.userData.outline = o;
  }
  group.userData.body = m;
  return group;
};

// Fade a whole group (materials are cloned so shared ones are not affected).
export const makeFadeable = (group) => {
  group.traverse((o) => {
    if (!o.material) return;
    o.material = o.material.clone();
    o.material.transparent = true;
  });
  group.userData.fade = (v) =>
    group.traverse((o) => {
      if (!o.material) return;
      if (o.material.uniforms?.opacity) o.material.uniforms.opacity.value = v;
      else o.material.opacity = v;
      o.visible = v > 0.001;
    });
  return group;
};

/* Geometry helpers -------------------------------------------------------- */

export const box = (w, h, d, r = 0.08, color = C.white, opts) =>
  mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2)), color, opts);

export const cyl = (rt, rb, h, color, segs = 32, opts) => mesh(new THREE.CylinderGeometry(rt, rb, h, segs), color, opts);
export const sphere = (r, color, opts) => mesh(new THREE.SphereGeometry(r, 32, 20), color, opts);
export const capsule = (r, len, color, opts) => mesh(new THREE.CapsuleGeometry(r, len, 8, 16), color, opts);
export const torus = (r, tube, color, opts) => mesh(new THREE.TorusGeometry(r, tube, 16, 48), color, opts);
export const cone = (r, h, color, segs = 32, opts) => mesh(new THREE.ConeGeometry(r, h, segs), color, opts);

// A flat plane showing an image, e.g. a website screenshot.
export const screen = (w, h, texture, { radius = 0 } = {}) => {
  const geo = radius ? roundedPlane(w, h, radius) : new THREE.PlaneGeometry(w, h);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  return m;
};

export const roundedPlane = (w, h, r) => {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 8);
  // UVs from position so textures fill the shape.
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - x) / w;
    uv[i * 2 + 1] = (pos.getY(i) - y) / h;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
};

// Drawn-style soft contact shadow: a flat ink ellipse.
export const blobShadow = (w, d = w * 0.4, opacity = 0.16) => {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 40),
    new THREE.MeshBasicMaterial({ color: C.ink, transparent: true, opacity, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.scale.set(w, d, 1);
  return m;
};

/* The BILLD logo in 3D ------------------------------------------------------ */

export const LOGO_PATHS = {
  B: "M0 0H46C64 0 74 10 74 24C74 34 69 41 61 45C72 49 80 58 80 72C80 89 68 100 48 100H0ZM26 20H44C50 20 54 23 54 28C54 33 50 37 44 37H26ZM26 57H47C54 57 58 61 58 68C58 75 54 80 47 80H26Z",
  I: "M90 0H116V100H90Z",
  L1: "M126 34H152V74H170V100H126Z",
  L2: "M180 -10L206 -22V74H224V100H180Z",
  D: "M234 0H268C298 0 318 21 318 50C318 79 298 100 268 100H234ZM260 23H266C283 23 292 34 292 50C292 66 283 77 266 77H260Z",
};

// Returns a group 3.18 units wide (1 unit = 100 logo units), centred,
// with each letter as its own child pivoting at its base: { group, B, I, L1, L2, D }.
export const logo3d = ({ letters = C.white, bars = C.orange, depth = 0.34, outline = 0.01 } = {}) => {
  const loader = new SVGLoader();
  const group = new THREE.Group();
  const parts = {};
  for (const [key, d] of Object.entries(LOGO_PATHS)) {
    const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill-rule="evenodd"/></svg>`);
    const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: depth * 100, bevelEnabled: true, bevelThickness: 3, bevelSize: 2.2, bevelSegments: 3, curveSegments: 18 });
    geo.scale(0.01, -0.01, -0.01); // SVG y is down; flipping z too keeps faces pointing outward
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const cx = (bb.min.x + bb.max.x) / 2;
    geo.translate(-cx, -bb.min.y, depth / 2); // pivot at bottom centre
    const color = key === "L1" || key === "L2" ? bars : letters;
    const m = mesh(geo, color, { outline });
    m.position.set(cx - 1.59, -0.5, 0);
    // L2 rises above the cap height; keep its base on the baseline.
    group.add(m);
    parts[key] = m;
  }
  return { group, ...parts };
};

/* The glove cursor ------------------------------------------------------------ */

// A cartoon glove pointing up (+Y) with the index finger. The group's origin
// is the fingertip, so positioning it means "point here".
export const glove = ({ color = C.white, cuff = C.orange } = {}) => {
  const root = new THREE.Group();
  const hand = new THREE.Group();
  root.add(hand);
  const palm = sphere(0.5, color);
  palm.scale.set(1, 1.05, 0.62);
  hand.add(palm);
  // Index finger, straight up.
  const index = capsule(0.17, 0.62, color);
  index.position.set(-0.16, 0.78, 0.02);
  hand.add(index);
  // Three curled fingers: short capsules folded forward.
  [0.08, 0.3, 0.48].forEach((x, i) => {
    const f = capsule(0.155, 0.22, color);
    f.position.set(x - 0.12, 0.34 - i * 0.05, 0.2);
    f.rotation.x = 1.25;
    hand.add(f);
  });
  // Thumb across the palm.
  const thumb = capsule(0.16, 0.36, color);
  thumb.position.set(-0.42, 0.1, 0.18);
  thumb.rotation.set(0.6, 0, 0.95);
  hand.add(thumb);
  // Cuff.
  const c = cyl(0.42, 0.46, 0.26, cuff);
  c.position.set(0.02, -0.56, 0);
  hand.add(c);
  const wrist = cyl(0.34, 0.36, 0.3, color);
  wrist.position.set(0.02, -0.82, 0);
  hand.add(wrist);
  // Put the index fingertip at the origin.
  hand.position.set(0.16, -1.27, 0);
  root.userData.hand = hand;
  return root;
};

/* Camera ------------------------------------------------------------------------ */

// Distance at which a w×h box (world units) fits the camera's view.
export const fitDistance = (camera, w, h) => {
  const v = THREE.MathUtils.degToRad(camera.fov) / 2;
  return Math.max(h / 2 / Math.tan(v), w / 2 / (Math.tan(v) * camera.aspect));
};
