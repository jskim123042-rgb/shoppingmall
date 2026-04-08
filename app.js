const API = 'http://localhost:4000/api';

// ===== AUTH STATE =====
let currentUser = JSON.parse(localStorage.getItem('nova_user') || 'null');
let token = localStorage.getItem('nova_token') || null;

// ===== API HELPER =====
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '오류가 발생했어요.');
  return data;
}

// ===== PRODUCT STATE =====
let allProducts = [];
let currentFilter = 'all';
let wishlist = new Set(JSON.parse(localStorage.getItem('nova_wish') || '[]'));

// ===== RENDER HELPERS =====
function renderStars(rating) {
  const r = parseFloat(rating) || 0;
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="star">${i < Math.floor(r) ? '★' : '☆'}</span>`
  ).join('');
}

function createProductCard(p) {
  const isSale    = p.sale_price !== null && p.sale_price !== undefined;
  const price     = isSale ? p.sale_price : p.price;
  const img       = p.thumbnail || p.img || 'https://via.placeholder.com/400x500?text=No+Image';
  const isWished  = wishlist.has(p.id);
  const pct       = p.discount_pct || p.pct;

  return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-img">
        <img src="${img}" alt="${p.name}" loading="lazy" />
        ${p.is_new ? '<span class="badge-new">NEW</span>' : ''}
        ${isSale    ? '<span class="badge-sale">SALE</span>' : ''}
        <button class="wish-btn ${isWished ? 'active' : ''}" onclick="toggleWish(event, ${p.id})">
          <svg width="16" height="16" viewBox="0 0 24 24"
            fill="${isWished ? '#ff3b30' : 'none'}"
            stroke="${isWished ? '#ff3b30' : 'currentColor'}" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <div class="product-actions">
          <button class="btn btn-primary" onclick="addToCart(event, ${p.id})">장바구니</button>
        </div>
      </div>
      <div class="stars">${renderStars(p.avg_rating || p.rating)}</div>
      <p class="product-brand">${p.brand}</p>
      <p class="product-name">${p.name}</p>
      <div class="product-price">
        <span class="price-now">${Number(price).toLocaleString()}원</span>
        ${isSale ? `<span class="price-was">${Number(p.price).toLocaleString()}원</span>` : ''}
        ${isSale && pct ? `<span class="price-pct">-${Math.round(pct)}%</span>` : ''}
      </div>
    </div>
  `;
}

// ===== LOAD & RENDER PRODUCTS =====
async function loadProducts(filter = 'all') {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const params = filter !== 'all' ? `?category=${filter}` : '';
    const res = await api(`/products${params}`);
    allProducts = res.data || [];
    grid.innerHTML = allProducts.length
      ? allProducts.map(createProductCard).join('')
      : '<p style="color:#999;text-align:center;padding:40px">상품이 없어요</p>';
    setTimeout(observeCards, 50);
  } catch (err) {
    grid.innerHTML = '<p style="color:#999;text-align:center;padding:40px">상품을 불러오지 못했어요</p>';
  }
}

async function loadSaleProducts() {
  const grid = document.getElementById('saleGrid');
  grid.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const res = await api('/products?sale=1');
    const items = res.data || [];
    grid.innerHTML = items.length
      ? items.map(createProductCard).join('')
      : '<p style="color:#999;text-align:center;padding:40px">세일 상품이 없어요</p>';
    setTimeout(observeCards, 50);
  } catch {
    grid.innerHTML = '';
  }
}

// ===== FILTER TABS =====
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    loadProducts(currentFilter);
  });
});

// ===== WISHLIST =====
async function toggleWish(e, id) {
  e.stopPropagation();
  if (!token) { openAuthModal(); showToast('로그인이 필요해요'); return; }
  try {
    const res = await api('/wishlist', { method: 'POST', body: JSON.stringify({ product_id: id }) });
    if (res.wished) { wishlist.add(id); showToast('찜 목록에 추가했어요 ♥'); }
    else             { wishlist.delete(id); showToast('찜 목록에서 제거했어요'); }
    localStorage.setItem('nova_wish', JSON.stringify([...wishlist]));
    loadProducts(currentFilter);
    loadSaleProducts();
  } catch (err) {
    showToast(err.message);
  }
}

