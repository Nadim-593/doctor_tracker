import { z } from "zod";

const optionalText = z.string().trim().optional();
export const doctorSchema = z.object({
  name: z.string().trim().min(2, "Enter the doctor's name."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(7, "Enter a valid phone number."),
  specialization: z.string().trim().min(2, "Enter a specialization."),
  hospital: optionalText,
});
export const patientSchema = z.object({
  name: z.string().trim().min(2, "Enter the patient's name."),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address.")]).optional(),
  phone: z.string().trim().min(7, "Enter a valid phone number."),
  dateOfBirth: z.string().min(1, "Select a date of birth."),
  gender: z.enum(["female", "male", "other", "undisclosed"]),
  condition: z.string().trim().min(2, "Enter a primary condition."),
  doctor: z.string().trim().min(1, "Select a doctor."),
  notes: optionalText,
});
