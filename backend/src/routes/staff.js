import express from 'express';
import path from 'node:path';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { query } from '../db.js';
import { todayDateString } from '../utils/dates.js';
import { uploadCheckIn, uploadCheckOut, uploadWorkDetail } from '../uploads.js';
import { config } from '../config.js';

export const staffRouter = express.Router();

function isDateYmd(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));
}

function dayDiffInclusive(fromYmd, toYmd) {
  const from = new Date(`${fromYmd}T00:00:00Z`);
  const to = new Date(`${toYmd}T00:00:00Z`);
  const ms = to.getTime() - from.getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
  return days;
}

async function getTodayWorkDetail(staff_id, date) {
  try {
    const [workDetail] = await query('SELECT * FROM work_detail WHERE staff_id=:staff_id AND date=:date', {
      staff_id,
      date
    });
    return workDetail ?? null;
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.code === 'ER_BAD_FIELD_ERROR') return null;
    throw err;
  }
}

async function getAttendanceForMonth(staff_id, from, to) {
  try {
    return await query(
      `SELECT a.*, wd.work_description, wd.work_image_path, wd.voice_record_path
       FROM attendance a
       LEFT JOIN work_detail wd ON wd.staff_id=a.staff_id AND wd.date=a.date
       WHERE a.staff_id=:staff_id AND a.date BETWEEN :from AND :to
       ORDER BY a.date DESC`,
      { staff_id, from, to }
    );
  } catch (err) {
    if (err?.code !== 'ER_NO_SUCH_TABLE' && err?.code !== 'ER_BAD_FIELD_ERROR') throw err;
  }

  try {
    return await query(
      `SELECT a.*, wd.work_description
       FROM attendance a
       LEFT JOIN work_detail wd ON wd.staff_id=a.staff_id AND wd.date=a.date
       WHERE a.staff_id=:staff_id AND a.date BETWEEN :from AND :to
       ORDER BY a.date DESC`,
      { staff_id, from, to }
    );
  } catch (err) {
    if (err?.code !== 'ER_NO_SUCH_TABLE' && err?.code !== 'ER_BAD_FIELD_ERROR') throw err;
  }

  return query(
    `SELECT a.*
     FROM attendance a
     WHERE a.staff_id=:staff_id AND a.date BETWEEN :from AND :to
     ORDER BY a.date DESC`,
    { staff_id, from, to }
  );
}

async function saveCheckIn({ staff_id, date, check_in_time, lat, lng, img }) {
  try {
    await query(
      `INSERT INTO attendance (staff_id, date, check_in_time, check_in_lat, check_in_lng, check_in_image_path)
       VALUES (:staff_id,:date,:check_in_time,:lat,:lng,:img)
       ON DUPLICATE KEY UPDATE
         check_in_time=COALESCE(check_in_time, VALUES(check_in_time)),
         check_in_lat=COALESCE(check_in_lat, VALUES(check_in_lat)),
         check_in_lng=COALESCE(check_in_lng, VALUES(check_in_lng)),
         check_in_image_path=COALESCE(check_in_image_path, VALUES(check_in_image_path))`,
      { staff_id, date, check_in_time, lat, lng, img }
    );
    return;
  } catch (err) {
    if (err?.code !== 'ER_BAD_FIELD_ERROR') throw err;
  }

  await query(
    `INSERT INTO attendance (staff_id, date, check_in_time)
     VALUES (:staff_id,:date,:check_in_time)
     ON DUPLICATE KEY UPDATE
       check_in_time=COALESCE(check_in_time, VALUES(check_in_time))`,
    { staff_id, date, check_in_time }
  );
}

async function saveWorkDetail({ staff_id, date, desc, work_img, voice }) {
  try {
    await query(
      `INSERT INTO work_detail (staff_id, date, work_description, work_image_path, voice_record_path)
       VALUES (:staff_id,:date,:desc,:work_img,:voice)
       ON DUPLICATE KEY UPDATE
         work_description=VALUES(work_description),
         work_image_path=COALESCE(VALUES(work_image_path), work_image_path),
         voice_record_path=COALESCE(VALUES(voice_record_path), voice_record_path)`,
      { staff_id, date, desc, work_img, voice }
    );
    return;
  } catch (err) {
    if (err?.code !== 'ER_BAD_FIELD_ERROR') throw err;
  }

  await query(
    `INSERT INTO work_detail (staff_id, date, work_description)
     VALUES (:staff_id,:date,:desc)
     ON DUPLICATE KEY UPDATE
       work_description=VALUES(work_description)`,
    { staff_id, date, desc }
  );
}

async function saveCheckOut({ staff_id, date, check_out_time, lat, lng, img }) {
  try {
    await query(
      `INSERT INTO attendance (staff_id, date, check_out_time, check_out_lat, check_out_lng, check_out_image_path)
       VALUES (:staff_id,:date,:check_out_time,:lat,:lng,:img)
       ON DUPLICATE KEY UPDATE
         check_out_time=COALESCE(check_out_time, VALUES(check_out_time)),
         check_out_lat=COALESCE(check_out_lat, VALUES(check_out_lat)),
         check_out_lng=COALESCE(check_out_lng, VALUES(check_out_lng)),
         check_out_image_path=COALESCE(check_out_image_path, VALUES(check_out_image_path))`,
      { staff_id, date, check_out_time, lat, lng, img }
    );
    return;
  } catch (err) {
    if (err?.code !== 'ER_BAD_FIELD_ERROR') throw err;
  }

  await query(
    `INSERT INTO attendance (staff_id, date, check_out_time)
     VALUES (:staff_id,:date,:check_out_time)
     ON DUPLICATE KEY UPDATE
       check_out_time=COALESCE(check_out_time, VALUES(check_out_time))`,
    { staff_id, date, check_out_time }
  );
}

