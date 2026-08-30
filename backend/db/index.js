import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('FATAL DB ERROR: TURSO_DATABASE_URL environment variable is missing.');
}

const db = createClient({
  url: url || 'file:local.db',
  authToken: authToken || undefined,
});

export async function initSchema() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        phone_number TEXT UNIQUE NOT NULL,
        pin_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        pin_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staff',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category TEXT NOT NULL,
        image_url TEXT,
        available INTEGER DEFAULT 1,
        is_available INTEGER DEFAULT 1,
        is_special INTEGER DEFAULT 0
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_name TEXT,
        items TEXT NOT NULL,
        total REAL NOT NULL DEFAULT 0,
        total_amount REAL NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        pickup_note TEXT,
        payment_method TEXT,
        client_phone TEXT,
        payment_reference TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await db.execute('SELECT COUNT(*) AS count FROM menu_items');
    const itemCount = Number(result.rows[0]?.count || 0);

    if (itemCount === 0) {
      await db.batch([
        {
          sql: `INSERT INTO menu_items (id, name, category, price, available, is_available) VALUES (?, ?, ?, ?, ?, ?)`,
          args: ['menu-1', 'Jollof Rice with Chicken', 'Lunch', 35, 1, 1],
        },
        {
          sql: `INSERT INTO menu_items (id, name, category, price, available, is_available) VALUES (?, ?, ?, ?, ?, ?)`,
          args: ['menu-2', 'Fried Rice with Fish', 'Lunch', 40, 1, 1],
        },
        {
          sql: `INSERT INTO menu_items (id, name, category, price, available, is_available) VALUES (?, ?, ?, ?, ?, ?)`,
          args: ['menu-3', 'Egg Sandwich & Tea', 'Breakfast', 20, 1, 1],
        },
        {
          sql: `INSERT INTO menu_items (id, name, category, price, available, is_available) VALUES (?, ?, ?, ?, ?, ?)`,
          args: ['menu-4', 'Fresh Fruit Juice', 'Beverages', 15, 1, 1],
        },
      ]);
      console.log('Default menu items seeded successfully.');
    }

    console.log(`Turso database connected: ${itemCount} menu items loaded.`);
  } catch (err) {
    const errorDetail = err?.message || err?.cause?.message || String(err);
    console.error('Error initializing Turso database schema:', errorDetail);
    throw err;
  }
}

export default db;
