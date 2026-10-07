import bcrypt from 'bcryptjs';
import {
  tenantsCol,
  usersCol,
  productsCol,
  ordersCol,
  activityLogsCol,
  loginHistoryCol,
  unitsCol,
  activeSessionsCol,
} from './db.ts';

export async function seedMongoData() {
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
    deactivationRequest: {
      id: 'deact-req-madura-01',
      requestedBy: 'Cak Holil (Owner)',
      requestedByEmail: 'cak.holil@madura24.com',
      requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      reason: 'Renovasi gedung ruko toko dan restrukturisasi pembukuan kasir keluarga.',
      notes: 'Mohon persetujuan penonaktifan sementara akun warung agar tidak ada pesanan baru masuk selama periode renovasi.',
      status: 'PENDING',
    },
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
      isActive: true,
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
      isActive: true,
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
      isActive: true,
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
      isActive: true,
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

    // Gula & Pemanis (10)
    { name: "Gula Pasir Gulaku 1kg", sku: "GLA-GL01", cat: "Gula & Pemanis", price: 18000, cost: 16200, stock: 50, unit: "kg", min: 10, pop: true, desc: "Gula tebu murni kristal putih bersih butiran halus kemasan hijau." },
    { name: "Gula Pasir Rose Brand Kuning 1kg", sku: "GLA-RB01", cat: "Gula & Pemanis", price: 17500, cost: 15800, stock: 34, unit: "kg", min: 8, pop: false, desc: "Gula tebu alami rasa manis gurih khas gula kuning tebu." },
    { name: "Gula Pasir Curah 1kg", sku: "GLA-CR01", cat: "Gula & Pemanis", price: 16500, cost: 14800, stock: 65, unit: "kg", min: 15, pop: true, desc: "Gula pasir timbang plastik kiloan warung." },
    { name: "Gula Merah Kelapa Cetak 500g", sku: "GLA-MR05", cat: "Gula & Pemanis", price: 14000, cost: 11500, stock: 26, unit: "bks", min: 5, pop: true, desc: "Gula aren kelapa cetak batok harum legit untuk kolak." },
    { name: "Gula Batu Cap Gajah 250g", sku: "GLA-BT25", cat: "Gula & Pemanis", price: 7000, cost: 5500, stock: 15, unit: "bks", min: 4, pop: false, desc: "Gula batu kristal bening legit penyegar wedang jahe dan teh." },
    { name: "Susu Kental Manis Frisian Flag Cokelat 370g", sku: "SKM-FF37", cat: "Gula & Pemanis", price: 13000, cost: 11200, stock: 30, unit: "kaleng", min: 6, pop: true, desc: "SKM bendera cokelat gurih kental lezat untuk minuman dan martabak." },
    { name: "Susu Kental Manis Indomilk Putih 370g", sku: "SKM-IM37", cat: "Gula & Pemanis", price: 12500, cost: 10800, stock: 33, unit: "kaleng", min: 6, pop: true, desc: "Kental manis rasa vanila gurih pelengkap kopi dan alpukat keruk." },
    { name: "Frisian Flag Sachet Putih (6x38g)", sku: "SKM-FF06", cat: "Gula & Pemanis", price: 9000, cost: 7500, stock: 45, unit: "renceng", min: 8, pop: false, desc: "Susu kental manis renceng praktis isi 6 sachet." },
    { name: "Madu Enak Manis 150ml Botol", sku: "PST-MD15", cat: "Gula & Pemanis", price: 17500, cost: 14000, stock: 14, unit: "botol", min: 3, pop: false, desc: "Madu murni alami dengan sari kurma dan royal jelly." },
    { name: "Sirup Marjan Boudoin Cocopandan 460ml", sku: "SRP-MJ46", cat: "Gula & Pemanis", price: 23500, cost: 20500, stock: 28, unit: "botol", min: 6, pop: true, desc: "Sirup kental rasa kelapa pandan harum segar untuk es campur." },

    // Bumbu & Rempah Dapur (15)
    { name: "Garam Dapur Beriodium Dolpin 250g", sku: "BMB-GD25", cat: "Bumbu & Rempah", price: 3500, cost: 2600, stock: 60, unit: "bks", min: 12, pop: true, desc: "Garam meja halus beryodium tinggi penambah cita rasa masakan." },
    { name: "Garam Bata Cap Kapal (Isi 10)", sku: "BMB-GB10", cat: "Bumbu & Rempah", price: 9000, cost: 7200, stock: 22, unit: "pak", min: 5, pop: false, desc: "Garam batangan tradisional untuk kuah sayur dan rendaman ikan." },
    { name: "Royco Rasa Sapi Renceng (12x8g)", sku: "BMB-RY12", cat: "Bumbu & Rempah", price: 6000, cost: 4800, stock: 55, unit: "renceng", min: 10, pop: true, desc: "Kaldu sapi pilihan kaya ekstrak sumsum tulang gurih mantap." },
    { name: "Royco Rasa Ayam Renceng (12x8g)", sku: "BMB-RY08", cat: "Bumbu & Rempah", price: 6000, cost: 4800, stock: 58, unit: "renceng", min: 10, pop: true, desc: "Bumbu ekstrak kaldu ayam gurih mantap serbaguna." },
    { name: "Masako Rasa Ayam Renceng (12x8.5g)", sku: "BMB-MS12", cat: "Bumbu & Rempah", price: 6000, cost: 4900, stock: 50, unit: "renceng", min: 10, pop: false, desc: "Bumbu kaldu ekstrak daging ayam asli bumbu dapur favorit." },
    { name: "Masako Rasa Sapi Renceng (12x8.5g)", sku: "BMB-MS08", cat: "Bumbu & Rempah", price: 6000, cost: 4900, stock: 45, unit: "renceng", min: 8, pop: false, desc: "Penyedap rasa kaldu daging sapi lezat." },
    { name: "Micin Ajinomoto 100g", sku: "BMB-AJ10", cat: "Bumbu & Rempah", price: 5500, cost: 4400, stock: 42, unit: "bks", min: 8, pop: true, desc: "Penguat rasa monosodium glutamat kristal putih bersih." },
    { name: "Sasa MSG Penyedap Rasa 100g", sku: "BMB-SS10", cat: "Bumbu & Rempah", price: 5500, cost: 4300, stock: 38, unit: "bks", min: 8, pop: false, desc: "Penyedap rasa umami alami terpercaya sejak lama." },
    { name: "Kecap Manis Bango 520ml Pouch", sku: "KCP-BG52", cat: "Bumbu & Rempah", price: 23500, cost: 20800, stock: 32, unit: "pouch", min: 6, pop: true, desc: "Kecap hitam kental manis alami kedelai hitam Mallika pilihan." },
    { name: "Kecap ABC Manis 520ml Pouch", sku: "KCP-AB52", cat: "Bumbu & Rempah", price: 19500, cost: 17200, stock: 24, unit: "pouch", min: 5, pop: false, desc: "Kecap manis mantap kental hitam rasa gurih pas." },
    { name: "Saus Sambal ABC Asli 275ml Botol", sku: "SAU-AB27", cat: "Bumbu & Rempah", price: 13500, cost: 11400, stock: 26, unit: "botol", min: 5, pop: true, desc: "Saus cabe pedas asam segar nikmat untuk gorengan." },
    { name: "Saus Tomat Indofood 275ml Botol", sku: "SAU-IF27", cat: "Bumbu & Rempah", price: 11500, cost: 9800, stock: 18, unit: "botol", min: 4, pop: false, desc: "Saus tomat segar kental manis gurih pas untuk mie goreng." },
    { name: "Terasi Udang ABC Sachet (20x4.2g)", sku: "BMB-TR20", cat: "Bumbu & Rempah", price: 10000, cost: 8200, stock: 25, unit: "pak", min: 5, pop: true, desc: "Terasi udang bakar matang wangi khas sambal cobek sedap." },
    { name: "Ladaku Merica Bubuk Renceng (12x4g)", sku: "BMB-LD12", cat: "Bumbu & Rempah", price: 12000, cost: 10000, stock: 40, unit: "renceng", min: 8, pop: true, desc: "Merica lada putih murni 100% harum pedas hangat alami." },
    { name: "Desaku Ketumbar Bubuk Renceng (12x12.5g)", sku: "BMB-DS12", cat: "Bumbu & Rempah", price: 11000, cost: 9200, stock: 30, unit: "renceng", min: 6, pop: false, desc: "Ketumbar halus harum bumbu marinasi tempe dan ayam." },

    // Mie Instan & Pasta (12)
    { name: "Indomie Goreng Original", sku: "MIE-IG01", cat: "Mie Instan", price: 3100, cost: 2650, stock: 120, unit: "bks", min: 24, pop: true, desc: "Mie goreng legendaris bumbu gurih komplit bawang goreng renyah." },
    { name: "Indomie Kuah Ayam Bawang", sku: "MIE-AB01", cat: "Mie Instan", price: 3000, cost: 2550, stock: 80, unit: "bks", min: 20, pop: true, desc: "Kuah kaldu ayam gurih harum minyak bawang lezat." },
    { name: "Indomie Kuah Soto Mie", sku: "MIE-ST01", cat: "Mie Instan", price: 3000, cost: 2550, stock: 95, unit: "bks", min: 20, pop: true, desc: "Kuah soto bumbu kuning segar rasa jeruk nipis nikmat hangat." },
    { name: "Mie Sedaap Goreng", sku: "MIE-SG01", cat: "Mie Instan", price: 3100, cost: 2600, stock: 75, unit: "bks", min: 16, pop: true, desc: "Kriuk kress bawang renyah melimpah rasa gurih sedap." },
    { name: "Mie Sedaap Soto Madura", sku: "MIE-SS01", cat: "Mie Instan", price: 3000, cost: 2550, stock: 65, unit: "bks", min: 15, pop: false, desc: "Rasa soto gurih koya gurih melimpah mantap." },
    { name: "Indomie Goreng Rendang", sku: "MIE-IR01", cat: "Mie Instan", price: 3300, cost: 2800, stock: 45, unit: "bks", min: 10, pop: false, desc: "Aroma bumbu rendang Minang gurih pekat nikmat." },
    { name: "Pop Mie Kuah Rasa Ayam Bawang 75g", sku: "MIE-PM01", cat: "Mie Instan", price: 5500, cost: 4400, stock: 36, unit: "cup", min: 8, pop: false, desc: "Mie instan cup praktis seduh air panas pas untuk bepergian." },
    { name: "Bihun Jagung Padamu 320g", sku: "MIE-BJ32", cat: "Mie Instan", price: 8500, cost: 6800, stock: 25, unit: "bks", min: 6, pop: false, desc: "Bihun kenyal tidak mudah putus untuk bihun goreng dan soto." },
    { name: "Mie Telur Cap 3 Ayam Kuning 200g", sku: "MIE-3A20", cat: "Mie Instan", price: 6500, cost: 5200, stock: 30, unit: "bks", min: 6, pop: false, desc: "Mie telur kering pipih kenyal lembut untuk olahan bakmi." },
    { name: "Samyang Hot Spicy Chicken 140g", sku: "MIE-SY14", cat: "Mie Instan", price: 21000, cost: 17500, stock: 15, unit: "bks", min: 4, pop: false, desc: "Ramen goreng pedas Korea rasa ayam pedas membara." },
    { name: "Indomie Kari Ayam", sku: "MIE-KA01", cat: "Mie Instan", price: 3200, cost: 2700, stock: 60, unit: "bks", min: 12, pop: true, desc: "Kuah kari ayam kental bumbu rempah nikmat harum." },
    { name: "Sarimi Isi 2 Ayam Kecap", sku: "MIE-SR02", cat: "Mie Instan", price: 4200, cost: 3500, stock: 40, unit: "bks", min: 10, pop: false, desc: "Porsi dobel puas rasa manis gurih mantap." },

    // Minuman & Kopi (15)
    { name: "Kopi Kapal Api Spesial Mix (10s)", sku: "KOP-KA10", cat: "Minuman & Kopi", price: 15500, cost: 13200, stock: 48, unit: "renceng", min: 10, pop: true, desc: "Kopi hitam bubuk paduan gula murni aroma mantap berkelas." },
    { name: "Kopi Good Day Mocacinno (10s)", sku: "KOP-GD10", cat: "Minuman & Kopi", price: 16000, cost: 13600, stock: 42, unit: "renceng", min: 8, pop: true, desc: "Kopi instan 3in1 rasa moka nikmat dinikmati dingin atau hangat." },
    { name: "Kopi Torabika Duo (10s)", sku: "KOP-TB10", cat: "Minuman & Kopi", price: 14000, cost: 11800, stock: 30, unit: "renceng", min: 6, pop: false, desc: "Paduan kopi arabika robusta pilihan dan gula manis pas." },
    { name: "Telur Ayam Negeri 1kg", sku: "TLR-AY01", cat: "Telur & Protein", price: 29000, cost: 26500, stock: 40, unit: "kg", min: 8, pop: true, desc: "Telur ayam ras segar cangkang tebal bersih kualitas peternak lokal." },
    { name: "Kopi Luwak White Koffie (10s)", sku: "KOP-LW10", cat: "Minuman & Kopi", price: 16500, cost: 14000, stock: 35, unit: "renceng", min: 8, pop: false, desc: "Kopi putih lembut rendah asam lambung aman di perut." },
    { name: "Teh Celup Sosro Kotak 30s", sku: "TEH-SS30", cat: "Minuman & Kopi", price: 8000, cost: 6500, stock: 38, unit: "kotak", min: 8, pop: true, desc: "Teh celup wangi melati asli celup merah harum mantap." },
    { name: "Teh SariWangi Asli Kotak 25s", sku: "TEH-SW25", cat: "Minuman & Kopi", price: 7500, cost: 6100, stock: 36, unit: "kotak", min: 8, pop: true, desc: "Teh hitam celup kualitas pilihan daun teh Indonesia." },
    { name: "NutriSari Jeruk Manis (10s)", sku: "MIN-NS10", cat: "Minuman & Kopi", price: 13500, cost: 11200, stock: 34, unit: "renceng", min: 6, pop: true, desc: "Minuman serbuk rasa jeruk manis segar kaya vitamin C dan D." },
    { name: "Chocolatos Drink Cokelat (10s)", sku: "MIN-CH10", cat: "Minuman & Kopi", price: 18000, cost: 15200, stock: 24, unit: "renceng", min: 5, pop: false, desc: "Minuman serbuk cokelat kental cita rasa Italia nikmat." },
    { name: "Aqua Air Mineral Botol 600ml", sku: "AIR-AQ60", cat: "Minuman & Kopi", price: 3500, cost: 2700, stock: 96, unit: "botol", min: 24, pop: true, desc: "Air mineral pegunungan alami murni segar menjaga hidrasi tubuh." },
    { name: "Aqua Galon 19L (Isi Ulang)", sku: "AIR-AQ19", cat: "Minuman & Kopi", price: 21000, cost: 18500, stock: 25, unit: "galon", min: 5, pop: true, desc: "Air galon kemasan asli Danone Aqua pengiriman segar." },
    { name: "Le Minerale Botol 600ml", sku: "AIR-LM60", cat: "Minuman & Kopi", price: 3500, cost: 2650, stock: 72, unit: "botol", min: 20, pop: false, desc: "Air mineral ada manis-manisnya kaya mineral esensial." },

    // Sabun & Pembersih Rumah (16)
    { name: "Deterjen Rinso Molto Rose Fresh 770g", sku: "SBN-RN77", cat: "Sabun & Pembersih", price: 21500, cost: 18500, stock: 26, unit: "bks", min: 6, pop: true, desc: "Deterjen bubuk formula konsentrat hilangkan noda membandel 1x kucek." },
    { name: "Deterjen Daia Bunga 850g", sku: "SBN-DA85", cat: "Sabun & Pembersih", price: 18000, cost: 15400, stock: 30, unit: "bks", min: 6, pop: true, desc: "Deterjen wangi semerbak lembut di tangan busa melimpah." },
    { name: "Molto Pewangi Pakaian Floral 780ml", sku: "SBN-ML78", cat: "Sabun & Pembersih", price: 14000, cost: 11800, stock: 22, unit: "pouch", min: 5, pop: false, desc: "Konsentrat pelembut pewangi pakaian wangi tahan lama." },
    { name: "Sunlight Jeruk Nipis 700ml Pouch", sku: "SBN-SL70", cat: "Sabun & Pembersih", price: 14500, cost: 12200, stock: 45, unit: "pouch", min: 10, pop: true, desc: "Sabun cuci piring ekstrak jeruk nipis asli hilangkan lemak membandel." },
    { name: "Mama Lemon Jeruk Nipis 680ml Pouch", sku: "SBN-ML68", cat: "Sabun & Pembersih", price: 13000, cost: 11000, stock: 28, unit: "pouch", min: 6, pop: false, desc: "Cairan pencuci piring higienis kesat bebas bakteri." },
    { name: "Super Pel Apel 770ml Pouch", sku: "SBN-SP77", cat: "Sabun & Pembersih", price: 13500, cost: 11200, stock: 20, unit: "pouch", min: 4, pop: false, desc: "Pembersih lantai wangi apel segar kilap bersih bebas kuman." },
    { name: "Wipol Karbol Wangi Cemara 750ml", sku: "SBN-WP75", cat: "Sabun & Pembersih", price: 17500, cost: 14800, stock: 16, unit: "pouch", min: 4, pop: false, desc: "Disinfektan karbol lantai pinus aroma cemara segar higienis." },
    { name: "Sabun Mandi Lifebuoy Total 10 (85g)", sku: "SBN-LB85", cat: "Sabun & Pembersih", price: 4500, cost: 3600, stock: 65, unit: "batang", min: 12, pop: true, desc: "Sabun batang perlindungan kuman kuman penyebab penyakit." },
    { name: "Sabun Mandi Dettol Original 100g", sku: "SBN-DT10", cat: "Sabun & Pembersih", price: 8500, cost: 6900, stock: 32, unit: "batang", min: 6, pop: false, desc: "Sabun antibakteri formula perlindungan higienis keluarga." },
    { name: "Shampo Pantene Anti Dandruff 160ml", sku: "SBN-PT16", cat: "Sabun & Pembersih", price: 24500, cost: 20800, stock: 14, unit: "botol", min: 3, pop: false, desc: "Shampo atasi ketombe dan rambut rontok nutrisi provitamin." },
    { name: "Pasta Gigi Pepsodent Pencegah Gigi Berlubang 190g", sku: "SBN-PS19", cat: "Sabun & Pembersih", price: 16500, cost: 13800, stock: 34, unit: "kotak", min: 8, pop: true, desc: "Pasta gigi kalsium aktif dan fluorida cegah gigi berlubang." },

    // Perlengkapan Warung & Lainnya (10)
    { name: "Gas Elpiji 3kg (Tabung Melon Refill)", sku: "GAS-3KG01", cat: "Perlengkapan Warung", price: 22000, cost: 19500, stock: 16, unit: "tabung", min: 4, pop: true, desc: "Refill gas melon elpiji 3kg bersubsidi untuk kompor gas rumah tangga." },
    { name: "Korek Api Gas Tokai", sku: "KRK-TK01", cat: "Perlengkapan Warung", price: 3500, cost: 2400, stock: 80, unit: "pcs", min: 15, pop: true, desc: "Korek gas roda batu api tahan angin terlaris." },
    { name: "Obat Nyamuk Bakar Baygon Jumbo (Isi 10)", sku: "OBT-BY10", cat: "Perlengkapan Warung", price: 6500, cost: 5200, stock: 35, unit: "kotak", min: 8, pop: false, desc: "Lingkaran obat nyamuk bakar semerbak aroma lavender." },
    { name: "Kantong Plastik Kresek Hitam Sedang (Isi 50)", sku: "KRS-HT50", cat: "Perlengkapan Warung", price: 8000, cost: 6000, stock: 45, unit: "pak", min: 10, pop: true, desc: "Kantong kresek plastik tebal hitam serbaguna." },
    { name: "Tissue Paseo Smart 250 sheets", sku: "TIS-PS25", cat: "Perlengkapan Warung", price: 13500, cost: 11000, stock: 24, unit: "bks", min: 5, pop: false, desc: "Tissue wajah lembut higienis 2 ply serat alami." },
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
    isPopular: p.pop,
    imageUrl: `https://picsum.photos/seed/${p.sku}/300/300`,
    createdAt: new Date().toISOString(),
  }));

  const tenant2Products = [
    { id: 'prod-madura-1', tenantId: tenant2.id, name: "Beras Pandan Wangi Premium 5kg", sku: "MDR-PW05", category: "Beras & Gandum", price: 78000, costPrice: 70000, stock: 20, unit: "karung", min: 5, imageUrl: "https://picsum.photos/seed/MDR-PW05/300/300", createdAt: new Date().toISOString() },
    { id: 'prod-madura-2', tenantId: tenant2.id, name: "Minyak Goreng SunCo 2L", sku: "MDR-SC02", category: "Minyak & Margarin", price: 38000, costPrice: 34000, stock: 30, unit: "pouch", min: 5, imageUrl: "https://picsum.photos/seed/MDR-SC02/300/300", createdAt: new Date().toISOString() },
    { id: 'prod-madura-3', tenantId: tenant2.id, name: "Bensin Eceran 1 Liter", sku: "MDR-BS01", category: "Perlengkapan Warung", price: 12000, costPrice: 10000, stock: 45, unit: "botol", min: 10, imageUrl: "https://picsum.photos/seed/MDR-BS01/300/300", createdAt: new Date().toISOString() },
    { id: 'prod-madura-4', tenantId: tenant2.id, name: "Es Teh Manis Jumbo", sku: "MDR-ES01", category: "Minuman & Kopi", price: 4000, costPrice: 2000, stock: 99, unit: "cup", min: 10, imageUrl: "https://picsum.photos/seed/MDR-ES01/300/300", createdAt: new Date().toISOString() },
  ];

  await productsCol.insertMany([...productsToInsert, ...tenant2Products]);

  // Seed sample initial orders
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
      total: 134500,
      tenderAmount: 150000,
      changeAmount: 15500,
      paymentMethod: 'TUNAI',
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
      total: 50500,
      tenderAmount: 50500,
      changeAmount: 0,
      paymentMethod: 'QRIS',
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
      total: 33500,
      tenderAmount: 50000,
      changeAmount: 16500,
      paymentMethod: 'TUNAI',
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
      total: 22000,
      tenderAmount: 50000,
      changeAmount: 28000,
      paymentMethod: 'TUNAI',
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
      total: 85000,
      tenderAmount: 85000,
      changeAmount: 0,
      paymentMethod: 'QRIS',
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
      total: 37000,
      tenderAmount: 50000,
      changeAmount: 13000,
      paymentMethod: 'TUNAI',
      cashierName: 'Bu Siti (Kasir Utama)',
      createdAt: new Date(Date.now() - 1000 * 60 * 220).toISOString(),
    },
  ];

  await ordersCol.insertMany(sampleOrders);
  await seedInitialActivityLogs(tenant1.id);
  await seedInitialLoginHistory();
  await ensureSeedOrdersForAdmin();
  console.log(`✅ Seeded ${productsToInsert.length} products, initial orders, activity logs, and login history to MongoDB.`);
}

