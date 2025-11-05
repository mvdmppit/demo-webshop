const PRODUCTS = {
  apple: { name: "Apple", emoji: "🍏", price: 1.2, season: "autumn", isSubstitutable: true },
  banana: { name: "Banana", emoji: "🍌", price: 0.8, season: "year-round", isSubstitutable: true },
  lemon: { name: "Lemon", emoji: "🍋", price: 1.0, season: "summer", isSubstitutable: true },
};

function getBasket() {
  try {
    const basket = localStorage.getItem("basket");
    if (!basket) return [];
    const parsed = JSON.parse(basket);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Error parsing basket from localStorage:", error);
    return [];
  }
}

function addToBasket(product) {
  const basket = getBasket();
  basket.push(product);
  localStorage.setItem("basket", JSON.stringify(basket));
}

function saveBasket(basket) {
  localStorage.setItem('basket', JSON.stringify(basket));
}

function addBundleToBasket(bundle) {
  const basket = getBasket();
  basket.push(bundle);
  saveBasket(basket);
}

function computeBundlePrice(bundle) {
  // simple price engine: sum prices * (1 - tier discount) * (1 - subscription discount) test
  let subtotal = 0;
  if (bundle.items && bundle.items.length) {
    bundle.items.forEach((it) => {
      const p = PRODUCTS[it.sku];
      if (p) subtotal += (p.price || 0) * (it.qty || 0);
    });
  }
  const tier = (window.BUNDLE_TIERS && window.BUNDLE_TIERS[bundle.size]) || { discount: 0 };
  const tierDiscount = tier.discount || 0;
  const subDiscount = bundle.subscription && bundle.subscription.discount ? bundle.subscription.discount : 0;
  const total = subtotal * (1 - tierDiscount) * (1 - subDiscount);
  return Math.round(total * 100) / 100;
}
window.computeBundlePrice = computeBundlePrice;

function clearBasket() {
  localStorage.removeItem("basket");
}

function renderBasket() {
  const basket = getBasket();
  const basketList = document.getElementById("basketList");
  const cartButtonsRow = document.querySelector(".cart-buttons-row");
  if (!basketList) return;
  basketList.innerHTML = "";
  if (basket.length === 0) {
    basketList.innerHTML = "<li>No products in basket.</li>";
    if (cartButtonsRow) cartButtonsRow.style.display = "none";
    return;
  }
  basket.forEach((entry, idx) => {
    // simple string SKU
    if (typeof entry === 'string') {
      const item = PRODUCTS[entry];
      if (item) {
        const li = document.createElement("li");
        li.innerHTML = `<span class='basket-emoji'>${item.emoji}</span> <span>${item.name}</span>`;
        basketList.appendChild(li);
      }
    } else if (entry && entry.type === 'bundle') {
      // render composed bundle
      const li = document.createElement('li');
      const title = document.createElement('div');
      const totalItems = entry.items ? entry.items.reduce((s,i)=>s+(i.qty||0),0) : 0;
      title.innerHTML = `<strong>Box (${entry.size})</strong> - <em>${totalItems} items</em>`;
      li.appendChild(title);
      const ul = document.createElement('ul');
      if (entry.items && entry.items.length) {
        entry.items.forEach((it) => {
          const p = PRODUCTS[it.sku];
          const subLi = document.createElement('li');
          subLi.style.listStyle = 'none';
          subLi.innerHTML = `${p ? p.emoji : ''} ${p ? p.name : it.sku} x ${it.qty}`;
          ul.appendChild(subLi);
        });
      }
      li.appendChild(ul);
      const meta = document.createElement('div');
      if (typeof window.computeBundlePrice === 'function') {
        const price = window.computeBundlePrice(entry);
+        meta.innerHTML = `<div>Price: €${price.toFixed(2)} ${entry.subscription ? ' - Subscribed' : ''}</div>`;
+      }
+      li.appendChild(meta);
+      // remove button
      const removeBtn = document.createElement('button');
+      removeBtn.textContent = 'Remove Box';
+      removeBtn.className = 'cart-action-btn';
+      removeBtn.onclick = function () {
+        const b = getBasket();
+        b.splice(idx,1);
+        localStorage.setItem('basket', JSON.stringify(b));
+        renderBasket();
+        renderBasketIndicator();
+      };
+      li.appendChild(removeBtn);
+      basketList.appendChild(li);
+    } else if (entry && entry.sku && entry.qty) {
+      // fallback object item with qty
+      const p = PRODUCTS[entry.sku];
+      const li = document.createElement('li');
+      li.innerHTML = `${p ? p.emoji : ''} ${p ? p.name : entry.sku} x ${entry.qty}`;
+      basketList.appendChild(li);
+    }
+  });
+  if (cartButtonsRow) cartButtonsRow.style.display = "flex";
+}

function renderBasketIndicator() {
  const basket = getBasket();
+  let indicator = document.querySelector('.basket-indicator');
+  if (!indicator) {
+    const basketLink = document.querySelector('.basket-link');
+    if (!basketLink) return;
+    indicator = document.createElement('span');
+    indicator.className = 'basket-indicator';
+    basketLink.appendChild(indicator);
+  }
+  // compute total items (including bundle children)
+  let total = 0;
+  basket.forEach((entry) => {
+    if (typeof entry === 'string') total += 1;
+    else if (entry && entry.type === 'bundle') total += (entry.items || []).reduce((s,i)=>s+(i.qty||0),0);
+    else if (entry && entry.qty) total += entry.qty;
+  });
+  if (total > 0) {
+    indicator.textContent = total;
+    indicator.style.display = 'flex';
+  } else {
+    indicator.style.display = 'none';
+  }
+}

// Call this on page load and after basket changes
if (document.readyState !== "loading") {
  renderBasketIndicator();
} else {
  document.addEventListener("DOMContentLoaded", renderBasketIndicator);
}

// Patch basket functions to update indicator
const origAddToBasket = window.addToBasket;
window.addToBasket = function (product) {
  origAddToBasket(product);
  renderBasketIndicator();
};
const origClearBasket = window.clearBasket;
window.clearBasket = function () {
  origClearBasket();
  renderBasketIndicator();
};
