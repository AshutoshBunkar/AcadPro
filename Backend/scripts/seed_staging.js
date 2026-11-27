import "dotenv/config";
import mongoose from "mongoose";
import { validateConfig } from "../utils/config.js";
import { seedFixture } from "./demoFixture.js";

if (process.env.APP_ENV !== "staging" || !process.env.STAGING_DEMO_PASSWORD || process.env.STAGING_DEMO_PASSWORD.length < 16) {
  throw Error("Set APP_ENV=staging and provide a unique STAGING_DEMO_PASSWORD of at least 16 characters.");
}
validateConfig();
await mongoose.connect(process.env.MONGO_DB_URL);
try {
  const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of collections) {
    if (await mongoose.connection.db.collection(name).findOne({}, { projection: { _id: 1 } })) {
      throw Error("Choose an empty staging database for the synthetic demo.");
    }
  }
  await seedFixture(process.env.STAGING_DEMO_PASSWORD);
  console.log("Synthetic staging roster and two course offerings created.");
} finally { await mongoose.disconnect(); }
