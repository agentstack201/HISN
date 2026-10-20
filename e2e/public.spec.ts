import { expect, test } from "@playwright/test";

test("homepage is Arabic RTL by default and has no horizontal scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("حماية اليوم");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: `test-results/landing-${test.info().project.name}.png`, fullPage: true });
});

test("language switch turns the page English and LTR", async ({ page }, info) => {
  await page.goto("/");
  if (info.project.name === "mobile") await page.getByText("القائمة").click();
  await page.getByRole("button", { name: "Switch language" }).filter({ visible: true }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Protection today");
  await page.screenshot({ path: `test-results/landing-en-${info.project.name}.png`, fullPage: true });
});

test("hero video is muted, looping, inline and actually plays", async ({ page, request }) => {
  await page.goto("/");
  const video = page.locator("video");
  await expect(video.locator("source")).toHaveCount(2);
  expect((await request.get("/videos/hisn-fortress.mp4")).headers()["content-type"]).toBe("video/mp4");
  await expect(video).toHaveAttribute("poster", "/images/hisn-fortress-poster.jpg");
  const state = await video.evaluate(async (v: HTMLVideoElement) => {
    await new Promise((r) => setTimeout(r, 1500));
    return { src: v.currentSrc.endsWith(".webm"), muted: v.muted, loop: v.loop, inline: v.playsInline, paused: v.paused, time: v.currentTime, width: v.videoWidth };
  });
  expect(state).toMatchObject({ src: true, muted: true, loop: true, inline: true, paused: false, width: 1010 });
  expect(state.time).toBeGreaterThan(0.3);
  // The pause button stops it.
  await page.getByRole("button", { name: "إيقاف الفيديو الخلفي" }).click();
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
});

test("reduced motion: video does not autoplay", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/");
  await page.waitForTimeout(1000);
  expect(await page.locator("video").evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await context.close();
});

test("homepage links point to real destinations", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /ابدأ الفحص الآن/ })).toHaveAttribute("href", "/targets");
  await page.getByRole("link", { name: "اكتشف كيف يعمل حصن" }).click();
  await expect(page.locator("#how")).toBeInViewport();
  const hrefs = await page.locator("a[href]").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))]);
  for (const href of hrefs) {
    const [path, hash] = href.split("#");
    if (path) expect((await request.get(path, { maxRedirects: 5 })).status(), href).toBeLessThan(400);
    if (hash) expect(await page.locator(`#${hash}`).count(), href).toBe(1);
  }
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
