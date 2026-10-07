import { Router } from 'express';
import {
  getActiveSessions,
  revokeSession,
  revokeUserSessions,
  revokeTenantSessions,
  revokeAllActiveSessions,
} from '../controllers/session.controller.ts';
import { authenticateToken, requireRole } from '../middlewares/auth.ts';

const router = Router();

// All session management endpoints are restricted to ADMIN role only
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

router.get('/', getActiveSessions);
router.post('/revoke', revokeSession);
router.post('/revoke-user', revokeUserSessions);
router.post('/revoke-tenant', revokeTenantSessions);
router.post('/revoke-all', revokeAllActiveSessions);

export default router;
