import express from "express";
import { getSubjects, createSubject } from "../controllers/subjectcontroller.js";
import { verifyJWT } from "../middlewares/authmiddleware.js";
import { authorize } from "../middlewares/rolemiddleware.js";

const Router = express.Router();

Router.get("/", verifyJWT, getSubjects);
Router.post("/create", verifyJWT, authorize("admin"), createSubject);

export default Router;