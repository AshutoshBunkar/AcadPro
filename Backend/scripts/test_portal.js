import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { disposableReplica } from "./disposableReplica.js";
import { fixtureConfig, fixtureMailbox, seedFixture } from "./demoFixture.js";

const replica = await disposableReplica();
fixtureConfig(replica);
const mail = fixtureMailbox();
let server;
try {
  const { default: app } = await import("../app.js");
  const { AccountChallenge } = await import("../models/AccountChallenge.js");
  const { Student } = await import("../models/Student.js");
  const { Notification } = await import("../models/Notification.js");
  const { AuditLog } = await import("../models/AuditLog.js");
  const { StudentEnrollment } = await import("../models/StudentEnrollment.js");
  const { TeachingAssignment } = await import("../models/TeachingAssignment.js");
  await mongoose.connect(replica.uri);
  await Promise.all(Object.values(mongoose.models).map(m => m.init()));
  const { admin, faculty, roster, offerings, password } = await seedFixture();
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const http = async (url, body, token, method, extra) => {
    const form = body instanceof FormData;
    const response = await fetch(base + url, { method: method || (body ? "POST" : "GET"),
      headers: { ...(form ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: "Bearer " + token } : {}), ...extra },
      body: body ? (form ? body : JSON.stringify(body)) : undefined });
    const data = response.headers.get("content-type")?.includes("json") ? await response.json() : await response.text();
    return { status: response.status, data, headers: response.headers };
  };
  const ok = async (promise, expected = 200) => {
    const response = await promise;
    assert.equal(response.status, expected, JSON.stringify(response.data?.message || response.status));
    return response.data.data;
  };
  const link = () => new URL(mail.messages.at(-1).url).hash.slice(1);
  const signup = { email: roster.email, mis: roster.mis };
  const cooldown = () => AccountChallenge.updateMany({}, { sentAt: new Date(0) });
  const resetLimit = () => mongoose.model("ActivationLimit").deleteMany({});
  const adminAuth = (await ok(http("/admin/login", { email: admin.email, password }))).token;
  const facultyAuth = (await ok(http("/faculty/login", { email: faculty.email, password }))).token;
  await ok(http("/student/signup", { ...signup, mis: "0002" }), 202);
  assert.equal(mail.messages.length, 0);
  assert.equal(await Notification.countDocuments({ recipient: admin._id }), 1);
  mail.fail = true;
  await ok(http("/student/signup", signup), 202);
  assert.equal(await AccountChallenge.countDocuments({ delivery: "failed" }), 1);
  mail.fail = false;
  await cooldown();
  await ok(http("/student/signup", signup), 202);
  const first = link();
  await ok(http("/student/signup", signup), 202);
  assert.equal(mail.messages.length, 1);
  await AccountChallenge.updateMany({}, { expiresAt: new Date(0) });
  await ok(http("/student/activate", { token: first, password }), 400);
  await cooldown(); await ok(http("/student/signup", signup), 202);
  const superseded = link();
  await cooldown(); await ok(http("/student/signup", signup), 202);
  const token = link();
  await ok(http("/student/activate", { token: superseded, password }), 400);
  await ok(http("/account/reset/complete", { token, password }), 400);
  const simultaneous = await Promise.all([1,2].map(() => http("/student/activate", { token, password })));
  assert.deepEqual(simultaneous.map(r => r.status).sort(), [201, 400]);
  await ok(http("/student/activate", { token, password }), 400);
  const student = await Student.findOne({ mis: roster.mis });
  const studentAuth = (await ok(http("/student/login", { email: roster.email.toUpperCase(), password }))).token;
  await ok(http("/student/login", { mis: roster.mis, password }));
  console.log("PASS activation, ACL mismatch review, delivery failure, expiry, resend, reuse, concurrency and both login identifiers.");

  const legacy = await Student.create({ name: "Legacy", email: "legacy@iiitp.ac.in", mis: "0099", department: "CSE",
    year: 1, currentSemester: 1, password: await bcrypt.hash(password, 10) });
  const oldToken = jwt.sign({ id: legacy._id, role: "student" }, process.env.JWT_SECRET, { expiresIn: "1h" });
  await ok(http("/student/profile", null, oldToken), 403);
  await resetLimit();
  await ok(http("/account/confirm/request", { email: legacy.email }), 202);
  await ok(http("/account/confirm/complete", { token: link() }));
  await ok(http("/student/profile", null, oldToken), 401);
  const outsider = (await ok(http("/student/login", { mis: legacy.mis, password }))).token;
  const invited = await ok(http("/admin/faculty", { name: "New Teacher", email: "invited@example.test", password: "unusable" }, adminAuth), 201);
  const inviteToken = link();
  await ok(http("/account/invite/complete", { token: inviteToken, password, role: "admin" }));
  await ok(http("/faculty/login", { email: invited.email, password }));
  const known = await http("/account/reset/request", { email: admin.email });
  const unknown = await http("/account/reset/request", { email: "nobody@example.test" });
  assert.deepEqual(known.data, unknown.data);
  await ok(http("/account/reset/complete", { token: link(), password: password + "2" }));
  await ok(http("/admin/profile", null, adminAuth), 401);
  const staff = (await ok(http("/admin/login", { email: admin.email, password: password + "2" }))).token;
  await ok(http("/admin/student/" + student._id, { email: "updated@iiitp.ac.in" }, staff, "PUT"));
  assert.equal((await Student.findById(student._id)).email, roster.email);
  await ok(http("/account/email/complete", { token: link() }));
  await ok(http("/student/profile", null, studentAuth), 401);
  const auth = (await ok(http("/student/login", { email: "updated@iiitp.ac.in", password }))).token;
  console.log("PASS legacy sessions, confirmation, invitation, admin recovery, email replacement and session revocation.");

  const [initial, next] = offerings;
  const current = await ok(http("/student/current-courses", null, auth));
  assert.deepEqual(current.courses.map(c => c.code), ["CS101"]);
  const historic = await TeachingAssignment.create({ facultyId: faculty._id, subjectId: initial.subject._id,
    academicYear: "2025-2026", semester: 1, status: "archived" });
  await StudentEnrollment.create({ studentId: student._id, subjectId: initial.subject._id, facultyId: faculty._id,
    teachingAssignmentId: historic._id, academicYear: "2025-2026", semester: 1, status: "archived" });
  const historicCourse = await ok(http(`/student/courses/${initial.subject._id}?offeringId=${historic._id}`, null, auth));
  assert.equal(historicCourse.academicYear, "2025-2026");
  assert.equal(historicCourse.isReadOnly, true);
  const upload = (source = initial) => {
    const form = new FormData(); form.append("video", new Blob(["synthetic-video"], { type: "video/webm" }), "sample.webm");
    form.append("title", "First recording"); form.append("topicId", String(source.topic._id));
    form.append("offeringId", String(source.assignment._id)); return form;
  };
  const lecture = await ok(http("/lecture/upload", upload(), facultyAuth), 201);
  assert.equal((await ok(http("/student/current-courses", null, auth))).courses[0].latestLecture.title, "First recording");
  const bytes = await http(lecture.videoUrl, null, auth, "GET", { Range: "bytes=0-3" });
  assert.equal(bytes.status, 206); assert.equal(bytes.data, "synt");
  assert.equal((await http(lecture.videoUrl, null, outsider)).status, 404);
  assert.equal((await http(lecture.videoUrl)).status, 401);
  await ok(http("/comment/postComment", { lectureId: lecture._id, text: "Question" }, auth), 201);
  await ok(http("/lecture/" + lecture._id + "/reference", { semesters: [1] }, staff, "PUT"));
  assert.equal((await ok(http("/student/accessible-resources", null, outsider))).length, 1);
  const higher = await ok(http("/lecture/upload", upload(next), facultyAuth), 201);
  await ok(http("/lecture/" + higher._id + "/reference", { semesters: [1] }, staff, "PUT"));
  assert.equal((await http(higher.videoUrl, null, outsider)).status, 200);
  assert.equal(await StudentEnrollment.countDocuments({ studentId: legacy._id }), 0);
  await ok(http("/comment/postComment", { lectureId: lecture._id, text: "Question" }, outsider), 403);
  const promote = { studentId: student._id, newSemester: 3 };
  const preview = await ok(http("/admin/promote", { ...promote, preview: true }, staff, "PUT"));
  assert.equal(preview.enrollments.created, 1); assert.equal(preview.transitionedOldEnrollments, 1);
  for (let n = 0; n < 2; n++) await ok(http("/admin/promote", promote, staff, "PUT"));
  assert.equal(await AuditLog.countDocuments({ action: "STUDENT_PROMOTED" }), 1);
  assert.deepEqual((await ok(http("/student/current-courses", null, auth))).courses.map(c => c.code), ["CS301"]);
  assert.equal((await ok(http("/student/past-semesters", null, auth)))[0].courses[0].lecturesCount, 1);
  for (const [offering, expected] of [[initial, 0], [next, 1]]) {
    const rosterData = await ok(http("/faculty/courses/" + offering.subject._id + "/roster?semester=" + offering.assignment.semester, null, facultyAuth));
    assert.equal(rosterData.students.length, expected);
  }
  console.log("PASS upload, range playback, private access, reference audience, promotion preview, replay, archives and faculty rosters.");
  const request = { name: "Algorithms", code: " cs305 ", department: "CSE", semester: 3 };
  const requested = await ok(http("/faculty/request-subject", request, facultyAuth), 201);
  await ok(http("/faculty/request-subject", request, facultyAuth));
  for (let n = 0; n < 2; n++) await ok(http("/admin/subject-requests/" + requested._id + "/status", { status: "approved" }, staff, "PATCH"));
  assert.equal((await ok(http("/student/current-courses", null, auth))).courses.length, 2);
  await ok(http("/admin/update", { academicYear: "2027-2028", term: "EVEN" }, staff, "PUT"));
  assert.equal((await ok(http("/student/current-courses", null, auth))).courses.length, 0);
  assert.equal((await http(lecture.videoUrl, null, auth)).status, 200);
  await ok(http("/admin/update", { academicYear: "2026-2027", term: "ODD" }, staff, "PUT"));
  const browser = await http("/student/login", { mis: roster.mis, password }, null, "POST", { "X-AcadPro-Client": "web" });
  assert.equal(browser.data.data.token, undefined);
  const cookie = browser.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  await ok(http("/account/session", null, null, "GET", { Cookie: cookie.split(";")[0] }));
  assert.equal((await http("/account/logout", {}, null, "POST", { Cookie: cookie.split(";")[0] })).status, 403);
  console.log("PASS request/approval replay, term rollover, cookie session and CSRF checks.");
  const counts = await Promise.all([Student.countDocuments(), StudentEnrollment.countDocuments(), AuditLog.countDocuments()]);
  const indexNames = (await StudentEnrollment.listIndexes()).map(i => i.name).sort();
  await mongoose.disconnect(); await replica.restoreCopy(); await mongoose.connect(replica.uri);
  assert.deepEqual(await Promise.all([Student.countDocuments(), StudentEnrollment.countDocuments(), AuditLog.countDocuments()]), counts);
  assert.deepEqual((await StudentEnrollment.listIndexes()).map(i => i.name).sort(), indexNames);
  await ok(http("/student/login", { mis: roster.mis, password }));
  console.log("PASS cold backup restored into a separate database directory, with counts, indexes and login verified.");
  const backend = fileURLToPath(new URL("../", import.meta.url));
  for (const script of ["test_student_roster.mjs", "test_api_endpoints.js", "test_subject_request_flow.js", "test_notification_api.js", "test_academic_workflows.js"]) {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.join("scripts", script)], { cwd: backend, windowsHide: true,
        env: { ...process.env, TEST_API_BASE: base, VERIFY_ROLES: "" }, stdio: ["ignore", "pipe", "pipe"] });
      let output = ""; child.stdout.on("data", c => output += c); child.stderr.on("data", c => output += c);
      child.on("error", reject);
      child.on("exit", code => {
        if (code === 0 && !/\[FAIL\]|TEST FAILED|TEST ERROR/.test(output)) { console.log("PASS " + script); resolve(); }
        else reject(Error(script + " failed: " + output.slice(-1400)));
      });
    });
  }
} finally {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  mail.close(); await mongoose.disconnect(); await replica.close();
}
