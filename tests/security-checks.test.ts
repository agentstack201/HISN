import { describe, expect, it } from "vitest";
import { checkCookies, checkHeaders, checkHttps, checkMisconfigurations } from "@/lib/security-checks";
import type { SafeResponse } from "@/lib/targets";

const res = (url: string, headers: SafeResponse["headers"] = {}, extra: Partial<SafeResponse> = {}): SafeResponse => ({
  url,
  status: 200,
  headers,
  body: "",
  ...extra,
});

const find = (list: ReturnType<typeof checkHeaders>, key: string) => list.find((f) => f.check_key === key)!;

describe("checkHttps", () => {
  it("flags plain HTTP as high severity", () => {
    const f = checkHttps([res("http://example.com/")], null);
    expect(f[0]).toMatchObject({ check_key: "https.used", severity: "high", status: "failed" });
  });
  it("passes HTTPS with valid certificate and redirect", () => {
    const https = res("https://example.com/", {}, { tls: { authorized: true, validTo: "Jan 1 00:00:00 2099 GMT", issuer: "CA" } });
    const f = checkHttps([https], [res("http://example.com/", { location: "https://example.com/" }, { status: 301 }), https]);
    expect(f.every((x) => x.status === "passed")).toBe(true);
  });
  it("flags untrusted certificates", () => {
    const f = checkHttps([res("https://x.com/", {}, { tls: { authorized: false, authorizationError: "CERT_HAS_EXPIRED" } })], null);
    expect(f.find((x) => x.check_key === "tls.certificate")).toMatchObject({ severity: "high", evidence: expect.stringContaining("CERT_HAS_EXPIRED") });
  });
  it("marks unreachable HTTP as inconclusive, not a vulnerability", () => {
    const f = checkHttps([res("https://x.com/", {}, { tls: { authorized: true } })], null);
    expect(f.find((x) => x.check_key === "https.redirect")?.status).toBe("inconclusive");
  });
});

describe("checkHeaders", () => {
  it("reports missing headers with evidence and no critical severity", () => {
    const f = checkHeaders(res("https://example.com/"));
    expect(find(f, "header.csp")).toMatchObject({ status: "failed", severity: "medium" });
    expect(find(f, "header.hsts").evidence).toContain("Strict-Transport-Security");
    expect(f.some((x) => x.severity === "critical")).toBe(false);
  });
  it("passes good headers", () => {
    const f = checkHeaders(
      res("https://example.com/", {
        "strict-transport-security": "max-age=31536000",
        "content-security-policy": "default-src 'self'",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
        "permissions-policy": "camera=()",
      }),
    );
    expect(f.every((x) => x.status === "passed")).toBe(true);
  });
  it("detects weak values", () => {
    const f = checkHeaders(res("https://e.com/", { "strict-transport-security": "max-age=60", "content-security-policy": "script-src 'unsafe-inline'" }));
    expect(find(f, "header.hsts").title).toContain("Weak");
    expect(find(f, "header.csp").title).toContain("Weak");
  });
  it("skips HSTS on plain HTTP", () => {
    expect(checkHeaders(res("http://e.com/")).some((x) => x.check_key === "header.hsts")).toBe(false);
  });
});

describe("checkCookies", () => {
  it("is informational when no cookies", () => {
    expect(checkCookies([res("https://e.com/")])[0].status).toBe("info");
  });
  it("lists insecure cookie names without their values", () => {
    const f = checkCookies([res("https://e.com/", { "set-cookie": ["sid=SECRETVALUE; Path=/", "ok=1; Secure; HttpOnly; SameSite=Lax"] })]);
    expect(f[0].status).toBe("failed");
    expect(f[0].evidence).toContain("sid: missing Secure, HttpOnly, SameSite");
    expect(f[0].evidence).not.toContain("SECRETVALUE");
    expect(f[0].evidence).not.toContain("ok:");
  });
});

describe("checkMisconfigurations", () => {
  it("detects version disclosure, framing and directory listing", () => {
    const f = checkMisconfigurations(res("https://e.com/", { server: "Apache/2.4.1", "x-powered-by": "PHP/8.1" }, { body: "<title>Index of /files</title>" }));
    expect(f.map((x) => x.check_key)).toEqual(["misconfig.version_disclosure", "misconfig.clickjacking", "misconfig.directory_listing"]);
    expect(f.every((x) => x.status === "failed")).toBe(true);
  });
  it("does not flag a server name without a version", () => {
    const f = checkMisconfigurations(res("https://e.com/", { server: "nginx", "x-frame-options": "DENY" }));
    expect(f.every((x) => x.status === "passed")).toBe(true);
  });
});
