import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["AUTH", "RBAC", "CURRICULUM", "SESSION", "SECURITY", "SYSTEM"],
      default: "SECURITY",
    },
    details: {
      type: String,
      required: true,
    },
    actor: {
      type: String,
      default: "System Admin",
    },
    actorEmail: {
      type: String,
      default: "s.connor@acadex.edu",
    },
    ipAddress: {
      type: String,
      default: "192.168.1.104",
    },
    severity: {
      type: String,
      enum: ["INFO", "WARNING", "CRITICAL"],
      default: "INFO",
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "FLAGGED"],
      default: "SUCCESS",
    },
  },
  { timestamps: true }
);

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
