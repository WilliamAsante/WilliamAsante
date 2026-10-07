/* BILLD 3D motion ad: 56 s at 120 BPM (beat 0.5 s), same beat map and
   soundtrack as the kinetic version. Illustrated 3D (toon shading, ink
   outlines) under a layer of kinetic type, with a floating glove cursor.
   One GSAP timeline + a per-frame update(t) drive everything, so it can be
   scrubbed live or rendered frame by frame (window.__seek). */

import { THREE, C, toon, glove, logo3d, blobShadow, fitDistance, box } from "./kit.js";
import * as P from "./props.js";

const params = new URLSearchParams(location.search);
const FORMATS = { "9x16": [1080, 1920], "4x5": [1080, 1350], "16x9": [1920, 1080] };
const FMT = FORMATS[params.get("f")] ? params.get("f") : "9x16";
const [W, H] = FORMATS[FMT];
const PORTRAIT = H / W > 1.5;
const WIDE = W > H;
const U = Math.min(W, H) / 100;
const DUR = 56;
const RENDER = params.has("render");
const pick = (p, f, w) => (PORTRAIT ? p : WIDE ? w : f);
const rand = (i, salt = 1) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

if (RENDER) document.documentElement.classList.add("is-render");
const stage = document.getElementById("stage");
const bg = document.getElementById("bg");
const overlay = document.getElementById("overlay");
stage.style.width = `${W}px`;
stage.style.height = `${H}px`;

await Promise.all([document.fonts.load('900 100px "Archivo"'), document.fonts.load('500 20px "DM Mono"')]);
await document.fonts.ready;

/* Three.js setup ------------------------------------------------------------ */

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.setClearColor(0x000000, 0);
document.getElementById("gl").append(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight("#ffffff", 1.15));
const sun = new THREE.DirectionalLight("#ffffff", 2.3);
sun.position.set(-3, 5, 6);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 200);

const loadTex = (src) =>
  new Promise((res) => new THREE.TextureLoader().load(src, (t) => ((t.colorSpace = THREE.SRGBColorSpace), res(t)), undefined, () => res(null)));

const stackImages = async (srcs) => {
  const imgs = await Promise.all(srcs.map((s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = s; })));
  const ok = imgs.filter(Boolean);
  const w = ok[0]?.width || 1440;
  const h = ok.reduce((n, i) => n + i.height * (w / i.width), 0) || 900;
  return P.canvasTexture(w, h, (ctx) => {
    let y = 0;
    ok.forEach((i) => { const ih = i.height * (w / i.width); ctx.drawImage(i, 0, y, w, ih); y += ih; });
  });
};

const ASSETS = "../billd-motion/assets/";
const [bakeryTex, cbTex, cbMobileTex] = await Promise.all([
  stackImages([ASSETS + "work-bakery.jpg", ASSETS + "work-bakery-menu.jpg"]),
  stackImages([ASSETS + "work-cb.jpg", ASSETS + "work-cb-products.jpg"]),
  loadTex(ASSETS + "work-cb-mobile.jpg"),
]);
const oldTex = P.oldSiteTexture();
const tinyTex = P.tinySiteTexture();

/* Rigs: camera, glove, per-frame procedures ------------------------------------ */

// Camera: a world box (bw × bh) fits a screen region (rw × rh, fractions)
// whose centre is at (fx, fy); orbit by yaw/pitch around the target.
const cam = { fx: 0.5, fy: 0.5, rw: 0.9, rh: 0.6, bw: 4, bh: 4, zoom: 1, yaw: 0, pitch: 0, roll: 0, tx: 0, ty: 0, tz: 0 };
const applyCamera = (c = cam) => {
  const d = fitDistance(camera, c.bw / c.rw, c.bh / c.rh) * c.zoom;
  const cp = Math.cos(c.pitch);
  camera.position.set(c.tx + Math.sin(c.yaw) * cp * d, c.ty + Math.sin(c.pitch) * d, c.tz + Math.cos(c.yaw) * cp * d);
  camera.up.set(0, 1, 0);
  camera.lookAt(c.tx, c.ty, c.tz);
  if (c.roll) camera.rotateZ(c.roll);
  camera.setViewOffset(W, H, (0.5 - c.fx) * W, (0.5 - c.fy) * H, W, H);
  camera.updateMatrixWorld();
};
// World point under a screen pixel for a given camera config (on the plane z = z0).
const worldAt = (cfg, px, py, z0 = 0) => {
  applyCamera({ ...cam, ...cfg });
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((px / W) * 2 - 1, -(py / H) * 2 + 1), camera);
  const hit = new THREE.Vector3();
  ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -z0), hit);
  return hit;
};
// Standard layout: text on top (or left when wide), 3D below (or right).
const std = (bw, bh, extra = {}) => ({
  fx: pick(0.5, 0.5, 0.72), fy: pick(0.68, 0.67, 0.53), rw: pick(0.86, 0.8, 0.46), rh: pick(0.46, 0.5, 0.78),
  bw, bh, zoom: 1, yaw: 0, pitch: 0, roll: 0, tx: 0, ty: 0, tz: 0, ...extra,
});

const hand = glove();
scene.add(hand);
const hs = { x: 4, y: -3, z: 1, rx: 0.2, ry: -0.4, rz: 0.25, s: 1, show: 0, bob: 1 };

const procs = [];
const update = (t) => {
  procs.forEach((f) => f(t));
  const bob = hs.bob;
  hand.visible = hs.show > 0.5 && hs.s > 0.01;
  hand.position.set(hs.x + Math.sin(t * 1.9) * 0.04 * bob, hs.y + Math.sin(t * 2.6) * 0.07 * bob, hs.z);
  hand.rotation.set(hs.rx + Math.sin(t * 2.1) * 0.05 * bob, hs.ry, hs.rz + Math.sin(t * 1.6) * 0.06 * bob);
  hand.scale.setScalar(hs.s);
  applyCamera();
};

const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
const win = (obj, a, b) => {
  obj.visible = false;
  tl.set(obj, { visible: true }, a);
  tl.set(obj, { visible: false }, b);
};
const group = (a, b) => {
  const g = new THREE.Group();
  scene.add(g);
  win(g, a, b);
  return g;
};
const setBg = (color, at) => tl.set(bg, { backgroundColor: color }, at);
gsap.set(bg, { backgroundColor: C.white });

// Glove moves: keyframe the rig. press() squashes it like a click.
const handTo = (at, to, duration = 0.4, ease = "power3.inOut") => tl.to(hs, { ...to, duration, ease }, at);
const press = (at, s = hs.s) => {
  tl.to(hs, { s: s * 0.86, duration: 0.07, ease: "power2.in" }, at - 0.07);
  tl.to(hs, { s, duration: 0.3, ease: "back.out(3)" }, at);
};

// 3D ripple ring for taps.
const ripple = (at, pos, { color = C.orange, size = 0.9, face = new THREE.Euler(0, 0, 0) } = {}) => {
  const m = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 48), new THREE.MeshBasicMaterial({ color, transparent: true, depthTest: false }));
  m.renderOrder = 10;
  m.position.copy(pos);
  m.rotation.copy(face);
  scene.add(m);
  win(m, at, at + 0.55);
  tl.fromTo(m.scale, { x: 0.1, y: 0.1, z: 0.1 }, { x: size, y: size, z: size, duration: 0.55, ease: "power2.out", immediateRender: false }, at);
  tl.fromTo(m.material, { opacity: 1 }, { opacity: 0, duration: 0.55, ease: "power1.in", immediateRender: false }, at);
};

/* DOM type helpers (same toolkit as the kinetic ad) ------------------------------- */

const el = (tag, cls, parent, style = {}, html = "") => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  Object.assign(n.style, style);
  if (html) n.innerHTML = html;
  if (parent) parent.append(n);
  return n;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wdthFor = (text) => clamp(125 - (text.replace(/\s/g, "").length - 3) * 7, 68, 125);

// A positioned text area (fractions of the frame), shown between a and b.
const area = (rect, a, b, style = {}) => {
  const n = el("div", "area", overlay, {
    left: `${rect.l * W}px`, top: `${rect.t * H}px`, width: `${rect.w * W}px`, height: `${rect.h * H}px`, ...style,
  });
  tl.set(n, { visibility: "visible" }, a);
  tl.set(n, { visibility: "hidden" }, b);
  return n;
};
// Text area that pairs with std(): top band (or the left half when wide).
const textRect = (h = 0.36) => pick({ l: 0.06, t: 0.06, w: 0.88, h }, { l: 0.06, t: 0.05, w: 0.88, h: h * 0.85 }, { l: 0.04, t: 0.1, w: 0.46, h: 0.8 });

