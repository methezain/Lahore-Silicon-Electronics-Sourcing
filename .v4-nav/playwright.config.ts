import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  use: { baseURL: "http://localhost:4323" },
  projects: [
    { name: "390", use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } },
    { name: "1440", use: { viewport: { width: 1440, height: 900 } } },
  ],
});
