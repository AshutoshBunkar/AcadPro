import "dotenv/config";
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

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "No access token provided");
  }

  const [, token] = authHeader.split(" ");

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

  if (!user) {
    throw new ApiError(401, "User not found for this token");
  }

  req.user = user;
  // Keep the verified claims separate from the Mongoose document. Mutating a
  // strict Mongoose document with `user.role` is not a reliable way to carry
  // authorization data through the request.
  req.auth = decoded;
  req.user.role = decoded.role;

  next();
});

export { verifyJWT };
