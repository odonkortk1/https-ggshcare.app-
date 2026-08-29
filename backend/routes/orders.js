import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

// GET all orders
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching orders:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST new order
router.post('/', async (req, res) => {
  const { customer_name, items, total_amount, status = 'New' } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO orders (customer_name, items, total_amount, status) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [customer_name, JSON.stringify(items), total_amount, status]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH/PUT update order status
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;