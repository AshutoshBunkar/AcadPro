import { TeachingAssignment } from "../models/TeachingAssignment.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";
import { Lecture } from "../models/Lecture.js";
import { Topic } from "../models/Topic.js";
import { AcademicSession } from "../models/AcademicSession.js";
import { ApiError } from "./ApiError.js";

export const readable = ["active", "enrolled", "completed", "archived"];
export function referenceFilter(student) {
  return { referenceSemesters: student.currentSemester, department: student.department };
}
export async function enrollmentOffering(enrollment) {
  if (enrollment.teachingAssignmentId) return enrollment.teachingAssignmentId;
  const matches = await TeachingAssignment.find({ subjectId: enrollment.subjectId?._id || enrollment.subjectId,
    semester: enrollment.semester, academicYear: enrollment.academicYear, section: enrollment.section || "A",
    ...(enrollment.facultyId ? { facultyId: enrollment.facultyId._id || enrollment.facultyId } : {}) }).limit(2);
  return matches.length === 1 ? matches[0]._id : null;
}
export async function lectureScope(req, subjectId, offeringId) {
  if (req.auth.role === "admin") return offeringId ? { offeringId } : {};
  if (req.auth.role === "faculty") {
    const ids = await TeachingAssignment.find({ facultyId: req.user._id, ...(subjectId ? { subjectId } : {}) }).distinct("_id");
    const selected = offeringId ? ids.filter(id => String(id) === String(offeringId)) : ids;
    return { $or: [{ offeringId: { $in: selected } }, ...(offeringId ? [] : [{ uploadedBy: req.user._id, offeringId: null }])] };
  }
  const rows = await StudentEnrollment.find({ studentId: req.user._id, status: { $in: readable }, ...(subjectId ? { subjectId } : {}) });
  const ids = (await Promise.all(rows.map(enrollmentOffering))).filter(Boolean);
  return { $or: [{ offeringId: { $in: ids } }, referenceFilter(req.user)],
    ...(offeringId ? { offeringId } : {}) };
}
export async function accessibleLecture(req, id) {
  const scope = await lectureScope(req);
  const lecture = await Lecture.findOne({ _id: id, ...scope });
  if (!lecture) throw new ApiError(404, "Lecture unavailable.");
  return lecture;
}
export async function canDiscuss(req, lecture) {
  const term = await AcademicSession.findOne();
  if (!term?.activeSemesters.includes(req.user.currentSemester)) return false;
  const topic = await Topic.findById(lecture.topicId);
  const rows = await StudentEnrollment.find({ studentId: req.user._id, subjectId: topic?.subjectId,
    academicYear: term.academicYear, semester: req.user.currentSemester, status: { $in: ["enrolled", "active"] } });
  for (const row of rows) {
    const id = await enrollmentOffering(row);
    if (id && String(id) === String(lecture.offeringId)) return true;
  }
  return false;
}
