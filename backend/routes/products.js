const router = require('express').Router();
const pool   = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/products — 상품 목록 (필터/검색/페이징)
router.get('/', async (req, res) => {
  const { category, gender, q, sale, sort = 'newest', page = 1, limit = 12 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where = ['p.is_active = 1'];
  const params = [];

  if (category) { where.push('c.slug = ?'); params.push(category); }
  if (gender)   { where.push('gc.slug = ?'); params.push(gender); }
  if (sale)     { where.push('p.sale_price IS NOT NULL'); }
  if (q)        { where.push('MATCH(p.name, p.brand, p.description) AGAINST(? IN BOOLEAN MODE)'); params.push(`${q}*`); }

  const orderMap = {
    newest:     'p.created_at DESC',
    price_asc:  'COALESCE(p.sale_price, p.price) ASC',
    price_desc: 'COALESCE(p.sale_price, p.price) DESC',
    rating:     'avg_rating DESC',
  };
  const orderBy = orderMap[sort] || orderMap.newest;

  const sql = `
    SELECT
      p.id, p.name, p.brand, p.price, p.sale_price, p.is_new, p.stock,
      c.name AS category_name, c.slug AS category_slug,
      ANY_VALUE(i.url) AS thumbnail,
      ROUND(AVG(r.rating), 1) AS avg_rating,
      COUNT(DISTINCT r.id)    AS review_count,
      ROUND((1 - p.sale_price / p.price) * 100) AS discount_pct
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN categories gc ON gc.id = p.category_id
    LEFT JOIN product_images i ON i.product_id = p.id AND i.is_thumbnail = 1
    LEFT JOIN reviews r ON r.product_id = p.id AND r.is_active = 1
    WHERE ${where.join(' AND ')}
    GROUP BY p.id, p.name, p.brand, p.price, p.sale_price, p.is_new, p.stock, c.name, c.slug
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;
  params.push(Number(limit), offset);

  try {
    const [rows] = await pool.query(sql, params);
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE ${where.join(' AND ')}`,
      params.slice(0, -2)
    );
    res.json({ data: rows, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// GET /api/products/:id — 상품 상세
router.get('/:id', async (req, res) => {
  try {
    const [[product]] = await pool.query(
      `SELECT p.*, c.name AS category_name,
              ROUND((1 - p.sale_price / p.price) * 100) AS discount_pct
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = ? AND p.is_active = 1`,
      [req.params.id]
    );
    if (!product) return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });

    const [images]  = await pool.query('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order', [product.id]);
    const [options] = await pool.query('SELECT * FROM product_options WHERE product_id = ? AND is_active = 1', [product.id]);
    const [reviews] = await pool.query(
      `SELECT r.*, u.name AS user_name
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ? AND r.is_active = 1
       ORDER BY r.created_at DESC LIMIT 5`,
      [product.id]
    );
    const [[{ avg_rating, review_count }]] = await pool.query(
      'SELECT ROUND(AVG(rating),1) AS avg_rating, COUNT(*) AS review_count FROM reviews WHERE product_id = ? AND is_active = 1',
      [product.id]
    );

    res.json({ ...product, images, options, reviews, avg_rating, review_count });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// POST /api/products — 상품 등록 (관리자)
router.post('/', auth, adminOnly, async (req, res) => {
  const { category_id, name, brand, description, price, sale_price, sku, stock } = req.body;
  if (!category_id || !name || !brand || !price || !sku) {
    return res.status(400).json({ message: '필수 항목을 입력해주세요.' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO products (category_id, name, brand, description, price, sale_price, sku, stock) VALUES (?,?,?,?,?,?,?,?)',
      [category_id, name, brand, description, price, sale_price || null, sku, stock || 0]
    );
    res.status(201).json({ message: '상품이 등록됐어요.', productId: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: '이미 존재하는 SKU입니다.' });
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// PATCH /api/products/:id — 상품 수정 (관리자)
router.patch('/:id', auth, adminOnly, async (req, res) => {
  const fields = ['name','brand','description','price','sale_price','stock','is_active','is_new'];
  const updates = [];
  const values  = [];
  fields.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f}=?`); values.push(req.body[f]); } });
  if (!updates.length) return res.status(400).json({ message: '수정할 항목이 없습니다.' });
  values.push(req.params.id);
  try {
    await pool.query(`UPDATE products SET ${updates.join(',')} WHERE id=?`, values);
    res.json({ message: '상품이 수정됐어요.' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

module.exports = router;
