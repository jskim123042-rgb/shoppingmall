const router = require('express').Router();
const pool   = require('../config/db');
const { auth } = require('../middleware/auth');

// GET /api/cart — 장바구니 조회
router.get('/', auth, async (req, res) => {
  try {
    const [items] = await pool.query(
      `SELECT
        ci.id, ci.qty,
        p.id AS product_id, p.name, p.brand,
        COALESCE(p.sale_price, p.price) AS unit_price,
        po.id AS option_id, po.type AS option_type, po.value AS option_value,
        i.url AS thumbnail
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       LEFT JOIN product_options po ON po.id = ci.option_id
       LEFT JOIN product_images i ON i.product_id = p.id AND i.is_thumbnail = 1
       WHERE ci.user_id = ?`,
      [req.user.id]
    );
    const total = items.reduce((s, i) => s + i.unit_price * i.qty, 0);
    res.json({ items, total });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// POST /api/cart — 장바구니 추가
router.post('/', auth, async (req, res) => {
  const { product_id, option_id, qty = 1 } = req.body;
  if (!product_id) return res.status(400).json({ message: 'product_id는 필수입니다.' });
  try {
    await pool.query(
      `INSERT INTO cart_items (user_id, product_id, option_id, qty)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)`,
      [req.user.id, product_id, option_id || null, qty]
    );
    res.status(201).json({ message: '장바구니에 추가됐어요!' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// PATCH /api/cart/:id — 수량 변경
router.patch('/:id', auth, async (req, res) => {
  const { qty } = req.body;
  if (!qty || qty < 1) return res.status(400).json({ message: '수량은 1 이상이어야 합니다.' });
  try {
    const [result] = await pool.query(
      'UPDATE cart_items SET qty=? WHERE id=? AND user_id=?',
      [qty, req.params.id, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: '항목을 찾을 수 없습니다.' });
    res.json({ message: '수량이 변경됐어요.' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// DELETE /api/cart/:id — 항목 삭제
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({ message: '삭제됐어요.' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// DELETE /api/cart — 전체 비우기
router.delete('/', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id=?', [req.user.id]);
    res.json({ message: '장바구니를 비웠어요.' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

module.exports = router;
