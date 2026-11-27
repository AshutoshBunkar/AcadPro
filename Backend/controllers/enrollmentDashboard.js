import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { StudentEnrollment } from "../models/StudentEnrollment.js";
import { TeachingAssignment } from "../models/TeachingAssignment.js";
import { AcademicSession } from "../models/AcademicSession.js";
import { Topic } from "../models/Topic.js";
import { Lecture } from "../models/Lecture.js";
import { Subject } from "../models/Subject.js";
import { enrollmentOffering, readable, referenceFilter, lectureScope } from "../utils/courseAccess.js";
import { ApiError } from "../utils/ApiError.js";

async function placement(user) {
  const term = await AcademicSession.findOne();
  const rows = await StudentEnrollment.find({ studentId: user._id, status: { $in: readable } })
    .populate("subjectId").populate("facultyId", "name designation").sort({ academicYear: -1, semester: -1 });
  const current = [], archived = [];
  for (const row of rows.filter(r => r.subjectId)) {
    const active = term?.academicYear === row.academicYear && term.activeSemesters.includes(row.semester) &&
      row.semester === user.currentSemester && ["active", "enrolled"].includes(row.status);
    (active ? current : archived).push(row);
  }
  return { term, current, archived };
}
async function course(row) {
  const subject = row.subjectId;
  const offeringId = await enrollmentOffering(row);
  const lectures = offeringId ? await Lecture.find({ offeringId }).select("title topicId").sort({ createdAt: -1 }) : [];
  return { _id: subject._id, subjectId: subject._id, subject, code: subject.code, name: subject.name,
    department: subject.department, enrollmentId: row._id, offeringId, semester: row.semester,
    academicYear: row.academicYear, section: row.section, faculty: row.facultyId, status: row.status,
    facultyName: row.facultyId?.name || "Instructor pending", latestLecture: lectures[0] || null,
    lecturesCount: lectures.length, topicsCount: new Set(lectures.map(l => String(l.topicId))).size };
}
async function references(user) {
  const ids = await Lecture.find(referenceFilter(user)).distinct("offeringId");
  const offerings = await TeachingAssignment.find({ _id: { $in: ids } }).populate("subjectId").populate("facultyId", "name");
  return Promise.all(offerings.filter(a => a.subjectId).map(async a => ({
    _id: a.subjectId._id, subjectId: a.subjectId._id, subject: a.subjectId, code: a.subjectId.code,
    name: a.subjectId.name, offeringId: a._id, facultyName: a.facultyId?.name,
    academicYear: a.academicYear, sourceSemester: a.semester, semester: a.semester, isReferenceResource: true,
    lecturesCount: await Lecture.countDocuments({ offeringId: a._id, ...referenceFilter(user) }),
  })));
}
export const getStudentCurrentCourses = asyncHandler(async (req, res) => {
  const { term, current } = await placement(req.user);
  const courses = await Promise.all(current.map(course));
  res.json({ data: { courses, isAvailable: !!courses.length, isPendingEnrollment: !courses.length,
    validationMessage: courses.length ? "" : "Your enrollment is pending. Your courses will appear here once assigned.",
    session: { academicYear: term?.academicYear, semester: req.user.currentSemester } } });
});
export const getStudentAccessibleResources = asyncHandler(async (req, res) => res.json({ data: await references(req.user) }));
export const getStudentPastSemesters = asyncHandler(async (req, res) => {
  const { archived } = await placement(req.user);
  const courses = [...await Promise.all(archived.map(course)), ...await references(req.user)];
  const groups = new Map();
  for (const item of courses) {
    const key = [item.academicYear, item.semester, Boolean(item.isReferenceResource)].join("/");
    if (!groups.has(key)) groups.set(key, { key, semesterNumber: item.semester, academicYear: item.academicYear,
      name: item.isReferenceResource ? "Reference lectures" : "Archived courses", isArchived: true, isReadOnly: true, courses: [] });
    groups.get(key).courses.push(item);
  }
  res.json({ data: [...groups.values()] });
});
export const getStudentCourse = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const { current, archived } = await placement(req.user);
  const matching = [...current, ...archived].filter(e => String(e.subjectId._id) === subjectId);
  const offeringId = req.query.offeringId;
  if (offeringId !== undefined && !mongoose.isObjectIdOrHexString(offeringId)) {
    throw new ApiError(400, "Invalid course offering.");
  }
  const offeringIds = offeringId ? await Promise.all(matching.map(enrollmentOffering)) : [];
  const row = offeringId ? matching[offeringIds.findIndex(id => id?.equals(offeringId))] : matching[0];
  const topics = await Topic.find({ subjectId }).sort({ order: 1 });
  const scope = await lectureScope(req, subjectId, offeringId);
  const lectures = await Lecture.find({ topicId: { $in: topics.map(t => t._id) }, ...scope });
  if (!row && !lectures.length) throw new ApiError(403, "Course unavailable.");
  const subject = row?.subjectId || await Subject.findById(subjectId);
  const details = row ? await course(row) : {};
  res.json({ data: { ...details, subject, name: subject.name, code: subject.code, enrollment: row,
    isCurrent: current.includes(row), isReadOnly: !current.includes(row), isReferenceResource: !row,
    topics: topics.filter(t => row || lectures.some(l => String(l.topicId) === String(t._id))), lectures } });
});
