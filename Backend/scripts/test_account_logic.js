import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import { AccountChallenge } from "../models/AccountChallenge.js";
import { StudentRoster } from "../models/StudentRoster.js";
import { Student } from "../models/Student.js";
import { finishChallenge, requestActivation } from "../controllers/accountActions.js";
import { digest, issueChallenge } from "../utils/challenges.js";
import { requireVerified, sessionToken } from "../utils/accountAccess.js";
import { deliverSession, protectBrowserWrites } from "../utils/browserSession.js";
import { validateConfig } from "../utils/config.js";
import { parseRoster } from "../utils/roster.js";
import { isValidAcademicYear } from "../utils/academicConfig.js";
import mongoose from "mongoose";

Object.assign(process.env, { PUBLIC_APP_URL: "https://portal.example.test", VERIFY_ROLES: "student,faculty,admin",
  SENDGRID_API_KEY: "", JWT_SECRET: "fixture-secret", ACTIVATION_FROM: "portal@example.test", RESEND_API_KEY: "test", STAGING_MAILBOX: "" });
const roster = { _id: new mongoose.Types.ObjectId(), mis: "0001", email: "demo@iiitp.ac.in", name: "Demo", semester: 3, department: "CSE" };
const response = () => ({ status(code) { this.code = code; return this; }, json(value) { this.value = value; }, set() {},
  cookie(name, value, options) { this.saved = { name, value, options }; } });

test("the outgoing link uses a fragment and the stored challenge uses only its SHA-256 digest", async t => {
  let saved, mail, delivery;
  t.mock.method(AccountChallenge, "findOneAndUpdate", async (filter, update) => { saved = { ...filter, ...update.$set }; });
  t.mock.method(AccountChallenge, "updateOne", async (_, changes) => { delivery = changes.delivery; });
  t.mock.method(globalThis, "fetch", async (_, options) => { mail = JSON.parse(options.body); return { ok: true }; });
  await issueChallenge(roster, "student", "activate");
  const url = new URL(mail.text.split(" ").at(-1));
  assert.deepEqual(mail.to, [roster.email]); assert.equal(url.origin, process.env.PUBLIC_APP_URL);
  assert.equal(url.pathname, "/activate"); assert.equal(url.search, ""); assert.match(url.hash, /^#[0-9a-f]{64}$/);
  assert.equal(saved.digest, digest(url.hash.slice(1))); assert.equal(saved.expiresAt - saved.sentAt, 900_000);
  assert.equal(JSON.stringify(saved).includes(url.hash.slice(1)), false);
  assert.equal(saved.role, "student"); assert.equal(saved.purpose, "activate"); assert.equal(delivery, "sent");
});
test("SendGrid addresses student activations and faculty invites to their respective inboxes", async t => {
  t.mock.method(AccountChallenge, "findOneAndUpdate", async () => {});
  t.mock.method(AccountChallenge, "updateOne", async () => {});
  process.env.SENDGRID_API_KEY = "fixture";
  process.env.SENDGRID_FROM = "sender@example.org";
  t.after(() => { delete process.env.SENDGRID_FROM; delete process.env.SENDGRID_API_KEY; });
  const send = t.mock.method(globalThis, "fetch", async () => ({ ok: true }));
  for (const [role, purpose, path] of [["student", "activate", "/activate"], ["faculty", "invite", "/account/invite"]]) {
    const email = role + "@example.org";
    await issueChallenge({ ...roster, email }, role, purpose);
    const [endpoint, options] = send.mock.calls.at(-1).arguments;
    const body = JSON.parse(options.body);
    assert.equal(endpoint, "https://api.sendgrid.com/v3/mail/send");
    assert.equal(body.personalizations[0].to[0].email, email);
    assert.equal(new URL(body.content[0].value.split(" ").at(-1)).pathname, path);
  }
});
test("duplicate issuance respects the cooldown without sending mail", async t => {
  t.mock.method(AccountChallenge, "findOneAndUpdate", async () => { throw Object.assign(Error(), { code: 11000 }); });
  const send = t.mock.method(globalThis, "fetch", () => assert.fail("Unexpected mail"));
  await issueChallenge(roster, "student", "activate"); assert.equal(send.mock.callCount(), 0);
});
test("unmatched identifiers receive the same acknowledgement and create no account", async t => {
  t.mock.method(StudentRoster, "findOne", async () => null);
  const create = t.mock.method(Student, "create", () => assert.fail("Unexpected account"));
  const res = response(); await requestActivation({ body: { email: roster.email, mis: "someone-else" } }, res);
  assert.equal(res.code, 202); assert.equal(create.mock.callCount(), 0);
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
test("roster validation preserves leading zeros and rejects canonical duplicates", () => {
  assert.equal(parseRoster([roster])[0].mis, "0001");
  assert.throws(() => parseRoster([roster, { ...roster, mis: "0002", email: roster.email.toUpperCase() }]), /Duplicate/);
});
test("deployment configuration and rollover accept only valid environments and consecutive years", () => {
  assert.equal(isValidAcademicYear("2027-2028"), true); assert.equal(isValidAcademicYear("2027-2030"), false);
  assert.throws(() => validateConfig({ APP_ENV: "staging" }), /STAGING_MAILBOX/);
  assert.throws(() => validateConfig({ APP_ENV: "production", MONGO_DB_URL: "x", JWT_SECRET: "s".repeat(32),
    PUBLIC_APP_URL: "https://portal.example.test", PRIVATE_MEDIA_DIR: process.cwd(), RESEND_API_KEY: "test",
    ACTIVATION_FROM: "a@example.test", STAGING_MAILBOX: "test@example.test" }), /staging mailbox/);
});
