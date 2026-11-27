import mongoose from "mongoose";
import { createHash } from "node:crypto";
import { ApiError } from "../utils/ApiError.js";

const schema = new mongoose.Schema({
  _id: String, count: Number, purgeAt: { type: Date, expires: 0 },
});
const Bucket = mongoose.model("ActivationLimit", schema);

export async function limitActivation(req, res, next) {
  const minute = Math.floor(Date.now() / 60_000);
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  for (const identity of [req.ip, ...(email ? ["email:" + email] : [])]) {
    const key = createHash("sha256").update(identity + ":" + minute).digest("hex");
    const bucket = await Bucket.findByIdAndUpdate(key, {
      $inc: { count: 1 }, $setOnInsert: { purgeAt: new Date((minute + 2) * 60_000) },
    }, { upsert: true, new: true });
    if (bucket.count > 15) throw new ApiError(429, "Please try again in a minute.");
  }
  next();
}
