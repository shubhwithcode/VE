import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { config } from '../config.js';
import { query } from '../db.js';
import { verifyPassword } from '../security/passwords.js';
import { signAuthToken } from '../security/tokens.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = express.Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body ?? {};
    const identifier = String(username ?? '').trim();
    if (!identifier || !password) return res.status(400).json({ error: 'username and password required' });

    // Numeric identifiers may be a staff ID, phone number, or even a numeric username.
    // Try staff_id first, then fall back to username/phone matching.
    if (/^\d+$/.test(identifier)) {
      const staff_id = Number(identifier);
      const rows = await query('SELECT staff_id, username, phone, password_hash, role FROM staff WHERE staff_id=:staff_id', {
        staff_id
      });
      let user = rows[0] ?? null;

      if (!user) {
        const numericRows = await query(
          'SELECT staff_id, username, phone, password_hash, role FROM staff WHERE username = :id OR phone = :id',
          { id: identifier }
        );

        user = numericRows.find((r) => r.username === identifier) ?? null;
        if (!user && numericRows.length === 1) user = numericRows[0];
        if (!user && numericRows.length > 1) {
          const phoneMatches = numericRows.filter((r) => String(r.phone ?? '') === identifier);
          if (phoneMatches.length === 1) user = phoneMatches[0];
        }
      }

      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const ok = await verifyPassword(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

      const token = signAuthToken({ staff_id: user.staff_id, role: user.role });
      res.cookie(config.auth.cookieName, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.auth.cookieSecure,
        maxAge: config.auth.tokenTtlSeconds * 1000
      });

      const payload = { ok: true, role: user.role };
      if (config.auth.exposeToken) payload.token = token;
      return res.json(payload);
    }

    const rows = await query(
      'SELECT staff_id, username, phone, password_hash, role FROM staff WHERE username = :id OR phone = :id',
      { id: identifier }
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    let user = rows.find((r) => r.username === identifier);
    if (!user && rows.length === 1) user = rows[0];
    if (!user) {
      return res.status(400).json({ error: 'Multiple accounts match this phone. Please login using username.' });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signAuthToken({ staff_id: user.staff_id, role: user.role });
    res.cookie(config.auth.cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.auth.cookieSecure,
      maxAge: config.auth.tokenTtlSeconds * 1000
    });

    const payload = { ok: true, role: user.role };
    if (config.auth.exposeToken) payload.token = token;
    return res.json(payload);
  })
);

authRouter.post('/logout', (req, res) => {
  res.clearCookie(config.auth.cookieName);
  res.json({ ok: true });
});

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);
