import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// server/ 根目录（src/config.js -> 上一级）
const SERVER_ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(SERVER_ROOT, '.env') });

const resolveDbPath = (p) => (path.isAbsolute(p) ? p : path.join(SERVER_ROOT, p));

export const config = {
  serverRoot: SERVER_ROOT,
  port: Number(process.env.PORT || 4000),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET || 'subhub-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseFile: resolveDbPath(process.env.DATABASE_FILE || './data/subhub.sqlite'),
  dbFlushIntervalMs: Number(process.env.DB_FLUSH_INTERVAL_MS || 2000),
  seedUser: {
    name: process.env.SEED_USER_NAME || '演示用户',
    email: process.env.SEED_USER_EMAIL || 'demo@subhub.local',
    password: process.env.SEED_USER_PASSWORD || 'demo1234',
  },
};
