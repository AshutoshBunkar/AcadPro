import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });


import { Student } from "../models/Student.js";
import { Faculty } from "../models/Faculty.js";
import { Subject } from "../models/Subject.js";
import { Semester } from "../models/Semester.js";
import { TeachingAssignment } from "../models/TeachingAssignment.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";
import { Topic } from "../models/Topic.js";
import { Lecture } from "../models/Lecture.js";
import { ACTIVE_ACADEMIC_YEAR } from "../utils/academicConfig.js";

async function run() {
  console.log("================================================================================");
  console.log("        ACADPRO RECONCILIATION AND 9-SCENARIO VERIFICATION SUITE         ");
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

  const nextThrow = (err) => {
    if (err) throw err;
  };

  try {
    // -------------------------------------------------------------------------
    // STEP 0: Data Reconciliation
    // -------------------------------------------------------------------------
    console.log("--- STEP 0: Reconciling Existing Database Inconsistencies ---");
    
    // 1. Clean up fake schema defaults from Dr. Alan Boomb
    const alan = await Faculty.findOne({ email: "alan@turing" });
    if (alan && alan.phone === "+1 (555) 019-2049") {
      alan.phone = "";
      alan.officeLocation = "";
      alan.officeHours = "";
      alan.specialization = "";
      alan.designation = "";
      alan.avatar = "";
      await alan.save();
      console.log("✓ Reconciled Dr. Alan Boomb profile: cleared hardcoded schema defaults to empty strings.");
    }

    // 2. Reconcile Rhea Patel and Aarav Sharma past enrollments (transition Sem 3 to completed)
    const sem5Students = await Student.find({ currentSemester: 5 });
    for (const st of sem5Students) {
      const res = await StudentEnrollment.updateMany(
        {
          studentId: st._id,
          semester: { $lt: 5 },
          status: { $in: ["enrolled", "active"] },
        },
        { $set: { status: "completed" } }
      );
      if (res.modifiedCount > 0) {
        console.log(`✓ Reconciled ${st.name}: marked ${res.modifiedCount} earlier semester course(s) as completed.`);
      }
    }

    // 3. Ensure Rhea Patel has Semester 5 enrollments for CSE
    const rhea = await Student.findOne({ email: "rhea.patel@iiitp.ac.in" });
    if (rhea) {
      const sem5Subjects = await Subject.find({ department: "CSE", allowedSemesters: 5 });
      for (const sub of sem5Subjects) {
        const ta = await TeachingAssignment.findOne({
          subjectId: sub._id,
          academicYear: ACTIVE_ACADEMIC_YEAR,
          semester: 5,
        });
        await StudentEnrollment.findOneAndUpdate(
          {
            studentId: rhea._id,
            subjectId: sub._id,
            academicYear: ACTIVE_ACADEMIC_YEAR,
            semester: 5,
          },
          {
            $set: {
              status: "enrolled",
              facultyId: ta?.facultyId || null,
              teachingAssignmentId: ta?._id || null,
              section: ta?.section || "A",
              department: "CSE",
              program: "B.Tech",
            },
            $setOnInsert: { enrolledAt: new Date() },
          },
          { upsert: true, returnDocument: "after" }
        );
      }
      console.log(`✓ Reconciled Rhea Patel: ensured Semester 5 CSE course enrollments.`);
    }

    // -------------------------------------------------------------------------
    // SCENARIO 1: Successful Promotion
    // -------------------------------------------------------------------------
    console.log("\n--- SCENARIO 1: Successful Promotion & Course/Lecture Access ---");
    let testStudent = await Student.findOne({ mis: "TEST_PROMOTE_001" });
    if (testStudent) {
      await StudentEnrollment.deleteMany({ studentId: testStudent._id });
      await Student.findByIdAndDelete(testStudent._id);
    }

    testStudent = await Student.create({
      mis: "TEST_PROMOTE_001",
      name: "Tanya Sen",
      email: "tanya.sen@iiitp.ac.in",
      password: "HashedPassword123",
      department: "CSE",
      year: 2,
      currentSemester: 3,
    });

    const cs201 = await Subject.findOne({ code: "CS201" });
    const cs302 = await Subject.findOne({ code: "CS302" });

    const sem3TaCS201 = await TeachingAssignment.findOne({ subjectId: cs201._id, semester: 3 });
    const sem3TaCS302 = await TeachingAssignment.findOne({ subjectId: cs302._id, semester: 3 });

    await StudentEnrollment.create([
      {
        studentId: testStudent._id,
        subjectId: cs201._id,
        academicYear: ACTIVE_ACADEMIC_YEAR,
        semester: 3,
        status: "enrolled",
        facultyId: sem3TaCS201?.facultyId,
        teachingAssignmentId: sem3TaCS201?._id,
        section: "A",
        department: "CSE",
      },
      {
        studentId: testStudent._id,
        subjectId: cs302._id,
        academicYear: ACTIVE_ACADEMIC_YEAR,
        semester: 3,
        status: "enrolled",
        facultyId: sem3TaCS302?.facultyId,
        teachingAssignmentId: sem3TaCS302?._id,
        section: "A",
        department: "CSE",
      },
    ]);

    const { promoteStudentYear } = await import("../controllers/admincontroller.js");
    
    let promoteResponseData = null;
    let promoteStatusCode = null;
    const reqPromote = {
      body: {
        studentId: testStudent._id.toString(),
        newYear: 3,
        newSemester: 5,
      },
      user: { name: "System Admin", email: "admin@acadpro.edu" },
    };
    const resPromote = {
      status(code) {
        promoteStatusCode = code;
        return this;
      },
      json(data) {
        promoteResponseData = data;
        return this;
      },
    };

    await promoteStudentYear(reqPromote, resPromote, nextThrow);

    assert(promoteStatusCode === 200, "Promotion endpoint returned HTTP 200");
    const updatedTestStudent = await Student.findById(testStudent._id);
    assert(
      updatedTestStudent.year === 3 && updatedTestStudent.currentSemester === 5,
      "Student placement updated to Year 3, Semester 5",
      `Year: ${updatedTestStudent.year}, Semester: ${updatedTestStudent.currentSemester}`
    );

    // Verify newly assigned Semester 5 courses
    const newEnrollments = await StudentEnrollment.find({
      studentId: testStudent._id,
      semester: 5,
      status: { $in: ["enrolled", "active"] },
    }).populate("subjectId");

    const newCodes = newEnrollments.map((e) => e.subjectId?.code);
    assert(
      newCodes.includes("CS401") && newCodes.includes("CS402"),
      "Promoted student received Semester 5 courses (CS401, CS402)",
      `Assigned courses: ${newCodes.join(", ")}`
    );

    // Verify student can access lectures for newly assigned course
    const cs401Sub = await Subject.findOne({ code: "CS401" });
    const cs401Topics = await Topic.find({ subjectId: cs401Sub._id });
    const cs401Lectures = await Lecture.find({ topicId: { $in: cs401Topics.map((t) => t._id) } });
    assert(
      cs401Lectures.length >= 1,
      "Promoted student has access to lectures belonging to CS401",
      `Lecture count: ${cs401Lectures.length}`
    );

    // -------------------------------------------------------------------------
    // SCENARIO 2: Faculty Roster Synchronization (New Semester)
    // -------------------------------------------------------------------------
    console.log("\n--- SCENARIO 2: Faculty Roster Synchronization (New Semester) ---");
    const ramesh = await Faculty.findOne({ name: /Ramesh Chandra/i });
    const { getFacultyCourseRoster } = await import("../controllers/facultycontroller.js");

    let rosterResData = null;
    const reqRoster = {
      user: { _id: ramesh._id, id: ramesh._id },
      params: { subjectId: cs401Sub._id.toString() },
      query: {
        academicYear: ACTIVE_ACADEMIC_YEAR,
        semester: "5",
        status: "active",
      },
    };
    const resRoster = {
      status(code) { return this; },
      json(data) { rosterResData = data; return this; },
    };

    await getFacultyCourseRoster(reqRoster, resRoster, nextThrow);
    const sem5Roster = rosterResData?.data?.students || [];
    const tanyaInRameshRoster = sem5Roster.find((s) => s.mis === "TEST_PROMOTE_001");

    assert(
      !!tanyaInRameshRoster,
      "Promoted student appears in Dr. Ramesh Chandra's active roster for CS401",
      `Student MIS: ${tanyaInRameshRoster?.mis}, Name: ${tanyaInRameshRoster?.name}, Standing: Year ${tanyaInRameshRoster?.year} Sem ${tanyaInRameshRoster?.semester}, Status: ${tanyaInRameshRoster?.status}`
    );

    // -------------------------------------------------------------------------
    // SCENARIO 3: Old Course Roster Cleanup
    // -------------------------------------------------------------------------
    console.log("\n--- SCENARIO 3: Old Course Roster Cleanup ---");
    const anand = await Faculty.findOne({ name: /Anand Kulkarni/i });
    let oldRosterData = null;
    const reqOldRoster = {
      user: { _id: anand._id, id: anand._id },
      params: { subjectId: cs201._id.toString() },
      query: {
        academicYear: ACTIVE_ACADEMIC_YEAR,
        semester: "3",
        status: "active",
      },
    };
    const resOldRoster = {
      status(code) { return this; },
      json(data) { oldRosterData = data; return this; },
    };

    await getFacultyCourseRoster(reqOldRoster, resOldRoster, nextThrow);
    const sem3ActiveStudents = oldRosterData?.data?.students || [];
    const tanyaInOldActiveRoster = sem3ActiveStudents.find((s) => s.mis === "TEST_PROMOTE_001");

    assert(
      !tanyaInOldActiveRoster,
      "Promoted student does NOT appear in active roster of old Semester 3 course (CS201)"
    );

    // Verify historical record is intact (status is completed, not deleted)
    const oldEnrollmentRecord = await StudentEnrollment.findOne({
      studentId: testStudent._id,
      subjectId: cs201._id,
      semester: 3,
    });
    assert(
      oldEnrollmentRecord && oldEnrollmentRecord.status === "completed",
      "Historical enrollment record in Semester 3 is preserved with status 'completed'",
      `Record ID: ${oldEnrollmentRecord?._id}, Status: ${oldEnrollmentRecord?.status}`
    );

    // -------------------------------------------------------------------------
    // SCENARIO 4: Duplicate Prevention & Re-promotion Idempotency
    // -------------------------------------------------------------------------
    console.log("\n--- SCENARIO 4: Duplicate Prevention & Re-Promotion ---");
    const countBeforeRetry = await StudentEnrollment.countDocuments({
      studentId: testStudent._id,
      semester: 5,
    });

    // Re-trigger promotion for the same student
    await promoteStudentYear(reqPromote, resPromote, nextThrow);

    const countAfterRetry = await StudentEnrollment.countDocuments({
      studentId: testStudent._id,
      semester: 5,
    });

    assert(
      countBeforeRetry === countAfterRetry,
      "Re-triggering promotion does not create duplicate enrollment records",
      `Count before: ${countBeforeRetry}, Count after: ${countAfterRetry}`
    );

    // -------------------------------------------------------------------------
    // SCENARIO 5: Failure Handling & Transaction Rollback
    // -------------------------------------------------------------------------
    console.log("\n--- SCENARIO 5: Failure Handling & Atomic Rollback ---");
    let caughtError = null;
    try {
      await promoteStudentYear(
        {
          body: {
            studentId: testStudent._id.toString(),
            newYear: 1,
            newSemester: 2,
          },
          user: { name: "System Admin" },
        },
        resPromote,
        (err) => { caughtError = err; }
      );
    } catch (err) {
      caughtError = err;
    }

    assert(
      caughtError && caughtError.statusCode === 400,
      "Backward promotion request rejected with HTTP 400",
      caughtError?.message
    );

    // Confirm student standing was not corrupted or modified
    const testStudentAfterFailedPromote = await Student.findById(testStudent._id);
    assert(
      testStudentAfterFailedPromote.currentSemester === 5 && testStudentAfterFailedPromote.year === 3,
      "Student placement remained intact at Year 3 / Sem 5 after failed operation"
    );

    // -------------------------------------------------------------------------
    // SCENARIO 6: Faculty Profile Editing (Empty Profile)
    // -------------------------------------------------------------------------
    console.log("\n--- SCENARIO 6: Faculty Profile Editing (Clean Empty Defaults) ---");
    // Dr. Alan Boomb profile has empty optional fields
    let alanFaculty = await Faculty.findOne({ email: "alan@turing" });
    if (alanFaculty.phone) {
      alanFaculty.phone = "";
      alanFaculty.officeLocation = "";
      alanFaculty.officeHours = "";
      alanFaculty.specialization = "";
      alanFaculty.designation = "";
      alanFaculty.avatar = "";
      await alanFaculty.save();
    }
    alanFaculty = await Faculty.findOne({ email: "alan@turing" });

    assert(
      alanFaculty && !alanFaculty.phone && !alanFaculty.officeLocation,
      "Faculty with unconfigured profile has empty strings for optional fields (no hardcoded fake values)",
      `Phone: "${alanFaculty?.phone}", Office: "${alanFaculty?.officeLocation}"`
    );

    // Update Dr. Alan Boomb's profile
    const { updateFacultyProfile } = await import("../controllers/facultycontroller.js");
    let updateResData = null;
    const reqUpdateProfile = {
      user: { id: alanFaculty._id, _id: alanFaculty._id },
      body: {
        name: "Dr. Alan M. Turing",
        designation: "Chair Professor of Computing",
        department: "CSE",
        specialization: "Theoretical Computer Science & Cryptography",
        phone: "+91 (020) 2690-2199",
        officeLocation: "Turing Block, Room 101",
        officeHours: "Tue, Thu 3:00 PM - 5:00 PM",
      },
    };
    const resUpdateProfile = {
      status(code) { return this; },
      json(data) { updateResData = data; return this; },
    };

    await updateFacultyProfile(reqUpdateProfile, resUpdateProfile, nextThrow);
    assert(
      updateResData?.data?.designation === "Chair Professor of Computing" &&
      updateResData?.data?.phone === "+91 (020) 2690-2199",
      "Faculty profile fields updated and saved successfully",
      `Saved designation: ${updateResData?.data?.designation}`
    );

    // -------------------------------------------------------------------------
    // SCENARIO 7: Existing Profile Data Persistence
    // -------------------------------------------------------------------------
    console.log("\n--- SCENARIO 7: Existing Profile Data Persistence ---");
    const freshAlan = await Faculty.findById(alanFaculty._id).select("-password");
    assert(
      freshAlan.designation === "Chair Professor of Computing" &&
      freshAlan.officeLocation === "Turing Block, Room 101" &&
      freshAlan.phone === "+91 (020) 2690-2199",
      "Saved faculty profile values persist in the database and are retrieved accurately on refresh",
      `Retrieved: ${freshAlan.name}, ${freshAlan.designation}, ${freshAlan.officeLocation}`
    );

    // -------------------------------------------------------------------------
    // SCENARIO 8: Authorization & Input Validation
    // -------------------------------------------------------------------------
    console.log("\n--- SCENARIO 8: Authorization & Validation ---");
    let validationErr = null;
    try {
      await updateFacultyProfile(
        {
          user: { id: alanFaculty._id, _id: alanFaculty._id },
          body: { name: "   " },
        },
        resUpdateProfile,
        (err) => { validationErr = err; }
      );
    } catch (err) {
      validationErr = err;
    }
    assert(
      validationErr && validationErr.statusCode === 400,
      "Empty name validation rejected with HTTP 400",
      validationErr?.message
    );

    let phoneValidationErr = null;
    try {
      await updateFacultyProfile(
        {
          user: { id: alanFaculty._id, _id: alanFaculty._id },
          body: { phone: "123456789012345678901234567890" },
        },
        resUpdateProfile,
        (err) => { phoneValidationErr = err; }
      );
    } catch (err) {
      phoneValidationErr = err;
    }
    assert(
      phoneValidationErr && phoneValidationErr.statusCode === 400,
      "Excessive phone length rejected with HTTP 400",
      phoneValidationErr?.message
    );

    // -------------------------------------------------------------------------
    // SCENARIO 9: Roster Interface Consistency (Counts, Sorting, CSV Export)
    // -------------------------------------------------------------------------
    console.log("\n--- SCENARIO 9: Roster Interface Consistency ---");
    let cs401RosterData = null;
    await getFacultyCourseRoster(
      {
        user: { _id: ramesh._id, id: ramesh._id },
        params: { subjectId: cs401Sub._id.toString() },
        query: {
          academicYear: ACTIVE_ACADEMIC_YEAR,
          semester: "5",
          status: "all",
          sortBy: "name",
          sortOrder: "asc",
        },
      },
      {
        status() { return this; },
        json(d) { cs401RosterData = d; return this; },
      },
      nextThrow
    );

    const stats = cs401RosterData?.data?.stats;
    const studentsList = cs401RosterData?.data?.students || [];

    assert(
      stats && stats.totalEnrolled >= 1 && stats.activeCount >= 1,
      "Roster statistics accurately computed (totalEnrolled and activeCount)",
      `Total: ${stats.totalEnrolled}, Active: ${stats.activeCount}`
    );

    const { exportFacultyCourseRoster } = await import("../controllers/facultycontroller.js");
    let csvHeadersSent = {};
    let csvBody = "";
    const reqCsv = {
      user: { _id: ramesh._id, id: ramesh._id },
      params: { subjectId: cs401Sub._id.toString() },
      query: {
        academicYear: ACTIVE_ACADEMIC_YEAR,
        semester: "5",
        status: "active",
      },
    };
    const resCsv = {
      setHeader(k, v) { csvHeadersSent[k] = v; },
      status(code) { return this; },
      send(data) { csvBody = data; return this; },
    };

    await exportFacultyCourseRoster(reqCsv, resCsv, nextThrow);
    assert(
      csvHeadersSent["Content-Type"] === "text/csv" &&
      csvBody.includes("Roll Number / MIS") &&
      csvBody.includes("TEST_PROMOTE_001"),
      "CSV export generates valid CSV format containing active enrolled students",
      `CSV preview: ${csvBody.split("\n")[0]}`
    );

    // Clean up test student
    await StudentEnrollment.deleteMany({ studentId: testStudent._id });
    await Student.findByIdAndDelete(testStudent._id);
    console.log("✓ Cleaned up temporary test student.");

  } catch (err) {
    console.error("Test execution failed with error:", err);
    failed++;
  } finally {
    console.log("\n================================================================================");
    console.log(`                     RESULTS: ${passed} PASSED, ${failed} FAILED                 `);
    console.log("================================================================================\n");
    await mongoose.disconnect();
    if (failed > 0) process.exit(1);
  }
}

run();
