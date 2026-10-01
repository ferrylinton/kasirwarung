import { Router } from 'express';
import {
  createOrder,
  getOrders,
  updateOrderStatus,
} from '../controllers/order.controller.ts';
import { authenticateToken, requireRole } from '../middlewares/auth.ts';

const router = Router();

router.use(authenticateToken);

router.post('/', requireRole(['MANAGER', 'CASHIER']), createOrder);
router.get('/', getOrders);
router.patch('/:id/status', requireRole(['MANAGER', 'CASHIER']), updateOrderStatus);

export default router;
