import mongoose from "mongoose";

const semesterSchema = new mongoose.Schema(
  {
    academicYear: {
      type: String,
      required: [true, "Academic year is required (e.g. 2025-2026)"],
      trim: true,
    },
    semesterNumber: {
      type: Number,
      required: [true, "Semester number is required"],
      min: [1, "Semester number must be at least 1"],
      max: [8, "Semester number cannot exceed 8"],
    },
    name: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending_enrollment", "active", "archived", "completed"],
      default: "",
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Ensure uniqueness of (academicYear, semesterNumber)
semesterSchema.index({ academicYear: 1, semesterNumber: 1 }, { unique: true });

// Auto-populate default name if not provided
semesterSchema.pre("save", function () {
  if (!this.name) {
    this.name = `Academic Year ${this.academicYear} - Semester ${this.semesterNumber}`;
  }
});

export const Semester = mongoose.model("Semester", semesterSchema);
