import mongoose from "mongoose";

// The registrar owns both identifiers and the initial academic placement.
const schema = new mongoose.Schema({
  mis: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  semester: { type: Number, required: true, min: 1, max: 8 },
  department: { type: String, required: true },
  activatedAt: Date,
});
export const StudentRoster = mongoose.model("StudentRoster", schema);
