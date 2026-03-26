import express from 'express';
import path from 'node:path';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { query } from '../db.js';
import { hashPassword } from '../security/passwords.js';
import { parseMonth, todayDateString } from '../utils/dates.js';
import { uploadGallery, uploadHero, uploadProfilePhoto } from '../uploads.js';
import { config } from '../config.js';

export const adminRouter = express.Router();

function maybeUploadProfilePhoto(req, res, next) {
  // Multer must only run for multipart/form-data; otherwise it throws.
  const ct = String(req.headers['content-type'] ?? '').toLowerCase();
  if (!ct.startsWith('multipart/form-data')) return next();
  return uploadProfilePhoto.single('profile_photo')(req, res, next);
}

adminRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const { month } = req.query ?? {};
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthStr = String(month ?? defaultMonth);
    const parsed = parseMonth(monthStr);
    if (!parsed) return res.status(400).json({ error: 'month must be YYYY-MM' });

    const from = `${parsed.year}-${String(parsed.month).padStart(2, '0')}-01`;
    const to = `${parsed.year}-${String(parsed.month).padStart(2, '0')}-31`;
    const today = todayDateString();

    const [staffCountRow] = await query("SELECT COUNT(*) AS total_staff FROM staff WHERE role='staff'", {});
    const [presentRow] = await query(
      'SELECT COUNT(*) AS present_today FROM attendance WHERE date=:date AND check_in_time IS NOT NULL',
      { date: today }
    );
    const [galleryRow] = await query('SELECT COUNT(*) AS gallery_total FROM gallery', {});
    const [heroRow] = await query(
      'SELECT COUNT(*) AS hero_total, SUM(CASE WHEN active=1 THEN 1 ELSE 0 END) AS hero_active FROM hero_images',
      {}
    );

    const monthRows = await query(
      `SELECT s.staff_id, s.salary_per_day,
              SUM(CASE WHEN a.check_in_time IS NOT NULL THEN 1 ELSE 0 END) AS present_days
       FROM staff s
       LEFT JOIN attendance a ON a.staff_id=s.staff_id AND a.date BETWEEN :from AND :to
       WHERE s.role='staff'
       GROUP BY s.staff_id`,
      { from, to }
    );

    const month_present_days = monthRows.reduce((sum, r) => sum + Number(r.present_days ?? 0), 0);
    const month_salary_total = monthRows.reduce(
      (sum, r) => sum + Number(r.present_days ?? 0) * Number(r.salary_per_day ?? 0),
      0
    );

    res.json({
      date: today,
      month: monthStr,
      total_staff: Number(staffCountRow?.total_staff ?? 0),
      present_today: Number(presentRow?.present_today ?? 0),
      gallery_total: Number(galleryRow?.gallery_total ?? 0),
      hero_total: Number(heroRow?.hero_total ?? 0),
      hero_active: Number(heroRow?.hero_active ?? 0),
      month_present_days,
      month_salary_total
    });
  })
);

adminRouter.get(
  '/staff',
  asyncHandler(async (req, res) => {
    const rows = await query(
      "SELECT staff_id, name, phone, RIGHT(aadhaar_number,4) AS aadhaar_last4, username, role, salary_per_day, profile_image_path, created_at FROM staff WHERE role='staff' ORDER BY staff_id DESC",
      {}
    );
    res.json({ staff: rows });
  })
);

