import 'dotenv/config';
import express from 'express';
import './db/index.js';

import clientAuthRoutes from './routes/clientAuth.js';
import staffAuthRoutes from './routes/staffAuth.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Dynamically reflect the request origin to allow credentials safely
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use('/api/client-auth', clientAuthRoutes);
app.use('/api/staff-auth', staffAuthRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`GGSH Canteen backend running on http://localhost:${PORT}`);
});