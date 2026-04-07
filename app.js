// ===== PRODUCT DATA =====
const products = [
  { id:1, name:'오버사이즈 린넨 재킷', brand:'NOVA Basic', price:89000, badge:'new', category:'men', img:'https://images.unsplash.com/photo-1594938298603-c8148c4b6e4e?w=500&q=80', rating:4.8, reviews:124 },
  { id:2, name:'슬림핏 데님 팬츠', brand:'NOVA Denim', price:69000, badge:'new', category:'women', img:'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&q=80', rating:4.6, reviews:89 },
  { id:3, name:'크롭 니트 가디건', brand:'NOVA Knit', price:55000, badge:'new', category:'women', img:'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=500&q=80', rating:4.9, reviews:203 },
  { id:4, name:'스트라이프 세일러 티', brand:'NOVA Basic', price:35000, badge:'new', category:'men', img:'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=500&q=80', rating:4.5, reviews:67 },
  { id:5, name:'버킷햇 코튼', brand:'NOVA Acc', price:32000, badge:'new', category:'women', img:'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=500&q=80', rating:4.7, reviews:156 },
  { id:6, name:'와이드 슬랙스', brand:'NOVA Studio', price:75000, badge:'new', category:'men', img:'https://images.unsplash.com/photo-1548549557-dbe9d3ad3b4c?w=500&q=80', rating:4.4, reviews:41 },
  { id:7, name:'레더 토트백', brand:'NOVA Bag', price:120000, badge:'new', category:'women', img:'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80', rating:4.9, reviews:312 },
  { id:8, name:'화이트 스니커즈', brand:'NOVA Shoes', price:98000, badge:'new', category:'men', img:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80', rating:4.7, reviews:278 },
];

const saleProducts = [
  { id:9, name:'울 블렌드 코트', brand:'NOVA Winter', price:169000, salePrice:84500, pct:50, category:'women', img:'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=500&q=80', rating:4.8, reviews:198 },
  { id:10, name:'패딩 점퍼', brand:'NOVA Outdoor', price:139000, salePrice:83400, pct:40, category:'men', img:'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=500&q=80', rating:4.6, reviews:145 },
  { id:11, name:'캐시미어 터틀넥', brand:'NOVA Knit', price:89000, salePrice:53400, pct:40, category:'women', img:'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&q=80', rating:4.7, reviews:89 },
  { id:12, name:'트렌치 코트', brand:'NOVA Classic', price:199000, salePrice:119400, pct:40, category:'men', img:'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&q=80', rating:4.9, reviews:267 },
];

// ===== CART STATE =====
let cart = JSON.parse(localStorage.getItem('nova_cart') || '[]');
let wishlist = new Set(JSON.parse(localStorage.getItem('nova_wish') || '[]'));
let currentFilter = 'all';

// ===== RENDER PRODUCTS =====
function renderStars(rating) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="star">${i < Math.floor(rating) ? '★' : (i < rating ? '☆' : '☆')}</span>`
  ).join('');
}

function createProductCard(p) {
  const isSale = p.salePrice !== undefined;
  const displayPrice = isSale ? p.salePrice : p.price;
  const isWished = wishlist.has(p.id);

  return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-img">
        <img src="${p.img}" alt="${p.name}" loading="lazy" />
        ${p.badge === 'new' ? '<span class="badge-new">NEW</span>' : ''}
        ${isSale ? `<span class="badge-sale">SALE</span>` : ''}
        <button class="wish-btn ${isWished ? 'active' : ''}" onclick="toggleWish(event, ${p.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${isWished ? '#ff3b30' : 'none'}" stroke="${isWished ? '#ff3b30' : 'currentColor'}" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <div class="product-actions">
          <button class="btn btn-primary" onclick="addToCart(event, ${p.id})">장바구니</button>
        </div>
      </div>
      <div class="stars">${renderStars(p.rating)}</div>
      <p class="product-brand">${p.brand}</p>
      <p class="product-name">${p.name}</p>
      <div class="product-price">
        <span class="price-now">${displayPrice.toLocaleString()}원</span>
        ${isSale ? `<span class="price-was">${p.price.toLocaleString()}원</span>` : ''}
        ${isSale ? `<span class="price-pct">-${p.pct}%</span>` : ''}
      </div>
    </div>
  `;
}

