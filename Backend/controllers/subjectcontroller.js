import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subject } from "../models/Subject.js";

const getSubjects = asyncHandler(async (req, res) => {
  let query = {};

  // For students, filter by their department and allow viewing their year and below
  if (req.user?.role === "student" || (req.user?.department && req.user?.year)) {
    const { department, year } = req.user;

    if (!department || !year) {
      throw new ApiError(400, "Student department and year not found on account");
    }

    query = {
      department,
      year: { $lte: year },
    };
  }

  const subjects = await Subject.find(query);

  return res
    .status(200)
    .json(new ApiResponse(200, subjects, "Subjects fetched successfully"));
});

const createSubject = asyncHandler(async (req, res) => {
  const { name, code, department, year, semester, allowedSemesters } = req.body;

  if (!name || !code || !department || (!year && !semester)) {
    throw new ApiError(400, "name, code, department, and semester (or year) are required!");
  }

  const duplicate_Subject = await Subject.findOne({ code: code.trim().toUpperCase() });

  if (duplicate_Subject) {
    throw new ApiError(409, "Subject with this code already exists!");
  }

  let computedYear = year ? Number(year) : null;
  let formattedAllowedSemesters;

  if (semester) {
    const semNum = Number(semester);
    if (isNaN(semNum) || semNum < 1 || semNum > 8) {
      throw new ApiError(400, "Semester must be a number between 1 and 8");
    }
    if (!computedYear) {
      computedYear = Math.ceil(semNum / 2);
    }
    formattedAllowedSemesters = [semNum];
  } else if (Array.isArray(allowedSemesters) && allowedSemesters.length > 0) {
    formattedAllowedSemesters = allowedSemesters
      .map((s) => Number(s))
      .filter((s) => !isNaN(s) && s >= 1 && s <= 8);
    if (formattedAllowedSemesters.length === 0) {
      throw new ApiError(400, "allowedSemesters must contain numbers between 1 and 8");
    }
  } else {
    // Default to year's program semesters: Year 1 => [1,2], Year 2 => [3,4], Year 3 => [5,6], Year 4 => [7,8]
    const y = Number(computedYear);
    formattedAllowedSemesters = [(y - 1) * 2 + 1, (y - 1) * 2 + 2];
  }

  const subject = await Subject.create({
    name: name.trim(),
    code: code.trim().toUpperCase(),
    department,
    year: computedYear,
    allowedSemesters: formattedAllowedSemesters,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, subject, "Subject created successfully!"));
});

export { getSubjects, createSubject };