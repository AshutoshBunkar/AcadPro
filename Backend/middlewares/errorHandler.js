import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError || err.statusCode) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
  }

  console.log(err);
  
  return res.status(500).json({
    success:false,
    message:"Internal server error",
  });
};

export { errorHandler };

