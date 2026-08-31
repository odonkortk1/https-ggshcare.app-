import express from 'express';
import db from '../db/index.js';

const router = express.Router();

// GET all menu items
router.get('/', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM menu_items ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching menu:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST new menu item
router.post('/', async (req, res) => {
  const { name, description = null, category, price, is_available = 1, is_special = 0, image_url = null } = req.body;
  
  if (!name || !category || price == null) {
    return res.status(400).json({ error: 'name, category, and price are required' });
  }

  try {
    const id = crypto.randomUUID();
    const result = await db.execute({
      sql: `INSERT INTO menu_items (id, name, description, category, price, is_available, is_special, image_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        id, 
        name, 
        description, 
        category, 
        Number(price), 
        is_available ? 1 : 0, 
        is_special ? 1 : 0, 
        image_url
      ],
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating menu item:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT update menu item
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // 1. Fetch current item details to support partial updates/toggles
    const existing = await db.execute({
      sql: 'SELECT * FROM menu_items WHERE id = ?',
      args: [id],
    });

    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const current = existing.rows[0];

    // 2. Extract incoming values or retain existing database values
    const name = req.body.name !== undefined ? req.body.name : current.name;
    const description = req.body.description !== undefined ? req.body.description : current.description;
    const category = req.body.category !== undefined ? req.body.category : current.category;
    const price = req.body.price !== undefined ? Number(req.body.price) : current.price;
    const image_url = req.body.image_url !== undefined ? req.body.image_url : current.image_url;

    // Handle boolean flags for is_available and is_special (accepting both 'available' and 'is_available' keys)
    const availInput = req.body.is_available ?? req.body.available;
    const is_available = availInput !== undefined ? (availInput ? 1 : 0) : current.is_available;
    
    const specInput = req.body.is_special ?? req.body.special;
    const is_special = specInput !== undefined ? (specInput ? 1 : 0) : current.is_special;

    // 3. Update item using correct Turso column names
    const result = await db.execute({
      sql: `UPDATE menu_items 
            SET name = ?, description = ?, category = ?, price = ?, is_available = ?, is_special = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ? RETURNING *`,
      args: [name, description, category, price, is_available, is_special, image_url, id],
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating menu item:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH support for partial updates (e.g. toggles)
router.patch('/:id', async (req, res, next) => {
  req.method = 'PUT';
  router.handle(req, res, next);
});

// DELETE menu item
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.execute({ 
      sql: 'DELETE FROM menu_items WHERE id = ? RETURNING id', 
      args: [req.params.id] 
    });
    
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json({ message: 'Menu item deleted successfully' });
  } catch (err) {
    console.error('Error deleting menu item:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;