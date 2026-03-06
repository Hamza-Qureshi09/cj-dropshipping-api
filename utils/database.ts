import { Db, MongoClient, MongoClientOptions } from "mongodb";
import { config } from "../config/config.ts";

let db: Db | null = null;
let client: MongoClient | null = null;

export async function connectDB(): Promise<Db> {
  if (client && db) {
    return db;
  }

  const uri = config.mongoUri;
  const dbName = config.mongoDbName;

  console.log("Connecting to MongoDB...");
  client = new MongoClient(
    uri,
    {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true,
    } as MongoClientOptions,
  );

  try {
    await client.connect();
    db = client.db(dbName);
  } catch (error) {
    if (client) {
      await client.close().catch(() => {});
      client = null;
    }
    db = null;
    throw error;
  }

  await setupIndexes(db);
  console.log(`✅ MongoDB connected → ${config.mongoDbName}`);
  return db;
}

async function setupIndexes(database: Db): Promise<void> {
  await database.collection("cj_tokens").createIndexes([{
    key: { updatedAt: 1 },
    name: "updatedAt_idx",
  }]);

  // Product cache: TTL auto-expire
  await database.collection("product_cache").createIndexes([
    { key: { pid: 1 }, name: "pid_unique", unique: true },
    { key: { expiresAt: 1 }, name: "ttl_expire", expireAfterSeconds: 0 },
  ]);

  // Orders
  await database.collection("orders").createIndexes([
    { key: { storeOrderId: 1 }, name: "storeOrderId_unique", unique: true },
    { key: { cjOrderId: 1 }, name: "cjOrderId_idx" },
    { key: { status: 1 }, name: "status_idx" },
    { key: { createdAt: -1 }, name: "createdAt_desc" },
  ]);

  console.log("Indexes ready");
}

export function getDB(): Db {
  if (!db) throw new Error("DB not connected. Call connectDB() first.");
  return db;
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    db = null;
    client = null;
    console.log("MongoDB connection closed");
  }
}
