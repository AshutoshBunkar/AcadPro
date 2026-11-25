import mongoose from "mongoose";

const academicSessionSchema = new mongoose.Schema(
  {
    academicYear: {
      type: String,
      required: true,
      trim: true,
    },

    term: {
      type: String,
      enum: ["ODD", "EVEN"],
      default: "ODD",
    },

    termName: {
      type: String,
      default: "Autumn / Odd Term",
    },

    activeSemesters: {
      type: [Number],
      default: [1, 3, 5, 7],
    },

    // Optional legacy field for backwards compatibility
    semester: {
      type: Number,
      min: 1,
      max: 8,
      default: null,
    },
  },
  { timestamps: true }
);

export const AcademicSession = mongoose.model("AcademicSession", academicSessionSchema);
export default AcademicSession;