import mongoose from 'mongoose';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let localMongo;

export async function connectDB() {
  mongoose.set('strictQuery', true);
  let uri = process.env.MONGO_URI;
  if (process.env.USE_LOCAL_MONGO === 'true') {
    const dbPath = path.resolve('data/mongodb-rs');
    await mkdir(dbPath, { recursive: true });
    localMongo = await MongoMemoryReplSet.create({
      instanceOpts: [{ port: 27018, dbName: 'playhub', dbPath, storageEngine: 'wiredTiger', launchTimeout: 60000 }],
      replSet: { count: 1, storageEngine: 'wiredTiger' }
    });
    uri = localMongo.getUri('playhub');
    console.log(`Project MongoDB replica set running with persistent data at ${dbPath}`);
  }
  if (!uri) throw new Error('Set MONGO_URI or USE_LOCAL_MONGO=true');
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}
