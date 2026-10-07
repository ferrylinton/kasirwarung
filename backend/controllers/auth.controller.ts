import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import {
  JWT_SECRET,
  ACCESS_TOKEN_EXPIRES,
  REFRESH_TOKEN_EXPIRES,
  ACCESS_TOKEN_TTL_SEC,
  REFRESH_TOKEN_TTL_SEC,
  IDLE_TIMEOUT_MINUTES,
  APP_URL,
} from '../config/env.ts';
import { usersCol, tenantsCol, tokensCol, productsCol } from '../config/db.ts';
import { getRedisClient, isRedisConnected } from '../config/redis.ts';
import { tokenStore } from '../tokenStore.ts';
import { generateTokens } from '../utils/tokens.ts';
import { recordLoginHistory } from '../utils/loginLogger.ts';
import { sendVerificationEmail } from '../utils/mailer.ts';

export const RegisterSchema = z.object({
  tenantName: z.string().min(3, 'Nama warung/tenant minimal 3 karakter'),
  name: z.string().min(2, 'Nama pengguna minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
});

export const LoginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Kata sandi saat ini wajib diisi'),
    newPassword: z.string().min(6, 'Kata sandi baru minimal 6 karakter'),
    confirmPassword: z.string().min(6, 'Konfirmasi kata sandi baru minimal 6 karakter'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi kata sandi baru tidak cocok dengan kata sandi baru',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Kata sandi baru tidak boleh sama dengan kata sandi saat ini',
    path: ['newPassword'],
  });

export const UpdateProfileSchema = z.object({
  name: z.string().min(2, 'Nama pengguna minimal 2 karakter'),
  phone: z.string().optional().default(''),
});

export async function getAuthConfig(req: Request, res: Response) {
  res.json({
    success: true,
    idleTimeoutMinutes: IDLE_TIMEOUT_MINUTES,
    idleTimeoutSeconds: Math.round(IDLE_TIMEOUT_MINUTES * 60),
    accessTokenExpires: ACCESS_TOKEN_EXPIRES,
    refreshTokenExpires: REFRESH_TOKEN_EXPIRES,
  });
}

