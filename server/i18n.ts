import i18next, { TFunction } from 'i18next';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request interface to include language and translation helper
declare global {
  namespace Express {
    interface Request {
      language: string;
      t: TFunction;
    }
  }
}

// Translations dictionary for Backend API responses & messages
const idBackend = {
  common: {
    success: 'Berhasil',
    error: 'Terjadi kesalahan pada sistem',
    badRequest: 'Permintaan tidak valid',
    unauthorized: 'Akses tidak sah. Token otentikasi diperlukan.',
    forbidden: 'Akses ditolak. Peran Anda tidak memiliki izin untuk tindakan ini.',
    notFound: 'Data tidak ditemukan',
    serverError: 'Kesalahan internal server',
    validationError: 'Validasi data gagal',
  },
  rateLimit: {
    globalExceeded: 'Batas laju permintaan API umum terlampaui. Token bucket habis. Silakan tunggu beberapa detik.',
    authExceeded: 'Terlalu banyak percobaan autentikasi (Rate limit). Demi keamanan, silakan tunggu beberapa detik.',
  },
  auth: {
    loginSuccess: 'Login berhasil. Selamat datang kembali!',
    invalidCredentials: 'Email atau kata sandi tidak sesuai.',
    accountInactive: 'Akun Anda belum aktif. Silakan verifikasi email Anda terlebih dahulu.',
    tenantInactive: 'Toko/Tenant Anda saat ini sedang dinonaktifkan.',
    tenantNotFound: 'Tenant/Toko tidak ditemukan.',
    registeredSuccess: 'Pendaftaran toko dan akun manajer berhasil! Kode verifikasi telah dikirim ke email Anda.',
    emailVerifiedSuccess: 'Email berhasil diverifikasi! Akun Anda telah aktif dan dapat digunakan untuk login.',
    verificationCodeInvalid: 'Kode verifikasi tidak valid atau tidak ditemukan.',
    verificationCodeExpired: 'Kode verifikasi telah kedaluwarsa. Silakan minta kode verifikasi baru.',
    emailAlreadyRegistered: 'Email sudah terdaftar dalam sistem.',
  },
  products: {
    created: 'Produk sembako berhasil ditambahkan ke katalog.',
    updated: 'Data produk berhasil diperbarui.',
    deleted: 'Produk berhasil dihapus dari sistem.',
    notFound: 'Produk tidak ditemukan.',
    adminForbidden: 'Akses ditolak: Role ADMIN dilarang menambah, mengubah, atau menghapus data produk.',
    managerRequired: 'Hanya Manajer Toko yang memiliki izin mengelola produk.',
    barcodeExists: 'Barcode sudah digunakan oleh produk lain.',
  },
  categories: {
    created: 'Kategori baru berhasil ditambahkan.',
    updated: 'Kategori berhasil diperbarui.',
    deleted: 'Kategori berhasil dihapus.',
    notFound: 'Kategori tidak ditemukan.',
    adminForbidden: 'Akses ditolak: Role ADMIN dilarang menambah, mengubah, atau menghapus kategori.',
    managerRequired: 'Hanya Manajer Toko yang memiliki izin mengelola kategori.',
  },
  orders: {
    created: 'Transaksi kasir berhasil disimpan.',
    emptyCart: 'Keranjang belanja tidak boleh kosong.',
    stockInsufficient: 'Stok tidak mencukupi untuk beberapa produk.',
  },
  health: {
    statusUp: 'Sistem KasirWarung berjalan normal.',
  },
};

