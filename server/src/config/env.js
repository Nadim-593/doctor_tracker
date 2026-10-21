import "dotenv/config";
import { z } from "zod";

const localJwtSecret =
  "local-development-only-change-this-secret-before-deploying";
const localAdminPassword = "local-only-change-this-password";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  CLIENT_URL: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .refine(
      (origins) =>
        origins.every((origin) => {
          try {
            const url = new URL(origin);
            return (
              ["http:", "https:"].includes(url.protocol) &&
              url.origin === origin
            );
          } catch {
            return false;
          }
        }),
      "CLIENT_URL must contain comma-separated origins without paths.",
    ),
  MONGODB_URI: z
    .string()
    .min(1)
    .default("mongodb://127.0.0.1:27017/doctor_tracker"),
  JWT_SECRET: z.string().min(32).default(localJwtSecret),
  JWT_EXPIRES_IN: z.string().min(1).default("1d"),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  ADMIN_EMAIL: z
    .string()
    .email()
    .default("admin@example.test")
    .transform((value) => value.toLowerCase()),
  ADMIN_PASSWORD: z.string().min(12).default(localAdminPassword),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000/api/v1"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const message = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${message}`);
}

const values = parsed.data;
if (values.NODE_ENV === "production") {
  if (values.JWT_SECRET === localJwtSecret || values.JWT_SECRET.length < 32)
    throw new Error(
      "JWT_SECRET must be set to a unique secret of at least 32 characters in production.",
    );
  if (values.ADMIN_PASSWORD === localAdminPassword)
    throw new Error("ADMIN_PASSWORD must be changed in production.");
  if (values.COOKIE_SECURE === "false")
    throw new Error("COOKIE_SECURE must be true in production.");
  if (values.CLIENT_URL.some((origin) => !origin.startsWith("https://")))
    throw new Error("Production CLIENT_URL values must use HTTPS.");
}

export const env = {
  ...values,
  COOKIE_SECURE: values.COOKIE_SECURE
    ? values.COOKIE_SECURE === "true"
    : values.NODE_ENV === "production",
};