// ===== CART =====
async function addToCart(e, id) {
  e.stopPropagation();
  if (!token) { openAuthModal(); showToast('로그인이 필요해요'); return; }
  try {
    await api('/cart', { method: 'POST', body: JSON.stringify({ product_id: id, qty: 1 }) });
    await loadCart();
    const p = allProducts.find(p => p.id === id);
    showToast(`${p ? p.name : '상품'}이 장바구니에 담겼어요!`);
    const badge = document.getElementById('cartBadge');
    badge.classList.add('pop');
    setTimeout(() => badge.classList.remove('pop'), 300);
  } catch (err) {
    showToast(err.message);
  }
}

async function loadCart() {
  if (!token) { updateCartUI([]); return; }
  try {
    const res = await api('/cart');
    updateCartUI(res.items || [], res.total || 0);
  } catch { updateCartUI([]); }
}

async function removeFromCart(id) {
  try {
    await api(`/cart/${id}`, { method: 'DELETE' });
    await loadCart();
  } catch (err) { showToast(err.message); }
}

async function changeQty(id, delta) {
  const item = document.querySelector(`[data-cart-id="${id}"]`);
  const currentQty = parseInt(item?.dataset.qty || 1);
  const newQty = currentQty + delta;
  if (newQty <= 0) { removeFromCart(id); return; }
  try {
    await api(`/cart/${id}`, { method: 'PATCH', body: JSON.stringify({ qty: newQty }) });
    await loadCart();
  } catch (err) { showToast(err.message); }
}

function updateCartUI(items = [], total = 0) {
  const count = items.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cartBadge').textContent = count;

  const cartItemsEl = document.getElementById('cartItems');
  if (!items.length) {
    cartItemsEl.innerHTML = '<div class="cart-empty">장바구니가 비어있어요</div>';
  } else {
    cartItemsEl.innerHTML = items.map(item => `
      <div class="cart-item" data-cart-id="${item.id}" data-qty="${item.qty}">
        <div class="cart-item-img"><img src="${item.thumbnail || ''}" alt="${item.name}" /></div>
        <div class="cart-item-info">
          <p class="cart-item-name">${item.name}</p>
          <p class="cart-item-price">${(item.unit_price * item.qty).toLocaleString()}원</p>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
          </div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${item.id})">×</button>
      </div>
    `).join('');
  }
  document.getElementById('cartTotal').textContent = `${total.toLocaleString()}원`;
}

// Cart open/close
const cartBtn     = document.getElementById('cartBtn');
const cartDrawer  = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const closeCart   = document.getElementById('closeCart');

function openCart() {
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (token) loadCart();
}
function closeCartFn() {
  cartDrawer.classList.remove('open');
  cartOverlay.classList.remove('open');
  document.body.style.overflow = '';
}
cartBtn.addEventListener('click', openCart);
closeCart.addEventListener('click', closeCartFn);
cartOverlay.addEventListener('click', closeCartFn);

// ===== SEARCH =====
const searchBtn   = document.getElementById('searchBtn');
const searchBar   = document.getElementById('searchBar');
const searchInput = document.getElementById('searchInput');

searchBtn.addEventListener('click', () => {
  searchBar.classList.toggle('open');
  if (searchBar.classList.contains('open')) searchInput.focus();
});

