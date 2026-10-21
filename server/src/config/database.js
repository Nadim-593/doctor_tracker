import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

mongoose.set("bufferCommands", false);

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  const databaseName = databaseNameFromUri(env.MONGODB_URI);
  if (!databaseName) {
    throw new Error("MONGODB_URI must include an explicit database name in production.");
  }
  await mongoose.connect(env.MONGODB_URI, {
    ...(!new URL(env.MONGODB_URI).pathname.replace(/^\/+/, "")
      ? { dbName: databaseName }
      : {}),
    serverSelectionTimeoutMS: 3000,
    autoIndex: env.NODE_ENV !== "production",
  });
  logger.info(
    { event: "database_connected" },
    "MongoDB connection established",
  );
  return mongoose.connection;
}

export function databaseNameFromUri(uri = env.MONGODB_URI, mode = env.NODE_ENV) {
  const name = decodeURIComponent(new URL(uri).pathname.replace(/^\/+/, ""));
  if (name) return name;
  if (mode === "development") return "doctor_tracker_dev";
  if (mode === "test") return "doctor_tracker_test";
  return "";
}

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
