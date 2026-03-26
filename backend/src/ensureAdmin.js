import { config } from './config.js';
import { query } from './db.js';
import { hashPassword } from './security/passwords.js';

export async function ensureAdminIfNeeded() {
  // Ensure the configured bootstrap admin exists (useful when DB already has an admin with a different username).
  const existing = await query('SELECT staff_id, role FROM staff WHERE username=:username LIMIT 1', {
    username: config.auth.adminBootstrap.username
  });
  if (existing.length > 0) {
    if (existing[0].role === 'admin') return;
    throw new Error(
      `ADMIN_USERNAME "${config.auth.adminBootstrap.username}" already exists as role="${existing[0].role}". Pick a different ADMIN_USERNAME or change that user's username/role.`
    );
  }
  const password_hash = await hashPassword(config.auth.adminBootstrap.password);
  await query(
    "INSERT INTO staff (name, phone, username, password_hash, role, salary_per_day) VALUES (:name,:phone,:username,:password_hash,'admin',0)",
    {
      name: config.auth.adminBootstrap.name,
      phone: config.auth.adminBootstrap.phone,
      username: config.auth.adminBootstrap.username,
      password_hash
    }
  );
}
