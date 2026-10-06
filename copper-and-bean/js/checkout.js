/* Checkout. Front-end only: payment is simulated and nothing is charged.
   When payments are connected, replace placeOrder() with a call that creates a
   Stripe Checkout Session / Payment Intent (or a Shopify checkout) and
   redirects, and render the confirmation from the provider's webhook data. */

(() => {
  "use strict";
  const { $, $$, esc } = CB;
  const root = $("[data-checkout]");

  const shippingCost = (method, subtotal, physical) => {
    if (!physical) return 0;
    if (method === "pickup") return 0;
    if (method === "standard" && subtotal >= CB.settings.freeShippingOver) return 0;
    return CB.settings.shipping[method].price;
  };

  const field = (name, label, attrs = "", value = "") => `
    <div class="field">
      <label for="co-${name}">${label}</label>
      <input id="co-${name}" name="${name}" value="${esc(value)}" ${attrs}>
      <p class="field-error" id="co-${name}-error"></p>
    </div>`;

  const render = () => {
    const lines = CB.cart.lines();
    if (!lines.length) {
      root.innerHTML = `
        <div class="empty-state">
          <p>Your cart is empty.</p>
          <div class="actions"><a class="btn btn-copper" href="shop.html">Shop coffee</a><a class="btn btn-ghost" href="workshops.html">Book a workshop</a></div>
        </div>`;
      return;
    }
    const physical = CB.cart.hasPhysical();
    const hasOnlySub = lines.every((l) => l.type === "subscription");
    const account = CB.store.account || {};
    const a = account.address || {};

    root.innerHTML = `
      <div class="checkout">
        <form class="checkout-form" novalidate data-form>
          <p class="demo-banner"><strong>Demo checkout.</strong> No card is charged. Use any test details, for example card 4242 4242 4242 4242.</p>

          <fieldset class="co-step">
            <legend><span class="legend-num">1</span>Contact</legend>
            ${field("email", "Email", 'type="email" autocomplete="email" required', account.email)}
            ${field("name", "Full name", 'autocomplete="name" required', account.name)}
          </fieldset>

          ${physical ? `
          <fieldset class="co-step">
            <legend><span class="legend-num">2</span>Delivery</legend>
            <div class="radio-cards" data-methods>
              ${Object.entries(CB.settings.shipping)
                .filter(([k]) => !(hasOnlySub && k === "pickup"))
                .map(([k, m], i) => `
                <label class="radio-card">
                  <input type="radio" name="method" value="${k}"${i === 0 ? " checked" : ""}>
                  <span><strong>${m.label}</strong><span data-method-price="${k}"></span></span>
                </label>`).join("")}
            </div>
            <div class="address" data-address>
              ${field("line1", "Street address", 'autocomplete="address-line1" required', a.line1)}
              ${field("line2", "Apartment, suite <span class=\"optional\">(optional)</span>", 'autocomplete="address-line2"', a.line2)}
              <div class="field-row">
                ${field("city", "City", 'autocomplete="address-level2" required', a.city)}
                ${field("state", "State", 'autocomplete="address-level1" required', a.state)}
                ${field("zip", "ZIP code", 'autocomplete="postal-code" inputmode="numeric" required pattern="[0-9]{5}(-[0-9]{4})?"', a.zip)}
              </div>
            </div>
          </fieldset>` : ""}

          <fieldset class="co-step">
            <legend><span class="legend-num">${physical ? 3 : 2}</span>Payment</legend>
            ${field("card", "Card number", 'autocomplete="cc-number" inputmode="numeric" required placeholder="1234 1234 1234 1234"')}
            <div class="field-row">
              ${field("exp", "Expiry", 'autocomplete="cc-exp" required placeholder="MM / YY" pattern="(0[1-9]|1[0-2]) ?/ ?[0-9]{2}"')}
              ${field("cvc", "Security code", 'autocomplete="cc-csc" inputmode="numeric" required pattern="[0-9]{3,4}" placeholder="CVC"')}
            </div>
            ${lines.some((l) => l.type === "subscription") ? `<p class="co-note">Your card will be charged for each Roaster's Choice delivery until you pause or cancel. You can manage it from your account at any time.</p>` : ""}
          </fieldset>

          <button type="submit" class="btn btn-copper btn-block btn-large" data-pay>Pay</button>
          <p class="co-fine">By placing your order you agree to our terms and privacy policy.</p>
        </form>

        <aside class="co-summary" aria-labelledby="summary-title">
          <details class="co-summary-toggle" open>
            <summary><span id="summary-title">Order summary</span><span data-total-mini></span></summary>
            <ul class="lines">${lines.map((l) => CB.renderLine(l, { editable: false })).join("")}</ul>
            <dl class="totals" data-totals></dl>
          </details>
        </aside>
      </div>`;

    const form = $("[data-form]");
    const updateTotals = () => {
      const subtotal = CB.cart.subtotal();
      const method = form.elements.method?.value || "standard";
      const ship = shippingCost(method, subtotal, physical);
      const total = subtotal + ship;
      $$("[data-method-price]").forEach((el) => {
        const cost = shippingCost(el.dataset.methodPrice, subtotal, true);
        el.textContent = cost ? CB.moneyExact(cost) : "Free";
      });
      const address = $("[data-address]");
      if (address) {
        const pickup = method === "pickup";
        address.hidden = pickup;
        $$("input", address).forEach((i) => (i.disabled = pickup));
      }
      const sub = lines.find((l) => l.type === "subscription");
      $("[data-totals]").innerHTML = `
        <div><dt>Subtotal</dt><dd>${CB.moneyExact(subtotal)}</dd></div>
        ${physical ? `<div><dt>Shipping</dt><dd>${ship ? CB.moneyExact(ship) : "Free"}</dd></div>` : ""}
        <div><dt>Taxes</dt><dd>Included</dd></div>
        <div class="totals-total"><dt>Total today</dt><dd>${CB.moneyExact(total)}</dd></div>
        ${sub ? `<p class="totals-note">Then ${CB.moneyExact(sub.price)} every ${sub.plan.frequency} weeks, shipping included.</p>` : ""}`;
      $("[data-total-mini]").textContent = CB.moneyExact(total);
      $("[data-pay]").textContent = `Pay ${CB.moneyExact(total)}`;
    };
    form.addEventListener("change", updateTotals);
    updateTotals();

    // Light card-number formatting.
    form.elements.card.addEventListener("input", (e) => {
      const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
      e.target.value = digits.replace(/(.{4})/g, "$1 ").trim();
    });
    form.elements.exp.addEventListener("input", (e) => {
      const d = e.target.value.replace(/\D/g, "").slice(0, 4);
      e.target.value = d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
    });

    const messages = {
      email: "Enter an email address like name@example.com.",
      name: "Enter your full name.",
      line1: "Enter your street address.",
      city: "Enter your city.",
      state: "Enter your state.",
      zip: "Enter a 5-digit ZIP code.",
      card: "Enter a 16-digit card number.",
      exp: "Enter the expiry date as MM / YY.",
      cvc: "Enter the 3 or 4 digit code on the back of your card.",
    };
    const validate = (input) => {
      const err = $(`#co-${input.name}-error`);
      if (!err || input.disabled) return true;
      let ok = input.checkValidity();
      if (input.name === "card") ok = input.value.replace(/\D/g, "").length === 16;
      err.textContent = ok ? "" : messages[input.name];
      input.toggleAttribute("aria-invalid", !ok);
      ok ? input.removeAttribute("aria-describedby") : input.setAttribute("aria-describedby", err.id);
      return ok;
    };
    form.addEventListener("input", (e) => e.target.hasAttribute("aria-invalid") && validate(e.target));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const bad = $$("input[name]", form).filter((i) => !validate(i));
      if (bad.length) {
        bad[0].focus();
        return;
      }
      const btn = $("[data-pay]");
      btn.disabled = true;
      btn.textContent = "Processing…";
      setTimeout(() => placeOrder(form, physical), 900);
    });
  };

  const placeOrder = (form, physical) => {
    const f = form.elements;
    const lines = CB.cart.lines();
    const subtotal = CB.cart.subtotal();
    const method = f.method?.value || null;
    const shipping = shippingCost(method || "standard", subtotal, physical);
    const address = physical && method !== "pickup"
      ? { line1: f.line1.value.trim(), line2: f.line2.value.trim(), city: f.city.value.trim(), state: f.state.value.trim(), zip: f.zip.value.trim() }
      : null;
    const order = {
      id: CB.uid("CB-"),
      placedAt: new Date().toISOString(),
      email: f.email.value.trim(),
      name: f.name.value.trim(),
      lines, subtotal, shipping, total: subtotal + shipping,
      method, address,
    };

    CB.store.orders = [order, ...CB.store.orders];

    const tickets = lines.filter((l) => l.type === "ticket");
    if (tickets.length) {
      CB.store.bookings = [
        ...CB.store.bookings,
        ...tickets.map((t) => {
          const [workshopId, date] = t.ref.split("_");
          return { id: CB.uid("BK-"), orderId: order.id, sessionId: t.ref, workshopId, date, time: CB.workshop(workshopId).time, qty: t.qty };
        }),
      ];
    }

    const sub = lines.find((l) => l.type === "subscription");
    if (sub) {
      const next = new Date();
      next.setDate(next.getDate() + 3);
      CB.store.subscription = {
        id: CB.uid("SUB-"), status: "active", plan: sub.plan, price: sub.price,
        nextDelivery: CB.iso(next), startedAt: CB.iso(new Date()), address,
      };
    }

    const account = CB.store.account || {};
    CB.store.account = { ...account, email: order.email, name: order.name, address: address || account.address || null };
    CB.cart.clear();
    confirmation(order);
  };

  const icsFor = (t) => {
    const [workshopId, date] = t.ref.split("_");
    const w = CB.workshop(workshopId);
    const [h, m] = w.time.split(":");
    const start = `${date.replace(/-/g, "")}T${h}${m}00`;
    const hours = parseFloat(w.duration);
    const endDate = new Date(CB.fromIso(date));
    endDate.setHours(Number(h), Number(m) + Math.round(hours * 60));
    const end = `${CB.iso(endDate).replace(/-/g, "")}T${String(endDate.getHours()).padStart(2, "0")}${String(endDate.getMinutes()).padStart(2, "0")}00`;
    const body = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Copper & Bean//Workshops//EN", "BEGIN:VEVENT",
      `UID:${t.ref}@copperandbean`, `DTSTART:${start}`, `DTEND:${end}`,
      `SUMMARY:${w.name} at Copper & Bean`, `LOCATION:${CB.contact.address.join(", ")}`,
      `DESCRIPTION:${t.qty} seat(s). Arrive 10 minutes early.`, "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    return URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  };

  const confirmation = (order) => {
    const tickets = order.lines.filter((l) => l.type === "ticket");
    const sub = order.lines.find((l) => l.type === "subscription");
    const goods = order.lines.some((l) => l.type === "product");
    root.innerHTML = `
      <div class="confirm">
        <p class="eyebrow">[ Order ${esc(order.id)} ]</p>
        <h2 class="h-display">Thank you, ${esc(order.name.split(" ")[0])}.</h2>
        <p class="confirm-lede">We've sent a receipt to ${esc(order.email)}.</p>
        <ul class="confirm-next">
          ${goods ? `<li><strong>Your coffee</strong>${order.method === "pickup" ? "Will be ready to collect at the cafe after our next roast day. We'll email you." : "Ships after our next roast day. You'll get tracking by email."}</li>` : ""}
          ${sub ? `<li><strong>Roaster's Choice</strong>Your first delivery ships within 3 days. <a href="account.html">Manage your subscription</a></li>` : ""}
          ${tickets.map((t) => `<li><strong>${esc(t.name)}</strong>${esc(t.option)}, ${t.qty} ${t.qty === 1 ? "seat" : "seats"}. <a href="${icsFor(t)}" download="copper-and-bean-workshop.ics">Add to calendar</a></li>`).join("")}
        </ul>
        <div class="actions">
          <a class="btn btn-copper" href="account.html">Go to your account</a>
          <a class="btn btn-ghost" href="shop.html">Keep shopping</a>
        </div>
      </div>`;
    CB.scrollTo("#main");
  };

  render();
})();
