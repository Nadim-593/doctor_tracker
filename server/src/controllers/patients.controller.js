import * as patients from "../services/patients.service.js";

export async function list(request, response) {
  response.json(await patients.listPatients(request.validated.query));
}

export async function create(request, response) {
  const data = await patients.createPatient(request.validated.body);
  response.status(201).json({ data });
}

export async function get(request, response) {
  response.json({ data: await patients.getPatient(request.validated.params.id) });
}

export async function update(request, response) {
  response.json({ data: await patients.updatePatient(request.validated.params.id, request.validated.body) });
}

export async function remove(request, response) {
  await patients.deletePatient(request.validated.params.id);
  response.status(204).end();
}
