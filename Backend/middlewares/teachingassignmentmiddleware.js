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
  if (!subjectId && topicId) {
    const topic = await Topic.findById(topicId);

    if (!topic) {
      throw new ApiError(404, "Topic not found");
    }

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

  let assignment = await TeachingAssignment.findOne(query);

  // Fallback: check if faculty has any active teaching assignment for this subject
  if (!assignment) {
    assignment = await TeachingAssignment.findOne({
      facultyId,
      subjectId,
      status: { $ne: "archived" },
    });
  }


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