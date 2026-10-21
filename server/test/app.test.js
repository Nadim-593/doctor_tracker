process.env.NODE_ENV = "test";

const [{ default: app }, { createDoctorSchema }, { createPatientSchema }, { doctorListQuerySchema, patientListQuerySchema }, { buildListQuery, paginationOptions }, { databaseNameFromUri }, { databaseConnectionHint }] = await Promise.all([
  import("../src/app.js"),
  import("../src/validators/doctor.validator.js"),
  import("../src/validators/patient.validator.js"),
  import("../src/validators/common.validator.js"),
  import("../src/services/pagination.service.js"),
  import("../src/config/database.js"),
  import("../src/utils/database-error.js"),
]);

import test from "node:test";
import assert from "node:assert/strict";

async function withServer(run) {
  const server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  const address = server.address();
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

test("health endpoint reports database unavailability without hanging", async () => {
  await withServer(async baseUrl => {
    for (const path of ["/health", "/api/v1/health"]) {
      const response = await fetch(`${baseUrl}${path}`);
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { status: "unavailable", database: "disconnected", environment: "test" });
    }
  });
});

test("API root provides non-sensitive service information", async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { service: "Doctor Tracker API", apiVersion: "v1", apiBasePath: "/api/v1", health: "/health" });
  });
});

test("Atlas URIs without a database path select the explicit development database", () => {
  assert.equal(
    databaseNameFromUri("mongodb+srv://user:pass@cluster.example.net", "development"),
    "doctor_tracker_dev",
  );
  assert.equal(
    databaseNameFromUri("mongodb+srv://user:pass@cluster.example.net/doctor_tracker_e2e", "development"),
    "doctor_tracker_e2e",
  );
  assert.equal(
    databaseNameFromUri("mongodb+srv://user:pass@cluster.example.net", "production"),
    "",
  );
});

test("database connection errors provide safe Atlas-specific troubleshooting hints", () => {
  assert.match(databaseConnectionHint({ code: 18 }), /Atlas database user/);
  assert.match(databaseConnectionHint({ name: "MongoServerSelectionError" }), /Network Access/);
  assert.match(databaseConnectionHint({ name: "MongoParseError" }), /URL could not be parsed/);
});

test("database-backed routes fail quickly with a clear 503 when MongoDB is disconnected", async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/v1/doctors`);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, "DATABASE_UNAVAILABLE");
  });
});

test("malformed JSON is returned as a client error", async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/v1/doctors`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_JSON");
  });
});

test("CORS allows the configured client and rejects an unknown origin", async () => {
  await withServer(async baseUrl => {
    const allowed = await fetch(`${baseUrl}/api/v1/health`, { headers: { Origin: "http://localhost:3000" } });
    assert.equal(allowed.headers.get("access-control-allow-origin"), "http://localhost:3000");
    assert.equal(allowed.headers.get("access-control-allow-credentials"), "true");
    const rejected = await fetch(`${baseUrl}/api/v1/health`, { headers: { Origin: "https://attacker.invalid" } });
    assert.equal(rejected.status, 403);
    assert.equal((await rejected.json()).error.code, "ORIGIN_NOT_ALLOWED");
  });
});

test("doctor validation normalizes email and rejects missing required fields", () => {
  const result = createDoctorSchema.safeParse({ name: "Dr. Mira Sen", specialization: "Cardiology", phone: "+12025550101", email: "MIRA@EXAMPLE.TEST" });
  assert.equal(result.success, true);
  assert.equal(result.data.email, "mira@example.test");
  assert.equal(createDoctorSchema.safeParse({ email: "not-an-email" }).success, false);
});

test("patient validation requires its doctor reference and valid date fields", () => {
  const result = createPatientSchema.safeParse({ name: "Alex Patient", dateOfBirth: "1990-04-20", gender: "undisclosed", phone: "+12025550102", condition: "Annual visit", doctor: "507f1f77bcf86cd799439011" });
  assert.equal(result.success, true);
  assert.equal(result.data.dateOfBirth instanceof Date, true);
  assert.equal(createPatientSchema.safeParse({ name: "Incomplete" }).success, false);
});

test("list queries enforce sort allowlists and use database pagination", () => {
  assert.equal(doctorListQuerySchema.safeParse({ sort: "passwordHash" }).success, false);
  assert.equal(patientListQuerySchema.safeParse({ limit: "101" }).success, false);
  const query = doctorListQuerySchema.parse({ page: "3", limit: "25", createdFrom: "2025-01-01T00:00:00Z", sort: "createdAt" });
  assert.deepEqual(paginationOptions(query), { sort: { createdAt: -1, _id: -1 }, skip: 50, limit: 25 });
  assert.ok(buildListQuery(query).createdAt.$gte instanceof Date);
});
