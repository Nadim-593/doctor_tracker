import { Router } from "express";
import * as controller from "../controllers/patients.controller.js";
import { validate } from "../middleware/validate.js";
import {
  idParamsSchema,
  patientListQuerySchema,
} from "../validators/common.validator.js";
import {
  createPatientSchema,
  updatePatientSchema,
} from "../validators/patient.validator.js";

const router = Router();

router.get("/", validate({ query: patientListQuerySchema }), controller.list);
router.post("/", validate({ body: createPatientSchema }), controller.create);
router.get("/:id", validate({ params: idParamsSchema }), controller.get);
router.patch(
  "/:id",
  validate({ params: idParamsSchema, body: updatePatientSchema }),
  controller.update,
);
router.delete("/:id", validate({ params: idParamsSchema }), controller.remove);

export default router;
