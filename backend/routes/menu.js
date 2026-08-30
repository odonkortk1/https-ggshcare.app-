import express from 'express';
import db from '../db/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM menu_items ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching menu:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, description = null, category, price, available = true, image_url = null } = req.body;
  if (!name || !category || price == null) return res.status(400).json({ error: 'name, category and price are required' });
  try {
    const id = crypto.randomUUID();
    const result = await db.execute({
      sql: `INSERT INTO menu_items (id, name, description, category, price, available, is_available, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [id, name, description, category, Number(price), available ? 1 : 0, available ? 1 : 0, image_url],
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, description = null, category, price, available, image_url = null } = req.body;
  try {
    const result = await db.execute({
      sql: `UPDATE menu_items SET name = ?, description = ?, category = ?, price = ?, available = ?, is_available = ?, image_url = ? WHERE id = ? RETURNING *`,
      args: [name, description, category, Number(price), available ? 1 : 0, available ? 1 : 0, image_url, req.params.id],
    });
    if (!result.rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'DELETE FROM menu_items WHERE id = ? RETURNING id', args: [req.params.id] });
    if (!result.rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Menu item deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
