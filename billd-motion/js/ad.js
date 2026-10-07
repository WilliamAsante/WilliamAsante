/* BILLD motion ad: 56 seconds, 120 BPM (beat = 0.5 s, bar = 2 s).
   One GSAP timeline drives everything, so the same code plays live with
   music and renders frame by frame (render/render.js calls window.__seek). */

(async () => {
  "use strict";

  /* Setup ---------------------------------------------------------------- */

  const params = new URLSearchParams(location.search);
  const FORMATS = { "9x16": [1080, 1920], "4x5": [1080, 1350], "16x9": [1920, 1080] };
  const FMT = FORMATS[params.get("f")] ? params.get("f") : "9x16";
  const [W, H] = FORMATS[FMT];
  const PORTRAIT = H / W > 1.5;
  const WIDE = W > H;
  const U = Math.min(W, H) / 100; // 1 unit = 1% of the short side
  const DUR = 56;
  const RENDER = params.has("render");
  const C = { red: "#E8261C", orange: "#FF7A1A", white: "#FFFFFF", ink: "#170D0A", cream: "#FFF4EE", wire: "#EFE4DE" };

  if (RENDER) document.documentElement.classList.add("is-render");
  const stage = document.getElementById("stage");
  stage.style.width = `${W}px`;
  stage.style.height = `${H}px`;

  await Promise.all([
    document.fonts.load('900 100px "Archivo"'),
    document.fonts.load('500 20px "DM Mono"'),
  ]);
  await document.fonts.ready;
  // Screenshots must be loaded before scenes measure them.
  await Promise.all(
    ["work-bakery", "work-bakery-menu", "work-cb", "work-cb-products", "work-cb-mobile"].map((n) => {
      const img = new Image();
      img.src = `assets/${n}.jpg`;
      return img.decode().catch(() => {});
    })
  );

  /* Helpers -------------------------------------------------------------- */

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (p, f, w) => (PORTRAIT ? p : WIDE ? w : f); // portrait / feed / wide

  const el = (tag, cls, parent, style = {}, html = "") => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    Object.assign(n.style, style);
    if (html) n.innerHTML = html;
    if (parent) parent.append(n);
    return n;
  };

  const scene = (bg) => el("section", "scene", stage, { background: bg });

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

  const wdthFor = (text) => clamp(125 - (text.replace(/\s/g, "").length - 3) * 7, 68, 125);

  // A stack of lines, each fitted to the width (like a poster), capped so the
  // whole stack fits the height. spec: [[word, word], [word]] or strings.
  const stack = (parent, spec, { width = 0.86, height = 0.78, weight = 900, color = C.ink, colors = {}, gap = 0.02 } = {}) => {
    const box = el("div", "stack", parent, { gap: `${gap * H}px` });
    const lines = spec.map((words) => {
      const line = el("span", "line", box, { fontWeight: weight, color });
      const text = words.join(" ");
      line.style.fontStretch = `${wdthFor(text)}%`;
      const spans = words.map((w, i) => {
        const s = el("span", "word", line, { color: colors[w] || color }, w);
        if (i < words.length - 1) line.append(" ");
        return s;
      });
      return { line, spans };
    });
    const maxW = W * width;
    const cap = (H * height) / (spec.length * 0.84);
    lines.forEach(({ line }) => {
      line.style.fontSize = "100px";
      line.style.fontSize = `${Math.min((100 * maxW) / line.offsetWidth, cap)}px`;
    });
    const total = box.offsetHeight;
    if (total > H * height) {
      const k = (H * height) / total;
      lines.forEach(({ line }) => (line.style.fontSize = `${parseFloat(line.style.fontSize) * k}px`));
    }
    return { box, lines, words: lines.flatMap((l) => l.spans) };
  };

  const fitText = (node, maxW, maxSize = Infinity) => {
    node.style.whiteSpace = "nowrap";
    node.style.fontSize = "100px";
    node.style.fontSize = `${Math.min((100 * maxW) / node.offsetWidth, maxSize)}px`;
    return parseFloat(node.style.fontSize);
  };

  const mono = (parent, text, size, color, style = {}) =>
    el("div", "mono", parent, { fontSize: `${size}px`, color, textTransform: "uppercase", letterSpacing: "0.12em", ...style }, text);

  // Deterministic "random" numbers for jitter and particles.
  const rand = (i, salt = 1) => {
    const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  /* Logo (same shapes as logo/billd-logo.svg): white letters, orange LL --- */

  const PATHS = {
    B: "M0 0H46C64 0 74 10 74 24C74 34 69 41 61 45C72 49 80 58 80 72C80 89 68 100 48 100H0ZM26 20H44C50 20 54 23 54 28C54 33 50 37 44 37H26ZM26 57H47C54 57 58 61 58 68C58 75 54 80 47 80H26Z",
    I: "M90 0H116V100H90Z",
    L1: "M126 34H152V74H170V100H126Z",
    L2: "M180 -10L206 -22V74H224V100H180Z",
    D: "M234 0H268C298 0 318 21 318 50C318 79 298 100 268 100H234ZM260 23H266C283 23 292 34 292 50C292 66 283 77 266 77H260Z",
  };
  const logo = (parent, width, ink) => {
    const wrap = el("div", "", parent, { width: `${width}px`, height: `${(width * 130) / 326}px` });
    wrap.innerHTML = `<svg viewBox="-4 -26 326 130" width="100%" height="100%" style="overflow:visible">
      <path data-l="B" fill="${ink}" fill-rule="evenodd" d="${PATHS.B}"/>
      <path data-l="I" fill="${ink}" d="${PATHS.I}"/>
      <path data-l="L1" fill="${C.orange}" d="${PATHS.L1}"/>
      <path data-l="L2" fill="${C.orange}" d="${PATHS.L2}"/>
      <path data-l="D" fill="${ink}" fill-rule="evenodd" d="${PATHS.D}"/></svg>`;
    const q = (k) => wrap.querySelector(`[data-l="${k}"]`);
    return { wrap, B: q("B"), I: q("I"), L1: q("L1"), L2: q("L2"), D: q("D") };
  };

  const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
  const show = (sc, from, to) => {
    tl.set(sc, { visibility: "visible" }, from);
    tl.set(sc, { visibility: "hidden" }, to);
  };

  /* 1. Hook: YOUR WEBSITE IS LOSING YOU MONEY. (0-4) ----------------------- */
  {
    const sc = scene(C.white);
    show(sc, 0, 4);
    const spec = PORTRAIT
      ? [["YOUR"], ["WEBSITE"], ["IS"], ["LOSING"], ["YOU"], ["MONEY."]]
      : [["YOUR", "WEBSITE"], ["IS", "LOSING"], ["YOU", "MONEY."]];
    const { words } = stack(sc, spec, { height: 0.82, colors: { "MONEY.": C.red } });
    gsap.set(words, { opacity: 0, scale: 2.4 });
    words.forEach((w, i) => tl.to(w, { opacity: 1, scale: 1, duration: 0.3 }, i * 0.5));
    const money = words[words.length - 1];
    const moneyChars = chars(money);
    tl.to(sc, { backgroundColor: C.red, duration: 0.06, ease: "none" }, 2.5);
    tl.to(words.slice(0, -1), { color: "rgba(255,255,255,0.35)", duration: 0.06, ease: "none" }, 2.5);
    tl.to(money, { color: C.white, duration: 0.06, ease: "none" }, 2.5);
    tl.fromTo(money, { x: -U * 2 }, { x: U * 2, duration: 0.05, repeat: 5, yoyo: true, ease: "none", immediateRender: false }, 2.6);
    tl.to(money, { x: 0, duration: 0.05 }, 2.9);
    // The money falls out, letter by letter.
    moneyChars.forEach((c, i) =>
      tl.to(c, { y: H * 0.75, rotation: (rand(i, 3) - 0.5) * 140, opacity: 0, duration: 0.65, ease: "power2.in" }, 3.0 + i * 0.09)
    );
  }

  /* 2. Problem (4-10) ------------------------------------------------------ */
  {
    // 2a. SLOW. (4-5.5)
    const sc = scene(C.ink);
    show(sc, 4, 5.5);
    const word = el("div", "line", sc, { fontWeight: 900, color: C.white, fontStretch: "110%" }, "SLOW.");
    fitText(word, W * 0.7, H * 0.3);
    const cs = chars(word);
    gsap.set(cs, { opacity: 0 });
    cs.forEach((c, i) => tl.set(c, { opacity: 1 }, 4.05 + i * 0.24));
    const track = el("div", "", sc, { width: `${W * 0.6}px`, height: `${U * 1.4}px`, marginTop: `${U * 6}px`, background: "#3A2622", borderRadius: "999px", overflow: "hidden" });
    const fill = el("div", "", track, { height: "100%", width: "100%", background: C.orange, transformOrigin: "left", transform: "scaleX(0)" });
    tl.to(fill, { scaleX: 0.31, duration: 1.4, ease: "steps(9)" }, 4.05);
    const label = mono(sc, "Loading 0.0s", U * 3, "#C9AFA5", { marginTop: `${U * 3}px` });
    const t = { v: 0 };
    tl.to(t, { v: 8.7, duration: 1.4, ease: "none", onUpdate: () => (label.textContent = `Loading ${t.v.toFixed(1)}s`) }, 4.05);
  }
  {
    // 2b. OUTDATED. (5.5-7.5) in a 2005 homepage style
    const sc = scene("#C0C0C0");
    show(sc, 5.5, 7.5);
    const serif = '"Times New Roman", Times, "Liberation Serif", serif';
    el("div", "", sc, { font: `italic ${U * 4.2}px ${serif}`, color: "#0000EE", textDecoration: "underline", marginBottom: `${U * 3}px` }, "Welcome to my Homepage!!");
    const holder = el("div", "", sc, { position: "relative" });
    const word = el("div", "", holder, { font: `bold 100px ${serif}`, color: C.ink }, "OUTDATED.");
    const size = fitText(word, W * 0.84, H * 0.22);
    // Glitch copies
    const copies = [C.red, "#00C8FF"].map((col) =>
      el("div", "abs", holder, { inset: 0, font: `bold ${size}px ${serif}`, color: col, whiteSpace: "nowrap", mixBlendMode: "multiply", opacity: 0 }, "OUTDATED.")
    );
    const stripes = el("div", "", sc, {
      width: `${W * 0.82}px`, height: `${U * 5}px`, marginTop: `${U * 4}px`,
      background: "repeating-linear-gradient(-45deg, #FFD400 0 24px, #111 24px 48px)", transformOrigin: "left", transform: "scaleX(0)",
    });
    el("div", "", sc, { font: `${U * 3.4}px ${serif}`, color: "#222", marginTop: `${U * 3}px` }, "Under construction &middot; You are visitor #000127");
    el("div", "", sc, { font: `${U * 2.6}px ${serif}`, color: "#555", marginTop: `${U * 1}px` }, "Best viewed in Internet Explorer 6 at 800&times;600");
    tl.to(stripes, { scaleX: 1, duration: 0.5, ease: "steps(6)" }, 5.6);
    const g = { p: 0 };
    tl.to(g, {
      p: 1, duration: 0.6, ease: "none",
      onUpdate: () => {
        const step = Math.floor(g.p * 14);
        const on = g.p > 0 && g.p < 1;
        copies.forEach((c, k) => {
          c.style.opacity = on ? 0.9 : 0;
          const top = rand(step, k + 1) * 80;
          c.style.clipPath = `inset(${top}% 0 ${Math.max(0, 100 - top - 18 - rand(step, k + 5) * 20)}% 0)`;
          c.style.transform = `translateX(${(rand(step, k + 9) - 0.5) * U * 9}px)`;
        });
        word.style.transform = on ? `translateX(${(rand(step, 21) - 0.5) * U * 3}px)` : "none";
      },
    }, 6.9);
  }
  {
    // 2c. INVISIBLE ON PHONES. (7.5-10)
    const sc = scene(C.ink);
    show(sc, 7.5, 10);
    const pw = pick(U * 36, U * 30, U * 26);
    const phone = el("div", "", sc, {
      width: `${pw}px`, height: `${pw * 2.05}px`, border: `${U * 1.1}px solid ${C.white}`, borderRadius: `${pw * 0.16}px`,
      position: "relative", overflow: "hidden", background: "#24140F",
    });
    el("div", "abs", phone, { top: `${U * 1.2}px`, left: "50%", width: "30%", height: `${U * 1.6}px`, transform: "translateX(-50%)", borderRadius: "999px", background: C.white });
    const text = el("div", "line abs", phone, { left: 0, top: "38%", fontWeight: 900, color: C.white, fontSize: `${pw * 0.5}px`, fontStretch: "100%" }, "INVISIBLE ON PHONES.");
    const cap = mono(sc, "Pinch. Zoom. Give up.", U * 3.2, "#C9AFA5", { marginTop: `${U * 5}px` });
    gsap.set(cap, { opacity: 0 });
    tl.fromTo(text, { x: pw * 0.15 }, { x: -text.offsetWidth + pw * 0.85, duration: 1.4, ease: "power1.inOut", immediateRender: false }, 7.5);
    tl.to(cap, { opacity: 1, duration: 0.3 }, 7.9);
    tl.to(cap, { opacity: 0, duration: 0.2 }, 8.8);
    tl.to(phone, { scale: 0.05, rotation: 25, borderRadius: "50%", duration: 0.7, ease: "power3.in" }, 8.9);
    const dot = el("div", "abs", sc, { width: `${U * 4}px`, height: `${U * 4}px`, borderRadius: "50%", background: C.orange, boxShadow: `0 0 ${U * 6}px ${C.orange}`, opacity: 0 });
    tl.to(dot, { opacity: 1, duration: 0.1 }, 9.55);
    tl.to(dot, { scale: 2.6, duration: 0.45, ease: "power2.in" }, 9.55);
  }

  /* 3. Reveal: BILLD (10-14) ------------------------------------------------ */
  {
    const sc = scene(C.ink);
    show(sc, 10, 14);
    const diag = Math.hypot(W, H);
    const flood = (col) => el("div", "abs", sc, { width: `${diag}px`, height: `${diag}px`, borderRadius: "50%", background: col, transform: "scale(0)" });
    const o = flood(C.orange);
    const w = flood(C.ink);
    tl.to(o, { scale: 1, duration: 0.4 }, 10.0);
    tl.to(w, { scale: 1, duration: 0.5 }, 10.18);
    const col = el("div", "stack", sc, { position: "relative", gap: `${U * 3}px` });
    const meet = mono(col, "Meet", U * 3.4, C.white);
    const L = logo(col, pick(W * 0.78, W * 0.66, W * 0.44), C.white);
    const tag = el("div", "", col, { display: "flex", flexDirection: PORTRAIT ? "column" : "row", alignItems: "center", gap: `${PORTRAIT ? U * 0.6 : U * 2.4}px`, fontWeight: 800, fontSize: `${pick(U * 8, U * 6.4, U * 6)}px`, color: C.white, lineHeight: 1 });
    const tags = ["Fast.", "Affordable.", "Built to sell."].map((t, i) => el("span", "word", tag, { color: i === 2 ? C.orange : C.white }, t));
    const by = mono(col, "Websites by Bill", U * 2.8, C.orange);
    gsap.set([meet, by, ...tags], { opacity: 0, y: U * 3 });
    gsap.set([L.B, L.I, L.D], { opacity: 0, y: -U * 30 });
    gsap.set([L.L1, L.L2], { scaleY: 0, transformOrigin: "50% 100%" });
    tl.to(meet, { opacity: 1, y: 0, duration: 0.4 }, 10.25);
    [L.B, L.I, L.D].forEach((p, i) => tl.to(p, { opacity: 1, y: 0, duration: 0.55, ease: "back.out(2.2)" }, 10.5 + i * 0.12));
    tl.to(L.L1, { scaleY: 1, duration: 0.5, ease: "back.out(3)" }, 11.0);
    tl.to(L.L2, { scaleY: 1, duration: 0.6, ease: "back.out(3)" }, 11.25);
    tags.forEach((t, i) => tl.to(t, { opacity: 1, y: 0, duration: 0.4 }, 12.0 + i * 0.5));
    tl.to(by, { opacity: 1, y: 0, duration: 0.4 }, 13.2);
    // Fly through the red bar into the next scene.
    tl.to([meet, tag, by], { opacity: 0, duration: 0.2 }, 13.55);
    tl.to(L.wrap, { scale: 70, transformOrigin: "63.2% 52%", duration: 0.45, ease: "power4.in" }, 13.55);
  }

  /* 4. Promises (14-26) ----------------------------------------------------- */
  const promise = (bg, n, from, to) => {
    const sc = scene(bg);
    show(sc, from, to);
    const tagEl = mono(sc, `${n} / 4`, U * 3, "currentColor", { position: "absolute", top: `${U * 7}px`, left: `${U * 7}px`, opacity: 0.7 });
    return { sc, tagEl };
  };

  {
    // FAST (14-17)
    const { sc, tagEl } = promise(C.red, 1, 14, 17);
    sc.style.color = C.white;
    for (let i = 0; i < 16; i++) {
      const line = el("div", "abs", sc, {
        left: 0, top: `${rand(i, 2) * 100}%`, height: `${U * (0.3 + rand(i, 4) * 0.9)}px`, width: `${W * (0.2 + rand(i, 6) * 0.5)}px`,
        background: C.white, opacity: 0.25 + rand(i, 8) * 0.5, transform: `translateX(-${W}px)`,
      });
      tl.to(line, { x: W * 2.2, duration: 0.45 + rand(i, 9) * 0.3, ease: "none" }, 13.95 + rand(i, 11) * 0.5);
      tl.to(line, { x: W * 2.2, duration: 0.4 + rand(i, 12) * 0.3, ease: "none", startAt: { x: -W } }, 16.45 + rand(i, 13) * 0.3);
    }
    const word = el("div", "line", sc, { fontWeight: 900, fontStretch: "125%", color: C.white, position: "relative" }, "FAST");
    fitText(word, W * 0.84, H * 0.3);
    const sub = el("div", "", sc, { fontWeight: 700, fontSize: `${pick(U * 6, U * 5.2, U * 4.6)}px`, marginTop: `${U * 4}px`, textAlign: "center", lineHeight: 1.1, maxWidth: `${W * 0.8}px` }, "Launch in weeks, not months.");
    const subChars = chars(sub);
    gsap.set(word, { x: -W * 1.3, skewX: -14, scaleX: 1.8 });
    gsap.set(subChars, { opacity: 0 });
    gsap.set(tagEl, { opacity: 0 });
    tl.to(tagEl, { opacity: 0.7, duration: 0.3 }, 14.1);
    tl.to(word, { x: 0, scaleX: 1, duration: 0.45 }, 14.0);
    tl.to(word, { skewX: -8, duration: 0.6, ease: "elastic.out(1, 0.4)" }, 14.35);
    tl.to(subChars, { opacity: 1, duration: 0.01, stagger: 0.03, ease: "none" }, 14.6);
    tl.to([word, sub], { x: W * 1.4, scaleX: 1.6, duration: 0.3, ease: "power3.in" }, 16.65);
  }
  {
    // AFFORDABLE (17-20)
    const { sc, tagEl } = promise(C.white, 2, 17, 20);
    sc.style.color = C.ink;
    const word = el("div", "line", sc, { fontWeight: 900, fontStretch: "72%", color: C.ink }, "AFFORDABLE");
    fitText(word, W * 0.88, H * 0.22);
    const cs = chars(word);
    const tagWrap = el("div", "", sc, { position: "relative", marginTop: `${U * 7}px`, transformOrigin: "50% -60%" });
    el("div", "abs", tagWrap, { left: "50%", bottom: "100%", width: "2px", height: `${U * 6}px`, background: C.ink });
    const price = el("div", "", tagWrap, {
      position: "relative", padding: `${U * 2.6}px ${U * 5}px ${U * 2.6}px ${U * 8}px`, background: C.orange, color: C.ink,
      fontWeight: 900, fontStretch: "90%", fontSize: `${pick(U * 6.2, U * 5.4, U * 4.8)}px`, lineHeight: 1,
      clipPath: `polygon(${U * 4}px 0, 100% 0, 100% 100%, ${U * 4}px 100%, 0 50%)`, textTransform: "uppercase", whiteSpace: "nowrap",
    }, "Small-business price");
    el("div", "abs", price, { left: `${U * 3.4}px`, top: "50%", width: `${U * 1.6}px`, height: `${U * 1.6}px`, borderRadius: "50%", background: C.white, transform: "translateY(-50%)" });
    const sub = el("div", "", sc, { fontWeight: 700, fontSize: `${pick(U * 5.4, U * 4.8, U * 4.2)}px`, marginTop: `${U * 6}px` }, "Big-agency quality.");
    gsap.set(cs, { y: -H * 0.25, opacity: 0 });
    gsap.set(tagWrap, { rotation: -38, opacity: 0 });
    gsap.set([sub, tagEl], { opacity: 0, y: U * 3 });
    tl.to(tagEl, { opacity: 0.7, y: 0, duration: 0.3 }, 17.05);
    tl.to(cs, { y: 0, opacity: 1, duration: 0.5, ease: "back.out(2)", stagger: 0.035 }, 17.0);
    tl.to(tagWrap, { opacity: 1, duration: 0.1 }, 17.5);
    tl.to(tagWrap, { rotation: 0, duration: 1.4, ease: "elastic.out(1, 0.3)" }, 17.5);
    tl.to(sub, { opacity: 1, y: 0, duration: 0.4 }, 18.5);
    tl.to([word, tagWrap, sub], { y: -H * 0.12, opacity: 0, duration: 0.3, ease: "power3.in", stagger: 0.04 }, 19.6);
  }
  {
    // QUALITY (20-23)
    const { sc, tagEl } = promise(C.ink, 3, 20, 23);
    sc.style.color = C.white;
    const grid = el("div", "abs", sc, { inset: 0 });
    const cols = 8, rows = Math.round(8 * (H / W));
    const gridLines = [];
    for (let i = 1; i < cols; i++) gridLines.push(el("div", "abs", grid, { left: `${(i / cols) * 100}%`, top: 0, bottom: 0, width: "1px", background: "rgba(255,255,255,0.09)", transformOrigin: "top", transform: "scaleY(0)" }));
    for (let i = 1; i < rows; i++) gridLines.push(el("div", "abs", grid, { top: `${(i / rows) * 100}%`, left: 0, right: 0, height: "1px", background: "rgba(255,255,255,0.09)", transformOrigin: "left", transform: "scaleX(0)" }));
    tl.to(gridLines, { scaleX: 1, scaleY: 1, duration: 0.5, ease: "power2.out", stagger: 0.015 }, 20.0);

    const holder = el("div", "", sc, { position: "relative" });
    const word = el("div", "line", holder, { fontWeight: 900, fontStretch: "100%", color: C.white }, "QUALITY");
    fitText(word, W * 0.8, H * 0.24);
    const cs = chars(word);
    const guide = (style, origin) => el("div", "abs", holder, { background: C.red, transformOrigin: origin, ...style });
    const ext = U * 6;
    const guides = [
      guide({ left: `-${ext}px`, right: `-${ext}px`, top: "4%", height: "2px", transform: "scaleX(0)" }, "left"),
      guide({ left: `-${ext}px`, right: `-${ext}px`, bottom: "6%", height: "2px", transform: "scaleX(0)" }, "right"),
      guide({ top: `-${ext}px`, bottom: `-${ext}px`, left: "0", width: "2px", transform: "scaleY(0)" }, "top"),
      guide({ top: `-${ext}px`, bottom: `-${ext}px`, right: "0", width: "2px", transform: "scaleY(0)" }, "bottom"),
    ];
    const tick = mono(holder, "x 0 · y 0", U * 2.4, C.red, { position: "absolute", left: 0, top: `-${U * 5}px`, opacity: 0 });
    const sub = el("div", "", sc, { fontWeight: 700, fontSize: `${pick(U * 5.4, U * 4.8, U * 4.2)}px`, marginTop: `${U * 8}px`, color: C.white }, "Designed down to the pixel.");
    cs.forEach((c, i) => gsap.set(c, { x: (rand(i, 31) - 0.5) * U * 8, y: (rand(i, 37) - 0.5) * U * 10, rotation: (rand(i, 41) - 0.5) * 16, opacity: 0 }));
    gsap.set([sub, tagEl], { opacity: 0, y: U * 3 });
    tl.to(tagEl, { opacity: 0.7, y: 0, duration: 0.3 }, 20.05);
    tl.to(cs, { opacity: 1, duration: 0.2, stagger: 0.03 }, 20.05);
    tl.to(guides, { scaleX: 1, scaleY: 1, duration: 0.3, ease: "power3.out", stagger: 0.06 }, 20.3);
    tl.to(cs, { x: 0, y: 0, rotation: 0, duration: 0.3, ease: "back.out(3)", stagger: 0.015 }, 20.55); // snap
    tl.to(tick, { opacity: 1, duration: 0.2 }, 20.7);
    tl.to(sub, { opacity: 1, y: 0, duration: 0.4 }, 21.0);
    tl.to([...guides, tick, sub, holder], { opacity: 0, duration: 0.25, ease: "power2.in" }, 22.7);
  }
  {
    // RESULTS (23-26)
    const { sc, tagEl } = promise(C.orange, 4, 23, 26);
    sc.style.color = C.ink;
    const word = el("div", "line", sc, { fontWeight: 900, fontStretch: "95%", color: C.ink }, "RESULTS");
    fitText(word, W * 0.84, H * 0.22);
    const chartW = pick(W * 0.72, W * 0.6, W * 0.42);
    const chartH = pick(H * 0.3, H * 0.3, H * 0.34);
    const chart = el("div", "", sc, { position: "relative", width: `${chartW}px`, height: `${chartH}px`, marginTop: `${U * 5}px`, borderBottom: `${U * 0.8}px solid ${C.ink}` });
    const bars = [0.3, 0.55, 0.92].map((h, i) =>
      el("div", "abs", chart, { bottom: 0, left: `${8 + i * 31}%`, width: "22%", height: `${h * 100}%`, background: i === 2 ? C.white : C.ink, transformOrigin: "bottom", transform: "scaleY(0)" })
    );
    // Arrow line drawn in real pixels so its length (and the draw-on) is exact.
    const pts = [[0.02, 0.86], [0.3, 0.62], [0.52, 0.7], [0.92, 0.1]].map(([x, y]) => `${(x * chartW).toFixed(1)},${(y * chartH).toFixed(1)}`).join(" ");
    chart.insertAdjacentHTML("beforeend", `<svg class="abs" viewBox="0 0 ${chartW} ${chartH}" style="inset:0;width:100%;height:100%;overflow:visible">
      <polyline points="${pts}" fill="none" stroke="${C.white}" stroke-width="${U * 1.1}" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
    const poly = chart.querySelector("polyline");
    const len = poly.getTotalLength() + U * 2;
    gsap.set(poly, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
    tl.set(poly, { opacity: 1 }, 23.7);
    const sub = el("div", "", sc, { fontWeight: 700, fontSize: `${pick(U * 5.4, U * 4.8, U * 4.2)}px`, marginTop: `${U * 5}px`, textAlign: "center", maxWidth: `${W * 0.86}px` }, "Websites built to bring in customers.");
    gsap.set(word, { scale: 0.6, opacity: 0 });
    gsap.set([sub, tagEl], { opacity: 0, y: U * 3 });
    tl.to(tagEl, { opacity: 0.7, y: 0, duration: 0.3 }, 23.05);
    tl.to(word, { scale: 1, opacity: 1, duration: 0.4 }, 23.0);
    bars.forEach((b, i) => tl.to(b, { scaleY: 1, duration: 0.5, ease: "back.out(2)" }, 23.2 + i * 0.22));
    tl.to(poly, { strokeDashoffset: 0, duration: 0.7, ease: "power2.inOut" }, 23.7);
    tl.to(sub, { opacity: 1, y: 0, duration: 0.4 }, 24.4);
    tl.to(sc.children, { y: -H * 0.08, opacity: 0, duration: 0.3, ease: "power3.in", stagger: 0.03 }, 25.6);
  }

  /* 5. Process: a browser builds a site (26-34) ------------------------------ */
  {
    const sc = scene(C.white);
    show(sc, 26, 34);
    const steps = el("div", "", sc, { display: "flex", gap: `${U * 2}px`, marginBottom: `${U * 4}px` });
    const stepEls = ["1 Design", "2 Build", "3 Launch"].map((s) =>
      el("div", "mono", steps, { fontSize: `${U * 2.8}px`, padding: `${U * 1.2}px ${U * 2.6}px`, border: `2px solid ${C.ink}`, borderRadius: "999px", color: C.ink, textTransform: "uppercase", letterSpacing: "0.08em" }, s)
    );
    const bw = pick(W * 0.88, W * 0.84, W * 0.6);
    const bh = pick(H * 0.52, H * 0.6, H * 0.66);
    const browser = el("div", "", sc, { position: "relative", width: `${bw}px`, height: `${bh}px`, border: `${U * 0.6}px solid ${C.ink}`, borderRadius: `${U * 2.4}px`, overflow: "hidden", background: C.cream });
    const top = el("div", "", browser, { height: `${U * 5.4}px`, background: C.ink, display: "flex", alignItems: "center", gap: `${U * 1.2}px`, padding: `0 ${U * 2}px` });
    [C.red, C.orange, C.white].forEach((col) => el("i", "", top, { width: `${U * 1.6}px`, height: `${U * 1.6}px`, borderRadius: "50%", background: col }));
    el("div", "mono", top, { marginLeft: `${U * 2}px`, flex: 1, background: "#2E1C17", color: "#C9AFA5", borderRadius: "999px", fontSize: `${U * 2}px`, padding: `${U * 0.6}px ${U * 2}px` }, "yourbusiness.com");
    const area = el("div", "abs", browser, { left: 0, right: 0, bottom: 0, top: `${U * 5.4}px` });
    const blk = (l, t, w, h, extra = {}) => el("div", "abs", area, { left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, background: C.wire, borderRadius: `${U * 1}px`, overflow: "hidden", ...extra });
    const nav = blk(5, 4, 90, 7);
    const hero = blk(5, 15, 90, 40);
    const h1 = blk(10, 21, 56, 7, { background: "#E2D4CC" });
    const h2 = blk(10, 31, 40, 7, { background: "#E2D4CC" });
    const btn = blk(10, 42, 24, 8, { borderRadius: "999px", background: "#D8C6BC" });
    const cards = [5, 36, 67].map((l) => blk(l, 60, 28, 34));
    const order = [nav, hero, h1, h2, btn, ...cards];
    gsap.set(order, { y: -U * 8, opacity: 0 });
    const drops = [26.5, 27.0, 27.5, 27.75, 28.0, 28.5, 28.75, 29.0];
    order.forEach((b, i) => tl.to(b, { y: 0, opacity: 1, duration: 0.4, ease: "back.out(2)" }, drops[i]));
    // Build: colour and real content replace the wireframe.
    const overlay = (b, bg, html = "", style = {}) => el("div", "abs", b, { inset: 0, background: bg, opacity: 0, display: "flex", alignItems: "center", justifyContent: "center", ...style }, html);
    const fills = [
      overlay(nav, C.ink, `<span style="font-weight:900;color:#fff;font-size:${U * 2.6}px">yourbrand</span>`, { justifyContent: "flex-start", paddingLeft: `${U * 2}px` }),
      overlay(hero, `linear-gradient(120deg, ${C.red}, ${C.orange})`),
      overlay(h1, C.red, `<span style="font-weight:900;color:#fff;font-size:${U * 3.6}px;line-height:1;white-space:nowrap">Your business,</span>`, { justifyContent: "flex-start", background: "transparent" }),
      overlay(h2, C.red, `<span style="font-weight:900;color:#fff;font-size:${U * 3.6}px;line-height:1;white-space:nowrap">online.</span>`, { justifyContent: "flex-start", background: "transparent" }),
      overlay(btn, C.ink, `<span style="font-weight:800;color:#fff;font-size:${U * 2.4}px">Book now</span>`),
      ...cards.map((c, i) => overlay(c, [C.ink, C.red, C.orange][i])),
    ];
    tl.to(fills, { opacity: 1, duration: 0.35, ease: "power2.out", stagger: 0.12 }, 29.6);
    tl.to([h1, h2], { backgroundColor: "rgba(0,0,0,0)", duration: 0.3 }, 29.72);
    // Launch: cursor clicks the button, site goes live.
    const cursor = el("div", "abs", area, { width: `${U * 5}px`, height: `${U * 5}px`, left: "92%", top: "96%", zIndex: 5 });
    cursor.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M4 2l15 11-7 1-3 7z" fill="${C.ink}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    tl.to(cursor, { left: "20%", top: "46%", duration: 0.6, ease: "power3.inOut" }, 31.3);
    tl.to(btn, { scale: 0.9, duration: 0.08, ease: "power2.in" }, 31.95);
    tl.to(btn, { scale: 1, duration: 0.4, ease: "back.out(3)" }, 32.03);
    const ring = el("div", "abs", area, { left: "22%", top: "46%", width: `${U * 4}px`, height: `${U * 4}px`, marginLeft: `-${U * 2}px`, marginTop: `-${U * 2}px`, borderRadius: "50%", border: `${U * 0.6}px solid ${C.orange}`, opacity: 0 });
    tl.fromTo(ring, { scale: 0.3, opacity: 1 }, { scale: 5, opacity: 0, duration: 0.6, ease: "power2.out", immediateRender: false }, 32.0);
    for (let i = 0; i < 14; i++) {
      const p = el("div", "abs", area, { left: "22%", top: "46%", width: `${U * 1.4}px`, height: `${U * 1.4}px`, background: [C.red, C.orange, C.ink][i % 3], opacity: 0, borderRadius: i % 2 ? "50%" : "2px" });
      const a = (i / 14) * Math.PI * 2;
      tl.fromTo(p, { x: 0, y: 0, opacity: 1, rotation: 0 }, { x: Math.cos(a) * U * (12 + rand(i, 51) * 10), y: Math.sin(a) * U * (12 + rand(i, 52) * 10) + U * 6, rotation: 200, opacity: 0, duration: 0.8, ease: "power2.out", immediateRender: false }, 32.02);
    }
    const live = el("div", "abs", browser, { right: `${U * 2}px`, top: `${U * 7.4}px`, background: C.red, color: C.white, borderRadius: "999px", padding: `${U * 1}px ${U * 2.4}px`, fontWeight: 900, fontSize: `${U * 3}px`, display: "flex", alignItems: "center", gap: `${U * 1}px`, zIndex: 6 });
    live.innerHTML = `<i style="width:${U * 1.4}px;height:${U * 1.4}px;border-radius:50%;background:#fff;display:inline-block"></i>LIVE`;
    gsap.set(live, { scale: 0, opacity: 0 });
    tl.to(live, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(3)" }, 32.2);
    tl.to(live.firstChild, { opacity: 0.2, duration: 0.25, repeat: 5, yoyo: true, ease: "none" }, 32.7);
    // Step pills light up in order.
    const lit = (s, at) => tl.to(s, { backgroundColor: C.red, borderColor: C.red, color: C.white, duration: 0.2 }, at);
    lit(stepEls[0], 26.0);
    lit(stepEls[1], 29.5);
    lit(stepEls[2], 31.5);
    gsap.set([steps, browser], { opacity: 0, y: U * 6 });
    tl.to([steps, browser], { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }, 26.0);
    tl.to([steps, browser], { y: -H * 0.08, opacity: 0, duration: 0.3, ease: "power3.in", stagger: 0.05 }, 33.65);
  }

  /* 6. Recent work (34-42) ----------------------------------------------------- */
  {
    const sc = scene(C.ink);
    show(sc, 34, 42);
    const title = el("div", "line", sc, { fontWeight: 900, fontStretch: "110%", color: C.white, position: "absolute", top: `${pick(H * 0.08, H * 0.07, H * 0.07)}px` }, "RECENT WORK");
    fitText(title, W * pick(0.8, 0.7, 0.42), U * 14);
    const tcs = chars(title);
    gsap.set(tcs, { y: U * 10, opacity: 0 });
    tl.to(tcs, { y: 0, opacity: 1, duration: 0.4, stagger: 0.03 }, 34.0);

    const frame = (parent, w, imgs, { phone = false } = {}) => {
      const h = phone ? w * 2.16 : w * pick(1.02, 0.78, 1 / 1.6) + U * 4;
      const f = el("div", "abs", parent, { width: `${w}px`, height: `${h}px`, borderRadius: `${phone ? w * 0.14 : U * 1.8}px`, overflow: "hidden", background: C.white, border: phone ? `${U * 1}px solid #2E1C17` : "none", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" });
      if (!phone) {
        const bar = el("div", "", f, { height: `${U * 4}px`, background: "#EFE6E1", display: "flex", alignItems: "center", gap: `${U * 0.9}px`, padding: `0 ${U * 1.6}px` });
        [C.red, C.orange, "#CFC2BB"].forEach((col) => el("i", "", bar, { width: `${U * 1.2}px`, height: `${U * 1.2}px`, borderRadius: "50%", background: col }));
      }
      const strip = el("div", "", f, {});
      imgs.forEach((src) => el("img", "", strip, { display: "block", width: "100%" }).setAttribute("src", src));
      return { f, strip, h };
    };

    const caption = (name, what) => {
      const c = el("div", "abs", sc, { bottom: `${pick(H * 0.1, H * 0.07, H * 0.07)}px`, left: 0, right: 0, textAlign: "center" });
      el("div", "", c, { fontWeight: 900, fontSize: `${pick(U * 6.4, U * 5.4, U * 4.6)}px`, color: C.white, lineHeight: 1.05 }, name);
      mono(c, what, U * 2.6, C.orange, { marginTop: `${U * 1.6}px` });
      gsap.set(c, { opacity: 0, y: U * 3 });
      return c;
    };

    // Project 1: Sunday Oven Bakery
    const fw = pick(W * 0.88, W * 0.84, W * 0.5);
    const p1 = frame(sc, fw, ["assets/work-bakery.jpg", "assets/work-bakery-menu.jpg"]);
    gsap.set(p1.f, { left: (W - fw) / 2, top: (H - p1.h) / 2 + pick(0, U * 1, -U * 1) });
    const c1 = caption("Sunday Oven Bakery", "Bakery website · menu · cake orders");
    gsap.set(p1.f, { y: H * 0.5, opacity: 0, rotation: 4 });
    tl.to(p1.f, { y: 0, opacity: 1, rotation: 0, duration: 0.7 }, 34.5);
    tl.to(c1, { opacity: 1, y: 0, duration: 0.4 }, 35.0);
    tl.to(p1.strip, { y: -(p1.strip.offsetHeight - (p1.h - U * 4)), duration: 1.6, ease: "power2.inOut" }, 35.7);
    tl.to([p1.f, c1], { x: -W * 0.7, opacity: 0, duration: 0.35, ease: "power3.in" }, 37.6);

    // Project 2: Copper & Bean (desktop + phone)
    const dw = pick(W * 0.84, W * 0.78, W * 0.46);
    const p2 = frame(sc, dw, ["assets/work-cb.jpg", "assets/work-cb-products.jpg"]);
    const dTop = (H - p2.h) / 2 - pick(H * 0.06, U * 2, U * 2);
    gsap.set(p2.f, { left: (W - dw) / 2 - pick(W * 0.03, W * 0.04, W * 0.06), top: dTop });
    const phw = pick(W * 0.3, W * 0.24, W * 0.14);
    const p3 = frame(sc, phw, ["assets/work-cb-mobile.jpg"], { phone: true });
    gsap.set(p3.f, { left: (W + dw) / 2 - phw * 0.62, top: dTop + p2.h - p3.h * pick(0.62, 0.7, 0.86) });
    const c2 = caption("Copper & Bean", "Coffee shop · subscriptions · bookings");
    gsap.set(p2.f, { x: W, opacity: 0 });
    gsap.set(p3.f, { y: H * 0.5, rotation: 10, opacity: 0 });
    tl.to(p2.f, { x: 0, opacity: 1, duration: 0.7 }, 38.0);
    tl.to(p3.f, { y: 0, rotation: -4, opacity: 1, duration: 0.8, ease: "back.out(1.6)" }, 38.4);
    tl.to(c2, { opacity: 1, y: 0, duration: 0.4 }, 38.8);
    tl.to(p3.f, { y: -U * 3, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: 1 }, 39.4);
    tl.to(p2.strip, { y: -(p2.strip.offsetHeight - (p2.h - U * 4)), duration: 1.8, ease: "power2.inOut" }, 39.2);
    tl.to([p2.f, p3.f, c2, title], { y: -H * 0.08, opacity: 0, duration: 0.3, ease: "power3.in", stagger: 0.04 }, 41.6);
  }

  /* 7. Industries (42-48) ----------------------------------------------------- */
  {
    const sc = scene(C.red);
    show(sc, 42, 48);
    const head = el("div", "line abs", sc, { fontWeight: 900, fontStretch: "120%", color: C.white, top: `${pick(H * 0.16, H * 0.12, H * 0.12)}px` }, "WE BUILD FOR");
    fitText(head, W * pick(0.8, 0.74, 0.5), U * 14);
    gsap.set(head, { scale: 1.6, opacity: 0 });
    tl.to(head, { scale: 1, opacity: 1, duration: 0.35 }, 42.0);
    const list = [
      "Retail", "Faith & Community", "Real Estate", "Professional Services", "Nonprofits & NGOs", "News Publishers",
      "Media", "Manufacturing", "IT", "Hospitality", "Healthcare", "Finance", "Engineering", "Education",
      "E-commerce", "Creative & Marketing", "Construction", "Architecture & Interiors", "Agriculture",
    ];
    const count = mono(sc, "", U * 2.8, "rgba(255,255,255,0.8)", { position: "absolute", bottom: `${pick(H * 0.16, H * 0.12, H * 0.12)}px` });
    const size = pick(U * 13, U * 11, U * 9.5);
    const words = list.map((t, i) => {
      const w = el("div", "abs", sc, {
        width: `${W * 0.88}px`, left: `${W * 0.06}px`, top: "50%", transform: "translateY(-50%)",
        textAlign: "center", fontWeight: 900, fontStretch: "88%", fontSize: `${size}px`, lineHeight: 0.92,
        textTransform: "uppercase", color: i % 2 ? C.ink : C.white, textWrap: "balance", visibility: "hidden",
      }, t);
      // Shrink until the longest single word fits the width and the block fits the height.
      const longest = t.split(" ").sort((x, y) => y.length - x.length)[0];
      const probe = el("span", "", w, { whiteSpace: "nowrap", position: "absolute", visibility: "hidden" }, longest);
      let fs = size;
      for (let k = 0; k < 20 && (probe.offsetWidth > W * 0.78 || w.offsetHeight > H * 0.4); k++) {
        fs *= 0.94;
        w.style.fontSize = `${fs}px`;
      }
      probe.remove();
      return w;
    });
    words.forEach((w, i) => {
      const at = 42.25 + i * 0.25;
      tl.set(w, { visibility: "visible" }, at);
      tl.fromTo(w, { scale: 1.1 }, { scale: 1, duration: 0.2, ease: "power3.out", immediateRender: false }, at);
      tl.set(w, { visibility: "hidden" }, at + 0.25);
      tl.call(() => (count.textContent = `${String(i + 1).padStart(2, "0")} / 19`), null, at);
    });
    tl.call(() => (count.textContent = ""), null, 42.0);
    // 47: everything stops for "YOU."
    tl.set(sc, { backgroundColor: C.white }, 47.0);
    tl.set([head, count], { visibility: "hidden" }, 47.0);
    const you = el("div", "line abs", sc, { fontWeight: 900, fontStretch: "125%", color: C.red, visibility: "hidden" }, "YOU.");
    fitText(you, W * 0.74, H * 0.4);
    tl.set(you, { visibility: "visible" }, 47.0);
    tl.fromTo(you, { scale: 1.5 }, { scale: 1, duration: 0.35, immediateRender: false }, 47.0);
    tl.to(you, { scale: 0.94, duration: 0.6, ease: "sine.in" }, 47.4);
  }

  /* 8. Call to action (48-56) ------------------------------------------------- */
  {
    const sc = scene(C.ink);
    show(sc, 48, DUR + 1);
    const col = el("div", "stack", sc, { gap: `${pick(U * 4.5, U * 3.2, U * 3)}px` });
    const big = stack(col, PORTRAIT ? [["LET'S"], ["BUILD"], ["YOURS."]] : [["LET'S", "BUILD", "YOURS."]], {
      width: pick(0.8, 0.84, 0.7), height: pick(0.3, 0.16, 0.2), color: C.white, colors: { "YOURS.": C.orange },
    });
    const L = logo(col, pick(W * 0.6, W * 0.46, W * 0.3), C.white);
    const tag = el("div", "", col, { fontWeight: 800, fontSize: `${pick(U * 5.2, U * 4.4, U * 4)}px`, color: C.white, lineHeight: 1 }, `Fast. Affordable. <span style="color:${C.orange}">Built to sell.</span>`);
    const card = el("div", "", col, {
      display: "flex", flexDirection: "column", alignItems: "center", gap: `${U * 1.6}px`, padding: `${U * 3.4}px ${U * 6}px`,
      border: `${U * 0.4}px solid ${C.orange}`, borderRadius: `${U * 3}px`, background: "#23140F",
    });
    const icons = el("div", "", card, { display: "flex", gap: `${U * 2}px` });
    const icon = (svg) => {
      const i = el("div", "", icons, { width: `${U * 8}px`, height: `${U * 8}px`, borderRadius: "50%", background: C.orange, display: "grid", placeItems: "center" });
      i.innerHTML = svg;
      return i;
    };
    const ic = [
      icon(`<svg viewBox="0 0 24 24" width="58%" height="58%"><path fill="${C.ink}" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.6.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.6.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`),
      icon(`<svg viewBox="0 0 24 24" width="52%" height="52%"><path fill="${C.ink}" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1Z"/></svg>`),
    ];
    const num = el("div", "", card, { fontWeight: 900, fontStretch: "100%", fontSize: `${pick(U * 9.6, U * 8, U * 7)}px`, color: C.white, lineHeight: 1, letterSpacing: "0.01em", whiteSpace: "nowrap" }, "055 724 4074");
    mono(card, "WhatsApp or call Bill", U * 2.8, C.orange);

    gsap.set(big.words, { opacity: 0, scale: 2.2 });
    big.words.forEach((w, i) => tl.to(w, { opacity: 1, scale: 1, duration: 0.3 }, 48.0 + i * 0.5));
    // Start with the headline alone in the middle, then make room.
    const offset = H / 2 - (big.box.offsetTop + big.box.offsetHeight / 2);
    gsap.set(big.box, { y: offset, scale: pick(1.25, 1.08, 1.15) });
    tl.to(big.box, { y: 0, scale: 1, duration: 0.7, ease: "power4.inOut" }, 49.6);
    gsap.set([L.B, L.I, L.D], { opacity: 0, y: U * 8 });
    gsap.set([L.L1, L.L2], { scaleY: 0, transformOrigin: "50% 100%" });
    gsap.set([tag, card], { opacity: 0, y: U * 5 });
    gsap.set(ic, { scale: 0 });
    tl.to([L.B, L.I, L.D], { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, 50.0);
    tl.to(L.L1, { scaleY: 1, duration: 0.5, ease: "back.out(3)" }, 50.25);
    tl.to(L.L2, { scaleY: 1, duration: 0.6, ease: "back.out(3)" }, 50.5);
    tl.to(tag, { opacity: 1, y: 0, duration: 0.5 }, 50.75);
    tl.to(card, { opacity: 1, y: 0, duration: 0.6 }, 51.0);
    tl.to(ic, { scale: 1, duration: 0.5, ease: "back.out(3)", stagger: 0.12 }, 51.3);
    tl.fromTo(num, { scale: 0.85 }, { scale: 1, duration: 0.5, ease: "back.out(2.5)", immediateRender: false }, 51.2);
    // The logo's bars pulse on the beat.
    for (let b = 52.0; b < 54; b += 0.5) {
      tl.to([L.L1, L.L2], { scaleY: 1.14, duration: 0.08, ease: "power2.out" }, b);
      tl.to([L.L1, L.L2], { scaleY: 1, duration: 0.35, ease: "power2.out" }, b + 0.08);
    }
    // Final hit at 54.
    const flash = el("div", "abs", sc, { inset: 0, background: C.orange, opacity: 0, mixBlendMode: "screen" });
    tl.fromTo(flash, { opacity: 0.35 }, { opacity: 0, duration: 0.6, ease: "power2.out", immediateRender: false }, 54.0);
    tl.fromTo(col, { scale: 1.04 }, { scale: 1, duration: 0.8, ease: "expo.out", immediateRender: false }, 54.0);
  }

  tl.set({}, {}, DUR); // pin the length

  /* Player / renderer ------------------------------------------------------------ */

  window.__duration = DUR;
  window.__format = { name: FMT, width: W, height: H };
  window.__seek = (t) => {
    tl.seek(t, false);
    return true;
  };
  window.__ready = true;
  tl.seek(0);

  if (RENDER) return;

  const audio = document.getElementById("track");
  const playBtn = document.getElementById("play");
  const scrub = document.getElementById("scrub");
  const clock = document.getElementById("clock");
  const fmtSel = document.getElementById("format");
  fmtSel.value = FMT;
  scrub.max = DUR;

  const fit = () => {
    const vp = document.querySelector(".viewport");
    const k = Math.min(vp.clientWidth / W, vp.clientHeight / H) * 0.96;
    stage.style.transform = `scale(${k})`;
  };
  addEventListener("resize", fit);
  fit();

  let playing = false;
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
    if (tl.time() >= DUR - 0.05) tl.seek(0);
    audio.currentTime = tl.time();
    try {
      await audio.play();
    } catch {
      /* no audio: run on the timeline clock instead */
    }
    setPlaying(true);
  });
  document.getElementById("restart").addEventListener("click", () => {
    tl.seek(0);
    audio.currentTime = 0;
  });
  scrub.addEventListener("input", () => {
    tl.seek(Number(scrub.value));
    audio.currentTime = Number(scrub.value);
  });
  fmtSel.addEventListener("change", () => {
    const url = new URL(location.href);
    url.searchParams.set("f", fmtSel.value);
    location.href = url;
  });
  let last = performance.now();
  gsap.ticker.add(() => {
    const now = performance.now();
    if (playing) {
      const t = !audio.paused && audio.readyState >= 2 ? audio.currentTime : tl.time() + (now - last) / 1000;
      tl.seek(Math.min(t, DUR));
      if (t >= DUR) {
        audio.pause();
        setPlaying(false);
      }
    }
    last = now;
    scrub.value = tl.time();
    clock.textContent = `${tl.time().toFixed(2)}s`;
  });
})();
