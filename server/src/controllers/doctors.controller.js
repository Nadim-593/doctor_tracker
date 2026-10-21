import * as doctors from "../services/doctors.service.js";
import * as patients from "../services/patients.service.js";

export async function list(request, response) {
  response.json(await doctors.listDoctors(request.validated.query));
}

export async function create(request, response) {
  const data = await doctors.createDoctor(request.validated.body);
  response.status(201).json({ data });
}

export async function get(request, response) {
  response.json({ data: await doctors.getDoctor(request.validated.params.id) });
}

export async function update(request, response) {
  response.json({ data: await doctors.updateDoctor(request.validated.params.id, request.validated.body) });
}

export async function remove(request, response) {
  await doctors.deleteDoctor(request.validated.params.id);
  response.status(204).end();
}

export async function listPatients(request, response) {
  const { doctorId } = request.validated.params;
  response.json(await doctors.listDoctorPatients(doctorId, request.validated.query));
}

export async function createPatient(request, response) {
  const { doctorId } = request.validated.params;
  const data = await patients.createDoctorPatient(doctorId, request.validated.body);
  response.status(201).json({ data });
}
