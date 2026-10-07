import { Router } from 'express';
import {
  getTenants,
  getTenantDeactivationRequests,
  updateTenantStatus,
  updateTenant,
  getMyTenant,
  requestTenantDeactivation,
  cancelTenantDeactivation,
  evaluateTenantDeactivation,
} from '../controllers/tenant.controller.ts';
import { authenticateToken, requireRole } from '../middlewares/auth.ts';

const router = Router();

// Admin & Manager endpoints
router.get('/tenants', authenticateToken, requireRole(['ADMIN']), getTenants);
router.get('/tenants/deactivation-requests', authenticateToken, requireRole(['ADMIN', 'MANAGER']), getTenantDeactivationRequests);
router.patch('/tenants/:id', authenticateToken, requireRole(['ADMIN']), updateTenant);
router.patch('/tenants/:id/status', authenticateToken, requireRole(['ADMIN']), updateTenantStatus);
router.post('/tenants/:id/evaluate-deactivation', authenticateToken, requireRole(['ADMIN']), evaluateTenantDeactivation);

// Manager tenant endpoints
router.get('/tenant/my', authenticateToken, requireRole(['MANAGER']), getMyTenant);
router.post('/tenant/deactivation-request', authenticateToken, requireRole(['MANAGER']), requestTenantDeactivation);
router.post('/tenant/deactivation-request/cancel', authenticateToken, requireRole(['MANAGER']), cancelTenantDeactivation);

export default router;