export async function seedInitialActivityLogs(tenantId: string = 'tenant-berkah-jaya') {
  const initialLogs = [
    {
      id: 'act-seed-1',
      tenantId,
      userId: 'user-manager-berkah',
      userName: 'Pak Hendra (Manager)',
      userRole: 'MANAGER',
      module: 'PRODUCT',
      action: 'CREATE_PRODUCT',
      description: 'Menambahkan produk baru "Beras Setra Ramos Cap Bunga 5kg" (SKU: BRS-SR05, Kategori: Beras & Gandum, Stok: 20 karung, Rp 69.500)',
      details: { name: 'Beras Setra Ramos Cap Bunga 5kg', sku: 'BRS-SR05', category: 'Beras & Gandum', stock: 20, price: 69500 },
      ipAddress: '192.168.1.10',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    },
    {
      id: 'act-seed-2',
      tenantId,
      userId: 'user-manager-berkah',
      userName: 'Pak Hendra (Manager)',
      userRole: 'MANAGER',
      module: 'CATEGORY',
      action: 'CREATE_CATEGORY',
      description: 'Membuat kategori produk baru "Beras & Gandum"',
      details: { categoryName: 'Beras & Gandum' },
      ipAddress: '192.168.1.10',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 5).toISOString(),
    },
    {
      id: 'act-seed-3',
      tenantId,
      userId: 'user-manager-berkah',
      userName: 'Pak Hendra (Manager)',
      userRole: 'MANAGER',
      module: 'CATEGORY',
      action: 'CREATE_CATEGORY',
      description: 'Membuat kategori produk baru "Minyak & Margarin"',
      details: { categoryName: 'Minyak & Margarin' },
      ipAddress: '192.168.1.10',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
    {
      id: 'act-seed-4',
      tenantId,
      userId: 'user-manager-berkah',
      userName: 'Pak Hendra (Manager)',
      userRole: 'MANAGER',
      module: 'CASHIER',
      action: 'CREATE_CASHIER',
      description: 'Mendaftarkan staf kasir baru "Bu Siti (Kasir Utama)" (kasir@berkahjaya.com)',
      details: { name: 'Bu Siti (Kasir Utama)', email: 'kasir@berkahjaya.com' },
      ipAddress: '192.168.1.10',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 30).toISOString(),
    },
    {
      id: 'act-seed-5',
      tenantId,
      userId: 'user-manager-berkah',
      userName: 'Pak Hendra (Manager)',
      userRole: 'MANAGER',
      module: 'PRODUCT',
      action: 'CREATE_PRODUCT',
      description: 'Menambahkan produk baru "Minyak Sania Pouch 2L" (SKU: MNK-SN02, Kategori: Minyak & Margarin, Stok: 18 pouch, Rp 35.000)',
      details: { name: 'Minyak Sania Pouch 2L', sku: 'MNK-SN02', category: 'Minyak & Margarin', stock: 18, price: 35000 },
      ipAddress: '192.168.1.10',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    },
    {
      id: 'act-seed-6',
      tenantId,
      userId: 'user-manager-berkah',
      userName: 'Pak Hendra (Manager)',
      userRole: 'MANAGER',
      module: 'CATEGORY',
      action: 'CREATE_CATEGORY',
      description: 'Membuat kategori produk baru "Perlengkapan Warung"',
      details: { categoryName: 'Perlengkapan Warung' },
      ipAddress: '192.168.1.10',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    },
    {
      id: 'act-seed-7',
      tenantId,
      userId: 'user-manager-berkah',
      userName: 'Pak Hendra (Manager)',
      userRole: 'MANAGER',
      module: 'PRODUCT',
      action: 'CREATE_PRODUCT',
      description: 'Menambahkan produk baru "Gas Elpiji 3kg (Tabung Melon Refill)" (SKU: GAS-3KG01, Kategori: Perlengkapan Warung, Stok: 16 tabung, Rp 22.000)',
      details: { name: 'Gas Elpiji 3kg (Tabung Melon Refill)', sku: 'GAS-3KG01', category: 'Perlengkapan Warung', stock: 16, price: 22000 },
      ipAddress: '192.168.1.10',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    },
    {
      id: 'act-seed-8',
      tenantId,
      userId: 'user-manager-berkah',
      userName: 'Pak Hendra (Manager)',
      userRole: 'MANAGER',
      module: 'PRODUCT',
      action: 'UPDATE_PRODUCT',
      description: 'Memperbarui stok produk "Sunlight Jeruk Nipis 700ml Pouch" (SKU: SBN-SL70, Stok: 4 bks, Rp 14.500)',
      details: { name: 'Sunlight Jeruk Nipis 700ml Pouch', sku: 'SBN-SL70', stock: 4, price: 14500 },
      ipAddress: '192.168.1.10',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    },
    {
      id: 'act-seed-9',
      tenantId,
      userId: 'user-manager-berkah',
      userName: 'Pak Hendra (Manager)',
      userRole: 'MANAGER',
      module: 'CATEGORY',
      action: 'UPDATE_CATEGORY',
      description: 'Mengubah nama kategori "Minuman Dingin & Kopi" menjadi "Minuman & Kopi"',
      details: { oldCategory: 'Minuman Dingin & Kopi', newCategory: 'Minuman & Kopi' },
      ipAddress: '192.168.1.10',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: 'act-seed-10',
      tenantId,
      userId: 'user-manager-berkah',
      userName: 'Pak Hendra (Manager)',
      userRole: 'MANAGER',
      module: 'PRODUCT',
      action: 'UPDATE_PRODUCT',
      description: 'Memperbarui harga jual "Indomie Goreng Original" (Harga: Rp 3.100, Stok: 120 bks)',
      details: { name: 'Indomie Goreng Original', price: 3100, stock: 120 },
      ipAddress: '192.168.1.10',
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: 'act-seed-11',
      tenantId,
      userId: 'user-manager-berkah',
      userName: 'Pak Hendra (Manager)',
      userRole: 'MANAGER',
      module: 'CASHIER',
      action: 'CREATE_CASHIER',
      description: 'Mendaftarkan staf kasir baru "Rian Kurniawan (Kasir Siang)" (rian@berkahjaya.com)',
      details: { name: 'Rian Kurniawan (Kasir Siang)', email: 'rian@berkahjaya.com' },
      ipAddress: '192.168.1.10',
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
  ];
  await activityLogsCol.insertMany(initialLogs);
  console.log(`✅ Seeded ${initialLogs.length} initial activity logs.`);
}

