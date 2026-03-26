import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.join(__dirname, '..');

const envPath = path.join(backendDir, '.env');
const envExamplePath = path.join(backendDir, '.env.example');

dotenv.config({ path: envPath });

function requireEnv(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === null || value === '') {
    let hint = `Set it in your environment or in ${envPath}`;
    if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
      hint = `Create ${envPath} from ${envExamplePath}`;
    }
    throw new Error(`Missing required env var: ${name}. ${hint}`);
  }
  return value;
}

const uploadsDirName = process.env.UPLOADS_DIR ?? 'uploads';
const nodeEnv = process.env.NODE_ENV ?? 'development';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv,
  paths: {
    backendDir
  },
  db: {
    host: requireEnv('DB_HOST', '127.0.0.1'),
    user: requireEnv('DB_USER', 'root'),
    password: process.env.DB_PASSWORD ?? '',
    database: requireEnv('DB_NAME', 'vishwakarma_enterprises'),
    port: Number(process.env.DB_PORT ?? 3306)
  },
  auth: {
    jwtSecret: requireEnv('JWT_SECRET'),
    cookieName: process.env.AUTH_COOKIE_NAME ?? 've_token',
    cookieSecure: (process.env.AUTH_COOKIE_SECURE ?? 'false') === 'true',
    exposeToken: (process.env.AUTH_EXPOSE_TOKEN ?? (nodeEnv === 'development' ? 'true' : 'false')) === 'true',
    tokenTtlSeconds: Number(process.env.AUTH_TOKEN_TTL_SECONDS ?? 60 * 60 * 24 * 7),
    adminBootstrap: {
      username: requireEnv('ADMIN_USERNAME'),
      password: requireEnv('ADMIN_PASSWORD'),
      name: process.env.ADMIN_NAME ?? 'Owner',
      phone: process.env.ADMIN_PHONE ?? null
    }
  },
  uploads: {
    dirName: uploadsDirName,
    fsDir: path.join(backendDir, uploadsDirName)
  }
};
