const router = require('express').Router();
const pool   = require('../config/db');
const { auth } = require('../middleware/auth');

// GET /api/reviews?product_id=1 — 상품 리뷰 목록
router.get('/', async (req, res) => {
  const { product_id, page = 1, limit = 10 } = req.query;
  if (!product_id) return res.status(400).json({ message: 'product_id는 필수입니다.' });
  const offset = (Number(page) - 1) * Number(limit);
  try {
    const [reviews] = await pool.query(
      `SELECT r.id, r.rating, r.content, r.img_url, r.created_at, u.name AS user_name
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id=? AND r.is_active=1
       ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [product_id, Number(limit), offset]
    );
    const [[{ total, avg }]] = await pool.query(
      'SELECT COUNT(*) AS total, ROUND(AVG(rating),1) AS avg FROM reviews WHERE product_id=? AND is_active=1',
      [product_id]
    );
    res.json({ reviews, total, avg });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// POST /api/reviews — 리뷰 작성
router.post('/', auth, async (req, res) => {
  const { product_id, order_item_id, rating, content, img_url } = req.body;
  if (!product_id || !rating) return res.status(400).json({ message: '상품과 평점은 필수입니다.' });
  if (rating < 1 || rating > 5) return res.status(400).json({ message: '평점은 1~5 사이여야 합니다.' });
  try {
    // 구매 확인
    if (order_item_id) {
      const [[item]] = await pool.query(
        'SELECT oi.id FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.id=? AND o.user_id=? AND o.status="delivered"',
        [order_item_id, req.user.id]
      );
      if (!item) return res.status(403).json({ message: '구매 완료 후 리뷰를 작성할 수 있습니다.' });
    }
    const [result] = await pool.query(
      'INSERT INTO reviews (user_id, product_id, order_item_id, rating, content, img_url) VALUES (?,?,?,?,?,?)',
      [req.user.id, product_id, order_item_id || null, rating, content || null, img_url || null]
    );
    res.status(201).json({ message: '리뷰가 등록됐어요!', reviewId: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: '이미 리뷰를 작성하셨습니다.' });
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// DELETE /api/reviews/:id — 리뷰 삭제
router.delete('/:id', auth, async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE reviews SET is_active=0 WHERE id=? AND user_id=?',
      [req.params.id, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: '리뷰를 찾을 수 없습니다.' });
    res.json({ message: '리뷰가 삭제됐어요.' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

module.exports = router;
