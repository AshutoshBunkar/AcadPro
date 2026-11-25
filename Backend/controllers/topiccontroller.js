import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Topic } from "../models/Topic.js";
import { Subject } from "../models/Subject.js";
import { Student } from "../models/Student.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";

const getTopics = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;

  if (!subjectId) {
    throw new ApiError(400, "subjectId is required");
  }

  // Authorization check for students
  if (req.user?.role === "student") {
    const studentId = req.user._id || req.user.id;
    const isEnrolled = await StudentEnrollment.findOne({
      studentId,
      subjectId,
    });

    if (!isEnrolled) {
      // Check cross-semester visibility rule: C >= S
      const student = await Student.findById(studentId);
      const subject = await Subject.findById(subjectId);
      const studentSemester = student?.currentSemester || ((student?.year - 1) * 2 + 1);
      const subjectMinSemester = Array.isArray(subject?.allowedSemesters) && subject.allowedSemesters.length > 0
        ? Math.min(...subject.allowedSemesters)
        : (subject?.year ? (subject.year - 1) * 2 + 1 : 1);

      const isCrossSemesterEligible =
        student &&
        subject &&
        student.department === subject.department &&
        studentSemester >= subjectMinSemester;

      const totalStudentEnrollments = await StudentEnrollment.countDocuments({ studentId });

      if (totalStudentEnrollments > 0 && !isCrossSemesterEligible) {
        throw new ApiError(403, "Access denied: You are not authorized to view topics for this course.");
      }
    }
  }

  const topics = await Topic.find({ subjectId }).sort({ order: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, topics, "Topics fetched successfully"));
});

const createTopic = asyncHandler(async (req, res) => {
  const { subjectId, name, order } = req.body;

  if (!subjectId || !name || !order) {
    throw new ApiError(400, "subjectId, name, order all are required!");
  }

  const subject = await Subject.findById(subjectId);

  if (!subject) {
    throw new ApiError(404, "Subject not found");
  }

  const topic = await Topic.create({ subjectId, name, order });

  return res
    .status(201)
    .json(new ApiResponse(201, topic, "Topic created successfully"));
});

export { getTopics, createTopic };