import { Router } from "express";
import * as controller from "../controllers/dashboard.controller.js";
import { validate } from "../middleware/validate.js";
import { dashboardQuerySchema } from "../validators/common.validator.js";

const router = Router();
router.get(
  "/summary",
  validate({ query: dashboardQuerySchema }),
  controller.summary,
);
router.get(
  "/trends",
  validate({ query: dashboardQuerySchema }),
  controller.trends,
);
router.get(
  "/patients-per-doctor",
  validate({ query: dashboardQuerySchema }),
  controller.patientsPerDoctor,
);
router.get(
  "/distributions",
  validate({ query: dashboardQuerySchema }),
  controller.distributions,
);
router.get(
  "/activity",
  validate({ query: dashboardQuerySchema }),
  controller.activity,
);
export default router;
