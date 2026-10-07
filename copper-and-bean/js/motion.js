/* Copper & Bean: motion.
   Scroll reveals, parallax, a hide-on-scroll header and the footer wordmark.
   Everything is visible without this file. Visitors who ask for reduced
   motion still get gentle fades (see the CSS), but no parallax, spinning,
   sliding or hiding header. */

(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { $, $$ } = CB;
  const root = document.documentElement;

  /* Diagnostics: add #motion-check to the URL to see why motion may be off. */
  if (location.hash === "#motion-check") {
    const ua = navigator.userAgent;
    const engine = /iPhone|iPad|iPod/.test(ua) ? "WebKit (iOS)" : /Firefox\//.test(ua) ? "Gecko" : /AppleWebKit/.test(ua) && !/Chrome/.test(ua) ? "WebKit" : "Chromium";
    const rows = [
      ["JavaScript", "Running"],
      ["Reduce motion setting", reduced ? "ON (fades only)" : "Off (full motion)"],
      ["Smooth-scroll library", window.Lenis ? "Loaded" : "Not loaded (blocked or offline)"],
      ["Scroll reveals", "IntersectionObserver" in window ? "Supported" : "Not supported"],
      ["Browser engine", engine],
    ];
    const panel = document.createElement("div");
    panel.className = "motion-check";
    panel.setAttribute("role", "status");
    panel.innerHTML = `<strong>Motion check</strong>${rows.map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join("")}<button type="button">Close</button>`;
    panel.querySelector("button").addEventListener("click", () => panel.remove());
    document.body.append(panel);
  }

  /* Scroll reveals --------------------------------------------------------- */

  // Groups whose children cascade in one after another.
  const groups = [
    ".perks", ".product-grid", ".pillars", ".review-grid",
    ".session-list", ".workshop-grid", ".how-steps", ".footer-cols", ".policy",
  ];
  // Single elements that rise in on their own.
  const singles = [
    ".section-head", ".roast-step .frame", ".curve-card", ".sub-body > *",
    ".visit-info", ".gallery img", ".cta-band", ".faq details", ".footer-news",
    ".option-group", ".plan-summary", ".calendar", ".day-panel",
  ];

  if ("IntersectionObserver" in window) {
    root.classList.add("motion");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    const watch = (el, delay = 0) => {
      if (el.classList.contains("reveal")) return;
      el.classList.add("reveal");
      el.style.setProperty("--reveal-delay", `${delay}ms`);
      io.observe(el);
    };
    groups.forEach((sel) => $$(sel).forEach((g) => [...g.children].forEach((c, i) => watch(c, Math.min(i, 6) * 80))));

    // Sideways carousels: items off to the right never scroll into view
    // vertically, so reveal the whole row together when the row arrives.
    $$(".origin-list").forEach((row) => {
      const items = [...row.children];
      items.forEach((c, i) => {
        c.classList.add("reveal");
        c.style.setProperty("--reveal-delay", `${Math.min(i, 6) * 80}ms`);
      });
      const ro = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        items.forEach((c) => c.classList.add("is-in"));
        ro.disconnect();
      }, { threshold: 0.15 });
      ro.observe(row);
    });
    singles.forEach((sel) => $$(sel).forEach((el) => watch(el)));

    // Safety net: never leave anything hidden if an observer misses it.
    setTimeout(() => $$(".reveal:not(.is-in)").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) el.classList.add("is-in");
    }), 2500);
  }

  /* Parallax --------------------------------------------------------------- */

  // [selector, strength]: positive moves slower than the page.
  const layers = [
    [".hero-photo", 0.28],
    [".page-hero-photo", 0.2],
    [".sub-media img", 0.12],
    [".pillar img", 0.08],
    [".gallery li", -0.06],
  ].flatMap(([sel, k]) => (reduced ? [] : $$(sel).map((el) => ({ el, k }))));

  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = innerHeight;
    for (const { el, k } of layers) {
      const host = el.closest(".hero, .page-hero") ? el.parentElement : el;
      const r = host.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const offset = el.closest(".hero, .page-hero") ? -r.top : r.top + r.height / 2 - vh / 2;
      el.style.translate = `0 ${(offset * k).toFixed(1)}px`;
    }
  };

  /* Header hides on the way down, returns on the way up -------------------- */

  const header = $(".site-header");
  let lastY = scrollY;
  const headerWatch = () => {
    const y = scrollY;
    const busy = document.body.classList.contains("menu-open") || root.classList.contains("is-locked");
    if (header && !busy && !reduced) header.classList.toggle("is-hidden", y > 320 && y > lastY + 2);
    if (y < lastY - 2 || y < 320) header?.classList.remove("is-hidden");
    lastY = y;
  };

  addEventListener("scroll", () => {
    headerWatch();
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  addEventListener("resize", update);
  update();

  // Keep the header in view while someone is tabbing through it.
  header?.addEventListener("focusin", () => header.classList.remove("is-hidden"));

  /* Footer wordmark rises letter by letter --------------------------------- */

  const mark = $(".footer-wordmark");
  if (mark && "IntersectionObserver" in window) {
    const split = (node, index) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          [...child.textContent].forEach((ch) => {
            const s = document.createElement("i");
            s.className = "wm-ch";
            s.textContent = ch;
            s.style.setProperty("--i", index.n++);
            frag.append(s);
          });
          child.replaceWith(frag);
        } else {
          split(child, index);
        }
      });
    };
    split(mark, { n: 0 });
    mark.classList.add("is-split");
    const mo = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        mark.classList.add("is-in");
        mo.disconnect();
      }
    }, { threshold: 0.3 });
    mo.observe(mark);
  }
})();
