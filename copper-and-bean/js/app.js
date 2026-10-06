/* Copper & Bean: shared front-end code.
   Cart, header, footer, cart drawer, product dialog, product illustrations,
   workshop sessions and smooth scrolling. Page scripts build on CB.* from here.

   This is a front-end build: cart, orders, bookings and the subscription are
   kept in the browser (localStorage) so every flow can be clicked through.
   When a backend is connected, swap the CB.store functions for API calls. */

(() => {
  "use strict";

  const CB = window.CB;

  /* Helpers ------------------------------------------------------------- */

  CB.$ = (sel, root = document) => root.querySelector(sel);
  CB.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  CB.esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const moneyFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: CB.settings.currency });
  CB.money = (n) => moneyFormat.format(n).replace(/\.00$/, "");
  CB.moneyExact = (n) => moneyFormat.format(n);

  CB.uid = (prefix = "") => prefix + Math.random().toString(36).slice(2, 8).toUpperCase();

  CB.iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  CB.fromIso = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  CB.formatDate = (s, opts = { weekday: "short", month: "short", day: "numeric" }) =>
    CB.fromIso(s).toLocaleDateString("en-US", opts);

  CB.formatTime = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
  };

  CB.product = (id) => CB.products.find((p) => p.id === id);
  CB.workshop = (id) => CB.workshops.find((w) => w.id === id);

  /* Storage ------------------------------------------------------------- */

  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Storage unavailable (private mode): state lasts for this page only. */
    }
  };

  CB.store = {
    get cart() { return read("cb-cart", []); },
    set cart(v) { write("cb-cart", v); document.dispatchEvent(new CustomEvent("cart:change")); },
    get orders() { return read("cb-orders", []); },
    set orders(v) { write("cb-orders", v); },
    get bookings() { return read("cb-bookings", []); },
    set bookings(v) { write("cb-bookings", v); },
    get subscription() { return read("cb-subscription", null); },
    set subscription(v) { write("cb-subscription", v); },
    get account() { return read("cb-account", null); },
    set account(v) { write("cb-account", v); },
  };

  /* Cart ---------------------------------------------------------------- */

  // Each line: { key, type: "product" | "ticket" | "subscription", ref, name, option, price, qty, ... }
  CB.cart = {
    lines: () => CB.store.cart,
    count: () => CB.store.cart.reduce((n, l) => n + l.qty, 0),
    subtotal: () => CB.store.cart.reduce((n, l) => n + l.price * l.qty, 0),
    hasPhysical: () => CB.store.cart.some((l) => l.type !== "ticket"),

    addProduct(id, { size = 0, grind = null, qty = 1 } = {}) {
      const p = CB.product(id);
      const s = p.sizes[size];
      const option = [s.label, grind].filter(Boolean).join(", ");
      const key = `p:${id}:${s.label}:${grind || ""}`;
      const cart = CB.store.cart;
      const line = cart.find((l) => l.key === key);
      if (line) line.qty += qty;
      else cart.push({ key, type: "product", ref: id, name: p.name, option, price: s.price, qty });
      CB.store.cart = cart;
      CB.toast(`${p.name} added to your cart`);
    },

    addTicket(session, qty) {
      const w = CB.workshop(session.workshopId);
      const key = `t:${session.id}`;
      const cart = CB.store.cart;
      const line = cart.find((l) => l.key === key);
      if (line) line.qty = Math.min(line.qty + qty, session.seatsLeft);
      else
        cart.push({
          key, type: "ticket", ref: session.id, name: w.name,
          option: `${CB.formatDate(session.date)}, ${CB.formatTime(session.time)}`,
          price: w.price, qty, max: session.seatsLeft,
        });
      CB.store.cart = cart;
      CB.toast(`${qty} ${qty === 1 ? "seat" : "seats"} for ${w.name} added`);
    },

    setSubscription(plan) {
      const cart = CB.store.cart.filter((l) => l.type !== "subscription");
      cart.push({
        key: "s:roasters-choice", type: "subscription", ref: "roasters-choice",
        name: "Roaster's Choice subscription",
        option: CB.planSummary(plan),
        price: plan.bags * CB.settings.subscription.pricePerBag, qty: 1, plan,
      });
      CB.store.cart = cart;
    },

    setQty(key, qty) {
      let cart = CB.store.cart;
      const line = cart.find((l) => l.key === key);
      if (!line) return;
      if (qty <= 0) cart = cart.filter((l) => l.key !== key);
      else line.qty = line.max ? Math.min(qty, line.max) : qty;
      CB.store.cart = cart;
    },

    clear() { CB.store.cart = []; },
  };

  CB.planSummary = (plan) =>
    `${plan.bags} ${plan.bags === 1 ? "bag" : "bags"} every ${plan.frequency} weeks, ${plan.grind.toLowerCase()}, ${plan.style.toLowerCase()}`;

  /* Workshop sessions --------------------------------------------------- */

  const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

  // Every session in the next `days` days. Seats already sold are simulated
  // from the date, minus any seats booked in this browser.
  CB.sessions = ({ days = 63 } = {}) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const booked = CB.store.bookings.reduce((m, b) => ((m[b.sessionId] = (m[b.sessionId] || 0) + b.qty), m), {});
    const list = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      for (const w of CB.workshops) {
        if (!w.days.includes(d.getDay())) continue;
        const [h, m] = w.time.split(":").map(Number);
        const at = new Date(d);
        at.setHours(h, m);
        if (at <= now) continue;
        const id = `${w.id}_${CB.iso(d)}`;
        const seed = hash(id);
        const sold = seed % 9 === 0 ? w.capacity : seed % (w.capacity - 1);
        list.push({
          id, workshopId: w.id, date: CB.iso(d), time: w.time, capacity: w.capacity,
          seatsLeft: Math.max(0, w.capacity - sold - (booked[id] || 0)),
        });
      }
    }
    return list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  };

  /* Product illustrations ----------------------------------------------- */

  const shade = (hex, amt) => {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
    return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
  };

  const art = {
    bag({ color, label }) {
      const [l1, l2] = label.split("\n");
      return `
        <path d="M58 46h84l10 172a8 8 0 0 1-8 8H56a8 8 0 0 1-8-8z" fill="#1E1714"/>
        <path d="M142 46l10 172a8 8 0 0 1-8 8h-14l-6-180z" fill="#000" opacity=".25"/>
        <rect x="54" y="30" width="92" height="20" rx="3" fill="#2A211C"/>
        <path d="M58 40h84" stroke="#0E0A08" stroke-width="2" stroke-dasharray="3 3"/>
        <circle cx="128" cy="68" r="5" fill="#2A211C" stroke="#3A2E27" stroke-width="2"/>
        <rect x="64" y="96" width="74" height="96" rx="4" fill="${color}"/>
        <text x="101" y="116" text-anchor="middle" font-size="9" letter-spacing="1.5" fill="#16100D" font-family="'Big Shoulders Display', sans-serif" font-weight="800">COPPER &amp; BEAN</text>
        <line x1="74" y1="124" x2="128" y2="124" stroke="#16100D" stroke-opacity=".4"/>
        <text x="101" y="148" text-anchor="middle" font-size="19" fill="#16100D" font-family="'Big Shoulders Display', sans-serif" font-weight="800">${CB.esc(l1.toUpperCase())}</text>
        <text x="101" y="168" text-anchor="middle" font-size="19" fill="#16100D" font-family="'Big Shoulders Display', sans-serif" font-weight="800">${CB.esc((l2 || "").toUpperCase())}</text>
        <text x="101" y="184" text-anchor="middle" font-size="6" letter-spacing=".6" fill="#16100D" opacity=".7" font-family="'Instrument Sans', sans-serif">340 G · WHOLE BEAN</text>`;
    },
    mug({ color }) {
      return `
        <path d="M144 112c22 0 26 44 0 46" fill="none" stroke="${shade(color, -0.12)}" stroke-width="12" stroke-linecap="round"/>
        <path d="M52 92h96v104c0 12-10 20-22 20H74c-12 0-22-8-22-20z" fill="${color}"/>
        <ellipse cx="100" cy="92" rx="48" ry="10" fill="${shade(color, -0.2)}"/>
        <ellipse cx="100" cy="94" rx="42" ry="7" fill="#2A1A12"/>
        <path d="M52 92h96v18H52z" fill="#E9E0D2" opacity=".15"/>
        ${[...Array(14)].map((_, i) => `<circle cx="${60 + ((i * 37) % 80)}" cy="${120 + ((i * 53) % 80)}" r="1.4" fill="#2A1A12" opacity=".5"/>`).join("")}`;
    },
    camp({ color }) {
      return `
        <path d="M146 118c20 0 22 38 0 40" fill="none" stroke="#2A211C" stroke-width="9" stroke-linecap="round"/>
        <path d="M56 100h90v92c0 14-10 22-24 22H80c-14 0-24-8-24-22z" fill="${color}"/>
        <ellipse cx="101" cy="100" rx="45" ry="9" fill="#2A211C"/>
        <ellipse cx="101" cy="101" rx="40" ry="6" fill="#1E1714"/>
        <text x="101" y="164" text-anchor="middle" font-size="13" fill="#16100D" font-family="'Big Shoulders Display', sans-serif" font-weight="800">C&amp;B</text>`;
    },
    glass({ color }) {
      const g = (x) => `
        <path d="M${x} 110h52l-6 92a6 6 0 0 1-6 6H${x + 12}a6 6 0 0 1-6-6z" fill="#E9E0D2" opacity=".18" stroke="#E9E0D2" stroke-opacity=".5"/>
        <path d="M${x + 2} 140h48l-4 62a6 6 0 0 1-6 6H${x + 12}a6 6 0 0 1-6-6z" fill="${color}"/>
        <path d="M${x + 2} 140h48l-1 14H${x + 3}z" fill="#E9E0D2" opacity=".75"/>`;
      return g(40) + g(108);
    },
    dripper({ color }) {
      return `
        <path d="M46 70h108l-34 84H80z" fill="${color}"/>
        <path d="M60 80l26 66M100 80v66M140 80l-26 66" stroke="${shade(color, -0.15)}" stroke-width="3"/>
        <rect x="70" y="152" width="60" height="10" rx="3" fill="${shade(color, -0.1)}"/>
        <rect x="58" y="162" width="84" height="8" rx="4" fill="${shade(color, -0.2)}"/>
        <path d="M150 84c16 4 16 30-6 34" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"/>
        <path d="M72 178h56v30c0 6-4 10-10 10H82c-6 0-10-4-10-10z" fill="#E9E0D2" opacity=".12"/>`;
    },
    kettle({ color }) {
      return `
        <path d="M60 104c0-14 12-22 40-22s40 8 40 22v84H60z" fill="${color}"/>
        <path d="M60 104c0-14 12-22 40-22s40 8 40 22" fill="none" stroke="#E9E0D2" stroke-opacity=".2" stroke-width="3"/>
        <path d="M62 170C30 166 26 112 16 84" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"/>
        <path d="M140 108c24 0 24 60 0 64" fill="none" stroke="#C7773F" stroke-width="10" stroke-linecap="round"/>
        <rect x="88" y="72" width="24" height="10" rx="4" fill="#C7773F"/>
        <rect x="50" y="188" width="100" height="18" rx="6" fill="#1E1714"/>
        <circle cx="128" cy="197" r="3" fill="#C7773F"/>`;
    },
    grinder({ color }) {
      return `
        <rect x="70" y="92" width="60" height="118" rx="10" fill="${color}"/>
        <rect x="70" y="150" width="60" height="10" fill="#1E1714" opacity=".5"/>
        <rect x="74" y="160" width="52" height="46" rx="6" fill="${shade(color, -0.12)}"/>
        <rect x="94" y="72" width="12" height="22" fill="#1E1714"/>
        <path d="M100 74H158" stroke="#1E1714" stroke-width="7" stroke-linecap="round"/>
        <rect x="150" y="52" width="16" height="30" rx="8" fill="#C7773F"/>
        <path d="M70 110h60M70 122h60" stroke="#E9E0D2" stroke-opacity=".25" stroke-width="2"/>`;
    },
    press({ color }) {
      return `
        <rect x="64" y="84" width="72" height="120" rx="6" fill="${color}"/>
        <rect x="64" y="84" width="72" height="120" rx="6" fill="url(#cb-glint)" opacity=".5"/>
        <rect x="60" y="74" width="80" height="12" rx="4" fill="#1E1714"/>
        <rect x="96" y="44" width="8" height="32" fill="#1E1714"/>
        <circle cx="100" cy="42" r="9" fill="#1E1714"/>
        <path d="M136 98h14a6 6 0 0 1 6 6v74a6 6 0 0 1-6 6h-14" fill="none" stroke="#1E1714" stroke-width="9"/>
        <rect x="58" y="202" width="84" height="8" rx="4" fill="#1E1714"/>`;
    },
    scale({ color }) {
      return `
        <rect x="34" y="138" width="132" height="22" rx="8" fill="${color}"/>
        <rect x="40" y="124" width="120" height="18" rx="6" fill="${shade(color, 0.06)}"/>
        <rect x="76" y="144" width="48" height="12" rx="2" fill="#0E0A08"/>
        <text x="100" y="154" text-anchor="middle" font-size="10" fill="#C7773F" font-family="monospace">18.0g</text>
        <circle cx="140" cy="150" r="3.5" fill="#C7773F"/>`;
    },
    filters({ color }) {
      return [0, 1, 2]
        .map((i) => `<path d="M${54 + i * 8} ${92 + i * 14}h${92 - i * 16}l-24 ${80 - i * 4}H${78 + i * 4}z" fill="${shade(color, -i * 0.06)}" stroke="#16100D" stroke-opacity=".2"/>`)
        .join("");
    },
  };

  CB.art = (product, { label = true } = {}) =>
    `<svg class="product-art" viewBox="0 0 200 240" role="img" aria-label="${label ? CB.esc(product.name) : ""}" ${label ? "" : 'aria-hidden="true"'}>
      <defs><linearGradient id="cb-glint" x1="0" x2="1"><stop offset=".15" stop-color="#fff" stop-opacity=".35"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      <ellipse cx="100" cy="224" rx="70" ry="7" fill="#000" opacity=".35"/>
      ${art[product.art.type](product.art)}
    </svg>`;

  /* Icons --------------------------------------------------------------- */

  CB.icon = {
    cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11h10.6L20 7H6.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="9" cy="19.5" r="1.4" fill="currentColor"/><circle cx="17" cy="19.5" r="1.4" fill="currentColor"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 21c1-4.5 4.2-6.5 8-6.5s7 2 8 6.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3.8" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="7" r="1.1" fill="currentColor"/></svg>',
  };

  /* Header, menu and footer --------------------------------------------- */

  const page = document.body.dataset.page || "";
  const navLinks = [
    { href: "shop.html", label: "Shop", id: "shop" },
    { href: "subscribe.html", label: "Subscribe", id: "subscribe" },
    { href: "workshops.html", label: "Workshops", id: "workshops" },
    { href: "index.html#roastery", label: "Roastery", id: "roastery" },
    { href: "index.html#visit", label: "Visit", id: "visit" },
  ];

  const headerSlot = CB.$("[data-site-header]");
  if (headerSlot) {
    headerSlot.outerHTML = `
      <p class="announce">Roasted every Tuesday and Friday. Free shipping on orders over ${CB.money(CB.settings.freeShippingOver)}.</p>
      <header class="site-header${document.body.dataset.overlayHeader ? " is-overlay" : ""}">
        <div class="header-inner">
          <a class="logo" href="index.html" aria-label="Copper & Bean, home">Copper<span aria-hidden="true">&amp;</span>Bean</a>
          <nav class="nav" aria-label="Main">
            <ul>${navLinks.map((l) => `<li><a href="${l.href}"${l.id === page ? ' aria-current="page"' : ""}>${l.label}</a></li>`).join("")}</ul>
          </nav>
          <div class="header-tools">
            <a class="tool tool-account" href="account.html" aria-label="Your account"${page === "account" ? ' aria-current="page"' : ""}>${CB.icon.user}<span>Account</span></a>
            <button class="tool tool-cart" type="button" data-open-cart aria-label="Open cart">${CB.icon.cart}<span>Cart</span><span class="cart-count" data-cart-count>(0)</span></button>
            <button class="tool tool-menu" type="button" data-open-menu aria-expanded="false" aria-controls="mobile-menu">Menu</button>
          </div>
        </div>
      </header>
      <div class="mobile-menu" id="mobile-menu" hidden>
        <nav aria-label="Mobile">
          <ul>
            <li><a href="index.html">Home</a></li>
            ${navLinks.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join("")}
            <li><a href="account.html">Account</a></li>
          </ul>
        </nav>
        <p class="mobile-menu-meta">${CB.contact.address.join("<br>")}<br><a href="tel:${CB.contact.phoneHref}">${CB.contact.phone}</a></p>
      </div>`;
  }

  const footerSlot = CB.$("[data-site-footer]");
  if (footerSlot) {
    footerSlot.outerHTML = `
      <footer class="site-footer">
        <div class="footer-card">
          <div class="footer-news">
            <h2 class="footer-news-title"><span>Sign up</span> <span>to our</span> <span>newsletter</span></h2>
            <form class="pill-form" data-newsletter novalidate>
              <label class="visually-hidden" for="footer-email">Email address</label>
              <input id="footer-email" type="email" placeholder="Your email" autocomplete="email" required>
              <button type="submit" aria-label="Sign up">${CB.icon.arrow}</button>
              <p class="pill-form-status" role="status"></p>
            </form>
          </div>
          <div class="footer-cols">
            <p class="footer-about">Copper &amp; Bean is a small-batch roastery and cafe in ${CB.esc(CB.settings.city)}. We roast twice a week and ship the same day.</p>
            <div>
              <h2 class="footer-heading">Explore</h2>
              <ul class="footer-links">
                <li><a href="shop.html">Shop</a></li>
                <li><a href="subscribe.html">Roaster's Choice</a></li>
                <li><a href="workshops.html">Workshops</a></li>
                <li><a href="account.html">Your account</a></li>
              </ul>
            </div>
            <div>
              <h2 class="footer-heading">Visit</h2>
              <ul class="footer-links">
                ${CB.contact.address.map((a) => `<li>${CB.esc(a)}</li>`).join("")}
                <li><a href="tel:${CB.contact.phoneHref}">${CB.contact.phone}</a></li>
                <li><a href="mailto:${CB.contact.email}">${CB.contact.email}</a></li>
              </ul>
            </div>
            <div>
              <h2 class="footer-heading">Follow</h2>
              <ul class="chips">
                <li><a href="${CB.contact.instagram}" target="_blank" rel="noopener">${CB.icon.instagram}@copperandbean</a></li>
              </ul>
            </div>
          </div>
          <p class="footer-wordmark" aria-hidden="true">Copper<span>&amp;</span>Bean</p>
        </div>
        <div class="footer-bottom">
          <p>&copy; ${new Date().getFullYear()} Copper &amp; Bean</p>
          <ul><li><a href="#">Shipping &amp; returns</a></li><li><a href="#">Privacy</a></li><li><a href="#">Terms</a></li></ul>
          <p class="footer-clock" data-clock>${CB.esc(CB.settings.city)}</p>
        </div>
      </footer>`;
  }

  // Footer clock: local time at the roastery, and whether the cafe is open.
  const clock = CB.$("[data-clock]");
  if (clock) {
    const tick = () => {
      const now = new Date();
      let time, day, minutes;
      try {
        const parts = Object.fromEntries(
          new Intl.DateTimeFormat("en-US", { timeZone: CB.settings.timeZone, weekday: "short", hour: "numeric", minute: "2-digit", hourCycle: "h23" })
            .formatToParts(now).map((p) => [p.type, p.value])
        );
        day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
        minutes = Number(parts.hour) * 60 + Number(parts.minute);
        time = CB.formatTime(`${parts.hour}:${parts.minute}`);
      } catch {
        day = now.getDay();
        minutes = now.getHours() * 60 + now.getMinutes();
        time = CB.formatTime(`${now.getHours()}:${now.getMinutes()}`);
      }
      const h = CB.hours.find((x) => x.day === day);
      const toMin = (s) => s.split(":").reduce((a, b) => a * 60 + Number(b), 0);
      const open = h && h.open && minutes >= toMin(h.open) && minutes < toMin(h.close);
      clock.innerHTML = `<span>${CB.esc(CB.settings.city)}</span><span>${time}</span><span class="clock-status${open ? " is-open" : ""}">${open ? "Cafe open" : "Cafe closed"}</span>`;
    };
    tick();
    setInterval(tick, 30000);
  }

  /* Smooth scrolling ---------------------------------------------------- */

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (window.Lenis && !reduceMotion) {
    CB.lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
    const raf = (t) => {
      CB.lenis.raf(t);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  CB.scrollTo = (target) => {
    const el = typeof target === "string" ? CB.$(target) : target;
    if (!el) return;
    const offset = -(CB.$(".site-header")?.offsetHeight || 0) - 12;
    if (CB.lenis) CB.lenis.scrollTo(el, { offset });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: reduceMotion ? "auto" : "smooth" });
  };

  // Same-page anchor links go through CB.scrollTo so they glide with Lenis.
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href*="#"]');
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash || url.hash.length < 2) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    history.pushState(null, "", url.hash);
    CB.scrollTo(target);
  });

  const lockScroll = (lock) => {
    document.documentElement.classList.toggle("is-locked", lock);
    if (CB.lenis) lock ? CB.lenis.stop() : CB.lenis.start();
  };

  /* Header state and mobile menu ---------------------------------------- */

  const header = CB.$(".site-header");
  const onScroll = () => header?.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const menu = CB.$("#mobile-menu");
  const menuBtn = CB.$("[data-open-menu]");
  const setMenu = (open) => {
    if (!menu) return;
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.textContent = open ? "Close" : "Menu";
    document.body.classList.toggle("menu-open", open);
    lockScroll(open);
    if (open) CB.$("a", menu)?.focus();
  };
  menuBtn?.addEventListener("click", () => setMenu(menu.hidden));
  menu?.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu && !menu.hidden) {
      setMenu(false);
      menuBtn.focus();
    }
  });

  /* Toast --------------------------------------------------------------- */

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  document.body.append(toast);
  let toastTimer;
  CB.toast = (message, { action = true } = {}) => {
    toast.innerHTML = `<span>${CB.esc(message)}</span>${action ? '<button type="button" data-open-cart>View cart</button>' : ""}`;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 4000);
  };

  /* Cart drawer --------------------------------------------------------- */

  const drawer = document.createElement("dialog");
  drawer.className = "drawer";
  drawer.setAttribute("aria-labelledby", "drawer-title");
  document.body.append(drawer);

  const lineThumb = (l) => {
    if (l.type === "product") return CB.art(CB.product(l.ref), { label: false });
    if (l.type === "ticket") return '<span class="thumb-label">Ticket</span>';
    return '<span class="thumb-label">Monthly</span>';
  };

  CB.renderLine = (l, { editable = true } = {}) => `
    <li class="line" data-key="${CB.esc(l.key)}">
      <div class="line-thumb line-thumb-${l.type}">${lineThumb(l)}</div>
      <div class="line-body">
        <p class="line-name">${CB.esc(l.name)}</p>
        <p class="line-option">${CB.esc(l.option)}</p>
        ${editable && l.type !== "subscription" ? `
          <div class="stepper" role="group" aria-label="Quantity for ${CB.esc(l.name)}">
            <button type="button" data-qty="-1" aria-label="Remove one">${CB.icon.minus}</button>
            <span aria-live="polite">${l.qty}</span>
            <button type="button" data-qty="1" aria-label="Add one"${l.max && l.qty >= l.max ? " disabled" : ""}>${CB.icon.plus}</button>
          </div>` : editable ? "" : `<p class="line-option">Qty ${l.qty}</p>`}
      </div>
      <div class="line-end">
        <p class="line-price">${CB.moneyExact(l.price * l.qty)}${l.type === "subscription" ? '<span class="per">per delivery</span>' : ""}</p>
        ${editable ? `<button type="button" class="line-remove" data-remove>Remove</button>` : ""}
      </div>
    </li>`;

  const renderDrawer = () => {
    const lines = CB.cart.lines();
    const subtotal = CB.cart.subtotal();
    const goal = CB.settings.freeShippingOver;
    const physical = CB.cart.hasPhysical();
    const left = Math.max(0, goal - subtotal);
    drawer.innerHTML = `
      <div class="drawer-head">
        <h2 id="drawer-title">Your cart</h2>
        <button type="button" class="icon-btn" data-close-drawer aria-label="Close cart">${CB.icon.close}</button>
      </div>
      ${lines.length ? `
        ${physical ? `<div class="ship-meter">
          <p>${left > 0 ? `Add <strong>${CB.moneyExact(left)}</strong> more for free shipping` : "You've unlocked <strong>free shipping</strong>"}</p>
          <div class="meter"><span style="width:${Math.min(100, (subtotal / goal) * 100)}%"></span></div>
        </div>` : ""}
        <ul class="lines" data-lenis-prevent>${lines.map((l) => CB.renderLine(l)).join("")}</ul>
        <div class="drawer-foot">
          <p class="drawer-total"><span>Subtotal</span><span>${CB.moneyExact(subtotal)}</span></p>
          <p class="drawer-note">Shipping and taxes are calculated at checkout.</p>
          <a class="btn btn-copper btn-block" href="checkout.html">Check out</a>
        </div>` : `
        <div class="drawer-empty">
          <p>Your cart is empty.</p>
          <a class="btn btn-copper" href="shop.html">Shop coffee</a>
          <a class="btn btn-ghost" href="subscribe.html">Start a subscription</a>
        </div>`}`;
  };

  CB.openCart = () => {
    renderDrawer();
    if (!drawer.open) {
      drawer.showModal();
      lockScroll(true);
    }
  };
  const closeDrawer = () => drawer.open && drawer.close();
  drawer.addEventListener("close", () => lockScroll(false));
  drawer.addEventListener("click", (e) => {
    if (e.target === drawer || e.target.closest("[data-close-drawer]")) return closeDrawer();
    const line = e.target.closest("[data-key]");
    if (!line) return;
    const key = line.dataset.key;
    const l = CB.cart.lines().find((x) => x.key === key);
    if (e.target.closest("[data-remove]")) CB.cart.setQty(key, 0);
    const step = e.target.closest("[data-qty]");
    if (step && l) CB.cart.setQty(key, l.qty + Number(step.dataset.qty));
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-cart]")) {
      e.preventDefault();
      if (productDialog.open) productDialog.close();
      CB.openCart();
    }
  });

  const updateCount = () => {
    CB.$$("[data-cart-count]").forEach((el) => (el.textContent = `(${CB.cart.count()})`));
    if (drawer.open) renderDrawer();
  };
  document.addEventListener("cart:change", updateCount);
  window.addEventListener("storage", (e) => e.key === "cb-cart" && updateCount());
  updateCount();

  /* Product dialog ------------------------------------------------------ */

  const productDialog = document.createElement("dialog");
  productDialog.className = "product-dialog";
  productDialog.setAttribute("aria-labelledby", "pd-title");
  document.body.append(productDialog);
  productDialog.addEventListener("close", () => lockScroll(false));
  productDialog.addEventListener("click", (e) => {
    if (e.target === productDialog || e.target.closest("[data-close-product]")) productDialog.close();
  });

  CB.openProduct = (id) => {
    const p = CB.product(id);
    if (!p) return;
    const coffee = p.category === "coffee";
    productDialog.innerHTML = `
      <button type="button" class="icon-btn pd-close" data-close-product aria-label="Close">${CB.icon.close}</button>
      <div class="pd-art">${CB.art(p)}</div>
      <form class="pd-body" data-lenis-prevent>
        ${p.badge ? `<p class="badge">${CB.esc(p.badge)}</p>` : ""}
        <h2 id="pd-title">${CB.esc(p.name)}</h2>
        ${coffee ? `<dl class="pd-facts">
          <div><dt>Origin</dt><dd>${CB.esc(p.origin)}</dd></div>
          <div><dt>Process</dt><dd>${CB.esc(p.process)}</dd></div>
          <div><dt>Roast</dt><dd>${CB.esc(p.roast)}</dd></div>
        </dl>
        <ul class="notes" aria-label="Tasting notes">${p.notes.map((n) => `<li>${CB.esc(n)}</li>`).join("")}</ul>` : ""}
        <p class="pd-desc">${CB.esc(p.description)}</p>
        ${p.sizes.length > 1 ? `<fieldset class="segmented">
          <legend>Size</legend>
          ${p.sizes.map((s, i) => `<label><input type="radio" name="size" value="${i}"${i === 0 ? " checked" : ""}><span>${s.label}<small>${CB.money(s.price)}</small></span></label>`).join("")}
        </fieldset>` : ""}
        ${coffee ? `<label class="field"><span>Grind</span>
          <select name="grind">${CB.grinds.map((g) => `<option>${g}</option>`).join("")}</select></label>` : ""}
        <div class="pd-buy">
          <div class="stepper stepper-lg" role="group" aria-label="Quantity">
            <button type="button" data-step="-1" aria-label="Fewer">${CB.icon.minus}</button>
            <output name="qty">1</output>
            <button type="button" data-step="1" aria-label="More">${CB.icon.plus}</button>
          </div>
          <button type="submit" class="btn btn-copper pd-add">Add to cart <span data-pd-price>${CB.money(p.sizes[0].price)}</span></button>
        </div>
        ${coffee ? `<p class="pd-sub">Drink it every month? <a href="subscribe.html">Roaster's Choice</a> from ${CB.money(CB.settings.subscription.pricePerBag)} a bag, shipped free.</p>` : ""}
      </form>`;

    const form = CB.$("form", productDialog);
    const qtyOut = form.elements.qty;
    const price = () => p.sizes[Number(form.elements.size?.value || 0)].price * Number(qtyOut.value);
    const refresh = () => (CB.$("[data-pd-price]", form).textContent = CB.money(price()));
    form.addEventListener("change", refresh);
    form.addEventListener("click", (e) => {
      const step = e.target.closest("[data-step]");
      if (!step) return;
      qtyOut.value = Math.max(1, Math.min(20, Number(qtyOut.value) + Number(step.dataset.step)));
      refresh();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      CB.cart.addProduct(p.id, {
        size: Number(form.elements.size?.value || 0),
        grind: form.elements.grind?.value || null,
        qty: Number(qtyOut.value),
      });
      productDialog.close();
    });

    if (!productDialog.open) {
      productDialog.showModal();
      lockScroll(true);
    }
  };

  /* Product cards (used on home and shop) -------------------------------- */

  CB.productCard = (p) => `
    <li class="product-card">
      <button type="button" class="pc-media" data-product="${p.id}" aria-label="View ${CB.esc(p.name)}">
        ${p.badge ? `<span class="badge">${CB.esc(p.badge)}</span>` : ""}
        ${CB.art(p, { label: false })}
      </button>
      <div class="pc-body">
        <h3><button type="button" data-product="${p.id}">${CB.esc(p.name)}</button></h3>
        <p class="pc-meta">${p.category === "coffee" ? CB.esc(p.notes.join(", ")) : CB.esc(p.sizes[0].label)}</p>
        <div class="pc-foot">
          <p class="pc-price">${p.sizes.length > 1 ? "From " : ""}${CB.money(p.sizes[0].price)}</p>
          <button type="button" class="pc-add" data-quick-add="${p.id}" aria-label="Add ${CB.esc(p.name)} to cart">${CB.icon.plus}<span>Add</span></button>
        </div>
      </div>
    </li>`;

  document.addEventListener("click", (e) => {
    const view = e.target.closest("[data-product]");
    if (view) return CB.openProduct(view.dataset.product);
    const add = e.target.closest("[data-quick-add]");
    if (add) {
      const p = CB.product(add.dataset.quickAdd);
      // Coffee needs a grind choice, so quick-add opens the product instead.
      if (p.category === "coffee") CB.openProduct(p.id);
      else CB.cart.addProduct(p.id);
    }
  });

  /* Newsletter (not connected yet) -------------------------------------- */

  document.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-newsletter]");
    if (!form) return;
    e.preventDefault();
    const input = CB.$("input", form);
    const status = CB.$(".pill-form-status", form);
    if (!input.checkValidity()) {
      status.textContent = "Enter an email address like name@example.com.";
      input.focus();
      return;
    }
    // TODO: send to the email provider (Klaviyo, Mailchimp...) when connected.
    status.textContent = "You're on the list. Look out for the next roast email.";
    form.reset();
  });

  /* Photos ---------------------------------------------------------------- */

  // <img data-photo="beans" data-w="900" data-h="600"> gets its Unsplash URL from CB.photos.
  CB.hydratePhotos = (root = document) =>
    CB.$$("img[data-photo]:not([src])", root).forEach((img) => {
      const id = CB.photos[img.dataset.photo];
      if (!id) return;
      const w = Number(img.dataset.w) || 1200;
      const h = img.dataset.h ? Number(img.dataset.h) : undefined;
      img.src = CB.photo(id, w, h);
      if (w >= 1200) img.srcset = [0.5, 1].map((f) => `${CB.photo(id, Math.round(w * f), h && Math.round(h * f))} ${Math.round(w * f)}w`).join(", ");
    });
  CB.hydratePhotos();
  CB.$$("[data-city]").forEach((el) => (el.textContent = CB.settings.city));

  // Hide photos that fail to load so their styled frame shows instead.
  CB.watchImages = (root = document) =>
    CB.$$("img", root).forEach((img) => {
      if (img.complete && img.naturalWidth === 0 && img.currentSrc) img.classList.add("is-broken");
      img.addEventListener("error", () => img.classList.add("is-broken"));
    });
  CB.watchImages();
})();