function renderProducts(filter = 'all') {
  const grid = document.getElementById('productGrid');
  const filtered = filter === 'all' ? products : products.filter(p => p.category === filter);
  grid.innerHTML = filtered.map(createProductCard).join('');
}

function renderSale() {
  const grid = document.getElementById('saleGrid');
  grid.innerHTML = saleProducts.map(createProductCard).join('');
}

// ===== FILTER TABS =====
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderProducts(currentFilter);
  });
});

// ===== WISHLIST =====
function toggleWish(e, id) {
  e.stopPropagation();
  if (wishlist.has(id)) {
    wishlist.delete(id);
    showToast('찜 목록에서 제거했어요');
  } else {
    wishlist.add(id);
    showToast('찜 목록에 추가했어요 ♥');
  }
  localStorage.setItem('nova_wish', JSON.stringify([...wishlist]));
  renderProducts(currentFilter);
  renderSale();
}

// ===== CART =====
function addToCart(e, id) {
  e.stopPropagation();
  const product = [...products, ...saleProducts].find(p => p.id === id);
  if (!product) return;

  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.salePrice || product.price,
      img: product.img,
      qty: 1
    });
  }
  saveCart();
  updateCartUI();
  showToast(`${product.name} 장바구니에 추가됐어요!`);
  // Badge pop animation
  const badge = document.getElementById('cartBadge');
  badge.classList.add('pop');
  setTimeout(() => badge.classList.remove('pop'), 300);
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  saveCart();
  updateCartUI();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(id);
  else { saveCart(); updateCartUI(); }
}

function saveCart() {
  localStorage.setItem('nova_cart', JSON.stringify(cart));
}

function updateCartUI() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cartBadge').textContent = total;

  const cartItems = document.getElementById('cartItems');
  if (cart.length === 0) {
    cartItems.innerHTML = '<div class="cart-empty">장바구니가 비어있어요</div>';
  } else {
    cartItems.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-img"><img src="${item.img}" alt="${item.name}" /></div>
        <div class="cart-item-info">
          <p class="cart-item-name">${item.name}</p>
          <p class="cart-item-price">${(item.price * item.qty).toLocaleString()}원</p>
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

  const totalPrice = cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById('cartTotal').textContent = `${totalPrice.toLocaleString()}원`;
}

// Cart open/close
const cartBtn = document.getElementById('cartBtn');
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const closeCart = document.getElementById('closeCart');

function openCart() {
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
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
const searchBtn = document.getElementById('searchBtn');
const searchBar = document.getElementById('searchBar');
const searchInput = document.getElementById('searchInput');

searchBtn.addEventListener('click', () => {
  searchBar.classList.toggle('open');
  if (searchBar.classList.contains('open')) searchInput.focus();
});

function doSearch() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return;
  const grid = document.getElementById('productGrid');
  const results = [...products, ...saleProducts].filter(p =>
    p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
  );
  if (results.length === 0) {
    showToast(`"${searchInput.value}" 검색 결과가 없어요`);
    return;
  }
  grid.innerHTML = results.map(createProductCard).join('');
  document.getElementById('new').scrollIntoView({ behavior: 'smooth' });
  showToast(`${results.length}개 상품을 찾았어요`);
}

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
  if (e.key === 'Escape') searchBar.classList.remove('open');
});

// ===== HAMBURGER =====
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
hamburger.addEventListener('click', () => {
  mobileNav.classList.toggle('open');
});
mobileNav.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => mobileNav.classList.remove('open'));
});

// ===== HEADER SCROLL =====
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 10);
});

// ===== TOAST =====
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ===== INTERSECTION OBSERVER (fade in) =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
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
renderProducts();
renderSale();
updateCartUI();
setTimeout(observeCards, 100);
