require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Request มากเกินไป กรุณารอสักครู่' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'พยายาม login/register มากเกินไป กรุณารอ 15 นาที' } });

const authRoutes     = require('./routes/auth');
const productRoutes  = require('./routes/products');
const orderRoutes    = require('./routes/orders');
const discountRoutes = require('./routes/discounts');
const reviewRoutes   = require('./routes/reviews');
const adminRoutes       = require('./routes/admin');
const instagramRoutes   = require('./routes/instagram');
const teamRoutes        = require('./routes/team');

const app  = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin (Netlify Functions) and listed origins
    if (!origin || allowedOrigins.some(o => origin.startsWith(o)) || origin.includes('.netlify.app')) {
      cb(null, true);
    } else {
      cb(new Error('CORS not allowed'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth',      authLimiter, authRoutes);
app.use('/api/products',  limiter, productRoutes);
app.use('/api/orders',    orderRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/reviews',   reviewRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/instagram', limiter, instagramRoutes);
app.use('/api/team',      limiter, teamRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));


app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Local dev only — Netlify Functions จะ import app โดยตรงแทน listen
if (require.main === module) {
  app.listen(PORT, () => console.log(`🟢 Zentara API running on http://localhost:${PORT}`));
}

module.exports = app;