export async function register(req: Request, res: Response) {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Data pendaftaran tidak valid',
        errors: parsed.error.issues,
      });
    }

    const { tenantName, name, email, password } = parsed.data;

    // Check duplicate email in MongoDB
    const existingUser = await usersCol.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar. Silakan masuk atau gunakan email lain.' });
    }

    // Generate tenant
    const tenantId = `tenant-${Date.now()}`;
    const slug = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${Date.now().toString().slice(-4)}`;
    const newTenant = {
      id: tenantId,
      name: tenantName,
      slug,
      address: 'Alamat Toko Belum Diatur',
      phone: '-',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    await tenantsCol.insertOne(newTenant);

    // Create Manager User
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = `user-${Date.now()}`;
    const newUser = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: 'MANAGER',
      tenantId: tenantId,
      tenantName: tenantName,
      isVerified: false,
      createdAt: new Date().toISOString(),
    };
    await usersCol.insertOne(newUser);

    // Generate Verification Token (24 hours expiry)
    const verificationToken = `verify-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await tokensCol.insertOne({
      id: `tok-${Date.now()}`,
      userId,
      token: verificationToken,
      email: email.toLowerCase(),
      expiresAt,
    });

    const redis = getRedisClient();
    if (redis && isRedisConnected()) {
      await redis.set(`verify:${verificationToken}`, email.toLowerCase(), 'EX', 86400).catch(() => {});
    }

    // Send Verification Email
    const verifyLink = `${APP_URL}/verify-email?token=${verificationToken}`;
    const emailSent = await sendVerificationEmail({
      email,
      name,
      tenantName,
      verificationToken,
    });

    if (!emailSent) {
      console.log(`📧 [Verification Link] For ${email}: ${verifyLink}`);
    }

    // Seed 15 initial products for this new tenant in MongoDB
    const baseSamples = await productsCol.find({ tenantId: 'tenant-berkah-jaya' }).limit(15).toArray();
    if (baseSamples.length > 0) {
      const tenantProducts = baseSamples.map((p: any, idx: number) => ({
        ...p,
        _id: undefined,
        id: `prod-${tenantId}-${idx + 1}`,
        tenantId,
        createdAt: new Date().toISOString(),
      }));
      await productsCol.insertMany(tenantProducts);
    }

    return res.status(201).json({
      success: true,
      message: 'Pendaftaran berhasil disimpan di MongoDB! Email verifikasi telah dikirimkan.',
      emailSent,
      verificationToken,
      verifyLink,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        tenantId: newUser.tenantId,
        tenantName: newUser.tenantName,
        isVerified: false,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal memproses pendaftaran: ' + err.message });
  }
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const token = req.body.token || req.query.token;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token verifikasi tidak ditemukan' });
    }

    let email: string | null = null;
    const redis = getRedisClient();
    if (redis && isRedisConnected()) {
      const stored = await redis.get(`verify:${token}`).catch(() => null);
      if (stored) email = stored;
    }

    if (!email) {
      const tokenDoc = await tokensCol.findOne({ token });
      if (tokenDoc && new Date() < new Date(tokenDoc.expiresAt)) {
        email = tokenDoc.email;
      }
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Token verifikasi tidak valid atau telah kadaluarsa' });
    }

    // Update user in MongoDB
    const updateResult = await usersCol.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: { isVerified: true } },
      { returnDocument: 'after' }
    );

    const user = updateResult && (updateResult.value || updateResult);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    await tokensCol.deleteOne({ token });
    if (redis && isRedisConnected()) {
      await redis.del(`verify:${token}`).catch(() => {});
    }

    // Generate access & refresh token pair with unique JTI claims
    const { accessToken, refreshToken, refreshJti } = generateTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenantName,
    });

    // Track logged user status in Redis with a TTL matching token's expiration
    await tokenStore.setLoggedUserStatus(
      user.id,
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        lastActive: new Date().toISOString(),
        loginTime: new Date().toISOString(),
        status: 'LOGGED_IN',
      },
      ACCESS_TOKEN_TTL_SEC
    );

    // Store refresh token
    await tokenStore.storeRefreshToken(user.id, refreshJti, REFRESH_TOKEN_TTL_SEC);

    return res.json({
      success: true,
      message: 'Selamat! Akun warung Anda di MongoDB telah terverifikasi.',
      token: accessToken,
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SEC,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenantName,
        isVerified: true,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal memverifikasi email: ' + err.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Data login tidak valid',
      });
    }

    const { email, password } = parsed.data;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    const clientUa = (req.headers['user-agent'] as string) || '';

    const user = await usersCol.findOne({ email: email.toLowerCase() });

    if (!user) {
      await recordLoginHistory({
        userId: 'unregistered',
        userName: 'Percobaan Tidak Dikenal',
        userEmail: email.toLowerCase(),
        userRole: 'UNKNOWN',
        status: 'FAILED',
        failureReason: 'Akun email tidak terdaftar di sistem',
        ipAddress: clientIp,
        userAgent: clientUa,
      });
      return res.status(401).json({ success: false, message: 'Email atau kata sandi salah' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await recordLoginHistory({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenantName,
        status: 'FAILED',
        failureReason: 'Kata sandi tidak sesuai',
        ipAddress: clientIp,
        userAgent: clientUa,
      });
      return res.status(401).json({ success: false, message: 'Email atau kata sandi salah' });
    }

    // Check individual user account status in MongoDB
    if (user.isActive === false) {
      await recordLoginHistory({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenantName,
        status: 'FAILED',
        failureReason: 'Akun dinonaktifkan oleh Administrator',
        ipAddress: clientIp,
        userAgent: clientUa,
      });
      return res.status(403).json({
        success: false,
        userDeactivated: true,
        message: 'Akun Anda telah dinonaktifkan oleh Administrator. Silakan hubungi admin sistem.',
      });
    }

    // Check tenant status in MongoDB
    if (user.tenantId) {
      const tenant = await tenantsCol.findOne({ id: user.tenantId });
      if (tenant && (tenant.status === 'SUSPENDED' || tenant.status === 'INACTIVE')) {
        await recordLoginHistory({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenantName,
          status: 'FAILED',
          failureReason: tenant.status === 'INACTIVE'
            ? 'Akun tenant warung telah dinonaktifkan'
            : 'Toko warung sedang dinonaktifkan / ditangguhkan',
          ipAddress: clientIp,
          userAgent: clientUa,
        });
        return res.status(403).json({
          success: false,
          tenantDeactivated: true,
          message: `Akun tenant "${tenant.name}" telah dinonaktifkan oleh Administrator. Seluruh akses login untuk warung ini telah ditutup.`,
        });
      }
    }

    // Record successful login history
    await recordLoginHistory({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenantName,
      status: 'SUCCESS',
      ipAddress: clientIp,
      userAgent: clientUa,
    });

    // Generate access & refresh token pair with unique JTI claims
    const { accessToken, refreshToken, refreshJti } = generateTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenantName,
    });

    // Track logged user status in Redis with a TTL matching token's expiration
    await tokenStore.setLoggedUserStatus(
      user.id,
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenantName,
        lastActive: new Date().toISOString(),
        loginTime: new Date().toISOString(),
        status: 'LOGGED_IN',
      },
      ACCESS_TOKEN_TTL_SEC
    );

    // Store refresh token
    await tokenStore.storeRefreshToken(user.id, refreshJti, REFRESH_TOKEN_TTL_SEC);

    return res.json({
      success: true,
      message: `Selamat datang kembali, ${user.name}!`,
      token: accessToken,
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SEC,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenantName,
        isVerified: user.isVerified,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal memproses login: ' + err.message });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const authHeader = req.headers['authorization'];
    const currentToken = req.body?.refreshToken || (authHeader && authHeader.split(' ')[1]);

    if (!currentToken) {
      return res.status(401).json({
        success: false,
        code: 'NO_TOKEN',
        message: 'Token otentikasi atau refresh token tidak ditemukan.',
      });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(currentToken, JWT_SECRET, { ignoreExpiration: req.body?.allowExpired ? true : false }) as any;
    } catch (e: any) {
      return res.status(403).json({
        success: false,
        code: 'TOKEN_INVALID',
        message: 'Token tidak sah untuk refresh.',
      });
    }

    // If token has JTI and is denylisted, reject immediately
    if (decoded.jti && await tokenStore.isDenylisted(decoded.jti)) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_REVOKED',
        message: 'Token ini telah masuk dalam denylist.',
      });
    }

    const user = await usersCol.findOne({ id: decoded.id });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    // Check tenant status
    if (user.tenantId) {
      const tenant = await tenantsCol.findOne({ id: user.tenantId });
      if (tenant && tenant.status === 'SUSPENDED') {
        return res.status(403).json({ success: false, message: 'Toko warung Anda dinonaktifkan.' });
      }
    }

    // Old token can be denylisted if it had a JTI to prevent reuse
    if (decoded.jti && decoded.exp) {
      const nowSec = Math.floor(Date.now() / 1000);
      const remainingTtl = decoded.exp - nowSec;
      if (remainingTtl > 0) {
        await tokenStore.addToDenylist(decoded.jti, remainingTtl);
      }
    }

    // Generate new token pair
    const { accessToken, refreshToken, refreshJti } = generateTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenantName,
    });

    // Update logged user status in Redis with new TTL
    await tokenStore.setLoggedUserStatus(
      user.id,
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        lastActive: new Date().toISOString(),
        refreshedAt: new Date().toISOString(),
        status: 'LOGGED_IN',
      },
      ACCESS_TOKEN_TTL_SEC
    );

    await tokenStore.storeRefreshToken(user.id, refreshJti, REFRESH_TOKEN_TTL_SEC);

    return res.json({
      success: true,
      message: 'Token otentikasi berhasil diperbarui.',
      token: accessToken,
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SEC,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenantName,
        isVerified: user.isVerified,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal memperbarui token: ' + err.message });
  }
}

