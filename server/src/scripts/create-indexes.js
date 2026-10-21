import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { Admin } from "../models/admin.model.js";
import { Doctor } from "../models/doctor.model.js";
import { Patient } from "../models/patient.model.js";

try {
  await connectDatabase();
  await Promise.all([Admin.createIndexes(), Doctor.createIndexes(), Patient.createIndexes()]);
  await Promise.all([
    replaceRedundantCreationIndex(Doctor),
    replaceRedundantCreationIndex(Patient),
  ]);
  console.info("MongoDB indexes are up to date.");
} finally {
  await disconnectDatabase();
}

async function replaceRedundantCreationIndex(Model) {
  const indexes = await Model.collection.indexes();
  const hasStableIndex = indexes.some(index => index.name === "createdAt_-1__id_-1");
  const hasLegacyIndex = indexes.some(index => index.name === "createdAt_-1");
  if (hasStableIndex && hasLegacyIndex) await Model.collection.dropIndex("createdAt_-1");
}
