import { Doctor } from "../models/doctor.model.js";
import { Patient } from "../models/patient.model.js";
import { AppError } from "../utils/app-error.js";
import { buildListQuery, pageInfo, paginationOptions } from "./pagination.service.js";

const doctorProjection = "name specialization hospital phone email createdAt updatedAt";
const patientProjection = "name dateOfBirth gender phone email condition doctor createdAt updatedAt";

export async function listDoctors(query) {
  const filter = buildListQuery(query);
  if (query.specialization) filter.specialization = query.specialization;
  if (query.hospital) filter.hospital = query.hospital;
  const options = paginationOptions(query);
  const [items, total] = await Promise.all([
    Doctor.aggregate([{ $match: filter }, { $sort: options.sort }, { $skip: options.skip }, { $limit: options.limit }, { $lookup: { from: Patient.collection.name, let: { doctorId: "$_id" }, pipeline: [{ $match: { $expr: { $eq: ["$doctor", "$$doctorId"] } } }, { $count: "count" }], as: "patientStats" } }, { $set: { patientCount: { $ifNull: [{ $arrayElemAt: ["$patientStats.count", 0] }, 0] } } }, { $unset: "patientStats" }]),
    Doctor.countDocuments(filter),
  ]);
  return { items, total, pagination: pageInfo(query.page, query.limit, total) };
}

export async function createDoctor(data) {
  const doctor = await Doctor.create(data);
  return doctor.toObject();
}

export async function getDoctor(id) {
  const doctor = await Doctor.findById(id).select(doctorProjection).lean();
  if (!doctor) throw new AppError(404, "DOCTOR_NOT_FOUND", "Doctor not found.");
  doctor.patientCount = await Patient.countDocuments({ doctor: id });
  return doctor;
}

export async function updateDoctor(id, data) {
  const doctor = await Doctor.findByIdAndUpdate(id, data, { new: true, runValidators: true, context: "query" }).select(doctorProjection).lean();
  if (!doctor) throw new AppError(404, "DOCTOR_NOT_FOUND", "Doctor not found.");
  return doctor;
}

export async function deleteDoctor(id) {
  const doctor = await Doctor.findById(id).select("_id").lean();
  if (!doctor) throw new AppError(404, "DOCTOR_NOT_FOUND", "Doctor not found.");
  const hasPatients = await Patient.exists({ doctor: id });
  if (hasPatients) throw new AppError(409, "DOCTOR_HAS_PATIENTS", "This doctor cannot be deleted while patients are assigned to them.");
  await Doctor.deleteOne({ _id: id });
}

export async function listDoctorPatients(doctorId, query) {
  const doctor = await Doctor.findById(doctorId).select("_id").lean();
  if (!doctor) throw new AppError(404, "DOCTOR_NOT_FOUND", "Doctor not found.");
  const filter = { ...buildListQuery(query), doctor: doctorId };
  if (query.condition) filter.condition = query.condition;
  if (query.gender) filter.gender = query.gender;
  const options = paginationOptions(query);
  const [items, total] = await Promise.all([
    Patient.find(filter).select(patientProjection).populate("doctor", "name specialization").sort(options.sort).skip(options.skip).limit(options.limit).lean(),
    Patient.countDocuments(filter),
  ]);
  return { items, total, pagination: pageInfo(query.page, query.limit, total) };
}
