import express from "express";

import {
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  getSecurityLogs,
  getAdminDirectories,
  createFaculty,
  assignSubject,
  removeTeachingAssignment,
  promoteStudentYear,
  updateAcademicSession,
  getCurrentSession,
  createSemester,
  getSemesters,
  updateSemester,
  deleteSemester,
  enrollStudentInSubjects,
  batchEnrollStudents,
  getSemesterEnrollments,
  removeStudentEnrollment,
  getSubjectRequests,
  updateSubjectRequestStatus,
  updateFaculty,
  deleteFaculty,
  updateStudent,
  deleteStudent,
  updateSubject,
  deleteSubject,
} from "../controllers/admincontroller.js";

import { verifyJWT } from "../middlewares/authmiddleware.js";
import { authorize } from "../middlewares/rolemiddleware.js";

const Router = express.Router();

Router.post("/login", loginAdmin);

// Admin Profile & System Management
Router.get("/profile", verifyJWT, authorize("admin"), getAdminProfile);
Router.put("/profile", verifyJWT, authorize("admin"), updateAdminProfile);
Router.put("/change-password", verifyJWT, authorize("admin"), changeAdminPassword);
Router.get("/security-logs", verifyJWT, authorize("admin"), getSecurityLogs);
Router.get("/directories", verifyJWT, authorize("admin"), getAdminDirectories);

// Core Administrative Responsibilities
Router.post("/faculty", verifyJWT, authorize("admin"), createFaculty);
Router.put("/faculty/:id", verifyJWT, authorize("admin"), updateFaculty);
Router.delete("/faculty/:id", verifyJWT, authorize("admin"), deleteFaculty);
Router.put("/student/:id", verifyJWT, authorize("admin"), updateStudent);
Router.delete("/student/:id", verifyJWT, authorize("admin"), deleteStudent);
Router.put("/subject/:id", verifyJWT, authorize("admin"), updateSubject);
Router.delete("/subject/:id", verifyJWT, authorize("admin"), deleteSubject);
Router.post("/assign", verifyJWT, authorize("admin"), assignSubject);
Router.delete("/assign/:id", verifyJWT, authorize("admin"), removeTeachingAssignment);
Router.put("/promote", verifyJWT, authorize("admin"), promoteStudentYear);
Router.put("/update", verifyJWT, authorize("admin"), updateAcademicSession);
Router.get("/currentSession", verifyJWT, authorize("admin"), getCurrentSession);

// Course Addition Requests from Faculty
Router.get("/subject-requests", verifyJWT, authorize("admin"), getSubjectRequests);
Router.patch("/subject-requests/:id/status", verifyJWT, authorize("admin"), updateSubjectRequestStatus);

// Semester Management
Router.post("/semesters", verifyJWT, authorize("admin"), createSemester);
Router.get("/semesters", verifyJWT, authorize("admin"), getSemesters);
Router.put("/semesters/:id", verifyJWT, authorize("admin"), updateSemester);
Router.delete("/semesters/:id", verifyJWT, authorize("admin"), deleteSemester);

// Student Enrollment & Subject Assignment
Router.post("/enroll-student", verifyJWT, authorize("admin"), enrollStudentInSubjects);
Router.post("/enroll-batch", verifyJWT, authorize("admin"), batchEnrollStudents);
Router.get("/enrollments", verifyJWT, authorize("admin"), getSemesterEnrollments);
Router.delete("/enrollments/:id", verifyJWT, authorize("admin"), removeStudentEnrollment);

export default Router;