import { AppError } from "../utils/app-error.js";

export function validate({ body, params, query } = {}) {
  return (request, _response, next) => {
    const values = {};
    for (const [key, schema] of Object.entries({ body, params, query })) {
      if (!schema) continue;
      const result = schema.safeParse(request[key]);
      if (!result.success) {
        const details = result.error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message, code: issue.code }));
        return next(new AppError(400, "VALIDATION_ERROR", "Request validation failed.", details));
      }
      values[key] = result.data;
    }
    request.validated = values;
    next();
  };
}
