import { randomBytes } from "node:crypto";
import path from "node:path";

export function fixtureConfig(replica, origin = "http://localhost:4180") {
  Object.assign(process.env, { NODE_ENV: "test", ADMIN_EMAIL: "admin@example.test", ADMIN_PASSWORD: "Fixture-only-pass42", APP_ENV: "development", PUBLIC_APP_URL: origin, MONGO_DB_URL: replica.uri,
    JWT_SECRET: randomBytes(32).toString("hex"), PRIVATE_MEDIA_DIR: path.join(replica.root, "media"),
    SENDGRID_API_KEY: "", SENDGRID_FROM: "", RESEND_API_KEY: "fixture", ACTIVATION_FROM: "portal@example.test", VERIFY_ROLES: "student,faculty,admin", STAGING_MAILBOX: "" });
}
// This transport exists only inside the isolated fixture process.
export function fixtureMailbox() {
  const original = globalThis.fetch;
  const messages = [];
  const mailbox = { messages, fail: false, close: () => { globalThis.fetch = original; } };
  globalThis.fetch = (url, options) => {
    const provider = String(url);
    const sendgrid = provider === "https://api.sendgrid.com/v3/mail/send";
    if (!sendgrid && provider !== "https://api.resend.com/emails") {
      if (!["127.0.0.1", "localhost"].includes(new URL(provider).hostname)) throw Error("External fixture request blocked");
      return original(url, options);
    }
    if (!mailbox.fail) {
      const data = JSON.parse(options.body);
      const to = sendgrid ? data.personalizations[0].to[0].email : data.to[0];
      const text = sendgrid ? data.content[0].value : data.text;
      messages.push({ to, url: text.split(" ").at(-1) });
    }
    return Promise.resolve(new Response(null, { status: mailbox.fail ? 503 : 202 }));
  };
  return mailbox;
}
export async function seedFixture(password = "Fixture-only-pass42") {
  const { Admin } = await import("../models/Admin.js");
  const { Faculty } = await import("../models/Faculty.js");
  const { AcademicSession } = await import("../models/AcademicSession.js");
  const { TeachingAssignment } = await import("../models/TeachingAssignment.js");
  const { Subject } = await import("../models/Subject.js");
  const { Topic } = await import("../models/Topic.js");
  const admin = await Admin.create({ name: "Demo Admin", email: "admin@example.test", password, emailVerifiedAt: new Date() });
  const faculty = await Faculty.create({ name: "Ramesh Demo", department: "CSE", email: "faculty@example.test", password, emailVerifiedAt: new Date() });
  const term = await AcademicSession.create({ academicYear: "2026-2027", term: "ODD" });
  const offerings = [];
  for (const [semester, code, name] of [[1, "CS101", "Programming basics"], [3, "CS301", "Data structures"]]) {
    const subject = await Subject.create({ name, code, year: Math.ceil(semester / 2), department: "CSE", allowedSemesters: [semester] });
    const assignment = await TeachingAssignment.create({ facultyId: faculty._id, subjectId: subject._id, academicYear: term.academicYear, semester, section: "A", department: "CSE" });
    const topic = await Topic.create({ subjectId: subject._id, order: 1, name: "Getting started" });
    offerings.push({ assignment, subject, topic });
  }
  const studentDetails = { name: "Demo Student", email: "demo.student@iiitp.ac.in", mis: "0001", department: "CSE", semester: 1 };
  return { admin, faculty, offerings, studentDetails, password };
}
