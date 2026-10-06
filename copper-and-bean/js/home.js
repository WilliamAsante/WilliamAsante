(() => {
  "use strict";
  const { $, $$, esc } = CB;

  /* Bestsellers ---------------------------------------------------------- */
  $("[data-bestsellers]").innerHTML = CB.products.filter((p) => p.featured).slice(0, 4).map(CB.productCard).join("");

  /* Origins ------------------------------------------------------------- */
  const originList = $("[data-origins]");
  originList.innerHTML = CB.origins
    .map((o) => {
      const p = CB.product(o.product);
      return `
        <li>
          <button type="button" class="origin" data-product="${o.product}">
            <span class="origin-disc" style="--tint:${p.art.color}"><span>${esc(o.country.slice(0, 3))}</span></span>
            <span class="origin-country">${esc(o.country)}</span>
            <span class="origin-region">${esc(o.region)}</span>
            <span class="origin-meta">${esc(o.altitude)}</span>
            <span class="origin-notes">${esc(o.notes)}</span>
          </button>
        </li>`;
    })
    .join("");
  $$("[data-scroll]").forEach((btn) =>
    btn.addEventListener("click", () =>
      originList.scrollBy({ left: Number(btn.dataset.scroll) * originList.clientWidth * 0.8, behavior: "smooth" })
    )
  );

  /* Subscription price -------------------------------------------------- */
  $$("[data-sub-price]").forEach((el) => (el.textContent = CB.money(CB.settings.subscription.pricePerBag)));

  /* Upcoming workshops -------------------------------------------------- */
  const upcoming = CB.sessions({ days: 28 }).filter((s) => s.seatsLeft > 0).slice(0, 4);
  $("[data-upcoming]").innerHTML = upcoming.length
    ? upcoming
        .map((s) => {
          const w = CB.workshop(s.workshopId);
          const d = CB.fromIso(s.date);
          return `
            <li class="session-row">
              <p class="session-date"><span>${d.toLocaleDateString("en-US", { weekday: "short" })}</span><strong>${d.getDate()}</strong><span>${d.toLocaleDateString("en-US", { month: "short" })}</span></p>
              <div class="session-main">
                <h3>${esc(w.name)}</h3>
                <p>${CB.formatTime(s.time)}, ${esc(w.duration)}. ${s.seatsLeft <= 3 ? `<strong class="low">Only ${s.seatsLeft} ${s.seatsLeft === 1 ? "seat" : "seats"} left</strong>` : `${s.seatsLeft} seats left`}</p>
              </div>
              <p class="session-price">${CB.money(w.price)}</p>
              <a class="btn btn-ghost btn-small" href="workshops.html?session=${encodeURIComponent(s.id)}">Book</a>
            </li>`;
        })
        .join("")
    : `<li class="empty">New dates are coming soon. <a href="workshops.html">See all workshops</a>.</li>`;

  /* Visit --------------------------------------------------------------- */
  $("[data-address]").innerHTML = CB.contact.address.map(esc).join("<br>");
  const today = new Date().getDay();
  $("[data-hours]").innerHTML = `<tbody>${CB.hours
    .map((h) => `<tr${h.day === today ? ' class="is-today"' : ""}><th scope="row">${h.label}${h.day === today ? ' <span class="today">Today</span>' : ""}</th><td>${h.open ? `${CB.formatTime(h.open)} to ${CB.formatTime(h.close)}` : "Closed"}</td></tr>`)
    .join("")}</tbody>`;
  $("[data-directions]").href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CB.contact.address.join(", "))}`;
  const phone = $("[data-phone]");
  phone.href = `tel:${CB.contact.phoneHref}`;
  phone.textContent = CB.contact.phone;

  /* Roast curve --------------------------------------------------------- */
  // A typical house-espresso roast: [minutes, bean temperature °C].
  const points = [
    [0, 200], [0.4, 150], [0.8, 112], [1.25, 95], [2, 106], [3, 126], [4.5, 150],
    [5.5, 162], [6.5, 174], [7.5, 186], [8.5, 196], [9.5, 204], [10.5, 210],
  ];
  const X = (t) => 52 + (t / 12) * 528;
  const Y = (c) => 340 - ((c - 80) / 150) * 320;
  const svg = $("[data-curve]");
  const d = points.map(([t, c], i) => `${i ? "L" : "M"}${X(t).toFixed(1)} ${Y(c).toFixed(1)}`).join(" ");
  $(".curve-line", svg).setAttribute("d", d);
  $(".curve-ghost", svg).setAttribute("d", d);

  const bands = { drying: [1.25, 4.5], browning: [4.5, 8.5], development: [8.5, 10.5] };
  for (const [name, [a, b]] of Object.entries(bands)) {
    const r = $(`[data-band="${name}"]`, svg);
    r.setAttribute("x", X(a));
    r.setAttribute("width", X(b) - X(a));
  }

  const grid = $(".curve-grid", svg);
  let g = "";
  for (let c = 100; c <= 220; c += 40) g += `<line x1="52" x2="580" y1="${Y(c)}" y2="${Y(c)}"/><text x="44" y="${Y(c) + 4}" text-anchor="end">${c}°</text>`;
  for (let t = 0; t <= 12; t += 2) g += `<text x="${X(t)}" y="364" text-anchor="middle">${t}:00</text>`;
  grid.innerHTML = g;

  const markers = [
    { t: 0, c: 200, label: "Charge" },
    { t: 1.25, c: 95, label: "Turning point" },
    { t: 4.5, c: 150, label: "Yellow" },
    { t: 8.5, c: 196, label: "First crack" },
    { t: 10.5, c: 210, label: "Drop" },
  ];
  $(".curve-markers", svg).innerHTML = markers
    .map((m, i) => `<g data-marker="${i}"><circle cx="${X(m.t)}" cy="${Y(m.c)}" r="4"/><text x="${X(m.t) + (i === 4 ? -8 : 8)}" y="${Y(m.c) - 10}" text-anchor="${i === 4 ? "end" : "start"}">${m.label}</text></g>`)
    .join("");

  // Each step reveals the curve up to a point in the roast.
  const stepEnd = [{ t: 1.25, phase: "Charge" }, { t: 4.5, phase: "Drying" }, { t: 8.5, phase: "Browning" }, { t: 10.5, phase: "First crack" }, { t: 10.5, phase: "Drop" }];
  const line = $(".curve-line", svg);
  const dot = $(".curve-dot", svg);
  const length = line.getTotalLength();
  line.style.strokeDasharray = length;

  const tempAt = (t) => {
    for (let i = 1; i < points.length; i++) {
      const [t0, c0] = points[i - 1];
      const [t1, c1] = points[i];
      if (t <= t1) return c0 + ((t - t0) / (t1 - t0)) * (c1 - c0);
    }
    return points[points.length - 1][1];
  };
  // Length along the path up to time t, by sampling.
  const lengthAt = (t) => {
    let lo = 0, hi = length;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (line.getPointAtLength(mid).x < X(t)) lo = mid;
      else hi = mid;
    }
    return hi;
  };

  const readTime = $("[data-readout-time]");
  const readTemp = $("[data-readout-temp]");
  const readPhase = $("[data-readout-phase]");
  const steps = $$(".roast-step");
  let current = -1;

  const setStep = (i) => {
    if (i === current) return;
    current = i;
    const { t, phase } = stepEnd[i];
    const len = lengthAt(t);
    line.style.strokeDashoffset = length - len;
    const pt = line.getPointAtLength(len);
    dot.setAttribute("cx", pt.x);
    dot.setAttribute("cy", pt.y);
    readTime.textContent = `${Math.floor(t)}:${String(Math.round((t % 1) * 60)).padStart(2, "0")}`;
    readTemp.textContent = `${Math.round(tempAt(t))}°C`;
    readPhase.textContent = phase;
    steps.forEach((s, j) => s.classList.toggle("is-active", j === i));
    $$("[data-marker]", svg).forEach((m) => m.classList.toggle("is-on", Number(m.dataset.marker) <= i));
    $$("[data-band]", svg).forEach((b, j) => b.classList.toggle("is-on", j < i));
  };
  setStep(0);

  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && setStep(Number(e.target.dataset.step))),
    { rootMargin: "-45% 0px -45% 0px" }
  );
  steps.forEach((s) => io.observe(s));

  CB.watchImages();
})();
