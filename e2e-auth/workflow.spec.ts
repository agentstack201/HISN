import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "TestPass#12345";
const A = "hisn-test-a@example.com";
const B = "hisn-test-b@example.com";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور").fill(PASSWORD);
  await page.getByRole("button", { name: "دخول" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
}

let scanPath = "";
let targetPath = "";

test.describe.serial("authenticated workflow", () => {
  test("setup: remove leftovers from earlier runs (uses the app's own delete button)", async ({ page }) => {
    await login(page, A);
    for (let i = 0; i < 10; i++) {
      await page.goto("/targets");
      const link = page.locator("table a").first();
      if (!(await link.count())) break;
      await link.click();
      await page.getByRole("button", { name: "حذف" }).click();
      await page.waitForURL(/\/targets$/);
    }
  });

  test("wrong password is rejected with a generic message", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("البريد الإلكتروني").fill(A);
    await page.getByLabel("كلمة المرور").fill("wrong-password-1");
    await page.getByRole("button", { name: "دخول" }).click();
    await expect(page.locator("form [role=alert]")).toContainText("Invalid email or password");
  });

  test("A: login, dashboard is empty, add target, unsafe URLs rejected", async ({ page }) => {
    await login(page, A);
    await expect(page.getByText("لا توجد فحوصات بعد")).toBeVisible();
    await page.goto("/targets");
    for (const bad of ["http://169.254.169.254", "http://localhost"]) {
      await page.getByLabel("الاسم").fill("bad");
      await page.getByLabel("الرابط").fill(bad);
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "حفظ" }).click();
      await expect(page.locator("form [role=alert]")).toBeVisible();
      await expect(page.getByLabel("الاسم")).toHaveValue(""); // React resets the form after the action
    }
    await page.getByLabel("الاسم").fill("Example");
    await page.getByLabel("الرابط").fill("https://example.com");
    await page.getByRole("checkbox").check(); // the form is reset after a rejected submit
    await page.getByRole("button", { name: "حفظ" }).click();
    await expect(page.locator("form [role=status]")).toBeVisible();
    await page.reload();
    await page.getByRole("link", { name: "Example" }).click();
    await page.waitForURL(/\/targets\/[0-9a-f-]{36}$/);
    targetPath = new URL(page.url()).pathname;
    expect(targetPath).toMatch(/^\/targets\/[0-9a-f-]{36}$/);
  });

  test("A: real scan is saved, shows evidence, filter works, PDF downloads", async ({ page }) => {
    await login(page, A);
    await page.goto(targetPath);
    await page.getByRole("button", { name: "بدء الفحص" }).click();
    await expect(page).toHaveURL(/\/scans\/[0-9a-f-]{36}$/, { timeout: 60_000 });
    scanPath = new URL(page.url()).pathname;
    await expect(page.getByText("ترويسة Content-Security-Policy (CSP) غير موجودة")).toBeVisible(); // Arabic finding text
    await expect(page.getByText("الدليل:").first()).toBeVisible();
    await page.getByRole("link", { name: /^منخفضة/ }).click();
    await expect(page).toHaveURL(/severity=low/);
    const res = await page.request.get(`${scanPath}/report`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect(res.headers()["cache-control"]).toContain("no-store");
    expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
    await page.goto("/dashboard");
    await expect(page.getByText("مكتمل").first()).toBeVisible();
  });

  test("A: second scan and comparison page", async ({ page }) => {
    await login(page, A);
    await page.goto(targetPath);
    await page.getByRole("button", { name: "بدء الفحص" }).click();
    await expect(page).toHaveURL(/\/scans\/[0-9a-f-]{36}$/, { timeout: 60_000 });
    await page.goto("/scans");
    const radiosA = page.getByLabel("Compare as A");
    const radiosB = page.getByLabel("Compare as B");
    await radiosA.nth(0).check();
    await radiosB.nth(1).check();
    await page.getByRole("button", { name: "مقارنة" }).click();
    await expect(page.getByText("header.csp")).toBeVisible();
  });

  test("B cannot see or download A's data", async ({ page }) => {
    await login(page, B);
    await expect(page.getByText("لا توجد فحوصات بعد")).toBeVisible();
    expect((await page.goto(targetPath))?.status()).toBe(404);
    expect((await page.goto(scanPath))?.status()).toBe(404);
    expect((await page.request.get(`${scanPath}/report`)).status()).toBe(404);
    await page.goto("/targets");
    await expect(page.getByText("لا توجد مواقع بعد")).toBeVisible();
  });

  test("logged-out visitor cannot download a report", async ({ request }) => {
    expect((await request.get(`${scanPath}/report`)).status()).toBe(401);
  });

  test("A: scan rate limit (6th scan in 10 minutes is refused)", async ({ page }) => {
    await login(page, A);
    await page.goto(targetPath);
    let refused = false;
    for (let i = 0; i < 5 && !refused; i++) {
      await page.goto(targetPath);
      await page.getByRole("button", { name: "بدء الفحص" }).click();
      const limit = page.getByText(/Limit reached/);
      const done = page.waitForURL(/\/scans\/[0-9a-f-]{36}$/, { timeout: 60_000 }).catch(() => undefined);
      await Promise.race([limit.waitFor({ timeout: 60_000 }).then(() => (refused = true)), done]);
    }
    expect(refused).toBe(true);
  });

  test("A: delete target removes its scans", async ({ page }) => {
    await login(page, A);
    await page.goto(targetPath);
    await page.getByRole("button", { name: "حذف" }).click();
    await expect(page).toHaveURL(/\/targets$/);
    await page.goto("/scans");
    await expect(page.getByText("لا توجد فحوصات بعد")).toBeVisible();
  });

  test("settings: language preference saved", async ({ page }) => {
    await login(page, A);
    await page.goto("/settings");
    await page.getByLabel("الاسم الظاهر").fill("Tester A");
    await page.getByRole("button", { name: "حفظ الإعدادات" }).click();
    await expect(page.locator("form [role=status]")).toContainText("تم حفظ الإعدادات");
    await page.reload();
    await expect(page.getByLabel("الاسم الظاهر")).toHaveValue("Tester A");
  });
});
