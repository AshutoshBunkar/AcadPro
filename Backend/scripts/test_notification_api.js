import dotenv from "dotenv";
dotenv.config({ path: "./Backend/.env" });

import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import http from "http";
import app from "../app.js";
import { Student } from "../models/Student.js";
import { Faculty } from "../models/Faculty.js";
import { Admin } from "../models/Admin.js";
import { Notification } from "../models/Notification.js";
import { Subject } from "../models/Subject.js";

async function runLiveApiTests() {
  console.log("================================================================================");
  console.log("            LIVE EXPRESS HTTP API & NOTIFICATIONS ENDPOINT TESTS                ");
  console.log("================================================================================\n");

  await mongoose.connect(process.env.MONGO_DB_URL);
  console.log("✓ Connected to MongoDB Atlas.\n");

  // Start express server on dynamic free port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`✓ Test Express server listening on ${baseUrl}\n`);

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
    const adminUser = await Admin.findOne();
    const facultyUser = await Faculty.findOne();
    const studentUser = await Student.findOne();

    if (!adminUser || !facultyUser || !studentUser) {
      throw new Error("Missing test users in database");
    }

    const adminToken = jwt.sign(
      { id: adminUser._id.toString(), email: adminUser.email, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const facultyToken = jwt.sign(
      { id: facultyUser._id.toString(), email: facultyUser.email, role: "faculty" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const studentToken = jwt.sign(
      { id: studentUser._id.toString(), email: studentUser.email, role: "student" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // =========================================================================
    // TEST 1: GET /notifications for student
    // =========================================================================
    console.log("--- TEST 1: GET /notifications (Fetch User Notifications) ---");
    const getRes = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const getData = await getRes.json();
    assert(getRes.status === 200, "GET /notifications returns 200 OK");
    assert(Array.isArray(getData.data?.notifications), "Notifications returned as array", `Count: ${getData.data?.notifications?.length}`);
    assert(typeof getData.data?.unreadCount === "number", "Unread count returned", `Unread count: ${getData.data?.unreadCount}`);

    // =========================================================================
    // TEST 2: Individual Notification Read & Clear
    // =========================================================================
    console.log("\n--- TEST 2: Individual Notification Read & Clear ---");
    // Create isolated test notification for student
    const sampleNotif = await Notification.create({
      recipient: studentUser._id,
      recipientRole: "student",
      title: "Individual Read/Clear Test",
      message: "Testing PATCH and DELETE endpoints.",
      type: "info",
    });

    // Mark as read via API
    const readRes = await fetch(`${baseUrl}/notifications/${sampleNotif._id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const readData = await readRes.json();
    assert(readRes.status === 200, "PATCH /notifications/:id/read returns 200 OK");
    assert(readData.data?.isRead === true, "Notification marked as read", `isRead: ${readData.data?.isRead}`);

    // Clear individual notification via DELETE API
    const deleteRes = await fetch(`${baseUrl}/notifications/${sampleNotif._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const deleteData = await deleteRes.json();
    assert(deleteRes.status === 200, "DELETE /notifications/:id returns 200 OK");
    assert(deleteData.message.includes("cleared"), "Success message returned on clear", deleteData.message);

    // Verify it is no longer returned in GET /notifications
    const getAfterClear = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const getAfterData = await getAfterClear.json();
    const stillPresent = getAfterData.data?.notifications?.some((n) => n._id === sampleNotif._id.toString());
    assert(!stillPresent, "Cleared notification is omitted from GET /notifications active list");

    // =========================================================================
    // TEST 3: Clear All Notifications via DELETE /notifications
    // =========================================================================
    console.log("\n--- TEST 3: Clear All Notifications (DELETE /notifications) ---");
    // Seed 2 temp notifications for faculty
    await Notification.create([
      {
        recipient: facultyUser._id,
        recipientRole: "faculty",
        title: "Faculty Test Alert 1",
        message: "Clear all test notification 1",
        type: "alert",
      },
      {
        recipient: facultyUser._id,
        recipientRole: "faculty",
        title: "Faculty Test Alert 2",
        message: "Clear all test notification 2",
        type: "info",
      },
    ]);

    const clearAllRes = await fetch(`${baseUrl}/notifications`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const clearAllData = await clearAllRes.json();
    assert(clearAllRes.status === 200, "DELETE /notifications returns 200 OK");
    assert(clearAllData.data?.clearedCount >= 2, "Reported cleared count matches", `Cleared: ${clearAllData.data?.clearedCount}`);

    // Verify faculty notifications list is now empty (clean empty state)
    const facultyGetRes = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const facultyGetData = await facultyGetRes.json();
    assert(
      facultyGetData.data?.notifications?.length === 0 && facultyGetData.data?.unreadCount === 0,
      "Faculty active notifications array is empty and unreadCount is 0"
    );

    // =========================================================================
    // TEST 4: Authorization & Ownership Protection
    // =========================================================================
    console.log("\n--- TEST 4: Authorization & Ownership Protection ---");
    // Create an admin notification
    const adminNotif = await Notification.create({
      recipient: adminUser._id,
      recipientRole: "admin",
      title: "Confidential Admin Notice",
      message: "Only admin can view and clear this.",
      type: "system",
    });

    // Student attempts to clear admin's notification
    const maliciousClearRes = await fetch(`${baseUrl}/notifications/${adminNotif._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      maliciousClearRes.status === 403 || maliciousClearRes.status === 404,
      "Cross-user notification deletion rejected with 403 Forbidden or 404 Not Found",
      `Status: ${maliciousClearRes.status}`
    );

    // Verify admin notification remains untouched
    const checkAdminNotif = await Notification.findById(adminNotif._id);
    assert(checkAdminNotif.isCleared === false, "Admin notification remains active and not cleared");

    // Clean up test admin notification
    await Notification.findByIdAndDelete(adminNotif._id);

    // =========================================================================
    // TEST 5: Backend Academic Year & Semester Enforcement
    // =========================================================================
    console.log("\n--- TEST 5: Backend Academic Year & Semester Validation ---");
    const testSub = await Subject.findOne({ code: "CS201" });

    // A. Rejection of invalid academic year (e.g., 2025-2026 or 2024-2025)
    const invalidYearRes = await fetch(`${baseUrl}/admin/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        facultyId: facultyUser._id.toString(),
        subjectIds: [testSub._id.toString()],
        academicYear: "2024-2025",
        semester: 3,
      }),
    });
    const invalidYearData = await invalidYearRes.json();
    assert(
      invalidYearRes.status === 400 && invalidYearData.message.includes("2026-2027"),
      "Backend rejects non-2026-2027 academic year with clear validation message",
      `HTTP ${invalidYearRes.status}: ${invalidYearData.message}`
    );

    // B. Rejection of invalid semester (e.g., Semester 2 or 4 in 2026-2027)
    const invalidSemRes = await fetch(`${baseUrl}/admin/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        facultyId: facultyUser._id.toString(),
        subjectIds: [testSub._id.toString()],
        academicYear: "2026-2027",
        semester: 4, // Even semester not allowed in active config
      }),
    });
    const invalidSemData = await invalidSemRes.json();
    assert(
      invalidSemRes.status === 400 &&
        (invalidSemData.message.includes("1st, 3rd, 5th, or 7th") ||
          invalidSemData.message.includes("Active semester offerings")),
      "Backend rejects even semester 4 with active offerings restriction message",
      `HTTP ${invalidSemRes.status}: ${invalidSemData.message}`
    );

    // C. Rejection in batch enrollment when attempting semester 2
    const invalidBatchRes = await fetch(`${baseUrl}/admin/enroll-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        department: "CSE",
        semester: 2,
        academicYear: "2026-2027",
      }),
    });
    const invalidBatchData = await invalidBatchRes.json();
    assert(
      invalidBatchRes.status === 400,
      "Batch enrollment rejects even semester (Sem 2) with 400 Bad Request",
      `HTTP ${invalidBatchRes.status}: ${invalidBatchData.message}`
    );

    // Re-seed faculty notifications for normal UI usage
    await Notification.create({
      recipient: facultyUser._id,
      recipientRole: "faculty",
      title: "Course Assignment Confirmed",
      message: "Your teaching assignments for AY 2026-2027 are active.",
      type: "assignment",
      link: "/faculty/dashboard",
    });

    console.log("\n================================================================================");
    console.log(`LIVE HTTP API VERIFICATION COMPLETE: ${passed} Passed, ${failed} Failed.`);
    console.log("================================================================================\n");

    server.close();
    await mongoose.disconnect();
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("Live API tests failed with exception:", err);
    server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runLiveApiTests();
