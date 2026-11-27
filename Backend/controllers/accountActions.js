import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { Admin } from "../models/Admin.js";
import { Faculty } from "../models/Faculty.js";
import { Student } from "../models/Student.js";
import { StudentRoster } from "../models/StudentRoster.js";
import { AccountChallenge } from "../models/AccountChallenge.js";
import { Notification } from "../models/Notification.js";
import { ApiError } from "../utils/ApiError.js";
import { accepted, digest, issueChallenge, mailOrigin, validEmail } from "../utils/challenges.js";
import { identifiers } from "../utils/roster.js";
import { enrollInOfferings } from "../utils/enrollInOfferings.js";

export const accounts = { student: Student, faculty: Faculty, admin: Admin };
const invalid = () => new ApiError(400, "This link is invalid, expired, or already used.");

export async function requestActivation(req, res) {
  const id = identifiers(req.body?.email, req.body?.mis);
  if (!id) throw new ApiError(400, "Enter your email and MIS.");
  mailOrigin();
  const roster = await StudentRoster.findOne(id);
  if (roster && !roster.activatedAt) await issueChallenge(roster, "student", "activate");
  if (!roster) {
    const known = await StudentRoster.findOne({ $or: [{ email: id.email }, { mis: id.mis }] });
    if (known) {
      const admins = await Admin.find().select("_id");
      for (const admin of admins) {
        await Notification.updateOne({ recipient: admin._id, title: "Review roster identity " + known._id },
          { $setOnInsert: { recipientRole: "admin", message: "An activation attempt matched only one approved identifier. Review the registrar record.", type: "system", link: "/admin/dashboard" } }, { upsert: true });
      }
    }
  }
  res.status(202).json(accepted);
}
export async function requestAccountLink(req, res) {
  const purpose = req.params.purpose;
  if (!["reset", "confirm", "invite"].includes(purpose)) throw invalid();
  const email = req.body?.email?.trim?.().toLowerCase();
  if (!validEmail(email)) throw new ApiError(400, "Enter a valid email.");
  mailOrigin();
  for (const [role, Model] of Object.entries(accounts)) {
    const account = await Model.findOne({ email }).collation({ locale: "en", strength: 2 });
    if (!account) continue;
    if (purpose === "invite" && !(role === "faculty" && account.invitationPending)) continue;
    if (purpose === "confirm" && (account.emailVerifiedAt || account.invitationPending)) continue;
    if (purpose === "reset" && !account.emailVerifiedAt) continue;
    await issueChallenge(account, role, purpose);
  }
  res.status(202).json(accepted);
}

export async function finishChallenge(req, res) {
  const purpose = req.params.purpose || "activate";
  const { token, password } = req.body ?? {};
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw invalid();
  const choosesPassword = ["activate", "reset", "invite"].includes(purpose);
  if (choosesPassword && (typeof password !== "string" || password.length < 12 || Buffer.byteLength(password) > 72)) {
    throw new ApiError(400, "Use at least 12 characters and at most 72 UTF-8 bytes.");
  }
  await mongoose.connection.transaction(async session => {
    const now = new Date();
    const claim = await AccountChallenge.findOneAndUpdate({ digest: digest(token), purpose,
      consumedAt: null, expiresAt: { $gt: now } }, { consumedAt: now }, { session, new: true });
    if (!claim) throw invalid();
    if (purpose === "activate") {
      const entry = await StudentRoster.findOneAndUpdate({ _id: claim.owner, email: claim.email, activatedAt: null },
        { activatedAt: now }, { session, new: true });
      if (!entry) throw invalid();
      if (await Student.exists({ $or: [{ email: entry.email }, { mis: entry.mis }] }).collation({ locale: "en", strength: 2 }).session(session)) {
        throw new ApiError(409, "An account already exists. Use account confirmation.");
      }
      const [student] = await Student.create([{ email: entry.email, mis: entry.mis, name: entry.name,
        department: entry.department, year: Math.ceil(entry.semester / 2), currentSemester: entry.semester,
        password: await bcrypt.hash(password, 12), emailVerifiedAt: now }], { session });
      await enrollInOfferings(student, session);
    } else {
      const Model = accounts[claim.role];
      const account = await Model.findOne({ _id: claim.owner, email: claim.originalEmail }).session(session);
      if (!account) throw invalid();
      if (purpose === "email") {
        if (claim.role === "student") await StudentRoster.updateOne({ mis: account.mis, email: account.email }, { email: claim.email }, { session });
        account.email = claim.email;
      }
      if (choosesPassword) account.password = claim.role === "student" ? await bcrypt.hash(password, 12) : password;
      account.invitationPending = false;
      account.emailVerifiedAt = now;
      account.sessionVersion = (account.sessionVersion || 0) + 1;
      await account.save({ session });
      await AccountChallenge.updateMany({ owner: account._id, role: claim.role, consumedAt: null }, { consumedAt: now }, { session });
    }
  });
  res.status(purpose === "activate" ? 201 : 200).json({ message: "Account updated. You can sign in." });
}
