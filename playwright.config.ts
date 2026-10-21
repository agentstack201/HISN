import { defineConfig } from "@playwright/test";

// Run with `npm run e2e` (sets PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS so
// the offline test can also take the service worker offline).
// Public-page smoke tests against the production build (no Supabase needed).
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:3100" },
  webServer: { command: "npm run start -- -p 3100", url: "http://localhost:3100", reuseExistingServer: false, env: { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" } },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { viewport: { width: 375, height: 740 }, isMobile: true } },
  ],
});
