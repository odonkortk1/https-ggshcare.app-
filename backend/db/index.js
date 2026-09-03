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

    // Migrate older Turso databases that already had an orders table.
    // CREATE TABLE IF NOT EXISTS does not add columns to an existing table.
    const orderColumnsResult = await db.execute('PRAGMA table_info(orders)');
    const orderColumns = new Set(orderColumnsResult.rows.map((row) => row.name));
    const orderMigrations = [
      ['total', 'REAL NOT NULL DEFAULT 0'],
      ['total_amount', 'REAL NOT NULL DEFAULT 0'],
      ['status', "TEXT DEFAULT 'pending'"],
      ['pickup_note', 'TEXT'],
      ['payment_method', 'TEXT'],
      ['client_phone', 'TEXT'],
      ['payment_reference', 'TEXT'],
      ['created_at', 'TEXT DEFAULT CURRENT_TIMESTAMP'],
    ];

    for (const [column, definition] of orderMigrations) {
      if (!orderColumns.has(column)) {
        await db.execute(`ALTER TABLE orders ADD COLUMN ${column} ${definition}`);
        console.log(`Database migration: added orders.${column}`);
      }
    }

    const result = await db.execute('SELECT COUNT(*) AS count FROM menu_items');
    const itemCount = Number(result.rows[0]?.count || 0);

    if (itemCount === 0) {
      await db.batch([
        {
          sql: `INSERT INTO menu_items (id, name, description, category, price, available, is_available, is_special) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: ['menu-1', 'Sobolo Drink', 'Refreshing hibiscus infusion with ginger.', 'Beverages', 5, 1, 1, 0],
        },
        {
          sql: `INSERT INTO menu_items (id, name, description, category, price, available, is_available, is_special) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: ['menu-2', 'Ampesi & Palava Sauce', 'Slice Yam or Plantain with palava sauce, fish and egg', 'Lunch', 45, 1, 1, 0],
        },
        {
          sql: `INSERT INTO menu_items (id, name, description, category, price, available, is_available, is_special) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: ['menu-3', 'Banku & Okro Stew', 'Traditional banku served with okro stew', 'Lunch', 35, 1, 1, 0],
        },
        {
          sql: `INSERT INTO menu_items (id, name, description, category, price, available, is_available, is_special) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: ['menu-4', 'Banku & Tilapia', 'Traditional banku served with grilled tilapia and pepper sauce.', 'Lunch', 50, 1, 1, 1],
        },
        {
          sql: `INSERT INTO menu_items (id, name, description, category, price, available, is_available, is_special) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: ['menu-5', 'Fried Rice', 'A flavorful plate of wok-fried rice tossed with tender vegetables, savory seasoning...', 'Lunch', 50, 1, 1, 1],
        },
        {
          sql: `INSERT INTO menu_items (id, name, description, category, price, available, is_available, is_special) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: ['menu-6', 'Jollof Rice', 'Rice cooked with a distinct deep, savory flavor, aromatic spices...', 'Lunch', 50, 1, 1, 1],
        },
        {
          sql: `INSERT INTO menu_items (id, name, description, category, price, available, is_available, is_special) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: ['menu-7', 'Waakye', 'Rice and tender beans simmered with dried millet stalks. Served with shito, rich stew...', 'Lunch', 45, 1, 1, 1],
        },
        {
          sql: `INSERT INTO menu_items (id, name, description, category, price, available, is_available, is_special) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: ['menu-8', 'Spring Rolls', 'Crunchy flour wrap filled with a savory mix of finely shredded vegetables and...', 'Snacks', 10, 1, 1, 1],
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
