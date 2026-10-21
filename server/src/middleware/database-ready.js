import { isDatabaseReady } from "../config/database.js";
import { AppError } from "../utils/app-error.js";

export function requireDatabase(_request, _response, next) {
  if (!isDatabaseReady()) return next(new AppError(503, "DATABASE_UNAVAILABLE", "The database is not connected. Try again shortly."));
  next();
}
