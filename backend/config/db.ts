import { MongoClient, Db } from 'mongodb';
import { MemoryCollection } from '../mongoMemoryFallback.ts';
import { MONGODB_URI } from './env.ts';
import {
  seedMongoData,
  seedInitialActivityLogs,
  seedInitialLoginHistory,
  ensureSeedOrdersForAdmin,
  seedInitialUnits,
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

export async function connectDB() {
  if (!MONGODB_URI) {
    console.log('🛡️ No MONGODB_URI provided. Running on in-memory engine.');
    const count = await tenantsCol.countDocuments();
    if (count === 0) {
      await seedMongoData();
    }
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

    // Create Indexes
    await tenantsCol.createIndex({ slug: 1 }, { unique: true }).catch(() => {});
    await usersCol.createIndex({ email: 1 }, { unique: true }).catch(() => {});
    await productsCol.createIndex({ tenantId: 1, sku: 1 }, { unique: true }).catch(() => {});
    await productsCol.createIndex({ tenantId: 1, category: 1 }).catch(() => {});
    await ordersCol.createIndex({ tenantId: 1, createdAt: -1 }).catch(() => {});
    await savedOrdersCol.createIndex({ tenantId: 1, createdAt: -1 }).catch(() => {});
    await activityLogsCol.createIndex({ tenantId: 1, createdAt: -1 }).catch(() => {});
    await activityLogsCol.createIndex({ tenantId: 1, module: 1 }).catch(() => {});
    await loginHistoryCol.createIndex({ userId: 1, createdAt: -1 }).catch(() => {});
    await loginHistoryCol.createIndex({ tenantId: 1, createdAt: -1 }).catch(() => {});
    await loginHistoryCol.createIndex({ createdAt: -1 }).catch(() => {});
    await unitsCol.createIndex({ tenantId: 1, symbol: 1 }, { unique: true }).catch(() => {});
    await unitsCol.createIndex({ tenantId: 1, name: 1 }).catch(() => {});

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
  }
}

export const getDB = () => db;
export const getMongoClient = () => mongoClient;
export const isMongoDatabaseLive = () => isMongoLive;
export { ensureSeedOrdersForAdmin };
