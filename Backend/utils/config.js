import { fileURLToPath } from "node:url";
import path from "node:path";
export const publicOrigin = () => new URL(process.env.PUBLIC_APP_URL || "http://localhost:5173").origin;
export const mediaRoot = () => path.resolve(process.env.PRIVATE_MEDIA_DIR || fileURLToPath(new URL("../../.acadpro-media/", import.meta.url)));
export function validateConfig(env = process.env) {
  const deployed = ["staging", "production"].includes(env.APP_ENV) || env.NODE_ENV === "production";
  const required = ["MONGO_DB_URL", "JWT_SECRET", ...(deployed ? ["PUBLIC_APP_URL", "PRIVATE_MEDIA_DIR", ...(env.SENDGRID_API_KEY ? ["SENDGRID_FROM"] : ["RESEND_API_KEY", "ACTIVATION_FROM"])] : [])];
  if (env.APP_ENV === "staging") required.push("STAGING_MAILBOX");
  const missing = required.filter(key => !env[key]);
  if (missing.length) throw Error("Missing configuration: " + missing.join(", "));
  if (deployed && (env.JWT_SECRET.length < 32 || new URL(env.PUBLIC_APP_URL).protocol !== "https:" || !path.isAbsolute(env.PRIVATE_MEDIA_DIR))) {
    throw Error("Deployment requires HTTPS, an absolute private media directory and a strong session secret.");
  }
  if (env.STAGING_MAILBOX && env.APP_ENV !== "staging") throw Error("A staging mailbox requires APP_ENV=staging.");
}
