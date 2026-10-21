import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

const server = app.listen(env.PORT, () => logger.info({ port: env.PORT, event: "server_started" }, "Doctor Tracker API listening"));
let shuttingDown = false;
let retryTimer;

async function connectWithRetry() {
  if (shuttingDown) return;
  try {
    await connectDatabase();
  } catch (error) {
    logger.warn({ event: "database_connection_failed", errorName: error.name }, "MongoDB unavailable; the API will retry the connection");
    if (!shuttingDown) retryTimer = setTimeout(connectWithRetry, 5000).unref();
  }
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearTimeout(retryTimer);
  logger.info({ event: "server_stopping", signal }, "Stopping API server");
  server.close(async error => {
    if (error) logger.error({ err: error, event: "server_close_failed" }, "HTTP server failed to close cleanly");
    try { await disconnectDatabase(); } catch (disconnectError) { logger.warn({ errorName: disconnectError.name }, "Database disconnect reported an error"); }
    process.exitCode = error ? 1 : 0;
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
void connectWithRetry();
