import mongoose from "mongoose";
import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { mediaRoot } from "../utils/config.js";
import { accessibleLecture, lectureScope } from "../utils/courseAccess.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Lecture } from "../models/Lecture.js";
import { Topic } from "../models/Topic.js";
import { Comment } from "../models/Comments.js";
import { Student } from "../models/Student.js";
import { Subject } from "../models/Subject.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";
import { deleteFromCloudinary } from "../utils/cloudinary.js";

const getLectures = asyncHandler(async (req, res) => {
  const topic = await Topic.findById(req.params.topicId);
  if (!topic) throw new ApiError(404, "Topic unavailable.");
  const scope = await lectureScope(req, topic.subjectId, req.query.offeringId);
  const lectures = await Lecture.find({ topicId: topic._id, ...scope }).populate("uploadedBy", "name").sort({ createdAt: 1 });
  res.json(new ApiResponse(200, lectures, "Lectures fetched"));
});

const getSingleLecture = asyncHandler(async (req, res) => {
  const lecture = await accessibleLecture(req, req.params.lectureId);
  await lecture.populate([{ path: "uploadedBy", select: "name" }, { path: "topicId", populate: { path: "subjectId" } }]);
  res.json(new ApiResponse(200, lecture, "Lecture fetched"));
});

export const streamLecture = asyncHandler(async (req, res) => {
  const lecture = await accessibleLecture(req, req.params.lectureId);
  if (!lecture.mediaType) throw new ApiError(404, "Recording unavailable.");
  res.set({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Type": lecture.mediaType });
  res.sendFile(String(lecture._id), { root: mediaRoot(), acceptRanges: true, cacheControl: false });
});
export const shareReference = asyncHandler(async (req, res) => {
  const semesters = req.body.semesters;
  if (!Array.isArray(semesters) || semesters.some(n => !Number.isInteger(n) || n < 1 || n > 8)) throw new ApiError(400, "Invalid semesters.");
  const lecture = await Lecture.findByIdAndUpdate(req.params.lectureId, { referenceSemesters: [...new Set(semesters)] }, { new: true });
  if (!lecture) throw new ApiError(404, "Lecture unavailable.");
  res.json({ data: lecture });
});
const getFacultyUploadedLectures = asyncHandler(async (req, res) => {
  const facultyId = req.user._id || req.user.id;
  const { search, subjectId, topicId } = req.query;

  const query = { uploadedBy: facultyId };

  if (topicId && topicId !== "all") {
    query.topicId = topicId;
  }

  if (subjectId && subjectId !== "all") {
    const subjectTopics = await Topic.find({ subjectId }).select("_id");
    const subjectTopicIds = subjectTopics.map((t) => t._id);
    if (query.topicId) {
      query.topicId = {
        $in: subjectTopicIds.filter((id) => id.toString() === query.topicId.toString()),
      };
    } else {
      query.topicId = { $in: subjectTopicIds };
    }
  }

  if (search && search.trim()) {
    query.title = { $regex: search.trim(), $options: "i" };
  }

  const lectures = await Lecture.find(query)
    .populate({
      path: "topicId",
      populate: {
        path: "subjectId",
        select: "name code department year",
      },
    })
    .populate("uploadedBy", "name email")
    .sort({ createdAt: -1 });

  // Enrich lectures with comment count and unanswered comments count
  const lectureIds = lectures.map((l) => l._id);
  const comments = await Comment.find({ lectureId: { $in: lectureIds } });

  const commentsByLecture = {};
  const unansweredByLecture = {};

  comments.forEach((c) => {
    const lid = c.lectureId.toString();
    commentsByLecture[lid] = (commentsByLecture[lid] || 0) + 1;
    const hasReply = c.replies && c.replies.length > 0;
    if (!hasReply) {
      unansweredByLecture[lid] = (unansweredByLecture[lid] || 0) + 1;
    }
  });

  const enrichedLectures = lectures.map((lec) => {
    const lid = lec._id.toString();
    return {
      ...lec.toObject(),
      commentsCount: commentsByLecture[lid] || 0,
      unansweredCommentsCount: unansweredByLecture[lid] || 0,
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      enrichedLectures,
      "Faculty uploaded lectures fetched successfully"
    )
  );
});

const deleteLecture = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;
  const facultyId = req.user._id || req.user.id;

  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    throw new ApiError(404, "Lecture not found");
  }

  // Only the uploader or admin can delete
  if (
    req.user.role !== "admin" &&
    lecture.uploadedBy.toString() !== facultyId.toString()
  ) {
    throw new ApiError(403, "Only the faculty who uploaded this lecture can delete it");
  }

  if (lecture.mediaType) await rm(path.join(mediaRoot(), String(lecture._id)), { force: true });
  else if (lecture.cloudinaryPublicId) {
    try {
      await deleteFromCloudinary(lecture.cloudinaryPublicId, "video");
    } catch (e) {
      console.warn("Could not delete video from Cloudinary:", e);
    }
  }

  await Comment.deleteMany({ lectureId: lecture._id });
  await Lecture.findByIdAndDelete(lectureId);

  return res.status(200).json(
    new ApiResponse(200, null, "Lecture deleted successfully")
  );
});

const uploadLecture = asyncHandler(async (req, res) => {
  const { topicId, title, description } = req.body;

  if (!topicId || !title?.trim()) {
    throw new ApiError(400, "topicId and title are required!");
  }

  if (!req.files || !req.files.video) {
    throw new ApiError(400, "Video file is required");
  }

  const video = Array.isArray(req.files.video)
    ? req.files.video[0]
    : req.files.video;

  if (video.truncated) {
    throw new ApiError(400, "Video file size exceeds maximum allowed limit");
  }

  if (!["video/mp4", "video/webm", "video/x-matroska", "video/quicktime"].includes(video.mimetype)) {
    throw new ApiError(400, "Only video files are allowed");
  }

  if (!video.tempFilePath) {
    throw new ApiError(400, "Unable to process uploaded video temp file");
  }

  const id = new mongoose.Types.ObjectId();
  const target = path.join(mediaRoot(), String(id));
  let lecture;
  try {
    await mkdir(mediaRoot(), { recursive: true });
    await video.mv(target);
    const subject = await Subject.findById(req.offering.subjectId).select("department");
    lecture = await Lecture.create({ _id: id, topicId, uploadedBy: req.user._id, offeringId: req.offering._id,
      department: subject.department, title: title.trim(), description: description?.trim(),
      mediaType: video.mimetype, videoUrl: "/lecture/" + id + "/media", cloudinaryPublicId: "local/" + id });
  } catch (error) {
    await rm(target, { force: true });
    console.error("lecture_publish_failed");
    throw error;
  }
  return res
    .status(201)
    .json(new ApiResponse(201, lecture, "Lecture uploaded successfully"));
});

export {
  getLectures,
  getSingleLecture,
  uploadLecture,
  getFacultyUploadedLectures,
  deleteLecture,
};