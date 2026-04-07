-- =============================================
-- NOVA 쇼핑몰 MySQL Database Schema
-- =============================================

CREATE DATABASE IF NOT EXISTS nova_shop
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nova_shop;

-- =============================================
-- 1. USERS (회원)
-- =============================================
CREATE TABLE users (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255)    NOT NULL UNIQUE,
  password_hash VARCHAR(255)    NOT NULL,
  name          VARCHAR(50)     NOT NULL,
  phone         VARCHAR(20),
  gender        ENUM('M','F','N'),
  birthdate     DATE,
  profile_img   VARCHAR(500),
  role          ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- =============================================
-- 2. ADDRESSES (배송지)
-- =============================================
CREATE TABLE addresses (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED    NOT NULL,
  label         VARCHAR(50)                      COMMENT '집, 회사 등',
  recipient     VARCHAR(50)     NOT NULL,
  phone         VARCHAR(20)     NOT NULL,
  zip_code      VARCHAR(10)     NOT NULL,
  address1      VARCHAR(255)    NOT NULL,
  address2      VARCHAR(255),
  is_default    TINYINT(1)      NOT NULL DEFAULT 0,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user (user_id),
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================
-- 3. CATEGORIES (카테고리)
-- =============================================
CREATE TABLE categories (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  parent_id     INT UNSIGNED                     COMMENT 'NULL이면 최상위',
  name          VARCHAR(50)     NOT NULL,
  slug          VARCHAR(50)     NOT NULL UNIQUE,
  sort_order    INT             NOT NULL DEFAULT 0,
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  INDEX idx_parent (parent_id),
  CONSTRAINT fk_cat_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 기본 카테고리 데이터
INSERT INTO categories (name, slug, sort_order) VALUES
  ('아우터',    'outer',      1),
  ('티셔츠',    'tshirt',     2),
  ('슈즈',      'shoes',      3),
  ('액세서리',  'accessory',  4),
  ('남성',      'men',        5),
  ('여성',      'women',      6);

-- =============================================
-- 4. PRODUCTS (상품)
-- =============================================
CREATE TABLE products (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  category_id   INT UNSIGNED    NOT NULL,
  name          VARCHAR(200)    NOT NULL,
  brand         VARCHAR(100)    NOT NULL,
  description   TEXT,
  price         INT UNSIGNED    NOT NULL                COMMENT '원가 (원)',
  sale_price    INT UNSIGNED                            COMMENT 'NULL이면 할인 없음',
  sku           VARCHAR(100)    NOT NULL UNIQUE         COMMENT '상품 코드',
  stock         INT             NOT NULL DEFAULT 0,
  is_new        TINYINT(1)      NOT NULL DEFAULT 0,
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_category (category_id),
  INDEX idx_brand (brand),
  INDEX idx_price (price),
  FULLTEXT idx_search (name, brand, description),
  CONSTRAINT fk_prod_cat FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB;

-- =============================================
-- 5. PRODUCT_IMAGES (상품 이미지)
-- =============================================
CREATE TABLE product_images (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  product_id    INT UNSIGNED    NOT NULL,
  url           VARCHAR(500)    NOT NULL,
  alt_text      VARCHAR(200),
  sort_order    INT             NOT NULL DEFAULT 0,
  is_thumbnail  TINYINT(1)      NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  INDEX idx_product (product_id),
  CONSTRAINT fk_img_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================
-- 6. PRODUCT_OPTIONS (상품 옵션: 사이즈/색상)
-- =============================================
CREATE TABLE product_options (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  product_id    INT UNSIGNED    NOT NULL,
  type          ENUM('size','color','etc') NOT NULL,
  value         VARCHAR(50)     NOT NULL              COMMENT 'S, M, L / Red, Blue 등',
  extra_price   INT             NOT NULL DEFAULT 0    COMMENT '옵션 추가금액',
  stock         INT             NOT NULL DEFAULT 0,
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  INDEX idx_product (product_id),
  CONSTRAINT fk_opt_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================
-- 7. CART_ITEMS (장바구니)
-- =============================================
CREATE TABLE cart_items (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED    NOT NULL,
  product_id    INT UNSIGNED    NOT NULL,
  option_id     INT UNSIGNED                          COMMENT '선택한 옵션',
  qty           INT             NOT NULL DEFAULT 1,
  added_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cart (user_id, product_id, option_id),
  INDEX idx_user (user_id),
  CONSTRAINT fk_cart_user FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_opt  FOREIGN KEY (option_id)  REFERENCES product_options(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================
-- 8. WISHLISTS (찜 목록)
-- =============================================
CREATE TABLE wishlists (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED    NOT NULL,
  product_id    INT UNSIGNED    NOT NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wish (user_id, product_id),
  CONSTRAINT fk_wish_user FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_wish_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================
-- 9. COUPONS (쿠폰)
-- =============================================
CREATE TABLE coupons (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  code          VARCHAR(50)     NOT NULL UNIQUE,
  name          VARCHAR(100)    NOT NULL,
  type          ENUM('percent','fixed') NOT NULL      COMMENT 'percent: %, fixed: 원',
  value         INT UNSIGNED    NOT NULL,
  min_order     INT UNSIGNED    NOT NULL DEFAULT 0    COMMENT '최소 주문금액',
  max_discount  INT UNSIGNED                          COMMENT '최대 할인금액 (percent용)',
  total_qty     INT UNSIGNED                          COMMENT 'NULL이면 무제한',
  used_qty      INT UNSIGNED    NOT NULL DEFAULT 0,
  started_at    DATETIME        NOT NULL,
  expired_at    DATETIME        NOT NULL,
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_code (code),
  INDEX idx_expired (expired_at)
) ENGINE=InnoDB;

-- =============================================
-- 10. ORDERS (주문)
-- =============================================
CREATE TABLE orders (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED    NOT NULL,
  coupon_id       INT UNSIGNED,
  order_no        VARCHAR(30)     NOT NULL UNIQUE     COMMENT 'ORD-20260407-00001',
  status          ENUM(
                    'pending',      -- 결제 대기
                    'paid',         -- 결제 완료
                    'preparing',    -- 상품 준비 중
                    'shipped',      -- 배송 중
                    'delivered',    -- 배송 완료
                    'cancelled',    -- 취소
                    'refunded'      -- 환불
                  ) NOT NULL DEFAULT 'pending',
  total_price     INT UNSIGNED    NOT NULL            COMMENT '상품 합계',
  discount_amount INT UNSIGNED    NOT NULL DEFAULT 0  COMMENT '쿠폰 할인금액',
  shipping_fee    INT UNSIGNED    NOT NULL DEFAULT 0,
  final_price     INT UNSIGNED    NOT NULL            COMMENT '최종 결제금액',
  -- 배송지 스냅샷 (주문 당시 정보 보존)
  recipient       VARCHAR(50)     NOT NULL,
  phone           VARCHAR(20)     NOT NULL,
  zip_code        VARCHAR(10)     NOT NULL,
  address1        VARCHAR(255)    NOT NULL,
  address2        VARCHAR(255),
  -- 결제
  payment_method  ENUM('card','transfer','kakao','naver','toss'),
  payment_at      DATETIME,
  -- 배송
  tracking_no     VARCHAR(100),
  shipped_at      DATETIME,
  delivered_at    DATETIME,
  memo            VARCHAR(500)                        COMMENT '배송 요청사항',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user   (user_id),
  INDEX idx_status (status),
  INDEX idx_order_no (order_no),
  CONSTRAINT fk_ord_user   FOREIGN KEY (user_id)   REFERENCES users(id),
  CONSTRAINT fk_ord_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================
-- 11. ORDER_ITEMS (주문 상품)
-- =============================================
CREATE TABLE order_items (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  order_id      INT UNSIGNED    NOT NULL,
  product_id    INT UNSIGNED    NOT NULL,
  option_id     INT UNSIGNED,
  -- 주문 당시 스냅샷
  product_name  VARCHAR(200)    NOT NULL,
  option_value  VARCHAR(50),
  unit_price    INT UNSIGNED    NOT NULL,
  qty           INT UNSIGNED    NOT NULL,
  subtotal      INT UNSIGNED    NOT NULL              COMMENT 'unit_price * qty',
  PRIMARY KEY (id),
  INDEX idx_order   (order_id),
  INDEX idx_product (product_id),
  CONSTRAINT fk_item_order FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_prod  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- =============================================
-- 12. REVIEWS (리뷰)
-- =============================================
CREATE TABLE reviews (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED    NOT NULL,
  product_id    INT UNSIGNED    NOT NULL,
  order_item_id INT UNSIGNED                          COMMENT '구매 확인용',
  rating        TINYINT UNSIGNED NOT NULL             COMMENT '1~5',
  content       TEXT,
  img_url       VARCHAR(500),
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_review (user_id, order_item_id),
  INDEX idx_product (product_id),
  CONSTRAINT fk_rev_user    FOREIGN KEY (user_id)       REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rev_prod    FOREIGN KEY (product_id)    REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_rev_item    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL,
  CONSTRAINT chk_rating     CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- =============================================
-- VIEW: 상품 평균 평점
-- =============================================
CREATE VIEW v_product_ratings AS
SELECT
  p.id,
  p.name,
  p.brand,
  p.price,
  p.sale_price,
  COUNT(r.id)        AS review_count,
  ROUND(AVG(r.rating), 1) AS avg_rating
FROM products p
LEFT JOIN reviews r ON r.product_id = p.id AND r.is_active = 1
WHERE p.is_active = 1
GROUP BY p.id;

-- =============================================
-- VIEW: 주문 요약
-- =============================================
CREATE VIEW v_order_summary AS
SELECT
  o.id,
  o.order_no,
  o.status,
  o.final_price,
  o.created_at,
  u.name    AS user_name,
  u.email   AS user_email,
  COUNT(oi.id) AS item_count
FROM orders o
JOIN users       u  ON u.id = o.user_id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id;
