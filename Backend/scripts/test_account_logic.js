import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import { AccountChallenge } from "../models/AccountChallenge.js";
import { Faculty } from "../models/Faculty.js";
import { Admin } from "../models/Admin.js";
import { fixtureMailbox } from "./demoFixture.js";
import { Student } from "../models/Student.js";
import { finishChallenge, requestSignup, requestAccountLink } from "../controllers/accountActions.js";
import { digest, issueChallenge } from "../utils/challenges.js";
import { requireVerified, sessionToken } from "../utils/accountAccess.js";
import { deliverSession, protectBrowserWrites } from "../utils/browserSession.js";
import { validateConfig } from "../utils/config.js";
import { isValidAcademicYear } from "../utils/academicConfig.js";
import mongoose from "mongoose";

Object.assign(process.env, { PUBLIC_APP_URL: "https://portal.example.test", VERIFY_ROLES: "student,faculty,admin",
  SENDGRID_API_KEY: "", JWT_SECRET: "fixture-secret", ACTIVATION_FROM: "portal@example.test", RESEND_API_KEY: "test", STAGING_MAILBOX: "" });
const studentDetails = { _id: new mongoose.Types.ObjectId(), mis: "0001", email: "demo@iiitp.ac.in", name: "Demo", semester: 3, department: "CSE" };
const response = () => ({ status(code) { this.code = code; return this; }, json(value) { this.value = value; }, set() {},
  cookie(name, value, options) { this.saved = { name, value, options }; } });

test("the outgoing link uses a fragment and the stored challenge uses only its SHA-256 digest", async t => {
  let saved, mail, delivery;
  t.mock.method(AccountChallenge, "findOneAndUpdate", async (filter, update) => { saved = { ...filter, ...update.$set }; });
  t.mock.method(AccountChallenge, "updateOne", async (_, changes) => { delivery = changes.delivery; });
  t.mock.method(globalThis, "fetch", async (_, options) => { mail = JSON.parse(options.body); return new Response(null, { status: 202 }); });
  await issueChallenge(studentDetails, "student", "signup");
  const url = new URL(mail.text.split(" ").at(-1));
  assert.deepEqual(mail.to, [studentDetails.email]); assert.equal(url.origin, process.env.PUBLIC_APP_URL);
  assert.equal(url.pathname, "/account/signup"); assert.equal(url.search, ""); assert.match(url.hash, /^#[0-9a-f]{64}$/);
  assert.equal(saved.digest, digest(url.hash.slice(1))); assert.equal(saved.expiresAt - saved.sentAt, 900_000);
  assert.equal(JSON.stringify(saved).includes(url.hash.slice(1)), false);
  assert.equal(saved.role, "student"); assert.equal(saved.purpose, "signup"); assert.equal(delivery, "sent");
});
test("SendGrid addresses student activations and faculty invites to their respective inboxes", async t => {
  t.mock.method(AccountChallenge, "findOneAndUpdate", async () => {});
  t.mock.method(AccountChallenge, "updateOne", async () => {});
  process.env.SENDGRID_API_KEY = "fixture";
  process.env.SENDGRID_FROM = "sender@example.org";
  t.after(() => { delete process.env.SENDGRID_FROM; delete process.env.SENDGRID_API_KEY; });
  const send = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 202 }));
  for (const [role, purpose, path] of [["student", "signup", "/account/signup"], ["faculty", "invite", "/account/invite"]]) {
    const email = role + "@example.org";
    await issueChallenge({ ...studentDetails, email }, role, purpose);
    const [endpoint, options] = send.mock.calls.at(-1).arguments;
    const body = JSON.parse(options.body);
    assert.equal(endpoint, "https://api.sendgrid.com/v3/mail/send");
    assert.equal(body.personalizations[0].to[0].email, email);
    assert.equal(new URL(body.content[0].value.split(" ").at(-1)).pathname, path);
  }
});
test("provider failures retain only bounded diagnostics, and successful sends retain the message ID", async t => {
  t.mock.method(AccountChallenge, "findOneAndUpdate", async () => {});
  const update = t.mock.method(AccountChallenge, "updateOne", async () => {});
  process.env.SENDGRID_API_KEY = "fixture";
  process.env.SENDGRID_FROM = "sender@example.test";
  t.after(() => { process.env.SENDGRID_API_KEY = ""; delete process.env.SENDGRID_FROM; });
  const responses = [
    () => Response.json({ errors: [{ message: "The from address does not match a verified Sender Identity" }] }, { status: 403 }),
    () => new Response("sensitive provider body", { status: 403 }),
    () => { throw new DOMException("sensitive URL", "TimeoutError"); },
    () => new Response(null, { status: 202, headers: { "X-Message-Id": "test-id" } }),
  ];
  t.mock.method(globalThis, "fetch", async () => responses.shift()());
  for (const expected of [
    { delivery: "failed", providerStatus: 403, failureReason: "unverified_sender" },
    { delivery: "failed", providerStatus: 403, failureReason: "sender_or_permission_denied" },
    { delivery: "failed", failureReason: "timeout" },
    { delivery: "sent", providerStatus: 202, providerMessageId: "test-id" },
  ]) {
    await issueChallenge(studentDetails, "student", "signup");
    assert.deepEqual(update.mock.calls.at(-1).arguments[1], expected);
  }
});

