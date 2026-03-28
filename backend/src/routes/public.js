import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { query } from '../db.js';
import { hashPassword, verifyPassword } from '../security/passwords.js';

export const publicRouter = express.Router();

publicRouter.get(
  '/gallery',
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM gallery ORDER BY id DESC', {});
    res.json({ gallery: rows });
  })
);

publicRouter.get(
  '/hero',
  asyncHandler(async (req, res) => {
    const rows = await query(
      'SELECT id, title, subtitle, image_path, sort_order FROM hero_images WHERE active=1 ORDER BY sort_order ASC, id DESC',
      {}
    );
    res.json({ hero: rows });
  })
);
publicRouter.post(
  '/customer/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    const emailStr = String(email ?? '').trim().toLowerCase();
    const passwordStr = String(password ?? '');
    if (!emailStr || !passwordStr) return res.status(400).json({ error: 'email and password required' });

    const rows = await query(
      'SELECT id, name, email, phone, address, created_at, password_hash FROM customers WHERE LOWER(email)=:email ORDER BY id DESC LIMIT 1',
      { email: emailStr }
    );
    const customer = rows[0];
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (!customer.password_hash) return res.status(400).json({ error: 'Please create a new customer account.' });

    const ok = await verifyPassword(passwordStr, customer.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    delete customer.password_hash;
    res.json({ ok: true, customer });
  })
);

publicRouter.post(
  '/customer/register',
  asyncHandler(async (req, res) => {
    const { name, phone, email, address, password } = req.body ?? {};
    const nameStr = String(name ?? '').trim();
    const phoneStr = String(phone ?? '').trim();
    const emailStr = String(email ?? '').trim().toLowerCase();
    const passwordStr = String(password ?? '');
    if (!nameStr || !phoneStr || !emailStr || !passwordStr) {
      return res.status(400).json({ error: 'name, email, phone, and password required' });
    }

    const existing = await query(
      'SELECT id FROM customers WHERE phone=:phone OR LOWER(email)=:email ORDER BY id DESC LIMIT 1',
      { phone: phoneStr, email: emailStr }
    );
    if (existing.length > 0) return res.status(409).json({ error: 'Customer already registered. Use login.' });

    const password_hash = await hashPassword(passwordStr);
    const out = await query('INSERT INTO customers (name, email, phone, address, password_hash) VALUES (:name,:email,:phone,:address,:password_hash)', {
      name: nameStr,
      email: emailStr,
      phone: phoneStr,
      address: address ?? null,
      password_hash
    });

    res.json({ ok: true, id: out?.insertId ?? null });
  })
);

publicRouter.post(
  '/queries',
  asyncHandler(async (req, res) => {
    const { name, phone, email, message } = req.body ?? {};
    if (!name || !phone || !message) return res.status(400).json({ error: 'name, phone, message required' });
    await query('INSERT INTO queries (name, phone, email, message) VALUES (:name,:phone,:email,:message)', {
      name,
      phone,
      email: email ?? null,
      message
    });
    res.json({ ok: true });
  })
);

publicRouter.post(
  '/quotations',
  asyncHandler(async (req, res) => {
    const { name, phone, requirement } = req.body ?? {};
    if (!name || !phone || !requirement) return res.status(400).json({ error: 'name, phone, requirement required' });
    await query('INSERT INTO quotations (customer_name, customer_phone, requirement_detail) VALUES (:name,:phone,:requirement)', {
      name,
      phone,
      requirement
    });
    res.json({ ok: true });
  })
);

publicRouter.post(
  '/customers',
  asyncHandler(async (req, res) => {
    const { name, phone, email, address } = req.body ?? {};
    if (!name || !phone) return res.status(400).json({ error: 'name, phone required' });
    await query('INSERT INTO customers (name, email, phone, address) VALUES (:name,:email,:phone,:address)', {
      name,
      email: email ?? null,
      phone,
      address: address ?? null
    });
    res.json({ ok: true });
  })
);

publicRouter.post(
  '/feedback',
  asyncHandler(async (req, res) => {
    const { name, rating, comment } = req.body ?? {};
    if (!name || !rating) return res.status(400).json({ error: 'name, rating required' });
    await query('INSERT INTO feedback (customer_name, rating, comment) VALUES (:name,:rating,:comment)', {
      name,
      rating,
      comment: comment ?? null
    });
    res.json({ ok: true });
  })
);

publicRouter.get(
  '/content',
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM site_content', {});
    res.json({ content: rows });
  })
);