const fitText = (node, maxW, maxSize = Infinity) => {
  node.style.whiteSpace = "nowrap";
  node.style.fontSize = "100px";
  node.style.fontSize = `${Math.min((100 * maxW) / node.offsetWidth, maxSize)}px`;
  return parseFloat(node.style.fontSize);
};
const chars = (node) => {
  const text = node.textContent;
  node.textContent = "";
  const out = [];
  text.split(" ").forEach((word, wi, all) => {
    const w = el("span", "", node, { display: "inline-block", whiteSpace: "nowrap" });
    [...word].forEach((c) => out.push(el("span", "ch", w, {}, c)));
    if (wi < all.length - 1) node.append(" ");
  });
  return out;
};
const mono = (parent, text, size, color, style = {}) => el("div", "mono", parent, { fontSize: `${size}px`, color, ...style }, text);
// Lines fitted to maxW, capped so the stack fits maxH.
const stack = (parent, spec, { maxW, maxH, color = C.ink, colors = {}, weight = 900 }) => {
  const box_ = el("div", "stack", parent, { gap: `${U * 0.8}px` });
  const lines = spec.map((words) => {
    const line = el("span", "line", box_, { fontWeight: weight, color });
    line.style.fontStretch = `${wdthFor(words.join(" "))}%`;
    const spans = words.map((w, i) => {
      const s = el("span", "word", line, { color: colors[w] || color }, w);
      if (i < words.length - 1) line.append(" ");
      return s;
    });
    return { line, spans };
  });
  const cap = maxH / (spec.length * 0.84);
  lines.forEach(({ line }) => fitText(line, maxW, cap));
  if (box_.offsetHeight > maxH) {
    const k = maxH / box_.offsetHeight;
    lines.forEach(({ line }) => (line.style.fontSize = `${parseFloat(line.style.fontSize) * k}px`));
  }
  return { box: box_, lines, words: lines.flatMap((l) => l.spans) };
};
const headline = (parent, text, { maxW, maxH, color, stretch = 100, italic = false }) => {
  const n = el("div", "line", parent, { fontWeight: 900, fontStretch: `${stretch}%`, color, fontStyle: italic ? "italic" : "normal" }, text);
  fitText(n, maxW, maxH);
  return n;
};
const sub = (parent, html, color, size = pick(U * 5.4, U * 4.6, U * 3.4)) =>
  el("div", "", parent, { fontWeight: 700, fontSize: `${size}px`, color, lineHeight: 1.15, marginTop: `${U * 3}px`, maxWidth: "100%" }, html);
const counter = (n, color, a, b) => {
  const c = area({ l: 0.05, t: 0.03, w: 0.3, h: 0.05 }, a, b, { alignItems: "flex-start" });
  mono(c, `${n} / 4`, U * 2.8, color, { opacity: 0.75 });
};
const domRipple = (at, x, y, color = C.orange) => {
  const r = el("div", "abs", overlay, { left: `${x}px`, top: `${y}px`, width: `${U * 14}px`, height: `${U * 14}px`, margin: `-${U * 7}px 0 0 -${U * 7}px`, borderRadius: "50%", border: `${U * 0.7}px solid ${color}`, opacity: 0 });
  tl.fromTo(r, { scale: 0.2, opacity: 1 }, { scale: 1.6, opacity: 0, duration: 0.55, ease: "power2.out", immediateRender: false }, at);
};

/* 1. Hook: YOUR WEBSITE IS LOSING YOU MONEY. (0-4) ----------------------------------- */
{
  const g = group(0, 4);
  setBg(C.white, 0);
  const br = P.oldBrowser(oldTex);
  br.rotation.set(0.1, -0.38, 0);
  g.add(br);
  const sh = blobShadow(3.2, 0.7);
  sh.position.y = -1.35;
  g.add(sh);
  tl.set(cam, std(3.6, 2.9, { fy: pick(0.75, 0.7, 0.53), rh: pick(0.36, 0.42, 0.78), pitch: 0.1 }), 0);
  tl.fromTo(br.scale, { x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 1, z: 1, duration: 0.7, ease: "back.out(2)" }, 0);

  const coins = Array.from({ length: 18 }, (_, i) => {
    const c = P.coin(i % 4 === 3 ? C.ink : C.white, i % 4 === 3 ? C.white : C.red);
    c.scale.setScalar(0.75);
    g.add(c);
    return c;
  });
  procs.push((t) => {
    br.position.y = Math.sin(t * 2.2) * 0.05;
    const k = t > 2.5 && t < 3.2 ? Math.sin((t - 2.5) * 55) * 0.07 * (1 - (t - 2.5) / 0.7) : 0;
    br.position.x = k;
    coins.forEach((c, i) => {
      const dt = t - 2.5 - i * 0.035;
      c.visible = dt > 0 && t < 4;
      if (!c.visible) return;
      const a = rand(i, 3) * Math.PI * 2;
      const sp = 2 + rand(i, 5) * 2.5;
      c.position.set(Math.cos(a) * sp * dt * 0.8, -0.1 + (2.8 + rand(i, 7) * 2) * dt - 4.9 * dt * dt, 0.4 + rand(i, 9) * 1.4 * dt);
      c.rotation.set(dt * (4 + rand(i, 11) * 6), dt * 5, dt * 3);
    });
  });

  const a = area(pick({ l: 0.06, t: 0.05, w: 0.88, h: 0.5 }, { l: 0.06, t: 0.05, w: 0.88, h: 0.42 }, textRect()), 0, 4);
  const spec = PORTRAIT ? [["YOUR"], ["WEBSITE"], ["IS"], ["LOSING"], ["YOU"], ["MONEY."]] : [["YOUR", "WEBSITE"], ["IS", "LOSING"], ["YOU", "MONEY."]];
  const { words } = stack(a, spec, { maxW: a.offsetWidth, maxH: a.offsetHeight * 0.96, colors: { "MONEY.": C.red } });
  gsap.set(words, { opacity: 0, scale: 2.4 });
  words.forEach((w, i) => tl.to(w, { opacity: 1, scale: 1, duration: 0.3 }, i * 0.5 - (PORTRAIT ? 0 : i === words.length - 1 ? 0.5 : 0) * 0));
  const money = words[words.length - 1];
  const moneyChars = chars(money);
  setBg(C.red, 2.5);
  tl.to(words.slice(0, -1), { color: "rgba(255,255,255,0.4)", duration: 0.05, ease: "none" }, 2.5);
  tl.to(money, { color: C.white, duration: 0.05, ease: "none" }, 2.5);
  moneyChars.forEach((c, i) => tl.to(c, { y: H * 0.7, rotation: (rand(i, 3) - 0.5) * 140, opacity: 0, duration: 0.7, ease: "power2.in" }, 3.0 + i * 0.09));
}

