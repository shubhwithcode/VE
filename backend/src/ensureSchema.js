import fs from 'node:fs/promises';
import path from 'node:path';

import { config } from './config.js';
import { pool, query } from './db.js';

function shouldAutoInitSchema() {
  const raw = process.env.DB_AUTO_INIT ?? (config.nodeEnv === 'development' ? 'true' : 'false');
  return raw === 'true';
}

function splitSqlStatements(sqlText) {
  const withoutLineComments = sqlText
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');

  return withoutLineComments
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export async function ensureSchemaIfNeeded() {
  let needsInit = false;
  try {
    await query('SELECT 1 FROM staff LIMIT 1', {});
  } catch (err) {
    if (err?.code !== 'ER_NO_SUCH_TABLE') throw err;
    if (!shouldAutoInitSchema()) throw err;
    needsInit = true;
  }

  if (!needsInit) {
    await ensureHeroImagesTable();
    await ensureStaffProfilePhotoColumn();
    await ensureStaffAadhaarColumn();
    await ensureLeavesTable();
    await ensureWebsiteTables();
    return;
  }

  const schemaPath = path.join(config.paths.backendDir, 'schema.sql');
  const sqlText = await fs.readFile(schemaPath, 'utf8');
  const statements = splitSqlStatements(sqlText);

  for (const statement of statements) {
    // DDL statements shouldn't use prepared placeholders.
    // eslint-disable-next-line no-await-in-loop
    await pool.query(statement);
  }

  // After auto init, also ensure additive tables exist (for upgrades).
  // This is safe to run multiple times.
  await ensureHeroImagesTable();
  await ensureStaffProfilePhotoColumn();
  await ensureStaffAadhaarColumn();
  await ensureLeavesTable();
  await ensureWebsiteTables();
}

async function ensureHeroImagesTable() {
  try {
    await query('SELECT 1 FROM hero_images LIMIT 1', {});
    return;
  } catch (err) {
    if (err?.code !== 'ER_NO_SUCH_TABLE') throw err;
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS hero_images (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(120) NULL,
    subtitle VARCHAR(255) NULL,
    image_path VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_hero_active_sort (active, sort_order, id)
  )`);
}

async function ensureStaffProfilePhotoColumn() {
  const rows = await query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA=:db AND TABLE_NAME='staff' AND COLUMN_NAME='profile_image_path'
     LIMIT 1`,
    { db: config.db.database }
  );
  if (rows.length > 0) return;
  await pool.query(`ALTER TABLE staff ADD COLUMN profile_image_path VARCHAR(255) NULL`);
}

async function ensureStaffAadhaarColumn() {
  const col = await query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA=:db AND TABLE_NAME='staff' AND COLUMN_NAME='aadhaar_number'
     LIMIT 1`,
    { db: config.db.database }
  );
  if (col.length === 0) {
    await pool.query(`ALTER TABLE staff ADD COLUMN aadhaar_number VARCHAR(12) NULL`);
  }

  const idx = await query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA=:db AND TABLE_NAME='staff' AND INDEX_NAME='uq_staff_aadhaar'
     LIMIT 1`,
    { db: config.db.database }
  );
  if (idx.length > 0) return;

  // MySQL allows multiple NULLs in UNIQUE indexes; this keeps Aadhaar optional but enforces uniqueness when present.
  await pool.query(`ALTER TABLE staff ADD UNIQUE KEY uq_staff_aadhaar (aadhaar_number)`);
}

async function ensureLeavesTable() {
  try {
    await query('SELECT 1 FROM leaves LIMIT 1', {});
    return;
  } catch (err) {
    if (err?.code !== 'ER_NO_SUCH_TABLE') throw err;
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS leaves (
    id BIGINT NOT NULL AUTO_INCREMENT,
    staff_id INT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason VARCHAR(500) NOT NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    reviewed_by INT NULL,
    reviewed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_leaves_staff_date (staff_id, from_date, to_date),
    KEY idx_leaves_status_date (status, created_at),
    CONSTRAINT fk_leaves_staff FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
    CONSTRAINT fk_leaves_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES staff(staff_id) ON DELETE SET NULL
  )`);
}
async function ensureWebsiteTables() {
  const tables = [
    {
      name: 'customers',
      sql: `CREATE TABLE IF NOT EXISTS customers (
        id BIGINT NOT NULL AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NULL,
        phone VARCHAR(30) NULL,
        address TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      )`
    },
    {
      name: 'queries',
      sql: `CREATE TABLE IF NOT EXISTS queries (
        id BIGINT NOT NULL AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        email VARCHAR(100) NULL,
        message TEXT NOT NULL,
        status ENUM('new','read','responded') NOT NULL DEFAULT 'new',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      )`
    },
    {
      name: 'quotations',
      sql: `CREATE TABLE IF NOT EXISTS quotations (
        id BIGINT NOT NULL AUTO_INCREMENT,
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(30) NOT NULL,
        requirement_detail TEXT NOT NULL,
        budget_estimate VARCHAR(100) NULL,
        status ENUM('pending','sent','closed') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      )`
    },
    {
      name: 'feedback',
      sql: `CREATE TABLE IF NOT EXISTS feedback (
        id BIGINT NOT NULL AUTO_INCREMENT,
        customer_name VARCHAR(100) NOT NULL,
        rating INT NOT NULL DEFAULT 5,
        comment TEXT NULL,
        is_public TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      )`
    },
    {
      name: 'site_content',
      sql: `CREATE TABLE IF NOT EXISTS site_content (
        content_key VARCHAR(100) NOT NULL,
        content_value TEXT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (content_key)
      )`
    }
  ];

  for (const t of tables) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await query(`SELECT 1 FROM ${t.name} LIMIT 1`, {});
    } catch (err) {
      if (err?.code === 'ER_NO_SUCH_TABLE') {
        // eslint-disable-next-line no-await-in-loop
        await pool.query(t.sql);
      } else {
        throw err;
      }
    }
  }
}
