import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Student } from "../models/Student.js";
import { Subject } from "../models/Subject.js";
import { Semester } from "../models/Semester.js";
import { TeachingAssignment } from "../models/TeachingAssignment.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";

async function repairData() {
  console.log("=== SAFELY REPAIRING ACADEMIC DATA INTEGRITY ===");
  await mongoose.connect(process.env.MONGO_DB_URL);
  console.log("Connected to MongoDB.");

  // 1. Clean CS401 allowedSemesters to [5, 6]
  const cs401 = await Subject.findOne({ code: "CS401" });
  if (cs401) {
    cs401.allowedSemesters = [5, 6];
    await cs401.save();
    console.log(`Updated CS401 allowedSemesters to: [${cs401.allowedSemesters.join(", ")}]`);
  }

  // 2. Identify and repair Abhay's enrollments
  const abhay = await Student.findOne({ mis: "112415005" });
  if (abhay) {
    console.log(`Found student Abhay (${abhay.name}, Dept: ${abhay.department}, Year: ${abhay.year}, Sem: ${abhay.currentSemester})`);

    // Remove any invalid enrollment in CS303 or non-semester 5 subjects
    const invalidEnrollments = await StudentEnrollment.find({
      studentId: abhay._id,
      semester: 5,
    }).populate("subjectId");

    for (const enr of invalidEnrollments) {
      const allowed = enr.subjectId?.allowedSemesters || [];
      if (!allowed.includes(5) || enr.subjectId?.year !== 3) {
        console.log(`Removing invalid enrollment: Subject ${enr.subjectId?.code} (${enr.subjectId?.name}) is not allowed in Semester 5.`);
        await StudentEnrollment.findByIdAndDelete(enr._id);
      }
    }

    // Ensure valid Semester 5 record exists for AY 2026-2027
    let sem5 = await Semester.findOne({ academicYear: "2026-2027", semesterNumber: 5 });
    if (!sem5) {
      sem5 = await Semester.create({
        academicYear: "2026-2027",
        semesterNumber: 5,
        name: "Autumn 2026 - Semester 5",
        status: "active",
        isCurrent: false,
      });
    } else {
      sem5.status = "active";
      await sem5.save();
    }

    // Find teaching assignment for CS401
    const cs401Ta = await TeachingAssignment.findOne({
      subjectId: cs401._id,
      academicYear: "2026-2027",
      semester: 5,
    });

    // Ensure Abhay has proper CS401 enrollment in AY 2026-2027 Sem 5
    await StudentEnrollment.findOneAndUpdate(
      {
        studentId: abhay._id,
        subjectId: cs401._id,
        academicYear: "2026-2027",
        semester: 5,
      },
      {
        $set: {
          semesterId: sem5._id,
          teachingAssignmentId: cs401Ta?._id || null,
          facultyId: cs401Ta?.facultyId || null,
          status: "enrolled",
          section: "A",
          department: "CSE",
          program: "B.Tech",
          enrolledAt: new Date(),
        },
      },
      { upsert: true }
    );
    console.log("Verified and repaired Abhay's enrollment in CS401 for AY 2026-2027 Sem 5.");
  }

  // 3. Backfill section and program on existing teaching assignments
  const tas = await TeachingAssignment.find();
  for (const ta of tas) {
    let updated = false;
    if (!ta.section) {
      ta.section = "A";
      updated = true;
    }
    if (!ta.program) {
      ta.program = "B.Tech";
      updated = true;
    }
    if (!ta.department) {
      const sub = await Subject.findById(ta.subjectId);
      if (sub) {
        ta.department = sub.department;
        updated = true;
      }
    }
    if (updated) await ta.save();
  }
  console.log(`Backfilled metadata on ${tas.length} teaching assignments.`);

  // 4. Backfill section, department, program on existing enrollments
  const enrollments = await StudentEnrollment.find();
  for (const enr of enrollments) {
    let updated = false;
    if (!enr.section) {
      enr.section = "A";
      updated = true;
    }
    if (!enr.program) {
      enr.program = "B.Tech";
      updated = true;
    }
    if (!enr.department) {
      const st = await Student.findById(enr.studentId);
      if (st) {
        enr.department = st.department;
        updated = true;
      }
    }
    if (updated) await enr.save();
  }
  console.log(`Backfilled metadata on ${enrollments.length} enrollments.`);

  console.log("=== DATA REPAIR COMPLETED SUCCESSFULLY ===");
  await mongoose.disconnect();
}

repairData().catch(err => {
  console.error("Repair error:", err);
  process.exit(1);
});
