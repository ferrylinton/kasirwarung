import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_SECRET, ACCESS_TOKEN_EXPIRES, REFRESH_TOKEN_EXPIRES } from '../config/env.ts';

export function generateTokens(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
  tenantName: string | null;
}) {
  const accessJti = `acc-${user.id}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  const refreshJti = `ref-${user.id}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

  const accessToken = jwt.sign(
    {
      jti: accessJti,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenantName,
      type: 'access',
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES as any }
  );

  const refreshToken = jwt.sign(
    {
      jti: refreshJti,
      id: user.id,
      type: 'refresh',
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES as any }
  );

  return { accessToken, refreshToken, accessJti, refreshJti };
}
