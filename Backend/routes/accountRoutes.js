import express from "express";
import { limitActivation } from "../middlewares/activationLimit.js";
import { finishChallenge, requestAccountLink } from "../controllers/accountActions.js";
import { verifyJWT } from "../middlewares/authmiddleware.js";
import { cookieOptions } from "../utils/browserSession.js";
const router = express.Router();
router.get("/session", verifyJWT, (req, res) => res.json({ role: req.auth.role, user: req.user }));
router.post("/logout", verifyJWT, async (req, res) => {
  await req.user.constructor.updateOne({ _id: req.user._id }, { $inc: { sessionVersion: 1 } });
  res.clearCookie("acadpro_session", cookieOptions()).sendStatus(204);
});
router.post("/:purpose/request", limitActivation, requestAccountLink);
router.post("/:purpose/complete", limitActivation, finishChallenge);
export default router;
