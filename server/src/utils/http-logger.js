import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import { logger } from "./logger.js";

export const requestLogger = pinoHttp({
  logger,
  genReqId: () => randomUUID(),
  serializers: {
    req(request) { return { id: request.id, method: request.method, path: (request.originalUrl || request.url || "").split("?")[0] }; },
    res(response) { return { statusCode: response.statusCode }; },
  },
  customLogLevel(_request, response, error) {
    if (error || response.statusCode >= 500) return "error";
    if (response.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage(request, response) { return `${request.method} ${request.route?.path || request.path} completed with ${response.statusCode}`; },
  customErrorMessage(request, response) { return `${request.method} ${request.route?.path || request.path} failed with ${response.statusCode}`; },
});
