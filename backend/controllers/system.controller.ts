import { Request, Response } from 'express';
import { getDB, isMongoDatabaseLive } from '../config/db.ts';
import { isRedisConnected } from '../config/redis.ts';
import { getBucketStatus } from '../middlewares/rateLimiter.ts';

export function getI18nStatus(req: any, res: Response) {
  res.json({
    success: true,
    service: 'i18next Backend Internationalization',
    defaultLanguage: 'id',
    supportedLanguages: ['id', 'en'],
    currentRequestLanguage: req.language,
    sampleTranslations: {
      success: req.t ? req.t('common.success') : 'Berhasil',
      forbidden: req.t ? req.t('common.forbidden') : 'Akses Ditolak',
      adminForbidden: req.t ? req.t('products.adminForbidden') : 'Akses Admin Ditolak',
      loginSuccess: req.t ? req.t('auth.loginSuccess') : 'Login Berhasil',
    },
  });
}

export async function getHealth(req: Request, res: Response) {
  const db = getDB();
  let mongoLive = isMongoDatabaseLive();
  let collections: string[] = [];

  if (db) {
    try {
      const cols = await db.listCollections().toArray();
      collections = cols.map((c: any) => c.name);
      mongoLive = true;
    } catch (e) {
      mongoLive = false;
    }
  }

  res.json({
    status: 'UP',
    app: 'KasirWarung',
    database: 'MongoDB Atlas',
    mongoConnected: mongoLive,
    redisConnected: isRedisConnected(),
    collections,
    rateLimiter: 'Token Bucket Algorithm Active (Redis / In-Memory)',
    timestamp: new Date().toISOString(),
  });
}

export function getRateLimitStatus(req: Request, res: Response) {
  const ip = (typeof req.headers['x-forwarded-for'] === 'string'
    ? req.headers['x-forwarded-for'].split(',')[0].trim()
    : req.ip || req.socket.remoteAddress || '127.0.0.1');

  const globalStatus = getBucketStatus(`tb:global:${ip}`, 60, 2);
  const authStatus = getBucketStatus(`tb:auth:${ip}`, 10, 0.5);

  res.json({
    success: true,
    algorithm: 'Token Bucket',
    description: 'Algoritma Token Bucket mengizinkan burst trafik hingga kapasitas bucket dan mengisi token secara konstan.',
    clientIp: ip,
    storage: isRedisConnected() ? 'Upstash Redis' : 'In-Memory (High Performance)',
    buckets: {
      globalApi: globalStatus,
      authSecurity: authStatus,
    },
  });
}
