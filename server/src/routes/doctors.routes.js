import { Router } from "express";
import * as controller from "../controllers/doctors.controller.js";
import { validate } from "../middleware/validate.js";
import {
  createDoctorSchema,
  updateDoctorSchema,
} from "../validators/doctor.validator.js";
import { createAssignedPatientSchema } from "../validators/patient.validator.js";
import {
  doctorIdParamsSchema,
  doctorListQuerySchema,
  idParamsSchema,
  patientListQuerySchema,
} from "../validators/common.validator.js";

const router = Router();

router.get("/", validate({ query: doctorListQuerySchema }), controller.list);
router.post("/", validate({ body: createDoctorSchema }), controller.create);
router.get(
  "/:doctorId/patients",
  validate({ params: doctorIdParamsSchema, query: patientListQuerySchema }),
  controller.listPatients,
);
router.post(
  "/:doctorId/patients",
  validate({ params: doctorIdParamsSchema, body: createAssignedPatientSchema }),
  controller.createPatient,
);
router.get("/:id", validate({ params: idParamsSchema }), controller.get);
router.patch(
  "/:id",
  validate({ params: idParamsSchema, body: updateDoctorSchema }),
  controller.update,
);
router.delete("/:id", validate({ params: idParamsSchema }), controller.remove);

export default router;
