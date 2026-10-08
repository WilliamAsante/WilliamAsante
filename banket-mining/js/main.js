/* Banket Reef Mining: depth gauge, pinned process track, headlamp reef,
   counters, reveals and the contact form. The page reads fine without it. */

(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  root.classList.add("js");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

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

  if (reduced) $$("svg").forEach((s) => s.pauseAnimations && s.pauseAnimations());

  /* Depth gauge ---------------------------------------------------------- */
  const gauge = $(".gauge");
  const depthEl = $("[data-depth]");
  const layerEl = $("[data-layer]", gauge);
  const segs = $$(".gauge-column span");
  const zones = $$("[data-depth-from]");
  const segFor = (d) => (d <= 0 ? -1 : d <= 30 ? 0 : d <= 150 ? 1 : d <= 260 ? 2 : 3);

  // Mobile: the readout opens a list of layers to jump to.
  const jump = document.createElement("ul");
  jump.className = "gauge-jump";
  jump.id = "gauge-jump";
  const jumpItems = [
    ["#surface", "Surface", "#F2E6D0"], ["#who", "Who we are · Laterite", "#9A4326"], ["#operations", "Operations · Sandstone", "#D1A867"],
    ["#people", "People · Phyllite", "#6E7E76"], ["#reef", "The reef · Banket", "#E8B83D"], ["#return", "Rehabilitation", "#9BCB7E"], ["#careers", "Careers & contact", "#4F7D3C"],
  ];
  jump.innerHTML = jumpItems.map(([h, t, c]) => `<li><a href="${h}"><i style="--c:${c}"></i>${t}</a></li>`).join("");
  gauge.append(jump);
  const readout = $(".gauge-readout");
  readout.setAttribute("role", "button");
  readout.setAttribute("tabindex", "0");
  readout.setAttribute("aria-controls", "gauge-jump");
  readout.setAttribute("aria-expanded", "false");
  readout.setAttribute("aria-label", "Depth gauge. Open the list of layers");
  const setJump = (open) => { gauge.classList.toggle("is-open", open); readout.setAttribute("aria-expanded", String(open)); };
  const desktop = matchMedia("(min-width: 1000px)");
  readout.addEventListener("click", () => { if (!desktop.matches) setJump(!gauge.classList.contains("is-open")); });
  readout.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && !desktop.matches) { e.preventDefault(); setJump(!gauge.classList.contains("is-open")); } });
  jump.addEventListener("click", (e) => { if (e.target.closest("a")) setJump(false); });
  document.addEventListener("click", (e) => { if (!gauge.contains(e.target)) setJump(false); });

  let lastDepth = -1;
  const updateGauge = () => {
    const probe = scrollY + innerHeight * 0.45;
    let depth = 0, layer = "Surface";
    for (const z of zones) {
      const top = z.offsetTop, h = z.offsetHeight;
      if (probe >= top && probe < top + h) {
        const t = clamp((probe - top) / h, 0, 1);
        const from = +z.dataset.depthFrom, to = +z.dataset.depthTo;
        depth = from + (to - from) * t;
        layer = z.dataset.layer;
        break;
      }
    }
    const d = Math.round(depth);
    if (d === lastDepth) return;
    lastDepth = d;
    depthEl.textContent = String(d).padStart(3, "0");
    layerEl.textContent = layer;
    gauge.style.setProperty("--depth", depth);
    const cur = segFor(depth);
    segs.forEach((s, i) => s.classList.toggle("is-current", i === cur));
  };

  /* Top nav: solid once past the hero, hides while descending ------------ */
  const nav = $(".topnav");
  const surface = $(".surface");
  let lastY = scrollY;
  const updateNav = () => {
    const y = scrollY;
    nav.classList.toggle("is-solid", y > surface.offsetHeight - 80);
    nav.classList.toggle("is-hidden", y > lastY && y > 400 && !nav.matches(":focus-within"));
    lastY = y;
  };
  const navLinks = $$(".topnav ul a");
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) navLinks.forEach((a) => a.classList.toggle("is-current", a.getAttribute("href") === `#${en.target.id}`));
    }), { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach((a) => { const s = $(a.getAttribute("href")); if (s) spy.observe(s); });
  }

  /* From rock to bar: vertical scroll drives a sideways track ------------ */
  const process = $(".process");
  const track = $("[data-track]");
  const bar = $("[data-progress]");
  let pinned = !reduced;
  const sizeProcess = () => {
    if (!pinned) { process.classList.add("no-pin"); process.style.height = ""; return; }
    const extra = Math.max(0, track.scrollWidth - innerWidth + (desktop.matches ? 96 : 0));
    process.style.height = `${innerHeight + extra}px`;
    process.dataset.extra = extra;
  };
  const updateProcess = () => {
    if (!pinned) return;
    const extra = +process.dataset.extra || 0;
    const p = extra ? clamp((scrollY - process.offsetTop) / extra, 0, 1) : 0;
    track.style.transform = `translate3d(${-p * extra}px,0,0)`;
    bar.parentElement.style.setProperty("--p", p);
  };

  /* Reef: pebbles, gold specks and a headlamp ---------------------------- */
  const reef = $(".reef");
  const rock = $("[data-rock]");
  (() => {
    let seed = 17;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const W = 1600, H = 1400, greys = ["#3A3631", "#57524A", "#7C766B", "#A39C8E", "#C9C2B4"];
    let out = "";
    for (let i = 0; i < 340; i++) {
      const rx = 6 + rnd() * 26, ry = rx * (0.55 + rnd() * 0.35);
      out += `<ellipse cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * H).toFixed(0)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" transform="rotate(${(rnd() * 180).toFixed(0)} 0 0)" fill="${greys[Math.floor(rnd() * greys.length)]}" opacity="${(0.55 + rnd() * 0.45).toFixed(2)}"/>`;
    }
    for (let i = 0; i < 180; i++) {
      out += `<circle class="twinkle" style="--t:${(rnd() * 3).toFixed(2)}s" cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * H).toFixed(0)}" r="${(1 + rnd() * 3).toFixed(1)}" fill="${rnd() > 0.3 ? "#E8B83D" : "#F5D06B"}"/>`;
    }
    // rotate() around the origin would fling pebbles away, so rotate each about its own centre instead.
    out = out.replace(/cx="(\d+)" cy="(\d+)"([^>]*)rotate\((\d+) 0 0\)/g, (m, x, y, mid, a) => `cx="${x}" cy="${y}"${mid}rotate(${a} ${x} ${y})`);
    rock.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${out}</svg>`;
  })();

  let lampUser = false, lampTimer, lampRAF, reefVisible = false;
  const setLamp = (x, y) => { reef.style.setProperty("--x", `${x}px`); reef.style.setProperty("--y", `${y}px`); };
  reef.addEventListener("pointermove", (e) => {
    const r = reef.getBoundingClientRect();
    setLamp(e.clientX - r.left, e.clientY - r.top);
    lampUser = true;
    clearTimeout(lampTimer);
    lampTimer = setTimeout(() => (lampUser = false), 2500);
  });
  const sweep = (t) => {
    if (!reefVisible) return;
    if (!lampUser) {
      const w = reef.offsetWidth, h = reef.offsetHeight;
      const vis = clamp(scrollY + innerHeight * 0.5 - reef.offsetTop, 0, h);
      setLamp(w * (0.55 + 0.3 * Math.sin(t / 2100)), clamp(vis + Math.cos(t / 1700) * 120, 80, h - 80));
    }
    lampRAF = requestAnimationFrame(sweep);
  };
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => {
      reefVisible = en.isIntersecting;
      cancelAnimationFrame(lampRAF);
      if (reefVisible && !reduced) lampRAF = requestAnimationFrame(sweep);
    }).observe(reef);
  }
  if (reduced) reef.style.setProperty("--r", "520px");

  /* Count-ups --------------------------------------------------------------- */
  const fmt = (v, dec, prefix) => prefix + v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const countUp = (el) => {
    const end = +el.dataset.count, dec = +(el.dataset.decimals || 0), prefix = el.dataset.prefix || "";
    if (reduced) { el.textContent = fmt(end, dec, prefix); return; }
    const t0 = performance.now(), dur = 1600;
    const step = (t) => {
      const k = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(end * e, dec, prefix);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* Reveals ------------------------------------------------------------------ */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add("is-in");
      if (el.dataset.count) countUp(el);
      io.unobserve(el);
    }), { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
    const watch = (el, d = 0, cls = true) => { if (cls) { el.classList.add("reveal"); el.style.setProperty("--d", `${d}ms`); } io.observe(el); };
    $$(".stratum-body > .kicker, .stratum-body > h2, .stratum-body > .lead, .log, .pit, .facts li, .community article, .regrow-stats li, .roles li, .reserve, .people-note, .contact-block > *, .careers > .kicker, .careers > h2, .careers > .lead").forEach((el) => {
      const sibs = [...el.parentElement.children].filter((c) => c.matches(el.tagName.toLowerCase()));
      watch(el, Math.min(sibs.indexOf(el), 5) * 90);
    });
    $$("[data-count]").forEach((el) => { el.textContent = fmt(0, +(el.dataset.decimals || 0), el.dataset.prefix || ""); watch(el, 0, false); });
    $$(".drilllog, .regrow").forEach((el) => watch(el, 0, false));
    $$(".drilllog tbody tr").forEach((tr, i) => tr.style.setProperty("--d", `${i * 120}ms`));
  }

  /* Careers + contact form --------------------------------------------------- */
  const form = $("[data-form]");
  const err = $("[data-form-error]");
  $$("[data-topic]").forEach((a) => a.addEventListener("click", () => {
    form.elements.topic.value = a.dataset.topic;
    if (a.dataset.role) form.elements.message.value = `I'd like to apply for the ${a.dataset.role} role.\n\n`;
    setTimeout(() => form.elements.name.focus({ preventScroll: true }), 700);
  }));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fields = ["name", "email", "message"].map((n) => form.elements[n]);
    let first = null;
    fields.forEach((f) => {
      const ok = f.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()) : f.value.trim().length > 0;
      f.setAttribute("aria-invalid", String(!ok));
      if (!ok && !first) first = f;
    });
    if (first) {
      err.textContent = first.name === "email" ? "Please enter a valid email address." : `Please add your ${first.name}.`;
      first.focus();
      return;
    }
    err.textContent = "";
    const topic = form.elements.topic.value;
    const to = topic === "Careers" ? "careers" : topic === "Investors" ? "investors" : "info";
    const body = `${form.elements.message.value.trim()}\n\n${form.elements.name.value.trim()}\n${form.elements.email.value.trim()}`;
    location.href = `mailto:${to}@banketreef.example?subject=${encodeURIComponent(`${topic} enquiry`)}&body=${encodeURIComponent(body)}`;
    toast("Opening your email app…");
  });

  /* Loop ------------------------------------------------------------------- */
  let ticking = false;
  const frame = () => { ticking = false; updateGauge(); updateNav(); updateProcess(); };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  const resize = () => { sizeProcess(); lastDepth = -1; frame(); };
  addEventListener("resize", resize);
  document.fonts && document.fonts.ready.then(resize);
  resize();
})();
