import { z } from "zod";

const dateOfBirth = z.coerce.date().refine(value => value <= new Date(), "dateOfBirth cannot be in the future.");
const email = z.union([z.literal(""), z.string().trim().email().max(254).transform(value => value.toLowerCase())]).optional().default("");

export const patientFieldsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  dateOfBirth,
  gender: z.enum(["female", "male", "other", "undisclosed"]),
  phone: z.string().trim().min(7).max(32),
  email,
  condition: z.string().trim().min(2).max(160),
  notes: z.string().trim().max(3000).optional().default(""),
});

export const createPatientSchema = patientFieldsSchema.extend({ doctor: z.string().regex(/^[a-f\d]{24}$/i) }).strict();
export const createAssignedPatientSchema = patientFieldsSchema.strict();
export const updatePatientSchema = patientFieldsSchema.partial().extend({ doctor: z.string().regex(/^[a-f\d]{24}$/i).optional() }).strict().refine(value => Object.keys(value).length > 0, "At least one patient field is required.");
