import { AcademicSession } from "../models/AcademicSession.js";
import { TeachingAssignment } from "../models/TeachingAssignment.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";

export async function enrollInOfferings(student, session, section = "A") {
  const term = await AcademicSession.findOne().session(session);
  if (!term?.activeSemesters.includes(student.currentSemester)) return [];
  const offerings = await TeachingAssignment.find({ academicYear: term.academicYear, semester: student.currentSemester,
    section, status: { $ne: "archived" } }).populate("subjectId").session(session);
  const matching = offerings.filter(a => a.subjectId?.department === student.department);
  for (const a of matching) {
    await StudentEnrollment.updateOne({ studentId: student._id, subjectId: a.subjectId._id,
      academicYear: term.academicYear, semester: a.semester }, { $set: { semesterId: a.semesterId,
        teachingAssignmentId: a._id, facultyId: a.facultyId, status: "enrolled", section,
        department: student.department, program: a.program } }, { upsert: true, session });
  }
  return matching;
}
