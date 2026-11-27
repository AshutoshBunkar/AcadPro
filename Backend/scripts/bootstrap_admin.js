import "dotenv/config";
import mongoose from "mongoose";
import { configureAdmin } from "../utils/fixedAdmin.js";

try {
  await mongoose.connect(process.env.MONGO_DB_URL);
  await configureAdmin();
  console.info("Configured admin account is ready.");
} finally {
  await mongoose.disconnect();
}
