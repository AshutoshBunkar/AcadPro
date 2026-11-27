import jwt from "jsonwebtoken";
import { ApiError } from "./ApiError.js";

export function requireVerified(account, role) {
  const enforced = (process.env.VERIFY_ROLES || "").split(",").map(value => value.trim());
  if (!account.emailVerifiedAt && (account.invitationPending || enforced.includes(role))) {
    throw new ApiError(403, "Confirm your email before signing in.");
  }
}
export function sessionToken(account, role) {
  requireVerified(account, role);
  return jwt.sign({ id: account._id, role, version: account.sessionVersion || 0 },
    process.env.JWT_SECRET, { expiresIn: "8h", algorithm: "HS256" });
}
