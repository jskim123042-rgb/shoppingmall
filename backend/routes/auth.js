const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const pool    = require('../config/db');
const { auth } = require('../middleware/auth');

// POST /api/auth/register — 회원가입
router.post('/register', async (req, res) => {
  const { email, password, name, phone } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ message: '이메일, 비밀번호, 이름은 필수입니다.' });
  }
  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length) return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, name, phone) VALUES (?, ?, ?, ?)',
      [email, hash, name, phone || null]
    );
    res.status(201).json({ message: '회원가입이 완료됐어요!', userId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// POST /api/auth/login — 로그인
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    if (!rows.length) return res.status(401).json({ message: '이메일 또는 비밀번호가 틀렸습니다.' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: '이메일 또는 비밀번호가 틀렸습니다.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// GET /api/auth/me — 내 정보
router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, email, name, phone, gender, birthdate, profile_img, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// PATCH /api/auth/me — 내 정보 수정
router.patch('/me', auth, async (req, res) => {
  const { name, phone, gender, birthdate } = req.body;
  try {
    await pool.query(
      'UPDATE users SET name=?, phone=?, gender=?, birthdate=? WHERE id=?',
      [name, phone, gender, birthdate, req.user.id]
    );
    res.json({ message: '정보가 수정됐어요.' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

module.exports = router;