/* 2. Problem (4-10) ---------------------------------------------------------------- */
{
  const g = group(4, 10.6);
  setBg(C.ink, 4);
  const br = P.oldBrowser(oldTex);
  g.add(br);
  const sh = blobShadow(3.2, 0.7, 0.35);
  sh.material.color.set("#000");
  sh.position.y = -1.35;
  g.add(sh);
  const baseRot = { x: 0.06, y: -0.28 };
  br.rotation.set(baseRot.x, baseRot.y, 0);
  tl.set(cam, std(3.6, 2.9, { pitch: 0.08 }), 4);

  // SLOW: a loading screen that never finishes
  const cover = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), new THREE.MeshBasicMaterial({ color: C.cream }));
  cover.position.set(0, -0.12, 0.115);
  br.add(cover);
  win(cover, 4, 5.5);
  const spinner = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.06, 12, 48, Math.PI * 1.5), new THREE.MeshBasicMaterial({ color: C.orange }));
  spinner.position.set(0, 0.05, 0.12);
  br.add(spinner);
  win(spinner, 4, 5.5);
  const track = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.07), new THREE.MeshBasicMaterial({ color: "#E3D6CE" }));
  track.position.set(0, -0.48, 0.118);
  br.add(track);
  win(track, 4, 5.5);
  const fillGeo = new THREE.PlaneGeometry(1.8, 0.07);
  fillGeo.translate(0.9, 0, 0);
  const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: C.orange }));
  fill.position.set(-0.9, -0.48, 0.12);
  fill.scale.x = 0.001;
  br.add(fill);
  win(fill, 4, 5.5);
  tl.to(fill.scale, { x: 0.31, duration: 1.4, ease: "steps(9)" }, 4.05);

  procs.push((t) => {
    spinner.rotation.z = -t * 2.2;
    // OUTDATED: the old browser creaks and wobbles
    const d = t - 5.5;
    br.rotation.z = d > 0 && d < 2.2 ? 0.07 * Math.sin(d * 9) * Math.exp(-d * 1.1) : 0;
    br.position.y = Math.sin(t * 2) * 0.04;
  });

  // INVISIBLE ON PHONES: the site shrinks into a phone and becomes unreadable
  const ph = P.phone(tinyTex);
  ph.position.set(0, -6, 0.6);
  ph.rotation.set(0.05, -0.2, 0);
  g.add(ph);
  win(ph, 7.5, 9.47);
  tl.to(cam, { zoom: 0.78, duration: 0.6, ease: "power2.inOut" }, 7.5);
  tl.to(br.scale, { x: 0.32, y: 0.32, z: 0.32, duration: 0.45, ease: "power3.in" }, 7.5);
  tl.to(br.position, { z: 0.7, duration: 0.45, ease: "power3.in" }, 7.5);
  tl.set(br, { visible: false }, 7.95);
  tl.to(ph.position, { y: 0, duration: 0.55, ease: "back.out(1.6)" }, 7.6);

  // The glove pinches and taps, gives up, then pokes it to pieces.
  tl.set(hs, { x: 3, y: -2.5, z: 2, rx: 0.3, ry: -0.5, rz: 0.4, s: 0.8, show: 1, bob: 1 }, 8.0);
  handTo(8.05, { x: 0.25, y: -0.15, z: 0.95, rz: 0.3 }, 0.35);
  press(8.45, 0.8);
  ripple(8.45, new THREE.Vector3(0.25, -0.15, 0.75), { size: 0.7 });
  handTo(8.55, { x: 0.05, y: 0.3 }, 0.25);
  press(8.85, 0.8);
  ripple(8.85, new THREE.Vector3(0.05, 0.3, 0.75), { size: 0.7 });
  handTo(9.0, { x: 1.1, y: -0.9, z: 2.2, rz: 0.55 }, 0.3, "power2.out");
  handTo(9.32, { x: 0.15, y: 0.05, z: 0.85, rz: 0.25 }, 0.12, "power4.in");
  ripple(9.45, new THREE.Vector3(0.15, 0.05, 0.75), { color: C.white, size: 1.1 });
  handTo(9.5, { x: 2.6, y: -2.6, z: 2.4 }, 0.4, "power2.in");
  tl.set(hs, { show: 0 }, 9.95);

  const shardCols = [C.white, C.grey, C.dust, "#FFD400", C.orange, C.white];
  const shards = Array.from({ length: 34 }, (_, i) => {
    const s = 0.08 + rand(i, 2) * 0.22;
    const m = box(s * (0.8 + rand(i, 3)), s * (0.6 + rand(i, 4)), 0.06, 0.02, shardCols[i % shardCols.length], { outline: 0.008 });
    g.add(m);
    return m;
  });
  procs.push((t) => {
    shards.forEach((m, i) => {
      const a = rand(i, 5) * Math.PI * 2;
      const r0x = (rand(i, 6) - 0.5) * 0.85, r0y = (rand(i, 7) - 0.5) * 1.8;
      const vx = Math.cos(a) * (0.8 + rand(i, 8) * 1.6), vy = Math.sin(a) * (0.8 + rand(i, 9) * 1.6), vz = 0.4 + rand(i, 10) * 1.5;
      m.visible = t >= 9.47 && t < 10.45;
      if (!m.visible) return;
      const out = Math.min(t, 10.0) - 9.47;
      let x = r0x + vx * out, y = r0y + vy * out, z = 0.6 + vz * out;
      let sc = 1;
      if (t > 10.0) {
        const k = Math.min(1, (t - 10.0) / 0.45);
        const e = k * k * k;
        x *= 1 - e; y *= 1 - e; z *= 1 - e;
        sc = 1 - e;
      }
      m.position.set(x, y, z);
      m.rotation.set(out * (3 + rand(i, 11) * 5), out * 4, out * (2 + rand(i, 12) * 4));
      m.scale.setScalar(Math.max(0.001, sc));
    });
  });

  // Type
  const a1 = area(textRect(pick(0.3, 0.3, 0.8)), 4, 5.5);
  const slow = headline(a1, "SLOW.", { maxW: a1.offsetWidth * 0.8, maxH: H * 0.22, color: C.white, stretch: 112 });
  const cs = chars(slow);
  gsap.set(cs, { opacity: 0 });
  cs.forEach((c, i) => tl.set(c, { opacity: 1 }, 4.05 + i * 0.24));
  const label = mono(a1, "Loading 0.0s", U * 3, "#C9AFA5", { marginTop: `${U * 3}px`, letterSpacing: "0.12em" });
  const tm = { v: 0 };
  tl.to(tm, { v: 8.7, duration: 1.4, ease: "none", onUpdate: () => (label.textContent = `Loading ${tm.v.toFixed(1)}s`) }, 4.05);

  const a2 = area(textRect(pick(0.3, 0.3, 0.8)), 5.5, 7.5);
  const serif = '"Times New Roman", Times, "Liberation Serif", serif';
  el("div", "", a2, { font: `italic ${U * 4}px ${serif}`, color: "#7FA2FF", textDecoration: "underline", marginBottom: `${U * 2}px` }, "Welcome to my Homepage!!");
  const holder = el("div", "", a2, { position: "relative" });
  const od = el("div", "", holder, { font: `bold 100px ${serif}`, color: C.white }, "OUTDATED.");
  const odSize = fitText(od, a2.offsetWidth * 0.9, H * 0.16);
  const copies = [C.red, "#00C8FF"].map((col) => el("div", "abs", holder, { inset: 0, font: `bold ${odSize}px ${serif}`, color: col, whiteSpace: "nowrap", mixBlendMode: "screen", opacity: 0 }, "OUTDATED."));
  const gl = { p: 0 };
  tl.to(gl, {
    p: 1, duration: 0.6, ease: "none",
    onUpdate: () => {
      const step = Math.floor(gl.p * 14);
      const on = gl.p > 0 && gl.p < 1;
      copies.forEach((c, k) => {
        c.style.opacity = on ? 0.9 : 0;
        const top = rand(step, k + 1) * 80;
        c.style.clipPath = `inset(${top}% 0 ${Math.max(0, 100 - top - 18 - rand(step, k + 5) * 20)}% 0)`;
        c.style.transform = `translateX(${(rand(step, k + 9) - 0.5) * U * 9}px)`;
      });
      od.style.transform = on ? `translateX(${(rand(step, 21) - 0.5) * U * 3}px)` : "none";
    },
  }, 6.8);

  const a3 = area(textRect(pick(0.3, 0.3, 0.8)), 7.5, 9.45);
  const inv = stack(a3, PORTRAIT ? [["INVISIBLE"], ["ON", "PHONES."]] : [["INVISIBLE", "ON"], ["PHONES."]], { maxW: a3.offsetWidth * 0.92, maxH: a3.offsetHeight * 0.62, color: C.white });
  gsap.set(inv.words, { opacity: 0, y: U * 6 });
  tl.to(inv.words, { opacity: 1, y: 0, duration: 0.35, stagger: 0.12 }, 7.55);
  const giveUp = mono(a3, "Pinch. Zoom. Give up.", U * 3, "#C9AFA5", { marginTop: `${U * 3}px` });
  gsap.set(giveUp, { opacity: 0 });
  tl.to(giveUp, { opacity: 1, duration: 0.3 }, 8.4);
}

