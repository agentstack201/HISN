import { describe, expect, it } from "vitest";
import { checkTargetUrl, isPublicIp, safeFetch } from "@/lib/targets";
import { targetSchema } from "@/lib/validation";

describe("isPublicIp", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1"])(
    "blocks %s",
    (ip) => expect(isPublicIp(ip)).toBe(false),
  );
  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])("allows %s", (ip) => expect(isPublicIp(ip)).toBe(true));
  it("rejects non-IPs", () => expect(isPublicIp("example.com")).toBe(false));
});

describe("checkTargetUrl", () => {
  it("accepts a normal https URL", () => {
    const r = checkTargetUrl("https://example.com/path#frag");
    expect(r.ok && r.url.toString()).toBe("https://example.com/path");
  });
  it.each([
    ["ftp://example.com", "Only http"],
    ["file:///etc/passwd", "Only http"],
    ["http://localhost", "Internal"],
    ["http://app.localhost", "Internal"],
    ["http://metadata.google.internal", "Internal"],
    ["http://127.0.0.1", "Private"],
    ["http://[::1]", "Private"],
    ["http://169.254.169.254/latest/meta-data", "Private"],
    ["http://user:pw@example.com", "username"],
    ["http://example.com:8080", "ports"],
    ["http://intranet", "public domain"],
    ["not a url", "full URL"],
  ])("rejects %s", (url, msg) => {
    const r = checkTargetUrl(url);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(msg);
  });
});

describe("safeFetch", () => {
  it("refuses hostnames that resolve to private addresses (DNS check)", async () => {
    // localtest.me style names resolve to 127.0.0.1; we use a literal check via a
    // hostname that the system resolver maps to loopback.
    await expect(safeFetch("http://localhost.")).rejects.toThrow(/Blocked|ENOTFOUND|EAI_AGAIN/);
  });
  it("refuses literal private IPs before connecting", async () => {
    await expect(safeFetch("http://10.0.0.1")).rejects.toThrow(/Blocked destination/);
  });
});

describe("targetSchema", () => {
  it("requires authorization confirmation", () => {
    const r = targetSchema.safeParse({ name: "Site", url: "https://example.com" });
    expect(r.success).toBe(false);
  });
  it("normalizes valid input", () => {
    const r = targetSchema.safeParse({ name: " Site ", url: "https://Example.com", authorized: "on" });
    expect(r.success && r.data).toEqual({ name: "Site", url: "https://example.com/", authorized: "on" });
  });
});
