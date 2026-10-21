import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

const allowedOrigins = new Set(env.CLIENT_URL);

export function requireTrustedOrigin(request, _response, next) {
  const origin = request.get("origin");
  if (origin && !allowedOrigins.has(origin))
    return next(
      new AppError(403, "ORIGIN_NOT_ALLOWED", "This origin is not allowed."),
    );
  next();
}