/* 3. Reveal: BILLD (10-14) ------------------------------------------------------------ */
{
  const g = group(10, 14);
  const flood = (col) => el("div", "abs", overlay, { left: "50%", top: "50%", width: `${Math.hypot(W, H)}px`, height: `${Math.hypot(W, H)}px`, margin: `-${Math.hypot(W, H) / 2}px 0 0 -${Math.hypot(W, H) / 2}px`, borderRadius: "50%", background: col, transform: "scale(0)" });
  const o = flood(C.orange);
  tl.to(o, { scale: 1, duration: 0.35 }, 10.0);
  tl.set(o, { opacity: 0 }, 10.3);
  setBg(C.orange, 10.3);
  const ink = el("div", "abs", bg, { left: "50%", top: "50%", width: `${Math.hypot(W, H)}px`, height: `${Math.hypot(W, H)}px`, margin: `-${Math.hypot(W, H) / 2}px 0 0 -${Math.hypot(W, H) / 2}px`, borderRadius: "50%", background: C.ink, transform: "scale(0)" });
  tl.to(ink, { scale: 1, duration: 0.5 }, 10.18);
  tl.set(ink, { opacity: 0 }, 14);
  setBg(C.ink, 14);

  const L = logo3d();
  g.add(L.group);
  const sh = blobShadow(3.6, 0.6, 0.4);
  sh.material.color.set("#000");
  sh.position.y = -0.55;
  g.add(sh);
  const cfg = { fx: 0.5, fy: pick(0.44, 0.42, 0.42), rw: pick(0.86, 0.72, 0.5), rh: pick(0.3, 0.32, 0.4), bw: 3.6, bh: 1.6, zoom: 1, yaw: 0, pitch: 0.12, roll: 0, tx: 0, ty: 0.1, tz: 0 };
  tl.set(cam, cfg, 10);
  [L.B, L.I, L.D].forEach((p, i) => {
    const y0 = p.position.y;
    p.position.y = y0 + 3.5;
    tl.to(p.position, { y: y0, duration: 0.6, ease: "bounce.out" }, 10.45 + i * 0.12);
  });
  [L.L1, L.L2].forEach((p, i) => {
    p.scale.y = 0.001;
    tl.to(p.scale, { y: 1, duration: 0.55, ease: "back.out(3)" }, 11.0 + i * 0.25);
  });
  tl.fromTo(L.group.rotation, { y: -0.55, x: 0.1 }, { y: 0.28, x: 0.05, duration: 3.4, ease: "sine.inOut", immediateRender: false }, 10.1);
  procs.push((t) => {
    if (t >= 10 && t < 14) L.group.position.y = Math.sin(t * 2.2) * 0.04;
  });

  // The glove taps the tall bar, which springs higher.
  tl.set(hs, { x: 3.2, y: 2.4, z: 1.2, rx: 0.2, ry: 0.3, rz: Math.PI - 0.5, s: 0.55, show: 1, bob: 1 }, 11.2);
  handTo(11.25, { x: 0.45, y: 0.78, z: 0.3 }, 0.32);
  press(11.6, 0.55);
  tl.to(L.L2.scale, { y: 0.82, duration: 0.07, ease: "power2.in" }, 11.53);
  tl.to(L.L2.scale, { y: 1, duration: 0.7, ease: "elastic.out(1.2, 0.35)" }, 11.6);
  handTo(11.75, { x: 2.15, y: 0.4, z: 0.9, rz: Math.PI - 0.9 }, 0.6, "power2.out");
  handTo(13.3, { x: 3.4, y: 1.8 }, 0.3, "power2.in");
  tl.set(hs, { show: 0 }, 13.6);

  // Type around the logo
  const logoPx = cfg.rh * H * (1.4 / 1.6);
  const top = cfg.fy * H - logoPx / 2;
  const meetA = area({ l: 0.1, t: top / H - 0.07, w: 0.8, h: 0.05 }, 10, 13.6);
  const meet = mono(meetA, "Meet", U * 3.4, C.white);
  const tagA = area({ l: 0.04, t: (cfg.fy * H + logoPx / 2) / H + 0.03, w: 0.92, h: pick(0.22, 0.2, 0.2) }, 10, 13.6, { justifyContent: "flex-start" });
  const tag = el("div", "", tagA, { display: "flex", flexDirection: PORTRAIT ? "column" : "row", alignItems: "center", gap: `${PORTRAIT ? U * 0.6 : U * 2.4}px`, fontWeight: 800, fontSize: `${pick(U * 8, U * 6.4, U * 5.4)}px`, color: C.white, lineHeight: 1 });
  const tags = ["Fast.", "Affordable.", "Built to sell."].map((t, i) => el("span", "word", tag, { color: i === 2 ? C.orange : C.white }, t));
  const by = mono(tagA, "Websites by Bill", U * 2.8, C.orange, { marginTop: `${U * 3}px` });
  gsap.set([meet, by, ...tags], { opacity: 0, y: U * 3 });
  tl.to(meet, { opacity: 1, y: 0, duration: 0.4 }, 10.3);
  tags.forEach((t, i) => tl.to(t, { opacity: 1, y: 0, duration: 0.4 }, 12.0 + i * 0.5));
  tl.to(by, { opacity: 1, y: 0, duration: 0.4 }, 13.2);
  // Dive into the orange bar
  tl.to(cam, { zoom: 0.05, tx: 0.43, ty: 0.35, pitch: 0, duration: 0.45, ease: "power4.in" }, 13.55);
}

