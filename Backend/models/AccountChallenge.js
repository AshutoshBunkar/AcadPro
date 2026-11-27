import mongoose from "mongoose";

const challenge = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, required: true },
  role: { type: String, enum: ["student", "faculty", "admin"], required: true },
  purpose: { type: String, enum: ["activate", "invite", "confirm", "reset", "email"], required: true },
  email: { type: String, required: true },
  originalEmail: { type: String, required: true },
  digest: { type: String, required: true, unique: true },
  sentAt: Date, consumedAt: Date,
  expiresAt: { type: Date, expires: 0 },
  delivery: { type: String, enum: ["pending", "sent", "failed"] },
});
challenge.index({ owner: 1, role: 1, purpose: 1 }, { unique: true });
export const AccountChallenge = mongoose.model("AccountChallenge", challenge);
