import { test } from "@playwright/test";

// Visual inspection screenshots at common device widths (desktop project only).
for (const [name, width, height] of [["desktop", 1440, 900], ["laptop", 1280, 720], ["tablet", 768, 1024], ["phone", 390, 844]] as const) {
  test(`screenshot ${name}`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `test-results/home-${name}.png` });
    await page.screenshot({ path: `test-results/home-${name}-full.png`, fullPage: true });
  });
}
