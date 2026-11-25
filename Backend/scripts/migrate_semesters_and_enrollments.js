import mongoose from "mongoose";
import "dotenv/config";
import { AcademicSession } from "../models/AcademicSession.js";
import { Semester } from "../models/Semester.js";
import { Subject } from "../models/Subject.js";
import { Student } from "../models/Student.js";
import { TeachingAssignment } from "../models/TeachingAssignment.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";

async function runMigration() {
  console.log("=== Acadex Semester & Enrollment Migration Starting ===");
  await mongoose.connect(process.env.MONGO_DB_URL);
  console.log("Connected to MongoDB Atlas");

  // 1. Sync or create AcademicSession & Current Semester
  let currentSession = await AcademicSession.findOne();
  if (!currentSession) {
    currentSession = await AcademicSession.create({
      academicYear: "2025-2026",
      semester: 1,
    });
    console.log("Created baseline AcademicSession: 2025-2026, Semester 1");
  } else {
    console.log(
      `Found existing AcademicSession: AY ${currentSession.academicYear}, Sem ${currentSession.semester}`
    );
  }

  // 2. Ensure Semester document exists for current session
  let currentSemDoc = await Semester.findOne({
    academicYear: currentSession.academicYear,
    semesterNumber: currentSession.semester,
  });

  if (!currentSemDoc) {
    currentSemDoc = await Semester.create({
      academicYear: currentSession.academicYear,
      semesterNumber: currentSession.semester,
      name: `AY ${currentSession.academicYear} - Semester ${currentSession.semester}`,
      isCurrent: true,
      status: "pending_enrollment",
    });
    console.log("Created initial current Semester document");
  } else {
    currentSemDoc.isCurrent = true;
    await currentSemDoc.save();
    console.log("Ensured current Semester document is marked isCurrent: true");
  }

  // 3. Update all Subjects with allowedSemesters
  const subjects = await Subject.find();
  let updatedSubjectsCount = 0;
  for (const sub of subjects) {
    const y = sub.year || 1;
    const defaultSemesters = Array.from(
      new Set([(y - 1) * 2 + 1, (y - 1) * 2 + 2, 1, 2])
    );
    if (!sub.allowedSemesters || sub.allowedSemesters.length === 0) {
      sub.allowedSemesters = defaultSemesters;
      await sub.save();
      updatedSubjectsCount++;
    }
  }
  console.log(`Updated ${updatedSubjectsCount} subjects with allowedSemesters`);

  // 4. Update TeachingAssignments and link Semesters
  const assignments = await TeachingAssignment.find();
  for (const ta of assignments) {
    let semDoc = await Semester.findOne({
      academicYear: ta.academicYear,
      semesterNumber: ta.semester,
    });
    if (!semDoc) {
      semDoc = await Semester.create({
        academicYear: ta.academicYear,
        semesterNumber: ta.semester,
        name: `AY ${ta.academicYear} - Semester ${ta.semester}`,
        status: "pending_enrollment",
      });
      console.log(`Created missing Semester doc for assignment AY ${ta.academicYear} Sem ${ta.semester}`);
    }
    if (!ta.semesterId || ta.semesterId.toString() !== semDoc._id.toString()) {
      ta.semesterId = semDoc._id;
      await ta.save();
    }
  }
  console.log(`Verified ${assignments.length} teaching assignments`);

  // 5. Update Students with currentSemester
  const students = await Student.find();
  let updatedStudentsCount = 0;
  for (const st of students) {
    const y = st.year || 1;
    const targetSem = (y - 1) * 2 + 1;
    if (!st.currentSemester) {
      st.currentSemester = targetSem;
      await st.save();
      updatedStudentsCount++;
    }
  }
  console.log(`Updated ${updatedStudentsCount} students with currentSemester`);

  // 6. Seed StudentEnrollments for existing students matching current session or their year
  let createdEnrollmentsCount = 0;
  for (const st of students) {
    // Find subjects matching student's department and year
    const matchingSubjects = await Subject.find({
      department: st.department,
      year: st.year,
    });

    for (const sub of matchingSubjects) {
      // Find matching teaching assignment if any
      const ta = await TeachingAssignment.findOne({
        subjectId: sub._id,
        academicYear: currentSession.academicYear,
        semester: currentSession.semester,
      });

      const existingEnrollment = await StudentEnrollment.findOne({
        studentId: st._id,
        subjectId: sub._id,
        academicYear: currentSession.academicYear,
        semester: currentSession.semester,
      });

      if (!existingEnrollment) {
        await StudentEnrollment.create({
          studentId: st._id,
          subjectId: sub._id,
          academicYear: currentSession.academicYear,
          semester: currentSession.semester,
          semesterId: currentSemDoc._id,
          facultyId: ta?.facultyId || null,
          teachingAssignmentId: ta?._id || null,
          status: "enrolled",
        });
        createdEnrollmentsCount++;
      }
    }
  }
  console.log(`Created ${createdEnrollmentsCount} initial student enrollment records`);

  // 7. Update Semester statuses based on enrolled count
  const allSemesters = await Semester.find();
  for (const sem of allSemesters) {
    const count = await StudentEnrollment.countDocuments({
      academicYear: sem.academicYear,
      semester: sem.semesterNumber,
    });
    if (count > 0 && sem.status === "pending_enrollment") {
      sem.status = "active";
      await sem.save();
      console.log(`Semester AY ${sem.academicYear} Sem ${sem.semesterNumber} activated (${count} enrolled)`);
    } else if (count === 0 && sem.status === "active") {
      sem.status = "pending_enrollment";
      await sem.save();
      console.log(`Semester AY ${sem.academicYear} Sem ${sem.semesterNumber} set to pending_enrollment (0 enrolled)`);
    }
  }

  console.log("=== Migration Completed Successfully ===");
  await mongoose.disconnect();
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
