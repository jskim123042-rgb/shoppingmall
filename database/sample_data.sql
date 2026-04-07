-- =============================================
-- NOVA 쇼핑몰 샘플 데이터
-- =============================================

USE nova_shop;

-- 회원
INSERT INTO users (email, password_hash, name, phone, gender, role) VALUES
  ('admin@nova.com',   '$2b$12$examplehash1', '관리자',    '010-0000-0000', 'M', 'admin'),
  ('user1@test.com',   '$2b$12$examplehash2', '김지수',    '010-1111-2222', 'F', 'customer'),
  ('user2@test.com',   '$2b$12$examplehash3', '박민준',    '010-3333-4444', 'M', 'customer');

-- 상품
INSERT INTO products (category_id, name, brand, price, sale_price, sku, stock, is_new) VALUES
  (1, '오버사이즈 린넨 재킷',  'NOVA Basic',   89000,  NULL,   'NOV-OTR-001', 50, 1),
  (2, '슬림핏 데님 팬츠',      'NOVA Denim',   69000,  NULL,   'NOV-BTM-001', 80, 1),
  (2, '크롭 니트 가디건',      'NOVA Knit',    55000,  NULL,   'NOV-TOP-001', 60, 1),
  (3, '화이트 스니커즈',       'NOVA Shoes',   98000,  NULL,   'NOV-SHO-001', 40, 1),
  (4, '레더 토트백',           'NOVA Bag',    120000,  NULL,   'NOV-ACC-001', 30, 1),
  (1, '울 블렌드 코트',        'NOVA Winter', 169000, 84500,  'NOV-OTR-002', 20, 0),
  (1, '트렌치 코트',           'NOVA Classic',199000,119400, 'NOV-OTR-003', 25, 0);

-- 상품 이미지
INSERT INTO product_images (product_id, url, is_thumbnail, sort_order) VALUES
  (1, 'https://images.unsplash.com/photo-1594938298603-c8148c4b6e4e?w=500', 1, 0),
  (2, 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500', 1, 0),
  (3, 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=500', 1, 0),
  (4, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',    1, 0),
  (5, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',    1, 0),
  (6, 'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=500',    1, 0),
  (7, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500', 1, 0);

-- 상품 옵션
INSERT INTO product_options (product_id, type, value, stock) VALUES
  (1, 'size', 'S',  10), (1, 'size', 'M',  20), (1, 'size', 'L',  15), (1, 'size', 'XL',  5),
  (2, 'size', 'S',  15), (2, 'size', 'M',  30), (2, 'size', 'L',  25), (2, 'size', 'XL', 10),
  (3, 'size', 'S',  10), (3, 'size', 'M',  25), (3, 'size', 'L',  20), (3, 'size', 'XL',  5),
  (4, 'size', '240', 8), (4, 'size', '250',12), (4, 'size', '260',12), (4, 'size', '270', 8),
  (1, 'color', '베이지', 25), (1, 'color', '블랙', 25),
  (3, 'color', '아이보리', 30), (3, 'color', '네이비', 30);

-- 쿠폰
INSERT INTO coupons (code, name, type, value, min_order, max_discount, total_qty, started_at, expired_at) VALUES
  ('WELCOME10', '신규회원 10% 할인', 'percent', 10, 30000, 10000, 1000, '2026-01-01', '2026-12-31'),
  ('SAVE5000',  '5,000원 할인쿠폰',  'fixed',    5000, 50000, NULL, 500, '2026-04-01', '2026-06-30'),
  ('SS2026',    'SS 시즌 20% 할인',  'percent', 20, 80000, 30000,  300, '2026-04-07', '2026-05-31');

-- 배송지
INSERT INTO addresses (user_id, label, recipient, phone, zip_code, address1, address2, is_default) VALUES
  (2, '집', '김지수', '010-1111-2222', '06234', '서울특별시 강남구 테헤란로 123', '101동 202호', 1),
  (3, '집', '박민준', '010-3333-4444', '04524', '서울특별시 중구 을지로 456', NULL, 1);

-- 주문
INSERT INTO orders (user_id, order_no, status, total_price, shipping_fee, final_price,
  recipient, phone, zip_code, address1, address2, payment_method, payment_at) VALUES
  (2, 'ORD-20260407-00001', 'delivered', 158000, 0, 158000,
   '김지수', '010-1111-2222', '06234', '서울특별시 강남구 테헤란로 123', '101동 202호',
   'card', '2026-04-01 10:30:00'),
  (3, 'ORD-20260407-00002', 'paid', 89000, 3000, 92000,
   '박민준', '010-3333-4444', '04524', '서울특별시 중구 을지로 456', NULL,
   'kakao', '2026-04-07 14:20:00');

-- 주문 상품
INSERT INTO order_items (order_id, product_id, option_id, product_name, option_value, unit_price, qty, subtotal) VALUES
  (1, 1, 2, '오버사이즈 린넨 재킷', 'M', 89000, 1, 89000),
  (1, 3, 9, '크롭 니트 가디건',     'M', 55000, 1, 55000),
  (2, 4, 14,'화이트 스니커즈',      '260', 98000, 1, 98000);

-- 리뷰
INSERT INTO reviews (user_id, product_id, order_item_id, rating, content) VALUES
  (2, 1, 1, 5, '핏이 너무 예뻐요! 린넨 소재라 시원하고 고급스럽습니다. 재구매 의사 있어요.'),
  (2, 3, 2, 5, '색상이 사진이랑 똑같아요. 배송도 빠르고 퀄리티 최고입니다!');
