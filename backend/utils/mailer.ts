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
  baseUrl?: string;
}): Promise<boolean> {
  if (!transporter) return false;

  const resolvedBaseUrl = (params.baseUrl || APP_URL).replace(/\/+$/, '');
  const verifyLink = `${resolvedBaseUrl}/verify-email?token=${encodeURIComponent(params.verificationToken)}`;
  const manualVerifyUrl = `${resolvedBaseUrl}/verify-email`;
  const alternativeLink = `${resolvedBaseUrl}/?token=${encodeURIComponent(params.verificationToken)}`;

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: params.email,
      subject: `Verifikasi Akun Warung: ${params.tenantName} - KasirWarung`,
      text: [
        `Selamat Datang di KasirWarung, ${params.name}!`,
        `Terima kasih telah mendaftarkan warung "${params.tenantName}" sebagai Role MANAGER.`,
        ``,
        `Verify Token: ${params.verificationToken}`,
        `URL untuk Verifikasi Token: ${verifyLink}`,
        `URL Input Token Manual: ${manualVerifyUrl}`,
        `Link Alternatif: ${alternativeLink}`,
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
          <h2 style="color: #059669; margin-top: 0;">KasirWarung</h2>
          <h3 style="margin-bottom: 8px;">Selamat Datang, ${params.name}!</h3>
          <p style="line-height: 1.6;">Terima kasih telah mendaftarkan warung Anda <strong>"${params.tenantName}"</strong> sebagai <strong>Role MANAGER</strong>.</p>
          
          <div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold;">
              Verify Token / Kode Verifikasi Anda
            </p>
            <code style="display: inline-block; padding: 8px 16px; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 6px; font-family: monospace; font-size: 15px; font-weight: bold; letter-spacing: 0.5px;">
              ${params.verificationToken}
            </code>
          </div>

          <p style="line-height: 1.6;">Klik tombol atau URL di bawah ini untuk memverifikasi token akun Anda:</p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${verifyLink}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Verifikasi Akun Saya
            </a>
          </div>

          <div style="margin: 16px 0; padding: 12px 16px; background-color: #f1f5f9; border-radius: 8px; font-size: 13px; color: #334155; line-height: 1.6;">
            <p style="margin: 0 0 6px 0;">
              <strong>URL untuk Verifikasi Token:</strong><br />
              <a href="${verifyLink}" style="color: #059669; word-break: break-all;">${verifyLink}</a>
            </p>
            <p style="margin: 8px 0 0 0;">
              <strong>Halaman Input Token Manual:</strong><br />
              <a href="${manualVerifyUrl}" style="color: #059669; word-break: break-all;">${manualVerifyUrl}</a>
            </p>
          </div>

          <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
            <strong>Link alternatif:</strong><br />
            Jika tombol di atas tidak berfungsi, salin dan buka tautan alternatif berikut di browser Anda:<br />
            <a href="${verifyLink}" style="color: #059669; word-break: break-all;">${verifyLink}</a><br />
            atau: <a href="${alternativeLink}" style="color: #059669; word-break: break-all;">${alternativeLink}</a>
          </p>
        </div>
      `,
    });
    return true;
  } catch (err: any) {
    console.warn('⚠️ SMTP send error:', err.message);
    return false;
  }
}
