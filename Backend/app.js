import dotenv from "dotenv";
dotenv.config({ path: "./Backend/.env" });
dotenv.config();
import express from "express";
import mongoose from "mongoose";

import studentRoute from "./routes/studentRoutes.js";
import facultyRoute from "./routes/facultyRoutes.js";
import adminRoute from "./routes/adminRoutes.js"; 
import subjectRoute from "./routes/subjectRoutes.js";
import topicRoute from "./routes/topicRoutes.js";
import lectureRoute from "./routes/lectureRoutes.js";
import commentRoute from "./routes/commentRoutes.js";
import notificationRoute from "./routes/notificationRoutes.js";

import fileUpload from "express-fileupload";
import { errorHandler } from './middlewares/errorHandler.js';
import cors from "cors";

import os from "os";

const app = express();

app.use(cors());

const connectWithDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL);

    console.log("Connected with Database...");
  } catch (error) {
    console.error("Database Connection Error:", error.message);
    process.exit(1);
  }
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: os.tmpdir(),
  createParentPath: true,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB maximum file size
}));

app.use('/student',studentRoute);

app.use('/faculty' , facultyRoute);

app.use("/admin" , adminRoute);

app.use("/subject" , subjectRoute);

app.use("/topic" , topicRoute);

app.use("/lecture" , lectureRoute);

app.use("/comment" , commentRoute);

app.use("/notifications", notificationRoute);
app.use("/api/notifications", notificationRoute);

app.use(errorHandler);

connectWithDatabase();

export default app;