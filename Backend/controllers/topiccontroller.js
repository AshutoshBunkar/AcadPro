import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Topic } from "../models/Topic.js";
import { Subject } from "../models/Subject.js";
import { TeachingAssignment } from "../models/TeachingAssignment.js";
import { Lecture } from "../models/Lecture.js";
import { lectureScope, readable } from "../utils/courseAccess.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";

const getTopics = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;

  if (!subjectId) {
    throw new ApiError(400, "subjectId is required");
  }

  let query = { subjectId };
  if (req.auth.role !== "admin") {
    const membership = req.auth.role === "faculty"
      ? await TeachingAssignment.exists({ facultyId: req.user._id, subjectId })
      : await StudentEnrollment.exists({ studentId: req.user._id, subjectId, status: { $in: readable } });
    if (!membership) {
      const scope = await lectureScope(req, subjectId);
      query._id = { $in: await Lecture.find(scope).distinct("topicId") };
    }
  }
  const topics = await Topic.find(query).sort({ order: 1 });

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