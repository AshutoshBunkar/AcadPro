import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { deliverSession } from "../utils/browserSession.js";
import { sessionToken } from "../utils/accountAccess.js";
import { Student } from "../models/Student.js";

// Login Logic
const LoginStudent = asyncHandler(async (req, res) => {
  const { email, password, mis } = req.body;

  if (!password || (!email && !mis)) {
    throw new ApiError(400, "Password and either email or mis are required");
  }

  const identity = typeof email === "string" && email.trim()
    ? { email: email.trim().toLowerCase() }
    : { mis: typeof mis === "string" ? mis.trim() : "" };
  const student = await Student.findOne(identity).collation({ locale: "en", strength: 2 });

  if (!student) {
    throw new ApiError(404, "Student does not exist");
  }

  const isPasswordValid = await student.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid student credentials");
  }

  const token = sessionToken(student, "student");

  const loggedInStudent = await Student.findById(student._id).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { student: loggedInStudent, ...deliverSession(req, res, token) },
        "Student logged in successfully"
      )
    );
});

// Get Profile Logic
const getStudentProfile = asyncHandler(async (req, res) => {
  const studentId = req.user.id;

  const student = await Student.findById(studentId).select("-password");

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, student, "Student profile fetched successfully"));
});

export { LoginStudent, getStudentProfile };
export { getStudentCurrentCourses, getStudentPastSemesters, getStudentCourse, getStudentAccessibleResources } from "./enrollmentDashboard.js";
