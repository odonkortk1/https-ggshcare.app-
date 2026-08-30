// Run with: npm run seed
// Creates one admin staff account.
import bcrypt from 'bcryptjs';
import db, { initSchema } from './index.js';

await initSchema();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@ggshcanteen.com';
const ADMIN_PIN = process.env.SEED_ADMIN_PIN || '123456';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Admin';

const existing = await db.execute({ sql: 'SELECT id FROM staff WHERE email = ?', args: [ADMIN_EMAIL.toLowerCase()] });
if (existing.rows.length) {
  console.log(`Admin account already exists: ${ADMIN_EMAIL}`);
} else {
  const id = crypto.randomUUID();
  const pinHash = await bcrypt.hash(ADMIN_PIN, 10);
  await db.execute({
    sql: 'INSERT INTO staff (id, email, pin_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
    args: [id, ADMIN_EMAIL.toLowerCase(), pinHash, ADMIN_NAME, 'admin'],
  });
  console.log(`Created admin account: ${ADMIN_EMAIL}`);
}
