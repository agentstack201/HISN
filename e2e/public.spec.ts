import { expect, test } from "@playwright/test";

test("landing page renders without horizontal scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("attacker");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: `test-results/landing-${test.info().project.name}.png`, fullPage: true });
});

test("language switch turns the page Arabic and RTL", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch language" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("المهاجم");
  await page.screenshot({ path: `test-results/landing-ar-${test.info().project.name}.png`, fullPage: true });
});

test("protected pages require configuration/login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/setup$/);
});

test("security headers and PWA files are served", async ({ request }) => {
  const res = await request.get("/");
  expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  expect(res.headers()["x-powered-by"]).toBeUndefined();
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect((await request.get("/sw.js")).headers()["cache-control"]).toContain("no-store");
  expect((await request.get("/offline.html")).ok()).toBe(true);
  expect((await request.get("/icons/icon-512.png")).ok()).toBe(true);
});

test("service worker registers and offline page is shown without network", async ({ page, context, browserName }, info) => {
  test.skip(info.project.name !== "desktop" || browserName !== "chromium");
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled by the service worker
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.goto("/help").catch(() => undefined);
  await expect(page.getByRole("heading", { name: "You are offline" })).toBeVisible();
  await context.setOffline(false);
});