export async function seedInitialLoginHistory() {
  const initialLoginRecords = [
    {
      id: 'loghist-seed-1',
      userId: 'user-admin-1',
      userName: 'Super Admin KasirWarung',
      userEmail: 'admin@kasirwarung.com',
      userRole: 'ADMIN',
      tenantId: null,
      tenantName: 'Global System',
      status: 'SUCCESS',
      failureReason: null,
      ipAddress: '114.124.12.89',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      device: 'Desktop',
      os: 'Windows',
      browser: 'Chrome',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: 'loghist-seed-2',
      userId: 'user-manager-1',
      userName: 'Bu Siti Rahma',
      userEmail: 'manager@berkahjaya.com',
      userRole: 'MANAGER',
      tenantId: 'tenant-berkah-jaya',
      tenantName: 'Berkah Jaya',
      status: 'SUCCESS',
      failureReason: null,
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      device: 'Desktop',
      os: 'Windows',
      browser: 'Chrome',
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: 'loghist-seed-3',
      userId: 'user-cashier-1',
      userName: 'Bu Siti (Kasir Utama)',
      userEmail: 'kasir@berkahjaya.com',
      userRole: 'CASHIER',
      tenantId: 'tenant-berkah-jaya',
      tenantName: 'Berkah Jaya',
      status: 'SUCCESS',
      failureReason: null,
      ipAddress: '192.168.1.45',
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-X200 Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      device: 'Tablet',
      os: 'Android',
      browser: 'Chrome',
      createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    },
    {
      id: 'loghist-seed-4',
      userId: 'user-manager-2',
      userName: 'Cak Holil (Owner)',
      userEmail: 'cak.holil@madura24.com',
      userRole: 'MANAGER',
      tenantId: 'tenant-madura-24jam',
      tenantName: 'Warung Madura 24 Jam',
      status: 'SUCCESS',
      failureReason: null,
      ipAddress: '182.253.11.78',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
      device: 'Desktop',
      os: 'macOS',
      browser: 'Safari',
      createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    },
    {
      id: 'loghist-seed-5',
      userId: 'user-manager-1',
      userName: 'Bu Siti Rahma',
      userEmail: 'manager@berkahjaya.com',
      userRole: 'MANAGER',
      tenantId: 'tenant-berkah-jaya',
      tenantName: 'Berkah Jaya',
      status: 'SUCCESS',
      failureReason: null,
      ipAddress: '114.125.45.22',
      userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
      device: 'Smartphone',
      os: 'Android',
      browser: 'Chrome',
      createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    },
    {
      id: 'loghist-seed-6',
      userId: 'user-cashier-1',
      userName: 'Bu Siti (Kasir Utama)',
      userEmail: 'kasir@berkahjaya.com',
      userRole: 'CASHIER',
      tenantId: 'tenant-berkah-jaya',
      tenantName: 'Berkah Jaya',
      status: 'FAILED',
      failureReason: 'Kata sandi tidak sesuai',
      ipAddress: '192.168.1.45',
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-X200 Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      device: 'Tablet',
      os: 'Android',
      browser: 'Chrome',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    },
  ];

  await loginHistoryCol.insertMany(initialLoginRecords);
  console.log(`✅ Seeded ${initialLoginRecords.length} initial login history records.`);
}