test("fixture captures both provider formats and blocks other external fetches", async () => {
  const mailbox = fixtureMailbox();
  try {
    const link = "https://portal.example.test/account/signup#fixture";
    const text = "Open " + link;
    for (const [url, body] of [
      ["https://api.resend.com/emails", { to: [studentDetails.email], text }],
      ["https://api.sendgrid.com/v3/mail/send", { personalizations: [{ to: [{ email: studentDetails.email }] }], content: [{ value: text }] }],
    ]) await fetch(url, { body: JSON.stringify(body) });
    assert.deepEqual(mailbox.messages, Array(2).fill({ to: studentDetails.email, url: link }));
    assert.throws(() => fetch("https://example.test/elsewhere"), /blocked/);
  } finally { mailbox.close(); }
});

test("public link requests send only for eligible roles and return identical acknowledgements", async t => {
  let faculty;
  for (const Model of [Student, Admin, Faculty]) {
    t.mock.method(Model, "findOne", () => ({ collation: async () => Model === Faculty ? faculty : null }));
  }
  t.mock.method(AccountChallenge, "findOneAndUpdate", async () => {});
  t.mock.method(AccountChallenge, "updateOne", async () => {});
  const send = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 202 }));
  for (const [purpose, state, eligible] of [
    ["confirm", null, false], ["reset", {}, false], ["confirm", {}, true],
    ["confirm", { invitationPending: true }, false], ["invite", { invitationPending: true }, true],
    ["invite", {}, false], ["reset", { emailVerifiedAt: new Date() }, true],
  ]) {
    faculty = state && { ...studentDetails, ...state };
    const previous = send.mock.callCount();
    const res = response();
    await requestAccountLink({ params: { purpose }, body: { email: studentDetails.email } }, res);
    assert.equal(res.code, 202);
    assert.equal(send.mock.callCount() - previous, Number(eligible));
    assert.deepEqual(res.value, { message: "If the details match an eligible account, check your inbox." });
  }
});

test("duplicate issuance respects the cooldown without sending mail", async t => {
  t.mock.method(AccountChallenge, "findOneAndUpdate", async () => { throw Object.assign(Error(), { code: 11000 }); });
  t.mock.method(AccountChallenge, "findOne", () => ({ lean: async () => null }));
  const send = t.mock.method(globalThis, "fetch", () => assert.fail("Unexpected mail"));
  await issueChallenge(studentDetails, "student", "signup"); assert.equal(send.mock.callCount(), 0);
});
test("completion requires the exact purpose, unconsumed digest and future expiry in the transaction", async t => {
  const transaction = {};
  t.mock.method(mongoose.connection, "transaction", cb => cb(transaction));
  let condition;
  t.mock.method(AccountChallenge, "findOneAndUpdate", async (filter, update, options) => {
    assert.equal(options.session, transaction); assert.ok(update.consumedAt instanceof Date); condition = filter; return null;
  });
  const token = "a".repeat(64);
  await assert.rejects(finishChallenge({ params: { purpose: "reset" }, body: { token, password: "demo password 15" } }, response()), /expired/);
  assert.equal(condition.purpose, "reset"); assert.equal(condition.digest, digest(token)); assert.equal(condition.consumedAt, null);
  assert.ok(condition.expiresAt.$gt instanceof Date);
});
test("verification gates login and versioned tokens expire after eight hours", () => {
  assert.throws(() => requireVerified({}, "student"), /Confirm/);
  const claims = jwt.verify(sessionToken({ _id: "demo", emailVerifiedAt: new Date(), sessionVersion: 2 }, "faculty"), process.env.JWT_SECRET);
  assert.equal(claims.role, "faculty"); assert.equal(claims.version, 2); assert.equal(claims.exp - claims.iat, 28800);
});
test("browser sessions use secure HttpOnly cookies and cross-origin writes are denied", () => {
  const web = { method: "POST", get: name => name === "origin" ? "https://elsewhere.example" : "web", cookies: { acadpro_session: "fixture" } };
  const res = response(); assert.deepEqual(deliverSession(web, res, "token"), {});
  assert.ok(res.saved.options.httpOnly && res.saved.options.secure); assert.equal(res.saved.options.sameSite, "lax");
  protectBrowserWrites(web, res, () => assert.fail("Unexpected write")); assert.equal(res.code, 403);
});
test("deployment configuration and rollover accept only valid environments and consecutive years", () => {
  assert.equal(isValidAcademicYear("2027-2028"), true); assert.equal(isValidAcademicYear("2027-2030"), false);
  assert.throws(() => validateConfig({ APP_ENV: "staging" }), /STAGING_MAILBOX/);
  assert.throws(() => validateConfig({ APP_ENV: "production", MONGO_DB_URL: "x", JWT_SECRET: "s".repeat(32),
    PUBLIC_APP_URL: "https://portal.example.test", PRIVATE_MEDIA_DIR: process.cwd(), RESEND_API_KEY: "test",
    ACTIVATION_FROM: "a@example.test", STAGING_MAILBOX: "test@example.test" }), /staging mailbox/);
});

