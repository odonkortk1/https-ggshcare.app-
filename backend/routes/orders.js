import express from 'express';
import db from '../db/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching orders:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { customer_name, items, total_amount, total, status = 'New', pickup_note = '', payment_method = '', client_phone = '' } = req.body;
  if (!items?.length || total_amount == null && total == null) return res.status(400).json({ error: 'items and total amount are required' });
  try {
    const id = crypto.randomUUID();
    const amount = Number(total ?? total_amount);
    const result = await db.execute({
      sql: `INSERT INTO orders (id, customer_name, items, total, total_amount, status, pickup_note, payment_method, client_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [id, customer_name || '', JSON.stringify(items), amount, amount, status, pickup_note, payment_method, client_phone],
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const result = await db.execute({ sql: 'UPDATE orders SET status = ? WHERE id = ? RETURNING *', args: [status, req.params.id] });
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
