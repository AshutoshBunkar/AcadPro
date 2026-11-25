import express from "express";
import { getComments , postComment , postReply } from "../controllers/commentcontroller.js";
import { verifyJWT } from "../middlewares/authmiddleware.js";
import { authorize } from "../middlewares/rolemiddleware.js";

const Router = express.Router();

Router.get("/getComment/:lectureId" ,verifyJWT ,  getComments);

Router.post("/postComment" , verifyJWT , authorize("student") ,  postComment);

Router.post("/postReply" ,verifyJWT , authorize("faculty") ,   postReply);

export default Router;