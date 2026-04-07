require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart',     require('./routes/cart'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/reviews',  require('./routes/reviews'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// 404
app.use((req, res) => res.status(404).json({ message: '존재하지 않는 API입니다.' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: '서버 오류가 발생했습니다.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 NOVA API 서버 실행 중 → http://localhost:${PORT}`));
