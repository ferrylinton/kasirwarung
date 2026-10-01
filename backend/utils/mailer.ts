import nodemailer from 'nodemailer';
import {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  APP_URL,
} from '../config/env.ts';

export const transporter = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: SMTP_USER
        ? {
            user: SMTP_USER,
            pass: SMTP_PASS,
          }
        : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    })
  : null;

export async function sendVerificationEmail(params: {
  email: string;
  name: string;
  tenantName: string;
  verificationToken: string;
}): Promise<boolean> {
  if (!transporter) return false;

  const verifyLink = `${APP_URL}/verify-email?token=${params.verificationToken}`;
  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: params.email,
      subject: `Verifikasi Akun Warung: ${params.tenantName} - KasirWarung`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #059669;">KasirWarung</h2>
          <h3>Selamat Datang, ${params.name}!</h3>
          <p>Terima kasih telah mendaftarkan warung Anda <strong>"${params.tenantName}"</strong> sebagai <strong>Role MANAGER</strong>.</p>
          <p>Klik tombol di bawah ini untuk memverifikasi akun Anda:</p>
          <div style="margin: 20px 0;">
            <a href="${verifyLink}" style="background-color: #059669; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Verifikasi Akun Saya
            </a>
          </div>
          <p style="color: #64748b; font-size: 12px;">Link alternatif: <br>${verifyLink}</p>
        </div>
      `,
    });
    return true;
  } catch (err: any) {
    console.warn('⚠️ SMTP send error:', err.message);
    return false;
  }
}
