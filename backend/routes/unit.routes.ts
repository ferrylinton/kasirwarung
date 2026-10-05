import { Router } from 'express';
import {
  getUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  seedDefaults,
} from '../controllers/unit.controller.ts';
import { authenticateToken } from '../middlewares/auth.ts';

const router = Router();

// All unit management routes require authentication and manager verification
router.use(authenticateToken);

// CRUD routes
router.get('/', getUnits);
router.post('/seed-defaults', seedDefaults);
router.get('/:id', getUnitById);
router.post('/', createUnit);
router.put('/:id', updateUnit);
router.delete('/:id', deleteUnit);

export default router;
