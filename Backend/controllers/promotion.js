import mongoose from "mongoose";
import { Student } from "../models/Student.js";
import { AcademicSession } from "../models/AcademicSession.js";
import { TeachingAssignment } from "../models/TeachingAssignment.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";
import { AuditLog } from "../models/AuditLog.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { enrollInOfferings } from "../utils/enrollInOfferings.js";

export const promoteStudentYear = asyncHandler(async (req, res) => {
  const { studentId, section = "A", preview = false } = req.body;
  const year = req.body.newYear ?? req.body.targetYear;
  const semester = Number(req.body.newSemester ?? req.body.targetSemester ?? (2 * Number(year) - 1));
  if (!Number.isInteger(semester) || semester < 1 || semester > 8 ||
    (year != null && Number(year) !== Math.ceil(semester / 2))) throw new ApiError(400, "Choose a valid target semester and year.");
  const result = await mongoose.connection.transaction(async session => {
    const student = await Student.findById(studentId).select("-password").session(session);
    if (!student) throw new ApiError(404, "Student unavailable.");
    if (student.currentSemester > semester) throw new ApiError(409, "Cannot promote to an earlier semester.");
    const term = await AcademicSession.findOne().session(session);
    if (!term?.activeSemesters.includes(semester) || (req.body.academicYear && req.body.academicYear !== term.academicYear)) {
      throw new ApiError(400, "Select a semester in the active academic session.");
    }
    const group = section.trim().toUpperCase();
    const all = await TeachingAssignment.find({ semester, academicYear: term.academicYear, section: group,
      status: { $ne: "archived" } }).populate("subjectId").session(session);
    const courses = all.map(a => a.subjectId).filter(s => s?.department === student.department);
    if (!courses.length) throw new ApiError(400, "Assign an instructor to a target course first.");
    const archive = { studentId, status: { $in: ["active", "enrolled"] },
      $or: [{ academicYear: { $ne: term.academicYear } }, { semester: { $ne: semester } }] };
    const transitionedOldEnrollments = await StudentEnrollment.countDocuments(archive).session(session);
    const existing = await StudentEnrollment.countDocuments({ studentId, semester, academicYear: term.academicYear,
      status: { $in: ["active", "enrolled"] }, subjectId: { $in: courses.map(s => s._id) } }).session(session);
    const enrollments = { created: courses.length - existing, existing, total: courses.length,
      courses: courses.map(({ _id, code, name }) => ({ _id, code, name })) };
    if (!preview && (student.currentSemester !== semester || transitionedOldEnrollments || enrollments.created)) {
      await StudentEnrollment.updateMany(archive, { status: "archived" }, { session });
      student.currentSemester = semester;
      student.section = group;
      student.year = Math.ceil(semester / 2);
      await student.save({ session });
      await enrollInOfferings(student, session, group);
      await AuditLog.create([{ action: "STUDENT_PROMOTED", category: "CURRICULUM",
        actor: String(req.user._id), details: "Promoted one student to semester " + semester }], { session });
    }
    return { student, promotedTo: { semester, year: Math.ceil(semester / 2), academicYear: term.academicYear },
      transitionedOldEnrollments, enrollments };
  });
  res.json({ data: result, message: preview ? "Promotion preview" : "Promotion complete" });
});
