const router = require('express').Router();
const pool   = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

// 주문 번호 생성
function generateOrderNo() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `ORD-${date}-${rand}`;
}

// GET /api/orders — 내 주문 목록
router.get('/', auth, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  try {
    const [orders] = await pool.query(
      `SELECT o.id, o.order_no, o.status, o.final_price, o.created_at,
              COUNT(oi.id) AS item_count,
              MIN(i.url) AS thumbnail
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN product_images i ON i.product_id = oi.product_id AND i.is_thumbnail = 1
       WHERE o.user_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, Number(limit), offset]
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// GET /api/orders/:id — 주문 상세
router.get('/:id', auth, async (req, res) => {
  try {
    const [[order]] = await pool.query(
      'SELECT * FROM orders WHERE id=? AND user_id=?',
      [req.params.id, req.user.id]
    );
    if (!order) return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });

    const [items] = await pool.query(
      `SELECT oi.*, i.url AS thumbnail
       FROM order_items oi
       LEFT JOIN product_images i ON i.product_id = oi.product_id AND i.is_thumbnail = 1
       WHERE oi.order_id = ?`,
      [order.id]
    );
    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// POST /api/orders — 주문 생성
router.post('/', auth, async (req, res) => {
  const { address_id, coupon_code, payment_method, memo, items } = req.body;
  if (!address_id || !payment_method || !items?.length) {
    return res.status(400).json({ message: '배송지, 결제수단, 상품 정보는 필수입니다.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 배송지 조회
    const [[addr]] = await conn.query('SELECT * FROM addresses WHERE id=? AND user_id=?', [address_id, req.user.id]);
    if (!addr) throw new Error('배송지를 찾을 수 없습니다.');

    // 상품 & 가격 검증
    let totalPrice = 0;
    const orderItems = [];
    for (const item of items) {
      const [[prod]] = await conn.query('SELECT * FROM products WHERE id=? AND is_active=1', [item.product_id]);
      if (!prod) throw new Error(`상품(${item.product_id})을 찾을 수 없습니다.`);

      let optionValue = null, extraPrice = 0;
      if (item.option_id) {
        const [[opt]] = await conn.query('SELECT * FROM product_options WHERE id=? AND product_id=?', [item.option_id, prod.id]);
        if (!opt) throw new Error('옵션을 찾을 수 없습니다.');
        if (opt.stock < item.qty) throw new Error(`${prod.name} ${opt.value} 재고가 부족합니다.`);
        optionValue = opt.value;
        extraPrice  = opt.extra_price;
        await conn.query('UPDATE product_options SET stock=stock-? WHERE id=?', [item.qty, opt.id]);
      } else {
        if (prod.stock < item.qty) throw new Error(`${prod.name} 재고가 부족합니다.`);
        await conn.query('UPDATE products SET stock=stock-? WHERE id=?', [item.qty, prod.id]);
      }

      const unitPrice = (prod.sale_price || prod.price) + extraPrice;
      const subtotal  = unitPrice * item.qty;
      totalPrice += subtotal;
      orderItems.push({ product_id: prod.id, option_id: item.option_id || null, product_name: prod.name, option_value: optionValue, unit_price: unitPrice, qty: item.qty, subtotal });
    }

    // 쿠폰 처리
    let discountAmount = 0, couponId = null;
    if (coupon_code) {
      const [[coupon]] = await conn.query(
        'SELECT * FROM coupons WHERE code=? AND is_active=1 AND started_at<=NOW() AND expired_at>=NOW()',
        [coupon_code]
      );
      if (!coupon) throw new Error('유효하지 않은 쿠폰입니다.');
      if (coupon.total_qty && coupon.used_qty >= coupon.total_qty) throw new Error('쿠폰이 모두 소진됐습니다.');
      if (totalPrice < coupon.min_order) throw new Error(`최소 주문금액 ${coupon.min_order.toLocaleString()}원 이상 시 사용 가능합니다.`);

      discountAmount = coupon.type === 'percent'
        ? Math.min(Math.floor(totalPrice * coupon.value / 100), coupon.max_discount || Infinity)
        : coupon.value;
      couponId = coupon.id;
      await conn.query('UPDATE coupons SET used_qty=used_qty+1 WHERE id=?', [coupon.id]);
    }

    const shippingFee  = totalPrice - discountAmount >= 50000 ? 0 : 3000;
    const finalPrice   = totalPrice - discountAmount + shippingFee;
    const orderNo      = generateOrderNo();

    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, coupon_id, order_no, status, total_price, discount_amount, shipping_fee, final_price,
        recipient, phone, zip_code, address1, address2, payment_method, payment_at, memo)
       VALUES (?,?,?,'paid',?,?,?,?,?,?,?,?,?,?,NOW(),?)`,
      [req.user.id, couponId, orderNo, totalPrice, discountAmount, shippingFee, finalPrice,
       addr.recipient, addr.phone, addr.zip_code, addr.address1, addr.address2, payment_method, memo || null]
    );

    for (const oi of orderItems) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, option_id, product_name, option_value, unit_price, qty, subtotal) VALUES (?,?,?,?,?,?,?,?)',
        [orderResult.insertId, oi.product_id, oi.option_id, oi.product_name, oi.option_value, oi.unit_price, oi.qty, oi.subtotal]
      );
    }

    // 장바구니에서 주문한 상품 제거
    const productIds = items.map(i => i.product_id);
    await conn.query('DELETE FROM cart_items WHERE user_id=? AND product_id IN (?)', [req.user.id, productIds]);

    await conn.commit();
    res.status(201).json({ message: '주문이 완료됐어요!', orderId: orderResult.insertId, orderNo, finalPrice });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
});

// PATCH /api/orders/:id/cancel — 주문 취소
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const [[order]] = await pool.query('SELECT * FROM orders WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!order) return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    if (!['pending','paid'].includes(order.status)) {
      return res.status(400).json({ message: '배송 준비 이후에는 취소할 수 없습니다.' });
    }
    await pool.query('UPDATE orders SET status="cancelled" WHERE id=?', [order.id]);
    res.json({ message: '주문이 취소됐어요.' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// PATCH /api/orders/:id/status — 배송 상태 변경 (관리자)
router.patch('/:id/status', auth, adminOnly, async (req, res) => {
  const { status, tracking_no } = req.body;
  const allowed = ['pending','paid','preparing','shipped','delivered','cancelled','refunded'];
  if (!allowed.includes(status)) return res.status(400).json({ message: '유효하지 않은 상태입니다.' });
  try {
    await pool.query(
      'UPDATE orders SET status=?, tracking_no=COALESCE(?,tracking_no) WHERE id=?',
      [status, tracking_no || null, req.params.id]
    );
    res.json({ message: '상태가 변경됐어요.' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

module.exports = router;
