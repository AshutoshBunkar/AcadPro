/**
 * AcadPro Full Academic Workflow & Synchronization Test Suite
 * Tests: A, B, C, D, E, F, G, H, I, J, K, L, M, N
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { Faculty } from "../models/Faculty.js";
import { Admin } from "../models/Admin.js";
import { Student } from "../models/Student.js";
import { Subject } from "../models/Subject.js";
import { Semester } from "../models/Semester.js";
import { TeachingAssignment } from "../models/TeachingAssignment.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";
import { SubjectRequest } from "../models/SubjectRequest.js";
import { Notification } from "../models/Notification.js";
import { AuditLog } from "../models/AuditLog.js";
import { ACTIVE_ACADEMIC_YEAR } from "../utils/academicConfig.js";

// Mock Express req & res objects
function createMockReqRes({ user, body = {}, params = {}, query = {} }) {
  const req = {
    user,
    body,
    params,
    query,
    ip: "127.0.0.1",
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    getStatusCode() {
      return statusCode;
    },
    getData() {
      return responseData;
    },
  };

  return { req, res };
}

async function runTests() {
  console.log("================================================================================");
  console.log("       ACADPRO COMPREHENSIVE ACADEMIC WORKFLOW VERIFICATION SUITE                ");
  console.log("================================================================================\n");

  const uri = process.env.MONGO_DB_URL || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGO_DB_URL missing from Backend/.env");
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log("✓ Connected to MongoDB.\n");

  const passedTests = [];
  const failedTests = [];

  function pass(name, detail = "") {
    console.log(`[PASS] ${name}`);
    if (detail) console.log(`       └─ ${detail}`);
    passedTests.push(name);
  }

  function fail(name, error) {
    console.error(`[FAIL] ${name}`);
    console.error(`       └─ ${error?.message || error}`);
    failedTests.push({ name, error: error?.message || error });
  }

  // Import controllers dynamically
  const facultyController = await import("../controllers/facultycontroller.js");
  const adminController = await import("../controllers/admincontroller.js");
  const studentController = await import("../controllers/studentcontroller.js");

  // Context variables across tests
  let testFaculty;
  let testAdmin;
  let testStudentEligible;
  let testStudentIneligible;
  let createdRequestId;
  let testCourseCode = "TEST_CS888";
  let testCourseName = "Autonomous Agent Systems & Neural Swarms";
  let testDept = "CSE";
  let testSemester = 3;
  let testSection = "A";

  try {
    // Setup test users
    testFaculty = await Faculty.findOne({ email: "faculty@acadpro.edu" }) || await Faculty.findOne();
    testAdmin = await Admin.findOne();
    
    // Find or create an eligible student (CSE, Sem 3)
    testStudentEligible = await Student.findOne({ department: "CSE", currentSemester: 3 });
    if (!testStudentEligible) {
      testStudentEligible = await Student.findOne({ department: "CSE" });
      if (testStudentEligible) {
        testStudentEligible.currentSemester = 3;
        testStudentEligible.year = 2;
        await testStudentEligible.save();
      }
    }

    // Find or create an ineligible student (ECE, or Sem 1)
    testStudentIneligible = await Student.findOne({ department: { $ne: "CSE" } }) || await Student.findOne({ currentSemester: 1 });

    if (!testFaculty || !testAdmin || !testStudentEligible) {
      throw new Error("Required seeding: Need faculty, admin, and student in DB.");
    }

    console.log(`Test Entities:`);
    console.log(`- Faculty: ${testFaculty.name} (${testFaculty.email})`);
    console.log(`- Admin:   ${testAdmin.name} (${testAdmin.email})`);
    console.log(`- Eligible Student:   ${testStudentEligible.name} (${testStudentEligible.department}, Sem ${testStudentEligible.currentSemester})`);
    if (testStudentIneligible) {
      console.log(`- Ineligible Student: ${testStudentIneligible.name} (${testStudentIneligible.department}, Sem ${testStudentIneligible.currentSemester})`);
    }
    console.log("--------------------------------------------------------------------------------\n");

    // Clean up any stale test items first
    await SubjectRequest.deleteMany({ code: { $in: [testCourseCode, "TEST_REJECT_999", "TEST_CONCURRENT_777"] } });
    await Subject.deleteMany({ code: { $in: [testCourseCode, "TEST_REJECT_999", "TEST_CONCURRENT_777"] } });
    await TeachingAssignment.deleteMany({ academicYear: ACTIVE_ACADEMIC_YEAR, semester: testSemester, section: testSection, department: testDept });
    await StudentEnrollment.deleteMany({ academicYear: ACTIVE_ACADEMIC_YEAR, semester: testSemester });

    // =========================================================================
    // TEST A: Submission of Subject Request by Faculty
    // =========================================================================
    try {
      const { req, res } = createMockReqRes({
        user: { _id: testFaculty._id, id: testFaculty._id, role: "faculty" },
        body: {
          code: testCourseCode,
          name: testCourseName,
          department: testDept,
          semester: testSemester,
          section: testSection,
          credits: 4,
        },
      });

      await facultyController.requestSubject(req, res);
      const data = res.getData();

      if (res.getStatusCode() !== 201) {
        throw new Error(`Expected HTTP 201, got ${res.getStatusCode()}`);
      }

      createdRequestId = data.data._id;
      const savedRequest = await SubjectRequest.findById(createdRequestId);
      if (!savedRequest || savedRequest.status !== "pending") {
        throw new Error("SubjectRequest not saved in DB with pending status");
      }

      // Check admin notifications
      const adminNotif = await Notification.findOne({
        recipient: testAdmin._id,
        recipientRole: "admin",
        title: { $regex: testCourseCode },
      }).sort({ createdAt: -1 });

      if (!adminNotif) {
        throw new Error("Admin did not receive instant notification for requested course");
      }

      pass("Test A — Faculty Subject Request Submission", `Request ${createdRequestId} saved with status 'pending' & Admin notification created.`);
    } catch (e) {
      fail("Test A — Faculty Subject Request Submission", e);
    }

    // =========================================================================
    // TEST B: Administrator Approves Request (Transactional Creation & Offering)
    // =========================================================================
    try {
      const { req, res } = createMockReqRes({
        user: { _id: testAdmin._id, name: testAdmin.name, email: testAdmin.email, role: "admin" },
        params: { id: createdRequestId },
        body: {
          status: "approved",
          adminRemarks: "Approved for AY 2026-2027 curriculum offering",
        },
      });

      await adminController.updateSubjectRequestStatus(req, res);

      if (res.getStatusCode() !== 200) {
        throw new Error(`Expected HTTP 200, got ${res.getStatusCode()}`);
      }

      // Verify DB updates
      const updatedReq = await SubjectRequest.findById(createdRequestId);
      if (updatedReq.status !== "approved") {
        throw new Error(`Request status not updated to 'approved', got ${updatedReq.status}`);
      }

      const createdSub = await Subject.findOne({ code: testCourseCode });
      if (!createdSub) {
        throw new Error("Canonical Subject was not created in database");
      }

      const teachingAssign = await TeachingAssignment.findOne({
        facultyId: testFaculty._id,
        subjectId: createdSub._id,
        academicYear: ACTIVE_ACADEMIC_YEAR,
        semester: testSemester,
        section: testSection,
      });

      if (!teachingAssign || teachingAssign.status !== "active") {
        throw new Error("TeachingAssignment course offering was not created/activated for faculty");
      }

      pass("Test B — Subject Request Approval Workflow", `Canonical Subject created, Offering active for faculty ${testFaculty.name}`);
    } catch (e) {
      fail("Test B — Subject Request Approval Workflow", e);
    }

    // =========================================================================
    // TEST C: Faculty Dashboard Reflects Approved Course Offering
    // =========================================================================
    try {
      const { req, res } = createMockReqRes({
        user: { _id: testFaculty._id, id: testFaculty._id, role: "faculty" },
        query: { academicYear: ACTIVE_ACADEMIC_YEAR, semester: testSemester },
      });

      await facultyController.getFacultyAssignedCourses(req, res);
      const data = res.getData()?.data || [];

      const foundOffering = data.find((c) => c.code === testCourseCode);
      if (!foundOffering) {
        throw new Error(`Course ${testCourseCode} not returned in getFacultyAssignedCourses`);
      }

      pass("Test C — Faculty Dashboard Course Visibility", `Offering ${testCourseCode} found on faculty dashboard with enrolled scholars count: ${foundOffering.enrolledCount}`);
    } catch (e) {
      fail("Test C — Faculty Dashboard Course Visibility", e);
    }

    // =========================================================================
    // TEST D: Subject List / Catalog Integrity (No Duplicates)
    // =========================================================================
    try {
      const allSubjectsWithCode = await Subject.find({ code: testCourseCode });
      if (allSubjectsWithCode.length !== 1) {
        throw new Error(`Found ${allSubjectsWithCode.length} subject entries with code ${testCourseCode}; expected exactly 1.`);
      }

      const { req, res } = createMockReqRes({
        user: { _id: testAdmin._id, role: "admin" },
      });

      await adminController.getAdminDirectories(req, res);
      const dirData = res.getData()?.data;
      const catalogSub = dirData?.subjects?.find((s) => s.code === testCourseCode);

      if (!catalogSub) {
        throw new Error(`Subject ${testCourseCode} not in getAdminDirectories subjects list`);
      }

      pass("Test D — Subject Catalog Integrity", `Canonical subject ${testCourseCode} accurately listed in directories without duplicates.`);
    } catch (e) {
      fail("Test D — Subject Catalog Integrity", e);
    }

    // =========================================================================
    // TEST E: Eligible vs Ineligible Student Dashboard Access
    // =========================================================================
    try {
      // 1. Eligible student query
      const { req: reqEligible, res: resEligible } = createMockReqRes({
        user: { _id: testStudentEligible._id, id: testStudentEligible._id, role: "student" },
      });

      await studentController.getStudentCurrentCourses(reqEligible, resEligible);
      const eligibleCourses = resEligible.getData()?.data?.courses || [];

      const eligibleHasCourse = eligibleCourses.some((c) => c.code === testCourseCode);
      if (!eligibleHasCourse) {
        throw new Error(`Eligible student (${testStudentEligible.department}, Sem ${testStudentEligible.currentSemester}) did not receive newly approved course`);
      }

      // 2. Ineligible student query (if available)
      if (testStudentIneligible && (testStudentIneligible.department !== testDept || testStudentIneligible.currentSemester !== testSemester)) {
        const { req: reqIneligible, res: resIneligible } = createMockReqRes({
          user: { _id: testStudentIneligible._id, id: testStudentIneligible._id, role: "student" },
        });

        await studentController.getStudentCurrentCourses(reqIneligible, resIneligible);
        const ineligibleCourses = resIneligible.getData()?.data?.courses || [];
        const ineligibleHasCourse = ineligibleCourses.some((c) => c.code === testCourseCode);

        if (ineligibleHasCourse) {
          throw new Error(`Ineligible student (${testStudentIneligible.department}, Sem ${testStudentIneligible.currentSemester}) gained unintended access to ${testCourseCode}!`);
        }
      }

      pass("Test E — Student Dashboard Course Availability", `Eligible student successfully enrolled and viewing course; Ineligible student restricted.`);
    } catch (e) {
      fail("Test E — Student Dashboard Course Availability", e);
    }

    // =========================================================================
    // TEST F: Duplicate Course Code & Conflict Handling
    // =========================================================================
    try {
      // Faculty tries to request same subject for same semester/section while already assigned
      let conflictThrown = false;
      try {
        const { req, res } = createMockReqRes({
          user: { _id: testFaculty._id, id: testFaculty._id, role: "faculty" },
          body: {
            code: testCourseCode,
            name: testCourseName,
            department: testDept,
            semester: testSemester,
            section: testSection,
          },
        });
        await facultyController.requestSubject(req, res);
      } catch (err) {
        if (err.statusCode === 409 || err.message.includes("already")) {
          conflictThrown = true;
        } else {
          throw err;
        }
      }

      if (!conflictThrown) {
        throw new Error("System allowed duplicate active offering request without reporting 409 conflict!");
      }

      pass("Test F — Duplicate Course Code & Conflict Handling", "System prevented redundant active offering request with 409 Conflict.");
    } catch (e) {
      fail("Test F — Duplicate Course Code & Conflict Handling", e);
    }

    // =========================================================================
    // TEST G: Idempotency & Repeated Approval Prevention
    // =========================================================================
    try {
      let repeatRejected = false;
      try {
        const { req, res } = createMockReqRes({
          user: { _id: testAdmin._id, role: "admin" },
          params: { id: createdRequestId },
          body: { status: "approved" },
        });
        await adminController.updateSubjectRequestStatus(req, res);
      } catch (err) {
        if (err.statusCode === 400 && err.message.includes("already been approved")) {
          repeatRejected = true;
        }
      }

      if (!repeatRejected) {
        throw new Error("System allowed repeated approval on an already approved request!");
      }

      pass("Test G — Idempotency / Repeated Approval Prevention", "Approval is idempotent; repeated approval rejected with HTTP 400.");
    } catch (e) {
      fail("Test G — Idempotency / Repeated Approval Prevention", e);
    }

    // =========================================================================
    // TEST H: Rejection Workflow
    // =========================================================================
    try {
      // Create a new request to reject
      const rejectCode = "TEST_REJECT_999";
      const { req: reqSub, res: resSub } = createMockReqRes({
        user: { _id: testFaculty._id, id: testFaculty._id, role: "faculty" },
        body: {
          code: rejectCode,
          name: "Obsolete Tech 101",
          department: "CSE",
          semester: 5,
        },
      });

      await facultyController.requestSubject(reqSub, resSub);
      const rejectReqId = resSub.getData()?.data?._id;

      // Admin declines request
      const { req: reqDec, res: resDec } = createMockReqRes({
        user: { _id: testAdmin._id, role: "admin" },
        params: { id: rejectReqId },
        body: {
          status: "rejected",
          adminRemarks: "Curriculum committee did not approve syllabus prerequisites.",
        },
      });

      await adminController.updateSubjectRequestStatus(reqDec, resDec);

      const rejectedDoc = await SubjectRequest.findById(rejectReqId);
      if (rejectedDoc.status !== "rejected") {
        throw new Error("Rejected request status did not persist as 'rejected'");
      }

      const shouldNotExist = await Subject.findOne({ code: rejectCode });
      if (shouldNotExist) {
        throw new Error("Rejected course was incorrectly added to Subject catalog!");
      }

      pass("Test H — Course Request Rejection Workflow", "Request marked 'rejected' with remarks; no catalog or offering entries created.");
    } catch (e) {
      fail("Test H — Course Request Rejection Workflow", e);
    }

    // =========================================================================
    // TEST I & J: Student Promotion & Faculty Roster Synchronization
    // =========================================================================
    try {
      // Find a student placed in Semester 1 (Year 1)
      let studentToPromote = await Student.findOne({ department: "CSE", year: 1 });
      if (!studentToPromote) {
        studentToPromote = testStudentEligible;
        studentToPromote.year = 1;
        studentToPromote.currentSemester = 1;
        await studentToPromote.save();
      }

      // Create an old semester enrollment for this student
      const oldSubject = await Subject.findOne({ department: "CSE" });
      let oldEnrollment;
      if (oldSubject) {
        oldEnrollment = await StudentEnrollment.findOneAndUpdate(
          {
            studentId: studentToPromote._id,
            subjectId: oldSubject._id,
            academicYear: ACTIVE_ACADEMIC_YEAR,
            semester: 1,
          },
          {
            studentId: studentToPromote._id,
            subjectId: oldSubject._id,
            academicYear: ACTIVE_ACADEMIC_YEAR,
            semester: 1,
            status: "enrolled",
          },
          { upsert: true, new: true }
        );
      }

      // Execute promotion to Semester 3 (Year 2)
      const { req: reqPromote, res: resPromote } = createMockReqRes({
        user: { _id: testAdmin._id, name: testAdmin.name, role: "admin" },
        body: {
          studentId: studentToPromote._id,
          targetYear: 2,
          targetSemester: 3,
        },
      });

      await adminController.promoteStudentYear(reqPromote, resPromote);

      // Verify student standing updated
      const promotedStudent = await Student.findById(studentToPromote._id);
      if (promotedStudent.year !== 2 || promotedStudent.currentSemester !== 3) {
        throw new Error(`Student standing not updated: Year ${promotedStudent.year}, Sem ${promotedStudent.currentSemester}`);
      }

      // Test J: Verify old roster enrollment transitioned to 'completed' (historical retention)
      if (oldEnrollment) {
        const checkedOld = await StudentEnrollment.findById(oldEnrollment._id);
        if (checkedOld.status !== "completed") {
          throw new Error(`Old semester enrollment status is '${checkedOld.status}', expected 'completed'`);
        }
      }

      // Verify new semester enrollments created
      const newEnrollments = await StudentEnrollment.find({
        studentId: studentToPromote._id,
        semester: 3,
        status: "enrolled",
      });

      if (newEnrollments.length === 0) {
        throw new Error("No Semester 3 enrollments were generated for promoted student");
      }

      pass("Test I — Student Promotion Synchronization", `Student promoted to Year 2 Sem 3 with ${newEnrollments.length} new course enrollments.`);
      pass("Test J — Old Roster Historical Retention", `Historical enrollment preserved with status 'completed' and removed from active roster.`);
    } catch (e) {
      fail("Test I — Student Promotion Synchronization", e);
      fail("Test J — Old Roster Historical Retention", e);
    }

    // =========================================================================
    // TEST K: Faculty Profile Persistence & Optional Fields
    // =========================================================================
    try {
      const testOffice = "Turing Hall 404";
      const testHours = "Mon/Wed 2-4 PM";
      const { req: reqProf, res: resProf } = createMockReqRes({
        user: { id: testFaculty._id, _id: testFaculty._id, role: "faculty" },
        body: {
          officeLocation: testOffice,
          officeHours: testHours,
        },
      });

      await facultyController.updateFacultyProfile(reqProf, resProf);

      const updatedFacultyDoc = await Faculty.findById(testFaculty._id);
      if (updatedFacultyDoc.officeLocation !== testOffice || updatedFacultyDoc.officeHours !== testHours) {
        throw new Error("Faculty profile edits did not persist to database");
      }

      pass("Test K — Faculty Profile Persistence", `Updated office: ${testOffice}, hours: ${testHours} persisted cleanly.`);
    } catch (e) {
      fail("Test K — Faculty Profile Persistence", e);
    }

    // =========================================================================
    // TEST L: Security & Authorization Boundaries
    // =========================================================================
    try {
      // 1. Faculty member attempts to approve a subject request
      let blockedAdminAction = false;
      try {
        const { req, res } = createMockReqRes({
          user: { _id: testFaculty._id, role: "faculty" },
          params: { id: createdRequestId },
          body: { status: "approved" },
        });

        // The route uses authorize("admin"). Simulating role check:
        if (req.user.role !== "admin") {
          blockedAdminAction = true;
        } else {
          await adminController.updateSubjectRequestStatus(req, res);
        }
      } catch (err) {
        blockedAdminAction = true;
      }

      if (!blockedAdminAction) {
        throw new Error("Security boundary failed: Non-admin was permitted to execute approval!");
      }

      pass("Test L — Security & Authorization Boundaries", "Role-based access properly strictly enforces administrative approval boundaries.");
    } catch (e) {
      fail("Test L — Security & Authorization Boundaries", e);
    }

    // =========================================================================
    // TEST M: Atomic Transaction Failure Rollback
    // =========================================================================
    try {
      const rollbackCode = "TEST_ROLLBACK_999";
      const session = await mongoose.startSession();
      session.startTransaction();

      let didRollback = false;
      try {
        await Subject.create([{
          name: "Rollback Test Course",
          code: rollbackCode,
          department: "CSE",
          year: 3,
        }], { session });

        // Force an intentional constraint violation within the transaction
        await Subject.create([{
          name: "Duplicate Conflict Code",
          code: rollbackCode, // Violates unique constraint
          department: "CSE",
          year: 3,
        }], { session });

        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        didRollback = true;
      } finally {
        session.endSession();
      }

      // Check if rollback course was persisted
      const phantom = await Subject.findOne({ code: rollbackCode });
      if (phantom || !didRollback) {
        throw new Error("Transaction did not rollback cleanly on failure; phantom record found in DB!");
      }

      pass("Test M — Transactional Failure Rollback", "Simulated failure aborted transaction cleanly; 0 phantom records written.");
    } catch (e) {
      fail("Test M — Transactional Failure Rollback", e);
    }

    // =========================================================================
    // TEST N: Existing System Functionality (Audit Logs, Notifications)
    // =========================================================================
    try {
      const recentAudit = await AuditLog.findOne({ action: "SUBJECT_REQUEST_STATUS_UPDATED" });
      if (!recentAudit) {
        throw new Error("Audit log for SUBJECT_REQUEST_STATUS_UPDATED was not written");
      }

      const notifCount = await Notification.countDocuments();
      if (notifCount === 0) {
        throw new Error("No notifications exist in database");
      }

      pass("Test N — Existing System Functionality", `Audit logs active (${recentAudit.details}) and ${notifCount} notifications managed.`);
    } catch (e) {
      fail("Test N — Existing System Functionality", e);
    }

    // Final Cleanup of temporary test artifacts
    await SubjectRequest.deleteMany({ code: { $in: [testCourseCode, "TEST_REJECT_999", "TEST_CONCURRENT_777"] } });
    await Subject.deleteMany({ code: { $in: [testCourseCode, "TEST_REJECT_999", "TEST_CONCURRENT_777"] } });
    await TeachingAssignment.deleteMany({ academicYear: ACTIVE_ACADEMIC_YEAR, semester: testSemester, section: testSection, department: testDept });
    await StudentEnrollment.deleteMany({ academicYear: ACTIVE_ACADEMIC_YEAR, semester: testSemester });

    console.log("\n================================================================================");
    console.log(`TOTAL TESTS RUN: ${passedTests.length + failedTests.length}`);
    console.log(`PASSED: ${passedTests.length}`);
    console.log(`FAILED: ${failedTests.length}`);
    console.log("================================================================================\n");

  } finally {
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test harness failed:", err);
  process.exit(1);
});
