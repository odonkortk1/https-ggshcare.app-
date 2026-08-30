import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import { signStaffToken, requireAdmin } from './middleware/auth.js';

const router = express.Router();
const validatePin = (pin) => /^\d{6}$/.test(pin);

router.post('/login', async (req, res) => {
  const { email, pin } = req.body;
  if (!email || !pin) return res.status(400).json({ error: 'Email and PIN are required' });
  if (!validatePin(pin)) return res.status(400).json({ error: 'PIN must be exactly 6 digits' });
  try {
    const result = await db.execute({ sql: 'SELECT * FROM staff WHERE email = ?', args: [email.toLowerCase().trim()] });
    const staff = result.rows[0];
    if (!staff || !(await bcrypt.compare(pin, staff.pin_hash))) return res.status(401).json({ error: 'Invalid email or PIN' });
    const token = signStaffToken(staff);
    res.json({ token, staff_id: staff.id, email: staff.email, full_name: staff.full_name, role: staff.role || 'staff' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/change-pin', async (req, res) => {
  const { email, old_pin, new_pin } = req.body;
  if (!email || !old_pin || !new_pin) return res.status(400).json({ error: 'Email, current PIN, and new PIN are required' });
  if (!validatePin(new_pin)) return res.status(400).json({ error: 'New PIN must be exactly 6 digits' });
  if (old_pin === new_pin) return res.status(400).json({ error: 'New PIN must be different from current PIN' });
  try {
    const result = await db.execute({ sql: 'SELECT * FROM staff WHERE email = ?', args: [email.toLowerCase().trim()] });
    const staff = result.rows[0];
    if (!staff || !(await bcrypt.compare(old_pin, staff.pin_hash))) return res.status(401).json({ error: 'Current PIN is incorrect' });
    const pinHash = await bcrypt.hash(new_pin, 10);
    await db.execute({ sql: 'UPDATE staff SET pin_hash = ? WHERE id = ?', args: [pinHash, staff.id] });
    res.json({ success: true, message: 'PIN changed successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/staff', requireAdmin, async (req, res) => {
  try {
    const result = await db.execute('SELECT id, email, full_name, role, created_at FROM staff ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/staff', requireAdmin, async (req, res) => {
  const { full_name, email, pin, role } = req.body;
  if (!full_name?.trim() || !email?.trim() || !validatePin(pin)) return res.status(400).json({ error: 'full_name, email, and a valid 6-digit pin are required' });
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db.execute({ sql: 'SELECT id FROM staff WHERE email = ?', args: [normalizedEmail] });
    if (existing.rows.length) return res.status(409).json({ error: 'This email is already in use' });
    const staff = { id: crypto.randomUUID(), email: normalizedEmail, full_name: full_name.trim(), role: role === 'admin' ? 'admin' : 'staff' };
    const pinHash = await bcrypt.hash(pin, 10);
    await db.execute({ sql: 'INSERT INTO staff (id, email, pin_hash, full_name, role) VALUES (?, ?, ?, ?, ?)', args: [staff.id, staff.email, pinHash, staff.full_name, staff.role] });
    res.status(201).json(staff);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/staff/:id/reset-pin', requireAdmin, async (req, res) => {
  const { pin } = req.body;
  if (!validatePin(pin)) return res.status(400).json({ error: 'A valid 6-digit pin is required' });
  try {
    const staff = await db.execute({ sql: 'SELECT id FROM staff WHERE id = ?', args: [req.params.id] });
    if (!staff.rows.length) return res.status(404).json({ error: 'Staff member not found' });
    const pinHash = await bcrypt.hash(pin, 10);
    await db.execute({ sql: 'UPDATE staff SET pin_hash = ? WHERE id = ?', args: [pinHash, req.params.id] });
    res.json({ success: true, message: 'PIN reset successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/staff/:id', requireAdmin, async (req, res) => {
  try {
    const result = await db.execute({ sql: 'DELETE FROM staff WHERE id = ?', args: [req.params.id] });
    if (!result.rowsAffected) return res.status(404).json({ error: 'Staff member not found' });
    res.json({ success: true, message: 'Staff account removed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