export async function ensureSeedOrdersForAdmin() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayOrdersCount = await ordersCol.countDocuments({
      createdAt: { $gte: todayStart.toISOString() },
    });

    if (todayOrdersCount === 0) {
      const now = Date.now();
      const todayOrders = [
        {
          id: `ord-today-1-${now}`,
          orderNumber: 'TR-9102',
          tenantId: 'tenant-berkah-jaya',
          items: [
            { productId: 'prod-berkah-1', name: 'Beras Ramos Super 5kg', price: 68000, qty: 3, subtotal: 204000, category: 'Sembako & Kebutuhan' },
            { productId: 'prod-berkah-2', name: 'Minyak Goreng Bimoli 2L', price: 36000, qty: 4, subtotal: 144000, category: 'Sembako & Kebutuhan' },
            { productId: 'prod-berkah-5', name: 'Gula Pasir Gulaku 1kg', price: 17500, qty: 6, subtotal: 105000, category: 'Sembako & Kebutuhan' },
          ],
          total: 453000,
          tenderAmount: 500000,
          changeAmount: 47000,
          paymentMethod: 'TUNAI',
          cashierName: 'Bu Siti (Kasir Utama)',
          createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
        },
        {
          id: `ord-today-2-${now}`,
          orderNumber: 'TR-9105',
          tenantId: 'tenant-berkah-jaya',
          items: [
            { productId: 'prod-berkah-8', name: 'Telur Ayam 1kg (Isi 16)', price: 28000, qty: 5, subtotal: 140000, category: 'Sembako & Kebutuhan' },
            { productId: 'prod-berkah-43', name: 'Indomie Goreng Original', price: 3100, qty: 40, subtotal: 124000, category: 'Makanan Instan' },
            { productId: 'prod-berkah-57', name: 'Kopi Kapal Api Spesial Mix (10s)', price: 15500, qty: 8, subtotal: 124000, category: 'Minuman Sachet' },
          ],
          total: 388000,
          tenderAmount: 388000,
          changeAmount: 0,
          paymentMethod: 'QRIS',
          cashierName: 'Bu Siti (Kasir Utama)',
          createdAt: new Date(now - 1000 * 60 * 90).toISOString(),
        },
        {
          id: `ord-today-3-${now}`,
          orderNumber: 'MDR-2001',
          tenantId: 'tenant-madura-24jam',
          items: [
            { productId: 'prod-madura-1', name: 'Beras Pandan Wangi Premium 5kg', price: 78000, qty: 4, subtotal: 312000, category: 'Beras Premium' },
            { productId: 'prod-madura-3', name: 'Bensin Eceran 1 Liter', price: 12000, qty: 10, subtotal: 120000, category: 'Bahan Bakar & Kendaraan' },
          ],
          total: 432000,
          tenderAmount: 450000,
          changeAmount: 18000,
          paymentMethod: 'TUNAI',
          cashierName: 'Cak Mahmud',
          createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
        },
        {
          id: `ord-today-4-${now}`,
          orderNumber: 'MDR-2002',
          tenantId: 'tenant-madura-24jam',
          items: [
            { productId: 'prod-madura-2', name: 'Minyak Goreng SunCo 2L', price: 38000, qty: 3, subtotal: 114000, category: 'Minyak Goreng & Margarin' },
            { productId: 'prod-madura-4', name: 'Es Teh Manis Jumbo', price: 4000, qty: 15, subtotal: 60000, category: 'Minuman Dingin' },
            { productId: 'prod-madura-5', name: 'Rokok Gudang Garam Filter (12s)', price: 24000, qty: 6, subtotal: 144000, category: 'Rokok & Tembakau' },
          ],
          total: 318000,
          tenderAmount: 318000,
          changeAmount: 0,
          paymentMethod: 'QRIS',
          cashierName: 'Cak Mahmud',
          createdAt: new Date(now - 1000 * 60 * 120).toISOString(),
        },
      ];
      await ordersCol.insertMany(todayOrders);
    }

    const maduraOrdersCount = await ordersCol.countDocuments({ tenantId: 'tenant-madura-24jam' });
    if (maduraOrdersCount <= 2) {
      const now = Date.now();
      const extraOrders = [
        {
          id: 'ord-mdr-1',
          orderNumber: 'MDR-1001',
          tenantId: 'tenant-madura-24jam',
          items: [
            { productId: 'prod-madura-1', name: 'Beras Pandan Wangi Premium 5kg', price: 78000, qty: 2, subtotal: 156000 },
            { productId: 'prod-madura-3', name: 'Bensin Eceran 1 Liter', price: 12000, qty: 3, subtotal: 36000 },
          ],
          total: 192000,
          tenderAmount: 200000,
          changeAmount: 8000,
          paymentMethod: 'TUNAI',
          cashierName: 'Cak Mahmud',
          createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
        },
        {
          id: 'ord-mdr-2',
          orderNumber: 'MDR-1002',
          tenantId: 'tenant-madura-24jam',
          items: [
            { productId: 'prod-madura-2', name: 'Minyak Goreng SunCo 2L', price: 38000, qty: 1, subtotal: 38000 },
            { productId: 'prod-madura-4', name: 'Es Teh Manis Jumbo', price: 4000, qty: 4, subtotal: 16000 },
          ],
          total: 54000,
          tenderAmount: 54000,
          changeAmount: 0,
          paymentMethod: 'QRIS',
          cashierName: 'Cak Mahmud',
          createdAt: new Date(now - 1000 * 60 * 120).toISOString(),
        },
        {
          id: 'ord-mdr-3',
          orderNumber: 'MDR-0988',
          tenantId: 'tenant-madura-24jam',
          items: [
            { productId: 'prod-madura-1', name: 'Beras Pandan Wangi Premium 5kg', price: 78000, qty: 3, subtotal: 234000 },
            { productId: 'prod-madura-3', name: 'Bensin Eceran 1 Liter', price: 12000, qty: 5, subtotal: 60000 },
          ],
          total: 294000,
          tenderAmount: 300000,
          changeAmount: 6000,
          paymentMethod: 'TUNAI',
          cashierName: 'Cak Mahmud',
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
        },
        {
          id: 'ord-mdr-4',
          orderNumber: 'MDR-0955',
          tenantId: 'tenant-madura-24jam',
          items: [
            { productId: 'prod-madura-2', name: 'Minyak Goreng SunCo 2L', price: 38000, qty: 4, subtotal: 152000 },
            { productId: 'prod-madura-4', name: 'Es Teh Manis Jumbo', price: 4000, qty: 10, subtotal: 40000 },
          ],
          total: 192000,
          tenderAmount: 200000,
          changeAmount: 8000,
          paymentMethod: 'TRANSFER',
          cashierName: 'Cak Mahmud',
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 12).toISOString(),
        },
        {
          id: 'ord-mdr-5',
          orderNumber: 'MDR-0890',
          tenantId: 'tenant-madura-24jam',
          items: [
            { productId: 'prod-madura-1', name: 'Beras Pandan Wangi Premium 5kg', price: 78000, qty: 5, subtotal: 390000 },
            { productId: 'prod-madura-3', name: 'Bensin Eceran 1 Liter', price: 12000, qty: 12, subtotal: 144000 },
          ],
          total: 534000,
          tenderAmount: 550000,
          changeAmount: 16000,
          paymentMethod: 'TUNAI',
          cashierName: 'Cak Mahmud',
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 45).toISOString(),
        },
        {
          id: 'ord-bkh-hist-1',
          orderNumber: 'TR-8850',
          tenantId: 'tenant-berkah-jaya',
          items: [
            { productId: 'prod-berkah-3', name: 'Beras Setra Ramos Cap Bunga 5kg', price: 69500, qty: 4, subtotal: 278000 },
            { productId: 'prod-berkah-59', name: 'Telur Ayam Negeri 1kg', price: 29000, qty: 6, subtotal: 174000 },
            { productId: 'prod-berkah-43', name: 'Indomie Goreng Original', price: 3100, qty: 20, subtotal: 62000 },
          ],
          total: 514000,
          tenderAmount: 550000,
          changeAmount: 36000,
          paymentMethod: 'TUNAI',
          cashierName: 'Bu Siti (Kasir Utama)',
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 4).toISOString(),
        },
        {
          id: 'ord-bkh-hist-2',
          orderNumber: 'TR-8720',
          tenantId: 'tenant-berkah-jaya',
          items: [
            { productId: 'prod-berkah-16', name: 'Minyak Sania 2L', price: 35000, qty: 8, subtotal: 280000 },
            { productId: 'prod-berkah-27', name: 'Gula Pasir Gulaku 1kg', price: 18000, qty: 12, subtotal: 216000 },
            { productId: 'prod-berkah-57', name: 'Kopi Kapal Api Spesial Mix (10s)', price: 15500, qty: 10, subtotal: 155000 },
          ],
          total: 651000,
          tenderAmount: 651000,
          changeAmount: 0,
          paymentMethod: 'QRIS',
          cashierName: 'Bu Siti (Kasir Utama)',
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 18).toISOString(),
        },
        {
          id: 'ord-bkh-hist-3',
          orderNumber: 'TR-8500',
          tenantId: 'tenant-berkah-jaya',
          items: [
            { productId: 'prod-berkah-3', name: 'Beras Setra Ramos Cap Bunga 5kg', price: 69500, qty: 10, subtotal: 695000 },
            { productId: 'prod-berkah-81', name: 'Gas Elpiji 3kg (Tabung Melon Refill)', price: 22000, qty: 8, subtotal: 176000 },
          ],
          total: 871000,
          tenderAmount: 900000,
          changeAmount: 29000,
          paymentMethod: 'TUNAI',
          cashierName: 'Bu Siti (Kasir Utama)',
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 50).toISOString(),
        },
      ];
      await ordersCol.insertMany(extraOrders);
    }
  } catch (err) {
    console.warn('ensureSeedOrdersForAdmin non-fatal:', err);
  }
}

