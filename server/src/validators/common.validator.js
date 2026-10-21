import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Must be a valid MongoDB ObjectId.");
const dateTime = z.string().datetime({ offset: true }).transform(value => new Date(value));

export const idParamsSchema = z.object({ id: objectId }).strict();
export const doctorIdParamsSchema = z.object({ doctorId: objectId }).strict();

const pagingShape = {
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  order: z.enum(["asc", "desc"]).default("desc"),
  createdFrom: dateTime.optional(),
  createdTo: dateTime.optional(),
};

function dateRangeRefinement(value, context) {
  if (value.createdFrom && value.createdTo && value.createdFrom > value.createdTo) {
    context.addIssue({ code: "custom", path: ["createdFrom"], message: "createdFrom must be before createdTo." });
  }
}

export const dashboardQuerySchema = z.object({
  range: z.enum(["last7", "last30", "last90", "custom"]).default("last30"),
  from: dateTime.optional(),
  to: dateTime.optional(),
}).strict().superRefine((value, context) => {
  if (value.range === "custom") {
    if (!value.from) context.addIssue({ code: "custom", path: ["from"], message: "from is required for a custom range." });
    if (!value.to) context.addIssue({ code: "custom", path: ["to"], message: "to is required for a custom range." });
    if (value.from && value.to && value.from > value.to) context.addIssue({ code: "custom", path: ["from"], message: "from must be before to." });
    if (value.from && value.to && value.to - value.from > 366 * 24 * 60 * 60 * 1000) context.addIssue({ code: "custom", path: ["to"], message: "Custom ranges cannot exceed 366 days." });
  } else if (value.from || value.to) {
    context.addIssue({ code: "custom", path: ["range"], message: "from and to are only supported with range=custom." });
  }
});

export const doctorListQuerySchema = z.object({
  ...pagingShape,
  sort: z.enum(["name", "specialization", "hospital", "email", "createdAt", "updatedAt"]).default("createdAt"),
  specialization: z.string().trim().max(100).optional(),
  hospital: z.string().trim().max(160).optional(),
}).strict().superRefine(dateRangeRefinement);

export const patientListQuerySchema = z.object({
  ...pagingShape,
  sort: z.enum(["name", "dateOfBirth", "condition", "gender", "createdAt", "updatedAt"]).default("createdAt"),
  doctor: objectId.optional(),
  condition: z.string().trim().max(160).optional(),
  gender: z.enum(["female", "male", "other", "undisclosed"]).optional(),
}).strict().superRefine(dateRangeRefinement);
