import mongoose from "mongoose";

const subjectRequestSchema = new mongoose.Schema(
  {
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: [true, "Faculty ID is required"],
      index: true,
    },
    code: {
      type: String,
      required: [true, "Subject code is required"],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },
    semester: {
      type: Number,
      required: [true, "Target semester is required"],
      min: [1, "Semester must be between 1 and 8"],
      max: [8, "Semester must be between 1 and 8"],
      default: 1,
    },
    year: {
      type: Number,
      default: function () {
        return Math.ceil((this.semester || 1) / 2);
      },
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
      default: "2026-2027",
    },
    section: {
      type: String,
      trim: true,
      uppercase: true,
      default: "A",
    },
    credits: {
      type: Number,
      default: 3,
      min: 1,
      max: 8,
    },
    program: {
      type: String,
      trim: true,
      default: "B.Tech",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    adminRemarks: {
      type: String,
      default: "",
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    reviewedAt: {
      type: Date,
    },
    createdSubjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
    },
    createdTeachingAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeachingAssignment",
    },
  },
  { timestamps: true }
);

// Prevent duplicate pending requests for the same course offering
subjectRequestSchema.index(
  { code: 1, academicYear: 1, semester: 1, section: 1, status: 1 }
);

export const SubjectRequest = mongoose.model("SubjectRequest", subjectRequestSchema);
export default SubjectRequest;

