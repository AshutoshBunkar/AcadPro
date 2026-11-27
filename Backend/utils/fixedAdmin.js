import { Admin } from "../models/Admin.js";
import { validEmail } from "./challenges.js";

export const fixedAdminEmail = () => process.env.ADMIN_EMAIL?.trim().toLowerCase();

export async function configureAdmin() {
  const email = fixedAdminEmail();
  const password = process.env.ADMIN_PASSWORD;
  if (!validEmail(email) || !password || password.length < 6 || Buffer.byteLength(password) > 72) {
    throw new Error("Set ADMIN_EMAIL and a 6-character minimum ADMIN_PASSWORD (72 bytes maximum).");
  }
  const filter = { email };
  let admin = await Admin.findOne(filter).collation({ locale: "en", strength: 2 });
  if (!admin) {
    try {
      await Admin.create({ email, password, name: "AcadPro Admin", emailVerifiedAt: new Date() });
      return;
    } catch (error) {
      if (error.code !== 11000) throw error;
      admin = await Admin.findOne(filter);
      if (!admin) throw error;
    }
  }
  const changed = !(await admin.isPasswordCorrect(password));
  if (changed || !admin.emailVerifiedAt) {
    if (changed) admin.password = password;
    admin.sessionVersion = (admin.sessionVersion || 0) + 1;
    admin.emailVerifiedAt ||= new Date();
    await admin.save();
  }
}
