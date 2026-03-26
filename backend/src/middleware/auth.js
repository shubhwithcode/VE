import { config } from '../config.js';
import { query } from '../db.js';
import { verifyAuthToken } from '../security/tokens.js';

export async function requireAuth(req, res, next) {
  try {
    let token = req.cookies?.[config.auth.cookieName];
    if (!token) {
      const auth = req.get('authorization') || '';
      const match = auth.match(/^Bearer\s+(.+)$/i);
      if (match) token = match[1]?.trim();
    }
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = verifyAuthToken(token);
    const rows = await query(
      'SELECT staff_id, name, phone, username, role, salary_per_day, profile_image_path FROM staff WHERE staff_id = :id',
      { id: decoded.staff_id }
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Unauthorized' });
    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