staffRouter.get(
  '/today',
  asyncHandler(async (req, res) => {
    const date = todayDateString();
    const staff_id = req.user.staff_id;
    const [attendance] = await query('SELECT * FROM attendance WHERE staff_id=:staff_id AND date=:date', {
      staff_id,
      date
    });
    const workDetail = await getTodayWorkDetail(staff_id, date);
    res.json({ date, attendance: attendance ?? null, workDetail: workDetail ?? null });
  })
);

staffRouter.post(
  '/checkin',
  uploadCheckIn.single('selfie'),
  asyncHandler(async (req, res) => {
    const staff_id = req.user.staff_id;
    const date = todayDateString();
    const { lat, lng } = req.body ?? {};
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
    if (!req.file) return res.status(400).json({ error: 'selfie required' });

    const now = new Date();
    const relPath = path.relative(config.paths.backendDir, req.file.path).replace(/\\/g, '/');
    await saveCheckIn({ staff_id, date, check_in_time: now, lat: Number(lat), lng: Number(lng), img: relPath });
    res.json({ ok: true });
  })
);

staffRouter.post(
  '/work-detail',
  uploadWorkDetail.fields([
    { name: 'work_image', maxCount: 1 },
    { name: 'voice_record', maxCount: 1 }
  ]),
  asyncHandler(async (req, res) => {
    const staff_id = req.user.staff_id;
    const date = todayDateString();
    const { work_description } = req.body ?? {};
    if (!work_description || String(work_description).trim() === '') {
      return res.status(400).json({ error: 'work_description required' });
    }

    const [att] = await query('SELECT check_in_time FROM attendance WHERE staff_id=:staff_id AND date=:date', {
      staff_id,
      date
    });
    if (!att?.check_in_time) {
      return res.status(400).json({ error: 'Please check in first' });
    }

    const workImage = req.files?.work_image?.[0] ?? null;
    const voiceRecord = req.files?.voice_record?.[0] ?? null;
    const workImagePath = workImage
      ? path.relative(config.paths.backendDir, workImage.path).replace(/\\/g, '/')
      : null;
    const voiceRecordPath = voiceRecord
      ? path.relative(config.paths.backendDir, voiceRecord.path).replace(/\\/g, '/')
      : null;

    await saveWorkDetail({
      staff_id,
      date,
      desc: String(work_description),
      work_img: workImagePath,
      voice: voiceRecordPath
    });
    res.json({ ok: true });
  })
);

staffRouter.post(
  '/checkout',
  uploadCheckOut.single('selfie'),
  asyncHandler(async (req, res) => {
    const staff_id = req.user.staff_id;
    const date = todayDateString();
    const { lat, lng } = req.body ?? {};
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
    if (!req.file) return res.status(400).json({ error: 'selfie required' });

    const [att] = await query('SELECT check_in_time FROM attendance WHERE staff_id=:staff_id AND date=:date', {
      staff_id,
      date
    });
    if (!att?.check_in_time) {
      return res.status(400).json({ error: 'Please check in first' });
    }

    const wd = await query('SELECT id FROM work_detail WHERE staff_id=:staff_id AND date=:date', { staff_id, date });
    if (wd.length === 0) {
      return res.status(400).json({ error: 'Please add today work detail first' });
    }

    const now = new Date();
    const relPath = path.relative(config.paths.backendDir, req.file.path).replace(/\\/g, '/');
    await saveCheckOut({ staff_id, date, check_out_time: now, lat: Number(lat), lng: Number(lng), img: relPath });
    res.json({ ok: true });
  })
);

staffRouter.get(
  '/attendance',
  asyncHandler(async (req, res) => {
    const { month } = req.query ?? {};
    if (!/^\d{4}-\d{2}$/.test(String(month ?? ''))) return res.status(400).json({ error: 'month must be YYYY-MM' });
    const staff_id = req.user.staff_id;
    const from = `${month}-01`;
    const to = `${month}-31`;
    const rows = await getAttendanceForMonth(staff_id, from, to);
    res.json({ month: String(month), attendance: rows });
  })
);

staffRouter.get(
  '/leaves',
  asyncHandler(async (req, res) => {
    const staff_id = req.user.staff_id;
    const rows = await query(
      `SELECT id, from_date, to_date, reason, status, reviewed_at, created_at
       FROM leaves
       WHERE staff_id=:staff_id
       ORDER BY created_at DESC, id DESC`,
      { staff_id }
    );
    res.json({ leaves: rows });
  })
);

staffRouter.post(
  '/leaves',
  asyncHandler(async (req, res) => {
    const staff_id = req.user.staff_id;
    const { from_date, to_date, reason } = req.body ?? {};
    if (!isDateYmd(from_date) || !isDateYmd(to_date)) {
      return res.status(400).json({ error: 'from_date and to_date must be YYYY-MM-DD' });
    }
    const reasonStr = String(reason ?? '').trim();
    if (!reasonStr) return res.status(400).json({ error: 'reason required' });
    if (reasonStr.length > 500) return res.status(400).json({ error: 'reason too long (max 500)' });

    const days = dayDiffInclusive(String(from_date), String(to_date));
    if (!Number.isFinite(days) || days <= 0 || days > 60) {
      return res.status(400).json({ error: 'Invalid date range (max 60 days)' });
    }

    await query(
      `INSERT INTO leaves (staff_id, from_date, to_date, reason, status)
       VALUES (:staff_id,:from_date,:to_date,:reason,'pending')`,
      { staff_id, from_date: String(from_date), to_date: String(to_date), reason: reasonStr }
    );

    res.json({ ok: true });
  })
);
