/* Presbyterian Church of Ghana, Mpraeso: landing page behaviour.
   The page reads fine without this file; everything here is an enhancement. */

(() => {
  "use strict";

  /* ---------------------------------------------------------------------
     Church details. Fill these in and the page updates everywhere.
     --------------------------------------------------------------------- */
  const CONFIG = {
    // International format, digits only, e.g. "233241234567". Empty = WhatsApp asks who to send to.
    whatsapp: "",
    links: {
      youtube: "",
      facebook: "",
      whatsappChannel: "",
      latestSermon: "",
    },
  };

  // Weekly services, in Ghana time (GMT all year). day: 0 = Sunday.
  const SERVICES = [
    { name: "First Service", note: "English", day: 0, h: 7, m: 0, mins: 120 },
    { name: "Second Service", note: "Twi", day: 0, h: 9, m: 30, mins: 150 },
    { name: "Bible Study", note: "All groups", day: 3, h: 18, m: 30, mins: 90 },
    { name: "Prayer & Revival", note: "BSPG", day: 5, h: 18, m: 30, mins: 120 },
  ];

  // Church calendar. Past events hide themselves.
  const EVENTS = [
    { title: "Holy Communion Sunday", start: "2026-11-01T07:00", end: "2026-11-01T12:00", cat: "worship", place: "Main sanctuary", desc: "The Lord's Supper is served at both services. Communicant members, please come prepared." },
    { title: "Harvest & Thanksgiving Service", start: "2026-11-15T09:30", end: "2026-11-15T15:00", cat: "community", place: "Church compound", desc: "One combined service of thanksgiving, then the harvest bazaar and auction. Bring your family and friends.", feature: true },
    { title: "Youth Night of Praise", start: "2026-11-27T18:30", end: "2026-11-27T21:30", cat: "youth", place: "Main sanctuary", desc: "JY, YPG and YAF lead an evening of praise, drama and testimonies. Every generation is welcome." },
    { title: "Nine Lessons & Carols", start: "2026-12-13T18:00", end: "2026-12-13T20:00", cat: "worship", place: "Main sanctuary", desc: "The Christmas story in Scripture and song, with the Church Choir and Singing Band." },
    { title: "Watch-Night Service", start: "2026-12-31T21:00", end: "2027-01-01T00:30", cat: "worship", place: "Main sanctuary", desc: "See out the old year and pray in the new one together." },
    { title: "Kwahu Easter Homecoming", start: "2027-03-26T09:00", end: "2027-03-28T13:00", cat: "community", place: "Mpraeso", desc: "Good Friday to Easter Sunday. Welcoming sons and daughters of Kwahu home for the festival, with worship every day.", feature: true },
  ];

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  root.classList.add("js");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Ghana is GMT with no daylight saving, so "local church time" is UTC.
  const churchDate = (iso) => new Date(iso + "Z");
  const fmtTime = (d) => {
    const h = d.getUTCHours(), m = d.getUTCMinutes();
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  };

  /* Toast ------------------------------------------------------------- */
  const toast = (() => {
    let el, t;
    return (msg) => {
      if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.append(el); }
      el.textContent = msg;
      el.classList.add("is-on");
      clearTimeout(t);
      t = setTimeout(() => el.classList.remove("is-on"), 2600);
    };
  })();

  /* Photos: use the church's own photo when it has been added ---------- */
  // Each <img data-local="assets/photos/x.jpg"> swaps to that file if it exists.
  $$("img[data-local]").forEach((img) => {
    const probe = new Image();
    probe.onload = () => { img.src = probe.src; img.removeAttribute("srcset"); };
    probe.src = img.dataset.local;
  });

  /* Links that are not set yet ----------------------------------------- */
  const linkMap = { "YouTube channel": "youtube", YouTube: "youtube", "Facebook live": "facebook", Facebook: "facebook", "WhatsApp channel": "whatsappChannel" };
  $$("[data-placeholder-link]").forEach((a) => {
    const key = linkMap[a.textContent.trim()] || "latestSermon";
    const url = CONFIG.links[key];
    if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener"; a.removeAttribute("data-placeholder-link"); }
  });
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-placeholder-link]");
    if (!a) return;
    e.preventDefault();
    toast("Coming soon. Follow us on Sunday for the live stream.");
  });

  /* Header + mobile nav ------------------------------------------------ */
  const header = $("[data-header]");
  const onScroll = () => header.classList.toggle("is-scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const toggle = $(".nav-toggle");
  const nav = $("#nav");
  const scrim = document.createElement("div");
  scrim.className = "nav-scrim";
  document.body.append(scrim);
  const setNav = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    if (open) $("a", nav).focus({ preventScroll: true });
  };
  toggle.addEventListener("click", () => setNav(toggle.getAttribute("aria-expanded") !== "true"));
  scrim.addEventListener("click", () => setNav(false));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("is-open")) { setNav(false); toggle.focus(); } });

  // Highlight the section in view.
  const navLinks = $$(".nav ul a");
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle("is-current", a.getAttribute("href") === `#${en.target.id}`));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach((a) => { const s = $(a.getAttribute("href")); if (s) spy.observe(s); });
    // Nothing is "current" while the hero is on screen.
    new IntersectionObserver(([en]) => { if (en.isIntersecting) navLinks.forEach((a) => a.classList.remove("is-current")); }, { rootMargin: "-45% 0px -50% 0px" }).observe($(".hero"));
  }

  /* Next service + countdown ------------------------------------------- */
  const nextOccurrence = (now) => {
    let best = null;
    for (const s of SERVICES) {
      for (let add = 0; add <= 7; add++) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + add, s.h, s.m));
        if (d.getUTCDay() !== s.day) continue;
        const end = new Date(d.getTime() + s.mins * 60000);
        if (end <= now) continue;
        if (!best || d < best.start) best = { ...s, start: d, end };
      }
    }
    return best;
  };

  const card = $(".next-card");
  const nameEl = $("[data-next-name]");
  const whenEl = $("[data-next-when]");
  const shortEl = $("[data-next-short]");
  const cd = { d: $('[data-cd="d"]'), h: $('[data-cd="h"]'), m: $('[data-cd="m"]') };

  const tick = () => {
    const now = new Date();
    const n = nextOccurrence(now);
    if (!n) return;
    const live = n.start <= now;
    const today = n.start.getUTCDate() === now.getUTCDate() && n.start.getUTCMonth() === now.getUTCMonth();
    const tomorrow = new Date(now.getTime() + 864e5);
    const isTomorrow = n.start.getUTCDate() === tomorrow.getUTCDate() && n.start.getUTCMonth() === tomorrow.getUTCMonth();
    const dayWord = today ? "Today" : isTomorrow ? "Tomorrow" : DAYS[n.start.getUTCDay()];
    nameEl.textContent = n.name;
    whenEl.textContent = `${dayWord} · ${fmtTime(n.start)} · ${n.note}`;
    $(".next-label", card).textContent = live ? "Happening now" : "Next service";
    card.classList.toggle("is-live", live);
    shortEl.textContent = live ? `Live now: ${n.name}` : `Next: ${n.name} · ${dayWord} ${fmtTime(n.start)}`;
    const diff = Math.max(0, n.start - now);
    cd.d.textContent = Math.floor(diff / 864e5);
    cd.h.textContent = Math.floor((diff / 36e5) % 24);
    cd.m.textContent = Math.floor((diff / 6e4) % 60);
  };
  tick();
  setInterval(tick, 20000);

  /* Events -------------------------------------------------------------- */
  const list = $("[data-events]");
  const empty = $("[data-events-empty]");
  const pin = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  const clock = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const now = new Date();
  const upcoming = EVENTS.map((e) => ({ ...e, s: churchDate(e.start), e: churchDate(e.end) })).filter((e) => e.e > now).sort((a, b) => a.s - b.s);

  upcoming.forEach((ev, i) => {
    const li = document.createElement("li");
    li.className = `event${ev.feature ? " event-feature" : ""}`;
    li.dataset.cat = ev.cat;
    const multi = ev.e - ev.s > 864e5;
    const when = multi
      ? `${DAYS[ev.s.getUTCDay()].slice(0, 3)} ${ev.s.getUTCDate()} – ${DAYS[ev.e.getUTCDay()].slice(0, 3)} ${ev.e.getUTCDate()} ${MONTHS[ev.e.getUTCMonth()]}`
      : `${DAYS[ev.s.getUTCDay()]} · ${fmtTime(ev.s)}`;
    li.innerHTML = `
      <div class="event-date" aria-hidden="true"><span>${MONTHS[ev.s.getUTCMonth()]}</span><b>${ev.s.getUTCDate()}</b><small>${ev.s.getUTCFullYear()}</small></div>
      <div class="event-main">
        <h3></h3>
        <p></p>
        <div class="event-tags"><span>${clock}${when}</span><span>${pin}${ev.place}</span></div>
      </div>
      <button class="event-cal" type="button" data-ics="${i}"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>Add to calendar</button>`;
    $("h3", li).textContent = ev.title;
    $(".event-main p", li).textContent = ev.desc;
    list.append(li);
  });

  const icsStamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  list.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ics]");
    if (!b) return;
    const ev = upcoming[+b.dataset.ics];
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mpraeso Presby//Events//EN", "BEGIN:VEVENT",
      `UID:${icsStamp(ev.s)}-${ev.title.replace(/\W+/g, "")}@mpraeso-presby`, `DTSTAMP:${icsStamp(new Date())}`,
      `DTSTART:${icsStamp(ev.s)}`, `DTEND:${icsStamp(ev.e)}`,
      `SUMMARY:${ev.title}`, `LOCATION:${ev.place}\\, Presbyterian Church Mpraeso`, `DESCRIPTION:${ev.desc.replace(/,/g, "\\,")}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = `${ev.title.toLowerCase().replace(/\W+/g, "-")}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Calendar file downloaded");
  });

  $$(".chip").forEach((chip) => chip.addEventListener("click", () => {
    $$(".chip").forEach((c) => { c.classList.toggle("is-active", c === chip); c.setAttribute("aria-pressed", String(c === chip)); });
    const f = chip.dataset.filter;
    let shown = 0;
    $$(".event", list).forEach((li) => { const on = f === "all" || li.dataset.cat === f; li.hidden = !on; shown += on; });
    empty.hidden = shown > 0;
  }));

  /* Giving tabs + copy --------------------------------------------------- */
  const tabs = $$('[role="tab"]');
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      $(`#${t.getAttribute("aria-controls")}`).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t));
    t.addEventListener("keydown", (e) => {
      const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      select(tabs[(i + dir + tabs.length) % tabs.length], true);
    });
  });

  $$("[data-copy]").forEach((btn) => btn.addEventListener("click", async () => {
    const value = $("[data-copy-value]", btn.closest(".tab-panel")).textContent.trim();
    if (/X/.test(value)) { toast("The MoMo number will be shared here soon"); return; }
    try { await navigator.clipboard.writeText(value.replace(/\s/g, "")); toast("Number copied"); }
    catch { toast(value); }
  }));

  /* Visit / prayer form -> WhatsApp ------------------------------------- */
  const form = $("[data-visit-form]");
  const msgLabel = $("[data-message-label]", form);
  const submitLabel = $("[data-submit-label]", form);
  const kind = () => form.elements.kind.value;
  const syncKind = () => {
    const prayer = kind() === "prayer";
    $$("[data-visit-only]", form).forEach((el) => (el.hidden = prayer));
    $$("[data-prayer-only]", form).forEach((el) => (el.hidden = !prayer));
    msgLabel.textContent = prayer ? "How can we pray for you?" : "Anything we should know?";
    submitLabel.textContent = prayer ? "Send prayer request" : "Send on WhatsApp";
  };
  form.addEventListener("change", (e) => { if (e.target.name === "kind") syncKind(); });
  syncKind();

  const setError = (input, msg) => {
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    input.setAttribute("aria-describedby", `${input.id}-error`);
    $(`#${input.id}-error`).textContent = msg;
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.elements.name, message = form.elements.message;
    const prayer = kind() === "prayer";
    setError(name, name.value.trim() ? "" : "Please tell us your name.");
    setError(message, prayer && !message.value.trim() ? "Please share what you'd like us to pray about." : "");
    const bad = $('[aria-invalid="true"]', form);
    if (bad) { bad.focus(); return; }

    const lines = prayer
      ? [`Prayer request from ${name.value.trim()}`, "", message.value.trim(), form.elements.private.checked ? "\n(Please keep this private to the Minister.)" : ""]
      : [`Hello! I'm ${name.value.trim()} and I'd like to visit Mpraeso Presby.`, `Service: ${form.elements.service.value}`, `Number of people: ${form.elements.people.value || 1}`, message.value.trim() ? `\n${message.value.trim()}` : ""];
    const text = encodeURIComponent(lines.filter((l, i) => l || i === 1).join("\n").trim());
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${text}`, "_blank", "noopener");
    toast(prayer ? "We will be praying with you." : "Akwaaba! We look forward to meeting you.");
  });

  /* Footer year ---------------------------------------------------------- */
  const y = $("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  /* Scroll reveals ------------------------------------------------------- */
  if (!("IntersectionObserver" in window)) return;
  const groups = [".times", ".ministry-grid", ".pillars", ".event-list", ".sermon-list", ".footer-grid", ".contact-list", ".give-funds"];
  const singles = [".section-head", ".about-photo-a", ".about-photo-b", ".about-badge", ".about-body > h2", ".about-body > p", ".heritage-inner > *", ".sermon-feature", ".give-intro > *", ".give-card", ".map", ".faq", ".visit-form"];
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("is-in");
    io.unobserve(en.target);
  }), { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
  const watch = (el, delay) => {
    if (el.classList.contains("reveal")) return;
    el.classList.add("reveal");
    el.style.setProperty("--d", `${delay}ms`);
    io.observe(el);
  };
  groups.forEach((g) => $$(g).forEach((wrap) => [...wrap.children].forEach((c, i) => watch(c, Math.min(i, 6) * 90))));
  singles.forEach((s) => $$(s).forEach((el, i) => watch(el, s.includes(">") ? Math.min(i, 4) * 90 : 0)));

  // Gentle parallax on the big photos (skipped for reduced motion).
  if (reduced) return;
  const para = $$(".heritage-media img, .about-photo-b img");
  let ticking = false;
  const parallax = () => {
    ticking = false;
    para.forEach((img) => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      img.style.transform = `translateY(${p * -40}px) scale(1.08)`;
    });
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
  parallax();
})();
