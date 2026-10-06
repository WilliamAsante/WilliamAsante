(() => {
  "use strict";
  const { $, $$, esc } = CB;

  const sessions = CB.sessions({ days: 84 });
  const byDate = sessions.reduce((m, s) => ((m[s.date] ||= []).push(s), m), {});
  const params = new URLSearchParams(location.search);

  const state = {
    filter: "all",
    month: null, // first day of the month on screen
    date: null,
    sessionId: null,
    qty: 1,
  };

  /* Workshop cards ------------------------------------------------------ */
  $("[data-workshops]").innerHTML = CB.workshops
    .map((w) => {
      const next = sessions.find((s) => s.workshopId === w.id && s.seatsLeft > 0);
      return `
        <li class="workshop-card">
          <figure class="frame"><img data-photo="${w.photo}" data-w="800" data-h="560" alt="" loading="lazy"></figure>
          <div class="workshop-body">
            <h3>${esc(w.name)}</h3>
            <p>${esc(w.description)}</p>
            <ul class="workshop-facts">
              <li>${esc(w.duration)}</li>
              <li>Up to ${w.capacity} people</li>
              <li>${w.days.map((d) => ["Sundays", "", "", "", "", "", "Saturdays"][d]).join(" &amp; ")}, ${CB.formatTime(w.time)}</li>
            </ul>
            <div class="workshop-foot">
              <p class="workshop-price">${CB.money(w.price)} <small>per person</small></p>
              <button type="button" class="btn btn-ghost btn-small" data-see="${w.id}">${next ? "See dates" : "Join waitlist"}</button>
            </div>
          </div>
        </li>`;
    })
    .join("");
  CB.hydratePhotos();
  CB.watchImages();

  /* Filter chips -------------------------------------------------------- */
  const filterRow = $("[data-filter]");
  const renderFilter = () => {
    filterRow.innerHTML = [{ id: "all", name: "All workshops" }, ...CB.workshops]
      .map((w) => `<button type="button" class="chip" data-f="${w.id}" aria-pressed="${state.filter === w.id}">${esc(w.name)}</button>`)
      .join("");
  };
  filterRow.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-f]");
    if (!chip) return;
    setFilter(chip.dataset.f);
  });

  const visible = (s) => state.filter === "all" || s.workshopId === state.filter;
  const daySessions = (date) => (byDate[date] || []).filter(visible);

  const setFilter = (id) => {
    state.filter = id;
    const first = sessions.find((s) => visible(s) && s.seatsLeft > 0) || sessions.find(visible);
    if (first) {
      state.date = first.date;
      state.month = monthStart(CB.fromIso(first.date));
    }
    state.sessionId = null;
    renderFilter();
    renderCalendar();
    renderDay();
  };

  $("[data-workshops]").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-see]");
    if (!btn) return;
    setFilter(btn.dataset.see);
    CB.scrollTo("#book");
  });

  /* Calendar ------------------------------------------------------------ */
  const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const today = new Date();
  const firstMonth = monthStart(today);
  const lastMonth = monthStart(CB.fromIso(sessions[sessions.length - 1]?.date || CB.iso(today)));

  const calBody = $("[data-cal-body]");
  const renderCalendar = () => {
    const m = state.month;
    $("[data-month-label]").textContent = m.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    $('[data-month="-1"]').disabled = m <= firstMonth;
    $('[data-month="1"]').disabled = m >= lastMonth;

    const lead = (m.getDay() + 6) % 7; // Monday first
    const daysIn = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push("<td></td>");
    for (let day = 1; day <= daysIn; day++) {
      const d = new Date(m.getFullYear(), m.getMonth(), day);
      const iso = CB.iso(d);
      const list = daySessions(iso);
      const open = list.filter((s) => s.seatsLeft > 0).length;
      const label = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      if (!list.length) {
        cells.push(`<td><span class="cal-day${iso === CB.iso(today) ? " is-today" : ""}">${day}</span></td>`);
      } else {
        cells.push(`<td><button type="button" class="cal-day has-sessions${open ? "" : " is-full"}${iso === CB.iso(today) ? " is-today" : ""}" data-date="${iso}" aria-pressed="${iso === state.date}" aria-label="${label}: ${open ? `${open} ${open === 1 ? "workshop" : "workshops"} with seats` : "sold out"}">${day}<span class="cal-dots" aria-hidden="true">${list.map((s) => `<i class="${s.seatsLeft ? "" : "full"}"></i>`).join("")}</span></button></td>`);
      }
    }
    while (cells.length % 7) cells.push("<td></td>");
    let rows = "";
    for (let i = 0; i < cells.length; i += 7) rows += `<tr>${cells.slice(i, i + 7).join("")}</tr>`;
    calBody.innerHTML = rows;
  };

  $$("[data-month]").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() + Number(btn.dataset.month), 1);
      renderCalendar();
    })
  );
  calBody.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-date]");
    if (!btn) return;
    state.date = btn.dataset.date;
    state.sessionId = null;
    state.qty = 1;
    renderCalendar();
    renderDay();
    if (window.matchMedia("(max-width: 860px)").matches) CB.scrollTo("[data-day-panel]");
  });

  /* Day panel and booking ----------------------------------------------- */
  const panel = $("[data-day-panel]");
  const renderDay = () => {
    const list = state.date ? daySessions(state.date) : [];
    if (!list.length) {
      panel.innerHTML = `<p class="day-empty">Choose a highlighted day to see times.</p>`;
      return;
    }
    const chosen = list.find((s) => s.id === state.sessionId);
    panel.innerHTML = `
      <h3 class="day-title">${CB.formatDate(state.date, { weekday: "long", month: "long", day: "numeric" })}</h3>
      <ul class="slot-list">
        ${list
          .map((s) => {
            const w = CB.workshop(s.workshopId);
            return `
            <li>
              <button type="button" class="slot${s.seatsLeft ? "" : " is-full"}" data-session="${s.id}" aria-pressed="${s.id === state.sessionId}"${s.seatsLeft ? "" : " disabled"}>
                <span class="slot-time">${CB.formatTime(s.time)}</span>
                <span class="slot-name">${esc(w.name)}<small>${esc(w.duration)}</small></span>
                <span class="slot-seats">${s.seatsLeft ? `${s.seatsLeft} of ${s.capacity} left` : "Sold out"}</span>
              </button>
            </li>`;
          })
          .join("")}
      </ul>
      ${chosen ? bookingForm(chosen) : `<p class="day-hint">Choose a time to book.</p>`}`;
  };

  const bookingForm = (s) => {
    const w = CB.workshop(s.workshopId);
    const inCart = CB.cart.lines().find((l) => l.key === `t:${s.id}`)?.qty || 0;
    const max = Math.max(0, s.seatsLeft - inCart);
    state.qty = Math.min(Math.max(1, state.qty), Math.max(1, max));
    return `
      <div class="book-box">
        <div class="book-row">
          <div>
            <p class="book-name">${esc(w.name)}</p>
            <p class="book-when">${CB.formatDate(s.date)}, ${CB.formatTime(s.time)} for ${esc(w.duration)}</p>
          </div>
          <div class="stepper stepper-lg" role="group" aria-label="Number of seats">
            <button type="button" data-seat="-1" aria-label="Fewer seats"${state.qty <= 1 ? " disabled" : ""}>${CB.icon.minus}</button>
            <output aria-live="polite">${state.qty}</output>
            <button type="button" data-seat="1" aria-label="More seats"${state.qty >= max ? " disabled" : ""}>${CB.icon.plus}</button>
          </div>
        </div>
        ${inCart ? `<p class="book-note">You already have ${inCart} ${inCart === 1 ? "seat" : "seats"} for this session in your cart.</p>` : ""}
        ${max ? `
          <div class="book-actions">
            <button type="button" class="btn btn-copper" data-book="checkout">Book ${state.qty} ${state.qty === 1 ? "seat" : "seats"}, ${CB.money(w.price * state.qty)}</button>
            <button type="button" class="btn btn-ghost" data-book="cart">Add to cart</button>
          </div>` : `<p class="book-note">All remaining seats are in your cart. <a href="checkout.html">Check out</a></p>`}
      </div>`;
  };

  panel.addEventListener("click", (e) => {
    const slot = e.target.closest("[data-session]");
    if (slot) {
      state.sessionId = slot.dataset.session;
      state.qty = 1;
      renderDay();
      return;
    }
    const seat = e.target.closest("[data-seat]");
    if (seat) {
      state.qty += Number(seat.dataset.seat);
      renderDay();
      return;
    }
    const book = e.target.closest("[data-book]");
    if (book) {
      const s = sessions.find((x) => x.id === state.sessionId);
      CB.cart.addTicket(s, state.qty);
      if (book.dataset.book === "checkout") location.href = "checkout.html";
      else renderDay();
    }
  });

  /* Start --------------------------------------------------------------- */
  renderFilter();
  const linked = sessions.find((s) => s.id === params.get("session"));
  const start = linked || sessions.find((s) => s.seatsLeft > 0) || sessions[0];
  if (start) {
    state.date = start.date;
    state.month = monthStart(CB.fromIso(start.date));
    if (linked && linked.seatsLeft) state.sessionId = linked.id;
  } else {
    state.month = firstMonth;
  }
  renderCalendar();
  renderDay();
  if (linked) setTimeout(() => CB.scrollTo("#book"), 300);
})();
