import { Router } from 'express';
import {
  getTenants,
  updateTenantStatus,
  getMyTenant,
  requestTenantDeactivation,
  cancelTenantDeactivation,
  evaluateTenantDeactivation,
} from '../controllers/tenant.controller.ts';
import { authenticateToken, requireRole } from '../middlewares/auth.ts';

const router = Router();

// Admin endpoints
router.get('/tenants', authenticateToken, requireRole(['ADMIN']), getTenants);
router.patch('/tenants/:id/status', authenticateToken, requireRole(['ADMIN']), updateTenantStatus);
router.post('/tenants/:id/evaluate-deactivation', authenticateToken, requireRole(['ADMIN']), evaluateTenantDeactivation);

// Manager tenant endpoints
router.get('/tenant/my', authenticateToken, requireRole(['MANAGER']), getMyTenant);
router.post('/tenant/deactivation-request', authenticateToken, requireRole(['MANAGER']), requestTenantDeactivation);
router.post('/tenant/deactivation-request/cancel', authenticateToken, requireRole(['MANAGER']), cancelTenantDeactivation);

export default router;
