import mongoose from "mongoose";

const studentEnrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
    },
    teachingAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeachingAssignment",
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
    },
    status: {
      type: String,
      enum: ["enrolled", "active", "completed", "dropped", "archived"],
      default: "enrolled",
    },
    section: {
      type: String,
      trim: true,
      default: "A",
    },
    department: {
      type: String,
      trim: true,
    },
    program: {
      type: String,
      trim: true,
      default: "B.Tech",
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Prevent duplicate enrollment for the same student, subject, academic year, and semester
studentEnrollmentSchema.index(
  { studentId: 1, subjectId: 1, academicYear: 1, semester: 1 },
  { unique: true }
);

// Secondary indices for quick lookup of all enrollments in a given academic term, offering, or faculty
studentEnrollmentSchema.index({ academicYear: 1, semester: 1 });
studentEnrollmentSchema.index({ subjectId: 1, academicYear: 1, semester: 1 });
studentEnrollmentSchema.index({ facultyId: 1, academicYear: 1, semester: 1 });

export const StudentEnrollment = mongoose.model(
  "StudentEnrollment",
  studentEnrollmentSchema
);
