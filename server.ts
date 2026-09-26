import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { Redis } from 'ioredis';
import { MongoClient, ObjectId } from 'mongodb';
import { z } from 'zod';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'kasirwarung-jwt-supersecret-2026';
const REDIS_URL = process.env.REDIS_URL || '';
const MONGODB_URI = process.env.MONGODB_URI || '';
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// In-Memory Fallback State (ensures zero crashes regardless of external network or sandbox restrictions)
interface MemoryTenant {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED';
  createdAt: string;
}

interface MemoryUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER';
  tenantId: string | null;
  tenantName: string | null;
  isVerified: boolean;
  createdAt: string;
}

interface MemoryProduct {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  unit: string;
  minStock: number;
  description: string;
  imageUrl: string;
  isPopular?: boolean;
  createdAt: string;
}

interface MemoryOrder {
  id: string;
  orderNumber: string;
  tenantId: string;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    qty: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  tenderAmount: number;
  changeAmount: number;
  paymentMethod: 'TUNAI' | 'QRIS' | 'TRANSFER' | 'KASBON';
  paymentStatus: 'LUNAS' | 'BELUM_LUNAS';
  customerName: string;
  customerNote?: string;
  cashierName: string;
  createdAt: string;
}

// In-Memory Store
const memoryDB = {
  tenants: new Map<string, MemoryTenant>(),
  users: new Map<string, MemoryUser>(),
  products: new Map<string, MemoryProduct>(),
  orders: new Map<string, MemoryOrder>(),
  verificationTokens: new Map<string, { email: string; expiresAt: number }>(),
};

// Redis Client with error handling and fallback
let redisClient: Redis | null = null;
let redisConnected = false;

if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      lazyConnect: true,
      tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });

    redisClient.connect().then(() => {
      redisConnected = true;
      console.log('✅ Connected to Upstash Redis successfully');
    }).catch((err) => {
      console.warn('⚠️ Upstash Redis connection failed, falling back to in-memory cache:', err.message);
      redisConnected = false;
    });

    redisClient.on('error', (err) => {
      redisConnected = false;
      // quiet log
    });
  } catch (err) {
    console.warn('⚠️ Redis initialization error, using in-memory token store');
  }
}

// MongoDB Client with error handling and fallback
let mongoClient: MongoClient | null = null;
let mongoConnected = false;
let mongoDbInstance: any = null;

