import { z } from "zod";

const email = z.string().trim().email().max(254).transform(value => value.toLowerCase());

export const createDoctorSchema = z.object({
  name: z.string().trim().min(2).max(120),
  specialization: z.string().trim().min(2).max(100),
  hospital: z.string().trim().max(160).optional().default(""),
  phone: z.string().trim().min(7).max(32),
  email,
}).strict();

export const updateDoctorSchema = createDoctorSchema.partial().strict().refine(value => Object.keys(value).length > 0, "At least one doctor field is required.");
