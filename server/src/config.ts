import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// server/ 目录（src/config.ts -> 上两级）
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const rootDir = path.resolve(__dirname, '..');

function resolveDatabaseFile(file: string) {
  return path.isAbsolute(file) ? file : path.resolve(rootDir, file);
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseFile: resolveDatabaseFile(process.env.DATABASE_FILE ?? './data/subhub.db'),
  jwtSecret: process.env.JWT_SECRET ?? 'subhub-dev-secret-change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  rootDir,
};