adminRouter.post(
  '/staff',
  maybeUploadProfilePhoto,
  asyncHandler(async (req, res) => {
    const { name, phone, aadhaar_number, username, password, salary_per_day } = req.body ?? {};
    const nameStr = String(name ?? '').trim();
    const usernameStr = String(username ?? '').trim();
    const passwordStr = String(password ?? '');
    const phoneStr = String(phone ?? '').trim();
    const aadhaarStr = String(aadhaar_number ?? '').trim();
    if (!nameStr || !usernameStr || !passwordStr) {
      return res.status(400).json({ error: 'name, username, password required' });
    }
    let aadhaar = null;
    if (aadhaarStr !== '') {
      const digits = aadhaarStr.replace(/\s+/g, '');
      if (!/^\d{12}$/.test(digits)) {
        return res.status(400).json({ error: 'aadhaar_number must be 12 digits' });
      }
      aadhaar = digits;
    }

    const salaryRaw = salary_per_day ?? 0;
    const salaryNum = Number(salaryRaw);
    if (!Number.isFinite(salaryNum) || salaryNum < 0 || !Number.isInteger(salaryNum)) {
      return res.status(400).json({ error: 'salary_per_day must be a non-negative integer' });
    }
    const salary = salaryNum;

    const password_hash = await hashPassword(passwordStr);
    const profile_image_path = req.file
      ? path.relative(config.paths.backendDir, req.file.path).replace(/\\/g, '/')
      : null;

    try {
      const out = await query(
        "INSERT INTO staff (name, phone, aadhaar_number, username, password_hash, profile_image_path, role, salary_per_day) VALUES (:name,:phone,:aadhaar_number,:username,:password_hash,:profile_image_path,'staff',:salary)",
        {
          name: nameStr,
          phone: phoneStr === '' ? null : phoneStr,
          aadhaar_number: aadhaar,
          username: usernameStr,
          password_hash,
          profile_image_path,
          salary
        }
      );
      res.json({ ok: true, staff_id: out?.insertId ?? null });
    } catch (err) {
      if (err?.code === 'ER_DUP_ENTRY') {
        const msg = String(err?.message ?? '');
        if (msg.includes('uq_staff_aadhaar')) {
          return res.status(409).json({ error: 'Aadhaar already exists. Please check the number.' });
        }
        return res.status(409).json({ error: 'Username already exists. Please choose another username.' });
      }
      throw err;
    }
  })
);

