import { Notification } from "../models/Notification.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Fetch all active (uncleared) notifications for the authenticated user.
 */
export const getUserNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  const [notifications, unreadCount] = await Promise.all([
    Notification.find({
      recipient: userId,
      isCleared: false,
    }).sort({ createdAt: -1 }).limit(100),
    Notification.countDocuments({
      recipient: userId,
      isCleared: false,
      isRead: false,
    }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications,
        unreadCount,
      },
      "Notifications retrieved successfully"
    )
  );
});

/**
 * Mark a single notification as read (without clearing/dismissing it).
 */
export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { id } = req.params;

  const notification = await Notification.findById(id);
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  // Enforce strict user-level ownership isolation
  if (notification.recipient.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to update this notification");
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return res.status(200).json(
    new ApiResponse(200, notification, "Notification marked as read")
  );
});

/**
 * Mark all active notifications as read for the authenticated user.
 */
export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  const result = await Notification.updateMany(
    {
      recipient: userId,
      isCleared: false,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      { updatedCount: result.modifiedCount },
      "All active notifications marked as read"
    )
  );
});

/**
 * Clear (dismiss) an individual notification for the authenticated user.
 * Preserves historical notification data while removing it from active lists.
 */
export const clearNotification = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { id } = req.params;

  const notification = await Notification.findById(id);
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  // Strict ownership authorization check
  if (notification.recipient.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to clear this notification");
  }

  notification.isCleared = true;
  notification.clearedAt = new Date();
  await notification.save();

  return res.status(200).json(
    new ApiResponse(200, { clearedId: notification._id }, "Notification cleared successfully")
  );
});

/**
 * Clear (dismiss) all active notifications for the authenticated user.
 * Scoped strictly to the current authenticated user's records.
 */
export const clearAllNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  const result = await Notification.updateMany(
    {
      recipient: userId,
      isCleared: false,
    },
    {
      $set: {
        isCleared: true,
        clearedAt: new Date(),
      },
    }
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      { clearedCount: result.modifiedCount },
      "All notifications cleared successfully"
    )
  );
});
