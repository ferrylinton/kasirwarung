import { Router } from 'express';
import {
  getI18nStatus,
  getHealth,
  getRateLimitStatus,
} from '../controllers/system.controller.ts';

const router = Router();

router.get('/i18n/status', getI18nStatus);
router.get('/health', getHealth);
router.get('/ratelimit/status', getRateLimitStatus);

export default router;
