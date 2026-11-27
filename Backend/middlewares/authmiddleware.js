import "dotenv/config";
import { requireVerified } from "../utils/accountAccess.js";
import { fixedAdminEmail } from "../utils/fixedAdmin.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Student } from "../models/Student.js";
import { Faculty } from "../models/Faculty.js";
import { Admin } from "../models/Admin.js";

const roleModelMap = {
  student: Student,
  faculty: Faculty,
  admin: Admin,
};

const verifyJWT = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.cookies?.acadpro_session;

  if (!token) {
    throw new ApiError(401, "No access token provided");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }

  const Model = roleModelMap[decoded.role];

  if (!Model) {
    throw new ApiError(401, "Invalid token role");
  }

  const user = await Model.findById(decoded.id).select("-password");

  if (!user || (decoded.role === "admin" && user.email.toLowerCase() !== fixedAdminEmail())) {
    throw new ApiError(401, "User not found for this token");
  }

  requireVerified(user, decoded.role);
  if ((decoded.version || 0) !== (user.sessionVersion || 0)) throw new ApiError(401, "Sign in again.");
  req.user = user;
  // Keep the verified claims separate from the Mongoose document. Mutating a
  // strict Mongoose document with `user.role` is not a reliable way to carry
  // authorization data through the request.
  req.auth = decoded;
  req.user.role = decoded.role;

  next();
});

export { verifyJWT };
