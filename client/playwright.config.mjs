import { defineConfig } from "@playwright/test";

const apiUrl = "http://127.0.0.1:4001/api/v1";
const configuredTestDatabase = process.env.DOCTOR_TRACKER_E2E_MONGODB_URI;
if (configuredTestDatabase) {
  const databaseName = new URL(configuredTestDatabase).pathname.replace(/^\/+/, "");
  if (!/(^|[_-])e2e([_-]|$)/i.test(databaseName)) {
    throw new Error("DOCTOR_TRACKER_E2E_MONGODB_URI must target a database with an e2e name.");
  }
}
const testDatabaseUri = configuredTestDatabase || "mongodb://127.0.0.1:27017/doctor_tracker_e2e";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 45_000,
  use: { baseURL: "http://127.0.0.1:3001", browserName: "chromium", headless: true, viewport: { width: 1440, height: 1000 }, trace: "retain-on-failure" },
  webServer: [
    {
      command: "npm run dev",
      cwd: "../server",
      url: `${apiUrl}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: { NODE_ENV: "development", PORT: "4001", CLIENT_URL: "http://127.0.0.1:3001", MONGODB_URI: testDatabaseUri, JWT_SECRET: "e2e-local-only-secret-change-before-deploy", JWT_EXPIRES_IN: "1d", COOKIE_SECURE: "false", ADMIN_EMAIL: "qa-admin@example.test", ADMIN_PASSWORD: "qa-local-test-password", NEXT_PUBLIC_API_URL: apiUrl },
    },
    {
      command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3001",
      cwd: ".",
      url: "http://127.0.0.1:3001/login",
      timeout: 180_000,
      reuseExistingServer: false,
      env: { NODE_ENV: "production", NEXT_PUBLIC_API_URL: apiUrl },
    },
  ],
});
