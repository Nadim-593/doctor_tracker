import { Doctor } from "../models/doctor.model.js";
import { Patient } from "../models/patient.model.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function resolveDateRange(query, now = new Date()) {
  if (query.range === "custom") return { range: query.range, from: query.from, to: query.to };
  const days = query.range === "last7" ? 7 : query.range === "last90" ? 90 : 30;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { range: query.range, from: new Date(today.getTime() - (days - 1) * DAY_MS), to: now };
}

function dateQuery(dateRange) {
  return { createdAt: { $gte: dateRange.from, $lte: dateRange.to } };
}

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

function buildTrendItems(dateRange, doctorRows, patientRows) {
  const doctorsByDay = new Map(doctorRows.map(row => [row._id, row.value]));
  const patientsByDay = new Map(patientRows.map(row => [row._id, row.value]));
  const first = new Date(Date.UTC(dateRange.from.getUTCFullYear(), dateRange.from.getUTCMonth(), dateRange.from.getUTCDate()));
  const last = new Date(Date.UTC(dateRange.to.getUTCFullYear(), dateRange.to.getUTCMonth(), dateRange.to.getUTCDate()));
  const items = [];
  for (let day = first, index = 0; day <= last && index <= 366; day = new Date(day.getTime() + DAY_MS), index += 1) {
    const date = isoDay(day);
    items.push({ date, label: day.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" }), doctors: doctorsByDay.get(date) || 0, patients: patientsByDay.get(date) || 0 });
  }
  return items;
}

async function groupedDistribution(Model, field, dateRange) {
  const [result = { top: [], totals: [] }] = await Model.aggregate([
    { $match: dateQuery(dateRange) },
    { $group: { _id: `$${field}`, value: { $sum: 1 } } },
    { $facet: {
      top: [{ $sort: { value: -1, _id: 1 } }, { $limit: 8 }],
      totals: [{ $group: { _id: null, value: { $sum: "$value" } } }],
    } },
  ]);
  const categories = result.top.map(item => ({ name: item._id, value: item.value }));
  const remainder = (result.totals[0]?.value || 0) - categories.reduce((sum, item) => sum + item.value, 0);
  if (remainder > 0) categories.push({ name: "Other", value: remainder });
  return categories;
}

export async function getSummary(query) {
  const dateRange = resolveDateRange(query);
  const periodFilter = dateQuery(dateRange);
  const [totalDoctors, totalPatients, doctorsCreated, patientsCreated, recentDoctors, recentPatients] = await Promise.all([
    Doctor.countDocuments(),
    Patient.countDocuments(),
    Doctor.countDocuments(periodFilter),
    Patient.countDocuments(periodFilter),
    Doctor.find().select("name specialization hospital createdAt").sort({ createdAt: -1, _id: -1 }).limit(5).lean(),
    Patient.find().select("name condition doctor createdAt").populate("doctor", "name").sort({ createdAt: -1, _id: -1 }).limit(5).lean(),
  ]);
  return {
    dateRange: { range: dateRange.range, from: dateRange.from.toISOString(), to: dateRange.to.toISOString() },
    totals: { doctors: totalDoctors, patients: totalPatients },
    createdInRange: { doctors: doctorsCreated, patients: patientsCreated },
    recentDoctors,
    recentPatients,
  };
}

export async function getTrends(query) {
  const dateRange = resolveDateRange(query);
  const group = [{ $match: dateQuery(dateRange) }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, value: { $sum: 1 } } }, { $sort: { _id: 1 } }];
  const [doctorRows, patientRows] = await Promise.all([Doctor.aggregate(group), Patient.aggregate(group)]);
  return {
    dateRange: { range: dateRange.range, from: dateRange.from.toISOString(), to: dateRange.to.toISOString() },
    interval: "day",
    items: buildTrendItems(dateRange, doctorRows, patientRows),
  };
}

export async function getPatientsPerDoctor(query) {
  const dateRange = resolveDateRange(query);
  const items = await Doctor.aggregate([
    { $lookup: {
      from: Patient.collection.name,
      let: { doctorId: "$_id" },
      pipeline: [
        { $match: { ...dateQuery(dateRange), $expr: { $eq: ["$doctor", "$$doctorId"] } } },
        { $count: "count" },
      ],
      as: "patientStats",
    } },
    { $set: { patientCount: { $ifNull: [{ $arrayElemAt: ["$patientStats.count", 0] }, 0] } } },
    { $project: { name: 1, specialization: 1, patientCount: 1 } },
    { $sort: { patientCount: -1, name: 1, _id: 1 } },
    { $limit: 20 },
  ]);
  return { dateRange: { range: dateRange.range, from: dateRange.from.toISOString(), to: dateRange.to.toISOString() }, items };
}

export async function getDistributions(query) {
  const dateRange = resolveDateRange(query);
  const [specializations, conditions] = await Promise.all([
    groupedDistribution(Doctor, "specialization", dateRange),
    groupedDistribution(Patient, "condition", dateRange),
  ]);
  return { dateRange: { range: dateRange.range, from: dateRange.from.toISOString(), to: dateRange.to.toISOString() }, specializations, conditions };
}

// Kept for older clients; dashboard activity is now the doctor/patient trend series.
export async function getActivity(query = { range: "last90" }) {
  const trends = await getTrends(query);
  return { items: trends.items.map(item => ({ label: item.label, value: item.doctors + item.patients })) };
}
