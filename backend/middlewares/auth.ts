import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.ts';
import { tokenStore } from '../tokenStore.ts';
import { tenantsCol, usersCol } from '../config/db.ts';

export interface AuthRequest extends Request {
  user?: any;
  rawToken?: string;
  tokenRemainingSeconds?: number;
}

export async function authenticateToken(req: any, res: any, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Akses ditolak. Token otentikasi tidak ditemukan.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Check if token's jti is in the Token Denylist
    if (decoded.jti) {
      const revoked = await tokenStore.isDenylisted(decoded.jti);
      if (revoked) {
        return res.status(401).json({
          success: false,
          code: 'TOKEN_REVOKED',
          message: 'Sesi telah berakhir atau Anda telah logout. Token berada dalam denylist.',
        });
      }
    }

    // Attach raw token, decoded payload, and remaining time
    req.rawToken = token;
    req.user = decoded;
    if (decoded.exp) {
      const nowSec = Math.floor(Date.now() / 1000);
      req.tokenRemainingSeconds = Math.max(0, decoded.exp - nowSec);
    }

    // Verify user account is still active in MongoDB
    if (decoded.id) {
      const userDoc = await usersCol.findOne({ id: decoded.id });
      if (userDoc && userDoc.isActive === false) {
        return res.status(403).json({
          success: false,
          userDeactivated: true,
          code: 'USER_DEACTIVATED',
          message: 'Akun Anda telah dinonaktifkan oleh Administrator. Hubungi administrator sistem.',
        });
      }
    }

    // Verify tenant is still active in MongoDB for tenant-bound roles
    if (decoded.tenantId && decoded.role !== 'ADMIN') {
      const tenant = await tenantsCol.findOne({ id: decoded.tenantId });
      if (tenant && (tenant.status === 'INACTIVE' || tenant.status === 'SUSPENDED')) {
        return res.status(403).json({
          success: false,
          tenantDeactivated: true,
          code: 'TENANT_DEACTIVATED',
          message: `Akun tenant "${tenant.name}" telah dinonaktifkan oleh Administrator. Seluruh akses telah ditutup.`,
        });
      }
    }

    next();
  } catch (err: any) {
    return res.status(403).json({
      success: false,
      code: 'TOKEN_INVALID',
      message: 'Sesi berakhir atau token tidak sah. Silakan login kembali.',
    });
  }
}

export function requireRole(allowedRoles: Array<'ADMIN' | 'MANAGER' | 'CASHIER'>) {
  return (req: any, res: any, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Tidak terotentikasi' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Anda memerlukan hak akses ${allowedRoles.join(' atau ')}.`,
      });
    }
    next();
  };
}
