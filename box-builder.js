// Box builder behavior. Assumes `PRODUCTS`, `BUNDLE_TIERS`, and `addBundleToBasket` or `addToBasket` are available from shop.js
(function () {
  const products = window.PRODUCTS || {
    apple: { name: "Apple", emoji: "🍏", price: 1.2 },
    banana: { name: "Banana", emoji: "🍌", price: 0.8 },
    lemon: { name: "Lemon", emoji: "🍋", price: 1.0 },
  };
  const tiers = window.BUNDLE_TIERS || { S: { min: 3, max: 3, discount: 0 }, M: { min: 4, max: 5, discount: 0.05 }, L: { min: 6, max: 8, discount: 0.1 } };

  const boxSizeEl = document.getElementById("boxSize");
  const productSelectors = document.getElementById("productSelectors");
  const allowSubsEl = document.getElementById("allowSubs");
  const subscribeToggle = document.getElementById("subscribeToggle");
  const summary = document.getElementById("summary");
  const addBoxBtn = document.getElementById("addBoxBtn");

  function renderSelectors() {
    const size = boxSizeEl.value;
    const tier = tiers[size];
    const target = tier ? tier.max : 3;
    productSelectors.innerHTML = "";
    for (let i = 0; i < target; i++) {
      const wrapper = document.createElement("div");
      wrapper.className = "form-group";
      const select = document.createElement("select");
      select.className = "item-select";
      select.dataset.index = i;
      Object.keys(products).forEach((k) => {
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = `${products[k].emoji} ${products[k].name}`;
        select.appendChild(opt);
      });
      wrapper.appendChild(select);
      // ripeness / preference small selector (minimal)
      const ripeness = document.createElement("select");
      ripeness.className = "ripeness-select";
      ripeness.dataset.index = i;
      const r1 = document.createElement("option"); r1.value = "ready"; r1.textContent = "Ready now";
      const r2 = document.createElement("option"); r2.value = "ripen_2_3d"; r2.textContent = "Ripen in 2-3 days";
      ripeness.appendChild(r1); ripeness.appendChild(r2);
      wrapper.appendChild(ripeness);
      productSelectors.appendChild(wrapper);
    }
    updateSummary();
  }

  function collectItems() {
    const selects = productSelectors.querySelectorAll(".item-select");
    const items = [];
    selects.forEach((s) => {
      const sku = s.value;
      if (sku) items.push({ sku, qty: 1 });
    });
    return items;
  }

  function computePrice(items, size, isSub) {
    let subtotal = 0;
    items.forEach((it) => {
      const p = products[it.sku];
      if (p) subtotal += (p.price || 0) * (it.qty || 0);
    });
    const tier = tiers[size] || { discount: 0 };
    const tierDiscount = tier.discount || 0;
    const subDiscount = isSub ? 0.1 : 0;
    const total = subtotal * (1 - tierDiscount) * (1 - subDiscount);
    return Math.round(total * 100) / 100;
  }

  function updateSummary() {
    const items = collectItems();
    const size = boxSizeEl.value;
    const isSub = subscribeToggle.checked;
    const price = computePrice(items, size, isSub);
    summary.innerHTML = `<div><strong>Items:</strong> ${items.length}</div><div><strong>Price:</strong> €${price.toFixed(2)}</div>`;
  }


  boxSizeEl.addEventListener("change", renderSelectors);
  productSelectors.addEventListener("change", updateSummary);
  subscribeToggle.addEventListener("change", updateSummary);

  addBoxBtn.addEventListener("click", function () {
    const size = boxSizeEl.value;
    const items = collectItems();
    const tier = tiers[size];
    const totalItems = items.reduce((s,i)=>s+i.qty,0);
    if (!tier) return alert("Invalid box size");
    if (totalItems < tier.min || totalItems > tier.max) {
      return alert(`Please select between ${tier.min} and ${tier.max} items for this box size.`);
    }
    const bundle = {
      type: "bundle",
      id: `box_${Date.now()}`,
      size,
      items,
      allowSubs: allowSubsEl.checked,
    };
    if (subscribeToggle.checked) {
      bundle.subscription = { interval: "weekly", discount: 0.1, nextDelivery: new Date(Date.now()+7*24*3600*1000).toISOString().slice(0,10) };
    }
    if (typeof window.addBundleToBasket === 'function') {
      window.addBundleToBasket(bundle);
    } else {
      const b = window.getBasket ? window.getBasket() : [];
      b.push(bundle);
      localStorage.setItem('basket', JSON.stringify(b));
    }
    // update indicator if available and navigate to basket
    if (typeof window.renderBasketIndicator === 'function') window.renderBasketIndicator();
    window.location.href = 'basket.html';
  });

  // initial render
  renderSelectors();

})();
