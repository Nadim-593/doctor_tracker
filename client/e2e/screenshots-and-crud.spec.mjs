import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const screenshotDir = fileURLToPath(
  new URL("../../screenshots/", import.meta.url),
);
const email = "qa-admin@example.test";
const password = "qa-local-test-password";

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

async function signIn(page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test("captures genuine desktop and mobile screens after seeded admin login", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(screenshotDir, "login.png"),
    fullPage: true,
  });
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByRole("heading", { name: "Record creation trends" }),
  ).toBeVisible();
  await expect(page.getByText("Total doctors")).toBeVisible();
  await expect(page.locator(".analytics-panel .chart-skeleton")).toHaveCount(0);
  await page.waitForTimeout(1800); // Allow Recharts entrance animations to finish before capture.
  await page.screenshot({
    path: path.join(screenshotDir, "dashboard-desktop.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250); // Let the responsive sidebar transition finish after the viewport changes.
  await page.waitForTimeout(1600); // Let Recharts remeasure and finish its responsive entrance animation.
  await page.screenshot({
    path: path.join(screenshotDir, "dashboard-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto("/doctors");
  await expect(page.getByRole("heading", { name: "Doctors" })).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await page.screenshot({
    path: path.join(screenshotDir, "doctors.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: /View Dr\./ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Assigned patients" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Add patient" })).toBeVisible();
  await page.screenshot({
    path: path.join(screenshotDir, "doctor-details.png"),
    fullPage: true,
  });

  await page.goto("/patients");
  await expect(page.getByRole("heading", { name: "Patients" })).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await page.screenshot({
    path: path.join(screenshotDir, "patients.png"),
    fullPage: true,
  });
});

test("creates, edits, searches, and deletes a doctor and patient through the UI", async ({
  page,
}) => {
  const marker = Date.now();
  const doctorName = `QA Doctor ${marker}`;
  const doctorEmail = `qa.doctor.${marker}@example.test`;
  const patientName = `QA Patient ${marker}`;
  await signIn(page);

  await page.goto("/doctors/new");
  await page.getByLabel("Full name").fill(doctorName);
  await page.getByLabel("Email address").fill(doctorEmail);
  await page.getByLabel("Phone number").fill("+1 202 555 0198");
  await page.getByLabel("Specialization").fill("Family Medicine");
  await page.getByLabel("Hospital").fill("QA Clinic");
  await page.getByRole("button", { name: "Create doctor" }).click();
  await expect(page).toHaveURL(/doctors$/);
  const search = page.getByRole("textbox", { name: /Search name/ });
  await search.fill(doctorName);
  const doctorRow = page.locator("tbody tr").filter({ hasText: doctorName });
  await expect(doctorRow).toBeVisible();
  await doctorRow.getByRole("link", { name: `View ${doctorName}` }).click();
  await page.getByRole("link", { name: "Add patient" }).click();

  await page.getByLabel("Full name").fill(patientName);
  await page
    .getByLabel("Email address (optional)")
    .fill(`qa.patient.${marker}@example.test`);
  await page.getByLabel("Phone number").fill("+1 202 555 0199");
  await page.getByLabel("Date of birth").fill("1991-04-21");
  await page.getByLabel("Gender").selectOption("undisclosed");
  await page.getByLabel("Primary condition").fill("Routine review");
  await expect(page.getByLabel("Assigned doctor")).toHaveValue(/.+/);
  await page.getByRole("button", { name: "Create patient" }).click();
  await expect(page).toHaveURL(/patients$/);

  const patientRow = page.locator("tbody tr").filter({ hasText: patientName });
  await expect(patientRow).toBeVisible();
  await page.goto("/doctors");
  await page.getByRole("textbox", { name: /Search name/ }).fill(doctorName);
  const assignedDoctorRow = page
    .locator("tbody tr")
    .filter({ hasText: doctorName });
  await assignedDoctorRow
    .getByRole("button", { name: `Delete ${doctorName}` })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.locator(".alert[role='alert']")).toContainText(
    "cannot be deleted while patients are assigned",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  await page.goto("/patients");
  await page.getByRole("textbox", { name: /Search name/ }).fill(patientName);
  const patientToEdit = page
    .locator("tbody tr")
    .filter({ hasText: patientName });
  await patientToEdit
    .getByRole("link", { name: `Edit ${patientName}` })
    .click();
  await page.getByLabel("Primary condition").fill("Updated review");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/patients$/);

  const editedPatientRow = page
    .locator("tbody tr")
    .filter({ hasText: patientName });
  await expect(editedPatientRow).toContainText("Updated review");
  await editedPatientRow
    .getByRole("button", { name: `Delete ${patientName}` })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(
    page.locator("tbody tr").filter({ hasText: patientName }),
  ).toHaveCount(0);

  await page.goto("/doctors");
  await page.getByRole("textbox", { name: /Search name/ }).fill(doctorName);
  const remainingDoctor = page
    .locator("tbody tr")
    .filter({ hasText: doctorName });
  await expect(remainingDoctor).toBeVisible();
  await remainingDoctor
    .getByRole("link", { name: `Edit ${doctorName}` })
    .click();
  await page.getByLabel("Hospital", { exact: true }).fill("Updated QA Clinic");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/doctors$/);
  await page.getByRole("textbox", { name: /Search name/ }).fill(doctorName);
  const doctorToDelete = page
    .locator("tbody tr")
    .filter({ hasText: doctorName });
  await doctorToDelete
    .getByRole("button", { name: `Delete ${doctorName}` })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(
    page.locator("tbody tr").filter({ hasText: doctorName }),
  ).toHaveCount(0);
});

test("rejects invalid login and prevents unauthenticated navigation", async ({
  page,
}) => {
  await page.goto("/doctors");
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("incorrect-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator(".alert[role='alert']")).toHaveText(
    "Invalid email or password.",
  );
});
