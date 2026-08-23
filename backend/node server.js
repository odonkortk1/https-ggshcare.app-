import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import './db/index.js';

import clientAuthRoutes from './routes/clientAuth.js';
import staffAuthRoutes from './routes/staffAuth.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Allow all origins to resolve deployment CORS issues
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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