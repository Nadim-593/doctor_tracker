import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react({ include: /\.[jt]sx?$/ })],
  esbuild: { loader: "jsx", include: /client\/.*\.[jt]sx?$/, exclude: [] },
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    include: ["test/**/*.test.{js,jsx}"],
    environment: "jsdom",
    setupFiles: ["./test/setup.js"],
    restoreMocks: true,
    clearMocks: true,
  },
});
