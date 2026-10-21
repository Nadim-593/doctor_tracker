import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { isDatabaseReady } from "./config/database.js";
import { env } from "./config/env.js";
import { corsMiddleware } from "./middleware/cors.js";
import { requireDatabase } from "./middleware/database-ready.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import { validate } from "./middleware/validate.js";
import { requestLogger } from "./utils/http-logger.js";
import doctorsRoutes from "./routes/doctors.routes.js";
import patientsRoutes from "./routes/patients.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import { z } from "zod";
import authRoutes from "./routes/auth.routes.js";
import { authenticate } from "./middleware/authenticate.js";
import { requireTrustedOrigin } from "./middleware/trusted-origin.js";

const app = express();
const healthQuerySchema = z.object({}).strict();

app.disable("x-powered-by");
app.use(requestLogger);
app.use(helmet());
app.use(corsMiddleware);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 150, standardHeaders: "draft-8", legacyHeaders: false, message: { error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." } } }));
app.use(express.json({ limit: "100kb", strict: true }));
app.use(cookieParser());

app.get("/", (_request, response) => {
  response.json({ service: "Doctor Tracker API", apiVersion: "v1", apiBasePath: "/api/v1", health: "/health" });
});

function healthHandler(_request, response) {
  const ready = isDatabaseReady();
  response.status(ready ? 200 : 503).json({ status: ready ? "ok" : "unavailable", database: ready ? "connected" : "disconnected", environment: env.NODE_ENV });
}

app.get("/health", validate({ query: healthQuerySchema }), healthHandler);
app.get("/api/v1/health", validate({ query: healthQuerySchema }), healthHandler);

app.use("/api/v1/auth", requireDatabase, authRoutes);
app.use("/api/v1/doctors", requireDatabase, authenticate, requireTrustedOrigin, doctorsRoutes);
app.use("/api/v1/patients", requireDatabase, authenticate, requireTrustedOrigin, patientsRoutes);
app.use("/api/v1/dashboard", requireDatabase, authenticate, dashboardRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
