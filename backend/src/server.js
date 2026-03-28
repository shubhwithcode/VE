import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import { ensureUploadsDir } from './uploads.js';
import { ensureSchemaIfNeeded } from './ensureSchema.js';
import { ensureAdminIfNeeded } from './ensureAdmin.js';
import { authRouter, loginHandler } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { staffRouter } from './routes/staff.js';
import { publicRouter } from './routes/public.js';
import { requireAuth, requireRole } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  ensureUploadsDir();
  await ensureSchemaIfNeeded();
  await ensureAdminIfNeeded();
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('Startup failed:', err?.message ?? err);
  if (err?.code === 'ER_ACCESS_DENIED_ERROR') {
    // eslint-disable-next-line no-console
    console.error('MySQL auth failed. Check DB_USER/DB_PASSWORD/DB_HOST in backend/.env');
  }
  if (err?.code === 'ER_BAD_DB_ERROR') {
    // eslint-disable-next-line no-console
    console.error('Database not found. Create DB_NAME and then import backend/schema.sql.');
  }
  if (err?.code === 'ER_NO_SUCH_TABLE') {
    // eslint-disable-next-line no-console
    console.error(
      'Database schema missing. Import backend/schema.sql into your DB (DB_NAME in backend/.env), or set DB_AUTO_INIT=true.'
    );
  }
  process.exit(1);
}

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(
  cors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Allow loading uploaded assets even when the UI is opened via a different hostname (e.g. localhost vs 127.0.0.2).
// Helmet's default Cross-Origin-Resource-Policy can block images with `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`.
app.use(
  '/uploads',
  express.static(config.uploads.fsDir, {
    setHeaders(res) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
  })
);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api', publicRouter);
app.use('/api/auth', authRouter);
app.post('/api/admin/login', loginHandler);
app.use('/api/admin', requireAuth, requireRole('admin'), adminRouter);
app.use('/api/staff', requireAuth, requireRole('staff'), staffRouter);

// Serve frontend (static)
app.use('/', express.static(path.join(__dirname, '..', '..', 'frontend')));

app.use((err, req, res, next) => {
  const message = config.nodeEnv === 'development' ? err.message : 'Server error';
  res.status(500).json({ error: message });
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`VE server running on http://localhost:${config.port}`);
});
