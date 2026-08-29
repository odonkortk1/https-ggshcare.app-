import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Create PostgreSQL Connection Pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  try {
    // 1. Create menu_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        available BOOLEAN DEFAULT true,
        image_url TEXT
      );
    `);

    // 2. Create orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255),
        items TEXT NOT NULL,
        total_amount NUMERIC(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'New',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Seed menu items ONLY if table is empty
    const res = await pool.query('SELECT COUNT(*) FROM menu_items');
    const itemCount = parseInt(res.rows[0].count, 10);

    if (itemCount === 0) {
      console.log('Database table empty. Seeding initial menu data...');
      await pool.query(`
        INSERT INTO menu_items (name, category, price, available) VALUES
        ('Jollof Rice with Chicken', 'Lunch', 35.00, true),
        ('Fried Rice with Fish', 'Lunch', 40.00, true),
        ('Egg Sandwich & Tea', 'Breakfast', 20.00, true),
        ('Fresh Fruit Juice', 'Beverages', 15.00, true);
      `);
      console.log('Default menu items seeded successfully.');
    } else {
      console.log(`PostgreSQL Connected: Loaded ${itemCount} persistent menu items.`);
    }
  } catch (err) {
    console.error('Error initializing PostgreSQL database:', err.message);
  }
}

initDB();

export default pool;