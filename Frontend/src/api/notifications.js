import api from "./axios";

/**
 * Fetch all uncleared notifications for the current authenticated user.
 */
export const getNotifications = () => api.get("/notifications");

/**
 * Mark a specific notification as read.
 */
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);

/**
 * Mark all uncleared notifications as read.
 */
export const markAllNotificationsRead = () => api.post("/notifications/mark-all-read");

/**
 * Clear (dismiss) an individual notification for the authenticated user.
 */
export const clearNotification = (id) => api.delete(`/notifications/${id}`);

/**
 * Bulk clear (dismiss) all notifications for the authenticated user.
 */
export const clearAllNotifications = () => api.post("/notifications/clear-all");