/* 4. Promises (14-26) ------------------------------------------------------------------ */
{
  // FAST (14-17): a stopwatch, clicked and spun
  const g = group(14, 17);
  setBg(C.red, 14);
  const sw = P.stopwatch();
  sw.rotation.set(0.12, -0.32, 0);
  g.add(sw);
  tl.set(cam, std(2.8, 3.1, { ty: 0.15 }), 14);
  tl.fromTo(sw.position, { x: -7 }, { x: 0, duration: 0.5, immediateRender: false }, 14.0);
  tl.to(sw.position, { x: 8, duration: 0.32, ease: "power3.in" }, 16.65);
  tl.set(hs, { x: 2.6, y: 3.4, z: 1.4, rx: 0.25, ry: 0.2, rz: Math.PI - 0.35, s: 0.75, show: 1 }, 14.1);
  handTo(14.12, { x: 0.12, y: 1.42, z: 0.25 }, 0.3);
  press(14.48, 0.75);
  tl.to(sw.userData.button.position, { y: 1.17, duration: 0.06, ease: "power2.in" }, 14.42);
  tl.to(sw.userData.button.position, { y: 1.26, duration: 0.3, ease: "back.out(3)" }, 14.5);
  handTo(14.6, { x: 2.0, y: 2.2, z: 1.2, rz: Math.PI - 0.8 }, 0.5, "power2.out");
  handTo(16.4, { x: 3.4, y: 3.4 }, 0.3, "power2.in");
  tl.set(hs, { show: 0 }, 16.7);
  procs.push((t) => {
    let a = 0;
    if (t > 14.5) a = Math.min(t - 14.5, 1.5) * 26 - Math.max(0, Math.min(t - 14.5, 1.5) - 1.1) ** 2 * 30;
    sw.userData.needle.rotation.z = -a;
    sw.position.y = Math.sin(t * 2.4) * 0.05;
  });
  // speed lines (drawn, white)
  for (let i = 0; i < 16; i++) {
    const line = el("div", "abs", overlay, { left: 0, top: `${rand(i, 2) * 100}%`, height: `${U * (0.3 + rand(i, 4) * 0.9)}px`, width: `${W * (0.2 + rand(i, 6) * 0.5)}px`, background: C.white, opacity: 0, borderRadius: "999px" });
    tl.fromTo(line, { x: -W, opacity: 0.25 + rand(i, 8) * 0.5 }, { x: W * 2.2, duration: 0.45 + rand(i, 9) * 0.3, ease: "none", immediateRender: false }, 13.95 + rand(i, 11) * 0.5);
    tl.fromTo(line, { x: -W }, { x: W * 2.2, duration: 0.4 + rand(i, 12) * 0.3, ease: "none", immediateRender: false }, 16.45 + rand(i, 13) * 0.3);
    tl.set(line, { opacity: 0 }, 17);
  }
  counter(1, C.white, 14, 17);
  const a = area(textRect(pick(0.3, 0.3, 0.8)), 14, 17);
  const word = headline(a, "FAST", { maxW: a.offsetWidth * 0.95, maxH: H * pick(0.18, 0.2, 0.3), color: C.white, stretch: 125, italic: true });
  const s = sub(a, "Launch in weeks, not months.", C.white);
  gsap.set(word, { x: -W * 1.3, skewX: -14, scaleX: 1.8 });
  gsap.set(s, { opacity: 0 });
  tl.to(word, { x: 0, scaleX: 1, duration: 0.45 }, 14.0);
  tl.to(word, { skewX: -6, duration: 0.6, ease: "elastic.out(1, 0.4)" }, 14.35);
  tl.to(s, { opacity: 1, duration: 0.4 }, 14.6);
  tl.to([word, s], { x: W * 1.4, duration: 0.3, ease: "power3.in" }, 16.65);
}
{
  // AFFORDABLE (17-20): a price tag that swings when flicked, and coins
  const g = group(17, 20);
  setBg(C.cream, 17);
  const tag = P.priceTag(P.labelTexture("SMALL-BIZ PRICE", { w: 1024, h: 340, color: C.ink, size: 118 }));
  tag.position.set(-1.1, 1.3, 0);
  g.add(tag);
  const coins = [0, 1, 2, 3].map((i) => {
    const c = P.coin(i % 2 ? C.white : C.orange);
    c.rotation.set(Math.PI / 2 - 0.25, 0, 0);
    c.position.set(1.35, -1.55 + i * 0.13, 0.4);
    g.add(c);
    return c;
  });
  const sh = blobShadow(3.4, 0.7);
  sh.position.set(0.3, -1.65, 0);
  g.add(sh);
  tl.set(cam, std(3.8, 3.6, { pitch: 0.08 }), 17);
  tl.fromTo(tag.position, { y: 5.5 }, { y: 1.3, duration: 0.6, ease: "back.out(1.6)", immediateRender: false }, 17.0);
  coins.forEach((c, i) => tl.fromTo(c.position, { y: 4 + i }, { y: -1.55 + i * 0.13, duration: 0.45, ease: "bounce.out", immediateRender: false }, 18.0 + i * 0.12));
  procs.push((t) => {
    const d = t - 17.6;
    tag.userData.swing.rotation.z = d > 0 ? 0.55 * Math.exp(-d * 1.6) * Math.sin(d * 7) : Math.sin(t * 2) * 0.03;
  });
  tl.set(hs, { x: 3.6, y: -0.6, z: 1.2, rx: 0.2, ry: -0.3, rz: 1.3, s: 0.7, show: 1 }, 17.2);
  handTo(17.25, { x: 1.95, y: -0.05, z: 0.35 }, 0.3);
  press(17.6, 0.7);
  handTo(17.65, { x: 2.7, y: 0.1, z: 1.0 }, 0.4, "power2.out");
  handTo(19.5, { x: 3.6, y: 0.4 }, 0.3, "power2.in");
  tl.set(hs, { show: 0 }, 19.8);
  counter(2, C.ink, 17, 20);
  const a = area(textRect(pick(0.3, 0.3, 0.8)), 17, 20);
  const word = headline(a, "AFFORDABLE", { maxW: a.offsetWidth * 0.95, maxH: H * 0.16, color: C.ink, stretch: 72 });
  const cs = chars(word);
  const s = sub(a, `Small-business price.<br><span style="color:${C.red}">Big-agency quality.</span>`, C.ink);
  gsap.set(cs, { y: -H * 0.2, opacity: 0 });
  gsap.set(s, { opacity: 0, y: U * 3 });
  tl.to(cs, { y: 0, opacity: 1, duration: 0.5, ease: "back.out(2)", stagger: 0.035 }, 17.0);
  tl.to(s, { opacity: 1, y: 0, duration: 0.4 }, 18.3);
  tl.to([word, s], { y: -U * 8, opacity: 0, duration: 0.3, ease: "power3.in" }, 19.6);
  tl.to(tag.position, { y: 6, duration: 0.35, ease: "power3.in" }, 19.6);
}
{
  // QUALITY (20-23): a cut gem with sparkles
  const g = group(20, 23);
  setBg(C.ink, 20);
  const gm = P.gem();
  g.add(gm);
  const sh = blobShadow(1.8, 0.5, 0.45);
  sh.material.color.set("#000");
  sh.position.y = -1.55;
  g.add(sh);
  tl.set(cam, std(2.8, 3.2, { pitch: 0.1 }), 20);
  tl.fromTo(gm.scale, { x: 0.01, y: 0.01, z: 0.01 }, { x: 1, y: 1, z: 1, duration: 0.6, ease: "back.out(2.5)", immediateRender: false }, 20.05);
  procs.push((t) => {
    gm.rotation.set(0.2, t * 1.3, 0.12);
    gm.position.y = Math.sin(t * 2.4) * 0.08;
  });
  tl.set(hs, { x: -3, y: -2.2, z: 1.4, rx: 0.2, ry: 0.4, rz: -0.6, s: 0.7, show: 1 }, 20.6);
  handTo(20.65, { x: -0.7, y: 0.15, z: 0.9 }, 0.3);
  press(21.0, 0.7);
  ripple(21.0, new THREE.Vector3(-0.6, 0.15, 0.8), { color: C.white, size: 1.4 });
  handTo(21.1, { x: -2.2, y: -0.9, z: 1.3 }, 0.5, "power2.out");
  handTo(22.4, { x: -3.6, y: -2.2 }, 0.3, "power2.in");
  tl.set(hs, { show: 0 }, 22.7);
  // drawn sparkles
  const cfg = std(2.8, 3.2);
  const cx = cfg.fx * W, cy = cfg.fy * H, rad = cfg.rh * H * 0.42;
  const star = (x, y, s, col, at) => {
    const n = el("div", "abs", overlay, { left: `${x - s / 2}px`, top: `${y - s / 2}px`, width: `${s}px`, height: `${s}px`, opacity: 0 });
    n.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z" fill="${col}"/></svg>`;
    tl.fromTo(n, { opacity: 1, scale: 0, rotation: 0 }, { scale: 1, rotation: 90, duration: 0.35, ease: "back.out(3)", immediateRender: false }, at);
    tl.to(n, { scale: 0, duration: 0.3, ease: "power2.in" }, at + 0.55);
    tl.set(n, { opacity: 0 }, 23);
  };
  for (let i = 0; i < 10; i++) {
    const a = rand(i, 41) * Math.PI * 2;
    const r = rad * (0.75 + rand(i, 42) * 0.5);
    star(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, U * (3 + rand(i, 43) * 4), i % 3 ? C.white : C.orange, 20.5 + (i % 5) * 0.3 + rand(i, 44) * 0.2);
  }
  counter(3, C.white, 20, 23);
  const a = area(textRect(pick(0.3, 0.3, 0.8)), 20, 23);
  const word = headline(a, "QUALITY", { maxW: a.offsetWidth * 0.9, maxH: H * 0.16, color: C.white, stretch: 100 });
  const cs = chars(word);
  const s = sub(a, "Designed down to the pixel.", C.white);
  cs.forEach((c, i) => gsap.set(c, { x: (rand(i, 31) - 0.5) * U * 8, y: (rand(i, 37) - 0.5) * U * 10, rotation: (rand(i, 41) - 0.5) * 16, opacity: 0 }));
  gsap.set(s, { opacity: 0, y: U * 3 });
  tl.to(cs, { opacity: 1, duration: 0.2, stagger: 0.03 }, 20.05);
  tl.to(cs, { x: 0, y: 0, rotation: 0, duration: 0.3, ease: "back.out(3)", stagger: 0.015 }, 20.55);
  tl.to(s, { opacity: 1, y: 0, duration: 0.4 }, 21.0);
  tl.to([word, s], { opacity: 0, duration: 0.25 }, 22.7);
  tl.to(gm.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.3, ease: "back.in(2)" }, 22.7);
}
{
  // RESULTS (23-26): bars and an arrow that shoots up
  const g = group(23, 26);
  setBg(C.orange, 23);
  const base = box(3.3, 0.1, 1.1, 0.04, C.ink);
  base.position.y = -0.05;
  g.add(base);
  const bars = [[0.9, C.ink], [1.6, C.ink], [2.6, C.white]].map(([h, col], i) => {
    const b = P.bar(0.62, h, 0.62, col);
    b.position.set(-0.95 + i * 0.95, 0, 0);
    b.scale.y = 0.001;
    g.add(b);
    tl.to(b.scale, { y: 1, duration: 0.55, ease: "back.out(2)" }, 23.2 + i * 0.22);
    return b;
  });
  const ar = P.arrow(3.4, C.white);
  ar.position.set(-1.6, 1.25, 0.3);
  ar.rotation.z = 0.55;
  ar.scale.x = 0.001;
  g.add(ar);
  tl.to(ar.scale, { x: 1, duration: 0.6, ease: "power3.out" }, 23.7);
  tl.set(cam, std(3.6, 3.3, { ty: 1.25, pitch: 0.18, yaw: -0.3 }), 23);
  tl.to(cam, { yaw: 0.3, duration: 3, ease: "sine.inOut" }, 23);
  // The glove pushes the tallest bar up from the side.
  tl.set(hs, { x: 3.2, y: 0.6, z: 0.9, rx: 0.15, ry: -0.2, rz: 1.35, s: 0.6, show: 1 }, 24.3);
  handTo(24.35, { x: 1.38, y: 1.2, z: 0.35 }, 0.32);
  press(24.7, 0.6);
  tl.to(bars[2].scale, { y: 1.12, duration: 0.6, ease: "elastic.out(1.2, 0.4)" }, 24.7);
  handTo(24.85, { x: 2.3, y: 0.9, z: 0.9 }, 0.5, "power2.out");
  handTo(25.35, { x: 3.6, y: 0.8 }, 0.3, "power2.in");
  tl.set(hs, { show: 0 }, 25.7);
  bars.forEach((b, i) => tl.to(b.scale, { y: 0.001, duration: 0.3, ease: "power3.in" }, 25.6 + i * 0.04));
  tl.to(ar.scale, { x: 0.001, duration: 0.3, ease: "power3.in" }, 25.6);
  counter(4, C.ink, 23, 26);
  const a = area(textRect(pick(0.3, 0.3, 0.8)), 23, 26);
  const word = headline(a, "RESULTS", { maxW: a.offsetWidth * 0.9, maxH: H * 0.16, color: C.ink, stretch: 95 });
  const s = sub(a, "Websites built to bring in customers.", C.ink);
  gsap.set(word, { scale: 0.6, opacity: 0 });
  gsap.set(s, { opacity: 0, y: U * 3 });
  tl.to(word, { scale: 1, opacity: 1, duration: 0.4 }, 23.0);
  tl.to(s, { opacity: 1, y: 0, duration: 0.4 }, 24.4);
  tl.to([word, s], { y: -U * 8, opacity: 0, duration: 0.3, ease: "power3.in" }, 25.6);
}

