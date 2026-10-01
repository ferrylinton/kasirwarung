import { Router } from 'express';
import {
  createCashier,
  getCashiers,
  deleteCashier,
} from '../controllers/user.controller.ts';
import { authenticateToken, requireRole } from '../middlewares/auth.ts';

const router = Router();

router.use(authenticateToken, requireRole(['MANAGER']));

router.post('/cashier', createCashier);
router.get('/cashiers', getCashiers);
router.delete('/cashiers/:id', deleteCashier);

export default router;
