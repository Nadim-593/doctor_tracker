import { getActivity, getDistributions, getPatientsPerDoctor, getSummary, getTrends } from "../services/dashboard.service.js";

export async function summary(request, response) {
  response.json({ data: await getSummary(request.validated.query) });
}

export async function trends(request, response) {
  response.json({ data: await getTrends(request.validated.query) });
}

export async function patientsPerDoctor(request, response) {
  response.json({ data: await getPatientsPerDoctor(request.validated.query) });
}

export async function distributions(request, response) {
  response.json({ data: await getDistributions(request.validated.query) });
}

export async function activity(request, response) {
  response.json({ data: await getActivity(request.validated.query) });
}
