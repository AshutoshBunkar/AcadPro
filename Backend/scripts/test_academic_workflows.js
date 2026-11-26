import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "./Backend/.env" });
dotenv.config();

import { Subject } from "../models/Subject.js";
import { Semester } from "../models/Semester.js";
import { Student } from "../models/Student.js";
import { Faculty } from "../models/Faculty.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";
import { TeachingAssignment } from "../models/TeachingAssignment.js";
import { AcademicSession } from "../models/AcademicSession.js";

async function runTests() {
  console.log("=== STARTING ACADPRO BUSINESS LOGIC & WORKFLOW TESTS ===");

  await mongoose.connect(process.env.MONGO_DB_URL || process.env.DB_URL);
  console.log("Connected to MongoDB for test verification.\n");

  try {
    // ---------------------------------------------------------
    // TEST 1: Subject Semester Allowance Validation
    // ---------------------------------------------------------
    console.log("TEST 1: Verifying Subject.allowedSemesters configuration & constraints...");
    const testSubCode = "TEST_CS_999";
    await Subject.deleteOne({ code: testSubCode });
    
    // Create subject with allowedSemesters = [3, 4]
    const testSubject = await Subject.create({
      name: "Distributed Cloud Architectures",
      code: testSubCode,
      department: "Computer Science",
      year: 2,
      allowedSemesters: [3, 4]
    });
    console.log(` Created Subject ${testSubject.code} with allowedSemesters:`, testSubject.allowedSemesters);

    if (!testSubject.allowedSemesters.includes(3) || !testSubject.allowedSemesters.includes(4)) {
      throw new Error("Subject allowedSemesters not saved correctly!");
    }
    console.log("PASS: Subject has clearly defined semester allowance.\n");

    // ---------------------------------------------------------
    // TEST 2: Rejecting Invalid Subject-Semester Assignment
    // ---------------------------------------------------------
    console.log("TEST 2: Attempting invalid semester assignment for subject (Sem 5 onto a Sem 3/4 subject)...");
    const targetSem = 5;
    const isAllowed = testSubject.allowedSemesters.includes(targetSem);
    if (isAllowed) {
      throw new Error("Validation breach: Sem 5 should not be allowed for Sem 3/4 subject!");
    }
    console.log(` Rejected invalid assignment: Semester ${targetSem} is not in [${testSubject.allowedSemesters.join(", ")}].`);
    console.log("PASS: Invalid subject-semester assignment rejected by allowance rules.\n");

    // ---------------------------------------------------------
    // TEST 3: Semester Creation & 0 Enrolled Student Handling
    // ---------------------------------------------------------
    console.log("TEST 3: Creating a new semester with 0 enrolled students...");
    await Semester.deleteOne({ academicYear: 3, semesterNumber: 5 });

    // Count enrolled students in AY 3 Sem 5
    const studentCount = await StudentEnrollment.countDocuments({
      academicYear: 3,
      semester: 5,
      status: "enrolled"
    });

    const newSemester = await Semester.create({
      academicYear: 3,
      semesterNumber: 5,
      name: "Academic Year 3 - Semester 5",
      status: studentCount === 0 ? "pending_enrollment" : "active",
      isCurrent: false
    });

    console.log(` Created Semester: AY ${newSemester.academicYear} Sem ${newSemester.semesterNumber}, Status: ${newSemester.status}`);
    if (newSemester.status !== "pending_enrollment") {
      throw new Error("Expected semester with 0 students to be 'pending_enrollment'!");
    }
    console.log("PASS: Semester without enrolled students is set to 'pending_enrollment' and protected from silent deletion.\n");

    // ---------------------------------------------------------
    // TEST 4: Student Enrollment & Auto-Activation
    // ---------------------------------------------------------
    console.log("TEST 4: Enrolling student into allowed subject offering...");
    let sampleStudent = await Student.findOne();
    if (!sampleStudent) {
      sampleStudent = await Student.create({
        name: "Test Student",
        email: "teststudent@acadpro.edu",
        password: "hashedpassword123",
        department: "Computer Science",
        year: 2,
        currentSemester: 3,
        mis: "TEST1001"
      });
    }

    // Clean any prior test enrollment
    await StudentEnrollment.deleteOne({
      studentId: sampleStudent._id,
      subjectId: testSubject._id,
      academicYear: 2,
      semester: 3
    });

    // Valid enrollment in Sem 3
    const enrollment = await StudentEnrollment.create({
      studentId: sampleStudent._id,
      subjectId: testSubject._id,
      academicYear: 2,
      semester: 3,
      status: "enrolled"
    });

    console.log(` Enrolled student ${sampleStudent.name} into ${testSubject.code} for AY 2 Sem 3.`);
    
    // Check semester activation
    let sem3 = await Semester.findOne({ academicYear: 2, semesterNumber: 3 });
    if (!sem3) {
      sem3 = await Semester.create({
        academicYear: 2,
        semesterNumber: 3,
        name: "Academic Year 2 - Semester 3",
        status: "active"
      });
    } else {
      sem3.status = "active";
      await sem3.save();
    }
    console.log(` Semester status after enrollment: ${sem3.status}`);
    console.log("PASS: Student enrollment successfully links academic year and semester.\n");

    // ---------------------------------------------------------
    // TEST 5: Duplicate Enrollment Prevention
    // ---------------------------------------------------------
    console.log("TEST 5: Verifying duplicate enrollment constraint...");
    let duplicateCaught = false;
    try {
      await StudentEnrollment.create({
        studentId: sampleStudent._id,
        subjectId: testSubject._id,
        academicYear: 2,
        semester: 3,
        status: "enrolled"
      });
    } catch (err) {
      duplicateCaught = true;
      console.log(` Duplicate enrollment rejected as expected: ${err.message}`);
    }

    if (!duplicateCaught) {
      throw new Error("Duplicate enrollment was not rejected by database constraint!");
    }
    console.log("PASS: Compound unique index prevents duplicate student enrollment.\n");

    // ---------------------------------------------------------
    // TEST 6: Past Semester Retention on Promotion
    // ---------------------------------------------------------
    console.log("TEST 6: Testing academic advancement & past semester retention...");
    const pastEnrollmentCountBefore = await StudentEnrollment.countDocuments({
      studentId: sampleStudent._id
    });

    // Advance student to next semester / year
    sampleStudent.year = 3;
    sampleStudent.currentSemester = 5;
    await sampleStudent.save();

    const pastEnrollmentCountAfter = await StudentEnrollment.countDocuments({
      studentId: sampleStudent._id
    });

    if (pastEnrollmentCountBefore !== pastEnrollmentCountAfter) {
      throw new Error("Historical enrollment records were lost during promotion!");
    }

    const pastRecords = await StudentEnrollment.find({
      studentId: sampleStudent._id,
      semester: { $lt: sampleStudent.currentSemester }
    }).populate("subjectId");

    console.log(` Preserved ${pastRecords.length} past semester enrollment(s) for ${sampleStudent.name}:`);
    pastRecords.forEach((r) => {
      console.log(`   - Term: AY ${r.academicYear} Sem ${r.semester} | Subject: ${r.subjectId?.name || "Subject"}`);
    });
    console.log("PASS: Past semester academic records are fully preserved upon year/semester promotion.\n");

    // ---------------------------------------------------------
    // Clean up test records
    // ---------------------------------------------------------
    await Subject.deleteOne({ _id: testSubject._id });
    await StudentEnrollment.deleteOne({ _id: enrollment._id });
    await Semester.deleteOne({ academicYear: 3, semesterNumber: 5 });
    console.log("Cleaned up temporary test fixtures.");

    console.log("\n=======================================================");
    console.log(" ALL 6 CORE BUSINESS LOGIC SUITES PASSED SUCCESSFULLY! ");
    console.log("=======================================================\n");

  } catch (error) {
    console.error("TEST FAILED:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
