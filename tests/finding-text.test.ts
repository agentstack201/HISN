import { describe, expect, it } from "vitest";
import { localizeFinding } from "@/lib/finding-text";
import { checkCookies, checkHeaders, checkHttps, checkMisconfigurations, type Finding } from "@/lib/security-checks";
import type { SafeResponse } from "@/lib/targets";

const res = (url: string, headers: SafeResponse["headers"] = {}, extra: Partial<SafeResponse> = {}): SafeResponse => ({ url, status: 200, headers, body: "", ...extra });
const hasArabic = (s: string) => /[؀-ۿ]/.test(s);

// Every finding the scanner can produce must have an Arabic translation.
const goodTls = { authorized: true, validTo: "Jan 1 00:00:00 2099 GMT", issuer: "CA" };
const all: Finding[] = [
  ...checkHttps([res("http://e.com/")], null),
  ...checkHttps([res("https://e.com/", {}, { tls: goodTls })], [res("http://e.com/")]),
  ...checkHttps([res("https://e.com/", {}, { tls: { authorized: false, authorizationError: "X" } })], null),
  ...checkHttps([res("https://e.com/", {}, { tls: { ...goodTls, validTo: new Date(Date.now() + 86_400_000).toUTCString() } })], null),
  ...checkHttps([res("https://e.com/", {}, { tls: goodTls })], [res("https://e.com/")]),
  ...checkHeaders(res("https://e.com/")),
  ...checkHeaders(res("https://e.com/", { "strict-transport-security": "max-age=60", "content-security-policy": "script-src 'unsafe-inline'", "x-content-type-options": "x", "referrer-policy": "unsafe-url", "permissions-policy": "camera=()" })),
  ...checkHeaders(res("https://e.com/", { "strict-transport-security": "max-age=31536000", "content-security-policy": "default-src 'self'", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" })),
  ...checkCookies([res("https://e.com/")]),
  ...checkCookies([res("https://e.com/", { "set-cookie": ["a=1"] })]),
  ...checkCookies([res("https://e.com/", { "set-cookie": ["a=1; Secure; HttpOnly; SameSite=Lax"] })]),
  ...checkMisconfigurations(res("https://e.com/", { server: "Apache/2.4", "access-control-allow-origin": "*", "access-control-allow-credentials": "true" }, { body: "<title>Index of /</title>" })),
  ...checkMisconfigurations(res("https://e.com/", { server: "nginx", "x-frame-options": "DENY" })),
];

describe("localizeFinding", () => {
  it("covers every possible finding in Arabic", () => {
    expect(all.length).toBeGreaterThan(30);
    for (const f of all) {
      const ar = localizeFinding(f, "ar");
      expect(hasArabic(ar.title), `title of ${f.check_key}: ${f.title}`).toBe(true);
      expect(hasArabic(ar.description), `description of ${f.check_key}: ${f.title}`).toBe(true);
      expect(hasArabic(ar.remediation), `remediation of ${f.check_key}: ${f.title}`).toBe(true);
    }
  });
  it("keeps English unchanged and falls back for unknown checks", () => {
    const f = all[0];
    expect(localizeFinding(f, "en").title).toBe(f.title);
    const unknown = { ...f, check_key: "future.check" };
    expect(localizeFinding(unknown, "ar").title).toBe(f.title);
  });
});
