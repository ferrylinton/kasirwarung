import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PORT = parseInt(process.env.PORT || '3000', 10);
export const JWT_SECRET = process.env.JWT_SECRET || 'kasirwarung-jwt-supersecret-2026';
export const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
export const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '1d';
export const IDLE_TIMEOUT_MINUTES = parseFloat(process.env.IDLE_TIMEOUT_MINUTES || process.env.VITE_IDLE_TIMEOUT_MINUTES || '5');
export const REDIS_URL = process.env.REDIS_URL || '';
export const MONGODB_URI = process.env.MONGODB_URI || '';
export const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// SMTP configuration for email verification & alerts
export const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
export const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
export const SMTP_USER = process.env.SMTP_USER || '';
export const SMTP_PASS = process.env.SMTP_PASS || '';
export const SMTP_FROM = process.env.SMTP_FROM || 'KasirWarung <no-reply@kasirwarung.com>';

export function parseDurationToSeconds(durationStr: string, defaultSec: number): number {
  if (!durationStr) return defaultSec;
  const match = durationStr.toString().trim().match(/^(\d+)\s*(s|m|h|d|w)?$/i);
  if (!match) return defaultSec;
  const num = parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();
  switch (unit) {
    case 's': return num;
    case 'm': return num * 60;
    case 'h': return num * 3600;
    case 'd': return num * 86400;
    case 'w': return num * 86400 * 7;
    default: return defaultSec;
  }
}

export const ACCESS_TOKEN_TTL_SEC = parseDurationToSeconds(ACCESS_TOKEN_EXPIRES, 15 * 60);
export const REFRESH_TOKEN_TTL_SEC = parseDurationToSeconds(REFRESH_TOKEN_EXPIRES, 24 * 60 * 60);
