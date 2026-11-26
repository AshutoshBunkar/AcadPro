import mongoose from "mongoose";

// Each approved identity has at most one outstanding activation challenge.
const schema = new mongoose.Schema({
  mis: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  semester: { type: Number, required: true, min: 1, max: 8 },
  department: { type: String, required: true },
  activationDigest: { type: String, unique: true, sparse: true },
  sentAt: Date,
  expiresAt: Date,
  activatedAt: Date,
});
export const StudentRoster = mongoose.model("StudentRoster", schema);