adminRouter.put(
  '/staff/:id',
  asyncHandler(async (req, res) => {
    const staff_id = Number(req.params.id);
    const { name, phone, aadhaar_number, username, password, salary_per_day } = req.body ?? {};
    if (!staff_id) return res.status(400).json({ error: 'invalid staff id' });
    const salary = salary_per_day === undefined ? undefined : Number(salary_per_day);

    let aadhaar = undefined;
    if (aadhaar_number !== undefined) {
      const raw = String(aadhaar_number ?? '').trim();
      if (raw === '') {
        aadhaar = null;
      } else {
        const digits = raw.replace(/\s+/g, '');
        if (!/^\d{12}$/.test(digits)) {
          return res.status(400).json({ error: 'aadhaar_number must be 12 digits' });
        }
        aadhaar = digits;
      }
    }
    const aadhaar_provided = aadhaar_number !== undefined ? 1 : 0;

    if (password) {
      const password_hash = await hashPassword(password);
      try {
        await query(
          'UPDATE staff SET name=COALESCE(:name,name), phone=COALESCE(:phone,phone), aadhaar_number=CASE WHEN :aadhaar_provided=1 THEN :aadhaar_number ELSE aadhaar_number END, username=COALESCE(:username,username), salary_per_day=COALESCE(:salary,salary_per_day), password_hash=:password_hash WHERE staff_id=:staff_id AND role=\'staff\'',
          {
            staff_id,
            name: name ?? null,
            phone: phone ?? null,
            aadhaar_provided,
            aadhaar_number: aadhaar,
            username: username ?? null,
            salary: salary ?? null,
            password_hash
          }
        );
      } catch (err) {
        if (err?.code === 'ER_DUP_ENTRY' && String(err?.message ?? '').includes('uq_staff_aadhaar')) {
          return res.status(409).json({ error: 'Aadhaar already exists. Please check the number.' });
        }
        throw err;
      }
    } else {
      try {
        await query(
          'UPDATE staff SET name=COALESCE(:name,name), phone=COALESCE(:phone,phone), aadhaar_number=CASE WHEN :aadhaar_provided=1 THEN :aadhaar_number ELSE aadhaar_number END, username=COALESCE(:username,username), salary_per_day=COALESCE(:salary,salary_per_day) WHERE staff_id=:staff_id AND role=\'staff\'',
          {
            staff_id,
            name: name ?? null,
            phone: phone ?? null,
            aadhaar_provided,
            aadhaar_number: aadhaar,
            username: username ?? null,
            salary: salary ?? null
          }
        );
      } catch (err) {
        if (err?.code === 'ER_DUP_ENTRY' && String(err?.message ?? '').includes('uq_staff_aadhaar')) {
          return res.status(409).json({ error: 'Aadhaar already exists. Please check the number.' });
        }
        throw err;
      }
    }
    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/staff/:id',
  asyncHandler(async (req, res) => {
    const staff_id = Number(req.params.id);
    if (!staff_id) return res.status(400).json({ error: 'invalid staff id' });
    await query("DELETE FROM staff WHERE staff_id=:staff_id AND role='staff'", { staff_id });
    res.json({ ok: true });
  })
);

adminRouter.get(
  '/attendance',
  asyncHandler(async (req, res) => {
    const { from, to, staff_id } = req.query ?? {};
    const where = [];
    const params = {};
    if (from) {
      where.push('a.date >= :from');
      params.from = from;
    }
    if (to) {
      where.push('a.date <= :to');
      params.to = to;
    }
    if (staff_id) {
      where.push('a.staff_id = :staff_id');
      params.staff_id = Number(staff_id);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(
      `SELECT a.*, s.name, s.username, wd.work_description, wd.work_image_path, wd.voice_record_path
       FROM attendance a
       JOIN staff s ON s.staff_id=a.staff_id
       LEFT JOIN work_detail wd ON wd.staff_id=a.staff_id AND wd.date=a.date
       ${whereSql}
       ORDER BY a.date DESC, a.staff_id ASC`,
      params
    );
    res.json({ attendance: rows });
  })
);

adminRouter.get(
  '/salary',
  asyncHandler(async (req, res) => {
    const { month } = req.query ?? {};
    const parsed = parseMonth(String(month ?? ''));
    if (!parsed) return res.status(400).json({ error: 'month must be YYYY-MM' });
    const from = `${parsed.year}-${String(parsed.month).padStart(2, '0')}-01`;
    const to = `${parsed.year}-${String(parsed.month).padStart(2, '0')}-31`;

    const rows = await query(
      `SELECT s.staff_id, s.name, s.username, s.salary_per_day,
              SUM(CASE WHEN a.check_in_time IS NOT NULL THEN 1 ELSE 0 END) AS present_days
       FROM staff s
       LEFT JOIN attendance a ON a.staff_id=s.staff_id AND a.date BETWEEN :from AND :to
       WHERE s.role='staff'
       GROUP BY s.staff_id
       ORDER BY s.staff_id ASC`,
      { from, to }
    );
    const salary = rows.map((r) => ({
      staff_id: r.staff_id,
      name: r.name,
      username: r.username,
      salary_per_day: Number(r.salary_per_day),
      present_days: Number(r.present_days ?? 0),
      total_salary: Number(r.present_days ?? 0) * Number(r.salary_per_day)
    }));
    res.json({ month: String(month), salary });
  })
);

adminRouter.get(
  '/leaves',
  asyncHandler(async (req, res) => {
    const { status } = req.query ?? {};
    const statusStr = status ? String(status) : 'all';
    const where = [];
    const params = {};
    if (statusStr !== 'all') {
      if (!['pending', 'approved', 'rejected'].includes(statusStr)) {
        return res.status(400).json({ error: 'status must be pending/approved/rejected/all' });
      }
      where.push('l.status=:status');
      params.status = statusStr;
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await query(
      `SELECT l.id, l.staff_id, s.name, l.from_date, l.to_date, l.reason, l.status, l.reviewed_by, l.reviewed_at, l.created_at
       FROM leaves l
       JOIN staff s ON s.staff_id=l.staff_id
       ${whereSql}
       ORDER BY l.created_at DESC, l.id DESC`,
      params
    );
    res.json({ leaves: rows });
  })
);

adminRouter.put(
  '/leaves/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    const { status } = req.body ?? {};
    const statusStr = String(status ?? '');
    if (!['approved', 'rejected'].includes(statusStr)) {
      return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
    }

    await query(
      `UPDATE leaves
       SET status=:status, reviewed_by=:reviewed_by, reviewed_at=NOW()
       WHERE id=:id`,
      { id, status: statusStr, reviewed_by: req.user.staff_id }
    );
    res.json({ ok: true });
  })
);

adminRouter.get(
  '/gallery',
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM gallery ORDER BY id DESC', {});
    res.json({ gallery: rows });
  })
);

