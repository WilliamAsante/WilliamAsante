/* BILLD 3D: props. Every object is built from simple shapes with toon
   materials and ink outlines, so the whole film shares one drawn look. */

import { THREE, C, toon, mesh, box, cyl, sphere, capsule, torus, cone, roundedPlane } from "./kit.js";

/* Canvas textures ---------------------------------------------------------- */

export const canvasTexture = (w, h, draw) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

const stripes = (ctx, x, y, w, h) => {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let i = -h; i < w + h; i += 40) {
    ctx.fillStyle = (i / 40) % 2 ? "#111" : "#FFD400";
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + 40, y + h);
    ctx.lineTo(x + i + 40 + h, y);
    ctx.lineTo(x + i + h, y);
    ctx.fill();
  }
  ctx.restore();
};

// A 2005-era homepage.
export const oldSiteTexture = () =>
  canvasTexture(1024, 600, (ctx, w, h) => {
    ctx.fillStyle = "#C0C0C0";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#0000EE";
    ctx.font = "italic 54px 'Times New Roman', Times, serif";
    ctx.textAlign = "center";
    ctx.fillText("Welcome to my Homepage!!", w / 2, 110);
    ctx.fillRect(w / 2 - 300, 122, 600, 4);
    ctx.fillStyle = "#111";
    ctx.font = "bold 92px 'Times New Roman', Times, serif";
    ctx.fillText("UNDER CONSTRUCTION", w / 2, 270);
    stripes(ctx, 80, 310, w - 160, 70);
    ctx.font = "36px 'Times New Roman', Times, serif";
    ctx.fillText("You are visitor #000127", w / 2, 450);
    ctx.fillStyle = "#555";
    ctx.font = "28px 'Times New Roman', Times, serif";
    ctx.fillText("Best viewed in Internet Explorer 6 at 800x600", w / 2, 510);
  });

// The same homepage squeezed onto a phone: tiny and unreadable.
export const tinySiteTexture = () =>
  canvasTexture(400, 860, (ctx, w, h) => {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#C0C0C0";
    ctx.fillRect(0, 60, w, 230);
    ctx.fillStyle = "#0000EE";
    ctx.font = "italic 14px serif";
    ctx.textAlign = "center";
    ctx.fillText("Welcome to my Homepage!!", w / 2, 92);
    ctx.fillStyle = "#111";
    ctx.font = "bold 24px serif";
    ctx.fillText("UNDER CONSTRUCTION", w / 2, 140);
    stripes(ctx, 20, 160, w - 40, 20);
    ctx.fillStyle = "#999";
    for (let i = 0; i < 26; i++) ctx.fillRect(24, 320 + i * 20, 120 + ((i * 37) % 220), 6);
  });

