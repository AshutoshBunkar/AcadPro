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
      default: "",
    },
    ipAddress: {
      type: String,
      default: "",
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
