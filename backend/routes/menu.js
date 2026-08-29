import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

// GET all menu items
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM menu_items ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching menu:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST new menu item
router.post('/', async (req, res) => {
  const { name, category, price, available = true, image_url = null } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO menu_items (name, category, price, available, image_url) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, category, price, available, image_url]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update menu item
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, price, available, image_url } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE menu_items 
       SET name = $1, category = $2, price = $3, available = $4, image_url = $5 
       WHERE id = $6 RETURNING *`,
      [name, category, price, available, image_url, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE menu item
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('DELETE FROM menu_items WHERE id = $1 RETURNING *', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Menu item deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;