/* 5. Build: the glove builds a site on a laptop (26-34) ------------------------------- */
{
  const g = group(26, 34);
  setBg(C.cream, 26);
  const lap = P.laptop();
  g.add(lap);
  const sh = blobShadow(4.4, 3, 0.12);
  sh.position.y = -0.16;
  g.add(sh);
  const space = lap.userData.space;
  const WIRE = "#E3D6CE";
  // [x, y, w, h, final colour]
  const spec = [
    [0, 0.76, 2.9, 0.18, C.ink],
    [0, 0.26, 2.9, 0.68, C.red],
    [-0.62, 0.42, 1.4, 0.14, C.white],
    [-0.85, 0.2, 0.95, 0.14, C.white],
    [-0.98, -0.02, 0.7, 0.16, C.ink],
    [-0.97, -0.58, 0.9, 0.5, C.ink],
    [0, -0.58, 0.9, 0.5, C.red],
    [0.97, -0.58, 0.9, 0.5, C.white],
  ];
  const drops = [26.5, 27.0, 27.5, 27.75, 28.0, 28.5, 28.75, 29.0];
  const blocks = spec.map(([x, y, w, h, final], i) => {
    const mat = toon(WIRE, { unique: true });
    const b = box(w, h, 0.05, Math.min(0.05, h / 2), mat, { outline: 0.006 });
    b.position.set(x, y, 0.03 + (i >= 2 && i <= 4 ? 0.04 : 0));
    b.scale.setScalar(0.001);
    space.add(b);
    tl.to(b.scale, { x: 1, y: 1, z: 1, duration: 0.45, ease: "back.out(2.5)" }, drops[i]);
    const c = new THREE.Color(final);
    tl.to(mat.color, { r: c.r, g: c.g, b: c.b, duration: 0.35, ease: "power2.out" }, 29.6 + i * 0.12);
    return b;
  });
  const btnLabel = P.decal(0.6, 0.14, P.labelTexture("Book now", { w: 512, h: 120, color: C.white, size: 70, weight: 800 }));
  btnLabel.position.set(0, 0, 0.03);
  blocks[4].add(btnLabel);
  btnLabel.visible = false;
  tl.set(btnLabel, { visible: true }, 30.1);
  const brand = P.decal(0.7, 0.13, P.labelTexture("yourbrand", { w: 512, h: 96, color: C.white, size: 64, weight: 900 }));
  brand.position.set(-1.0, 0, 0.03);
  blocks[0].add(brand);
  brand.visible = false;
  tl.set(brand, { visible: true }, 29.7);
  const live = P.decal(0.62, 0.18, P.labelTexture("LIVE", { w: 512, h: 150, bg: C.red, color: C.white, size: 78, dot: true }));
  live.position.set(1.1, 0.78, 0.12);
  live.scale.setScalar(0.001);
  space.add(live);
  tl.to(live.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "back.out(3)" }, 32.2);

  scene.updateMatrixWorld(true);
  const normal = new THREE.Vector3(0, Math.sin(0.18), Math.cos(0.18));
  const tip = (b) => b.getWorldPosition(new THREE.Vector3()).addScaledVector(normal, 0.14);

  const cfg = { fx: 0.5, fy: pick(0.6, 0.6, 0.63), rw: pick(0.9, 0.84, 0.56), rh: pick(0.5, 0.55, 0.6), bw: 3.8, bh: 2.9, zoom: 1, yaw: -0.42, pitch: 0.32, roll: 0, tx: 0, ty: 0.75, tz: -0.4 };
  tl.set(cam, cfg, 26);
  tl.to(cam, { yaw: 0.38, duration: 7.6, ease: "sine.inOut" }, 26);
  tl.fromTo(lap.scale, { x: 0.6, y: 0.6, z: 0.6 }, { x: 1, y: 1, z: 1, duration: 0.6, ease: "back.out(1.6)", immediateRender: false }, 26);

  // Glove places each block as it appears
  tl.set(hs, { x: 3.4, y: 0.4, z: 1.5, rx: -0.35, ry: 0, rz: 0.35, s: 0.48, show: 1, bob: 0.6 }, 26.1);
  blocks.forEach((b, i) => {
    const p = tip(b);
    handTo(drops[i] - 0.25, { x: p.x, y: p.y, z: p.z }, 0.24, "power2.inOut");
    press(drops[i], 0.48);
  });
  // Build: sweep across while the colours come in
  const p1 = tip(blocks[1]);
  handTo(29.35, { x: p1.x - 1.2, y: p1.y + 0.1, z: p1.z + 0.15 }, 0.3);
  handTo(29.65, { x: p1.x + 1.3, y: p1.y - 0.2, z: p1.z + 0.15 }, 1.0, "sine.inOut");
  handTo(30.7, { x: 2.6, y: 0.9, z: 1.3 }, 0.5, "power2.out");
  // Launch: click the button
  const pb = tip(blocks[4]);
  handTo(31.3, { x: pb.x, y: pb.y, z: pb.z }, 0.6);
  press(31.95, 0.48);
  tl.to(blocks[4].scale, { z: 0.4, duration: 0.07, ease: "power2.in" }, 31.88);
  tl.to(blocks[4].scale, { z: 1, duration: 0.4, ease: "back.out(3)" }, 31.95);
  ripple(32.0, pb, { size: 1.1, face: new THREE.Euler(-0.18, 0, 0) });
  handTo(32.1, { x: 2.8, y: 1.4, z: 1.6 }, 0.6, "power2.out");
  handTo(33.3, { x: 4, y: 2 }, 0.3, "power2.in");
  tl.set(hs, { show: 0, bob: 1 }, 33.6);

  // Confetti from the button
  const confCols = [C.red, C.orange, C.ink, C.white];
  const conf = Array.from({ length: 46 }, (_, i) => {
    const m = box(0.08 + rand(i, 61) * 0.06, 0.04, 0.02 + rand(i, 62) * 0.12, 0.01, confCols[i % 4], { outline: 0 });
    g.add(m);
    return m;
  });
  procs.push((t) => {
    conf.forEach((m, i) => {
      const dt = t - 32.0;
      m.visible = dt > 0 && t < 34;
      if (!m.visible) return;
      const a = rand(i, 63) * Math.PI * 2;
      const sp = 1.2 + rand(i, 64) * 2.4;
      m.position.set(pb.x + Math.cos(a) * sp * dt, pb.y + (3 + rand(i, 65) * 2.5) * dt - 4.2 * dt * dt, pb.z + 0.2 + Math.sin(a) * sp * 0.6 * dt);
      m.rotation.set(dt * (5 + rand(i, 66) * 8), dt * 6, dt * (3 + rand(i, 67) * 5));
    });
  });
  tl.to(lap.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.35, ease: "back.in(1.6)" }, 33.6);

  // Type: DESIGN. BUILD. LAUNCH. with step pills
  const a = area(pick({ l: 0.06, t: 0.05, w: 0.88, h: 0.2 }, { l: 0.06, t: 0.04, w: 0.88, h: 0.18 }, { l: 0.06, t: 0.04, w: 0.88, h: 0.18 }), 26, 33.9, { justifyContent: "flex-start" });
  const big = el("div", "", a, { position: "relative", width: "100%", height: `${a.offsetHeight * 0.66}px` });
  ["DESIGN.", "BUILD.", "LAUNCH."].forEach((w, i) => {
    const n = el("div", "line abs", big, { left: 0, right: 0, top: 0, textAlign: "center", fontWeight: 900, fontStretch: "110%", color: i === 2 ? C.red : C.ink, visibility: "hidden" }, w);
    fitText(n, a.offsetWidth * 0.9, a.offsetHeight * 0.62);
    n.style.width = "100%";
    const [from, to] = [[26, 29.5], [29.5, 31.5], [31.5, 33.9]][i];
    tl.set(n, { visibility: "visible" }, from);
    tl.fromTo(n, { scale: 1.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, immediateRender: false }, from);
    tl.set(n, { visibility: "hidden" }, to);
  });
  const pills = el("div", "", a, { display: "flex", gap: `${U * 1.6}px`, justifyContent: "center" });
  const pillEls = ["1 Design", "2 Build", "3 Launch"].map((s) => el("div", "mono", pills, { fontSize: `${U * 2.6}px`, padding: `${U * 1}px ${U * 2.4}px`, border: `2px solid ${C.ink}`, borderRadius: "999px", color: C.ink }, s));
  [[0, 26.0], [1, 29.5], [2, 31.5]].forEach(([i, at]) => tl.to(pillEls[i], { backgroundColor: C.red, borderColor: C.red, color: C.white, duration: 0.2 }, at));
  tl.to(a, { opacity: 0, duration: 0.25 }, 33.6);
}

