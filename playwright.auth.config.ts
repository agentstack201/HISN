import { defineConfig } from "@playwright/test";

// Authenticated workflow tests against a REAL Supabase project (reads .env.local).
// Needs two confirmed test users; see docs/test-plan.md. Run: npm run e2e:auth
export default defineConfig({
  testDir: "e2e-auth",
  workers: 1,
  timeout: 90_000,
  use: { baseURL: "http://localhost:3101" },
  webServer: { command: "npm run start -- -p 3101", url: "http://localhost:3101", reuseExistingServer: false },
});
