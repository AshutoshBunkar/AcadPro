import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { Admin } from "../models/Admin.js";
import { Faculty } from "../models/Faculty.js";
import { Student } from "../models/Student.js";
import { AccountChallenge } from "../models/AccountChallenge.js";
import { ApiError } from "../utils/ApiError.js";
import { accepted, digest, issueChallenge, logMail, mailOrigin, validEmail } from "../utils/challenges.js";
import { enrollInOfferings } from "../utils/enrollInOfferings.js";

export const accounts = { student: Student, faculty: Faculty, admin: Admin };
const invalid = () => new ApiError(400, "This link is invalid, expired, or already used.");

const caseInsensitive = { locale: "en", strength: 2 };

async function registrationDetails(role, fields, session = null) {
  const { email, name, department } = fields;
  const query = role === "student" ? { $or: [{ email }, { mis: fields.mis }] } : { email };
  if (await accounts[role].exists(query).collation(caseInsensitive).session(session)) {
    throw new ApiError(409, "These details already belong to an account. Sign in or recover your account.");
  }
  if (role === "faculty") return { name, department };

  return { name, department, semester: fields.semester, mis: fields.mis };
}

export const requestSignup = role => async (req, res) => {
  const input = req.body || {};
  const clean = value => typeof value === "string" ? value.trim() : "";
  const email = clean(input.email).toLowerCase();
  const name = clean(input.name);
  const department = clean(input.department);
  if (!validEmail(email) || !name || name.length > 120 || !department || department.length > 120) {
    throw new ApiError(400, "Enter your name, department and a valid email.");
  }
  const mis = clean(input.mis);
  const semester = Number(input.semester);
  if (role === "student" && (!mis || mis.length > 64 || mis.includes("@") || !Number.isInteger(semester) || semester < 1 || semester > 8)) {
    throw new ApiError(400, "Enter a valid MIS and a semester from 1 to 8.");
  }
  const registration = await registrationDetails(role, { name, department, email, mis, semester });
  const owner = { _id: digest(role + ":" + email).slice(0, 24), email };
  const delivery = await issueChallenge(owner, role, "signup", email, req.requestId, registration);
  if (delivery?.delivery === "failed") {
    if ([401, 403].includes(delivery.providerStatus)) {
      throw new ApiError(503, "The email provider blocked this verification email. Contact the portal admin to restore email sending.");
    }
    throw new ApiError(503, "Could not send the signup email. Try again in one minute.");
  }
  res.status(202).json({ message: delivery ? "Check your inbox to verify your email and choose a password." : "A link was recently requested. Check your inbox or try again in one minute." });
};

export async function requestAccountLink(req, res) {
  const purpose = req.params.purpose;
  if (!["reset", "confirm", "invite"].includes(purpose)) throw invalid();
  const email = req.body?.email?.trim?.().toLowerCase();
  if (!validEmail(email)) throw new ApiError(400, "Enter a valid email.");
  mailOrigin();
  let eligible = false;
  for (const [role, Model] of Object.entries(accounts)) {
    if (role === "admin") continue;
    const account = await Model.findOne({ email }).collation({ locale: "en", strength: 2 });
    if (!account) continue;
    if (purpose === "invite" && !(role === "faculty" && account.invitationPending)) continue;
    if (purpose === "confirm" && (account.emailVerifiedAt || account.invitationPending)) continue;
    if (purpose === "reset" && !account.emailVerifiedAt) continue;
    eligible = true;
    await issueChallenge(account, role, purpose, account.email, req.requestId);
  }
  if (!eligible) logMail(req.requestId, purpose, "ineligible");
  res.status(202).json(accepted);
}

export async function finishChallenge(req, res) {
  const purpose = req.params.purpose;
  if (!["signup", "reset", "invite", "confirm", "email"].includes(purpose)) throw invalid();
  const { token, password } = req.body ?? {};
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw invalid();
  const choosesPassword = ["signup", "reset", "invite"].includes(purpose);
  if (choosesPassword && (typeof password !== "string" || password.length < 6 || Buffer.byteLength(password) > 72)) {
    throw new ApiError(400, "Use at least 6 characters and at most 72 UTF-8 bytes.");
  }
  const role = await mongoose.connection.transaction(async session => {
    const now = new Date();
    const claim = await AccountChallenge.findOneAndUpdate({ digest: digest(token), purpose,
      consumedAt: null, expiresAt: { $gt: now } }, { consumedAt: now }, { session, new: true });
    if (!claim || claim.role === "admin") throw invalid();
    if (purpose === "signup") {
      const { role, email } = claim;
      const fields = await registrationDetails(role, { ...claim.toObject().registration, email }, session);
      if (role === "student") {
        const [student] = await Student.create([{ ...fields, currentSemester: fields.semester,
          year: Math.ceil(fields.semester / 2), email, emailVerifiedAt: now, password: await bcrypt.hash(password, 12) }], { session });
        await enrollInOfferings(student, session);
      } else {
        await Faculty.create([{ ...fields, email, emailVerifiedAt: now, password }], { session });
      }
    } else {
      const Model = accounts[claim.role];
      const account = await Model.findOne({ _id: claim.owner, email: claim.originalEmail }).session(session);
      if (!account) throw invalid();
      if (purpose === "email") {
        account.email = claim.email;
      }
      if (choosesPassword) account.password = claim.role === "student" ? await bcrypt.hash(password, 12) : password;
      account.invitationPending = false;
      account.emailVerifiedAt = now;
      account.sessionVersion = (account.sessionVersion || 0) + 1;
      await account.save({ session });
      await AccountChallenge.updateMany({ owner: account._id, role: claim.role, consumedAt: null }, { consumedAt: now }, { session });
    }
    return claim.role;
  });
  res.status(purpose === "signup" ? 201 : 200).json({ role, message: "Account updated. You can sign in." });
}
