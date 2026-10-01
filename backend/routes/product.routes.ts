import { Router } from 'express';
import {
  searchProducts,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller.ts';
import { authenticateToken } from '../middlewares/auth.ts';

const router = Router();

const managerOnly = (req: any, res: any, next: any) => {
  if (req.user?.role === 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: req.t ? req.t('products.adminForbidden') : 'Akses ditolak: Role ADMIN dilarang menambah, mengubah, atau menghapus data produk.',
    });
  }
  if (req.user?.role !== 'MANAGER') {
    return res.status(403).json({
      success: false,
      message: req.t ? req.t('products.managerRequired') : 'Akses ditolak: Hanya role MANAGER yang berhak mengelola produk.',
    });
  }
  next();
};

router.use(authenticateToken);

router.get('/search', searchProducts);
router.get('/', getProducts);
router.post('/', managerOnly, createProduct);
router.put('/:id', managerOnly, updateProduct);
router.delete('/:id', managerOnly, deleteProduct);

export default router;
