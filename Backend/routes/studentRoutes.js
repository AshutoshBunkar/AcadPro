import { limitActivation } from "../middlewares/activationLimit.js";
import { requestActivation, finishChallenge } from "../controllers/accountActions.js";
import express from "express";
import { verifyJWT } from "../middlewares/authmiddleware.js";
import { authorize } from "../middlewares/rolemiddleware.js";
import {

  LoginStudent,
  getStudentProfile,
  getStudentCurrentCourses,
  getStudentPastSemesters,
  getStudentCourse,
  getStudentAccessibleResources,
} from "../controllers/studentcontroller.js";

const Router = express.Router();

Router.post("/signup", limitActivation, requestActivation);
Router.post("/activate", limitActivation, finishChallenge);
Router.post("/login", LoginStudent);
Router.get("/profile", verifyJWT, authorize("student"), getStudentProfile);
Router.get("/current-courses", verifyJWT, authorize("student"), getStudentCurrentCourses);
Router.get("/past-semesters", verifyJWT, authorize("student"), getStudentPastSemesters);
Router.get("/accessible-resources", verifyJWT, authorize("student"), getStudentAccessibleResources);
Router.get("/courses/:subjectId", verifyJWT, authorize("student"), getStudentCourse);

export default Router;