await import("dotenv/config");
process.env.NODE_ENV = "test";
const explicitTestUri = process.env.MONGODB_TEST_URI;
const sourceUri = explicitTestUri || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/doctor_tracker";
const isolatedUri = new URL(sourceUri);
const sourceDatabase = isolatedUri.pathname.replace(/^\//, "") || "doctor_tracker";
if (explicitTestUri && !sourceDatabase.endsWith("_test")) throw new Error("MONGODB_TEST_URI must use a database name ending in _test.");
if (!explicitTestUri) isolatedUri.pathname = `/${sourceDatabase.endsWith("_test") ? sourceDatabase : `${sourceDatabase}_test`}`;
process.env.MONGODB_URI = isolatedUri.toString();

import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const [{ default: app }, database, doctors, patients, admins, bcrypt] = await Promise.all([
  import("../src/app.js"),
  import("../src/config/database.js"),
  import("../src/models/doctor.model.js"),
  import("../src/models/patient.model.js"),
  import("../src/models/admin.model.js"),
  import("bcryptjs"),
]);

test("MongoDB-backed doctor and patient CRUD integration", async context => {
  try {
    await database.connectDatabase();
  } catch {
    context.skip("MongoDB is not reachable in this environment.");
    return;
  }

  const marker = randomUUID().replaceAll("-", "").slice(0, 16);
  const doctorEmail = `integration.${marker}@doctor.test`;
  const patientEmail = `integration.${marker}@patient.test`;
  const server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
  let doctorId;
  let patientId;
  let assignedPatientId;
  const adminEmail = `integration.${marker}@admin.test`;
  let cookie = "";
  async function request(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (cookie) headers.set("Cookie", cookie);
    const response = await fetch(url, { ...options, headers });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie?.includes("doctor_tracker_session=")) cookie = setCookie.split(";")[0];
    return response;
  }

  try {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).database, "connected");

    const unauthorized = await request(`${baseUrl}/doctors`);
    assert.equal(unauthorized.status, 401);
    assert.equal((await request(`${baseUrl}/dashboard/summary`)).status, 401);
    await admins.Admin.create({ email: adminEmail, passwordHash: await bcrypt.hash("integration-test-password", 12) });
    const rejectedLogin = await request(`${baseUrl}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: adminEmail, password: "wrong-password" }) });
    assert.equal(rejectedLogin.status, 401);
    const acceptedLogin = await request(`${baseUrl}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: adminEmail, password: "integration-test-password" }) });
    assert.equal(acceptedLogin.status, 200);
    assert.match(acceptedLogin.headers.get("set-cookie") || "", /HttpOnly/i);
    assert.match(acceptedLogin.headers.get("set-cookie") || "", /SameSite=Lax/i);
    assert.match(acceptedLogin.headers.get("set-cookie") || "", /Path=\/api\/v1/i);
    assert.equal((await request(`${baseUrl}/auth/me`)).status, 200);
    const invalidDashboardRange = await request(`${baseUrl}/dashboard/trends?range=custom&from=2026-10-22T00%3A00%3A00.000Z`);
    assert.equal(invalidDashboardRange.status, 400);
    for (const preset of ["last7", "last30", "last90"]) {
      const presetResponse = await request(`${baseUrl}/dashboard/summary?range=${preset}`);
      assert.equal((await presetResponse.json()).data.dateRange.range, preset);
    }

    const createdDoctor = await request(`${baseUrl}/doctors`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Integration Doctor", specialization: "General Practice", hospital: "Test Clinic", phone: "+12025550999", email: doctorEmail.toUpperCase() }),
    });
    assert.equal(createdDoctor.status, 201);
    const doctorPayload = await createdDoctor.json();
    doctorId = doctorPayload.data._id;
    assert.equal(doctorPayload.data.email, doctorEmail);

    const readDoctor = await request(`${baseUrl}/doctors/${doctorId}`);
    assert.equal(readDoctor.status, 200);
    assert.equal((await readDoctor.json()).data.specialization, "General Practice");
    const filteredDoctors = await request(`${baseUrl}/doctors?specialization=General%20Practice&hospital=Test%20Clinic&page=1&limit=1&sort=name&order=asc`);
    assert.equal(filteredDoctors.status, 200);
    assert.equal((await filteredDoctors.json()).total, 1);
    const dateFilteredDoctors = await request(`${baseUrl}/doctors?createdFrom=${encodeURIComponent(new Date(Date.now() - 60_000).toISOString())}&createdTo=${encodeURIComponent(new Date(Date.now() + 60_000).toISOString())}&page=1&limit=10`);
    assert.equal((await dateFilteredDoctors.json()).total, 1);
    const searchedDoctors = await request(`${baseUrl}/doctors?q=Integration&sort=name&order=asc&page=1&limit=10`);
    assert.equal((await searchedDoctors.json()).total, 1);
    const updatedDoctor = await request(`${baseUrl}/doctors/${doctorId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hospital: "Updated Test Clinic" }),
    });
    assert.equal(updatedDoctor.status, 200);
    assert.equal((await updatedDoctor.json()).data.hospital, "Updated Test Clinic");

    const duplicateDoctor = await request(`${baseUrl}/doctors`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Duplicate Doctor", specialization: "General Practice", phone: "+12025550998", email: doctorEmail }),
    });
    assert.equal(duplicateDoctor.status, 409);

    const createdPatient = await request(`${baseUrl}/patients`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Integration Patient", dateOfBirth: "1990-05-18", gender: "undisclosed", phone: "+12025550997", email: patientEmail, condition: "Routine checkup", doctor: doctorId, notes: "Synthetic integration note." }),
    });
    assert.equal(createdPatient.status, 201);
    const patientPayload = await createdPatient.json();
    patientId = patientPayload.data._id;
    assert.equal(patientPayload.data.doctor.name, "Integration Doctor");
    const doctorWithCount = await request(`${baseUrl}/doctors/${doctorId}`);
    assert.equal((await doctorWithCount.json()).data.patientCount, 1);
    const missingDoctor = await request(`${baseUrl}/patients`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Missing Doctor Patient", dateOfBirth: "1990-05-18", gender: "undisclosed", phone: "+12025550995", condition: "Routine checkup", doctor: "507f1f77bcf86cd799439011" }) });
    assert.equal(missingDoctor.status, 422);

    const readPatient = await request(`${baseUrl}/patients/${patientId}`);
    assert.equal(readPatient.status, 200);
    assert.equal((await readPatient.json()).data.notes, "Synthetic integration note.");
    const assignedList = await request(`${baseUrl}/doctors/${doctorId}/patients`);
    assert.equal((await assignedList.json()).total, 1);

    const assignedCreate = await request(`${baseUrl}/doctors/${doctorId}/patients`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nested Integration Patient", dateOfBirth: "1987-08-08", gender: "female", phone: "+12025550996", email: `nested.${marker}@patient.test`, condition: "Follow-up visit" }),
    });
    assert.equal(assignedCreate.status, 201);
    assignedPatientId = (await assignedCreate.json()).data._id;

    const dateFrom = new Date(Date.now() - 60_000).toISOString();
    const dateTo = new Date(Date.now() + 60_000).toISOString();
    const analyticsQuery = `range=custom&from=${encodeURIComponent(dateFrom)}&to=${encodeURIComponent(dateTo)}`;
    const summaryResponse = await request(`${baseUrl}/dashboard/summary?${analyticsQuery}`);
    const summary = (await summaryResponse.json()).data;
    assert.equal(summary.totals.doctors, await doctors.Doctor.countDocuments());
    assert.equal(summary.totals.patients, await patients.Patient.countDocuments());
    assert.equal(summary.createdInRange.doctors, 1);
    assert.equal(summary.createdInRange.patients, 2);
    assert.equal(summary.recentDoctors.some(item => item._id === doctorId), true);

    const trends = (await request(`${baseUrl}/dashboard/trends?${analyticsQuery}`).then(response => response.json())).data;
    assert.equal(trends.items.reduce((total, item) => total + item.doctors, 0), 1);
    assert.equal(trends.items.reduce((total, item) => total + item.patients, 0), 2);
    const patientsPerDoctor = (await request(`${baseUrl}/dashboard/patients-per-doctor?${analyticsQuery}`).then(response => response.json())).data;
    assert.equal(patientsPerDoctor.items.find(item => item._id === doctorId).patientCount, 2);
    const distributions = (await request(`${baseUrl}/dashboard/distributions?${analyticsQuery}`).then(response => response.json())).data;
    assert.equal(distributions.specializations.find(item => item.name === "General Practice").value, 1);
    assert.equal(distributions.conditions.find(item => item.name === "Routine checkup").value, 1);

    const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const futureFrom = new Date(Date.UTC(futureStart.getUTCFullYear(), futureStart.getUTCMonth(), futureStart.getUTCDate())).toISOString();
    const futureTo = new Date(Date.parse(futureFrom) + 24 * 60 * 60 * 1000 - 1).toISOString();
    const futureSummary = (await request(`${baseUrl}/dashboard/summary?range=custom&from=${encodeURIComponent(futureFrom)}&to=${encodeURIComponent(futureTo)}`).then(response => response.json())).data;
    assert.equal(futureSummary.totals.doctors, summary.totals.doctors);
    assert.equal(futureSummary.createdInRange.doctors, 0);
    const emptyTrends = (await request(`${baseUrl}/dashboard/trends?range=custom&from=${encodeURIComponent(futureFrom)}&to=${encodeURIComponent(futureTo)}`).then(response => response.json())).data;
    assert.equal(emptyTrends.items.every(item => item.doctors === 0 && item.patients === 0), true);
    const emptyDistributions = (await request(`${baseUrl}/dashboard/distributions?range=custom&from=${encodeURIComponent(futureFrom)}&to=${encodeURIComponent(futureTo)}`).then(response => response.json())).data;
    assert.deepEqual(emptyDistributions.specializations, []);
    assert.deepEqual(emptyDistributions.conditions, []);

    const filteredPatients = await request(`${baseUrl}/patients?doctor=${doctorId}&page=1&limit=5&sort=createdAt&order=desc`);
    const patientList = await filteredPatients.json();
    assert.equal(filteredPatients.status, 200);
    assert.equal(patientList.total, 2);
    const filteredByCondition = await request(`${baseUrl}/patients?q=Integration&condition=Routine%20checkup&doctor=${doctorId}&page=1&limit=1&sort=name&order=asc`);
    assert.equal((await filteredByCondition.json()).total, 1);

    const protectedDelete = await request(`${baseUrl}/doctors/${doctorId}`, { method: "DELETE" });
    assert.equal(protectedDelete.status, 409);

    const updatedPatient = await request(`${baseUrl}/patients/${patientId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ condition: "Updated routine checkup" }),
    });
    assert.equal(updatedPatient.status, 200);
    assert.equal((await updatedPatient.json()).data.condition, "Updated routine checkup");

    const badId = await request(`${baseUrl}/doctors/not-an-object-id`);
    assert.equal(badId.status, 400);

    const removedPatient = await request(`${baseUrl}/patients/${patientId}`, { method: "DELETE" });
    assert.equal(removedPatient.status, 204);
    patientId = undefined;
    const removedAssignedPatient = await request(`${baseUrl}/patients/${assignedPatientId}`, { method: "DELETE" });
    assert.equal(removedAssignedPatient.status, 204);
    assignedPatientId = undefined;
    const removedDoctor = await request(`${baseUrl}/doctors/${doctorId}`, { method: "DELETE" });
    assert.equal(removedDoctor.status, 204);
    doctorId = undefined;
    await request(`${baseUrl}/auth/logout`, { method: "POST" });
    assert.equal((await request(`${baseUrl}/doctors`)).status, 401);
  } finally {
    if (patientId) await patients.Patient.deleteOne({ _id: patientId });
    if (assignedPatientId) await patients.Patient.deleteOne({ _id: assignedPatientId });
    if (doctorId) await doctors.Doctor.deleteOne({ _id: doctorId });
    await admins.Admin.deleteOne({ email: adminEmail });
    await new Promise(resolve => server.close(resolve));
    await database.disconnectDatabase();
  }
});
