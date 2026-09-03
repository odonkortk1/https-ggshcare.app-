import express from 'express';
import { randomUUID } from 'node:crypto';
import db from '../db/index.js';
import { requireStaff } from './middleware/auth.js';

const router = express.Router();

// Order creation remains public for customers. Reading and updating orders
// requires an authenticated staff JWT.
router.get('/', requireStaff, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching orders:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireStaff, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM orders WHERE id = ?',
      args: [req.params.id],
    });
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching order:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const {
    customer_name,
    items,
    total_amount,
    total,
    status = 'New',
    pickup_note = '',
    payment_method = '',
    client_phone = '',
  } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one order item is required' });
  }

  try {
    const calculatedTotal = items.reduce((sum, item) => {
      const price = Number(item.price);
      const quantity = Number(item.quantity);
      if (!Number.isFinite(price) || price < 0 || !Number.isFinite(quantity) || quantity <= 0) {
        throw new Error('Invalid item price or quantity');
      }
      return sum + price * quantity;
    }, 0);

    const suppliedTotal = total ?? total_amount;
    const amount = suppliedTotal == null ? calculatedTotal : Number(suppliedTotal);

    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ error: 'Invalid order total' });
    }

    const id = randomUUID();
    const result = await db.execute({
      sql: `INSERT INTO orders (id, customer_name, items, total, total_amount, status, pickup_note, payment_method, client_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        id,
        customer_name || '',
        JSON.stringify(items),
        amount,
        amount,
        status,
        pickup_note || '',
        payment_method || '',
        client_phone || '',
      ],
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating order:', err?.stack || err?.message || err);
    res.status(500).json({ error: err?.message || 'Failed to create order' });
  }
});

router.patch('/:id/status', requireStaff, async (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    const result = await db.execute({
      sql: 'UPDATE orders SET status = ? WHERE id = ? RETURNING *',
      args: [status, req.params.id],
    });
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating order status:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