test("new students and faculty verify their mailbox before an account is created", async t => {
  const empty = value => ({ collation: () => ({ session: async () => value }) });
  let existing = false;
  t.mock.method(Student, "exists", () => empty(existing));
  t.mock.method(Faculty, "exists", () => empty(false));
  t.mock.method(mongoose.model("AcademicSession"), "findOne", () => ({ session: async () => null }));
  t.mock.method(mongoose.connection, "transaction", work => work({}));
  let claim;
  t.mock.method(AccountChallenge, "findOneAndUpdate", async (filter, update) => {
    if (filter.digest) {
      if (filter.digest !== claim?.digest || filter.purpose !== claim.purpose || claim.consumedAt) return null;
      claim.consumedAt = new Date();
      return claim;
    }
    claim = new AccountChallenge({ ...filter, ...update.$set });
  });
  t.mock.method(AccountChallenge, "updateOne", async () => {});
  const mailbox = fixtureMailbox();
  t.after(() => mailbox.close());
  for (const [role, model] of [["student", Student], ["faculty", Faculty]]) {
    const create = t.mock.method(model, "create", async docs => docs);
    const req = { body: { ...studentDetails, email: "NEW@example.org", role: "admin" } };
    const res = response();
    await requestSignup(role)(req, res);
    assert.equal(res.code, 202);
    assert.equal(create.mock.callCount(), 0);
    const mail = mailbox.messages.at(-1);
    assert.equal(mail.to, "new@example.org");
    const url = new URL(mail.url);
    assert.equal(url.pathname, "/account/signup");
    const complete = { params: { purpose: "signup" }, body: { token: url.hash.slice(1), password: "abcde" } };
    await assert.rejects(finishChallenge(complete, res), /at least 6 characters/);
    complete.body.password = "abcdef";
    await finishChallenge(complete, res);
    assert.equal(res.code, 201);
    assert.equal(res.value.role, role);
    const [account] = create.mock.calls[0].arguments[0];
    assert.ok(account.emailVerifiedAt instanceof Date);
    assert.equal(account.email, mail.to);
    if (role === "student") {
      assert.equal(account.mis, "0001");
      assert.equal(account.currentSemester, 3);
      assert.equal(account.year, 2);
      assert.notEqual(account.password, complete.body.password);
    }
    await assert.rejects(finishChallenge(complete, res), /expired/);
  }
  existing = true;
  await assert.rejects(requestSignup("student")({ body: studentDetails }, response()), /already belong/);
  assert.equal(mailbox.messages.length, 2);
});

test("the fixed admin is provisioned once and rotating its configured password revokes old sessions", async t => {
  const { configureAdmin } = await import("../utils/fixedAdmin.js");
  const originalEmail = process.env.ADMIN_EMAIL, originalPassword = process.env.ADMIN_PASSWORD;
  t.after(() => {
    for (const [key, value] of [["ADMIN_EMAIL", originalEmail], ["ADMIN_PASSWORD", originalPassword]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  process.env.ADMIN_EMAIL = "Fixed@example.org";
  process.env.ADMIN_PASSWORD = "abcde";
  await assert.rejects(configureAdmin(), /6-character minimum/);
  process.env.ADMIN_PASSWORD = "abcdef";
  let account;
  t.mock.method(Admin, "findOne", () => ({ collation: async () => account }));
  const create = t.mock.method(Admin, "create", async fields => {
    account = { ...fields, sessionVersion: 0, isPasswordCorrect: async password => password === account.password, save: async () => {} };
  });
  await configureAdmin();
  assert.equal(account.email, "fixed@example.org");
  assert.ok(account.emailVerifiedAt);
  await configureAdmin();
  assert.equal(create.mock.callCount(), 1);
  assert.equal(account.sessionVersion, 0);
  process.env.ADMIN_PASSWORD += "-rotated";
  await configureAdmin();
  assert.equal(account.sessionVersion, 1);
  assert.equal(account.password, process.env.ADMIN_PASSWORD);
});
