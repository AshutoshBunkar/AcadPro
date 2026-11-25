import express from "express";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearNotification,
  clearAllNotifications,
} from "../controllers/notificationcontroller.js";
import { verifyJWT } from "../middlewares/authmiddleware.js";

const router = express.Router();

// All notification operations require authentication
router.use(verifyJWT);

// GET /notifications
router.get("/", getUserNotifications);

// Bulk operations (defined before parameterized /:id routes)
router.post("/mark-all-read", markAllNotificationsAsRead);
router.patch("/mark-all-read", markAllNotificationsAsRead);

router.post("/clear-all", clearAllNotifications);
router.delete("/clear-all", clearAllNotifications);
router.delete("/", clearAllNotifications);

// Parameterized operations
router.patch("/:id/read", markNotificationAsRead);
router.delete("/:id", clearNotification);
router.patch("/:id/clear", clearNotification);

export default router;
