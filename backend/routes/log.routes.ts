import { Router } from 'express';
import {
  getActivityLogs,
  getLoginHistory,
} from '../controllers/log.controller.ts';
import { authenticateToken, requireRole } from '../middlewares/auth.ts';

const router = Router();

router.get('/activity-logs', authenticateToken, requireRole(['MANAGER', 'ADMIN']), getActivityLogs);
router.get('/login-history', authenticateToken, requireRole(['ADMIN', 'MANAGER', 'CASHIER']), getLoginHistory);

export default router;
