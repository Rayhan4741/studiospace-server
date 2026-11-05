import { MongoClient, Db } from 'mongodb';
import { ENV } from './env';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) return db;

  try {
    client = new MongoClient(ENV.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db(ENV.DB_NAME);
    console.log(`[Database] Successfully connected to MongoDB: ${ENV.DB_NAME}`);
  } catch (error: any) {
    console.warn(`[Database] Primary MongoDB connection failed (${error.message}). Falling back to local MongoDB...`);
    try {
      client = new MongoClient('mongodb://127.0.0.1:27017/studiospace', {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });
      await client.connect();
      db = client.db(ENV.DB_NAME);
      console.log(`[Database] Successfully connected to fallback local MongoDB: ${ENV.DB_NAME}`);
    } catch (fallbackError) {
      console.error('[Database] Both primary and fallback MongoDB connections failed:', fallbackError);
      throw error;
    }
  }

  // Create indexes safely
  try {
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('studios').createIndex({ ownerId: 1 });
    await db.collection('studios').createIndex({ category: 1 });
    await db.collection('studios').createIndex({ hourlyRate: 1 });
    await db.collection('studios').createIndex({ createdAt: -1 });
    await db.collection('studios').createIndex({ title: 'text', location: 'text', overview: 'text' });
    await db.collection('bookings').createIndex({ studioId: 1, bookingDate: 1, status: 1 });
    await db.collection('bookings').createIndex({ creatorId: 1 });
    await db.collection('bookings').createIndex({ ownerId: 1 });
    console.log('[Database] Indexes ensured successfully');
  } catch (indexErr) {
    console.warn('[Database] Warning creating indexes:', indexErr);
  }

  return db;
}

export function getDB(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[Database] MongoDB connection closed');
  }
}