adminRouter.post(
  '/gallery',
  uploadGallery.single('image'),
  asyncHandler(async (req, res) => {
    const { category, description } = req.body ?? {};
    if (!category) return res.status(400).json({ error: 'category required' });
    if (!req.file) return res.status(400).json({ error: 'image required' });
    const relPath = path.relative(config.paths.backendDir, req.file.path).replace(/\\/g, '/');
    await query('INSERT INTO gallery (category, description, image_path) VALUES (:category,:description,:image_path)', {
      category,
      description: description ?? null,
      image_path: relPath
    });
    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/gallery/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    await query('DELETE FROM gallery WHERE id=:id', { id });
    res.json({ ok: true });
  })
);

adminRouter.get(
  '/hero',
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM hero_images ORDER BY sort_order ASC, id DESC', {});
    res.json({ hero: rows });
  })
);

adminRouter.post(
  '/hero',
  uploadHero.single('image'),
  asyncHandler(async (req, res) => {
    const { title, subtitle, sort_order, active } = req.body ?? {};
    if (!req.file) return res.status(400).json({ error: 'image required' });
    const relPath = path.relative(config.paths.backendDir, req.file.path).replace(/\\/g, '/');
    await query(
      'INSERT INTO hero_images (title, subtitle, image_path, sort_order, active) VALUES (:title,:subtitle,:image_path,:sort_order,:active)',
      {
        title: title ? String(title).trim() : null,
        subtitle: subtitle ? String(subtitle).trim() : null,
        image_path: relPath,
        sort_order: Number(sort_order ?? 0) || 0,
        active: String(active ?? '1') === '0' ? 0 : 1
      }
    );
    res.json({ ok: true });
  })
);

adminRouter.patch(
  '/hero/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    const { title, subtitle, sort_order, active } = req.body ?? {};
    await query(
      `UPDATE hero_images
       SET title=COALESCE(:title,title),
           subtitle=COALESCE(:subtitle,subtitle),
           sort_order=COALESCE(:sort_order,sort_order),
           active=COALESCE(:active,active)
       WHERE id=:id`,
      {
        id,
        title: title === undefined ? null : title === null ? null : String(title).trim(),
        subtitle: subtitle === undefined ? null : subtitle === null ? null : String(subtitle).trim(),
        sort_order: sort_order === undefined ? null : Number(sort_order),
        active: active === undefined ? null : Number(active) ? 1 : 0
      }
    );
    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/hero/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    await query('DELETE FROM hero_images WHERE id=:id', { id });
    res.json({ ok: true });
  })
);
adminRouter.get(
  '/queries',
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM queries ORDER BY id DESC', {});
    res.json({ queries: rows });
  })
);

adminRouter.delete(
  '/queries/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    await query('DELETE FROM queries WHERE id=:id', { id });
    res.json({ ok: true });
  })
);

adminRouter.get(
  '/customers',
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM customers ORDER BY id DESC', {});
    res.json({ customers: rows });
  })
);

adminRouter.delete(
  '/customers/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    await query('DELETE FROM customers WHERE id=:id', { id });
    res.json({ ok: true });
  })
);

adminRouter.get(
  '/quotations',
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM quotations ORDER BY id DESC', {});
    res.json({ quotations: rows });
  })
);

adminRouter.get(
  '/feedback',
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM feedback ORDER BY id DESC', {});
    res.json({ feedback: rows });
  })
);

adminRouter.patch(
  '/feedback/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    const { is_public } = req.body ?? {};
    await query('UPDATE feedback SET is_public=:is_public WHERE id=:id', { id, is_public: is_public ? 1 : 0 });
    res.json({ ok: true });
  })
);

adminRouter.get(
  '/content',
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM site_content', {});
    res.json({ content: rows });
  })
);

adminRouter.put(
  '/content',
  asyncHandler(async (req, res) => {
    const { content } = req.body ?? {};
    if (!Array.isArray(content)) return res.status(400).json({ error: 'content array required' });
    for (const item of content) {
      const { key, value } = item;
      // eslint-disable-next-line no-await-in-loop
      await query(
        'INSERT INTO site_content (content_key, content_value) VALUES (:key, :value) ON DUPLICATE KEY UPDATE content_value=:value',
        { key, value }
      );
    }
    res.json({ ok: true });
  })
);
