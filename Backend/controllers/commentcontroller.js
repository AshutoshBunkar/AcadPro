import { accessibleLecture, canDiscuss } from "../utils/courseAccess.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/Comments.js";
import { Lecture } from "../models/Lecture.js";
import { Topic } from "../models/Topic.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";
import { AcademicSession } from "../models/AcademicSession.js";

const getComments = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  if (!lectureId) {
    throw new ApiError(400, "lectureId is required");
  }

  await accessibleLecture(req, lectureId);
  const comments = await Comment.find({ lectureId })
    .populate("studentId", "name email")
    .populate("replies.facultyId", "name email")
    .sort({ createdAt: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const postComment = asyncHandler(async (req, res) => {
  const { lectureId } = req.body;
  const rawText = req.body.text || req.body.comment;

  if (!lectureId || !rawText || !rawText.trim()) {
    throw new ApiError(400, "lectureId and text are required!");
  }

  const text = rawText.trim();
  const lecture = await accessibleLecture(req, lectureId);
  if (!await canDiscuss(req, lecture)) throw new ApiError(403, "This lecture is read-only.");
  const studentId = req.user._id;
  const comment = await Comment.create({
    lectureId,
    studentId,
    text,
  });

  await comment.populate("studentId", "name email");

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment created successfully"));
});

const postReply = asyncHandler(async (req, res) => {
  const { commentId } = req.body;
  const rawText = req.body.text || req.body.reply;

  if (!commentId || !rawText || !rawText.trim()) {
    throw new ApiError(400, "commentId and text are required!");
  }

  const text = rawText.trim();
  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment does not exist!");
  }

  const lecture = await Lecture.findById(comment.lectureId);

  if (!lecture) {
    throw new ApiError(404, "Lecture does not exist!");
  }

  const facultyId = req.user._id || req.user.id;
  if (lecture.uploadedBy.toString() !== facultyId.toString()) {
    throw new ApiError(403, "Only the faculty who taught this lecture can reply");
  }

  comment.replies.push({
    facultyId,
    text,
  });

  await comment.save();
  await comment.populate("replies.facultyId", "name email");

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Reply added successfully"));
});

export { getComments, postComment, postReply };
