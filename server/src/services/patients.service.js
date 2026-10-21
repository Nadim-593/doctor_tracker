import mongoose from "mongoose";
import { Doctor } from "../models/doctor.model.js";
import { Patient } from "../models/patient.model.js";
import { AppError } from "../utils/app-error.js";
import { buildListQuery, pageInfo, paginationOptions } from "./pagination.service.js";

const patientProjection = "name dateOfBirth gender phone email condition doctor createdAt updatedAt";

async function ensureDoctorExists(doctorId) {
  const exists = await Doctor.exists({ _id: doctorId });
  if (!exists) throw new AppError(422, "DOCTOR_NOT_FOUND", "The assigned doctor does not exist.");
}

export async function listPatients(query) {
  const filter = buildListQuery(query);
  if (query.doctor) filter.doctor = query.doctor;
  if (query.condition) filter.condition = query.condition;
  if (query.gender) filter.gender = query.gender;
  const options = paginationOptions(query);
  const [items, total] = await Promise.all([
    Patient.find(filter).select(patientProjection).populate("doctor", "name specialization").sort(options.sort).skip(options.skip).limit(options.limit).lean(),
    Patient.countDocuments(filter),
  ]);
  return { items, total, pagination: pageInfo(query.page, query.limit, total) };
}

export async function createPatient(data) {
  await ensureDoctorExists(data.doctor);
  const patient = await Patient.create(data);
  return Patient.findById(patient._id).select("+notes").populate("doctor", "name specialization").lean();
}

export async function getPatient(id) {
  const patient = await Patient.findById(id).select("+notes").populate("doctor", "name specialization").lean();
  if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Patient not found.");
  return patient;
}

export async function updatePatient(id, data) {
  if (data.doctor) await ensureDoctorExists(data.doctor);
  const patient = await Patient.findByIdAndUpdate(id, data, { new: true, runValidators: true, context: "query" }).select("+notes").populate("doctor", "name specialization").lean();
  if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Patient not found.");
  return patient;
}

export async function deletePatient(id) {
  const patient = await Patient.findByIdAndDelete(id).select("_id").lean();
  if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Patient not found.");
}

export async function createDoctorPatient(doctorId, data) {
  if (!mongoose.isValidObjectId(doctorId)) throw new AppError(400, "INVALID_IDENTIFIER", "The supplied doctor identifier is invalid.");
  await ensureDoctorExists(doctorId);
  return createPatient({ ...data, doctor: doctorId });
}
