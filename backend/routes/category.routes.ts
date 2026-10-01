import { Router } from 'express';
import {
  getCategories,
  createCategory,
  renameCategory,
  deleteCategory,
} from '../controllers/product.controller.ts';
import { authenticateToken } from '../middlewares/auth.ts';

const router = Router();

const managerOnly = (req: any, res: any, next: any) => {
  if (req.user?.role === 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: req.t ? req.t('products.adminForbidden') : 'Akses ditolak: Role ADMIN dilarang menambah, mengubah, atau menghapus data kategori.',
    });
  }
  if (req.user?.role !== 'MANAGER') {
    return res.status(403).json({
      success: false,
      message: req.t ? req.t('products.managerRequired') : 'Akses ditolak: Hanya role MANAGER yang berhak mengelola kategori.',
    });
  }
  next();
};

router.use(authenticateToken);

router.get('/', getCategories);
router.post('/', managerOnly, createCategory);
router.put('/rename', managerOnly, renameCategory);
router.delete('/:name', managerOnly, deleteCategory);

export default router;
