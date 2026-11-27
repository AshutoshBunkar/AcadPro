import cookieParser from "cookie-parser";
import { publicOrigin } from "./utils/config.js";
import { protectBrowserWrites } from "./utils/browserSession.js";
import dotenv from "dotenv";
dotenv.config({ path: "./Backend/.env" });
dotenv.config();
import express from "express";
import { randomUUID } from "node:crypto";


import accountRoutes from "./routes/accountRoutes.js";
import studentRoute from "./routes/studentRoutes.js";
import facultyRoute from "./routes/facultyRoutes.js";
import adminRoute from "./routes/adminRoutes.js"; 
import subjectRoute from "./routes/subjectRoutes.js";
import topicRoute from "./routes/topicRoutes.js";
import lectureRoute from "./routes/lectureRoutes.js";
import commentRoute from "./routes/commentRoutes.js";
import notificationRoute from "./routes/notificationRoutes.js";


import { errorHandler } from './middlewares/errorHandler.js';
import cors from "cors";



const app = express();

app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 0));
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.set("X-Request-ID", req.requestId);
  next();
});
app.use(cors({ origin: publicOrigin(), credentials: true, exposedHeaders: ["X-Request-ID"] }));
app.use(cookieParser());
app.use(protectBrowserWrites);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/account", accountRoutes);
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



export default app;