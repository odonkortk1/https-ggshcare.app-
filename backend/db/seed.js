// Run with: npm run seed
// Creates or updates the development admin staff account.
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import db, { initSchema } from './index.js';

await initSchema();

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || 'admin@ggshcanteen.com').trim().toLowerCase();
const ADMIN_PIN = process.env.SEED_ADMIN_PIN || '123456';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Admin';
const RESET_EXISTING = process.env.SEED_ADMIN_RESET === 'true';

if (!/^\d{6}$/.test(ADMIN_PIN)) {
  throw new Error('SEED_ADMIN_PIN must be exactly 6 digits');
}

const existing = await db.execute({
  sql: 'SELECT id FROM staff WHERE email = ?',
  args: [ADMIN_EMAIL],
});

if (existing.rows.length) {
  if (RESET_EXISTING) {
    const pinHash = await bcrypt.hash(ADMIN_PIN, 10);
    await db.execute({
      sql: 'UPDATE staff SET pin_hash = ?, full_name = ?, role = ? WHERE email = ?',
      args: [pinHash, ADMIN_NAME, 'admin', ADMIN_EMAIL],
    });
    console.log(`Admin account reset: ${ADMIN_EMAIL}`);
  } else {
    console.log(`Admin account already exists: ${ADMIN_EMAIL}. Set SEED_ADMIN_RESET=true to reset its PIN.`);
  }
} else {
  const id = randomUUID();
  const pinHash = await bcrypt.hash(ADMIN_PIN, 10);
  await db.execute({
    sql: 'INSERT INTO staff (id, email, pin_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
    args: [id, ADMIN_EMAIL, pinHash, ADMIN_NAME, 'admin'],
  });
  console.log(`Created admin account: ${ADMIN_EMAIL}`);
}
