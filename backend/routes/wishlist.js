const router = require('express').Router();
const pool   = require('../config/db');
const { auth } = require('../middleware/auth');

// GET /api/wishlist
router.get('/', auth, async (req, res) => {
  try {
    const [items] = await pool.query(
      `SELECT w.id, w.created_at,
              p.id AS product_id, p.name, p.brand,
              p.price, p.sale_price,
              i.url AS thumbnail
       FROM wishlists w
       JOIN products p ON p.id = w.product_id
       LEFT JOIN product_images i ON i.product_id = p.id AND i.is_thumbnail = 1
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// POST /api/wishlist — 찜 토글
router.post('/', auth, async (req, res) => {
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ message: 'product_id는 필수입니다.' });
  try {
    const [rows] = await pool.query(
      'SELECT id FROM wishlists WHERE user_id=? AND product_id=?',
      [req.user.id, product_id]
    );
    if (rows.length) {
      await pool.query('DELETE FROM wishlists WHERE user_id=? AND product_id=?', [req.user.id, product_id]);
      res.json({ wished: false, message: '찜 목록에서 제거됐어요.' });
    } else {
      await pool.query('INSERT INTO wishlists (user_id, product_id) VALUES (?,?)', [req.user.id, product_id]);
      res.status(201).json({ wished: true, message: '찜 목록에 추가됐어요!' });
    }
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

module.exports = router;
