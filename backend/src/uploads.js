import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import mime from 'mime-types';
import { config } from './config.js';

export function ensureUploadsDir() {
  fs.mkdirSync(config.uploads.fsDir, { recursive: true });
  for (const dir of ['checkin', 'checkout', 'work', 'voice', 'gallery', 'hero', 'profiles']) {
    fs.mkdirSync(path.join(config.uploads.fsDir, dir), { recursive: true });
  }
}

function safeExt(mimetype) {
  const ext = mime.extension(mimetype);
  if (!ext) return 'bin';
  return String(ext).toLowerCase();
}

function makeStorage(subdir) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(config.uploads.fsDir, subdir));
    },
    filename: (req, file, cb) => {
      const ext = safeExt(file.mimetype);
      const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      cb(null, `${unique}.${ext}`);
    }
  });
}

function allowMimes(prefixes) {
  return (req, file, cb) => {
    const ok = prefixes.some((p) => file.mimetype?.startsWith(p));
    if (!ok) return cb(new Error(`Invalid file type: ${file.mimetype}`));
    cb(null, true);
  };
}

export const uploadCheckIn = multer({
  storage: makeStorage('checkin'),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: allowMimes(['image/'])
});

export const uploadCheckOut = multer({
  storage: makeStorage('checkout'),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: allowMimes(['image/'])
});

export const uploadWorkDetail = multer({
  storage: makeStorage('work'),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: allowMimes(['image/', 'audio/'])
});

export const uploadGallery = multer({
  storage: makeStorage('gallery'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: allowMimes(['image/'])
});

export const uploadHero = multer({
  storage: makeStorage('hero'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: allowMimes(['image/'])
});

export const uploadProfilePhoto = multer({
  storage: makeStorage('profiles'),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: allowMimes(['image/'])
});