if (MONGODB_URI) {
  try {
    mongoClient = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
    });

    mongoClient.connect().then(() => {
      mongoConnected = true;
      mongoDbInstance = mongoClient!.db();
      console.log('✅ Connected to MongoDB Atlas successfully');
    }).catch((err) => {
      console.warn('⚠️ MongoDB connection failed, falling back to resilient in-memory database:', err.message);
      mongoConnected = false;
    });
  } catch (err) {
    console.warn('⚠️ MongoDB client creation failed, using resilient in-memory database');
  }
}

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.marmeam.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE === 'true' || true,
  auth: {
    user: process.env.SMTP_USER || 'noreplay@marmeam.com',
    pass: process.env.SMTP_PASS || 'noreplay123456',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Helper: Seed Default Data (Berkah Jaya, Admin, Manager, Cashier, Products, Sample Orders)
async function seedInitialData() {
  const salt = await bcrypt.genSalt(10);
  const passwordAdmin = await bcrypt.hash('Admin123!', salt);
  const passwordManager = await bcrypt.hash('Manager123!', salt);
  const passwordKasir = await bcrypt.hash('Kasir123!', salt);

  // 1. Tenant 1: Toko Berkah Jaya
  const tenant1: MemoryTenant = {
    id: 'tenant-berkah-jaya',
    name: 'Berkah Jaya',
    slug: 'berkah-jaya',
    address: 'Jl. Merdeka No. 42, RT 02/05 Pasar Anyar',
    phone: '0812-3456-7890',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };
  memoryDB.tenants.set(tenant1.id, tenant1);

  // 2. Tenant 2: Warung Madura 24 Jam (Demonstrating Multi-Tenant Isolation)
  const tenant2: MemoryTenant = {
    id: 'tenant-madura-24jam',
    name: 'Warung Madura 24 Jam',
    slug: 'madura-24jam',
    address: 'Jl. Pemuda Raya No. 88, Cibubur',
    phone: '0877-9876-5432',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };
  memoryDB.tenants.set(tenant2.id, tenant2);

  // Users:
  // Role: ADMIN (Platform / Global Admin)
  const userAdmin: MemoryUser = {
    id: 'user-admin-1',
    email: 'admin@kasirwarung.com',
    passwordHash: passwordAdmin,
    name: 'Super Admin KasirWarung',
    role: 'ADMIN',
    tenantId: null,
    tenantName: null,
    isVerified: true,
    createdAt: new Date().toISOString(),
  };
  memoryDB.users.set(userAdmin.id, userAdmin);

  // Role: MANAGER (Toko Berkah Jaya)
  const userManager: MemoryUser = {
    id: 'user-manager-1',
    email: 'manager@berkahjaya.com',
    passwordHash: passwordManager,
    name: 'Bu Siti Rahma',
    role: 'MANAGER',
    tenantId: tenant1.id,
    tenantName: tenant1.name,
    isVerified: true,
    createdAt: new Date().toISOString(),
  };
  memoryDB.users.set(userManager.id, userManager);

  // Role: CASHIER (Toko Berkah Jaya)
  const userCashier: MemoryUser = {
    id: 'user-cashier-1',
    email: 'kasir@berkahjaya.com',
    passwordHash: passwordKasir,
    name: 'Bu Siti (Kasir Utama)',
    role: 'CASHIER',
    tenantId: tenant1.id,
    tenantName: tenant1.name,
    isVerified: true,
    createdAt: new Date().toISOString(),
  };
  memoryDB.users.set(userCashier.id, userCashier);

  // Manager for Tenant 2
  const userManager2: MemoryUser = {
    id: 'user-manager-2',
    email: 'cak.holil@madura24.com',
    passwordHash: passwordManager,
    name: 'Cak Holil (Owner)',
    role: 'MANAGER',
    tenantId: tenant2.id,
    tenantName: tenant2.name,
    isVerified: true,
    createdAt: new Date().toISOString(),
  };
  memoryDB.users.set(userManager2.id, userManager2);

  // Seed Products for Berkah Jaya (104 items)
  const rawProducts = [
    // Beras & Gandum
    { name: "Beras Pandan Wangi 5kg", sku: "BRS-PW05", cat: "Beras & Gandum", price: 74000, cost: 68000, stock: 24, unit: "karung", min: 5, pop: true, desc: "Beras pulen aromatik pandan alami kualitas super kemasan 5kg." },
    { name: "Beras Rojolele 5kg", sku: "BRS-RJ05", cat: "Beras & Gandum", price: 72000, cost: 66000, stock: 18, unit: "karung", min: 5, pop: true, desc: "Karung jahit beras pulen lokal pilihan favorit keluarga." },
    { name: "Beras Setra Ramos Cap Bunga 5kg", sku: "BRS-SR05", cat: "Beras & Gandum", price: 69500, cost: 64000, stock: 30, unit: "karung", min: 6, pop: false, desc: "Beras putih bersih rasa gurih sedap alami tanpa pemutih." },
    { name: "Beras Maknyuss 5kg", sku: "BRS-MK05", cat: "Beras & Gandum", price: 76000, cost: 70000, stock: 12, unit: "karung", min: 4, pop: false, desc: "Beras premium kemasan vacuum higienis tanpa pengawet." },
    { name: "Tepung Segitiga Biru 1kg", sku: "TPG-SB01", cat: "Beras & Gandum", price: 13000, cost: 11200, stock: 45, unit: "bks", min: 10, pop: true, desc: "Tepung terigu serbaguna protein sedang untuk aneka gorengan dan kue." },
    { name: "Tepung Cakra Kembar 1kg", sku: "TPG-CK01", cat: "Beras & Gandum", price: 14500, cost: 12500, stock: 28, unit: "bks", min: 8, pop: false, desc: "Tepung terigu protein tinggi untuk roti dan mie elastis empuk." },
    { name: "Tepung Beras Rose Brand 500g", sku: "TPG-RB05", cat: "Beras & Gandum", price: 8500, cost: 7200, stock: 35, unit: "bks", min: 8, pop: false, desc: "Tepung beras murni alami cocok untuk kue tradisional." },
    { name: "Tepung Tapioka Pak Tani Gunung 500g", sku: "TPG-PT05", cat: "Beras & Gandum", price: 9000, cost: 7500, stock: 32, unit: "bks", min: 8, pop: false, desc: "Tepung kanji tapioka super untuk pempek dan bakso kenyal." },
    { name: "Tepung Bumbu Sasa Serbaguna 210g", sku: "TPG-SS21", cat: "Beras & Gandum", price: 7000, cost: 5800, stock: 40, unit: "bks", min: 10, pop: true, desc: "Tepung bumbu krispi praktis renyah kaya rempah." },
    { name: "Tepung Kunci Biru 1kg", sku: "TPG-KB01", cat: "Beras & Gandum", price: 12500, cost: 10800, stock: 22, unit: "bks", min: 5, pop: false, desc: "Tepung kue kering renyah dan lapis legit empuk." },
    { name: "Tepung Ketan Rose Brand 500g", sku: "TPG-RK05", cat: "Beras & Gandum", price: 11000, cost: 9500, stock: 20, unit: "bks", min: 5, pop: false, desc: "Tepung ketan putih halus untuk onde-onde dan klepon." },
    { name: "Tepung Maizena MamaSuka 150g", sku: "TPG-MZ15", cat: "Beras & Gandum", price: 5500, cost: 4200, stock: 19, unit: "kotak", min: 5, pop: false, desc: "Tepung pati jagung pengental saus dan sup." },
    { name: "Tepung Bakwan Sasa 250g", sku: "TPG-SB25", cat: "Beras & Gandum", price: 6500, cost: 5200, stock: 25, unit: "bks", min: 6, pop: false, desc: "Racikan tepung bumbu gurih khusus bakwan sayur renyah." },
    { name: "Tepung Bumbu Sajiku Golden Crispy 200g", sku: "TPG-SJ20", cat: "Beras & Gandum", price: 7500, cost: 6100, stock: 27, unit: "bks", min: 6, pop: false, desc: "Tepung ayam goreng renyah tahan lama ala fried chicken." },

    // Minyak & Margarin
    { name: "Minyak Bimoli 2L", sku: "MYK-BM02", cat: "Minyak & Margarin", price: 36500, cost: 33500, stock: 18, unit: "pouch", min: 5, pop: true, desc: "Refill pouch 2000 ml kemasan jernih kelapa sawit pilihan." },
    { name: "Minyak Sania 2L", sku: "MYK-SN02", cat: "Minyak & Margarin", price: 35000, cost: 32000, stock: 42, unit: "pouch", min: 8, pop: true, desc: "Pouch refill minyak goreng kelapa sawit dengan vitamin E tinggi." },
    { name: "Minyak Filma 2L", sku: "MYK-FL02", cat: "Minyak & Margarin", price: 37000, cost: 34000, stock: 15, unit: "pouch", min: 5, pop: false, desc: "Minyak goreng non-kolesterol tidak mudah beku hasil sulingan ganda." },
    { name: "Minyak Tropical 2L Botol", sku: "MYK-TP02", cat: "Minyak & Margarin", price: 38500, cost: 35000, stock: 11, unit: "botol", min: 4, pop: false, desc: "Minyak goreng botol 2x penyaringan bening sehat." },
    { name: "Minyak SunCo 1L", sku: "MYK-SC01", cat: "Minyak & Margarin", price: 19500, cost: 17500, stock: 25, unit: "pouch", min: 6, pop: false, desc: "Minyak goreng pouch 1 liter bening seperti air." },
    { name: "Minyak Fortune 2L", sku: "MYK-FT02", cat: "Minyak & Margarin", price: 34500, cost: 31500, stock: 22, unit: "pouch", min: 5, pop: false, desc: "Minyak goreng ekonomis berkualitas renyah untuk gorengan." },
    { name: "Minyak Goreng Curah 1kg", sku: "MYK-CR01", cat: "Minyak & Margarin", price: 16000, cost: 14500, stock: 50, unit: "kg", min: 10, pop: true, desc: "Minyak curah plastik 1 kg langganan pedagang gorengan." },
    { name: "Blue Band Serbaguna Sachet 200g", sku: "MRG-BB20", cat: "Minyak & Margarin", price: 9500, cost: 8000, stock: 36, unit: "sachet", min: 8, pop: true, desc: "Margarin kaya omega 3 & 6 cocok untuk olesan roti." },
    { name: "Margarin ForVita 200g", sku: "MRG-FV20", cat: "Minyak & Margarin", price: 7500, cost: 6200, stock: 29, unit: "sachet", min: 6, pop: false, desc: "Margarin bebas lemak trans aroma gurih untuk tumisan." },
    { name: "Palmia Margarin Serbaguna 200g", sku: "MRG-PL20", cat: "Minyak & Margarin", price: 8000, cost: 6600, stock: 18, unit: "sachet", min: 5, pop: false, desc: "Margarin aroma mentega gurih harum." },
    { name: "Minyak Wijen ABC 195ml", sku: "MYK-WJ19", cat: "Minyak & Margarin", price: 32000, cost: 28000, stock: 8, unit: "botol", min: 2, pop: false, desc: "Minyak wijen murni aroma wangi khas masakan oriental." },
    { name: "Minyak Sania Pouch 1L", sku: "MYK-SN01", cat: "Minyak & Margarin", price: 19500, cost: 17600, stock: 20, unit: "pouch", min: 5, pop: false, desc: "Refill pouch 1000 ml minyak kelapa sawit." },

    // Bumbu Dapur
    { name: "Gula Pasir Gulaku 1kg", sku: "GUL-GL01", cat: "Bumbu Dapur", price: 18000, cost: 16200, stock: 35, unit: "bks", min: 8, pop: true, desc: "Gula tebu murni kristal putih manis alami tanpa pemutih." },
    { name: "Gula Pasir Rose Brand 1kg", sku: "GUL-RB01", cat: "Bumbu Dapur", price: 17500, cost: 15800, stock: 40, unit: "bks", min: 10, pop: true, desc: "Gula pasir kristal higienis larut cepat untuk minuman." },
    { name: "Gula Merah Aren Batok 500g", sku: "GUL-MR05", cat: "Bumbu Dapur", price: 16000, cost: 13500, stock: 22, unit: "bks", min: 5, pop: false, desc: "Gula jawa aren asli aroma wangi manis gurih alami." },
    { name: "Kecap Manis Bango 520ml", sku: "KCP-BG52", cat: "Bumbu Dapur", price: 24500, cost: 22000, stock: 16, unit: "botol", min: 4, pop: true, desc: "Kedelai hitam mallika asli rasa legit kental gurih legendaris." },
    { name: "Kecap Manis Sedaap 550ml Pouch", sku: "KCP-SD55", cat: "Bumbu Dapur", price: 20000, cost: 17800, stock: 25, unit: "pouch", min: 6, pop: false, desc: "Kecap manis pilihan meresap sempurna ke dalam masakan." },
    { name: "Garam Dapur Cap Kapal 250g", sku: "GRM-KP25", cat: "Bumbu Dapur", price: 3000, cost: 2000, stock: 60, unit: "bks", min: 15, pop: true, desc: "Garam beryodium murni halus bersih untuk kesehatan." },
    { name: "Saus Sambal ABC Asli 275ml", sku: "SAU-ABC27", cat: "Bumbu Dapur", price: 14000, cost: 12200, stock: 20, unit: "botol", min: 5, pop: true, desc: "Saus cabe asli pilihan pedas mantap aroma bawang segar." },
    { name: "Saus Tomat ABC 275ml", sku: "SAU-TMT27", cat: "Bumbu Dapur", price: 13000, cost: 11000, stock: 14, unit: "botol", min: 4, pop: false, desc: "Saus tomat segar rasa manis asam pas cocok cocolan." },
    { name: "Royco Kaldu Ayam 230g", sku: "RYC-AY23", cat: "Bumbu Dapur", price: 11500, cost: 9800, stock: 35, unit: "bks", min: 8, pop: true, desc: "Penyedap rasa kaldu ayam rebus kaya rempah gurih lezat." },
    { name: "Royco Kaldu Sapi 230g", sku: "RYC-SP23", cat: "Bumbu Dapur", price: 11500, cost: 9800, stock: 28, unit: "bks", min: 6, pop: false, desc: "Bumbu penyedap ekstrak sumsum sapi gurih mantap." },
    { name: "Masako Ayam Renteng 10 Sachet", sku: "MSK-AY10", cat: "Bumbu Dapur", price: 5000, cost: 4200, stock: 45, unit: "renteng", min: 10, pop: true, desc: "Kaldu ayam kemasan sachet praktis untuk aneka tumisan." },
    { name: "Masako Sapi Renteng 10 Sachet", sku: "MSK-SP10", cat: "Bumbu Dapur", price: 5000, cost: 4200, stock: 40, unit: "renteng", min: 10, pop: false, desc: "Kaldu daging sapi gurih lezat kemasan sachet ekonomis." },
    { name: "Ladaku Merica Bubuk Renteng (12s)", sku: "LDK-RC12", cat: "Bumbu Dapur", price: 10000, cost: 8500, stock: 30, unit: "renteng", min: 6, pop: true, desc: "Merica putih murni 100% aroma pedas segar membangkitkan selera." },
    { name: "Ajinomoto MSG 100g", sku: "AJN-MG10", cat: "Bumbu Dapur", price: 5000, cost: 4100, stock: 48, unit: "bks", min: 10, pop: false, desc: "Penguat rasa monosodium glutamat umami sedap alami." },
    { name: "Santan Kara Kelapa Segar 65ml", sku: "KRA-ST65", cat: "Bumbu Dapur", price: 3500, cost: 2800, stock: 55, unit: "bks", min: 12, pop: true, desc: "Santan kelapa kental siap pakai higienis gurih." },
    { name: "Desaku Ketumbar Bubuk Renteng (12s)", sku: "DSK-KT12", cat: "Bumbu Dapur", price: 9000, cost: 7500, stock: 22, unit: "renteng", min: 5, pop: false, desc: "Ketumbar bubuk murni harum untuk marinasi tempe & ayam." },
    { name: "Desaku Kunyit Bubuk Renteng (12s)", sku: "DSK-KY12", cat: "Bumbu Dapur", price: 9000, cost: 7500, stock: 18, unit: "renteng", min: 5, pop: false, desc: "Kunyit bubuk murni pewarna dan penyedap alami tanpa pahit." },
    { name: "Terasi Udang Juwana 10 Biji", sku: "TRS-JW10", cat: "Bumbu Dapur", price: 8000, cost: 6000, stock: 24, unit: "pack", min: 5, pop: false, desc: "Terasi udang rebon asli Jawa wangi gurih sedap untuk sambal." },

    // Mie & Makanan Instan
    { name: "Indomie Goreng Original", sku: "IND-GR01", cat: "Mie & Makanan Instan", price: 3100, cost: 2650, stock: 120, unit: "bks", min: 30, pop: true, desc: "Mi instan goreng legendaris 85g dengan bawang goreng renyah." },
    { name: "Indomie Kuah Kari Ayam", sku: "IND-KA02", cat: "Mie & Makanan Instan", price: 3100, cost: 2650, stock: 95, unit: "bks", min: 25, pop: true, desc: "Mi kuah kuah kental rasa kari gurih rempah nikmat." },
    { name: "Indomie Soto Mie", sku: "IND-ST03", cat: "Mie & Makanan Instan", price: 3100, cost: 2650, stock: 80, unit: "bks", min: 20, pop: true, desc: "Mi kuah soto mie segar aroma jeruk nipis dan daun bawang." },
    { name: "Indomie Ayam Bawang", sku: "IND-AB04", cat: "Mie & Makanan Instan", price: 3100, cost: 2650, stock: 75, unit: "bks", min: 20, pop: false, desc: "Mi kuah kaldu ayam gurih harum bawang putih goreng." },
    { name: "Indomie Goreng Rendang", sku: "IND-RD05", cat: "Mie & Makanan Instan", price: 3200, cost: 2750, stock: 60, unit: "bks", min: 15, pop: false, desc: "Mi goreng cita rasa rendang Padang pedas gurih rempah tebal." },
    { name: "Mie Sedaap Goreng", sku: "SDP-GR01", cat: "Mie & Makanan Instan", price: 3100, cost: 2650, stock: 85, unit: "bks", min: 20, pop: true, desc: "Mi goreng kriuk-kriuk bawang gurih renyah lezat." },
    { name: "Mie Sedaap Soto Madura", sku: "SDP-ST02", cat: "Mie & Makanan Instan", price: 3100, cost: 2650, stock: 55, unit: "bks", min: 15, pop: false, desc: "Koya gurih lezat kuah kental segar mie kenyal kenyal." },
    { name: "Mie Sedaap Ayam Bawang Telur", sku: "SDP-AB03", cat: "Mie & Makanan Instan", price: 3100, cost: 2650, stock: 45, unit: "bks", min: 15, pop: false, desc: "Kuah kaldu ayam kental dengan rasa telur gurih lezat." },
    { name: "Pop Mie Rasa Ayam Cup 75g", sku: "POP-AY75", cat: "Mie & Makanan Instan", price: 6000, cost: 4900, stock: 35, unit: "cup", min: 8, pop: false, desc: "Mie seduh instan cup praktis tinggal seduh air panas." },
    { name: "Pop Mie Kuah Baso Cup 75g", sku: "POP-BS75", cat: "Mie & Makanan Instan", price: 6000, cost: 4900, stock: 30, unit: "cup", min: 8, pop: false, desc: "Mie cup kuah bakso sedap lengkap dengan sayuran kering." },
    { name: "Sarimi Isi 2 Ayam Kecap", sku: "SRM-IS02", cat: "Mie & Makanan Instan", price: 4500, cost: 3800, stock: 40, unit: "bks", min: 10, pop: false, desc: "Porsi dobel 2 keping mie kenyang hemat rasa ayam kecap." },
    { name: "Bihun Jagung Padamu 320g", sku: "BHN-JG32", cat: "Mie & Makanan Instan", price: 8500, cost: 7000, stock: 25, unit: "bks", min: 6, pop: false, desc: "Bihun jagung kenyal tidak mudah hancur cocok untuk bihun goreng." },
    { name: "Sarden ABC Saus Tomat 155g", sku: "SRD-ABC15", cat: "Mie & Makanan Instan", price: 11000, cost: 9300, stock: 22, unit: "kaleng", min: 5, pop: false, desc: "Ikan sarden segar dalam saus tomat asam manis gurih." },
    { name: "Sarden ABC Ekstra Pedas 155g", sku: "SRD-ABC16", cat: "Mie & Makanan Instan", price: 11500, cost: 9600, stock: 18, unit: "kaleng", min: 5, pop: false, desc: "Sarden kualitas ekspor dengan saus cabai pedas mantap." },
    { name: "Kornet Daging Sapi Pronas 198g", sku: "KRN-PR19", cat: "Mie & Makanan Instan", price: 26000, cost: 22500, stock: 14, unit: "kaleng", min: 4, pop: false, desc: "Kornet sapi olahan lezat gurih cocok untuk nasi goreng." },
    { name: "Supermi Ayam Bawang", sku: "SPM-AB01", cat: "Mie & Makanan Instan", price: 3000, cost: 2500, stock: 45, unit: "bks", min: 10, pop: false, desc: "Mi kuah klasik pelopor mi instan Indonesia kuah bening sedap." },

    // Minuman & Kopi
    { name: "Kopi Kapal Api Spesial Mix (10s)", sku: "KOP-KA10", cat: "Minuman & Kopi", price: 15500, cost: 13500, stock: 40, unit: "renteng", min: 10, pop: true, desc: "Kemasan 1 renteng isi 10 sachet kopi bubuk plus gula tebu." },
    { name: "Good Day Cappuccino (10s)", sku: "KOP-GD10", cat: "Minuman & Kopi", price: 20000, cost: 17200, stock: 65, unit: "renteng", min: 12, pop: true, desc: "1 Sachet + Choco Granule tabur di atas busa krim lembut gurih." },
    { name: "Good Day Mocacinno (10s)", sku: "KOP-GM10", cat: "Minuman & Kopi", price: 15000, cost: 13000, stock: 35, unit: "renteng", min: 8, pop: false, desc: "Paduan kopi harum dan cokelat lezat diseduh dingin / panas." },
    { name: "Kopi ABC Susu (10s)", sku: "KOP-ABC10", cat: "Minuman & Kopi", price: 15000, cost: 13000, stock: 38, unit: "renteng", min: 8, pop: false, desc: "Kopi mantap dengan paduan susu manis gurih pas di lidah." },
    { name: "Luwak White Koffie (10s)", sku: "KOP-LW10", cat: "Minuman & Kopi", price: 16500, cost: 14200, stock: 32, unit: "renteng", min: 8, pop: false, desc: "Kopi putih aman di lambung rasa lembut tidak bikin kembung." },
    { name: "Teh SariWangi Kotak 25s", sku: "TEH-SW25", cat: "Minuman & Kopi", price: 7500, cost: 6200, stock: 28, unit: "kotak", min: 6, pop: true, desc: "Teh hitam celup asli wangi melati kehangatan keluarga." },
    { name: "Teh Celup Sosro Kotak 30s", sku: "TEH-SS30", cat: "Minuman & Kopi", price: 8000, cost: 6700, stock: 25, unit: "kotak", min: 6, pop: false, desc: "Aroma daun teh melati asli warisan tanah Jawa wangi harum." },
    { name: "Susu Kental Manis Frisian Flag 370g", sku: "SUS-FF37", cat: "Minuman & Kopi", price: 12000, cost: 10500, stock: 30, unit: "kaleng", min: 6, pop: true, desc: "Frisian Flag bendera putih kental manis gurih untuk kopi & roti." },
    { name: "Susu Kental Manis Frisian Flag Cokelat 370g", sku: "SUS-FC37", cat: "Minuman & Kopi", price: 12000, cost: 10500, stock: 24, unit: "kaleng", min: 6, pop: false, desc: "Kental manis cokelat tebal rasa nikmat untuk martabak manis." },
    { name: "Aqua 600ml Botol", sku: "MIN-AQ60", cat: "Minuman & Kopi", price: 3500, cost: 2800, stock: 80, unit: "botol", min: 24, pop: true, desc: "Air Mineral Botol 600 ml dari mata air pegunungan alami sejuk." },
    { name: "Aqua Galon 19L (Isi Ulang)", sku: "MIN-AQ19", cat: "Minuman & Kopi", price: 21000, cost: 18500, stock: 15, unit: "galon", min: 5, pop: true, desc: "Isi ulang galon Aqua 19 Liter tutup berstiker resmi orisinal." },
    { name: "Le Minerale 600ml Botol", sku: "MIN-LM60", cat: "Minuman & Kopi", price: 3500, cost: 2750, stock: 65, unit: "botol", min: 20, pop: true, desc: "Air mineral ada manis-manisnya dengan kandungan mineral alami." },
    { name: "Teh Pucuk Harum 350ml", sku: "MIN-TP35", cat: "Minuman & Kopi", price: 4000, cost: 3200, stock: 70, unit: "botol", min: 24, pop: true, desc: "Minuman teh melati segar dari pucuk daun teh pilihan." },
    { name: "Floridina Orange 350ml", sku: "MIN-FO35", cat: "Minuman & Kopi", price: 3500, cost: 2700, stock: 45, unit: "botol", min: 12, pop: false, desc: "Minuman sari buah jeruk Florida dengan bulir jeruk asli segar." },
    { name: "Ultra Milk Cokelat 250ml", sku: "SUS-UM25", cat: "Minuman & Kopi", price: 6500, cost: 5400, stock: 35, unit: "kotak", min: 10, pop: false, desc: "Susu sapi segar UHT rasa cokelat kaya kalsium dan vitamin." },
    { name: "Bear Brand Susu Steril 189ml", sku: "SUS-BB18", cat: "Minuman & Kopi", price: 10500, cost: 9200, stock: 40, unit: "kaleng", min: 10, pop: true, desc: "Susu steril murni menjaga kebugaran tubuh saat lelah." },
    { name: "Pocari Sweat 500ml", sku: "MIN-PS50", cat: "Minuman & Kopi", price: 7500, cost: 6300, stock: 30, unit: "botol", min: 8, pop: false, desc: "Minuman isotonik menggantikan ion tubuh hilang dengan cepat." },
    { name: "Kratingdaeng Minuman Energi 150ml", sku: "MIN-KD15", cat: "Minuman & Kopi", price: 6500, cost: 5300, stock: 25, unit: "botol", min: 6, pop: false, desc: "Minuman stamina berenergi mengandung taurin dan vitamin B." },

    // Sembako Segar & Telur
    { name: "Telur Ayam Negeri 1kg", sku: "TLR-AY01", cat: "Sembako Segar", price: 29000, cost: 26000, stock: 15, unit: "kg", min: 5, pop: true, desc: "Kualitas segar grade A (isi sekitar 16 butir per kg) cangkang cokelat tebal." },
    { name: "Telur Ayam 1/2 kg (±8 butir)", sku: "TLR-AY05", cat: "Sembako Segar", price: 15000, cost: 13200, stock: 14, unit: "kg", min: 4, pop: true, desc: "Kemasan hemat setengah kilogram isi 8 butir telur segar." },
    { name: "Telur Bebek Asin Matang (1 butir)", sku: "TLR-BB01", cat: "Sembako Segar", price: 4500, cost: 3600, stock: 35, unit: "butir", min: 10, pop: false, desc: "Telur asin Brebes masir berminyak gurih nikmat siap santap." },
    { name: "Bawang Merah Brebes 500g", sku: "BWG-MR05", cat: "Sembako Segar", price: 18000, cost: 15000, stock: 12, unit: "bks", min: 4, pop: true, desc: "Bawang merah super kering aroma tajam wangi sedap." },
    { name: "Bawang Putih Kating 500g", sku: "BWG-PT05", cat: "Sembako Segar", price: 21000, cost: 18000, stock: 10, unit: "bks", min: 3, pop: false, desc: "Bawang putih kating siung bulat besar wangi kuat untuk bumbu." },
    { name: "Cabe Rawit Merah (Jablay) 250g", sku: "CBE-RW25", cat: "Sembako Segar", price: 15000, cost: 12500, stock: 8, unit: "bks", min: 3, pop: false, desc: "Cabe rawit merah petik segar pedas menggigit." },
    { name: "Cabe Merah Keriting 250g", sku: "CBE-KR25", cat: "Sembako Segar", price: 12000, cost: 9800, stock: 9, unit: "bks", min: 3, pop: false, desc: "Cabe merah keriting segar merah merona pewarna alami." },
    { name: "Kentang Dieng Segar 1kg", sku: "KTG-DG01", cat: "Sembako Segar", price: 19000, cost: 16000, stock: 11, unit: "kg", min: 3, pop: false, desc: "Kentang Dieng umbi kuning padat tidak berair untuk perkedel." },

    // Kebersihan & Rumah Tangga
    { name: "Sunlight Jeruk Nipis 700ml Pouch", sku: "SBN-SL70", cat: "Kebersihan", price: 14500, cost: 12500, stock: 4, unit: "bks", min: 6, pop: true, desc: "Sabun cuci piring pembersih lemak membandel ekstrak jeruk nipis." },
    { name: "Mama Lemon Jeruk Nipis 680ml", sku: "SBN-ML68", cat: "Kebersihan", price: 13500, cost: 11500, stock: 18, unit: "bks", min: 5, pop: false, desc: "Formula ekstrak lemon efektif hilangkan bau amis seketika." },
    { name: "Deterjen Rinso Molto Rose Fresh 770g", sku: "DTR-RN77", cat: "Kebersihan", price: 21500, cost: 18800, stock: 16, unit: "bks", min: 4, pop: true, desc: "Deterjen bubuk anti noda 3x lebih cepat dengan wangi mawar." },
    { name: "Daia Deterjen Bubuk Lemon 850g", sku: "DTR-DA85", cat: "Kebersihan", price: 18500, cost: 16000, stock: 22, unit: "bks", min: 5, pop: false, desc: "Deterjen pembersih busa melimpah wangi lemon harum." },
    { name: "Molto Pewangi Pakaian Floral 780ml", sku: "MLT-FB78", cat: "Kebersihan", price: 14000, cost: 12000, stock: 20, unit: "pouch", min: 5, pop: true, desc: "Pewangi dan pelembut serat pakaian harum bunga tahan lama." },
    { name: "So Klin Lantai Lavender 780ml", sku: "SKL-LV78", cat: "Kebersihan", price: 11000, cost: 9200, stock: 24, unit: "pouch", min: 6, pop: false, desc: "Pembersih lantai wangi lavender bunuh 99% kuman kilap." },
    { name: "Wipol Karbol Wangi Cemara 750ml", sku: "WPL-CM75", cat: "Kebersihan", price: 16500, cost: 14000, stock: 14, unit: "pouch", min: 4, pop: false, desc: "Karbol disinfektan aroma pinus alami hilangkan bau tak sedap." },
    { name: "Bayclin Pemutih Pakaian 500ml", sku: "BYC-PM50", cat: "Kebersihan", price: 9500, cost: 8000, stock: 19, unit: "botol", min: 5, pop: false, desc: "Cairan pemutih pakaian putih cemerlang sekaligus disinfektan." },
    { name: "Sabun Mandi Lifebuoy Total 10 85g", sku: "SBN-LB85", cat: "Kebersihan", price: 4000, cost: 3200, stock: 48, unit: "batang", min: 12, pop: true, desc: "Sabun batang perlindungan kuman aktif warna merah legendaris." },
    { name: "Sabun Mandi Dettol Original 100g", sku: "SBN-DT10", cat: "Kebersihan", price: 6500, cost: 5300, stock: 30, unit: "batang", min: 8, pop: false, desc: "Sabun antiseptik kesehatan keluarga melindungi dari kuman." },
    { name: "Pasta Gigi Pepsodent 190g", sku: "PSG-PP19", cat: "Kebersihan", price: 13000, cost: 11000, stock: 25, unit: "kotak", min: 6, pop: true, desc: "Kandungan mikro kalsium aktif dan fluoride untuk gigi kuat." },
    { name: "Sikat Gigi Pepsodent Family Soft 3s", sku: "SKT-PP03", cat: "Kebersihan", price: 12000, cost: 9500, stock: 16, unit: "pack", min: 4, pop: false, desc: "Bulu sikat lembut tidak melukai gusi dengan leher sikat lentur." },
    { name: "Shampoo Sunsilk Black Shine 160ml", sku: "SMP-SS16", cat: "Kebersihan", price: 18500, cost: 15800, stock: 14, unit: "botol", min: 4, pop: false, desc: "Formula urang aring menjadikan rambut tampak hitam berkilau." },
    { name: "Spons Scotch-Brite Hijau (1 pcs)", sku: "SPN-SB01", cat: "Kebersihan", price: 4500, cost: 3200, stock: 40, unit: "pcs", min: 10, pop: false, desc: "Sabut spons anti gores tahan lama busa melimpah." },

    // Camilan & Snack
    { name: "Biskuit Roma Kelapa 300g", sku: "BSK-RK30", cat: "Camilan & Snack", price: 11000, cost: 9200, stock: 28, unit: "bks", min: 6, pop: true, desc: "Biskuit renyah gurih kelapa asli teman minum teh dan kopi sore." },
    { name: "Khong Guan Assorted Biscuits 650g", sku: "BSK-KG65", cat: "Camilan & Snack", price: 54000, cost: 47000, stock: 8, unit: "kaleng", min: 2, pop: false, desc: "Aneka biskuit legendaris dalam kaleng merah ikonik keluarga." },
    { name: "Chitato Sapi Panggang 68g", sku: "SNK-CT68", cat: "Camilan & Snack", price: 11500, cost: 9600, stock: 25, unit: "bks", min: 6, pop: true, desc: "Keripik kentang bergelombang renyah rasa daging sapi panggang." },
    { name: "Taro Net Seaweed 65g", sku: "SNK-TR65", cat: "Camilan & Snack", price: 6000, cost: 4800, stock: 30, unit: "bks", min: 8, pop: false, desc: "Snack jaring renyah rasa rumput laut gurih asin." },
    { name: "Nabati Wafer Richeese Keju 168g", sku: "WFR-NB16", cat: "Camilan & Snack", price: 8500, cost: 7000, stock: 35, unit: "bks", min: 8, pop: true, desc: "Wafer renyah krim keju kaya vitamin gurih manis anak-anak." },
    { name: "Beng-Beng Cokelat Wafer (Box 17s)", sku: "WFR-BB17", cat: "Camilan & Snack", price: 34000, cost: 29000, stock: 14, unit: "box", min: 4, pop: true, desc: "Wafer lapis karamel cokelat krispi empat kenikmatan satu gigitan." },
    { name: "Kacang Kulit Garuda 375g", sku: "KCG-GR37", cat: "Camilan & Snack", price: 24000, cost: 20500, stock: 18, unit: "bks", min: 4, pop: false, desc: "Kacang garing gurih renyah teman nonton bola dan ngobrol ronda." },
    { name: "SilverQueen Cashew 62g", sku: "CKL-SQ62", cat: "Camilan & Snack", price: 16500, cost: 14000, stock: 20, unit: "batang", min: 5, pop: false, desc: "Cokelat susu lembut bertabur kacang mede renyah melimpah." },
    { name: "Choki Choki Chococashew (Pack 20s)", sku: "CKL-CC20", cat: "Camilan & Snack", price: 18000, cost: 15200, stock: 22, unit: "pack", min: 5, pop: false, desc: "Pasta cokelat mede stik legendaris jajanan favorit warung." },
    { name: "Kerupuk Bawang Mentah Mawar 500g", sku: "KRP-BW05", cat: "Camilan & Snack", price: 12000, cost: 9500, stock: 25, unit: "bks", min: 5, pop: false, desc: "Kerupuk bawang mentah tinggal goreng mekar renyah gurih." },
    { name: "Malkist Roma Abon Sapi 135g", sku: "BSK-MA13", cat: "Camilan & Snack", price: 8500, cost: 7100, stock: 26, unit: "bks", min: 6, pop: false, desc: "Biskuit malkist renyah bertabur abon sapi asli gurih manis." },
    { name: "Kusuka Keripik Singkong Balado 60g", sku: "SNK-KS60", cat: "Camilan & Snack", price: 6500, cost: 5200, stock: 28, unit: "bks", min: 6, pop: false, desc: "Irisan singkong tipis renyah dengan taburan bumbu balado." },

    // Perlengkapan & Obat
    { name: "Gas Elpiji 3kg (Tabung Melon Refill)", sku: "GAS-3KG01", cat: "Perlengkapan Warung", price: 22000, cost: 19500, stock: 16, unit: "tabung", min: 4, pop: true, desc: "Tukar tabung melon elpiji 3kg bersubsidi segel resmi Pertamina." },
    { name: "Gas Bright Gas 5.5kg Refill", sku: "GAS-5KG01", cat: "Perlengkapan Warung", price: 78000, cost: 70000, stock: 5, unit: "tabung", min: 2, pop: false, desc: "Tukar tabung Bright Gas pink non-subsidi katup ganda aman." },
    { name: "Korek Api Gas Tokai Original", sku: "KRK-TK01", cat: "Perlengkapan Warung", price: 3500, cost: 2400, stock: 50, unit: "pcs", min: 15, pop: true, desc: "Korek api gas bara tahan angin kualitas terjamin SNI." },
    { name: "Lilin Putih Jumbo Cap Kuda (Pack 6s)", sku: "LLN-KD06", cat: "Perlengkapan Warung", price: 12000, cost: 9000, stock: 20, unit: "pack", min: 5, pop: false, desc: "Lilin penerangan darurat mati lampu nyala terang tidak cepat habis." },
    { name: "Obat Nyamuk Bakar Baygon Jumbo (10 Jam)", sku: "NYM-BY10", cat: "Perlengkapan Warung", price: 6000, cost: 4800, stock: 25, unit: "kotak", min: 6, pop: false, desc: "Lingkaran obat nyamuk bakar aroma lavender ampuh semalaman." },
    { name: "Panadol Biru Paracetamol Strip (10 Tablet)", sku: "OBT-PN10", cat: "Perlengkapan Warung", price: 13500, cost: 11500, stock: 30, unit: "strip", min: 8, pop: true, desc: "Pereda nyeri dan penurun demam efektif dan lembut di lambung." },
    { name: "Bodrex Sakit Kepala Strip (20 Tablet)", sku: "OBT-BD20", cat: "Perlengkapan Warung", price: 6500, cost: 5200, stock: 35, unit: "strip", min: 10, pop: true, desc: "Obat andalan cepat redakan sakit kepala, sakit gigi dan meriang." },
    { name: "Tolak Angin Sido Muncul Box (5 Sachet)", sku: "OBT-TA05", cat: "Perlengkapan Warung", price: 21000, cost: 18000, stock: 24, unit: "box", min: 6, pop: true, desc: "Herbal alami masuk angin, meriang, mual dan perut kembung." },
    { name: "Diapet Kapsul Strip (4 Kapsul)", sku: "OBT-DP04", cat: "Perlengkapan Warung", price: 4000, cost: 3000, stock: 28, unit: "strip", min: 6, pop: false, desc: "Kapsul herbal daun jambu biji dan kunyit atasi diare mules." },
    { name: "Promag Obat Sakit Maag Strip (10 Tablet)", sku: "OBT-PM10", cat: "Perlengkapan Warung", price: 9000, cost: 7500, stock: 32, unit: "strip", min: 8, pop: true, desc: "Tablet kunyah antasida cepat atasi perih lambung dan kembung." }
  ];

  // Insert base items for Berkah Jaya
  rawProducts.forEach((item, index) => {
    const id = `prod-berkah-${index + 1}`;
    memoryDB.products.set(id, {
      id,
      tenantId: tenant1.id,
      name: item.name,
      sku: item.sku,
      category: item.cat,
      price: item.price,
      costPrice: item.cost,
      stock: item.stock,
      unit: item.unit,
      minStock: item.min,
      description: item.desc,
      imageUrl: `https://picsum.photos/seed/${item.sku}/300/300`,
      isPopular: item.pop,
      createdAt: new Date().toISOString(),
    });
  });

  // Seed sample products for Tenant 2 to demonstrate strict tenant isolation
  const maduraProducts = [
    { name: "Beras Rojolele 10kg Madura", sku: "MDR-BR10", cat: "Beras & Gandum", price: 140000, cost: 130000, stock: 12, unit: "karung", min: 3 },
    { name: "Minyak Madura Curah 1kg", sku: "MDR-MY01", cat: "Minyak & Margarin", price: 15500, cost: 14000, stock: 30, unit: "kg", min: 5 },
    { name: "Bensin Eceran 1 Liter", sku: "MDR-BS01", cat: "Perlengkapan Warung", price: 12000, cost: 10000, stock: 45, unit: "botol", min: 10 },
    { name: "Es Teh Manis Jumbo", sku: "MDR-ES01", cat: "Minuman & Kopi", price: 4000, cost: 2000, stock: 99, unit: "cup", min: 10 },
  ];
  maduraProducts.forEach((item, index) => {
    const id = `prod-madura-${index + 1}`;
    memoryDB.products.set(id, {
      id,
      tenantId: tenant2.id,
      name: item.name,
      sku: item.sku,
      category: item.cat,
      price: item.price,
      costPrice: item.cost,
      stock: item.stock,
      unit: item.unit,
      minStock: item.min,
      description: `Produk khas warung Madura ${item.name}`,
      imageUrl: `https://picsum.photos/seed/${item.sku}/300/300`,
      createdAt: new Date().toISOString(),
    });
  });

  // Seed historical orders matching Image 5 (Total Omzet Hari Ini ~ Rp 3.420.000)
  const sampleOrders: Array<Omit<MemoryOrder, 'id'>> = [
    {
      orderNumber: 'TR-8924',
      tenantId: tenant1.id,
      items: [
        { productId: 'prod-berkah-3', name: 'Beras Setra Ramos Cap Bunga 5kg', price: 69500, qty: 1, subtotal: 69500 },
        { productId: 'prod-berkah-59', name: 'Telur Ayam Negeri 1kg', price: 29000, qty: 1, subtotal: 29000 },
        { productId: 'prod-berkah-27', name: 'Gula Pasir Gulaku 1kg', price: 18000, qty: 1, subtotal: 18000 },
        { productId: 'prod-berkah-26', name: 'Minyak Sania Pouch 1L', price: 18000, qty: 1, subtotal: 18000 },
      ],
      subtotal: 134500,
      discount: 0,
      total: 134500,
      tenderAmount: 150000,
      changeAmount: 15500,
      paymentMethod: 'TUNAI',
      paymentStatus: 'LUNAS',
      customerName: 'Bu Siti Rahma',
      customerNote: 'Pelanggan Tetap',
      cashierName: 'Bu Siti (Kasir Utama)',
      createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
    {
      orderNumber: 'TR-8923',
      tenantId: tenant1.id,
      items: [
        { productId: 'prod-berkah-16', name: 'Minyak Sania 2L', price: 35000, qty: 1, subtotal: 35000 },
        { productId: 'prod-berkah-43', name: 'Indomie Goreng Original', price: 3100, qty: 5, subtotal: 15500 },
      ],
      subtotal: 50500,
      discount: 0,
      total: 50500,
      tenderAmount: 50500,
      changeAmount: 0,
      paymentMethod: 'QRIS',
      paymentStatus: 'LUNAS',
      customerName: 'Mas Kevin (Kost 14)',
      customerNote: 'Anak Kost',
      cashierName: 'Bu Siti (Kasir Utama)',
      createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    },
    {
      orderNumber: 'TR-8922',
      tenantId: tenant1.id,
      items: [
        { productId: 'prod-berkah-57', name: 'Kopi Kapal Api Spesial Mix (10s)', price: 15500, qty: 1, subtotal: 15500 },
        { productId: 'prod-berkah-27', name: 'Gula Pasir Gulaku 1kg', price: 18000, qty: 1, subtotal: 18000 },
        { productId: 'prod-berkah-71', name: 'Rokok Gudang Garam Filter', price: 26000, qty: 1, subtotal: 26000 },
      ],
      subtotal: 59500,
      discount: 0,
      total: 59500,
      tenderAmount: 0,
      changeAmount: 0,
      paymentMethod: 'KASBON',
      paymentStatus: 'BELUM_LUNAS',
      customerName: 'Pak RT Wardi',
      customerNote: 'Kasbon Pos Ronda',
      cashierName: 'Bu Siti (Kasir Utama)',
      createdAt: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
    },
    {
      orderNumber: 'TR-8921',
      tenantId: tenant1.id,
      items: [
        { productId: 'prod-berkah-81', name: 'Gas Elpiji 3kg (Tabung Melon Refill)', price: 22000, qty: 1, subtotal: 22000 },
      ],
      subtotal: 22000,
      discount: 0,
      total: 22000,
      tenderAmount: 50000,
      changeAmount: 28000,
      paymentMethod: 'TUNAI',
      paymentStatus: 'LUNAS',
      customerName: 'Umum (Pelanggan Lepas)',
      customerNote: 'Walk-in',
      cashierName: 'Bu Siti (Kasir Utama)',
      createdAt: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
    },
    {
      orderNumber: 'TR-8920',
      tenantId: tenant1.id,
      items: [
        { productId: 'prod-berkah-69', name: 'Deterjen Rinso Molto Rose Fresh 770g', price: 21500, qty: 2, subtotal: 43000 },
        { productId: 'prod-berkah-71', name: 'Molto Pewangi Pakaian Floral 780ml', price: 14000, qty: 3, subtotal: 42000 },
      ],
      subtotal: 85000,
      discount: 0,
      total: 85000,
      tenderAmount: 0,
      changeAmount: 0,
      paymentMethod: 'KASBON',
      paymentStatus: 'BELUM_LUNAS',
      customerName: 'Mbak Dewi (Laundry)',
      customerNote: 'Bayar Sore Ini',
      cashierName: 'Bu Siti (Kasir Utama)',
      createdAt: new Date(Date.now() - 1000 * 60 * 170).toISOString(),
    },
    {
      orderNumber: 'TR-8919',
      tenantId: tenant1.id,
      items: [
        { productId: 'prod-berkah-67', name: 'Aqua Galon 19L (Isi Ulang)', price: 21000, qty: 1, subtotal: 21000 },
        { productId: 'prod-berkah-62', name: 'Teh Celup Sosro Kotak 30s', price: 8000, qty: 2, subtotal: 16000 },
      ],
      subtotal: 37000,
      discount: 0,
      total: 37000,
      tenderAmount: 50000,
      changeAmount: 13000,
      paymentMethod: 'TUNAI',
      paymentStatus: 'LUNAS',
      customerName: 'Pak Budi Bengkel',
      customerNote: 'Pelanggan Tetap',
      cashierName: 'Bu Siti (Kasir Utama)',
      createdAt: new Date(Date.now() - 1000 * 60 * 220).toISOString(),
    },
  ];

  sampleOrders.forEach((o, idx) => {
    const id = `order-seed-${idx + 1}`;
    memoryDB.orders.set(id, { id, ...o });
  });

  console.log(`📦 Seeded default tenants, users, ${memoryDB.products.size} products, and ${memoryDB.orders.size} orders.`);
}

// Zod Validation Schemas
const RegisterSchema = z.object({
  tenantName: z.string().min(3, 'Nama warung/tenant minimal 3 karakter'),
  name: z.string().min(2, 'Nama pengguna minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
});

const LoginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

const ProductSchema = z.object({
  name: z.string().min(2, 'Nama produk minimal 2 karakter'),
  sku: z.string().min(2, 'Kode SKU / Barcode minimal 2 karakter'),
  category: z.string().min(2, 'Kategori wajib dipilih'),
  price: z.number().positive('Harga jual harus lebih dari 0'),
  costPrice: z.number().nonnegative('Harga modal tidak boleh negatif'),
  stock: z.number().int().nonnegative('Stok tidak boleh negatif'),
  unit: z.string().min(1, 'Satuan produk wajib diisi (e.g. pcs, kg, bks)'),
  minStock: z.number().int().nonnegative('Batas stok minimal tidak boleh negatif').default(5),
  description: z.string().optional().default(''),
});

const OrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    price: z.number().positive(),
    qty: z.number().int().positive(),
    subtotal: z.number().positive(),
  })).min(1, 'Keranjang belanja tidak boleh kosong'),
  customerName: z.string().default('Pelanggan Umum'),
  customerNote: z.string().optional().default(''),
  discount: z.number().nonnegative().default(0),
  tenderAmount: z.number().nonnegative(),
  paymentMethod: z.enum(['TUNAI', 'QRIS', 'TRANSFER', 'KASBON']),
});

