import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Recipient ID is required"],
      index: true,
    },
    recipientRole: {
      type: String,
      enum: ["student", "faculty", "admin"],
      required: [true, "Recipient role is required"],
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "info",
        "lecture",
        "session",
        "enrollment",
        "assignment",
        "system",
        "alert",
      ],
      default: "info",
    },
    link: {
      type: String,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isCleared: {
      type: Boolean,
      default: false,
      index: true,
    },
    clearedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for fast lookup of a user's active/cleared notifications
notificationSchema.index({ recipient: 1, isCleared: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
