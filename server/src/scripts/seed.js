import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { Admin } from "../models/admin.model.js";
import { Doctor } from "../models/doctor.model.js";
import { Patient } from "../models/patient.model.js";

if (env.NODE_ENV !== "development") {
  throw new Error("The development seed script only runs when NODE_ENV=development.");
}

const databaseUrl = new URL(env.MONGODB_URI);
const databaseName = databaseUrl.pathname.replace(/^\//, "");
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
if (!localHosts.has(databaseUrl.hostname) && !/(^|[_-])(dev|development|test)([_-]|$)/i.test(databaseName)) {
  throw new Error("Refusing to seed a remote database unless its database name includes dev, development, or test.");
}

const doctorFixtures = [
  { name: "Dr. Mira Sen", specialization: "Cardiology", hospital: "Northstar Community Clinic", phone: "+1-202-555-0101", email: "mira.sen@northstar.test" },
  { name: "Dr. Jonah Reed", specialization: "Family Medicine", hospital: "Northstar Community Clinic", phone: "+1-202-555-0102", email: "jonah.reed@northstar.test" },
  { name: "Dr. Leila Hart", specialization: "Dermatology", hospital: "Harborview Medical Center", phone: "+1-202-555-0103", email: "leila.hart@harborview.test" },
];

const patientFixtures = [
  { name: "Avery Park", dateOfBirth: "1989-04-16", gender: "female", phone: "+1-202-555-0201", email: "avery.park@patients.test", condition: "Seasonal allergies", notes: "Fictional development seed record.", doctorEmail: "jonah.reed@northstar.test" },
  { name: "Elliot Gray", dateOfBirth: "1974-11-02", gender: "male", phone: "+1-202-555-0202", email: "elliot.gray@patients.test", condition: "Hypertension", notes: "Fictional development seed record.", doctorEmail: "mira.sen@northstar.test" },
  { name: "Noor Ellis", dateOfBirth: "1996-07-23", gender: "undisclosed", phone: "+1-202-555-0203", email: "noor.ellis@patients.test", condition: "Eczema", notes: "Fictional development seed record.", doctorEmail: "leila.hart@harborview.test" },
  { name: "Sam Rivera", dateOfBirth: "2001-02-11", gender: "other", phone: "+1-202-555-0204", email: "sam.rivera@patients.test", condition: "Preventive care", notes: "Fictional development seed record.", doctorEmail: "jonah.reed@northstar.test" },
];

try {
  await connectDatabase();
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  await Admin.updateOne({ email: env.ADMIN_EMAIL }, { $setOnInsert: { email: env.ADMIN_EMAIL, passwordHash } }, { upsert: true });

  for (const doctor of doctorFixtures) {
    await Doctor.updateOne({ email: doctor.email }, { $setOnInsert: doctor }, { upsert: true });
  }
  const doctors = await Doctor.find({ email: { $in: doctorFixtures.map(doctor => doctor.email) } }).select("_id email").lean();
  const doctorIds = new Map(doctors.map(doctor => [doctor.email, doctor._id]));
  for (const patient of patientFixtures) {
    const { doctorEmail, ...data } = patient;
    await Patient.updateOne({ email: data.email }, { $setOnInsert: { ...data, doctor: doctorIds.get(doctorEmail) } }, { upsert: true });
  }
  console.info("Development seed complete: administrator, doctors, and patients are ready.");
} finally {
  await disconnectDatabase();
}
