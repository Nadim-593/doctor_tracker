import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

mongoose.set("bufferCommands", false);

export async function connectDatabase() {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 3000,
    autoIndex: env.NODE_ENV !== "production",
  });
  logger.info(
    { event: "database_connected" },
    "MongoDB connection established",
  );
  return mongoose.connection;
}

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
