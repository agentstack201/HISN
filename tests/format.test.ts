import { describe, expect, it } from "vitest";
import { formatDateTime } from "@/lib/i18n";

describe("formatDateTime", () => {
  it("shows Saudi Arabia time (UTC+3) whatever the server clock is", () => {
    // 21:30 UTC is 00:30 the next day in Riyadh.
    expect(formatDateTime("2026-10-21T21:30:00Z", "en")).toBe("22 Oct 2026, 00:30");
  });
  it("uses Gregorian dates with Latin digits in Arabic", () => {
    const text = formatDateTime("2026-10-21T21:30:00Z", "ar");
    expect(text).toContain("2026");
    expect(text).toMatch(/12:30/);
  });
});
