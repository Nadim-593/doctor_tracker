import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as controller from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { loginSchema } from "../validators/auth.validator.js";

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many sign-in attempts. Try again later.",
    },
  },
});
router.post(
  "/login",
  loginLimiter,
  validate({ body: loginSchema }),
  controller.login,
);
router.post("/logout", controller.logout);
router.get("/me", authenticate, controller.me);

export default router;
