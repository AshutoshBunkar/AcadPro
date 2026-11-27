import { createHash, randomBytes, randomUUID } from "node:crypto";
import { AccountChallenge } from "../models/AccountChallenge.js";
import { ApiError } from "./ApiError.js";

export const digest = token => createHash("sha256").update(token).digest("hex");
export const validEmail = email => typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const accepted = { message: "If the details match an eligible account, check your inbox." };

export const mailProvider = () => process.env.SENDGRID_API_KEY ? "sendgrid" : process.env.RESEND_API_KEY ? "resend" : "unconfigured";
export function logMail(requestId, purpose, outcome, details = {}) {
  console.info("account_mail", { requestId, purpose, provider: mailProvider(), outcome, ...details });
}

export function mailOrigin() {
  if (!(process.env.SENDGRID_API_KEY ? validEmail(process.env.SENDGRID_FROM) : process.env.RESEND_API_KEY && process.env.ACTIVATION_FROM)) throw new ApiError(503, "Account email is unavailable.");
  const origin = new URL(process.env.PUBLIC_APP_URL || "http://localhost:5173");
  if (origin.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && origin.hostname === "localhost")) throw new ApiError(503, "Account email is unavailable.");
  return origin;
}

export async function issueChallenge(account, role, purpose, email = account.email, requestId = randomUUID(), registration) {
  const origin = mailOrigin();
  const token = randomBytes(32).toString("hex");
  const signature = digest(token);
  const now = Date.now();
  try {
    await AccountChallenge.findOneAndUpdate({
      owner: account._id, role, purpose, sentAt: { $lte: new Date(now - 60_000) },
    }, { $set: { requestId, registration, provider: mailProvider(), failureReason: null, providerStatus: null,
      providerMessageId: null, email, originalEmail: account.email, digest: signature, delivery: "pending",
      consumedAt: null, sentAt: new Date(now), expiresAt: new Date(now + 900_000) } },
    { upsert: true });
  } catch (error) {
    if (error.code === 11000) {
      logMail(requestId, purpose, "cooldown");
      if (purpose === "signup") {
        const failed = await AccountChallenge.findOne({ owner: account._id, role, purpose, delivery: "failed" },
          { _id: 0, delivery: 1, providerStatus: 1 }).lean();
        if (failed) return failed;
      }
      return;
    }
    throw error;
  }
  const link = new URL("/account/" + purpose, origin);
  link.hash = token;
  const result = { delivery: "failed" };
  try {
    const to = process.env.STAGING_MAILBOX || email;
    const subject = { signup: "Finish your AcadPro " + role + " signup", reset: "Reset your AcadPro password", invite: "Accept your AcadPro faculty invitation", confirm: "Verify your AcadPro account", email: "Confirm your new AcadPro email" }[purpose];
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
    result.providerStatus = delivery.status;
    if (delivery.ok) {
      result.delivery = "sent";
      const id = sendgridKey ? delivery.headers.get("x-message-id") : (await delivery.json().catch(() => null))?.id;
      if (typeof id === "string" && /^[a-zA-Z0-9._-]{1,128}$/.test(id)) result.providerMessageId = id;
    } else {
      result.failureReason = ({401: "invalid_credentials", 403: "sender_or_permission_denied",
        429: "rate_limited"})[delivery.status] || "provider_rejected";
      if (sendgridKey && delivery.status === 403) {
        const details = await delivery.json().catch(() => null);
        if (Array.isArray(details?.errors) && details.errors.some(e => /verified sender identity/i.test(e?.message))) {
          result.failureReason = "unverified_sender";
        }
      }
    }
  } catch (error) {
    result.failureReason = ["TimeoutError", "AbortError"].includes(error.name) ? "timeout" : "network_error";
  }
  await AccountChallenge.updateOne({ digest: signature }, result);
  logMail(requestId, purpose, result.delivery, result);
  return result;
}
