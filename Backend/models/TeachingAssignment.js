import mongoose from "mongoose";

const teachingAssignmentSchema = new mongoose.Schema({
   facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Faculty'
   },

   subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Subject'
   },

   academicYear: {
      type: String,
      required: true
   },

   semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8
   },

   semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester'
   },

   status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active'
   },

   section: {
      type: String,
      trim: true,
      default: 'A'
   },

   department: {
      type: String,
      trim: true
   },

   program: {
      type: String,
      trim: true,
      default: 'B.Tech'
   }
}, { timestamps: true });

teachingAssignmentSchema.index(
   { facultyId: 1, subjectId: 1, academicYear: 1, semester: 1, section: 1 },
   { unique: true }
);

teachingAssignmentSchema.index({ facultyId: 1, academicYear: 1, semester: 1 });
teachingAssignmentSchema.index({ subjectId: 1, academicYear: 1, semester: 1 });

export const TeachingAssignment = mongoose.model("TeachingAssignment", teachingAssignmentSchema);