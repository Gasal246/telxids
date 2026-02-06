import { MongoClient } from "mongodb";

let mongoClientPromise;

export async function getMongoClient() {
  if (mongoClientPromise) return mongoClientPromise;

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI (set it in your environment or .env)");
  }

  const client = new MongoClient(mongoUri, { ignoreUndefined: true });
  mongoClientPromise = client.connect();
  return mongoClientPromise;
}

export async function getDb() {
  const dbName = process.env.MONGODB_DB || "texlids";
  const client = await getMongoClient();
  return client.db(dbName);
}

