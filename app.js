function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }

function formatPrice(value) {
  return value.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function initQR() {
  const form = qs('#qr-form');
  const img = qs('#qr-img');
  const linkEl = qs('#qr-link');
  if (!form || !img || !linkEl) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const n = form.querySelector('input[type=number]').value || '1';
    const link = `menu.html?table=${encodeURIComponent(n)}`;
    const api = 'https://api.qrserver.com/v1/create-qr-code/';
    const qrData = window.location.href.split('/').slice(0, -1).join('/') + '/' + link;
    const src = `${api}?size=320x320&data=${encodeURIComponent(qrData)}`;
    img.src = src;
    linkEl.href = link;
    linkEl.textContent = link;
  });
}

function initMenu() {
  const params = new URLSearchParams(location.search);
  const table = params.get('table') || '--';
  const tableBadge = qs('#table-badge');
  if (tableBadge) tableBadge.textContent = `Mesa: ${table}`;

  const productCards = qsa('.product-card');
  productCards.forEach(card => {
    if (card.querySelector('.add-to-cart')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'button button-primary add-to-cart';
    btn.textContent = 'Adicionar';
    const name = (card.querySelector('h3')||{textContent:''}).textContent.trim();
    const priceText = (card.querySelector('.product-meta strong')||{textContent:'0'}).textContent.trim();
    const price = parsePrice(priceText);
    btn.dataset.name = name;
    btn.dataset.price = String(price);
    card.appendChild(btn);
  });

  const productGrid = qs('.product-grid');
  if (productGrid) {
    productGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.add-to-cart');
      if (!btn) return;
      const name = btn.dataset.name || (btn.closest('.product-card')?.querySelector('h3')?.textContent || '').trim();
      const price = parseFloat(btn.dataset.price || parsePrice(btn.closest('.product-card')?.querySelector('.product-meta strong')?.textContent || '0')) || 0;
      addToCart({ name, price });
    });
  }

  const search = qs('.search-bar input');
  if (search) {
    search.disabled = false;
    search.placeholder = 'Pesquisar produtos...';
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      productCards.forEach(card => {
        const text = (card.textContent||'').toLowerCase();
        card.style.display = text.includes(q) ? '' : 'none';
      });
    });
  }

  renderCart();
  const checkout = qs('#checkout-btn');
  if (checkout) checkout.addEventListener('click', handleCheckout);
}

function parsePrice(text) {
  if (!text) return 0;
  const cleaned = text.replace(/[^0-9,\.]/g, '').replace(',', '.');
  const n = parseFloat(cleaned) || 0;
  return n;
}

function getCart() {
  try { return JSON.parse(localStorage.getItem('cart')||'[]'); } catch { return []; }
}
function saveCart(items) { localStorage.setItem('cart', JSON.stringify(items)); }

function addToCart(item) {
  const items = getCart();
  const found = items.find(i => i.name === item.name);
  if (found) found.qty += 1; else items.push({ ...item, qty: 1 });
  saveCart(items); renderCart();
}

function renderCart() {
  const list = qs('#cart-list');
  const totalEl = qs('#cart-total');
  const countEl = qs('#cart-count');
  if (!list || !totalEl || !countEl) return;
  const items = getCart();
  list.innerHTML = '';
  let total = 0, count = 0;
  items.forEach((it, idx) => {
    total += it.price * it.qty; count += it.qty;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `<div class="cart-item-header"><strong>${escapeHtml(it.name)}</strong><span>${formatPrice(it.price)} x ${it.qty}</span></div>`;
    const remove = document.createElement('button');
    remove.className = 'button button-secondary';
    remove.textContent = 'Remover';
    remove.addEventListener('click', () => { removeItem(idx); });
    div.appendChild(remove);
    list.appendChild(div);
  });
  totalEl.textContent = formatPrice(total);
  countEl.textContent = `${count} itens`;
}

function removeItem(index) {
  const items = getCart(); if (index < 0 || index >= items.length) return;
  items.splice(index, 1); saveCart(items); renderCart();
}

function handleCheckout() {
  const items = getCart(); if (!items.length) { alert('Carrinho vazio'); return; }
  const table = new URLSearchParams(location.search).get('table') || '—';
  const summary = items.map(i => `${i.name} x${i.qty}`).join('\n');
  alert(`Pedido para mesa ${table}:\n\n${summary}\n\nTotal: ${formatPrice(items.reduce((s,i)=>s+i.price*i.qty,0))}`);
  localStorage.removeItem('cart'); renderCart();
}

function escapeHtml(s){ return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => {
    console.log('SW registration failed:', err);
  });
}

document.addEventListener('DOMContentLoaded', () => { initQR(); initMenu(); });
