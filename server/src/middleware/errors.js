import mongoose from "mongoose";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";

export function notFoundHandler(request, _response, next) {
  next(
    new AppError(
      404,
      "ROUTE_NOT_FOUND",
      `Route ${request.method} ${request.path} was not found.`,
    ),
  );
}

export function errorHandler(error, request, response, _next) {
  let normalized = error;
  if (error?.type === "entity.parse.failed") {
    normalized = new AppError(
      400,
      "INVALID_JSON",
      "Request body must contain valid JSON.",
    );
  } else if (error?.type === "entity.too.large") {
    normalized = new AppError(
      413,
      "BODY_TOO_LARGE",
      "Request body exceeds the 100kb limit.",
    );
  } else if (error instanceof ZodError) {
    normalized = new AppError(
      400,
      "VALIDATION_ERROR",
      "Request validation failed.",
      error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
    );
  } else if (error?.code === 11000) {
    const fields = Object.keys(error.keyPattern || {});
    const field = fields[0] || "value";
    normalized = new AppError(
      409,
      "DUPLICATE_RESOURCE",
      `A record with that ${field} already exists.`,
      [{ path: field, message: "Must be unique." }],
    );
  } else if (error instanceof mongoose.Error.CastError) {
    normalized = new AppError(
      400,
      "INVALID_IDENTIFIER",
      "The supplied identifier is invalid.",
    );
  } else if (error instanceof mongoose.Error.ValidationError) {
    normalized = new AppError(
      400,
      "MODEL_VALIDATION_ERROR",
      "The supplied data is invalid.",
      Object.values(error.errors).map((item) => ({
        path: item.path,
        message: item.message,
      })),
    );
  } else if (
    error?.name === "MongoServerSelectionError" ||
    error?.name === "MongooseServerSelectionError" ||
    error?.name === "MongoNetworkError"
  ) {
    normalized = new AppError(
      503,
      "DATABASE_UNAVAILABLE",
      "The database is temporarily unavailable.",
    );
  }

  const status = normalized.status || 500;
  if (status >= 500)
    logger.error(
      { errorName: error.name, requestId: request.id, event: "request_failed" },
      "Request failed",
    );
  const result = {
    error: {
      code: normalized.code || "INTERNAL_ERROR",
      message:
        status >= 500 && !normalized.status
          ? "An unexpected error occurred."
          : normalized.message,
    },
  };
  if (normalized.details) result.error.details = normalized.details;
  response.status(status).json(result);
}
