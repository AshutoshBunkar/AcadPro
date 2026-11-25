import express from "express";
import {
  getLectures,
  getSingleLecture,
  uploadLecture,
  getFacultyUploadedLectures,
  deleteLecture,
} from "../controllers/lecturecontroller.js";
import { verifyJWT } from "../middlewares/authmiddleware.js";
import { authorize } from "../middlewares/rolemiddleware.js";
import { checkTeachingAssignment } from "../middlewares/teachingassignmentmiddleware.js";

const Router = express.Router();

Router.get("/my-lectures", verifyJWT, authorize("faculty"), getFacultyUploadedLectures);

Router.get("/topic/:topicId", verifyJWT, getLectures);

Router.get("/:lectureId", verifyJWT, getSingleLecture);

Router.post("/upload", verifyJWT, authorize("faculty"), checkTeachingAssignment, uploadLecture);

Router.delete("/:lectureId", verifyJWT, authorize("faculty", "admin"), deleteLecture);

export default Router;