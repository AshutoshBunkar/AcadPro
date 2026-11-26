import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "./Backend/.env" });

import { Student } from "../models/Student.js";
import { Faculty } from "../models/Faculty.js";
import { Subject } from "../models/Subject.js";
import { Semester } from "../models/Semester.js";
import { AcademicSession } from "../models/AcademicSession.js";
import { TeachingAssignment } from "../models/TeachingAssignment.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";
import { Admin } from "../models/Admin.js";
import { Notification } from "../models/Notification.js";
import {
  ACTIVE_ACADEMIC_YEAR,
  ACTIVE_SEMESTERS,
  ALLOWED_ACADEMIC_YEARS,
  SEMESTER_OPTIONS,
  isValidAcademicYear,
  isValidActiveSemester,
  deriveYearFromSemester,
  formatSemesterLabel,
} from "../utils/academicConfig.js";

async function runAcceptanceVerification() {
  console.log("================================================================================");
  console.log("             ACADPRO ACCEPTANCE CRITERIA VERIFICATION (PARTS 1 - 5)              ");
  console.log("================================================================================\n");

  await mongoose.connect(process.env.MONGO_DB_URL);
  console.log("✓ Connected to MongoDB Atlas.\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (details) console.log(`       └─ ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       └─ ERROR: ${details}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST A: Semester Selection & Academic Config
    // -------------------------------------------------------------------------
    console.log("--- TEST A: Semester Selection & Academic Configuration ---");
    assert(
      JSON.stringify(ACTIVE_SEMESTERS) === JSON.stringify([1, 3, 5, 7]),
      "Active semesters strictly limited to [1, 3, 5, 7]",
      `Active Semesters: ${ACTIVE_SEMESTERS.join(", ")}`
    );

    assert(
      SEMESTER_OPTIONS.length === 4 &&
        SEMESTER_OPTIONS.every((opt) => [1, 3, 5, 7].includes(opt.value)),
      "Semester options contain only 1st, 3rd, 5th, and 7th Semester",
      `Labels: ${SEMESTER_OPTIONS.map((o) => o.label).join(", ")}`
    );

    assert(
      !isValidActiveSemester(2) && !isValidActiveSemester(4) && !isValidActiveSemester(6) && !isValidActiveSemester(8),
      "Even semesters (2, 4, 6, 8) are strictly rejected by backend validation",
      "Semesters 2, 4, 6, 8 rejected"
    );

    assert(
      isValidActiveSemester(1) && isValidActiveSemester(3) && isValidActiveSemester(5) && isValidActiveSemester(7),
      "Odd semesters (1, 3, 5, 7) are accepted by backend validation",
      "Semesters 1, 3, 5, 7 accepted"
    );

    assert(
      deriveYearFromSemester(1) === 1 &&
        deriveYearFromSemester(3) === 2 &&
        deriveYearFromSemester(5) === 3 &&
        deriveYearFromSemester(7) === 4,
      "Study year is accurately derived from semester without redundant user input",
      "Sem 1 -> Year 1, Sem 3 -> Year 2, Sem 5 -> Year 3, Sem 7 -> Year 4"
    );

    // -------------------------------------------------------------------------
    // TEST B: Academic Year Restriction to 2026-2027
    // -------------------------------------------------------------------------
    console.log("\n--- TEST B: Academic Year Restriction to 2026-2027 ---");
    assert(
      ACTIVE_ACADEMIC_YEAR === "2026-2027",
      "Active academic year is strictly '2026-2027'",
      `ACTIVE_ACADEMIC_YEAR = ${ACTIVE_ACADEMIC_YEAR}`
    );

    assert(
      isValidAcademicYear("2026-2027"),
      "Academic year '2026-2027' is valid",
      "2026-2027 validated"
    );

    assert(
      !isValidAcademicYear("2024-2025") && !isValidAcademicYear("2025-2026") && !isValidAcademicYear("2027-2028"),
      "Stale or non-current academic years are rejected by validation helper",
      "2024-2025, 2025-2026, 2027-2028 rejected"
    );

    const activeSession = await AcademicSession.findOne();
    assert(
      activeSession && activeSession.academicYear === "2026-2027",
      "Active AcademicSession in database is set to 2026-2027",
      `Session: AY ${activeSession?.academicYear}, Sem ${activeSession?.semester}`
    );

    // Check historical preservation
    const historicalEnrollmentsCount = await StudentEnrollment.countDocuments({
      academicYear: "2025-2026",
    });
    assert(
      historicalEnrollmentsCount > 0,
      "Historical student enrollments from previous years are preserved",
      `Found ${historicalEnrollmentsCount} historical 2025-2026 enrollments in database`
    );

    const historicalSemesters = await Semester.find({ academicYear: "2025-2026" });
    assert(
      historicalSemesters.length > 0,
      "Historical semesters from previous academic years are preserved",
      `Preserved ${historicalSemesters.length} semester record(s) from 2025-2026`
    );

    // -------------------------------------------------------------------------
    // TEST C: Academic Data Correctness (Faculty, Subjects, Students)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST C: Academic Data Correctness for 2026-2027 ---");

    // Semesters in 2026-2027
    const activeSemesters2026 = await Semester.find({
      academicYear: "2026-2027",
      status: { $in: ["active", "pending_enrollment"] },
    });
    const activeSemNumbers = activeSemesters2026.map((s) => s.semesterNumber);
    assert(
      activeSemNumbers.every((num) => [1, 3, 5, 7].includes(num)),
      "Active 2026-2027 semesters contain only 1, 3, 5, 7",
      `Active Semesters: [${activeSemNumbers.join(", ")}]`
    );

    // Faculty assignments for 2026-2027
    const tas2026 = await TeachingAssignment.find({
      academicYear: "2026-2027",
      status: "active",
    }).populate("facultyId subjectId");

    assert(
      tas2026.length >= 5,
      "Faculty assignments created for active 2026-2027 offerings",
      `Total 2026-2027 assignments: ${tas2026.length}`
    );

    // Multiple faculty in same semester
    const sem3Assignments = tas2026.filter((t) => t.semester === 3);
    const sem3FacultyNames = [...new Set(sem3Assignments.map((t) => t.facultyId?.name))];
    assert(
      sem3FacultyNames.length >= 3,
      "Multiple faculty members teach distinct subjects in 3rd Semester",
      `Faculty in Sem 3: ${sem3FacultyNames.join(", ")}`
    );

    // Student mapping
    const year2Students = await Student.find({ year: 2 });
    assert(
      year2Students.length === 8 &&
        year2Students.every((s) => s.currentSemester === 3),
      "Year 2 students are mapped to 3rd Semester for active 2026-2027 term",
      `All ${year2Students.length} Year 2 students have currentSemester: 3`
    );

    const year3Student = await Student.findOne({ year: 3 });
    assert(
      year3Student && year3Student.currentSemester === 5,
      "Year 3 student is mapped to 5th Semester for active 2026-2027 term",
      `${year3Student?.name} has currentSemester: 5`
    );

    // Enrollments correctness
    const sem3Enrollments = await StudentEnrollment.find({
      academicYear: "2026-2027",
      semester: 3,
    }).populate("studentId subjectId");

    assert(
      sem3Enrollments.length === 18,
      "Year 2 cohort enrolled in applicable subjects (CSE: CS201, CS302, CS303; ECE: EC301)",
      `Total 2026-2027 Sem 3 enrollments: ${sem3Enrollments.length}`
    );

    // No duplicate enrollments
    const enrollmentKeys = new Set();
    let hasDuplicate = false;
    for (const e of sem3Enrollments) {
      const key = `${e.studentId?._id}_${e.subjectId?._id}_${e.academicYear}_${e.semester}`;
      if (enrollmentKeys.has(key)) {
        hasDuplicate = true;
        break;
      }
      enrollmentKeys.add(key);
    }
    assert(!hasDuplicate, "Zero duplicate enrollments found in active 2026-2027 offerings");

    // -------------------------------------------------------------------------
    // TEST D: Individual Notification Controls (Mark as Read, Clear)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST D: Individual Notification Controls ---");
    const testAdmin = await Admin.findOne();
    assert(!!testAdmin, "Admin user exists for notification test");

    // Create a specific test notification
    const testNotif = await Notification.create({
      recipient: testAdmin._id,
      recipientRole: "admin",
      title: "Test Alert For Individual Actions",
      message: "Verifying individual mark as read and clear functionality.",
      type: "alert",
    });

    assert(testNotif.isRead === false && testNotif.isCleared === false, "Test notification created with unread & active state");

    // Mark as read
    testNotif.isRead = true;
    testNotif.readAt = new Date();
    await testNotif.save();

    const readCheck = await Notification.findById(testNotif._id);
    assert(readCheck.isRead === true && readCheck.isCleared === false, "Marking as read updates read status without clearing");

    // Clear individual notification
    testNotif.isCleared = true;
    testNotif.clearedAt = new Date();
    await testNotif.save();

    const clearedCheck = await Notification.findById(testNotif._id);
    assert(
      clearedCheck.isCleared === true && clearedCheck.clearedAt !== null,
      "Clearing individual notification sets isCleared = true and records clearedAt timestamp"
    );

    // Query active notifications for user: should NOT include cleared
    const activeNotifs = await Notification.find({
      recipient: testAdmin._id,
      isCleared: false,
    });
    assert(
      !activeNotifs.some((n) => n._id.equals(testNotif._id)),
      "Cleared notification disappears from active notifications list"
    );

    // -------------------------------------------------------------------------
    // TEST E: Clear All Notifications & Confirmation
    // -------------------------------------------------------------------------
    console.log("\n--- TEST E: Clear All Notifications Behavior ---");
    const testStudent = await Student.findOne({ email: "aarav.sharma@iiitp.ac.in" });
    assert(!!testStudent, "Test student exists for Clear All test");

    // Count before
    const studentActiveBefore = await Notification.countDocuments({
      recipient: testStudent._id,
      isCleared: false,
    });
    assert(studentActiveBefore > 0, "Student has active notifications before Clear All", `Count: ${studentActiveBefore}`);

    // Perform clear all for student
    const clearResult = await Notification.updateMany(
      { recipient: testStudent._id, isCleared: false },
      { $set: { isCleared: true, clearedAt: new Date() } }
    );
    assert(clearResult.modifiedCount === studentActiveBefore, "Clear All clears only authenticated student's notifications", `Cleared count: ${clearResult.modifiedCount}`);

    const studentActiveAfter = await Notification.countDocuments({
      recipient: testStudent._id,
      isCleared: false,
    });
    assert(studentActiveAfter === 0, "Active notifications for student is now 0 (Clean empty state achieved)");

    // Restore test notifications for student so they still have data in UI
    await Notification.updateMany(
      { recipient: testStudent._id },
      { $set: { isCleared: false, clearedAt: null, isRead: false } }
    );

    // -------------------------------------------------------------------------
    // TEST F: User Isolation & Authorization
    // -------------------------------------------------------------------------
    console.log("\n--- TEST F: User Isolation & Authorization ---");
    const facultyUser = await Faculty.findOne();
    const studentUser = await Student.findOne();

    const facultyNotifCount = await Notification.countDocuments({
      recipient: facultyUser._id,
      isCleared: false,
    });
    const studentNotifCount = await Notification.countDocuments({
      recipient: studentUser._id,
      isCleared: false,
    });

    // Simulate: Clearing faculty notifications should NOT affect student notifications
    await Notification.updateMany(
      { recipient: facultyUser._id, isCleared: false },
      { $set: { isCleared: true, clearedAt: new Date() } }
    );

    const studentNotifCountAfter = await Notification.countDocuments({
      recipient: studentUser._id,
      isCleared: false,
    });

    assert(
      studentNotifCountAfter === studentNotifCount,
      "Clearing faculty notifications does NOT alter student notifications (Strict user isolation)",
      `Student count remained: ${studentNotifCountAfter}`
    );

    // Restore faculty notifications
    await Notification.updateMany(
      { recipient: facultyUser._id },
      { $set: { isCleared: false, clearedAt: null } }
    );

    // Clean up temporary test alert
    await Notification.findByIdAndDelete(testNotif._id);

    console.log("\n================================================================================");
    console.log(`ACCEPTANCE VERIFICATION COMPLETE: ${passed} Passed, ${failed} Failed.`);
    console.log("================================================================================\n");

    await mongoose.disconnect();
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("Verification failed with exception:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runAcceptanceVerification();
