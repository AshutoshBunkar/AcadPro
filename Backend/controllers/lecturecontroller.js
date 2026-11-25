import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Lecture } from "../models/Lecture.js";
import { Topic } from "../models/Topic.js";
import { Comment } from "../models/Comments.js";
import { Student } from "../models/Student.js";
import { Subject } from "../models/Subject.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

const getLectures = asyncHandler(async (req, res) => {
  const { topicId } = req.params;

  if (!topicId) {
    throw new ApiError(400, "topicId is required");
  }

  // Authorization check for students
  if (req.user?.role === "student") {
    const studentId = req.user._id || req.user.id;
    const topic = await Topic.findById(topicId);
    if (!topic) {
      throw new ApiError(404, "Topic not found");
    }
    const isEnrolled = await StudentEnrollment.findOne({
      studentId,
      subjectId: topic.subjectId,
    });
    
    if (!isEnrolled) {
      const student = await Student.findById(studentId);
      const subject = await Subject.findById(topic.subjectId);
      const studentSemester = student?.currentSemester || (student?.year ? (student.year * 2 - 1) : 1);
      const subjectMinSemester = (subject?.semesters && subject.semesters.length > 0)
        ? Math.min(...subject.semesters)
        : (subject?.year ? (subject.year * 2 - 1) : 1);

      const hasCrossSemesterAccess =
        student &&
        subject &&
        student.department === subject.department &&
        studentSemester >= subjectMinSemester;

      const totalStudentEnrollments = await StudentEnrollment.countDocuments({
        studentId,
      });

      if (!hasCrossSemesterAccess && totalStudentEnrollments > 0) {
        throw new ApiError(403, "Access denied: You are not enrolled in this course.");
      }
    }
  }

  const lectures = await Lecture.find({ topicId })
    .populate("uploadedBy", "name email")
    .sort({ createdAt: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, lectures, "Lectures fetched successfully"));
});

const getSingleLecture = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  if (!lectureId) {
    throw new ApiError(400, "lectureId is required");
  }

  const lecture = await Lecture.findById(lectureId)
    .populate("uploadedBy", "name email")
    .populate({
      path: "topicId",
      populate: {
        path: "subjectId",
        select: "name code department year semesters",
      },
    });

  if (!lecture) {
    throw new ApiError(404, "Lecture not found");
  }

  // Authorization check for students
  if (req.user?.role === "student") {
    const studentId = req.user._id || req.user.id;
    const topic = await Topic.findById(lecture.topicId);
    if (topic) {
      const isEnrolled = await StudentEnrollment.findOne({
        studentId,
        subjectId: topic.subjectId,
      });
      if (!isEnrolled) {
        const student = await Student.findById(studentId);
        const subject = await Subject.findById(topic.subjectId);
        const studentSemester = student?.currentSemester || (student?.year ? (student.year * 2 - 1) : 1);
        const subjectMinSemester = (subject?.semesters && subject.semesters.length > 0)
          ? Math.min(...subject.semesters)
          : (subject?.year ? (subject.year * 2 - 1) : 1);

        const hasCrossSemesterAccess =
          student &&
          subject &&
          student.department === subject.department &&
          studentSemester >= subjectMinSemester;

        const totalStudentEnrollments = await StudentEnrollment.countDocuments({
          studentId,
        });

        if (!hasCrossSemesterAccess && totalStudentEnrollments > 0) {
          throw new ApiError(403, "Access denied: You are not enrolled in this course.");
        }
      }
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, lecture, "Lecture fetched successfully"));
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

  if (lecture.cloudinaryPublicId) {
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

  if (video.mimetype && !video.mimetype.startsWith("video/")) {
    throw new ApiError(400, "Only video files are allowed");
  }

  if (!video.tempFilePath) {
    throw new ApiError(400, "Unable to process uploaded video temp file");
  }

  const cloudinaryResponse = await uploadOnCloudinary(video.tempFilePath);

  if (!cloudinaryResponse) {
    throw new ApiError(500, "Video upload to Cloudinary failed, please try again");
  }

  const thumbnailUrl = cloudinaryResponse.secure_url.includes(".")
    ? cloudinaryResponse.secure_url.replace(/\.[^/.]+$/, ".jpg")
    : `${cloudinaryResponse.secure_url}.jpg`;

  const lecture = await Lecture.create({
    topicId,
    uploadedBy: req.user._id, // logged-in faculty, set by authMiddleware
    title: title.trim(),
    description: description ? description.trim() : "",
    videoUrl: cloudinaryResponse.secure_url,
    cloudinaryPublicId: cloudinaryResponse.public_id,
    thumbnailUrl,
    duration: cloudinaryResponse.duration
      ? Math.round(cloudinaryResponse.duration)
      : 0,
  });

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