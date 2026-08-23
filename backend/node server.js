import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import './db/index.js'; // ensures schema is applied on boot

import clientAuthRoutes from './routes/clientAuth.js';
import staffAuthRoutes from './routes/staffAuth.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  process.env.ALLOWED_ORIGIN,
  'https://https-ggshcare-app-1.onrender.com',
  'https://ggshcare-app-1.onrender.com',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS not allowed for this origin: ' + origin));
  },
  credentials: true
}));

// Stripe webhook needs the raw body for signature verification,
// so it must be registered BEFORE the global JSON body parser.
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