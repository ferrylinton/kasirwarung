import { Router } from 'express';
import {
  createCashier,
  getCashiers,
  deleteCashier,
  getAllUsers,
  updateUserStatus,
  adminChangeUserPassword,
} from '../controllers/user.controller.ts';
import { authenticateToken, requireRole } from '../middlewares/auth.ts';

const router = Router();

// Manager routes: Cashier management for manager's own tenant
router.post('/cashier', authenticateToken, requireRole(['MANAGER']), createCashier);
router.get('/cashiers', authenticateToken, requireRole(['MANAGER']), getCashiers);
router.delete('/cashiers/:id', authenticateToken, requireRole(['MANAGER']), deleteCashier);

// Admin routes: Global user management across all tenants
// Permissions: View all, toggle active/inactive status, change password.
// Adding and deleting users are strictly NOT permitted for ADMIN per business requirement.
router.get('/all', authenticateToken, requireRole(['ADMIN']), getAllUsers);
router.patch('/:id/status', authenticateToken, requireRole(['ADMIN']), updateUserStatus);
router.patch('/:id/password', authenticateToken, requireRole(['ADMIN']), adminChangeUserPassword);

export default router;

