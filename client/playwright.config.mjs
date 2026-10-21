import { defineConfig } from "@playwright/test";

const apiUrl = "http://127.0.0.1:4001/api/v1";

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
      env: { NODE_ENV: "development", PORT: "4001", CLIENT_URL: "http://127.0.0.1:3001", MONGODB_URI: "mongodb://127.0.0.1:27017/doctor_tracker_e2e", JWT_SECRET: "e2e-local-only-secret-change-before-deploy", JWT_EXPIRES_IN: "1d", COOKIE_SECURE: "false", ADMIN_EMAIL: "qa-admin@example.test", ADMIN_PASSWORD: "qa-local-test-password", NEXT_PUBLIC_API_URL: apiUrl },
    },
    {
      command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3001",
      cwd: ".",
      url: "http://127.0.0.1:3001/login",
      timeout: 180_000,
      reuseExistingServer: false,
      env: { NEXT_PUBLIC_API_URL: apiUrl },
    },
  ],
});
