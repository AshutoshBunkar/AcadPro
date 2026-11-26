import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { StudentRoster } from "../models/StudentRoster.js";
import { Student } from "../models/Student.js";
import { identifiers } from "../utils/roster.js";
import { ApiError } from "../utils/ApiError.js";

const digest = token => createHash("sha256").update(token).digest("hex");
const acknowledgement = { message: "If your details match the college roster, check your inbox for an activation link." };

export async function requestActivation(req, res) {
  const id = identifiers(req.body?.email, req.body?.mis);
  if (!id) throw new ApiError(400, "Enter your college email and MIS.");
  const origin = new URL(process.env.PUBLIC_APP_URL);
  if (origin.protocol !== "https:" || !process.env.RESEND_API_KEY || !process.env.ACTIVATION_FROM)
    throw new ApiError(503, "Activation is temporarily unavailable.");
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const entry = await StudentRoster.findOneAndUpdate({
    ...id, activatedAt: null, $or: [{ sentAt: null }, { sentAt: { $lte: new Date(now - 60_000) } }],
  }, { $set: { activationDigest: digest(token), sentAt: new Date(now), expiresAt: new Date(now + 900_000) } });
  if (entry) {
    const link = new URL("/activate", origin);
    link.hash = token;
    try {
      const delivery = await fetch("https://api.resend.com/emails", {
        method: "POST", signal: AbortSignal.timeout(8000),
        headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.ACTIVATION_FROM, to: [entry.email],
          subject: "Activate your AcadPro student account", text: "Choose your password within 15 minutes: " + link.href }),
      });
      if (!delivery.ok) throw new Error("Delivery failed");
    } catch {
      console.error("Student activation email delivery failed");
    }
  }
  res.status(202).json(acknowledgement);
}

export async function activateStudent(req, res) {
  const { token, password } = req.body ?? {};
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new ApiError(400, "Invalid activation link.");
  if (typeof password !== "string" || password.length < 12 || Buffer.byteLength(password) > 72)
    throw new ApiError(400, "Use at least 12 characters and at most 72 UTF-8 bytes.");
  await mongoose.connection.transaction(async session => {
    const entry = await StudentRoster.findOneAndUpdate({
      activationDigest: digest(token), activatedAt: null, expiresAt: { $gt: new Date() },
    }, { $set: { activatedAt: new Date() }, $unset: { activationDigest: 1, expiresAt: 1 } }, { new: true, session });
    if (!entry) throw new ApiError(400, "This link expired or has already been used.");
    if (await Student.exists({ $or: [{ mis: entry.mis }, { email: entry.email }] }).session(session))
      throw new ApiError(409, "An account already exists. Sign in or contact your administrator.");
    await Student.create([{ mis: entry.mis, email: entry.email, department: entry.department,
      name: entry.name, currentSemester: entry.semester, year: Math.ceil(entry.semester / 2),
      password: await bcrypt.hash(password, 12), emailVerifiedAt: entry.activatedAt }], { session });
  });
  res.status(201).json({ message: "Account activated. You can now sign in." });
}
