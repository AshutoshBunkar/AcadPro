import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  if (err.code === 11000) return res.status(409).json({ success: false, message: "A matching record already exists." });
  if (err instanceof ApiError || err.statusCode) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
  }

  console.error("request_failed", req.method, req.route?.path || "unknown");
  
  return res.status(500).json({
    success:false,
    message:"Internal server error",
  });
};

export { errorHandler };

