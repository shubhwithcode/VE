import fs from 'node:fs/promises';
import path from 'node:path';

import { pool } from '../src/db.js';
import { config } from '../src/config.js';

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function removeFilesInDir(dir) {
  if (!(await fileExists(dir))) return 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let removed = 0;
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removed += await removeFilesInDir(full);
      continue;
    }
    await fs.unlink(full);
    removed += 1;
  }
  return removed;
}

async function clearDb() {
  // Order matters due to foreign keys.
  await pool.execute('DELETE FROM attendance', {});
  await pool.execute('DELETE FROM work_detail', {});
  await pool.execute('DELETE FROM gallery', {});
  await pool.execute('DELETE FROM hero_images', {});
  await pool.execute("DELETE FROM staff WHERE role='staff'", {});
}

async function main() {
  const confirmed = String(process.env.CONFIRM_CLEAR_DEMO ?? '').toUpperCase() === 'YES';
  if (!confirmed) {
    // eslint-disable-next-line no-console
    console.error(
      "Refusing to delete data. Set CONFIRM_CLEAR_DEMO=YES to proceed. Example (PowerShell): $env:CONFIRM_CLEAR_DEMO='YES'; node backend/scripts/clearDemoData.js"
    );
    process.exit(2);
  }

  const alsoUploads = process.argv.includes('--uploads');

  await clearDb();

  let removedUploads = 0;
  if (alsoUploads) {
    // Remove uploaded files but keep directory structure.
    const uploadsDir = config.uploads.fsDir;
    removedUploads = await removeFilesInDir(uploadsDir);
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: true,
        cleared: {
          staff_role_staff: true,
          attendance: true,
          work_detail: true,
          gallery: true,
          hero_images: true
        },
        uploads_removed_files: alsoUploads ? removedUploads : null
      },
      null,
      2
    )
  );
}

try {
  await main();
} finally {
  await pool.end();
}

