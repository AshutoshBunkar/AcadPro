import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "./Backend/.env" });

import { AcademicSession } from "../models/AcademicSession.js";
import { Semester } from "../models/Semester.js";
import { Subject } from "../models/Subject.js";
import { Student } from "../models/Student.js";
import { Faculty } from "../models/Faculty.js";
import { TeachingAssignment } from "../models/TeachingAssignment.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";

async function run() {
  await mongoose.connect(process.env.MONGO_DB_URL);
  console.log("Connected to MongoDB.");

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("Collections in DB:", collections.map(c => c.name));

  console.log("\n=== AcademicSession ===");
  const sessions = await AcademicSession.find().lean();
  console.log(sessions);

  console.log("\n=== Semesters ===");
  const semesters = await Semester.find().lean();
  console.log(semesters);

  console.log("\n=== Subjects ===");
  const subjects = await Subject.find().lean();
  console.log(subjects.map(s => ({ _id: s._id, code: s.code, name: s.name, dept: s.department, year: s.year, allowedSemesters: s.allowedSemesters })));

  console.log("\n=== Faculty ===");
  const faculty = await Faculty.find({}, { name: 1, email: 1, designation: 1 }).lean();
  console.log(faculty);

  console.log("\n=== Students ===");
  const students = await Student.find({}, { name: 1, email: 1, department: 1, year: 1, currentSemester: 1 }).lean();
  console.log(students);

  console.log("\n=== Teaching Assignments ===");
  const tas = await TeachingAssignment.find().populate("facultyId", "name").populate("subjectId", "name code").lean();
  console.log(tas.map(t => ({
    faculty: t.facultyId?.name,
    subject: `${t.subjectId?.code} (${t.subjectId?.name})`,
    sem: t.semester,
    ay: t.academicYear,
    status: t.status
  })));

  console.log("\n=== Student Enrollments Grouped ===");
  const enrollmentsGrouped = await StudentEnrollment.aggregate([
    { $group: { _id: { ay: "$academicYear", sem: "$semester", status: "$status" }, count: { $sum: 1 } } }
  ]);
  console.log(enrollmentsGrouped);

  const enrollmentsSample = await StudentEnrollment.find().populate("studentId", "name currentSemester").populate("subjectId", "code name").lean();
  console.log("\n=== Enrollments Detail (All) ===");
  console.log(enrollmentsSample.map(e => ({
    student: `${e.studentId?.name} (Current Sem ${e.studentId?.currentSemester})`,
    subject: e.subjectId?.code,
    sem: e.semester,
    ay: e.academicYear,
    status: e.status
  })));

  await mongoose.disconnect();
}

run().catch(console.error);
