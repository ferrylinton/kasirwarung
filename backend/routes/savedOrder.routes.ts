import { Router } from 'express';
import {
  getSavedOrders,
  createSavedOrder,
  updateSavedOrderNote,
  deleteSavedOrder,
} from '../controllers/order.controller.ts';
import { authenticateToken } from '../middlewares/auth.ts';

const router = Router();

router.use(authenticateToken);

router.get('/', getSavedOrders);
router.post('/', createSavedOrder);
router.patch('/:id/note', updateSavedOrderNote);
router.delete('/:id', deleteSavedOrder);

export default router;