export const labelTexture = (text, { w = 512, h = 128, bg = null, color = C.white, size = 70, weight = 900, dot = false } = {}) =>
  canvasTexture(w, h, (ctx) => {
    if (bg) {
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, h / 2);
      ctx.fill();
    }
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px Archivo, sans-serif`;
    // Shrink to fit the label width.
    const maxW = w * (bg ? 0.7 : 0.92);
    const mw = ctx.measureText(text).width;
    if (mw > maxW) {
      size *= maxW / mw;
      ctx.font = `${weight} ${size}px Archivo, sans-serif`;
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let x = w / 2;
    if (dot) {
      const tw = ctx.measureText(text).width;
      x += size * 0.35;
      ctx.beginPath();
      ctx.arc(w / 2 - tw / 2 - size * 0.15, h / 2, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillText(text, x, h / 2 + size * 0.04);
  });

// A plane carrying a texture, offset slightly forward to sit on a surface.
export const decal = (w, h, texture, { radius = 0, transparent = true } = {}) => {
  const geo = radius ? roundedPlane(w, h, radius) : new THREE.PlaneGeometry(w, h);
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture, transparent, toneMapped: false }));
};

/* Devices -------------------------------------------------------------------- */

// An old grey browser window with the 2005 homepage on screen.
export const oldBrowser = (siteTex) => {
  const g = new THREE.Group();
  const body = box(2.8, 1.9, 0.2, 0.08, C.grey);
  g.add(body);
  const bar = box(2.8, 0.3, 0.24, 0.06, C.greyDark);
  bar.position.set(0, 0.8, 0.01);
  g.add(bar);
  [-1.2, -1.04, -0.88].forEach((x) => {
    const d = sphere(0.055, C.dust, { outline: 0 });
    d.position.set(x, 0.8, 0.14);
    g.add(d);
  });
  const scr = decal(2.6, 1.5, siteTex, { transparent: false });
  scr.position.set(0, -0.12, 0.111);
  g.add(scr);
  g.userData.screen = scr;
  return g;
};

export const phone = (screenTex, { body = C.white } = {}) => {
  const g = new THREE.Group();
  g.add(box(1, 2.02, 0.12, 0.16, body));
  const scr = decal(0.86, 1.82, screenTex, { radius: 0.1, transparent: false });
  scr.position.z = 0.064;
  g.add(scr);
  const notch = box(0.26, 0.05, 0.02, 0.02, C.ink, { outline: 0 });
  notch.position.set(0, 0.86, 0.075);
  g.add(notch);
  g.userData.screen = scr;
  return g;
};

// A laptop seen as a toy: base slab, open lid, and a screen plane whose
// local space (x: -1.5..1.5, y: -0.9..0.9) holds the website blocks.
export const laptop = () => {
  const g = new THREE.Group();
  const base = box(3.4, 0.14, 2.2, 0.07, C.white);
  base.position.set(0, -0.07, 0);
  g.add(base);
  const pad = box(0.9, 0.02, 0.55, 0.03, C.sand, { outline: 0 });
  pad.position.set(0, 0.005, 0.62);
  g.add(pad);
  const hinge = new THREE.Group();
  hinge.position.set(0, 0, -1.08);
  hinge.rotation.x = -0.18;
  g.add(hinge);
  const lid = box(3.4, 2.15, 0.1, 0.07, C.ink);
  lid.position.set(0, 1.075, 0);
  hinge.add(lid);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.12, 1.9), new THREE.MeshBasicMaterial({ color: C.cream }));
  scr.position.set(0, 1.09, 0.052);
  hinge.add(scr);
  const space = new THREE.Group(); // block space
  space.position.copy(scr.position);
  space.position.z += 0.005;
  hinge.add(space);
  g.userData.space = space;
  return g;
};

// A browser card that shows part of a tall screenshot (texture scrolls via offset).
export const browserCard = (tex, { w = 3.2, view = 1 / 1.6, frame = C.white } = {}) => {
  const g = new THREE.Group();
  const h = w * view;
  const barH = 0.18;
  g.add(box(w + 0.1, h + barH + 0.1, 0.08, 0.08, frame));
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(w, barH), new THREE.MeshBasicMaterial({ color: "#EFE6E1" }));
  bar.position.set(0, h / 2, 0.045);
  g.add(bar);
  [C.red, C.orange, "#CFC2BB"].forEach((col, i) => {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.035, 20), new THREE.MeshBasicMaterial({ color: col }));
    d.position.set(-w / 2 + 0.12 + i * 0.1, h / 2, 0.047);
    g.add(d);
  });
  const t = tex.clone();
  t.needsUpdate = true;
  const img = tex.image;
  const frac = Math.min(1, (img.width * view) / img.height); // share of the image height in view
  t.repeat.set(1, frac);
  t.offset.set(0, 1 - frac);
  const scr = decal(w, h, t, { transparent: false });
  scr.position.set(0, -barH / 2, 0.045);
  g.add(scr);
  g.userData.tex = t;
  g.userData.frac = frac;
  return g;
};

/* Promise props ---------------------------------------------------------------- */

export const stopwatch = () => {
  const g = new THREE.Group();
  const body = cyl(1, 1, 0.36, C.white, 48);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const rim = torus(1, 0.07, C.ink, { outline: 0 });
  rim.position.z = 0.18;
  g.add(rim);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tick = box(0.06, i % 3 ? 0.12 : 0.22, 0.02, 0.01, C.ink, { outline: 0 });
    tick.position.set(Math.sin(a) * 0.8, Math.cos(a) * 0.8, 0.19);
    tick.rotation.z = -a;
    g.add(tick);
  }
  const handPivot = new THREE.Group();
  handPivot.position.z = 0.21;
  const needle = box(0.07, 0.72, 0.03, 0.02, C.red, { outline: 0 });
  needle.position.y = 0.3;
  handPivot.add(needle);
  g.add(handPivot);
  const hub = cyl(0.09, 0.09, 0.04, C.ink, 20, { outline: 0 });
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.23;
  g.add(hub);
  const stem = cyl(0.11, 0.11, 0.22, C.white, 20);
  stem.position.y = 1.1;
  g.add(stem);
  const button = cyl(0.22, 0.22, 0.14, C.orange, 24);
  button.position.y = 1.26;
  g.add(button);
  g.userData.needle = handPivot;
  g.userData.button = button;
  return g;
};

const tagShape = () => {
  const s = new THREE.Shape();
  s.moveTo(-1.3, 0);
  s.lineTo(-0.85, 0.5);
  s.lineTo(1.3, 0.5);
  s.quadraticCurveTo(1.4, 0.5, 1.4, 0.4);
  s.lineTo(1.4, -0.4);
  s.quadraticCurveTo(1.4, -0.5, 1.3, -0.5);
  s.lineTo(-0.85, -0.5);
  s.lineTo(-1.3, 0);
  const hole = new THREE.Path();
  hole.absarc(-0.82, 0, 0.11, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
};

// A swinging price tag hanging from its hole. Pivot (the nail) is the group origin.
export const priceTag = (labelTex) => {
  const pin = new THREE.Group();
  const swing = new THREE.Group();
  pin.add(swing);
  const string = cyl(0.018, 0.018, 1.1, C.ink, 8, { outline: 0 });
  string.position.y = -0.55;
  swing.add(string);
  const hang = new THREE.Group(); // origin at the tag's hole
  hang.position.y = -1.1;
  hang.rotation.z = -0.22;
  swing.add(hang);
  const geo = new THREE.ExtrudeGeometry(tagShape(), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 16 });
  geo.translate(0.82, 0, -0.06);
  hang.add(mesh(geo, C.orange));
  const label = decal(1.7, 0.6, labelTex);
  label.position.set(1.12, 0, 0.1);
  hang.add(label);
  const nail = sphere(0.09, C.ink, { outline: 0 });
  pin.add(nail);
  pin.userData.swing = swing;
  return pin;
};

export const coin = (color = C.orange, ringColor = C.white) => {
  const g = new THREE.Group();
  const c = cyl(0.36, 0.36, 0.1, color, 36);
  c.rotation.x = Math.PI / 2;
  g.add(c);
  const ring = torus(0.26, 0.025, ringColor, { outline: 0 });
  ring.position.z = 0.055;
  g.add(ring);
  return g;
};

export const gem = () => {
  const g = new THREE.Group();
  const mat = toon(C.white, { unique: true, mat: { flatShading: true } });
  const top = mesh(new THREE.CylinderGeometry(0.62, 1, 0.42, 8), mat);
  top.position.y = 0.21;
  g.add(top);
  const bottom = mesh(new THREE.ConeGeometry(1, 1.15, 8), mat);
  bottom.rotation.x = Math.PI;
  bottom.position.y = -0.575;
  g.add(bottom);
  const band = mesh(new THREE.CylinderGeometry(1.005, 1.005, 0.04, 8, 1, true), toon(C.orange, { mat: { side: THREE.DoubleSide } }), { outline: 0 });
  g.add(band);
  return g;
};

// Bar with its pivot at the base.
export const bar = (w, h, d, color) => {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, h / 2, 0);
  return mesh(geo, color);
};

export const arrow = (len = 3, color = C.white) => {
  const s = new THREE.Shape();
  const t = 0.12, hw = 0.32, hl = 0.55;
  s.moveTo(0, -t);
  s.lineTo(len - hl, -t);
  s.lineTo(len - hl, -hw);
  s.lineTo(len, 0);
  s.lineTo(len - hl, hw);
  s.lineTo(len - hl, t);
  s.lineTo(0, t);
  s.lineTo(0, -t);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
  geo.translate(0, 0, -0.07);
  return mesh(geo, color);
};

/* Industry icons ----------------------------------------------------------------- */

const extrude = (shape, depth = 0.3, color = C.white) => {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 20 });
  geo.center();
  return mesh(geo, color);
};

const heartShape = () => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.9);
  s.bezierCurveTo(-0.3, -0.6, -1, -0.2, -1, 0.3);
  s.bezierCurveTo(-1, 0.75, -0.6, 0.95, -0.35, 0.95);
  s.bezierCurveTo(-0.15, 0.95, 0, 0.8, 0, 0.6);
  s.bezierCurveTo(0, 0.8, 0.15, 0.95, 0.35, 0.95);
  s.bezierCurveTo(0.6, 0.95, 1, 0.75, 1, 0.3);
  s.bezierCurveTo(1, -0.2, 0.3, -0.6, 0, -0.9);
  return s;
};

const gearShape = (teeth = 9, r1 = 0.66, r2 = 0.92) => {
  const s = new THREE.Shape();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = i % 4 < 2 ? r2 : r1;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.3, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
};

const leafShape = () => {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.55, 0.15, 0.7, 0.75);
  s.quadraticCurveTo(0.1, 0.65, 0, 0);
  return s;
};

const add = (g, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  g.add(m);
  return m;
};

const person = (g, x, color, s = 1) => {
  add(g, capsule(0.22 * s, 0.35 * s, color), x, -0.35 * s);
  add(g, sphere(0.2 * s, color), x, 0.22 * s);
};

export const ICONS = [
  ["Retail", (g) => {
    add(g, box(1.3, 1.25, 0.5, 0.06, C.orange), 0, -0.25);
    add(g, torus(0.32, 0.06, C.white), 0, 0.42, 0, 0, 0, 0);
  }],
  ["Faith & Community", (g) => {
    person(g, -0.6, C.white, 0.9);
    person(g, 0.6, C.white, 0.9);
    add(g, new THREE.Group(), 0, 0, 0.2).add((() => { const p = new THREE.Group(); person(p, 0, C.orange, 1.15); return p; })());
  }],
  ["Real Estate", (g) => {
    add(g, box(1.4, 1, 1, 0.05, C.white), 0, -0.4);
    const roof = add(g, cone(1.15, 0.75, C.orange, 4), 0, 0.47, 0, 0, Math.PI / 4, 0);
    roof.scale.set(1, 1, 0.82);
    add(g, box(0.34, 0.55, 0.06, 0.04, C.ink, { outline: 0 }), 0, -0.62, 0.51);
  }],
  ["Professional Services", (g) => {
    add(g, box(1.7, 1.15, 0.5, 0.12, C.orange), 0, -0.2);
    const h = add(g, torus(0.28, 0.07, C.white), 0, 0.42);
    h.scale.y = 0.9;
    add(g, box(1.7, 0.06, 0.52, 0.02, C.ink, { outline: 0 }), 0, -0.1);
    add(g, box(0.24, 0.18, 0.1, 0.03, C.white), 0, -0.1, 0.27);
  }],
  ["Nonprofits & NGOs", (g) => add(g, extrude(heartShape(), 0.35, C.white))],
  ["News Publishers", (g) => {
    add(g, box(1.5, 1.9, 0.08, 0.04, C.white), 0, 0, 0, 0, 0.2, -0.08);
    for (let i = 0; i < 6; i++) add(g, box(i === 0 ? 1.1 : 1.15, i === 0 ? 0.22 : 0.07, 0.02, 0.01, i === 0 ? C.orange : C.ink, { outline: 0 }), 0.02, 0.6 - i * 0.24 - (i ? 0.08 : 0), 0.05, 0, 0.2, -0.08);
  }],
  ["Media", (g) => {
    add(g, box(1.9, 1.3, 0.18, 0.12, C.white));
    const p = add(g, cone(0.4, 0.5, C.orange, 3), 0.04, 0, 0.12, 0, 0, -Math.PI / 2);
    p.scale.z = 0.3;
  }],
  ["Manufacturing", (g) => add(g, extrude(gearShape(), 0.32, C.orange))],
  ["IT", (g) => {
    add(g, box(1.8, 0.1, 1.1, 0.04, C.white), 0, -0.6, 0.2, 0.25);
    add(g, box(1.8, 1.15, 0.08, 0.05, C.ink), 0, 0.02, -0.25, -0.1);
    add(g, box(0.9, 0.12, 0.02, 0.03, C.orange, { outline: 0 }), -0.1, 0.12, -0.2, -0.1);
    add(g, box(0.6, 0.12, 0.02, 0.03, C.white, { outline: 0 }), -0.25, -0.1, -0.2, -0.1);
  }],
  ["Hospitality", (g) => {
    add(g, cyl(0.55, 0.45, 0.95, C.white), 0, 0);
    add(g, torus(0.27, 0.07, C.white), 0.58, 0.02);
    add(g, cyl(0.85, 0.75, 0.08, C.orange), 0, -0.52);
    add(g, cyl(0.5, 0.5, 0.02, "#6B3A20", 32, { outline: 0 }), 0, 0.47);
  }],
  ["Healthcare", (g) => {
    const disc = add(g, cyl(1, 1, 0.2, C.white, 48), 0, 0, 0, Math.PI / 2);
    disc.scale.setScalar(1);
    add(g, box(0.36, 1.2, 0.12, 0.05, C.red), 0, 0, 0.14);
    add(g, box(1.2, 0.36, 0.12, 0.05, C.red), 0, 0, 0.14);
  }],
  ["Finance", (g) => {
    for (let i = 0; i < 4; i++) add(g, cyl(0.6, 0.6, 0.16, i % 2 ? C.white : C.orange, 36), (i % 2) * 0.06, -0.55 + i * 0.2);
    const top = add(g, coin(C.orange), 0.15, 0.55, 0.1, 0, 0, 0.2);
    top.scale.setScalar(1.3);
  }],
  ["Engineering", (g) => {
    const dome = mesh(new THREE.SphereGeometry(0.75, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), C.orange);
    add(g, dome, 0, -0.25);
    add(g, cyl(1.05, 1.05, 0.08, C.orange, 40), 0, -0.25);
    add(g, box(0.18, 0.12, 1.2, 0.05, C.white), 0, 0.42, 0, 0.3);
  }],
  ["Education", (g) => {
    add(g, box(1.9, 0.08, 1.9, 0.03, C.ink), 0, 0.25, 0, 0, Math.PI / 4);
    add(g, cyl(0.62, 0.7, 0.45, C.ink, 32), 0, -0.05);
    add(g, sphere(0.1, C.orange, { outline: 0 }), 0, 0.31);
    add(g, cyl(0.03, 0.03, 0.7, C.orange, 8, { outline: 0 }), 0.75, -0.05, 0, 0, 0, 0.1);
    add(g, cone(0.11, 0.25, C.orange, 12, { outline: 0 }), 0.78, -0.45, 0, Math.PI);
  }],
  ["E-commerce", (g) => {
    const basket = add(g, box(1.4, 0.8, 0.85, 0.08, C.white), 0.1, 0.05);
    basket.scale.x = 1;
    add(g, capsule(0.06, 0.5, C.white), -0.75, 0.55, 0, 0, 0, 0.5);
    add(g, box(1.4, 0.08, 0.7, 0.03, C.orange), 0.1, 0.35, 0);
    [-0.4, 0.55].forEach((x) => add(g, cyl(0.17, 0.17, 0.16, C.ink, 24), x, -0.55, 0.3, Math.PI / 2));
  }],
  ["Creative & Marketing", (g) => {
    const horn = mesh(new THREE.CylinderGeometry(0.75, 0.22, 1.35, 32, 1, true), toon(C.orange, { mat: { side: THREE.DoubleSide } }));
    add(g, horn, 0.15, 0.1, 0, 0, 0, -Math.PI / 2);
    add(g, box(0.28, 0.55, 0.28, 0.06, C.white), -0.45, -0.38);
    add(g, cyl(0.2, 0.2, 0.3, C.white, 24), -0.7, 0.1, 0, 0, 0, Math.PI / 2);
  }],
  ["Construction", (g) => {
    add(g, cone(0.6, 1.7, C.orange, 40), 0, 0.15);
    add(g, cyl(0.37, 0.43, 0.2, C.white, 40, { outline: 0 }), 0, 0.05);
    add(g, cyl(0.2, 0.25, 0.16, C.white, 40, { outline: 0 }), 0, 0.5);
    add(g, box(1.4, 0.14, 1.4, 0.05, C.orange), 0, -0.72);
  }],
  ["Architecture & Interiors", (g) => {
    add(g, cyl(0.2, 0.2, 1.6, C.orange, 6), 0, 0.15, 0, 0, 0, 0.6);
    add(g, cone(0.2, 0.42, C.sand, 6), -0.57, -0.69, 0, 0, 0, 0.6 + Math.PI);
    add(g, cone(0.07, 0.15, C.ink, 6, { outline: 0 }), -0.69, -0.86, 0, 0, 0, 0.6 + Math.PI);
    add(g, box(1.7, 0.16, 0.06, 0.02, C.white), 0.1, -0.6, -0.25, 0, 0, -0.25);
  }],
  ["Agriculture", (g) => {
    add(g, cyl(0.55, 0.42, 0.6, C.ink, 32), 0, -0.6);
    add(g, cyl(0.6, 0.6, 0.1, C.ink, 32), 0, -0.3);
    add(g, cyl(0.05, 0.05, 0.9, C.white, 8), 0, 0.1);
    const l1 = add(g, extrude(leafShape(), 0.08, C.orange), 0.38, 0.45, 0, 0, 0, -0.2);
    const l2 = add(g, extrude(leafShape(), 0.08, C.orange), -0.38, 0.3, 0, 0, Math.PI, -0.1);
    l1.scale.setScalar(1.2);
    l2.scale.setScalar(1);
  }],
];

export const icon = (build) => {
  const g = new THREE.Group();
  build(g);
  return g;
};
