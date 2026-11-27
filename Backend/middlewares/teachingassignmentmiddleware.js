import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Topic } from "../models/Topic.js";
import { TeachingAssignment } from "../models/TeachingAssignment.js";
import { AcademicSession } from "../models/AcademicSession.js";

const checkTeachingAssignment = asyncHandler(async (req, res, next) => {
  const facultyId = req.user._id || req.user.id;

  let subjectId = req.body?.subjectId || req.params?.subjectId || req.query?.subjectId;
  const topicId = req.body?.topicId || req.params?.topicId || req.query?.topicId;

  // Lecture upload sends topicId, not subjectId directly — derive it
  if (topicId) {
    const topic = await Topic.findById(topicId);

    if (!topic) {
      throw new ApiError(404, "Topic not found");
    }

    if (subjectId && String(subjectId) !== String(topic.subjectId)) throw new ApiError(400, "Topic belongs to a different subject.");
    subjectId = topic.subjectId;
  }

  if (!subjectId) {
    throw new ApiError(400, "subjectId or topicId is required");
  }

  const currentSession = await AcademicSession.findOne();

  if (!currentSession) {
    throw new ApiError(500, "Academic session is not configured — contact admin");
  }

  // Verify assignment for the active academic year and active term semesters
  const query = {
    facultyId,
    subjectId,
    academicYear: currentSession.academicYear,
    status: { $ne: "archived" },
  };

  if (Array.isArray(currentSession.activeSemesters) && currentSession.activeSemesters.length > 0) {
    query.semester = { $in: currentSession.activeSemesters };
  }

  if (req.body?.offeringId) query._id = req.body.offeringId;
  const matches = await TeachingAssignment.find(query).limit(2);
  if (matches.length > 1 && !req.originalUrl.startsWith("/topic")) throw new ApiError(400, "Choose a course offering.");
  const assignment = matches[0];
  req.offering = assignment;

  if (!assignment) {
    throw new ApiError(
      403,
      "Unauthorized: You are not assigned to teach this subject."
    );
  }

  req.subjectId = subjectId;
  next();
});

export { checkTeachingAssignment };