const enBackend = {
  common: {
    success: 'Success',
    error: 'A system error occurred',
    badRequest: 'Invalid request',
    unauthorized: 'Unauthorized access. Authentication token is required.',
    forbidden: 'Access denied. Your role does not have permission for this action.',
    notFound: 'Data not found',
    serverError: 'Internal server error',
    validationError: 'Data validation failed',
  },
  rateLimit: {
    globalExceeded: 'General API request rate limit exceeded. Token bucket depleted. Please wait a few seconds.',
    authExceeded: 'Too many authentication attempts (Rate limit). For security, please wait a few seconds.',
  },
  auth: {
    loginSuccess: 'Login successful. Welcome back!',
    invalidCredentials: 'Invalid email or password.',
    accountInactive: 'Your account is not active yet. Please verify your email first.',
    tenantInactive: 'Your store/tenant is currently deactivated.',
    tenantNotFound: 'Store/Tenant not found.',
    registeredSuccess: 'Store and manager registration successful! A verification code has been sent to your email.',
    emailVerifiedSuccess: 'Email verified successfully! Your account is active and ready for login.',
    verificationCodeInvalid: 'Invalid or missing verification code.',
    verificationCodeExpired: 'Verification code has expired. Please request a new verification code.',
    emailAlreadyRegistered: 'Email is already registered in the system.',
  },
  products: {
    created: 'Grocery product successfully added to catalog.',
    updated: 'Product data updated successfully.',
    deleted: 'Product removed from system successfully.',
    notFound: 'Product not found.',
    adminForbidden: 'Access denied: The ADMIN role is prohibited from adding, modifying, or deleting product data.',
    managerRequired: 'Only Store Managers are authorized to manage products.',
    barcodeExists: 'Barcode is already in use by another product.',
  },
  categories: {
    created: 'New category added successfully.',
    updated: 'Category updated successfully.',
    deleted: 'Category deleted successfully.',
    notFound: 'Category not found.',
    adminForbidden: 'Access denied: The ADMIN role is prohibited from adding, modifying, or deleting categories.',
    managerRequired: 'Only Store Managers are authorized to manage categories.',
  },
  orders: {
    created: 'Cashier transaction saved successfully.',
    emptyCart: 'Shopping cart cannot be empty.',
    stockInsufficient: 'Insufficient stock for some products.',
  },
  health: {
    statusUp: 'KasirWarung system is operating normally.',
  },
};

// Initialize backend i18next instance
let isInitialized = false;

export async function initBackendI18n(): Promise<typeof i18next> {
  if (!isInitialized) {
    await i18next.init({
      lng: 'id', // Default language: Indonesia as requested
      fallbackLng: 'id',
      resources: {
        id: { translation: idBackend },
        en: { translation: enBackend },
      },
      interpolation: {
        escapeValue: false,
      },
    });
    isInitialized = true;
    console.log('🌐 Backend i18next initialized successfully (Default: id)');
  }
  return i18next;
}

// Immediately trigger initialization
initBackendI18n().catch(console.error);

/**
 * Express middleware to detect requested language from:
 * 1. Query parameter ?lng=... or ?lang=...
 * 2. Custom header 'x-language'
 * 3. Standard 'accept-language' header
 * Default fallback is 'id' (Bahasa Indonesia)
 */
export function i18nMiddleware(req: Request, res: Response, next: NextFunction) {
  let lang = 'id';

  const queryLng = req.query.lng || req.query.lang;
  const headerLng = req.headers['x-language'];
  const acceptLng = req.headers['accept-language'];

  if (typeof queryLng === 'string' && queryLng) {
    lang = queryLng.toLowerCase().startsWith('en') ? 'en' : 'id';
  } else if (typeof headerLng === 'string' && headerLng) {
    lang = headerLng.toLowerCase().startsWith('en') ? 'en' : 'id';
  } else if (typeof acceptLng === 'string' && acceptLng) {
    // If accept-language starts with en, but give priority to id unless explicitly en
    if (acceptLng.toLowerCase().includes('en') && !acceptLng.toLowerCase().includes('id')) {
      lang = 'en';
    } else {
      lang = 'id';
    }
  }

  req.language = lang;
  req.t = i18next.getFixedT(lang);

  // Send content-language response header
  res.setHeader('Content-Language', lang);

  next();
}

export { i18next };
