import express from "express";
import { getTopics, createTopic } from "../controllers/topiccontroller.js";
import { verifyJWT } from "../middlewares/authmiddleware.js";
import { authorize } from "../middlewares/rolemiddleware.js";
import { checkTeachingAssignment } from "../middlewares/teachingassignmentmiddleware.js";

const Router = express.Router();

Router.get("/:subjectId", verifyJWT, getTopics);

Router.post(
  "/",
  verifyJWT,
  authorize("faculty"),
  checkTeachingAssignment,
  createTopic
);

export default Router;