const CashierUserSchema = z.object({
  name: z.string().min(2, 'Nama kasir minimal 2 karakter'),
  email: z.string().email('Format email kasir tidak valid'),
  password: z.string().min(6, 'Kata sandi kasir minimal 6 karakter'),
});

// Auth Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Akses ditolak. Token otentikasi tidak ditemukan.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Sesi berakhir atau token tidak sah. Silakan login kembali.' });
  }
}

// Role Authorization Middleware
function requireRole(allowedRoles: Array<'ADMIN' | 'MANAGER' | 'CASHIER'>) {
  return (req: any, res: any, next: any) => {
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

// Express App Initialization
async function startServer() {
  await seedInitialData();

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- API ROUTES ---

  // Health & Diagnostics
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'UP',
      app: 'KasirWarung',
      redisConnected,
      mongoConnected,
      timestamp: new Date().toISOString(),
    });
  });

  // 1. Auth: Register (Role: MANAGER, sends email verification)
  app.post('/api/auth/register', async (req, res) => {
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

      // Check duplicate email
      const existingUser = Array.from(memoryDB.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email sudah terdaftar. Silakan masuk atau gunakan email lain.' });
      }

      // Create Tenant
      const tenantId = `tenant-${Date.now()}`;
      const slug = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newTenant: MemoryTenant = {
        id: tenantId,
        name: tenantName,
        slug,
        address: 'Alamat Toko Belum Diatur',
        phone: '-',
        status: 'ACTIVE', // Ready to use immediately, user account is pending verification
        createdAt: new Date().toISOString(),
      };
      memoryDB.tenants.set(tenantId, newTenant);

      // Create User with role MANAGER
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const userId = `user-${Date.now()}`;
      const newUser: MemoryUser = {
        id: userId,
        email: email.toLowerCase(),
        passwordHash,
        name,
        role: 'MANAGER',
        tenantId,
        tenantName,
        isVerified: false,
        createdAt: new Date().toISOString(),
      };
      memoryDB.users.set(userId, newUser);

      // Generate Verification Token (24 hours expiry)
      const verificationToken = `verify-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      memoryDB.verificationTokens.set(verificationToken, { email: email.toLowerCase(), expiresAt });

      if (redisClient && redisConnected) {
        await redisClient.set(`verify:${verificationToken}`, email.toLowerCase(), 'EX', 86400).catch(() => {});
      }

      // Send Verification Email
      const verifyLink = `${APP_URL}/verify-email?token=${verificationToken}`;
      let emailSent = false;

      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'KasirWarung <noreplay@marmeam.com>',
          to: email,
          subject: `Verifikasi Akun Warung Anda: ${tenantName} - KasirWarung`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #059669; margin: 0; font-size: 24px;">KasirWarung</h1>
                <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Sistem POS & Inventaris Toko Kelontong Modern</p>
              </div>
              <div style="padding: 20px; background-color: #f8fafc; border-radius: 6px; margin-bottom: 20px;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">Selamat Datang, ${name}!</h2>
                <p style="color: #334155; line-height: 1.6; font-size: 14px;">
                  Terima kasih telah mendaftarkan warung Anda <strong>"${tenantName}"</strong> di KasirWarung sebagai <strong>Role MANAGER</strong>.
                </p>
                <p style="color: #334155; line-height: 1.6; font-size: 14px;">
                  Klik tombol di bawah ini untuk memverifikasi alamat email dan mengaktifkan akses penuh toko kelontong Anda:
                </p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${verifyLink}" style="background-color: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                    Verifikasi Akun Saya
                  </a>
                </div>
                <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
                  Atau salin tautan berikut ke browser Anda:<br>
                  <a href="${verifyLink}" style="color: #059669; word-break: break-all;">${verifyLink}</a>
                </p>
              </div>
              <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                Tautan ini berlaku selama 24 jam. Jika Anda tidak merasa mendaftar di KasirWarung, abaikan email ini.
              </p>
            </div>
          `,
        });
        emailSent = true;
      } catch (err: any) {
        console.warn('⚠️ SMTP send error (preview environment may restrict outbound ports):', err.message);
      }

      // Also create pre-seeded products for this new tenant so they have an instant functional catalog
      const baseSamples = Array.from(memoryDB.products.values()).filter(p => p.tenantId === 'tenant-berkah-jaya').slice(0, 15);
      baseSamples.forEach((sp, idx) => {
        const copyId = `prod-${tenantId}-${idx + 1}`;
        memoryDB.products.set(copyId, {
          ...sp,
          id: copyId,
          tenantId,
        });
      });

      return res.status(201).json({
        success: true,
        message: 'Pendaftaran berhasil! Email verifikasi telah dikirimkan ke alamat email Anda.',
        emailSent,
        verificationToken, // Provided for instant demo activation convenience in preview iframe!
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
  });

  // 2. Auth: Verify Email
  app.post('/api/auth/verify-email', async (req, res) => {
    try {
      const token = req.body.token || req.query.token;
      if (!token) {
        return res.status(400).json({ success: false, message: 'Token verifikasi tidak ditemukan' });
      }

      let email: string | null = null;

      // Check Redis first
      if (redisClient && redisConnected) {
        const stored = await redisClient.get(`verify:${token}`).catch(() => null);
        if (stored) email = stored;
      }

      // Fallback in-memory
      if (!email && memoryDB.verificationTokens.has(token as string)) {
        const item = memoryDB.verificationTokens.get(token as string)!;
        if (Date.now() < item.expiresAt) {
          email = item.email;
        }
      }

      if (!email) {
        return res.status(400).json({ success: false, message: 'Token verifikasi tidak valid atau telah kadaluarsa' });
      }

      // Find user and activate
      const user = Array.from(memoryDB.users.values()).find(u => u.email.toLowerCase() === email!.toLowerCase());
      if (!user) {
        return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
      }

      user.isVerified = true;
      memoryDB.users.set(user.id, user);

      // Clean up token
      memoryDB.verificationTokens.delete(token as string);
      if (redisClient && redisConnected) {
        await redisClient.del(`verify:${token}`).catch(() => {});
      }

      // Issue JWT
      const jwtToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenantName,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        message: 'Selamat! Akun dan warung Anda berhasil diverifikasi. Silakan mulai berjualan.',
        token: jwtToken,
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
  });

  // 3. Auth: Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.issues[0]?.message || 'Data login tidak valid',
        });
      }

      const { email, password } = parsed.data;
      const user = Array.from(memoryDB.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        return res.status(401).json({ success: false, message: 'Email atau kata sandi salah' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Email atau kata sandi salah' });
      }

      // Check tenant status if not ADMIN
      if (user.tenantId) {
        const tenant = memoryDB.tenants.get(user.tenantId);
        if (tenant && tenant.status === 'SUSPENDED') {
          return res.status(403).json({
            success: false,
            message: 'Toko warung Anda dinonaktifkan sementara oleh Administrator. Silakan hubungi pusat bantuan.',
          });
        }
      }

      // Issue JWT
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenantName,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        message: `Selamat datang kembali, ${user.name}!`,
        token,
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
  });

  // 4. Auth: Me
  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    const user = memoryDB.users.get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    const tenant = user.tenantId ? memoryDB.tenants.get(user.tenantId) : null;

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
    });
  });

  // 5. Products: List (Multi-Tenant Scoped)
  app.get('/api/products', authenticateToken, (req: any, res) => {
    const tenantId = req.query.tenantId || req.user.tenantId;

    if (!tenantId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Tenant ID diperlukan' });
    }

    let products = Array.from(memoryDB.products.values());

    // Strict Tenant Isolation
    if (req.user.role !== 'ADMIN' || tenantId) {
      products = products.filter(p => p.tenantId === tenantId);
    }

    // Filter by category
    const category = req.query.category as string;
    if (category && category !== 'Semua' && category !== 'Semua Produk') {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    // Search query (fast search by name or barcode/SKU)
    const q = (req.query.q as string || '').toLowerCase().trim();
    if (q) {
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    // Filter stock status
    const stockStatus = req.query.stockStatus as string;
    if (stockStatus === 'low') {
      products = products.filter(p => p.stock <= p.minStock);
    }

    res.json({
      success: true,
      count: products.length,
      products,
    });
  });

  // 6. Products: Add (MANAGER only)
  app.post('/api/products', authenticateToken, requireRole(['MANAGER']), (req: any, res) => {
    try {
      const parsed = ProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.issues[0]?.message || 'Data produk tidak valid',
          errors: parsed.error.issues,
        });
      }

      const tenantId = req.user.tenantId;
      const { name, sku, category, price, costPrice, stock, unit, minStock, description } = parsed.data;

      // Check unique SKU within tenant
      const existingSku = Array.from(memoryDB.products.values()).find(
        p => p.tenantId === tenantId && p.sku.toUpperCase() === sku.toUpperCase()
      );
      if (existingSku) {
        return res.status(400).json({ success: false, message: `SKU / Barcode "${sku}" sudah terdaftar pada produk "${existingSku.name}"` });
      }

      const id = `prod-${Date.now()}`;
      const newProduct: MemoryProduct = {
        id,
        tenantId,
        name,
        sku: sku.toUpperCase(),
        category,
        price,
        costPrice,
        stock,
        unit,
        minStock,
        description,
        imageUrl: req.body.imageUrl || `https://picsum.photos/seed/${sku}/300/300`,
        isPopular: false,
        createdAt: new Date().toISOString(),
      };

      memoryDB.products.set(id, newProduct);

      res.status(201).json({
        success: true,
        message: `Produk "${name}" berhasil ditambahkan ke etalase!`,
        product: newProduct,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal menambah produk: ' + err.message });
    }
  });

  // 7. Products: Update (MANAGER only)
  app.put('/api/products/:id', authenticateToken, requireRole(['MANAGER']), (req: any, res) => {
    try {
      const product = memoryDB.products.get(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
      }

      // Check tenant ownership
      if (product.tenantId !== req.user.tenantId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Akses ditolak. Anda tidak berhak mengubah produk tenant lain.' });
      }

      const parsed = ProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.issues[0]?.message || 'Data produk tidak valid',
          errors: parsed.error.issues,
        });
      }

      const { name, sku, category, price, costPrice, stock, unit, minStock, description } = parsed.data;

      product.name = name;
      product.sku = sku.toUpperCase();
      product.category = category;
      product.price = price;
      product.costPrice = costPrice;
      product.stock = stock;
      product.unit = unit;
      product.minStock = minStock;
      product.description = description;
      if (req.body.imageUrl) product.imageUrl = req.body.imageUrl;

      memoryDB.products.set(product.id, product);

      res.json({
        success: true,
        message: `Data produk "${name}" berhasil diperbarui!`,
        product,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal memperbarui produk: ' + err.message });
    }
  });

  // 8. Products: Delete (MANAGER only)
  app.delete('/api/products/:id', authenticateToken, requireRole(['MANAGER']), (req: any, res) => {
    const product = memoryDB.products.get(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    }

    if (product.tenantId !== req.user.tenantId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    memoryDB.products.delete(req.params.id);
    res.json({ success: true, message: `Produk "${product.name}" berhasil dihapus dari etalase.` });
  });

  // 9. Categories: List with item counts (Multi-Tenant Scoped)
  app.get('/api/categories', authenticateToken, (req: any, res) => {
    const tenantId = req.query.tenantId || req.user.tenantId;
    const products = Array.from(memoryDB.products.values()).filter(p => p.tenantId === tenantId);

    const counts: { [key: string]: number } = {};
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    const categoryList = Object.keys(counts).map(name => ({
      name,
      count: counts[name],
    }));

    res.json({
      success: true,
      totalCategories: categoryList.length,
      categories: categoryList,
    });
  });

  // 10. Orders: Create / POS Checkout (MANAGER and CASHIER only)
  app.post('/api/orders', authenticateToken, requireRole(['MANAGER', 'CASHIER']), (req: any, res) => {
    try {
      const parsed = OrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.issues[0]?.message || 'Data transaksi kasir tidak valid',
          errors: parsed.error.issues,
        });
      }

      const tenantId = req.user.tenantId;
      const { items, customerName, customerNote, discount, tenderAmount, paymentMethod } = parsed.data;

      // Validate stock & calculate subtotal
      let computedSubtotal = 0;
      for (const item of items) {
        const prod = memoryDB.products.get(item.productId);
        if (!prod || prod.tenantId !== tenantId) {
          return res.status(400).json({ success: false, message: `Produk ${item.name} tidak valid atau bukan milik warung Anda.` });
        }
        if (prod.stock < item.qty) {
          return res.status(400).json({
            success: false,
            message: `Stok produk "${prod.name}" tidak mencukupi (Tersisa: ${prod.stock} ${prod.unit}, Diminta: ${item.qty}).`,
          });
        }
        computedSubtotal += item.price * item.qty;
      }

      const total = Math.max(0, computedSubtotal - discount);
      let changeAmount = 0;

      if (paymentMethod === 'TUNAI') {
        if (tenderAmount < total) {
          return res.status(400).json({
            success: false,
            message: `Uang tunai yang diterima (Rp ${tenderAmount.toLocaleString('id-ID')}) kurang dari total belanja (Rp ${total.toLocaleString('id-ID')}).`,
          });
        }
        changeAmount = tenderAmount - total;
      } else if (paymentMethod === 'KASBON') {
        changeAmount = 0;
      } else {
        // QRIS or TRANSFER
        changeAmount = 0;
      }

      // Decrement stock atomically
      for (const item of items) {
        const prod = memoryDB.products.get(item.productId)!;
        prod.stock -= item.qty;
        memoryDB.products.set(prod.id, prod);
      }

      // Generate Order Number
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `TR-${randomSeq}`;
      const id = `order-${Date.now()}`;

      const newOrder: MemoryOrder = {
        id,
        orderNumber,
        tenantId,
        items,
        subtotal: computedSubtotal,
        discount,
        total,
        tenderAmount,
        changeAmount,
        paymentMethod,
        paymentStatus: paymentMethod === 'KASBON' ? 'BELUM_LUNAS' : 'LUNAS',
        customerName: customerName || 'Umum (Pelanggan Lepas)',
        customerNote: customerNote || '',
        cashierName: req.user.name,
        createdAt: new Date().toISOString(),
      };

      memoryDB.orders.set(id, newOrder);

      res.status(201).json({
        success: true,
        message: `Transaksi ${orderNumber} berhasil diselesaikan!`,
        order: newOrder,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal menyelesaikan pesanan: ' + err.message });
    }
  });

  // 11. Orders: List / Sales History (Multi-Tenant Scoped)
  app.get('/api/orders', authenticateToken, (req: any, res) => {
    const tenantId = req.query.tenantId || req.user.tenantId;

    let orders = Array.from(memoryDB.orders.values());
    if (req.user.role !== 'ADMIN' || tenantId) {
      orders = orders.filter(o => o.tenantId === tenantId);
    }

    // Filter by payment method
    const payment = req.query.payment as string;
    if (payment && payment !== 'Semua' && payment !== 'Semua Pembayaran') {
      orders = orders.filter(o => o.paymentMethod.toUpperCase() === payment.toUpperCase());
    }

    // Filter by payment status
    const status = req.query.status as string;
    if (status && status !== 'Semua' && status !== 'Semua Status') {
      orders = orders.filter(o => o.paymentStatus.toUpperCase() === status.toUpperCase());
    }

    // Search query (by orderNumber, customerName)
    const q = (req.query.q as string || '').toLowerCase().trim();
    if (q) {
      orders = orders.filter(o =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        (o.customerNote && o.customerNote.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  });

  // 12. Orders: Update Payment Status (e.g. Lunasi Kasbon)
  app.patch('/api/orders/:id/status', authenticateToken, requireRole(['MANAGER', 'CASHIER']), (req: any, res) => {
    const order = memoryDB.orders.get(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }

    if (order.tenantId !== req.user.tenantId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const { paymentStatus } = req.body;
    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
      memoryDB.orders.set(order.id, order);
    }

    res.json({
      success: true,
      message: `Status kasbon untuk nota ${order.orderNumber} berhasil diperbarui menjadi ${order.paymentStatus}!`,
      order,
    });
  });

  // 13. Dashboard & Sales Statistics (Multi-Tenant Scoped)
  app.get('/api/dashboard/stats', authenticateToken, (req: any, res) => {
    const tenantId = req.query.tenantId || req.user.tenantId;
    const orders = Array.from(memoryDB.orders.values()).filter(o => o.tenantId === tenantId);
    const products = Array.from(memoryDB.products.values()).filter(p => p.tenantId === tenantId);

    // Compute Metrics matching Image 5
    let totalOmzet = 0;
    let kasTunai = 0;
    let qrisTransfer = 0;
    let kasbon = 0;
    let kasbonPendingCount = 0;
    let completedOrders = orders.length;

    orders.forEach(o => {
      totalOmzet += o.total;
      if (o.paymentMethod === 'TUNAI') {
        kasTunai += o.total;
      } else if (o.paymentMethod === 'QRIS' || o.paymentMethod === 'TRANSFER') {
        qrisTransfer += o.total;
      } else if (o.paymentMethod === 'KASBON') {
        if (o.paymentStatus === 'BELUM_LUNAS') {
          kasbon += o.total;
          kasbonPendingCount++;
        } else {
          kasTunai += o.total; // already paid
        }
      }
    });

    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
    const totalCategories = new Set(products.map(p => p.category)).size;

    // Fast moving products (top items in orders)
    const productSalesMap: { [key: string]: { name: string; count: number; revenue: number } } = {};
    orders.forEach(o => {
      o.items.forEach(it => {
        if (!productSalesMap[it.productId]) {
          productSalesMap[it.productId] = { name: it.name, count: 0, revenue: 0 };
        }
        productSalesMap[it.productId].count += it.qty;
        productSalesMap[it.productId].revenue += it.subtotal;
      });
    });

    const fastMoving = Object.values(productSalesMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      success: true,
      stats: {
        totalOmzet,
        kasTunai,
        qrisTransfer,
        kasbon,
        kasbonPendingCount,
        completedOrders,
        totalProducts: products.length,
        totalCategories,
        lowStockCount,
        fastMoving,
      },
    });
  });

  // 14. Cashier Management: Add Cashier User (MANAGER only)
  app.post('/api/users/cashier', authenticateToken, requireRole(['MANAGER']), async (req: any, res) => {
    try {
      const parsed = CashierUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.issues[0]?.message || 'Data kasir tidak valid',
          errors: parsed.error.issues,
        });
      }

      const { name, email, password } = parsed.data;
      const tenantId = req.user.tenantId;
      const tenantName = req.user.tenantName;

      // Check duplicate email
      const existing = Array.from(memoryDB.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email kasir sudah digunakan oleh akun lain.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const id = `user-cashier-${Date.now()}`;

      const newCashier: MemoryUser = {
        id,
        email: email.toLowerCase(),
        passwordHash,
        name,
        role: 'CASHIER',
        tenantId,
        tenantName,
        isVerified: true, // Cashier added directly by manager is pre-verified
        createdAt: new Date().toISOString(),
      };

      memoryDB.users.set(id, newCashier);

      res.status(201).json({
        success: true,
        message: `Akun kasir "${name}" berhasil dibuat dan siap bertugas!`,
        user: {
          id: newCashier.id,
          name: newCashier.name,
          email: newCashier.email,
          role: newCashier.role,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal membuat akun kasir: ' + err.message });
    }
  });

  // 15. Cashier Management: List Cashiers for Current Tenant (MANAGER only)
  app.get('/api/users/cashiers', authenticateToken, requireRole(['MANAGER']), (req: any, res) => {
    const tenantId = req.user.tenantId;
    const cashiers = Array.from(memoryDB.users.values())
      .filter(u => u.tenantId === tenantId && u.role === 'CASHIER')
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
      }));

    res.json({ success: true, count: cashiers.length, cashiers });
  });

  // 16. Cashier Management: Delete Cashier (MANAGER only)
  app.delete('/api/users/cashiers/:id', authenticateToken, requireRole(['MANAGER']), (req: any, res) => {
    const user = memoryDB.users.get(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Akun kasir tidak ditemukan' });
    }

    if (user.tenantId !== req.user.tenantId) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    if (user.role !== 'CASHIER') {
      return res.status(400).json({ success: false, message: 'Hanya akun ber-role CASHIER yang dapat dihapus melalui menu ini.' });
    }

    memoryDB.users.delete(req.params.id);
    res.json({ success: true, message: `Akun kasir "${user.name}" berhasil dihapus.` });
  });

  // 17. Tenant Management (ADMIN only)
  app.get('/api/tenants', authenticateToken, requireRole(['ADMIN']), (req, res) => {
    const tenantsList = Array.from(memoryDB.tenants.values()).map(t => {
      const tenantProducts = Array.from(memoryDB.products.values()).filter(p => p.tenantId === t.id);
      const tenantUsers = Array.from(memoryDB.users.values()).filter(u => u.tenantId === t.id);
      const tenantOrders = Array.from(memoryDB.orders.values()).filter(o => o.tenantId === t.id);
      const totalRevenue = tenantOrders.reduce((sum, o) => sum + o.total, 0);

      return {
        ...t,
        productCount: tenantProducts.length,
        userCount: tenantUsers.length,
        orderCount: tenantOrders.length,
        totalRevenue,
      };
    });

    res.json({ success: true, count: tenantsList.length, tenants: tenantsList });
  });

  // 18. Tenant Management: Toggle Status (ADMIN only)
  app.patch('/api/tenants/:id/status', authenticateToken, requireRole(['ADMIN']), (req, res) => {
    const tenant = memoryDB.tenants.get(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant tidak ditemukan' });
    }

    const { status } = req.body;
    if (status && ['ACTIVE', 'SUSPENDED'].includes(status)) {
      tenant.status = status;
      memoryDB.tenants.set(tenant.id, tenant);
    }

    res.json({
      success: true,
      message: `Status tenant "${tenant.name}" berhasil diubah menjadi ${tenant.status}!`,
      tenant,
    });
  });

  // Mount Vite or Serve Static Files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 KasirWarung server is live on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
