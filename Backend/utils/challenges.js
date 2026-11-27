import { createHash, randomBytes } from "node:crypto";
import { AccountChallenge } from "../models/AccountChallenge.js";
import { ApiError } from "./ApiError.js";

export const digest = token => createHash("sha256").update(token).digest("hex");
export const validEmail = email => typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const accepted = { message: "If the details match an eligible account, check your inbox." };

export function mailOrigin() {
  if (!(process.env.SENDGRID_API_KEY ? validEmail(process.env.SENDGRID_FROM) : process.env.RESEND_API_KEY && process.env.ACTIVATION_FROM)) throw new ApiError(503, "Account email is unavailable.");
  const origin = new URL(process.env.PUBLIC_APP_URL || "http://localhost:5173");
  if (origin.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && origin.hostname === "localhost")) throw new ApiError(503, "Account email is unavailable.");
  return origin;
}

export async function issueChallenge(account, role, purpose, email = account.email) {
  const origin = mailOrigin();
  const token = randomBytes(32).toString("hex");
  const signature = digest(token);
  const now = Date.now();
  try {
    await AccountChallenge.findOneAndUpdate({
      owner: account._id, role, purpose, sentAt: { $lte: new Date(now - 60_000) },
    }, { $set: { email, originalEmail: account.email, digest: signature, delivery: "pending",
      consumedAt: null, sentAt: new Date(now), expiresAt: new Date(now + 900_000) } },
    { upsert: true });
  } catch (error) {
    if (error.code === 11000) return;
    throw error;
  }
  const link = new URL(purpose === "activate" ? "/activate" : "/account/" + purpose, origin);
  link.hash = token;
  let delivered = false;
  try {
    const to = process.env.STAGING_MAILBOX || email;
    const subject = "AcadPro account confirmation";
    const text = "Complete your " + purpose + " request within 15 minutes: " + link.href;
    const sendgridKey = process.env.SENDGRID_API_KEY;
    const body = sendgridKey ? {
      from: { email: process.env.SENDGRID_FROM, name: "AcadPro" },
      personalizations: [{ to: [{ email: to }] }],
      subject, content: [{ type: "text/plain", value: text }],
      tracking_settings: { click_tracking: { enable: false, enable_text: false } },
    } : { from: process.env.ACTIVATION_FROM, to: [to], subject, text };
    const delivery = await fetch(sendgridKey ? "https://api.sendgrid.com/v3/mail/send" : "https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(8000),
      headers: { Authorization: "Bearer " + (sendgridKey || process.env.RESEND_API_KEY), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    delivered = delivery.ok;
  } catch { /* The owner can request a new link after the cooldown. */ }
  await AccountChallenge.updateOne({ digest: signature }, { delivery: delivered ? "sent" : "failed" });
  if (!delivered) console.warn("account_email_delivery_failed");
}
