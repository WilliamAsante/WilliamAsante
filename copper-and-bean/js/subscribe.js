(() => {
  "use strict";
  const { $, $$, esc } = CB;
  const perBag = CB.settings.subscription.pricePerBag;

  const groups = {
    grind: CB.grinds.map((g) => ({ value: g, label: g, hint: { "Whole bean": "Grind it fresh yourself", Espresso: "Fine, for machines and moka pots", "Pour-over": "Medium, for drippers and Chemex", "French press": "Coarse, for immersion brewers" }[g] })),
    style: [
      { value: "Roaster's pick", label: "Surprise me", hint: "Anything our roaster loves that week" },
      { value: "Bright and fruity", label: "Bright & fruity", hint: "Light roasts from Ethiopia, Kenya and beyond" },
      { value: "Sweet and chocolatey", label: "Sweet & chocolatey", hint: "Medium roasts that are easy to love" },
      { value: "Dark and bold", label: "Dark & bold", hint: "Heavy body, low acidity, great with milk" },
    ],
    bags: [1, 2, 3].map((n) => ({ value: n, label: `${n} ${n === 1 ? "bag" : "bags"}`, hint: `${CB.settings.subscription.bagSize} each, about ${n * 22} cups` })),
    frequency: [
      { value: 2, label: "Every 2 weeks", hint: "For daily drinkers" },
      { value: 4, label: "Every 4 weeks", hint: "Once a month" },
    ],
  };

  const defaults = { grind: "Whole bean", style: "Roaster's pick", bags: 1, frequency: 4 };

  for (const [name, options] of Object.entries(groups)) {
    $(`[data-options="${name}"]`).innerHTML = options
      .map((o) => `
        <label class="option">
          <input type="radio" name="${name}" value="${esc(o.value)}"${o.value === defaults[name] ? " checked" : ""}>
          <span class="option-card"><strong>${esc(o.label)}</strong><span>${esc(o.hint)}</span></span>
        </label>`)
      .join("");
  }

  const form = $("[data-builder]");
  const plan = () => {
    const f = form.elements;
    return { grind: f.grind.value, style: f.style.value, bags: Number(f.bags.value), frequency: Number(f.frequency.value) };
  };

  const update = () => {
    const p = plan();
    const price = p.bags * perBag;
    const perMonth = (price * 4) / p.frequency;
    const shopPrice = p.bags * 20;
    $("[data-summary]").innerHTML = `
      <div><dt>Grind</dt><dd>${esc(p.grind)}</dd></div>
      <div><dt>Coffee</dt><dd>${esc(p.style)}</dd></div>
      <div><dt>Amount</dt><dd>${p.bags} × ${CB.settings.subscription.bagSize}</dd></div>
      <div><dt>Delivery</dt><dd>Every ${p.frequency} weeks</dd></div>`;
    $("[data-price]").textContent = CB.money(price);
    $("[data-note]").textContent = `About ${CB.money(Math.round(perMonth))} a month. You save at least ${CB.money(shopPrice - price + 6)} per delivery compared with buying in the shop and paying for shipping.`;
  };

  form.addEventListener("change", update);
  update();

  $("[data-subscribe]").addEventListener("click", () => {
    CB.cart.setSubscription(plan());
    location.href = "checkout.html";
  });
})();