/* 6. Recent work (34-42) --------------------------------------------------------------- */
{
  const g = group(34, 42);
  setBg(C.ink, 34);
  const cfg = { fx: 0.5, fy: pick(0.5, 0.5, 0.48), rw: pick(0.9, 0.84, 0.52), rh: pick(0.5, 0.56, 0.54), bw: 3.6, bh: 2.4, zoom: 1, yaw: 0, pitch: 0.05, roll: 0, tx: 0, ty: 0, tz: 0 };
  tl.set(cam, cfg, 34);
  const c1 = P.browserCard(bakeryTex, { w: 3.3 });
  g.add(c1);
  tl.fromTo(c1.position, { y: -4.5 }, { y: 0, duration: 0.7, immediateRender: false }, 34.5);
  tl.fromTo(c1.rotation, { x: 0.6, y: -0.3 }, { x: 0.05, y: -0.12, duration: 0.8, immediateRender: false }, 34.5);
  const t1 = c1.userData.tex;
  tl.to(t1.offset, { y: 0, duration: 1.6, ease: "power2.inOut" }, 35.7);
  tl.to(c1.rotation, { y: -Math.PI / 2, duration: 0.35, ease: "power3.in" }, 37.6);
  tl.to(c1.position, { x: -4.5, duration: 0.35, ease: "power3.in" }, 37.6);
  win(c1, 34, 38);
  // Glove swipes up to scroll the page
  tl.set(hs, { x: 3, y: -2, z: 1.3, rx: 0.1, ry: -0.3, rz: 0.2, s: 0.55, show: 1, bob: 0.5 }, 35.2);
  handTo(35.25, { x: 1.1, y: -0.6, z: 0.45 }, 0.4);
  handTo(35.7, { y: 0.55 }, 0.8, "power2.inOut");
  handTo(36.55, { y: -0.6 }, 0.2, "power2.out");
  handTo(36.8, { y: 0.55 }, 0.6, "power2.inOut");
  handTo(37.4, { x: 3.2, y: -1.2, z: 1.4 }, 0.3, "power2.in");
  tl.set(hs, { show: 0 }, 37.7);

  const c2 = P.browserCard(cbTex, { w: 3.1 });
  c2.position.set(-0.25, 0.15, 0);
  g.add(c2);
  win(c2, 38, 42);
  tl.fromTo(c2.position, { x: 5 }, { x: -0.25, duration: 0.7, immediateRender: false }, 38.0);
  tl.fromTo(c2.rotation, { y: 0.7 }, { y: 0.14, duration: 0.8, immediateRender: false }, 38.0);
  tl.to(c2.userData.tex.offset, { y: 0, duration: 1.8, ease: "power2.inOut" }, 39.2);
  const ph = P.phone(cbMobileTex, { body: "#2E1C17" });
  ph.scale.setScalar(0.78);
  ph.position.set(1.35, -0.45, 0.55);
  g.add(ph);
  win(ph, 38, 42);
  tl.fromTo(ph.position, { y: -5 }, { y: -0.45, duration: 0.8, ease: "back.out(1.5)", immediateRender: false }, 38.4);
  tl.fromTo(ph.rotation, { z: 0.4, y: -0.6 }, { z: -0.06, y: -0.25, duration: 0.8, immediateRender: false }, 38.4);
  procs.push((t) => {
    if (t >= 38 && t < 42) ph.position.y = -0.45 + Math.sin(t * 2.2) * 0.05;
    if (t >= 34 && t < 38) c1.position.y += Math.sin(t * 2) * 0.0;
  });
  tl.set(hs, { x: 3.4, y: -2.4, z: 1.6, rx: 0.2, ry: -0.4, rz: 0.35, s: 0.5, show: 1, bob: 1 }, 39.1);
  handTo(39.15, { x: 1.4, y: -0.55, z: 0.75 }, 0.4);
  press(39.6, 0.5);
  ripple(39.6, new THREE.Vector3(1.4, -0.55, 0.65), { size: 0.7 });
  handTo(39.75, { x: 2.3, y: -1.3, z: 1.3 }, 0.5, "power2.out");
  handTo(41.3, { x: 3.6, y: -2.2 }, 0.3, "power2.in");
  tl.set(hs, { show: 0 }, 41.6);
  tl.to([c2.position, ph.position], { y: 4.5, duration: 0.35, ease: "power3.in", stagger: 0.05 }, 41.6);

  const top = area(pick({ l: 0.06, t: 0.07, w: 0.88, h: 0.08 }, { l: 0.06, t: 0.05, w: 0.88, h: 0.08 }, { l: 0.2, t: 0.05, w: 0.6, h: 0.1 }), 34, 42);
  const title = headline(top, "RECENT WORK", { maxW: top.offsetWidth * pick(0.9, 0.8, 0.7), maxH: top.offsetHeight, color: C.white, stretch: 110 });
  const tc = chars(title);
  gsap.set(tc, { y: U * 10, opacity: 0 });
  tl.to(tc, { y: 0, opacity: 1, duration: 0.4, stagger: 0.03 }, 34.0);
  tl.to(title, { opacity: 0, duration: 0.3 }, 41.6);
  const caption = (name, what, a, b) => {
    const c = area(pick({ l: 0.05, t: 0.8, w: 0.9, h: 0.12 }, { l: 0.05, t: 0.82, w: 0.9, h: 0.12 }, { l: 0.1, t: 0.82, w: 0.8, h: 0.14 }), a, b);
    el("div", "", c, { fontWeight: 900, fontSize: `${pick(U * 6.4, U * 5.4, U * 4.4)}px`, color: C.white, lineHeight: 1.05 }, name);
    mono(c, what, U * 2.6, C.orange, { marginTop: `${U * 1.6}px` });
    gsap.set(c.children, { opacity: 0, y: U * 3 });
    tl.to(c.children, { opacity: 1, y: 0, duration: 0.4, stagger: 0.08 }, a + 0.5);
    tl.to(c.children, { opacity: 0, duration: 0.3 }, b - 0.4);
  };
  caption("Sunday Oven Bakery", "Bakery website · menu · cake orders", 34.5, 38);
  caption("Copper &amp; Bean", "Coffee shop · subscriptions · bookings", 38.3, 42);
}

/* 7. Industries (42-47) and YOU. (47-48) -------------------------------------------------- */
{
  setBg(C.red, 42);
  const cfg = { fx: 0.5, fy: pick(0.47, 0.49, 0.5), rw: pick(0.62, 0.5, 0.3), rh: pick(0.3, 0.36, 0.48), bw: 2.4, bh: 2.4, zoom: 1, yaw: 0, pitch: 0.12, roll: 0, tx: 0, ty: 0, tz: 0 };
  tl.set(cam, cfg, 42);
  const head = area(pick({ l: 0.06, t: 0.12, w: 0.88, h: 0.08 }, { l: 0.06, t: 0.07, w: 0.88, h: 0.08 }, { l: 0.25, t: 0.07, w: 0.5, h: 0.1 }), 42, 47);
  const hw = headline(head, "WE BUILD FOR", { maxW: head.offsetWidth * 0.85, maxH: head.offsetHeight, color: C.white, stretch: 120 });
  gsap.set(hw, { scale: 1.5, opacity: 0 });
  tl.to(hw, { scale: 1, opacity: 1, duration: 0.35 }, 42.0);
  const labelA = area(pick({ l: 0.05, t: 0.66, w: 0.9, h: 0.14 }, { l: 0.05, t: 0.72, w: 0.9, h: 0.12 }, { l: 0.15, t: 0.77, w: 0.7, h: 0.12 }), 42, 47);
  const count = area(pick({ l: 0.3, t: 0.86, w: 0.4, h: 0.04 }, { l: 0.3, t: 0.88, w: 0.4, h: 0.04 }, { l: 0.3, t: 0.91, w: 0.4, h: 0.05 }), 42, 47);
  const countEl = mono(count, "", U * 2.8, "rgba(255,255,255,0.85)");
  P.ICONS.forEach(([name, build], i) => {
    const at = 42.25 + i * 0.25;
    const ic = P.icon(build);
    const accent = new THREE.Color(C.orange);
    ic.traverse((o) => {
      if (o.isMesh && o.material?.color?.equals?.(accent) && !o.material.uniforms) o.material = toon(C.ink, { mat: { side: o.material.side } });
    });
    const g = group(at, at + 0.25);
    g.add(ic);
    tl.fromTo(ic.scale, { x: 1.35, y: 1.35, z: 1.35 }, { x: 1, y: 1, z: 1, duration: 0.2, ease: "power3.out", immediateRender: false }, at);
    procs.push((t) => {
      if (t >= at && t < at + 0.25) ic.rotation.set(0.15, -0.55 + (t - at) * 2.6, 0);
    });
    const n = el("div", "abs", labelA, { left: 0, right: 0, textAlign: "center", fontWeight: 900, fontStretch: "88%", textTransform: "uppercase", lineHeight: 0.95, color: i % 2 ? C.ink : C.white, visibility: "hidden", textWrap: "balance" }, name);
    let fs = pick(U * 10, U * 8.5, U * 7);
    n.style.fontSize = `${fs}px`;
    const longest = name.split(" ").sort((x, y) => y.length - x.length)[0];
    const probe = el("span", "", n, { whiteSpace: "nowrap", position: "absolute", visibility: "hidden" }, longest);
    for (let k = 0; k < 20 && (probe.offsetWidth > labelA.offsetWidth * 0.86 || n.offsetHeight > labelA.offsetHeight); k++) {
      fs *= 0.93;
      n.style.fontSize = `${fs}px`;
    }
    probe.remove();
    tl.set(n, { visibility: "visible" }, at);
    tl.set(n, { visibility: "hidden" }, at + 0.25);
    tl.call(() => (countEl.textContent = `${String(i + 1).padStart(2, "0")} / 19`), null, at);
  });
  tl.call(() => (countEl.textContent = ""), null, 42.0);

  // YOU.: the glove points straight at the viewer
  setBg(C.white, 47);
  const youCfg = { fx: pick(0.5, 0.5, 0.68), fy: pick(0.62, 0.62, 0.5), rw: pick(0.8, 0.66, 0.44), rh: pick(0.5, 0.56, 0.86), bw: 2.6, bh: 2.6, zoom: 1, yaw: 0, pitch: 0, roll: 0, tx: 0, ty: -0.55, tz: 0 };
  tl.set(cam, youCfg, 47);
  tl.set(hs, { x: -0.15, y: 0.25, z: 0, rx: 0.78, ry: -0.5, rz: 0.32, s: 1.25, show: 1, bob: 0.6 }, 47);
  tl.fromTo(hs, { s: 0.4 }, { s: 1.25, duration: 0.35, ease: "back.out(2)", immediateRender: false }, 47);
  tl.to(hs, { z: 0.7, rx: 0.95, duration: 0.9, ease: "sine.in" }, 47.1);
  tl.set(hs, { show: 0 }, 48);
  const ya = area(pick({ l: 0.06, t: 0.08, w: 0.88, h: 0.26 }, { l: 0.06, t: 0.06, w: 0.88, h: 0.24 }, { l: 0.05, t: 0.2, w: 0.42, h: 0.6 }), 47, 48);
  const you = headline(ya, "YOU.", { maxW: ya.offsetWidth * 0.86, maxH: ya.offsetHeight, color: C.red, stretch: 125 });
  tl.fromTo(you, { scale: 1.5 }, { scale: 1, duration: 0.35, immediateRender: false }, 47.0);
}

