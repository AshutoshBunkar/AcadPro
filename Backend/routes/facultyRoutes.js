import express from "express";
import {
  loginFaculty,
  getFacultyProfile,
  getFacultyAssignedCourses,
  getFacultyCourseRoster,
  exportFacultyCourseRoster,
  updateFacultyProfile,
  changeFacultyPassword,
  requestSubject,
  getFacultySubjectRequests,
} from "../controllers/facultycontroller.js";
import { verifyJWT } from "../middlewares/authmiddleware.js";
import { authorize } from "../middlewares/rolemiddleware.js";

import { requestSignup } from "../controllers/accountActions.js";
import { limitActivation } from "../middlewares/activationLimit.js";

const Router = express.Router();
Router.post("/signup", limitActivation, requestSignup("faculty"));

Router.post("/login", loginFaculty);
Router.get("/profile", verifyJWT, authorize("faculty"), getFacultyProfile);
Router.put("/profile", verifyJWT, authorize("faculty"), updateFacultyProfile);
Router.put("/change-password", verifyJWT, authorize("faculty"), changeFacultyPassword);

// Course Offerings & Roster Management
Router.get("/courses", verifyJWT, authorize("faculty"), getFacultyAssignedCourses);
Router.get("/courses/:subjectId/roster", verifyJWT, authorize("faculty"), getFacultyCourseRoster);
Router.get("/courses/:subjectId/roster/export", verifyJWT, authorize("faculty"), exportFacultyCourseRoster);

// Course Requests to Admin
Router.post("/request-subject", verifyJWT, authorize("faculty"), requestSubject);
Router.get("/subject-requests", verifyJWT, authorize("faculty"), getFacultySubjectRequests);

export default Router;

