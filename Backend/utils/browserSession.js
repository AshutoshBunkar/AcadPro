import { publicOrigin } from "./config.js";
export const cookieOptions = () => ({ httpOnly: true, secure: publicOrigin().startsWith("https:"),
  sameSite: "lax", path: "/" });
export function deliverSession(req, res, token) {
  if (req.get("X-AcadPro-Client") !== "web") return { token };
  res.cookie("acadpro_session", token, { ...cookieOptions(), maxAge: 8 * 3600_000 });
  res.set("Cache-Control", "no-store");
  return {};
}
export function protectBrowserWrites(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if ((origin && origin !== publicOrigin()) ||
      (req.cookies?.acadpro_session && req.get("X-AcadPro-Client") !== "web")) {
    return res.status(403).json({ message: "Request origin could not be verified." });
  }
  next();
}
