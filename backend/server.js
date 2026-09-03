import 'dotenv/config';
import express from 'express';
import { initSchema } from './db/index.js';

import clientAuthRoutes from './routes/clientAuth.js';
import staffAuthRoutes from './routes/staffAuth.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS_ORIGIN may contain one or more comma-separated frontend origins.
// When it is not configured, keep local development convenient by reflecting
// the requesting origin. Production deployments should set CORS_ORIGIN.
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowOrigin = configuredOrigins.length === 0
    ? origin
    : configuredOrigins.includes(origin);

  if (allowOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return allowOrigin ? res.sendStatus(204) : res.sendStatus(403);
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

app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', database: 'turso' });
});

try {
  await initSchema();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GGSH Canteen backend running on port ${PORT}`);
  });
} catch (err) {
  console.error('Failed to initialize backend:', err);
  process.exit(1);
}
