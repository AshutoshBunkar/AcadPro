import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Usage: authorize("faculty") or authorize("admin", "faculty")
const authorize = (...allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    const role = req.auth?.role || req.user?.role;

    if (!role) {
      throw new ApiError(401, "Not authenticated");
    }

    if (!allowedRoles.includes(role)) {
      throw new ApiError(403, "You do not have permission to perform this action");
    }

    next();
  });
};

export { authorize };