async function doSearch() {
  const q = searchInput.value.trim();
  if (!q) return;
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const res = await api(`/products?q=${encodeURIComponent(q)}`);
    const results = res.data || [];
    if (!results.length) { showToast(`"${q}" 검색 결과가 없어요`); loadProducts(currentFilter); return; }
    grid.innerHTML = results.map(createProductCard).join('');
    document.getElementById('new').scrollIntoView({ behavior: 'smooth' });
    showToast(`${results.length}개 상품을 찾았어요`);
    setTimeout(observeCards, 50);
  } catch { showToast('검색 중 오류가 발생했어요'); }
}

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
  if (e.key === 'Escape') searchBar.classList.remove('open');
});

// ===== AUTH MODAL =====
const authOverlay = document.getElementById('authOverlay');
const authModal   = document.getElementById('authModal');
const authClose   = document.getElementById('authClose');

function openAuthModal() {
  authModal.classList.add('open');
  authOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  updateAuthUI();
}
function closeAuthModal() {
  authModal.classList.remove('open');
  authOverlay.classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('loginBtn').addEventListener('click', openAuthModal);
authClose.addEventListener('click', closeAuthModal);
authOverlay.addEventListener('click', closeAuthModal);

// Tabs
document.querySelectorAll('.modal-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('loginForm').classList.toggle('hidden', tab.dataset.tab !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', tab.dataset.tab !== 'register');
  });
});

function updateAuthUI() {
  const isLoggedIn = !!currentUser;
  document.getElementById('loginForm').classList.toggle('hidden', isLoggedIn);
  document.getElementById('registerForm').classList.toggle('hidden', true);
  document.getElementById('authUser').classList.toggle('hidden', !isLoggedIn);
  document.querySelectorAll('.modal-tab').forEach(t => t.style.display = isLoggedIn ? 'none' : '');
  if (isLoggedIn) {
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userAvatar').textContent = currentUser.name[0].toUpperCase();
  }
}

// Login
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: document.getElementById('loginEmail').value, password: document.getElementById('loginPassword').value })
    });
    token = res.token;
    currentUser = res.user;
    localStorage.setItem('nova_token', token);
    localStorage.setItem('nova_user', JSON.stringify(currentUser));
    updateAuthUI();
    updateHeaderUser();
    loadCart();
    showToast(`${currentUser.name}님 환영해요!`);
    closeAuthModal();
  } catch (err) { errEl.textContent = err.message; }
});

// Register
document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const errEl = document.getElementById('registerError');
  errEl.textContent = '';
  try {
    await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name:     document.getElementById('regName').value,
        email:    document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        phone:    document.getElementById('regPhone').value,
      })
    });
    showToast('회원가입 완료! 로그인해주세요');
    document.querySelector('[data-tab="login"]').click();
  } catch (err) { errEl.textContent = err.message; }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  token = null; currentUser = null;
  localStorage.removeItem('nova_token');
  localStorage.removeItem('nova_user');
  localStorage.removeItem('nova_wish');
  wishlist.clear();
  updateCartUI([]);
  updateHeaderUser();
  closeAuthModal();
  showToast('로그아웃됐어요');
  loadProducts(currentFilter);
});

function updateHeaderUser() {
  const btn = document.getElementById('loginBtn');
  if (currentUser) {
    btn.title = currentUser.name;
    btn.innerHTML = `<span style="font-size:13px;font-weight:700">${currentUser.name[0].toUpperCase()}</span>`;
  } else {
    btn.title = '로그인';
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }
}

// ===== HAMBURGER =====
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
hamburger.addEventListener('click', () => mobileNav.classList.toggle('open'));
mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileNav.classList.remove('open')));

// ===== HEADER SCROLL =====
const header = document.getElementById('header');
window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 10));

// ===== TOAST =====
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ===== INTERSECTION OBSERVER =====
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; }
  });
}, { threshold: 0.08 });

function observeCards() {
  document.querySelectorAll('.product-card, .cat-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
}

// ===== INIT =====
async function init() {
  updateHeaderUser();
  await Promise.all([loadProducts(), loadSaleProducts()]);
  if (token) loadCart();
  setTimeout(observeCards, 100);
}

init();