export const DEFAULT_CASHIER_UNITS = [
  { name: 'Pieces / Buah', symbol: 'pcs', category: 'ECERAN', description: 'Satuan eceran barang satuan tunggal sembako kelontong' },
  { name: 'Bungkus', symbol: 'bks', category: 'ECERAN', description: 'Kemasan bungkus mie instan, garam, bumbu sachet, rokok' },
  { name: 'Sachet', symbol: 'sachet', category: 'ECERAN', description: 'Kemasan sachet kecil kopi instan, sampo, susu kental, bumbu' },
  { name: 'Renceng', symbol: 'rcg', category: 'KEMASAN', description: 'Ikatan renceng (biasanya berisi 10 atau 12 sachet renteng)' },
  { name: 'Dus / Karton', symbol: 'dus', category: 'KEMASAN', description: 'Kemasan kardus karton grosir pabrik (isi 24, 40, atau 48)' },
  { name: 'Slop', symbol: 'slp', category: 'KEMASAN', description: 'Kemasan slop rokok atau baterai (biasanya isi 10 bungkus)' },
  { name: 'Karung', symbol: 'karung', category: 'KEMASAN', description: 'Kemasan karung beras, tepung terigu, atau pakan ternak (5kg-50kg)' },
  { name: 'Botol', symbol: 'btl', category: 'VOLUME', description: 'Kemasan botol kecap, sirup, saus, minuman kemasan' },
  { name: 'Kaleng', symbol: 'klg', category: 'VOLUME', description: 'Kemasan kaleng susu kental manis, biskuit kaleng, sarden' },
  { name: 'Liter', symbol: 'ltr', category: 'VOLUME', description: 'Satuan takaran volume cairan minyak goreng curah atau bensin' },
  { name: 'Kilogram', symbol: 'kg', category: 'TIMBANGAN', description: 'Satuan timbangan baku berat (beras, gula pasir, telur, tepung curah)' },
  { name: 'Gram', symbol: 'gr', category: 'TIMBANGAN', description: 'Satuan timbangan kecil (bumbu dapur, rempah, cabai rawit)' },
  { name: 'Ons', symbol: 'ons', category: 'TIMBANGAN', description: 'Satuan timbangan pasar tradisional kelontong (1 ons = 100 gram)' },
  { name: 'Butir', symbol: 'btr', category: 'ECERAN', description: 'Satuan butir eceran seperti telur ayam butiran dan kelapa utuh' },
  { name: 'Ikat', symbol: 'ikt', category: 'IKATAN', description: 'Satuan ikatan sayur mayur dan dedaunan dapur bumbu' },
  { name: 'Pack / Pak', symbol: 'pck', category: 'KEMASAN', description: 'Kemasan pack plastik, mika, atau kotak per pack' },
  { name: 'Pouch', symbol: 'pouch', category: 'KEMASAN', description: 'Kemasan kantong berdiri (minyak goreng pouch, deterjen refill)' },
  { name: 'Cup / Gelas', symbol: 'cup', category: 'VOLUME', description: 'Kemasan cup gelas air mineral atau minuman siap minum' },
];