export async function logout(req: any, res: Response) {
  try {
    const decoded = req.user;

    if (decoded && decoded.jti) {
      const nowSec = Math.floor(Date.now() / 1000);
      const ttlSeconds = decoded.exp ? Math.max(1, decoded.exp - nowSec) : ACCESS_TOKEN_TTL_SEC;
      await tokenStore.addToDenylist(decoded.jti, ttlSeconds);
    }

    if (decoded && decoded.id) {
      await tokenStore.removeLoggedUserStatus(decoded.id);
    }

    return res.json({
      success: true,
      message: 'Logout berhasil. Token Anda telah dimasukkan ke Token Denylist.',
      jtiRevoked: decoded?.jti || null,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal memproses logout: ' + err.message });
  }
}

export async function getMe(req: any, res: Response) {
  try {
    const user = await usersCol.findOne({ id: req.user.id });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    const tenant = user.tenantId ? await tenantsCol.findOne({ id: user.tenantId }) : null;

    const remainingSec = req.tokenRemainingSeconds ?? ACCESS_TOKEN_TTL_SEC;
    if (remainingSec > 0) {
      await tokenStore.setLoggedUserStatus(
        user.id,
        {
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          lastActive: new Date().toISOString(),
          status: 'LOGGED_IN',
        },
        remainingSec
      );
    }

    const sessionStatus = await tokenStore.getLoggedUserStatus(user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: tenant ? tenant.name : user.tenantName,
        isVerified: user.isVerified,
      },
      tenant,
      tokenMeta: {
        jti: req.user.jti,
        remainingSeconds: remainingSec,
        shouldRefresh: remainingSec < 60,
        idleTimeoutMinutes: IDLE_TIMEOUT_MINUTES,
        idleTimeoutSeconds: Math.round(IDLE_TIMEOUT_MINUTES * 60),
      },
      sessionStatus,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getSessionDiagnostics(req: any, res: Response) {
  try {
    const userId = req.user.id;
    const jti = req.user.jti;
    const isRevoked = jti ? await tokenStore.isDenylisted(jti) : false;
    const userStatus = await tokenStore.getLoggedUserStatus(userId);

    res.json({
      success: true,
      user: {
        id: userId,
        role: req.user.role,
      },
      tokenMeta: {
        jti,
        remainingSeconds: req.tokenRemainingSeconds,
        isDenylisted: isRevoked,
        accessTokenExpiresConfig: ACCESS_TOKEN_EXPIRES,
        refreshTokenExpiresConfig: REFRESH_TOKEN_EXPIRES,
        idleTimeoutMinutesConfig: IDLE_TIMEOUT_MINUTES,
      },
      redisStatus: {
        redisConnected: isRedisConnected(),
        userStatus,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function changePassword(req: any, res: Response) {
  try {
    const parsed = ChangePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Data kata sandi tidak valid',
        errors: parsed.error.issues,
      });
    }

    const { currentPassword, newPassword } = parsed.data;
    const user = await usersCol.findOne({ id: req.user.id });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan',
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'Kata sandi saat ini tidak sesuai. Silakan periksa kembali.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await usersCol.updateOne(
      { id: req.user.id },
      {
        $set: {
          passwordHash: newPasswordHash,
          passwordUpdatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }
    );

    await tokenStore.setLoggedUserStatus(
      user.id,
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        lastActive: new Date().toISOString(),
        passwordUpdatedAt: new Date().toISOString(),
        status: 'LOGGED_IN',
      },
      req.tokenRemainingSeconds || ACCESS_TOKEN_TTL_SEC
    );

    return res.json({
      success: true,
      message: 'Kata sandi Anda berhasil diperbarui!',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal mengubah kata sandi',
    });
  }
}

export async function updateProfile(req: any, res: Response) {
  try {
    const parsed = UpdateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Data profil tidak valid',
        errors: parsed.error.issues,
      });
    }

    const { name, phone } = parsed.data;
    const user = await usersCol.findOne({ id: req.user.id });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan',
      });
    }

    await usersCol.updateOne(
      { id: req.user.id },
      {
        $set: {
          name,
          phone: phone || '',
          updatedAt: new Date().toISOString(),
        },
      }
    );

    const updatedUser = await usersCol.findOne({ id: req.user.id });
    const tenant = user.tenantId ? await tenantsCol.findOne({ id: user.tenantId }) : null;

    await tokenStore.setLoggedUserStatus(
      user.id,
      {
        userId: user.id,
        email: user.email,
        name,
        role: user.role,
        tenantId: user.tenantId,
        lastActive: new Date().toISOString(),
        status: 'LOGGED_IN',
      },
      req.tokenRemainingSeconds || ACCESS_TOKEN_TTL_SEC
    );

    return res.json({
      success: true,
      message: 'Data profil berhasil diperbarui.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        tenantId: updatedUser.tenantId,
        tenantName: tenant ? tenant.name : updatedUser.tenantName,
        isVerified: updatedUser.isVerified,
        phone: updatedUser.phone || '',
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal memperbarui profil',
    });
  }
}
