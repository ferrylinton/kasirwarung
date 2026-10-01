import { Router } from 'express';
import {
  getAuthConfig,
  register,
  verifyEmail,
  login,
  refreshToken,
  logout,
  getMe,
  getSessionDiagnostics,
  changePassword,
  updateProfile,
} from '../controllers/auth.controller.ts';
import { authenticateToken } from '../middlewares/auth.ts';
import { authRateLimiter } from '../middlewares/rateLimiter.ts';

const router = Router();

// Public auth configuration
router.get('/config', getAuthConfig);

// Rate-limited authentication flows
router.post('/register', authRateLimiter, register);
router.post('/verify-email', authRateLimiter, verifyEmail);
router.post('/login', authRateLimiter, login);
router.post('/refresh', authRateLimiter, refreshToken);

// Authenticated session management
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getMe);
router.get('/session-diagnostics', authenticateToken, getSessionDiagnostics);
router.post('/change-password', authenticateToken, authRateLimiter, changePassword);
router.put('/profile', authenticateToken, updateProfile);

export default router;
