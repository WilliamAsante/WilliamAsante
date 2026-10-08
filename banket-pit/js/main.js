/* Banket Reef Mining v2: contour maps, photo and video slots, the RL readout,
   the haul road and truck, the shift board, counters, reveals and the form. */

(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  document.documentElement.classList.add("js");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const main = $("main");

  const toast = (() => {
    let el, t;
    return (msg) => {
      if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.append(el); }
      el.textContent = msg;
      el.classList.add("is-on");
      clearTimeout(t);
      t = setTimeout(() => el.classList.remove("is-on"), 2800);
    };
  })();

  /* Contour maps -------------------------------------------------------------
     Value noise + marching squares. Used for the hero (animated) and for each
     photo slot until its photo is added. */
  const makeNoise = (seed) => {
    const p = new Uint8Array(512);
    let s = seed || 1;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const perm = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    const fade = (t) => t * t * (3 - 2 * t);
    const h = (x, y, z) => p[p[p[x & 255] + (y & 255)] + (z & 255)] / 255;
    const n = (x, y, z) => {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
      const l = (a, b, t) => a + (b - a) * t;
      const x1 = l(h(xi, yi, zi), h(xi + 1, yi, zi), xf), x2 = l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), xf);
      const x3 = l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), xf), x4 = l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), xf);
      return l(l(x1, x2, yf), l(x3, x4, yf), zf);
    };
    return (x, y, z) => n(x, y, z) * 0.62 + n(x * 2.1, y * 2.1, z * 1.3) * 0.27 + n(x * 4.3, y * 4.3, z) * 0.11;
  };

  const drawTopo = (canvas, { seed = 3, t = 0, scale = 0.0042, levels = 14, cell = 9, bg = "#23262B", line = "rgba(236,230,218,0.22)", index = "rgba(255,179,0,0.55)" }, noise) => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const nf = noise || makeNoise(seed);
    const cols = Math.ceil(w / cell) + 1, rows = Math.ceil(h / cell) + 1;
    const v = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) v[j * cols + i] = nf(i * cell * scale + seed * 7.3, j * cell * scale, t);
    for (let k = 1; k < levels; k++) {
      const L = 0.18 + (k / levels) * 0.66;
      ctx.beginPath();
      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const a = v[j * cols + i], b = v[j * cols + i + 1], c = v[(j + 1) * cols + i + 1], d = v[(j + 1) * cols + i];
          const code = (a > L) | ((b > L) << 1) | ((c > L) << 2) | ((d > L) << 3);
          if (code === 0 || code === 15) continue;
          const x = i * cell, y = j * cell;
          const top = [x + cell * ((L - a) / (b - a)), y], right = [x + cell, y + cell * ((L - b) / (c - b))];
          const bot = [x + cell * ((L - d) / (c - d)), y + cell], left = [x, y + cell * ((L - a) / (d - a))];
          const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
          switch (code) {
            case 1: case 14: seg(left, top); break;
            case 2: case 13: seg(top, right); break;
            case 3: case 12: seg(left, right); break;
            case 4: case 11: seg(right, bot); break;
            case 6: case 9: seg(top, bot); break;
            case 7: case 8: seg(left, bot); break;
            case 5: seg(left, top); seg(right, bot); break;
            case 10: seg(top, right); seg(bot, left); break;
          }
        }
      }
      const isIndex = k % 5 === 0;
      ctx.strokeStyle = isIndex ? index : line;
      ctx.lineWidth = isIndex ? 1.6 : 1;
      ctx.stroke();
    }
  };

  /* Photo slots: swap in the downloaded Envato photo when it exists ---------- */
  const shots = $$("[data-shot]");
  const paintShots = () => shots.forEach((fig, i) => {
    if (fig.classList.contains("is-loaded")) return;
    drawTopo($("canvas", fig), { seed: 11 + i * 5, scale: 0.006, cell: 7, levels: 16 });
  });
  shots.forEach((fig) => {
    const img = $("img", fig);
    const probe = new Image();
    probe.onload = () => { img.src = probe.src; fig.classList.add("is-loaded"); };
    probe.src = img.dataset.src;
  });

  /* Hero: Envato aerial video if present, otherwise a living contour map ----- */
  const hero = $(".hero");
  const heroCanvas = $("[data-topo='hero']");
  const video = $("[data-video]");
  const heroNoise = makeNoise(42);
  const heroOpts = { seed: 2, scale: 0.0026, cell: 11, levels: 18, bg: "#0F1012", line: "rgba(236,230,218,0.13)", index: "rgba(255,179,0,0.42)" };
  let heroT = 0, heroRAF, heroVisible = true, last = 0;
  const heroLoop = (now) => {
    if (!heroVisible || hero.classList.contains("has-video")) return;
    if (now - last > 50) { heroT += 0.004; drawTopo(heroCanvas, { ...heroOpts, t: heroT }, heroNoise); last = now; }
    heroRAF = requestAnimationFrame(heroLoop);
  };
  video.addEventListener("loadeddata", () => {
    hero.classList.add("has-video");
    if (!reduced) video.play().catch(() => {});
  });
  if (!reduced) video.setAttribute("autoplay", "");
  video.load();
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => {
      heroVisible = en.isIntersecting;
      cancelAnimationFrame(heroRAF);
      if (heroVisible && !reduced) heroRAF = requestAnimationFrame(heroLoop);
    }).observe(hero);
  }
  const paintHero = () => drawTopo(heroCanvas, { ...heroOpts, t: heroT }, heroNoise);

  /* Header: solid bar, menu, current section ---------------------------------- */
  const bar = $("[data-bar]");
  const burger = $(".burger");
  const menu = $("#menu");
  const setMenu = (open) => { burger.setAttribute("aria-expanded", String(open)); menu.classList.toggle("is-open", open); };
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); burger.focus(); } });
  document.addEventListener("click", (e) => { if (!bar.contains(e.target)) setMenu(false); });
  const links = $$(".menu a");
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) links.forEach((a) => a.classList.toggle("is-current", a.getAttribute("href") === `#${en.target.id}`));
    }), { rootMargin: "-45% 0px -50% 0px" });
    $$("main > section[id]").forEach((s) => spy.observe(s));
  }

  /* RL readout: elevation falls as you descend, rises as you climb out -------- */
  const zones = $$("main > section[data-rl]");
  const rlEl = $("[data-rl]", bar), benchEl = $("[data-bench]", bar);
  let lastRL = null;
  const updateRL = () => {
    const probe = scrollY + innerHeight * 0.4;
    let i = zones.findIndex((z, k) => probe >= z.offsetTop && (k === zones.length - 1 || probe < zones[k + 1].offsetTop));
    if (i < 0) i = 0;
    const z = zones[i], next = zones[i + 1];
    const a = +z.dataset.rl, b = next ? +next.dataset.rl : a;
    // hold each bench's level, then ramp to the next one over the last third of the bench
    const f = next ? clamp(((probe - z.offsetTop) / (next.offsetTop - z.offsetTop) - 0.66) / 0.34, 0, 1) : 0;
    const rl = Math.round(a + (b - a) * f);
    if (rl !== lastRL) { rlEl.textContent = rl; lastRL = rl; }
    benchEl.textContent = z.dataset.bench;
  };

  /* Haul road + truck ---------------------------------------------------------- */
  const road = $("[data-road]");
  const roadLine = $(".road-line", road);
  const truck = $("[data-truck]");
  let roadLen = 0;
  const buildRoad = () => {
    if (getComputedStyle(road).display === "none") { roadLen = 0; return; }
    const W = main.clientWidth;
    const benches = $$(".bench", main);
    const faceH = benches[0] ? parseFloat(getComputedStyle(benches[0]).paddingTop) : 30;
    const margin = (sec) => $(".shelf", sec).offsetLeft;
    const b = benches[0] ? margin(benches[0]) : 40;
    const pts = [[b / 2, hero.offsetHeight - 40]];
    let side = "L", prevX = b / 2;
    benches.forEach((sec) => {
      const m = margin(sec), top = sec.offsetTop, bottom = top + sec.offsetHeight;
      if (sec.classList.contains("down")) {
        const x = m - b / 2;
        pts.push([prevX, top], [x, top + faceH], [x, bottom]);
        prevX = x;
      } else {
        const x = W - (m - b / 2);
        if (side === "L") { pts.push([prevX, top + faceH * 0.15], [W - (m + b / 2), top + faceH * 0.85]); side = "R"; prevX = W - (m + b / 2); }
        pts.push([prevX, top], [x, top + faceH], [x, bottom]);
        prevX = x;
      }
    });
    const surface = $(".surface");
    pts.push([prevX, surface.offsetTop], [W + 30, surface.offsetTop + 20]);
    road.setAttribute("viewBox", `0 0 ${W} ${main.scrollHeight}`);
    roadLine.setAttribute("d", "M" + pts.map((p) => p.map((n) => n.toFixed(1)).join(" ")).join("L"));
    roadLen = roadLine.getTotalLength();
  };
  const placeTruck = () => {
    if (!roadLen) return;
    const target = scrollY + innerHeight * 0.55;
    let lo = 0, hi = roadLen;
    for (let k = 0; k < 22; k++) { const mid = (lo + hi) / 2; if (roadLine.getPointAtLength(mid).y < target) lo = mid; else hi = mid; }
    const p = roadLine.getPointAtLength(lo);
    const q = roadLine.getPointAtLength(Math.min(roadLen, lo + 2)), o = roadLine.getPointAtLength(Math.max(0, lo - 2));
    const ang = (Math.atan2(q.y - o.y, q.x - o.x) * 180) / Math.PI + 90;
    truck.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
  };

  /* Shift board: split-flap letters -------------------------------------------- */
  const board = $("[data-board]");
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+";
  $$("[data-flap]", board).forEach((el) => {
    const text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    el.classList.add("flap");
    el.innerHTML = [...text].map((c) => `<span class="ch" aria-hidden="true" data-c="${c}">${c}</span>`).join("");
  });
  const flapBoard = () => {
    if (reduced) return;
    $$("li", board).forEach((li, row) => {
      $$(".ch", li).forEach((ch, i) => {
        const final = ch.dataset.c;
        let n = 5 + i * 2 + row * 2;
        ch.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        const tick = () => {
          ch.classList.remove("is-flip"); void ch.offsetWidth; ch.classList.add("is-flip");
          if (--n <= 0) { ch.textContent = final; return; }
          ch.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          setTimeout(tick, 55);
        };
        setTimeout(tick, row * 90);
      });
    });
  };

  /* Count-ups ------------------------------------------------------------------- */
  const fmt = (v, dec, pre) => pre + v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const countUp = (el) => {
    const end = +el.dataset.count, dec = +(el.dataset.dec || 0), pre = el.dataset.pre || "";
    if (reduced) { el.textContent = fmt(end, dec, pre); return; }
    const t0 = performance.now();
    const step = (t) => {
      const k = clamp((t - t0) / 1500, 0, 1);
      el.textContent = fmt(end * (1 - Math.pow(1 - k, 3)), dec, pre);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* Reveals --------------------------------------------------------------------- */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add("is-in");
      if (el.dataset.count) countUp(el);
      if (el === board) flapBoard();
      io.unobserve(el);
    }), { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
    const sel = ".tag, .big, .huge, .lead, .who-text > p:not(.lead), .chips, .shot, .pit, .quote, .meters li, .phases li, .green-stats li, .pledges li, .jobs li, .ledger div, .contact .form, .hotline";
    $$(sel).forEach((el) => {
      const sibs = [...el.parentElement.children];
      el.classList.add("reveal");
      el.style.setProperty("--d", `${Math.min(sibs.indexOf(el), 5) * 80}ms`);
      io.observe(el);
    });
    io.observe(board);
    $$(".meters").forEach((m) => io.observe(m));
    $$(".meters li").forEach((li, i) => li.style.setProperty("--d", `${i * 120}ms`));
    $$("[data-count]").forEach((el) => { el.textContent = fmt(0, +(el.dataset.dec || 0), el.dataset.pre || ""); io.observe(el); });
  }

  /* Careers + contact form ------------------------------------------------------- */
  const form = $("[data-form]");
  const err = $("[data-error]");
  $$("[data-topic]").forEach((a) => a.addEventListener("click", () => {
    const radio = $(`input[name="topic"][value="${a.dataset.topic}"]`, form);
    if (radio) radio.checked = true;
    if (a.dataset.role) form.elements.message.value = `I'd like to apply for the ${a.dataset.role} role.\n\n`;
  }));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let first = null;
    ["name", "email", "message"].forEach((n) => {
      const f = form.elements[n];
      const ok = n === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()) : f.value.trim().length > 0;
      f.setAttribute("aria-invalid", String(!ok));
      if (!ok && !first) first = f;
    });
    if (first) { err.textContent = first.name === "email" ? "Please enter a valid email address." : `Please add your ${first.name}.`; first.focus(); return; }
    err.textContent = "";
    const topic = form.elements.topic.value;
    const to = { Investors: "investors", Careers: "careers", Community: "community", Suppliers: "procurement" }[topic] || "info";
    const body = `${form.elements.message.value.trim()}\n\n${form.elements.name.value.trim()}\n${form.elements.email.value.trim()}`;
    location.href = `mailto:${to}@banketreef.example?subject=${encodeURIComponent(topic + " enquiry")}&body=${encodeURIComponent(body)}`;
    toast("Opening your email app…");
  });

  /* Loop ------------------------------------------------------------------------- */
  let ticking = false;
  const frame = () => { ticking = false; bar.classList.toggle("is-solid", scrollY > 40); updateRL(); placeTruck(); };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  let rT;
  const layout = () => { buildRoad(); paintShots(); paintHero(); frame(); };
  addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(layout, 150); });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(layout);
  layout();
})();