/* 8. Call to action (48-56) -------------------------------------------------------------- */
{
  setBg(C.ink, 48);
  const col = area({ l: 0.04, t: 0.05, w: 0.92, h: 0.9 }, 48, DUR + 1, { gap: `${pick(U * 4, U * 2.6, U * 2.2)}px` });
  const big = stack(col, PORTRAIT ? [["LET'S"], ["BUILD"], ["YOURS."]] : [["LET'S", "BUILD", "YOURS."]], {
    maxW: W * pick(0.8, 0.84, 0.66), maxH: H * pick(0.28, 0.15, 0.18), color: C.white, colors: { "YOURS.": C.orange },
  });
  const spacer = el("div", "", col, { width: `${W * pick(0.72, 0.56, 0.36)}px`, height: `${W * pick(0.72, 0.56, 0.36) * 0.42}px` });
  const tag = el("div", "", col, { fontWeight: 800, fontSize: `${pick(U * 5.2, U * 4.4, U * 3.8)}px`, color: C.white, lineHeight: 1 }, `Fast. Affordable. <span style="color:${C.orange}">Built to sell.</span>`);
  const card = el("div", "", col, { display: "flex", flexDirection: "column", alignItems: "center", gap: `${U * 1.4}px`, padding: `${U * 3}px ${U * 6}px`, border: `${U * 0.4}px solid ${C.orange}`, borderRadius: `${U * 3}px`, background: "#23140F" });
  const icons = el("div", "", card, { display: "flex", gap: `${U * 2}px` });
  const icn = (svg) => el("div", "", icons, { width: `${U * 7.5}px`, height: `${U * 7.5}px`, borderRadius: "50%", background: C.orange, display: "grid", placeItems: "center" }, svg);
  const ic = [
    icn(`<svg viewBox="0 0 24 24" width="58%" height="58%"><path fill="${C.ink}" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.6.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.6.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`),
    icn(`<svg viewBox="0 0 24 24" width="52%" height="52%"><path fill="${C.ink}" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1Z"/></svg>`),
  ];
  const num = el("div", "", card, { fontWeight: 900, fontSize: `${pick(U * 9.4, U * 7.6, U * 6.4)}px`, color: C.white, lineHeight: 1, whiteSpace: "nowrap" }, "055 724 4074");
  mono(card, "WhatsApp or call Bill", U * 2.6, C.orange);

  // 3D logo sits in the spacer
  const sr = spacer.getBoundingClientRect(), stR = stage.getBoundingClientRect();
  const k = RENDER ? 1 : stR.width / W;
  const sx = (sr.left - stR.left) / k + sr.width / k / 2, sy = (sr.top - stR.top) / k + sr.height / k / 2;
  const cfg = { fx: sx / W, fy: sy / H, rw: sr.width / k / W, rh: (sr.height / k / H) * 1.25, bw: 3.4, bh: 1.65, zoom: 1, yaw: 0, pitch: 0.12, roll: 0, tx: 0, ty: 0.1, tz: 0 };
  tl.set(cam, cfg, 48);
  const g = group(48, DUR + 1);
  const L = logo3d();
  g.add(L.group);
  procs.push((t) => {
    if (t >= 48) {
      L.group.rotation.y = Math.sin(t * 0.9) * 0.22;
      L.group.position.y = Math.sin(t * 2.2) * 0.04;
    }
  });
  [L.B, L.I, L.D].forEach((p, i) => {
    p.scale.setScalar(0.001);
    tl.to(p.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "back.out(2.5)" }, 50.0 + i * 0.08);
  });
  [L.L1, L.L2].forEach((p, i) => {
    p.scale.y = 0.001;
    tl.to(p.scale, { y: 1, duration: 0.55, ease: "back.out(3)" }, 50.25 + i * 0.25);
  });
  for (let b = 52.0; b < 54; b += 0.5) {
    tl.to([L.L1.scale, L.L2.scale], { y: 1.14, duration: 0.08, ease: "power2.out" }, b);
    tl.to([L.L1.scale, L.L2.scale], { y: 1, duration: 0.35, ease: "power2.out" }, b + 0.08);
  }

  gsap.set(big.words, { opacity: 0, scale: 2.2 });
  big.words.forEach((w, i) => tl.to(w, { opacity: 1, scale: 1, duration: 0.3 }, 48.0 + i * 0.5));
  const offset = col.offsetHeight / 2 - (big.box.offsetTop + big.box.offsetHeight / 2);
  gsap.set(big.box, { y: offset, scale: pick(1.25, 1.08, 1.15) });
  tl.to(big.box, { y: 0, scale: 1, duration: 0.7, ease: "power4.inOut" }, 49.6);
  gsap.set([tag, card], { opacity: 0, y: U * 5 });
  gsap.set(ic, { scale: 0 });
  tl.to(tag, { opacity: 1, y: 0, duration: 0.5 }, 50.75);
  tl.to(card, { opacity: 1, y: 0, duration: 0.6 }, 51.0);
  tl.to(ic, { scale: 1, duration: 0.5, ease: "back.out(3)", stagger: 0.12 }, 51.3);

  // The glove taps the number
  const nr = num.getBoundingClientRect();
  const nx = (nr.left - stR.left) / k + (nr.width / k) * 0.86, ny = (nr.top - stR.top) / k + (nr.height / k) * 0.62;
  const tipW = worldAt(cfg, nx, ny, 0.6);
  const restW = worldAt(cfg, Math.min(nx, W - U * 16), Math.min(ny + U * 16, H * 0.84), 0.8);
  tl.set(hs, { x: tipW.x + 2.5, y: tipW.y - 2.5, z: 1.2, rx: 0.25, ry: -0.35, rz: 0.4, s: 0.55, show: 1, bob: 1 }, 51.4);
  handTo(51.45, { x: tipW.x, y: tipW.y, z: tipW.z }, 0.45);
  press(52.0, 0.55);
  domRipple(52.0, nx, ny);
  handTo(52.15, { x: restW.x, y: restW.y, z: restW.z }, 0.6, "power2.out");
  tl.to(hs, { rz: 0.1, duration: 0.25, ease: "sine.inOut", yoyo: true, repeat: 5 }, 53.0);

  const flash = el("div", "abs", overlay, { inset: 0, background: C.orange, opacity: 0, mixBlendMode: "screen" });
  tl.fromTo(flash, { opacity: 0.35 }, { opacity: 0, duration: 0.6, ease: "power2.out", immediateRender: false }, 54.0);
}

tl.set({}, {}, DUR);

/* Player / renderer -------------------------------------------------------------------- */

const frame = (t) => {
  tl.seek(t, false);
  update(t);
  renderer.render(scene, camera);
};
window.__duration = DUR;
window.__format = { name: FMT, width: W, height: H };
window.__seek = (t) => {
  frame(t);
  return true;
};
frame(0);
window.__ready = true;

if (!RENDER) {
  const audio = document.getElementById("track");
  const playBtn = document.getElementById("play");
  const scrub = document.getElementById("scrub");
  const clock = document.getElementById("clock");
  const fmtSel = document.getElementById("format");
  fmtSel.value = FMT;
  scrub.max = DUR;
  const fit = () => {
    const vp = document.querySelector(".viewport");
    stage.style.transform = `scale(${Math.min(vp.clientWidth / W, vp.clientHeight / H) * 0.96})`;
  };
  addEventListener("resize", fit);
  fit();
  let playing = false;
  let tNow = 0;
  const setPlaying = (p) => {
    playing = p;
    playBtn.textContent = p ? "Pause" : "Play";
  };
  playBtn.addEventListener("click", async () => {
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (tNow >= DUR - 0.05) tNow = 0;
    audio.currentTime = tNow;
    try {
      await audio.play();
    } catch {
      /* no audio: run on the clock */
    }
    setPlaying(true);
  });
  document.getElementById("restart").addEventListener("click", () => {
    tNow = 0;
    audio.currentTime = 0;
    frame(0);
  });
  scrub.addEventListener("input", () => {
    tNow = Number(scrub.value);
    audio.currentTime = tNow;
    frame(tNow);
  });
  fmtSel.addEventListener("change", () => {
    const url = new URL(location.href);
    url.searchParams.set("f", fmtSel.value);
    location.href = url;
  });
  let last = performance.now();
  const loop = (now) => {
    if (playing) {
      tNow = !audio.paused && audio.readyState >= 2 ? audio.currentTime : tNow + (now - last) / 1000;
      if (tNow >= DUR) {
        tNow = DUR;
        audio.pause();
        setPlaying(false);
      }
      frame(tNow);
    }
    last = now;
    scrub.value = tNow;
    clock.textContent = `${tNow.toFixed(2)}s`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
