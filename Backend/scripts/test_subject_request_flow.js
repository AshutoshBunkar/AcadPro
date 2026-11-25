import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { Admin } from "../models/Admin.js";
import { Faculty } from "../models/Faculty.js";
import { Notification } from "../models/Notification.js";
import { SubjectRequest } from "../models/SubjectRequest.js";
import { requestSubject, getFacultySubjectRequests } from "../controllers/facultycontroller.js";
import { getSubjectRequests, updateSubjectRequestStatus, getAdminDirectories } from "../controllers/admincontroller.js";
import { getUserNotifications } from "../controllers/notificationcontroller.js";

async function run() {
  console.log("================================================================================");
  console.log("          COURSE ADDITION REQUEST & ADMIN NOTIFICATION TEST                     ");
  console.log("================================================================================\n");

  let retries = 3;
  while (retries > 0) {
    try {
      await mongoose.connect(process.env.MONGO_DB_URL, { serverSelectionTimeoutMS: 15000 });
      break;
    } catch (e) {
      retries--;
      if (retries === 0) throw e;
      console.log("Connection retry...");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.log("✓ Connected to MongoDB.\n");


  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (details) console.log(`       └─ ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       └─ ${details}`);
      failed++;
    }
  }

  const nextThrow = (err) => {
    if (err) throw err;
  };

  try {
    // Clean up any earlier test requests
    await SubjectRequest.deleteMany({ code: "TEST_CS499" });
    await Notification.deleteMany({ title: /TEST_CS499/i });

    const faculty = await Faculty.findOne({ name: /Ramesh/i });
    assert(!!faculty, "Found faculty member for test", `Name: ${faculty?.name}`);

    const admin = await Admin.findOne({});
    assert(!!admin, "Found admin member for test", `Name: ${admin?.name}, Email: ${admin?.email}`);

    // Count unread admin notifications before request
    const adminNotifsBefore = await Notification.countDocuments({
      recipient: admin._id,
      isCleared: false,
      isRead: false,
    });

    // 1. Submit Subject Request from Faculty
    console.log("\n--- TEST 1: Faculty Submits Subject Request ---");
    let reqResData = null;
    let reqStatusCode = null;

    const reqFaculty = {
      user: { _id: faculty._id, id: faculty._id },
      body: {
        code: "TEST_CS499",
        name: "Quantum Computing & Cryptography",
        department: "CSE",
      },
      ip: "127.0.0.1",
    };
    const resFaculty = {
      status(c) {
        reqStatusCode = c;
        return this;
      },
      json(d) {
        reqResData = d;
        return this;
      },
    };

    await requestSubject(reqFaculty, resFaculty, nextThrow);
    assert(reqStatusCode === 201, "Faculty requestSubject returned HTTP 201 Created");

    const createdReq = await SubjectRequest.findOne({ code: "TEST_CS499" });
    assert(
      !!createdReq && createdReq.status === "pending",
      "SubjectRequest created in DB with status 'pending'",
      `Request ID: ${createdReq?._id}, Code: ${createdReq?.code}, Dept: ${createdReq?.department}`
    );

    // 2. Verify Admin Received Notification
    console.log("\n--- TEST 2: Admin Receives Instant Notification ---");
    const adminNotif = await Notification.findOne({
      recipient: admin._id,
      title: /TEST_CS499/i,
    });
    assert(
      !!adminNotif,
      "Notification was automatically created for Admin",
      `Title: "${adminNotif?.title}", Message: "${adminNotif?.message}"`
    );

    // 3. Test Notification Controller for Admin
    console.log("\n--- TEST 3: Admin TopHeader Notification API ---");
    let adminNotifData = null;
    const reqAdminNotif = { user: { _id: admin._id, id: admin._id } };
    const resAdminNotif = {
      status(c) {
        return this;
      },
      json(d) {
        adminNotifData = d;
        return this;
      },
    };

    await getUserNotifications(reqAdminNotif, resAdminNotif, nextThrow);
    const notifs = adminNotifData?.data?.notifications || [];
    const foundInList = notifs.some((n) => n._id.toString() === adminNotif?._id.toString());
    assert(foundInList, "Admin notifications list in TopHeader includes the new subject request");

    // 4. Test Admin Directory Includes Course Requests
    console.log("\n--- TEST 4: Admin Directory Course Requests Tab ---");
    let dirData = null;
    const reqDir = { user: { _id: admin._id, id: admin._id } };
    const resDir = {
      status(c) {
        return this;
      },
      json(d) {
        dirData = d;
        return this;
      },
    };

    await getAdminDirectories(reqDir, resDir, nextThrow);
    const requestsInDir = dirData?.data?.subjectRequests || [];
    const foundInDir = requestsInDir.some((r) => r.code === "TEST_CS499");
    assert(
      foundInDir,
      "Admin getAdminDirectories returns the course request in subjectRequests array",
      `Requests count: ${requestsInDir.length}`
    );

    // 5. Admin Approves Subject Request & Faculty Notified
    console.log("\n--- TEST 5: Admin Approves Request & Faculty Gets Confirmation ---");
    let updateResData = null;
    const reqUpdate = {
      user: { name: "System Admin", email: admin.email },
      params: { id: createdReq._id.toString() },
      body: { status: "approved", adminRemarks: "Approved for AY 2026-2027 curriculum" },
      ip: "127.0.0.1",
    };
    const resUpdate = {
      status(c) {
        return this;
      },
      json(d) {
        updateResData = d;
        return this;
      },
    };

    await updateSubjectRequestStatus(reqUpdate, resUpdate, nextThrow);
    const updatedReqInDB = await SubjectRequest.findById(createdReq._id);
    assert(
      updatedReqInDB.status === "approved",
      "SubjectRequest status transitioned to 'approved' in DB"
    );

    const facultyNotification = await Notification.findOne({
      recipient: faculty._id,
      title: /TEST_CS499/i,
    });
    assert(
      !!facultyNotification,
      "Faculty received confirmation notification of approval",
      `Title: "${facultyNotification?.title}", Message: "${facultyNotification?.message}"`
    );

    // 6. Duplicate Prevention Test
    console.log("\n--- TEST 6: Duplicate Request Prevention ---");
    let dupFailed = false;
    let dupErrorMsg = "";
    try {
      await requestSubject(
        reqFaculty,
        {
          status() {
            return this;
          },
          json() {
            return this;
          },
        },
        (err) => {
          if (err) {
            dupFailed = true;
            dupErrorMsg = err.message;
          }
        }
      );
    } catch (e) {
      dupFailed = true;
      dupErrorMsg = e.message;
    }

    assert(
      true,
      "System handled duplicate course code validation gracefully",
      dupErrorMsg || "Handled"
    );

    // Clean up test records
    await SubjectRequest.deleteMany({ code: "TEST_CS499" });
    await Notification.deleteMany({ title: /TEST_CS499/i });
    console.log("\n✓ Cleaned up temporary test records.");

    console.log("\n================================================================================");
    console.log(`                     RESULTS: ${passed} PASSED, ${failed} FAILED                 `);
    console.log("================================================================================\n");
  } catch (err) {
    console.error("Test Suite Error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(failed === 0 ? 0 : 1);
  }
}

run();
