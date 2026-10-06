/* Customer portal. Front-end only: data lives in this browser.
   With Stripe, most of this maps onto the Billing API (pause_collection,
   subscription updates, customer address) or the hosted Customer Portal. */

(() => {
  "use strict";
  const { $, $$, esc } = CB;
  const root = $("[data-account]");
  let tab = new URLSearchParams(location.search).get("tab") || "subscription";

  const addDays = (iso, n) => {
    const d = CB.fromIso(iso);
    d.setDate(d.getDate() + n);
    return CB.iso(d);
  };
  const todayIso = () => CB.iso(new Date());
  const long = (iso) => CB.formatDate(iso, { weekday: "long", month: "long", day: "numeric" });
  const addressText = (a) => (a ? [a.line1, a.line2, `${a.city}, ${a.state} ${a.zip}`].filter(Boolean).map(esc).join("<br>") : "No address yet");

  /* Signed out ---------------------------------------------------------- */
  const renderSignIn = () => {
    root.innerHTML = `
      <div class="signin">
        <p class="eyebrow">[ Your account ]</p>
        <h1 id="page-title" class="h-display">Sign in</h1>
        <p>Manage your subscription, see your orders and check your workshop bookings. We'll email you a sign-in link, so there's no password to remember.</p>
        <form class="pill-form pill-form-light" data-signin novalidate>
          <label class="visually-hidden" for="signin-email">Email address</label>
          <input id="signin-email" type="email" autocomplete="email" placeholder="Your email" required>
          <button type="submit" aria-label="Send sign-in link">${CB.icon.arrow}</button>
          <p class="pill-form-status" role="status"></p>
        </form>
        <p class="signin-demo">Showing the client? <button type="button" class="link" data-demo>Open a demo account</button> with a subscription, an order and a workshop booking.</p>
      </div>`;
  };

  const loadDemo = () => {
    const address = { line1: "48 Kiln Road", line2: "", city: "Your City", state: "ST", zip: "00000" };
    const next = new Date();
    next.setDate(next.getDate() + 6);
    CB.store.account = { email: "alex@example.com", name: "Alex Rivera", address };
    CB.store.subscription = {
      id: "SUB-DEMO1", status: "active",
      plan: { grind: "Pour-over", style: "Bright and fruity", bags: 2, frequency: 4 },
      price: 2 * CB.settings.subscription.pricePerBag,
      nextDelivery: CB.iso(next), startedAt: addDays(todayIso(), -60), address,
    };
    const s = CB.sessions().find((x) => x.seatsLeft >= 2);
    if (s && !CB.store.bookings.length) {
      CB.store.bookings = [{ id: "BK-DEMO1", orderId: "CB-DEMO1", sessionId: s.id, workshopId: s.workshopId, date: s.date, time: s.time, qty: 2 }];
    }
    if (!CB.store.orders.length) {
      CB.store.orders = [{
        id: "CB-DEMO1", placedAt: new Date(Date.now() - 12 * 864e5).toISOString(), email: "alex@example.com", name: "Alex Rivera",
        lines: [
          { type: "product", ref: "stoneware-mug", name: "Stoneware Mug", option: "12 oz", price: 28, qty: 2 },
          { type: "product", ref: "ethiopia-guji", name: "Ethiopia Guji", option: "340 g, Pour-over", price: 22, qty: 1 },
        ],
        subtotal: 78, shipping: 0, total: 78, method: "standard", address,
      }];
    }
  };

  /* Signed in ----------------------------------------------------------- */
  const tabs = [
    { id: "subscription", label: "Subscription" },
    { id: "workshops", label: "Workshops" },
    { id: "orders", label: "Orders" },
    { id: "details", label: "Details" },
  ];

  const renderDashboard = () => {
    const acc = CB.store.account;
    root.innerHTML = `
      <div class="account-head">
        <div>
          <p class="eyebrow">[ ${esc(acc.email)} ]</p>
          <h1 id="page-title" class="h-display">Hi, ${esc((acc.name || "there").split(" ")[0])}</h1>
        </div>
        <button type="button" class="btn btn-ghost btn-small" data-signout>Sign out</button>
      </div>
      <div class="account-tabs" role="tablist" aria-label="Account sections">
        ${tabs.map((t) => `<button type="button" role="tab" id="tab-${t.id}" aria-controls="panel-${t.id}" aria-selected="${t.id === tab}" tabindex="${t.id === tab ? 0 : -1}">${t.label}</button>`).join("")}
      </div>
      ${tabs.map((t) => `<div class="account-panel" role="tabpanel" id="panel-${t.id}" aria-labelledby="tab-${t.id}" tabindex="0"${t.id === tab ? "" : " hidden"}></div>`).join("")}`;
    renderSubscription();
    renderWorkshops();
    renderOrders();
    renderDetails();
  };

  /* Subscription panel -------------------------------------------------- */
  const planOptions = {
    grind: CB.grinds,
    style: ["Roaster's pick", "Bright and fruity", "Sweet and chocolatey", "Dark and bold"],
    bags: [1, 2, 3],
    frequency: [2, 4],
  };
  const planLabels = { bags: (v) => `${v} ${v === 1 ? "bag" : "bags"}`, frequency: (v) => `Every ${v} weeks` };

  const renderSubscription = (mode = null) => {
    const panel = $("#panel-subscription");
    const sub = CB.store.subscription;
    if (!sub) {
      panel.innerHTML = `
        <div class="empty-state">
          <p>You don't have a subscription yet.</p>
          <a class="btn btn-copper" href="subscribe.html">Start Roaster's Choice</a>
        </div>`;
      return;
    }
    // A pause that has run out turns back into an active plan.
    if (sub.status === "paused" && sub.pausedUntil <= todayIso()) {
      sub.status = "active";
      delete sub.pausedUntil;
      CB.store.subscription = sub;
    }

    const status = { active: "Active", paused: "Paused", cancelled: "Cancelled" }[sub.status];
    const upcoming = sub.status === "cancelled" ? [] : [0, 1, 2].map((i) => addDays(sub.nextDelivery, i * sub.plan.frequency * 7));

    panel.innerHTML = `
      <div class="sub-dash">
        <div class="sub-card">
          <div class="sub-card-head">
            <h2>Roaster's Choice</h2>
            <span class="status status-${sub.status}">${status}</span>
          </div>
          <p class="sub-next">
            ${sub.status === "active" ? `Next delivery ships <strong>${long(sub.nextDelivery)}</strong>` : ""}
            ${sub.status === "paused" ? `Paused until <strong>${long(sub.pausedUntil)}</strong>. Deliveries restart after that.` : ""}
            ${sub.status === "cancelled" ? "Your subscription is cancelled. No more deliveries will ship." : ""}
          </p>
          <dl class="summary-list">
            <div><dt>Plan</dt><dd>${esc(CB.planSummary(sub.plan))}</dd></div>
            <div><dt>Price</dt><dd>${CB.moneyExact(sub.price)} per delivery, shipping included</dd></div>
            <div><dt>Ships to</dt><dd>${addressText(sub.address)}</dd></div>
          </dl>
          ${upcoming.length ? `<ol class="timeline" aria-label="Upcoming deliveries">${upcoming.map((d, i) => `<li${i === 0 ? ' class="is-next"' : ""}><span>${CB.formatDate(d)}</span></li>`).join("")}</ol>` : ""}
        </div>

        <div class="sub-actions">
          ${sub.status === "active" ? `
            <button type="button" class="action" data-act="skip"><strong>Skip next delivery</strong><span>Moves it to ${CB.formatDate(addDays(sub.nextDelivery, sub.plan.frequency * 7))}</span></button>
            <button type="button" class="action" data-act="pause"><strong>Pause deliveries</strong><span>For 1 to 3 months</span></button>` : ""}
          ${sub.status === "paused" ? `<button type="button" class="action action-copper" data-act="resume"><strong>Resume now</strong><span>Next box ships within 3 days</span></button>` : ""}
          ${sub.status !== "cancelled" ? `
            <button type="button" class="action" data-act="plan"><strong>Change plan</strong><span>Grind, coffee style, bags or frequency</span></button>
            <button type="button" class="action" data-act="address"><strong>Update shipping address</strong><span>Applies from the next delivery</span></button>
            <button type="button" class="action action-quiet" data-act="cancel"><strong>Cancel subscription</strong><span>No fees, restart any time</span></button>` : `
            <button type="button" class="action action-copper" data-act="restart"><strong>Restart subscription</strong><span>Same plan, first box ships within 3 days</span></button>`}
        </div>
      </div>
      <div class="sub-editor" data-editor>${mode ? editor(mode, sub) : ""}</div>`;
    if (mode) $("[data-editor] input, [data-editor] select", panel)?.focus();
  };

  const editor = (mode, sub) => {
    if (mode === "pause") {
      return `
        <form class="edit-card" data-form="pause">
          <h3>Pause deliveries</h3>
          <fieldset class="segmented">
            <legend>Pause for</legend>
            ${[1, 2, 3].map((m) => `<label><input type="radio" name="months" value="${m}"${m === 1 ? " checked" : ""}><span>${m} ${m === 1 ? "month" : "months"}</span></label>`).join("")}
          </fieldset>
          <div class="actions"><button class="btn btn-copper" type="submit">Pause</button><button class="btn btn-ghost" type="button" data-act="close">Keep it running</button></div>
        </form>`;
    }
    if (mode === "plan") {
      return `
        <form class="edit-card" data-form="plan">
          <h3>Change plan</h3>
          <div class="field-row">
            ${Object.entries(planOptions).map(([k, opts]) => `
              <label class="field"><span>${{ grind: "Grind", style: "Coffee", bags: "Bags", frequency: "Delivery" }[k]}</span>
                <select name="${k}">${opts.map((o) => `<option value="${esc(o)}"${String(o) === String(sub.plan[k]) ? " selected" : ""}>${esc(planLabels[k] ? planLabels[k](o) : o)}</option>`).join("")}</select>
              </label>`).join("")}
          </div>
          <p class="edit-note" data-plan-price></p>
          <div class="actions"><button class="btn btn-copper" type="submit">Save plan</button><button class="btn btn-ghost" type="button" data-act="close">Cancel</button></div>
        </form>`;
    }
    if (mode === "address") {
      const a = sub.address || {};
      const f = (n, l, v, attrs = "") => `<label class="field"><span>${l}</span><input name="${n}" value="${esc(v || "")}" ${attrs}></label>`;
      return `
        <form class="edit-card" data-form="address">
          <h3>Shipping address</h3>
          ${f("line1", "Street address", a.line1, 'autocomplete="address-line1" required')}
          ${f("line2", "Apartment, suite (optional)", a.line2, 'autocomplete="address-line2"')}
          <div class="field-row">
            ${f("city", "City", a.city, 'autocomplete="address-level2" required')}
            ${f("state", "State", a.state, 'autocomplete="address-level1" required')}
            ${f("zip", "ZIP code", a.zip, 'autocomplete="postal-code" required pattern="[0-9]{5}(-[0-9]{4})?"')}
          </div>
          <p class="field-error" data-address-error></p>
          <div class="actions"><button class="btn btn-copper" type="submit">Save address</button><button class="btn btn-ghost" type="button" data-act="close">Cancel</button></div>
        </form>`;
    }
    if (mode === "cancel") {
      return `
        <form class="edit-card" data-form="cancel">
          <h3>Cancel your subscription?</h3>
          <p>If you're going away or have too much coffee, you can <button type="button" class="link" data-act="pause">pause instead</button> or <button type="button" class="link" data-act="plan">switch to every 4 weeks</button>.</p>
          <label class="field"><span>Mind telling us why? <span class="optional">(optional)</span></span>
            <select name="reason"><option value="">Choose a reason</option><option>Too much coffee</option><option>Too expensive</option><option>Didn't like the coffees</option><option>Moving or traveling</option><option>Something else</option></select>
          </label>
          <div class="actions"><button class="btn btn-danger" type="submit">Cancel subscription</button><button class="btn btn-ghost" type="button" data-act="close">Keep my subscription</button></div>
        </form>`;
    }
    return "";
  };

  root.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act) return;
    const sub = CB.store.subscription;
    if (act === "skip") {
      sub.nextDelivery = addDays(sub.nextDelivery, sub.plan.frequency * 7);
      CB.store.subscription = sub;
      renderSubscription();
      CB.toast(`Skipped. Your next delivery ships ${CB.formatDate(sub.nextDelivery)}.`, { action: false });
    } else if (act === "resume" || act === "restart") {
      sub.status = "active";
      delete sub.pausedUntil;
      sub.nextDelivery = addDays(todayIso(), 3);
      CB.store.subscription = sub;
      renderSubscription();
      CB.toast(act === "resume" ? "Welcome back. Your subscription is active again." : "Your subscription has restarted.", { action: false });
    } else if (act === "close") {
      renderSubscription();
    } else {
      renderSubscription(act);
    }
  });

  root.addEventListener("change", (e) => {
    const form = e.target.closest('[data-form="plan"]');
    if (!form) return;
    const bags = Number(form.elements.bags.value);
    $("[data-plan-price]", form).textContent = `New price: ${CB.moneyExact(bags * CB.settings.subscription.pricePerBag)} per delivery.`;
  });

  root.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-form]");
    if (!form) return;
    e.preventDefault();
    const sub = CB.store.subscription;
    const kind = form.dataset.form;
    if (kind === "pause") {
      const months = Number(form.elements.months.value);
      const until = new Date();
      until.setMonth(until.getMonth() + months);
      sub.status = "paused";
      sub.pausedUntil = CB.iso(until);
      sub.nextDelivery = sub.pausedUntil;
      CB.toast(`Paused until ${CB.formatDate(sub.pausedUntil)}.`, { action: false });
    } else if (kind === "plan") {
      const f = form.elements;
      sub.plan = { grind: f.grind.value, style: f.style.value, bags: Number(f.bags.value), frequency: Number(f.frequency.value) };
      sub.price = sub.plan.bags * CB.settings.subscription.pricePerBag;
      CB.toast("Plan updated. Changes apply from your next delivery.", { action: false });
    } else if (kind === "address") {
      const err = $("[data-address-error]", form);
      if (!form.checkValidity()) {
        err.textContent = "Fill in street, city, state and a 5-digit ZIP code.";
        $(":invalid", form)?.focus();
        return;
      }
      const f = form.elements;
      sub.address = { line1: f.line1.value.trim(), line2: f.line2.value.trim(), city: f.city.value.trim(), state: f.state.value.trim(), zip: f.zip.value.trim() };
      CB.store.account = { ...CB.store.account, address: sub.address };
      CB.toast("Address saved.", { action: false });
    } else if (kind === "cancel") {
      sub.status = "cancelled";
      CB.toast("Your subscription is cancelled.", { action: false });
    }
    CB.store.subscription = sub;
    renderSubscription();
    if (kind === "address") renderDetails();
  });

  /* Workshops panel ----------------------------------------------------- */
  const renderWorkshops = () => {
    const panel = $("#panel-workshops");
    const now = todayIso();
    const bookings = CB.store.bookings.filter((b) => b.date >= now).sort((a, b) => a.date.localeCompare(b.date));
    panel.innerHTML = bookings.length
      ? `<ul class="booking-list">${bookings
          .map((b) => {
            const w = CB.workshop(b.workshopId);
            const start = CB.fromIso(b.date);
            const [h, m] = b.time.split(":");
            start.setHours(h, m);
            const canCancel = start - Date.now() > 48 * 36e5;
            return `
              <li class="booking-item">
                <p class="session-date"><span>${start.toLocaleDateString("en-US", { weekday: "short" })}</span><strong>${start.getDate()}</strong><span>${start.toLocaleDateString("en-US", { month: "short" })}</span></p>
                <div>
                  <h3>${esc(w.name)}</h3>
                  <p>${CB.formatTime(b.time)}, ${esc(w.duration)}. ${b.qty} ${b.qty === 1 ? "seat" : "seats"}.</p>
                </div>
                ${canCancel ? `<button type="button" class="btn btn-ghost btn-small" data-cancel-booking="${b.id}">Cancel booking</button>` : `<p class="booking-note">Within 48 hours. <a href="mailto:${CB.contact.email}">Email us</a> to change.</p>`}
              </li>`;
          })
          .join("")}</ul>`
      : `<div class="empty-state"><p>No upcoming workshops.</p><a class="btn btn-copper" href="workshops.html">See workshop dates</a></div>`;
  };
  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cancel-booking]");
    if (!btn) return;
    if (!btn.dataset.confirm) {
      btn.dataset.confirm = "1";
      btn.textContent = "Tap again to confirm";
      return;
    }
    CB.store.bookings = CB.store.bookings.filter((b) => b.id !== btn.dataset.cancelBooking);
    renderWorkshops();
    CB.toast("Booking cancelled. A full refund is on its way.", { action: false });
  });

  /* Orders panel -------------------------------------------------------- */
  const renderOrders = () => {
    const orders = CB.store.orders;
    $("#panel-orders").innerHTML = orders.length
      ? `<ul class="order-list">${orders
          .map((o) => `
            <li class="order-item">
              <div class="order-head">
                <p><strong>${esc(o.id)}</strong> <span>${new Date(o.placedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></p>
                <p class="order-total">${CB.moneyExact(o.total)}</p>
              </div>
              <ul class="lines">${o.lines.map((l) => CB.renderLine(l, { editable: false })).join("")}</ul>
            </li>`)
          .join("")}</ul>`
      : `<div class="empty-state"><p>No orders yet.</p><a class="btn btn-copper" href="shop.html">Shop coffee</a></div>`;
  };

  /* Details panel ------------------------------------------------------- */
  const renderDetails = () => {
    const acc = CB.store.account;
    $("#panel-details").innerHTML = `
      <form class="edit-card" data-details>
        <h2>Your details</h2>
        <div class="field-row">
          <label class="field"><span>Full name</span><input name="name" value="${esc(acc.name || "")}" autocomplete="name"></label>
          <label class="field"><span>Email</span><input name="email" type="email" value="${esc(acc.email || "")}" autocomplete="email" required></label>
        </div>
        <p class="edit-note">Default shipping address:<br>${addressText(acc.address)}</p>
        <div class="actions"><button class="btn btn-copper" type="submit">Save details</button></div>
      </form>`;
  };
  root.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-details]");
    if (!form) return;
    e.preventDefault();
    if (!form.checkValidity()) return form.reportValidity();
    CB.store.account = { ...CB.store.account, name: form.elements.name.value.trim(), email: form.elements.email.value.trim() };
    CB.toast("Details saved.", { action: false });
  });

  /* Tabs ---------------------------------------------------------------- */
  const selectTab = (id, focus) => {
    tab = id;
    $$('[role="tab"]', root).forEach((t) => {
      const on = t.id === `tab-${id}`;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    $$('[role="tabpanel"]', root).forEach((p) => (p.hidden = p.id !== `panel-${id}`));
    const url = new URL(location.href);
    url.searchParams.set("tab", id);
    history.replaceState(null, "", url);
  };
  root.addEventListener("click", (e) => {
    const t = e.target.closest('[role="tab"]');
    if (t) selectTab(t.id.replace("tab-", ""));
  });
  root.addEventListener("keydown", (e) => {
    const t = e.target.closest('[role="tab"]');
    if (!t || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const ids = tabs.map((x) => x.id);
    const i = ids.indexOf(t.id.replace("tab-", ""));
    const next = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: ids.length - 1 }[e.key];
    selectTab(ids[(next + ids.length) % ids.length], true);
  });

  /* Sign in / out ------------------------------------------------------- */
  root.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-signin]");
    if (!form) return;
    e.preventDefault();
    const input = $("input", form);
    if (!input.checkValidity()) {
      $(".pill-form-status", form).textContent = "Enter the email you used to order.";
      input.focus();
      return;
    }
    // Real build: send a magic link. Here we sign straight in.
    CB.store.account = { ...(CB.store.account || {}), email: input.value.trim() };
    render();
  });
  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-demo]")) {
      loadDemo();
      render();
    }
    if (e.target.closest("[data-signout]")) {
      CB.store.account = null;
      render();
    }
  });

  const render = () => (CB.store.account?.email ? renderDashboard() : renderSignIn());
  render();
})();