export async function seedInitialUnits(tenantId: string) {
  try {
    const existing = await unitsCol.countDocuments({ tenantId });
    if (existing > 0) return;

    const now = new Date().toISOString();
    const docs = DEFAULT_CASHIER_UNITS.map((u, idx) => ({
      id: `unit-${tenantId}-${u.symbol}-${idx + 1}`,
      tenantId,
      name: u.name,
      symbol: u.symbol.toLowerCase(),
      category: u.category,
      description: u.description,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    }));

    await unitsCol.insertMany(docs);
    console.log(`✅ Seeded ${docs.length} standard cashier units for tenant: ${tenantId}`);
  } catch (err) {
    console.warn(`seedInitialUnits non-fatal for ${tenantId}:`, err);
  }
}

export async function seedInitialActiveSessions() {
  try {
    const existing = await activeSessionsCol.countDocuments();
    if (existing > 0) return;

    const now = Date.now();
    const activeSessions = [
      {
        id: 'sess-seed-cashier-1',
        userId: 'user-cashier-1',
        userName: 'Bu Siti (Kasir Utama)',
        userEmail: 'kasir@berkahjaya.com',
        userRole: 'CASHIER',
        tenantId: 'tenant-berkah-jaya',
        tenantName: 'Berkah Jaya',
        accessJti: 'acc-user-cashier-1-seed-01',
        ipAddress: '192.168.1.105',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36',
        device: 'Desktop (Windows)',
        browser: 'Google Chrome 128',
        loginTime: new Date(now - 25 * 60 * 1000).toISOString(),
        lastActive: new Date(now - 2 * 60 * 1000).toISOString(),
        expiresAt: new Date(now + 23 * 60 * 60 * 1000).toISOString(),
        status: 'ACTIVE',
        createdAt: new Date(now - 25 * 60 * 1000).toISOString(),
      },
      {
        id: 'sess-seed-manager-1',
        userId: 'user-manager-1',
        userName: 'Bu Siti Rahma',
        userEmail: 'manager@berkahjaya.com',
        userRole: 'MANAGER',
        tenantId: 'tenant-berkah-jaya',
        tenantName: 'Berkah Jaya',
        accessJti: 'acc-user-manager-1-seed-02',
        ipAddress: '180.252.164.22',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
        device: 'Mobile (iOS iPhone)',
        browser: 'Mobile Safari 17.5',
        loginTime: new Date(now - 60 * 60 * 1000).toISOString(),
        lastActive: new Date(now - 8 * 60 * 1000).toISOString(),
        expiresAt: new Date(now + 23 * 60 * 60 * 1000).toISOString(),
        status: 'ACTIVE',
        createdAt: new Date(now - 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'sess-seed-manager-2',
        userId: 'user-manager-2',
        userName: 'Cak Holil (Owner)',
        userEmail: 'cak.holil@madura24.com',
        userRole: 'MANAGER',
        tenantId: 'tenant-madura-24jam',
        tenantName: 'Warung Madura 24 Jam',
        accessJti: 'acc-user-manager-2-seed-03',
        ipAddress: '114.122.204.89',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Chrome/127.0.0.0 Mobile Safari/537.36',
        device: 'Mobile (Android Galaxy)',
        browser: 'Chrome Mobile 127',
        loginTime: new Date(now - 45 * 60 * 1000).toISOString(),
        lastActive: new Date(now - 5 * 60 * 1000).toISOString(),
        expiresAt: new Date(now + 23 * 60 * 60 * 1000).toISOString(),
        status: 'ACTIVE',
        createdAt: new Date(now - 45 * 60 * 1000).toISOString(),
      },
      {
        id: 'sess-seed-cashier-2',
        userId: 'user-cashier-2',
        userName: 'Cak Mahmud',
        userEmail: 'kasir.mahmud@madura24.com',
        userRole: 'CASHIER',
        tenantId: 'tenant-madura-24jam',
        tenantName: 'Warung Madura 24 Jam',
        accessJti: 'acc-user-cashier-2-seed-04',
        ipAddress: '114.122.204.91',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/127.0.0.0',
        device: 'Desktop (Windows POS)',
        browser: 'Microsoft Edge 127',
        loginTime: new Date(now - 180 * 60 * 1000).toISOString(),
        lastActive: new Date(now - 14 * 60 * 1000).toISOString(),
        expiresAt: new Date(now + 21 * 60 * 60 * 1000).toISOString(),
        status: 'ACTIVE',
        createdAt: new Date(now - 180 * 60 * 1000).toISOString(),
      },
      {
        id: 'sess-seed-revoked-1',
        userId: 'user-cashier-guest',
        userName: 'Staf Magang Toko',
        userEmail: 'magang@berkahjaya.com',
        userRole: 'CASHIER',
        tenantId: 'tenant-berkah-jaya',
        tenantName: 'Berkah Jaya',
        accessJti: 'acc-user-cashier-guest-revoked',
        ipAddress: '192.168.1.120',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/128.0',
        device: 'Desktop (Windows)',
        browser: 'Mozilla Firefox 128',
        loginTime: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
        lastActive: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(now + 19 * 60 * 60 * 1000).toISOString(),
        status: 'REVOKED',
        revokedAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
        revokedBy: 'admin@kasirwarung.com',
        revokeReason: 'Sesi dinonaktifkan: Selesai jam shift operasional kasir.',
        createdAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      },
    ];

    await activeSessionsCol.insertMany(activeSessions);
    console.log(`✅ Seeded ${activeSessions.length} initial active & logged-in user sessions.`);
  } catch (err) {
    console.warn('seedInitialActiveSessions non-fatal:', err);
  }
}
