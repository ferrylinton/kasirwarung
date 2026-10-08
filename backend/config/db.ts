import { MongoClient, Db } from 'mongodb';
import { MemoryCollection } from '../mongoMemoryFallback.ts';
import { MONGODB_URI } from './env.ts';
import {
  seedMongoData,
  seedInitialActivityLogs,
  seedInitialLoginHistory,
  ensureSeedOrdersForAdmin,
  seedInitialUnits,
  seedInitialActiveSessions,
} from './seed.ts';

let mongoClient: MongoClient | null = null;
let db: Db | null = null;
let isMongoLive = false;

// Collection handles (fall back to MemoryCollection until real MongoDB connects)
export let tenantsCol: any = new MemoryCollection('tenants');
export let usersCol: any = new MemoryCollection('users');
export let productsCol: any = new MemoryCollection('products');
export let ordersCol: any = new MemoryCollection('orders');
export let savedOrdersCol: any = new MemoryCollection('saved_orders');
export let tokensCol: any = new MemoryCollection('tokens');
export let activityLogsCol: any = new MemoryCollection('activity_logs');
export let loginHistoryCol: any = new MemoryCollection('login_history');
export let unitsCol: any = new MemoryCollection('units');
export let activeSessionsCol: any = new MemoryCollection('active_sessions');

export async function connectDB() {
  // Always ensure in-memory fallback collections are seeded immediately so server can respond right away
  const memCount = await tenantsCol.countDocuments().catch(() => 0);
  if (memCount === 0) {
    await seedMongoData().catch(() => {});
    await seedInitialUnits('tenant-berkah-jaya').catch(() => {});
    await seedInitialUnits('tenant-madura-24jam').catch(() => {});
    await seedInitialActiveSessions().catch(() => {});
  }

  if (!MONGODB_URI) {
    console.log('🛡️ No MONGODB_URI provided. Running on in-memory engine.');
    return;
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    mongoClient = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 2500,
    });
    await mongoClient.connect();
    db = mongoClient.db('kasirwarungdb');

    tenantsCol = db.collection('tenants');
    usersCol = db.collection('users');
    productsCol = db.collection('products');
    ordersCol = db.collection('orders');
    savedOrdersCol = db.collection('saved_orders');
    tokensCol = db.collection('tokens');
    activityLogsCol = db.collection('activity_logs');
    loginHistoryCol = db.collection('login_history');
    unitsCol = db.collection('units');
    activeSessionsCol = db.collection('active_sessions');

    // Create Indexes in parallel
    await Promise.all([
      tenantsCol.createIndex({ slug: 1 }, { unique: true }).catch(() => {}),
      usersCol.createIndex({ email: 1 }, { unique: true }).catch(() => {}),
      productsCol.createIndex({ tenantId: 1, sku: 1 }, { unique: true }).catch(() => {}),
      productsCol.createIndex({ tenantId: 1, category: 1 }).catch(() => {}),
      ordersCol.createIndex({ tenantId: 1, createdAt: -1 }).catch(() => {}),
      savedOrdersCol.createIndex({ tenantId: 1, createdAt: -1 }).catch(() => {}),
      activityLogsCol.createIndex({ tenantId: 1, createdAt: -1 }).catch(() => {}),
      activityLogsCol.createIndex({ tenantId: 1, module: 1 }).catch(() => {}),
      loginHistoryCol.createIndex({ userId: 1, createdAt: -1 }).catch(() => {}),
      activeSessionsCol.createIndex({ accessJti: 1 }, { unique: true }).catch(() => {}),
      activeSessionsCol.createIndex({ userId: 1, status: 1 }).catch(() => {}),
      activeSessionsCol.createIndex({ tenantId: 1, status: 1 }).catch(() => {}),
      loginHistoryCol.createIndex({ tenantId: 1, createdAt: -1 }).catch(() => {}),
      loginHistoryCol.createIndex({ createdAt: -1 }).catch(() => {}),
      unitsCol.createIndex({ tenantId: 1, symbol: 1 }, { unique: true }).catch(() => {}),
      unitsCol.createIndex({ tenantId: 1, name: 1 }).catch(() => {}),
    ]);

    isMongoLive = true;
    console.log('✅ Connected to MongoDB successfully!');

    // Check if initial seeding is needed
    const tenantCount = await tenantsCol.countDocuments();
    if (tenantCount === 0) {
      console.log('🌱 Seeding initial data to MongoDB...');
      await seedMongoData();
    } else {
      console.log(`📊 Found ${tenantCount} existing tenants in MongoDB.`);
      await ordersCol.updateMany({}, {
        $unset: {
          subtotal: '',
          discount: '',
          paymentStatus: '',
          customerName: '',
          customerNote: '',
        },
      }).catch(() => {});
      await productsCol.updateMany({}, {
        $unset: {
          description: '',
        },
      }).catch(() => {});
      const actCount = await activityLogsCol.countDocuments();
      if (actCount === 0) {
        await seedInitialActivityLogs('tenant-berkah-jaya');
      }
      const logHistCount = await loginHistoryCol.countDocuments();
      if (logHistCount === 0) {
        await seedInitialLoginHistory();
      }
      const unitCount = await unitsCol.countDocuments();
      if (unitCount === 0) {
        await seedInitialUnits('tenant-berkah-jaya');
        await seedInitialUnits('tenant-madura-24jam');
      }
      await ensureSeedOrdersForAdmin();
    }
    await seedInitialActiveSessions();
  } catch (err: any) {
    console.warn('⚠️ MongoDB connection warning:', err.message);
    console.log('🛡️ Activating MongoDB-compatible In-Memory engine for KasirWarung...');
    isMongoLive = false;
    const count = await tenantsCol.countDocuments();
    if (count === 0) {
      await seedMongoData();
      await seedInitialUnits('tenant-berkah-jaya');
      await seedInitialUnits('tenant-madura-24jam');
      console.log('✅ Seeded KasirWarung initial dataset into MongoDB-compatible engine.');
    } else {
      const actCount = await activityLogsCol.countDocuments();
      if (actCount === 0) {
        await seedInitialActivityLogs('tenant-berkah-jaya');
      }
      const logHistCount = await loginHistoryCol.countDocuments();
      if (logHistCount === 0) {
        await seedInitialLoginHistory();
      }
      const unitCount = await unitsCol.countDocuments();
      if (unitCount === 0) {
        await seedInitialUnits('tenant-berkah-jaya');
        await seedInitialUnits('tenant-madura-24jam');
      }
      await ensureSeedOrdersForAdmin();
    }
    await seedInitialActiveSessions();
  }
}

export const getDB = () => db;
export const getMongoClient = () => mongoClient;
export const isMongoDatabaseLive = () => isMongoLive;
export { ensureSeedOrdersForAdmin };
