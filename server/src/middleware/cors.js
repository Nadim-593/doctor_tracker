import cors from "cors";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

const allowedOrigins = new Set(env.CLIENT_URL);

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(
      new AppError(403, "ORIGIN_NOT_ALLOWED", "This origin is not allowed."),
    );
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 600,
});
