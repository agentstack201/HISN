/**
 * Scanner tests against a controlled local HTTP server.
 * Real scans refuse localhost, so for these tests only we replace the public
 * IP check to allow 127.0.0.1 and send a fake public hostname to it.
 */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let port = 0;
vi.mock("node:dns", async (orig) => {
  const real = (await orig()) as typeof import("node:dns");
  const lookup = (host: string, opts: unknown, cb: (e: Error | null, a: { address: string; family: number }[]) => void) => {
    if (host === "test-site.example") return cb(null, [{ address: "127.0.0.1", family: 4 }]);
    if (host === "rebind.example") return cb(null, [{ address: "8.8.8.8", family: 4 }, { address: "10.0.0.5", family: 4 }]);
    return real.lookup(host, opts as never, cb as never);
  };
  return { ...real, default: { ...real, lookup }, lookup };
});
vi.mock("node:net", async (orig) => {
  const real = (await orig()) as typeof import("node:net");
  // Allow loopback only; everything else uses the real block list.
  const BlockList = class extends real.BlockList {
    check(ip: string, type?: "ipv4" | "ipv6") {
      return ip === "127.0.0.1" ? false : super.check(ip, type);
    }
  };
  return { ...real, default: { ...real, BlockList }, BlockList };
});
// Default ports are required by checkTargetUrl; route every request to the test server port.
vi.mock("node:http", async (orig) => {
  const real = (await orig()) as typeof import("node:http");
  const request = (url: URL, opts: http.RequestOptions, cb: (res: http.IncomingMessage) => void) =>
    real.request({ ...opts, hostname: url.hostname, port, path: url.pathname + url.search }, cb);
  return { ...real, default: { ...real, request }, request };
});

const { runScan } = await import("@/lib/scanner");
const { safeFetch } = await import("@/lib/targets");

let server: http.Server;
beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.url === "/slow") return; // never answers → timeout
    if (req.url === "/loop") return res.writeHead(302, { location: "/loop" }).end();
    if (req.url === "/to-private") return res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data" }).end();
    if (req.url === "/big") return res.end("x".repeat(2_000_000));
    res.writeHead(200, { "set-cookie": "session=abc; Path=/", server: "Apache/2.4.1" }).end("<title>Index of /</title>");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  port = (server.address() as AddressInfo).port;
});
afterAll(() => server.close());

describe("runScan against a controlled server", () => {
  it("produces evidence-based findings for an insecure HTTP site", async () => {
    const result = await runScan("http://test-site.example/");
    expect(result.status).toBe("completed");
    const keys = result.findings.filter((f) => f.status === "failed").map((f) => f.check_key);
    expect(keys).toEqual(expect.arrayContaining(["https.used", "header.csp", "cookies.flags", "misconfig.version_disclosure", "misconfig.directory_listing"]));
  });
  it("reports redirect loops as a failed scan, not a vulnerability", async () => {
    const result = await runScan("http://test-site.example/loop");
    expect(result).toMatchObject({ status: "failed", findings: [] });
    expect(result.error).toContain("Too many redirects");
  });
  it("blocks redirects to cloud metadata addresses", async () => {
    await expect(safeFetch("http://test-site.example/to-private")).rejects.toThrow(/Blocked destination/);
  });
  it("blocks hostnames where any resolved address is private (DNS rebinding)", async () => {
    await expect(safeFetch("http://rebind.example/")).rejects.toThrow(/non-public/);
  });
  it("limits response size", async () => {
    const hops = await safeFetch("http://test-site.example/big");
    expect(hops[0].body.length).toBeLessThanOrEqual(256 * 1024);
  });
  it("times out slow servers", async () => {
    const result = await runScan("http://test-site.example/slow");
    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/timed out/);
  }, 15_000);
});
