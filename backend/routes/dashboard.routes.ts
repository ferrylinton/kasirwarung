import { Router } from 'express';
import {
  getTenantDashboardStats,
  getAdminDashboardStats,
} from '../controllers/dashboard.controller.ts';
import { authenticateToken, requireRole } from '../middlewares/auth.ts';

const router = Router();

// Tenant Manager / Cashier Dashboard
router.get('/dashboard/stats', authenticateToken, getTenantDashboardStats);

// Global Admin Dashboard (/api/admin/dashboard)
router.get('/admin/dashboard', authenticateToken, requireRole(['ADMIN']), getAdminDashboardStats);

export default router;
