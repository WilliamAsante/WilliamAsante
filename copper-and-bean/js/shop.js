(() => {
  "use strict";
  const { $, esc } = CB;

  const params = new URLSearchParams(location.search);
  const state = {
    category: CB.categories.some((c) => c.id === params.get("cat")) ? params.get("cat") : "all",
    roast: "",
    sort: "featured",
  };

  const catRow = $("[data-categories]");
  const roastWrap = $("[data-roast-wrap]");
  const roastSel = $("[data-roast]");
  const sortSel = $("[data-sort]");
  const grid = $("[data-products]");
  const count = $("[data-count]");

  catRow.innerHTML = CB.categories
    .map((c) => `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${c.id === state.category}">${esc(c.label)}</button>`)
    .join("");

  const render = () => {
    let list = CB.products.filter((p) => state.category === "all" || p.category === state.category);
    if (state.category === "coffee" && state.roast) list = list.filter((p) => p.roast.includes(state.roast));
    const price = (p) => p.sizes[0].price;
    if (state.sort === "price-asc") list.sort((a, b) => price(a) - price(b));
    if (state.sort === "price-desc") list.sort((a, b) => price(b) - price(a));
    if (state.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    if (state.sort === "featured") list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

    roastWrap.hidden = state.category !== "coffee";
    count.textContent = `${list.length} ${list.length === 1 ? "product" : "products"}`;
    grid.innerHTML = list.length
      ? list.map(CB.productCard).join("")
      : `<li class="empty">Nothing matches that filter. <button type="button" class="link" data-reset>Show everything</button></li>`;
  };

  catRow.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-cat]");
    if (!chip) return;
    state.category = chip.dataset.cat;
    state.roast = "";
    roastSel.value = "";
    catRow.querySelectorAll("[data-cat]").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    const url = new URL(location.href);
    state.category === "all" ? url.searchParams.delete("cat") : url.searchParams.set("cat", state.category);
    history.replaceState(null, "", url);
    render();
  });
  roastSel.addEventListener("change", () => ((state.roast = roastSel.value), render()));
  sortSel.addEventListener("change", () => ((state.sort = sortSel.value), render()));
  grid.addEventListener("click", (e) => {
    if (!e.target.closest("[data-reset]")) return;
    catRow.querySelector('[data-cat="all"]').click();
  });

  render();

  // shop.html?product=ethiopia-guji opens that product.
  if (params.get("product")) CB.openProduct(params.get("product"));
})();
