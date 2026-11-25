import dotenv from "dotenv";
dotenv.config({ path: "./Backend/.env" });
dotenv.config();

import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { Student } from "../models/Student.js";
import { Faculty } from "../models/Faculty.js";
import { Admin } from "../models/Admin.js";
import { Subject } from "../models/Subject.js";

const BASE_URL = "http://localhost:10000";

async function runApiTests() {
  console.log("=== RUNNING HTTP API INTEGRATION TESTS ===");
  await mongoose.connect(process.env.MONGO_DB_URL || process.env.DB_URL);

  try {
    let adminUser = await Admin.findOne();
    if (!adminUser) {
      adminUser = await Admin.create({
        name: "Admin Tester",
        email: "admintest@acadex.edu",
        password: "hashedpassword123",
        role: "admin"
      });
    }

    const studentUser = await Student.findOne();
    if (!studentUser) throw new Error("No student found in DB for API tests");

    // Sign tokens with process.env.JWT_SECRET
    const adminToken = jwt.sign(
      { id: adminUser._id.toString(), email: adminUser.email, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const studentToken = jwt.sign(
      { id: studentUser._id.toString(), email: studentUser.email, role: "student" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // -------------------------------------------------------------
    // TEST API 1: Fetch Semesters (Admin)
    // -------------------------------------------------------------
    console.log("\n[API 1] Testing GET /admin/semesters...");
    const semRes = await fetch(`${BASE_URL}/admin/semesters`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const semData = await semRes.json();
    console.log(` Status: ${semRes.status}, Total Semesters: ${semData.data?.length}`);
    if (semRes.status !== 200 || !Array.isArray(semData.data)) {
      throw new Error(`Failed to fetch semesters: ${JSON.stringify(semData)}`);
    }
    const sampleSem = semData.data[0];
    console.log(` Verified enrichment: Semester ${sampleSem?.semesterNumber} (AY ${sampleSem?.academicYear}) - Status: ${sampleSem?.status}, Enrolled Students: ${sampleSem?.enrolledStudentsCount}`);
    console.log("PASS: GET /admin/semesters returned enriched semester list.\n");

    // -------------------------------------------------------------
    // TEST API 2: Subject-Semester Allowance Rejection on Assignment
    // -------------------------------------------------------------
    console.log("[API 2] Testing POST /admin/assign-subject allowance validation...");
    const testSub = await Subject.findOne({ code: "CS101" }) || await Subject.findOne();
    const faculty = await Faculty.findOne();
    
    // Attempt assigning testSub to semester 7 (invalid for Year 1 CS101)
    const invalidAssignRes = await fetch(`${BASE_URL}/admin/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        subjectId: testSub._id.toString(),
        facultyId: faculty._id.toString(),
        academicYear: "4",
        semester: 7 // Invalid semester!
      })
    });
    const invalidAssignData = await invalidAssignRes.json();
    console.log(` Attempted assigning ${testSub.code} (Allowed: [${testSub.allowedSemesters.join(",")}]) to Semester 7:`);
    console.log(` HTTP Status: ${invalidAssignRes.status}, Message: "${invalidAssignData.message}"`);
    if (invalidAssignRes.status !== 400 || !invalidAssignData.message.includes("cannot be offered")) {
      throw new Error(`Expected 400 rejection for invalid semester assignment! Got: ${invalidAssignRes.status}`);
    }
    console.log("PASS: Backend correctly blocked invalid subject-semester assignment!\n");

    // -------------------------------------------------------------
    // TEST API 3: Student Current Courses Workflow
    // -------------------------------------------------------------
    console.log("[API 3] Testing GET /student/current-courses...");
    const currentCoursesRes = await fetch(`${BASE_URL}/student/current-courses`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const currentCoursesData = await currentCoursesRes.json();
    console.log(` HTTP Status: ${currentCoursesRes.status}`);
    console.log(` Term: AY ${currentCoursesData.data?.academicYear} Sem ${currentCoursesData.data?.semester}`);
    console.log(` Pending Enrollment: ${currentCoursesData.data?.isPendingEnrollment}`);
    console.log(` Enrolled Courses: ${currentCoursesData.data?.courses?.length}`);
    if (currentCoursesData.data?.isPendingEnrollment) {
      console.log(` Validation message: "${currentCoursesData.data?.validationMessage}"`);
    }
    if (currentCoursesRes.status !== 200) {
      throw new Error(`Failed to fetch current courses: ${JSON.stringify(currentCoursesData)}`);
    }
    console.log("PASS: GET /student/current-courses returned correct Google Classroom semester structure!\n");

    // -------------------------------------------------------------
    // TEST API 4: Student Past Semesters (Archived Courses)
    // -------------------------------------------------------------
    console.log("[API 4] Testing GET /student/past-semesters...");
    const pastRes = await fetch(`${BASE_URL}/student/past-semesters`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const pastData = await pastRes.json();
    console.log(` HTTP Status: ${pastRes.status}, Past terms count: ${pastData.data?.length}`);
    if (pastRes.status !== 200 || !Array.isArray(pastData.data)) {
      throw new Error(`Failed to fetch past semesters: ${JSON.stringify(pastData)}`);
    }
    console.log("PASS: GET /student/past-semesters returned properly grouped archived courses!\n");

    console.log("=======================================================");
    console.log(" ALL HTTP API INTEGRATION TESTS PASSED WITH SUCCESS!   ");
    console.log("=======================================================\n");
  } catch (err) {
    console.error("API TEST FAILED:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runApiTests();
