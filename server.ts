import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { Redis } from 'ioredis';
import { MongoClient, Db, Collection } from 'mongodb';
import { z } from 'zod';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'kasirwarung-jwt-supersecret-2026';
const REDIS_URL = process.env.REDIS_URL || '';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ferrylinton:ferry27071983@myatlasdb.7wiaa0e.mongodb.net/kasirwarungdb?appName=MyAtlasDb';
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// Database & Collection References
let mongoClient: MongoClient | null = null;
let db: Db | null = null;
let tenantsCol: Collection<any>;
let usersCol: Collection<any>;
let productsCol: Collection<any>;
let ordersCol: Collection<any>;
let tokensCol: Collection<any>;
let isMongoLive = false;

// Redis Client
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
      console.log('✅ Connected to Upstash Redis');
    }).catch((err) => {
      console.warn('⚠️ Upstash Redis connection error:', err.message);
      redisConnected = false;
    });

    redisClient.on('error', () => {
      redisConnected = false;
    });
  } catch (err) {
    console.warn('⚠️ Redis initialization error');
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

// Connect to MongoDB Atlas and Seed Initial Data
async function initMongoDB() {
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    mongoClient = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 6000,
    });
    await mongoClient.connect();
    db = mongoClient.db('kasirwarungdb');
    tenantsCol = db.collection('tenants');
    usersCol = db.collection('users');
    productsCol = db.collection('products');
    ordersCol = db.collection('orders');
    tokensCol = db.collection('tokens');

    // Create Indexes
    await tenantsCol.createIndex({ slug: 1 }, { unique: true }).catch(() => {});
    await usersCol.createIndex({ email: 1 }, { unique: true }).catch(() => {});
    await productsCol.createIndex({ tenantId: 1, sku: 1 }, { unique: true }).catch(() => {});
    await productsCol.createIndex({ tenantId: 1, category: 1 }).catch(() => {});
    await ordersCol.createIndex({ tenantId: 1, createdAt: -1 }).catch(() => {});

    isMongoLive = true;
    console.log('✅ Connected to MongoDB Atlas (kasirwarungdb) successfully!');

    // Check if initial seeding is needed
    const tenantCount = await tenantsCol.countDocuments();
    if (tenantCount === 0) {
      console.log('🌱 Seeding initial data to MongoDB Atlas...');
      await seedMongoData();
    } else {
      console.log(`📊 Found ${tenantCount} existing tenants in MongoDB Atlas.`);
    }
  } catch (err: any) {
    console.error('❌ MongoDB Atlas connection error:', err.message);
    isMongoLive = false;
  }
}

async function seedMongoData() {
  const salt = await bcrypt.genSalt(10);
  const passwordAdmin = await bcrypt.hash('Admin123!', salt);
  const passwordManager = await bcrypt.hash('Manager123!', salt);
  const passwordKasir = await bcrypt.hash('Kasir123!', salt);

  // Tenant 1: Berkah Jaya
  const tenant1 = {
    id: 'tenant-berkah-jaya',
    name: 'Berkah Jaya',
    slug: 'berkah-jaya',
    address: 'Jl. Merdeka No. 42, RT 02/05 Pasar Anyar',
    phone: '0812-3456-7890',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  // Tenant 2: Warung Madura 24 Jam
  const tenant2 = {
    id: 'tenant-madura-24jam',
    name: 'Warung Madura 24 Jam',
    slug: 'madura-24jam',
    address: 'Jl. Pemuda Raya No. 88, Cibubur',
    phone: '0877-9876-5432',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  await tenantsCol.insertMany([tenant1, tenant2]);

  // Seed Users
  const users = [
    {
      id: 'user-admin-1',
      email: 'admin@kasirwarung.com',
      passwordHash: passwordAdmin,
      name: 'Super Admin KasirWarung',
      role: 'ADMIN',
      tenantId: null,
      tenantName: null,
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-manager-1',
      email: 'manager@berkahjaya.com',
      passwordHash: passwordManager,
      name: 'Bu Siti Rahma',
      role: 'MANAGER',
      tenantId: tenant1.id,
      tenantName: tenant1.name,
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-cashier-1',
      email: 'kasir@berkahjaya.com',
      passwordHash: passwordKasir,
      name: 'Bu Siti (Kasir Utama)',
      role: 'CASHIER',
      tenantId: tenant1.id,
      tenantName: tenant1.name,
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-manager-2',
      email: 'cak.holil@madura24.com',
      passwordHash: passwordManager,
      name: 'Cak Holil (Owner)',
      role: 'MANAGER',
      tenantId: tenant2.id,
      tenantName: tenant2.name,
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
  ];
  await usersCol.insertMany(users);

  // 104 Realistic Indonesian Kelontong Sembako Products
  const rawProducts = [
    // Beras & Gandum (14)
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

    // Minyak & Margarin (12)
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

    // Bumbu Dapur (18)
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

    // Mie & Makanan Instan (16)
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

    // Minuman & Kopi (18)
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

    // Sembako Segar & Telur (8)
    { name: "Telur Ayam Negeri 1kg", sku: "TLR-AY01", cat: "Sembako Segar", price: 29000, cost: 26000, stock: 15, unit: "kg", min: 5, pop: true, desc: "Kualitas segar grade A (isi sekitar 16 butir per kg) cangkang cokelat tebal." },
    { name: "Telur Ayam 1/2 kg (±8 butir)", sku: "TLR-AY05", cat: "Sembako Segar", price: 15000, cost: 13200, stock: 14, unit: "kg", min: 4, pop: true, desc: "Kemasan hemat setengah kilogram isi 8 butir telur segar." },
    { name: "Telur Bebek Asin Matang (1 butir)", sku: "TLR-BB01", cat: "Sembako Segar", price: 4500, cost: 3600, stock: 35, unit: "butir", min: 10, pop: false, desc: "Telur asin Brebes masir berminyak gurih nikmat siap santap." },
    { name: "Bawang Merah Brebes 500g", sku: "BWG-MR05", cat: "Sembako Segar", price: 18000, cost: 15000, stock: 12, unit: "bks", min: 4, pop: true, desc: "Bawang merah super kering aroma tajam wangi sedap." },
    { name: "Bawang Putih Kating 500g", sku: "BWG-PT05", cat: "Sembako Segar", price: 21000, cost: 18000, stock: 10, unit: "bks", min: 3, pop: false, desc: "Bawang putih kating siung bulat besar wangi kuat untuk bumbu." },
    { name: "Cabe Rawit Merah (Jablay) 250g", sku: "CBE-RW25", cat: "Sembako Segar", price: 15000, cost: 12500, stock: 8, unit: "bks", min: 3, pop: false, desc: "Cabe rawit merah petik segar pedas menggigit." },
    { name: "Cabe Merah Keriting 250g", sku: "CBE-KR25", cat: "Sembako Segar", price: 12000, cost: 9800, stock: 9, unit: "bks", min: 3, pop: false, desc: "Cabe merah keriting segar merah merona pewarna alami." },
    { name: "Kentang Dieng Segar 1kg", sku: "KTG-DG01", cat: "Sembako Segar", price: 19000, cost: 16000, stock: 11, unit: "kg", min: 3, pop: false, desc: "Kentang Dieng umbi kuning padat tidak berair untuk perkedel." },

    // Kebersihan & Rumah Tangga (14)
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

    // Camilan & Snack (12)
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

    // Perlengkapan & Obat (10)
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

  const productsToInsert = rawProducts.map((p, idx) => ({
    id: `prod-berkah-${idx + 1}`,
    tenantId: tenant1.id,
    name: p.name,
    sku: p.sku,
    category: p.cat,
    price: p.price,
    costPrice: p.cost,
    stock: p.stock,
    unit: p.unit,
    minStock: p.min,
    description: p.desc,
    imageUrl: `https://picsum.photos/seed/${p.sku}/300/300`,
    isPopular: p.pop,
    createdAt: new Date().toISOString(),
  }));

  // Add sample products for Tenant 2 to demonstrate multi-tenant data safety
  const tenant2Products = [
    { id: 'prod-madura-1', tenantId: tenant2.id, name: "Beras Rojolele 10kg Madura", sku: "MDR-BR10", category: "Beras & Gandum", price: 140000, costPrice: 130000, stock: 12, unit: "karung", minStock: 3, description: "Beras pulen karung 10kg khas warung Madura.", imageUrl: "https://picsum.photos/seed/MDR-BR10/300/300", createdAt: new Date().toISOString() },
    { id: 'prod-madura-2', tenantId: tenant2.id, name: "Minyak Madura Curah 1kg", sku: "MDR-MY01", category: "Minyak & Margarin", price: 15500, costPrice: 14000, stock: 30, unit: "kg", minStock: 5, description: "Minyak curah plastik 1kg.", imageUrl: "https://picsum.photos/seed/MDR-MY01/300/300", createdAt: new Date().toISOString() },
    { id: 'prod-madura-3', tenantId: tenant2.id, name: "Bensin Eceran 1 Liter", sku: "MDR-BS01", category: "Perlengkapan Warung", price: 12000, costPrice: 10000, stock: 45, unit: "botol", minStock: 10, description: "Bensin eceran botol kaca.", imageUrl: "https://picsum.photos/seed/MDR-BS01/300/300", createdAt: new Date().toISOString() },
    { id: 'prod-madura-4', tenantId: tenant2.id, name: "Es Teh Manis Jumbo", sku: "MDR-ES01", category: "Minuman & Kopi", price: 4000, costPrice: 2000, stock: 99, unit: "cup", minStock: 10, description: "Es teh manis segar cup jumbo.", imageUrl: "https://picsum.photos/seed/MDR-ES01/300/300", createdAt: new Date().toISOString() },
  ];

  await productsCol.insertMany([...productsToInsert, ...tenant2Products]);

  // Seed sample initial orders matching Image 5
  const sampleOrders = [
    {
      id: 'order-seed-1',
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
      id: 'order-seed-2',
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
      id: 'order-seed-3',
      orderNumber: 'TR-8922',
      tenantId: tenant1.id,
      items: [
        { productId: 'prod-berkah-57', name: 'Kopi Kapal Api Spesial Mix (10s)', price: 15500, qty: 1, subtotal: 15500 },
        { productId: 'prod-berkah-27', name: 'Gula Pasir Gulaku 1kg', price: 18000, qty: 1, subtotal: 18000 },
      ],
      subtotal: 33500,
      discount: 0,
      total: 33500,
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
      id: 'order-seed-4',
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
      id: 'order-seed-5',
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
      id: 'order-seed-6',
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

  await ordersCol.insertMany(sampleOrders);
  console.log(`✅ Seeded ${productsToInsert.length} products and initial orders to MongoDB Atlas.`);
}

async function startServer() {
  await initMongoDB();

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health Diagnostics
  app.get('/api/health', async (req, res) => {
    let mongoLive = false;
    let collections: string[] = [];
    if (db) {
      try {
        const cols = await db.listCollections().toArray();
        collections = cols.map(c => c.name);
        mongoLive = true;
      } catch (e) {
        mongoLive = false;
      }
    }

    res.json({
      status: 'UP',
      app: 'KasirWarung',
      database: 'MongoDB Atlas',
      mongoConnected: mongoLive,
      redisConnected,
      collections,
      timestamp: new Date().toISOString(),
    });
  });

  // 1. Auth: Register (Creates Tenant & Manager in MongoDB)
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
        tenantId,
        tenantName,
        isVerified: false,
        createdAt: new Date().toISOString(),
      };
      await usersCol.insertOne(newUser);

      // Verification Token
      const verificationToken = `verify-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await tokensCol.insertOne({
        token: verificationToken,
        email: email.toLowerCase(),
        expiresAt,
      });

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
          subject: `Verifikasi Akun Warung: ${tenantName} - KasirWarung`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #059669;">KasirWarung</h2>
              <h3>Selamat Datang, ${name}!</h3>
              <p>Terima kasih telah mendaftarkan warung Anda <strong>"${tenantName}"</strong> sebagai <strong>Role MANAGER</strong>.</p>
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
        emailSent = true;
      } catch (err: any) {
        console.warn('⚠️ SMTP send error:', err.message);
      }

      // Seed 15 initial products for this new tenant in MongoDB
      const baseSamples = await productsCol.find({ tenantId: 'tenant-berkah-jaya' }).limit(15).toArray();
      if (baseSamples.length > 0) {
        const tenantProducts = baseSamples.map((p, idx) => ({
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
  });

  // 2. Auth: Verify Email in MongoDB
  app.post('/api/auth/verify-email', async (req, res) => {
    try {
      const token = req.body.token || req.query.token;
      if (!token) {
        return res.status(400).json({ success: false, message: 'Token verifikasi tidak ditemukan' });
      }

      let email: string | null = null;
      if (redisClient && redisConnected) {
        const stored = await redisClient.get(`verify:${token}`).catch(() => null);
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
      if (redisClient && redisConnected) {
        await redisClient.del(`verify:${token}`).catch(() => {});
      }

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
        message: 'Selamat! Akun warung Anda di MongoDB telah terverifikasi.',
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

  // 3. Auth: Login (Validates against MongoDB)
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
      const user = await usersCol.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(401).json({ success: false, message: 'Email atau kata sandi salah' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Email atau kata sandi salah' });
      }

      // Check tenant status in MongoDB
      if (user.tenantId) {
        const tenant = await tenantsCol.findOne({ id: user.tenantId });
        if (tenant && tenant.status === 'SUSPENDED') {
          return res.status(403).json({
            success: false,
            message: 'Toko warung Anda dinonaktifkan sementara oleh Administrator.',
          });
        }
      }

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

  // 4. Auth: Me from MongoDB
  app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
    try {
      const user = await usersCol.findOne({ id: req.user.id });
      if (!user) {
        return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
      }

      const tenant = user.tenantId ? await tenantsCol.findOne({ id: user.tenantId }) : null;

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
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 5. Products: List from MongoDB (Scoped by Tenant)
  app.get('/api/products', authenticateToken, async (req: any, res) => {
    try {
      const tenantId = req.query.tenantId || req.user.tenantId;
      if (!tenantId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Tenant ID diperlukan' });
      }

      const query: any = {};
      if (req.user.role !== 'ADMIN' || tenantId) {
        query.tenantId = tenantId;
      }

      const category = req.query.category as string;
      if (category && category !== 'Semua' && category !== 'Semua Produk') {
        query.category = { $regex: new RegExp(`^${category}$`, 'i') };
      }

      const q = (req.query.q as string || '').trim();
      if (q) {
        query.$or = [
          { name: { $regex: q, $options: 'i' } },
          { sku: { $regex: q, $options: 'i' } },
          { category: { $regex: q, $options: 'i' } },
        ];
      }

      const stockStatus = req.query.stockStatus as string;
      if (stockStatus === 'low') {
        query.$expr = { $lte: ['$stock', '$minStock'] };
      }

      const products = await productsCol.find(query).sort({ isPopular: -1, name: 1 }).toArray();

      res.json({
        success: true,
        count: products.length,
        products,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 6. Products: Add to MongoDB (MANAGER only)
  app.post('/api/products', authenticateToken, requireRole(['MANAGER']), async (req: any, res) => {
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

      // Check unique SKU in MongoDB
      const existingSku = await productsCol.findOne({
        tenantId,
        sku: sku.toUpperCase(),
      });
      if (existingSku) {
        return res.status(400).json({ success: false, message: `SKU / Barcode "${sku}" sudah terdaftar pada produk "${existingSku.name}"` });
      }

      const id = `prod-${Date.now()}`;
      const newProduct = {
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

      await productsCol.insertOne(newProduct);

      res.status(201).json({
        success: true,
        message: `Produk "${name}" berhasil disimpan di MongoDB!`,
        product: newProduct,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal menambah produk: ' + err.message });
    }
  });

  // 7. Products: Update in MongoDB (MANAGER only)
  app.put('/api/products/:id', authenticateToken, requireRole(['MANAGER']), async (req: any, res) => {
    try {
      const product = await productsCol.findOne({ id: req.params.id });
      if (!product) {
        return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
      }

      if (product.tenantId !== req.user.tenantId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
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

      const updateData: any = {
        name,
        sku: sku.toUpperCase(),
        category,
        price,
        costPrice,
        stock,
        unit,
        minStock,
        description,
      };
      if (req.body.imageUrl) updateData.imageUrl = req.body.imageUrl;

      await productsCol.updateOne({ id: req.params.id }, { $set: updateData });

      res.json({
        success: true,
        message: `Data produk "${name}" berhasil diperbarui di MongoDB!`,
        product: { ...product, ...updateData },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal memperbarui produk: ' + err.message });
    }
  });

  // 8. Products: Delete from MongoDB (MANAGER only)
  app.delete('/api/products/:id', authenticateToken, requireRole(['MANAGER']), async (req: any, res) => {
    try {
      const product = await productsCol.findOne({ id: req.params.id });
      if (!product) {
        return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
      }

      if (product.tenantId !== req.user.tenantId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
      }

      await productsCol.deleteOne({ id: req.params.id });
      res.json({ success: true, message: `Produk "${product.name}" berhasil dihapus dari MongoDB.` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 9. Categories: Distinct counts from MongoDB
  app.get('/api/categories', authenticateToken, async (req: any, res) => {
    try {
      const tenantId = req.query.tenantId || req.user.tenantId;
      const categories = await productsCol.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray();

      const categoryList = categories.map(c => ({
        name: c._id,
        count: c.count,
      }));

      res.json({
        success: true,
        totalCategories: categoryList.length,
        categories: categoryList,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 10. Orders: Create / POS Checkout in MongoDB (Atomic Stock Decrement)
  app.post('/api/orders', authenticateToken, requireRole(['MANAGER', 'CASHIER']), async (req: any, res) => {
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

      // Validate stock in MongoDB
      let computedSubtotal = 0;
      for (const item of items) {
        const prod = await productsCol.findOne({ id: item.productId, tenantId });
        if (!prod) {
          return res.status(400).json({ success: false, message: `Produk ${item.name} tidak ditemukan di database warung.` });
        }
        if (prod.stock < item.qty) {
          return res.status(400).json({
            success: false,
            message: `Stok "${prod.name}" tidak mencukupi (Tersisa: ${prod.stock} ${prod.unit}, Diminta: ${item.qty}).`,
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
            message: `Uang tunai Rp ${tenderAmount.toLocaleString('id-ID')} kurang dari total Rp ${total.toLocaleString('id-ID')}.`,
          });
        }
        changeAmount = tenderAmount - total;
      }

      // Atomically decrement stock in MongoDB
      for (const item of items) {
        await productsCol.updateOne(
          { id: item.productId, tenantId },
          { $inc: { stock: -item.qty } }
        );
      }

      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `TR-${randomSeq}`;
      const id = `order-${Date.now()}`;

      const newOrder = {
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

      await ordersCol.insertOne(newOrder);

      res.status(201).json({
        success: true,
        message: `Transaksi ${orderNumber} berhasil disimpan di MongoDB!`,
        order: newOrder,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal memproses pesanan: ' + err.message });
    }
  });

  // 11. Orders: List from MongoDB (Scoped by Tenant)
  app.get('/api/orders', authenticateToken, async (req: any, res) => {
    try {
      const tenantId = req.query.tenantId || req.user.tenantId;
      const query: any = {};
      if (req.user.role !== 'ADMIN' || tenantId) {
        query.tenantId = tenantId;
      }

      const payment = req.query.payment as string;
      if (payment && payment !== 'Semua' && payment !== 'Semua Pembayaran') {
        query.paymentMethod = payment.toUpperCase();
      }

      const status = req.query.status as string;
      if (status && status !== 'Semua' && status !== 'Semua Status') {
        query.paymentStatus = status.toUpperCase();
      }

      const q = (req.query.q as string || '').trim();
      if (q) {
        query.$or = [
          { orderNumber: { $regex: q, $options: 'i' } },
          { customerName: { $regex: q, $options: 'i' } },
          { customerNote: { $regex: q, $options: 'i' } },
        ];
      }

      const orders = await ordersCol.find(query).sort({ createdAt: -1 }).toArray();

      res.json({
        success: true,
        count: orders.length,
        orders,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 12. Orders: Update Payment Status in MongoDB
  app.patch('/api/orders/:id/status', authenticateToken, requireRole(['MANAGER', 'CASHIER']), async (req: any, res) => {
    try {
      const order = await ordersCol.findOne({ id: req.params.id });
      if (!order) {
        return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
      }

      if (order.tenantId !== req.user.tenantId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
      }

      const { paymentStatus } = req.body;
      if (paymentStatus) {
        await ordersCol.updateOne({ id: req.params.id }, { $set: { paymentStatus } });
        order.paymentStatus = paymentStatus;
      }

      res.json({
        success: true,
        message: `Status kasbon untuk nota ${order.orderNumber} berhasil diperbarui menjadi ${order.paymentStatus}!`,
        order,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 13. Dashboard Stats Aggregation from MongoDB
  app.get('/api/dashboard/stats', authenticateToken, async (req: any, res) => {
    try {
      const tenantId = req.query.tenantId || req.user.tenantId;
      const orders = await ordersCol.find({ tenantId }).toArray();
      const products = await productsCol.find({ tenantId }).toArray();

      let totalOmzet = 0;
      let kasTunai = 0;
      let qrisTransfer = 0;
      let kasbon = 0;
      let kasbonPendingCount = 0;

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
            kasTunai += o.total;
          }
        }
      });

      const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
      const totalCategories = new Set(products.map(p => p.category)).size;

      const productSalesMap: { [key: string]: { name: string; count: number; revenue: number } } = {};
      orders.forEach(o => {
        o.items.forEach((it: any) => {
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
          completedOrders: orders.length,
          totalProducts: products.length,
          totalCategories,
          lowStockCount,
          fastMoving,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 14. Cashier Management: Add Cashier User to MongoDB (MANAGER only)
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

      const existing = await usersCol.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email kasir sudah digunakan oleh akun lain.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const id = `user-cashier-${Date.now()}`;

      const newCashier = {
        id,
        email: email.toLowerCase(),
        passwordHash,
        name,
        role: 'CASHIER',
        tenantId,
        tenantName,
        isVerified: true,
        createdAt: new Date().toISOString(),
      };

      await usersCol.insertOne(newCashier);

      res.status(201).json({
        success: true,
        message: `Akun kasir "${name}" berhasil disimpan di MongoDB!`,
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

  // 15. Cashier Management: List Cashiers from MongoDB
  app.get('/api/users/cashiers', authenticateToken, requireRole(['MANAGER']), async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const cashiers = await usersCol
        .find({ tenantId, role: 'CASHIER' })
        .project({ passwordHash: 0 })
        .toArray();

      res.json({ success: true, count: cashiers.length, cashiers });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 16. Cashier Management: Delete Cashier from MongoDB
  app.delete('/api/users/cashiers/:id', authenticateToken, requireRole(['MANAGER']), async (req: any, res) => {
    try {
      const user = await usersCol.findOne({ id: req.params.id });
      if (!user) {
        return res.status(404).json({ success: false, message: 'Akun kasir tidak ditemukan' });
      }

      if (user.tenantId !== req.user.tenantId) {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
      }

      await usersCol.deleteOne({ id: req.params.id });
      res.json({ success: true, message: `Akun kasir "${user.name}" berhasil dihapus dari MongoDB.` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 17. Tenant Management from MongoDB (ADMIN only)
  app.get('/api/tenants', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
    try {
      const tenantsList = await tenantsCol.find().toArray();
      const enriched = await Promise.all(
        tenantsList.map(async (t) => {
          const productCount = await productsCol.countDocuments({ tenantId: t.id });
          const userCount = await usersCol.countDocuments({ tenantId: t.id });
          const orderCount = await ordersCol.countDocuments({ tenantId: t.id });
          const orders = await ordersCol.find({ tenantId: t.id }).toArray();
          const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

          return {
            ...t,
            productCount,
            userCount,
            orderCount,
            totalRevenue,
          };
        })
      );

      res.json({ success: true, count: enriched.length, tenants: enriched });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 18. Tenant Management: Toggle Status in MongoDB (ADMIN only)
  app.patch('/api/tenants/:id/status', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
    try {
      const tenant = await tenantsCol.findOne({ id: req.params.id });
      if (!tenant) {
        return res.status(404).json({ success: false, message: 'Tenant tidak ditemukan' });
      }

      const { status } = req.body;
      if (status && ['ACTIVE', 'SUSPENDED'].includes(status)) {
        await tenantsCol.updateOne({ id: req.params.id }, { $set: { status } });
        tenant.status = status;
      }

      res.json({
        success: true,
        message: `Status tenant "${tenant.name}" berhasil diubah menjadi ${tenant.status}!`,
        tenant,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
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
    console.log(`🗄️ Database: MongoDB Atlas (kasirwarungdb)`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
