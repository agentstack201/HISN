/**
 * Target validation and network safety (SSRF protection).
 *
 * Receives: a URL typed by a user.
 * Returns:  either a cleaned URL or a clear error, and a safe way to fetch it.
 * Used by:  target forms (validation) and lib/scanner.ts (safeFetch).
 *
 * Security idea: the scanner runs on OUR server, so a malicious user could try
 * to make it request internal addresses (localhost, 10.x, 169.254.169.254 cloud
 * metadata...). We block those by checking every resolved IP address, and we
 * connect to the exact IP we checked, so DNS cannot change between the check
 * and the connection (DNS rebinding). Every redirect hop is checked again.
 */
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import type { TLSSocket } from "node:tls";

export const MAX_REDIRECTS = 5;
export const REQUEST_TIMEOUT_MS = 8000;
export const MAX_BODY_BYTES = 256 * 1024;

// Address ranges the scanner must never contact.
const blocked = new net.BlockList();
for (const [range, bits] of [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local + cloud metadata (169.254.169.254)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
] as const) {
  blocked.addSubnet(range, bits, "ipv4");
}
for (const [range, bits] of [
  ["::", 128], // unspecified
  ["::1", 128], // loopback
  ["64:ff9b::", 96], // NAT64
  ["100::", 64], // discard
  ["2001:db8::", 32], // documentation
  ["fc00::", 7], // unique local (private)
  ["fe80::", 10], // link-local
  ["ff00::", 8], // multicast
] as const) {
  blocked.addSubnet(range, bits, "ipv6");
}

/** True when an IP address is public and safe to contact. */
export function isPublicIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 0) return false;
  if (family === 6) {
    // ::ffff:10.0.0.1 is really an IPv4 address; check that address too.
    const mapped = ip.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicIp(mapped[1]);
  }
  return !blocked.check(ip, family === 4 ? "ipv4" : "ipv6");
}

const BLOCKED_HOSTNAMES = ["localhost", "metadata.google.internal"];

/**
 * Checks the *shape* of a URL (no network access).
 * Only http/https on default ports, no credentials, no internal hostnames,
 * and literal IPs must be public.
 */
export function checkTargetUrl(input: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, error: "Enter a full URL such as https://example.com" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http:// and https:// URLs are allowed" };
  }
  if (url.username || url.password) {
    return { ok: false, error: "URLs must not contain a username or password" };
  }
  // Only default ports: the scanner is not a port scanner.
  if (url.port !== "") {
    return { ok: false, error: "Custom ports are not allowed" };
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    BLOCKED_HOSTNAMES.includes(host) ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return { ok: false, error: "Internal hostnames are not allowed" };
  }
  if (net.isIP(host)) {
    if (!isPublicIp(host)) return { ok: false, error: "Private or reserved IP addresses are not allowed" };
  } else if (!host.includes(".")) {
    return { ok: false, error: "Hostname must be a public domain name" };
  }
  url.hash = "";
  return { ok: true, url };
}

/**
 * DNS lookup used for every connection: resolves the hostname, rejects the
 * request if ANY address is not public, then connects to the checked address.
 */
function safeLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void,
) {
  dns.lookup(hostname, { all: true }, (err, addresses) => {
    if (err) return callback(err, "");
    if (addresses.length === 0 || addresses.some((a) => !isPublicIp(a.address))) {
      const blockedErr: NodeJS.ErrnoException = new Error(`Blocked destination: ${hostname} resolves to a non-public address`);
      blockedErr.code = "EBLOCKED";
      return callback(blockedErr, "");
    }
    const first = addresses[0];
    if (options.all) return callback(null, [first]);
    callback(null, first.address, first.family);
  });
}

export interface TlsInfo {
  authorized: boolean;
  authorizationError?: string;
  protocol?: string | null;
  validTo?: string;
  issuer?: string;
}

export interface SafeResponse {
  url: string; // URL of this hop
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string; // first MAX_BODY_BYTES only
  tls?: TlsInfo;
}

/** One HTTP(S) request with timeout, size limit and the safe DNS lookup. */
function requestOnce(url: URL): Promise<SafeResponse> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        timeout: REQUEST_TIMEOUT_MS,
        // Let us inspect bad certificates instead of failing silently;
        // the result is reported as a TLS finding, never trusted for anything else.
        rejectUnauthorized: false,
        headers: { "User-Agent": "HISN-Security-Assessment/1.0", Accept: "text/html,*/*" },
      },
      (res) => {
        let tls: TlsInfo | undefined;
        if (url.protocol === "https:") {
          const socket = res.socket as TLSSocket;
          const cert = socket.getPeerCertificate();
          tls = {
            authorized: socket.authorized,
            authorizationError: socket.authorizationError ? String(socket.authorizationError) : undefined,
            protocol: socket.getProtocol(),
            validTo: cert?.valid_to,
            issuer: String(cert?.issuer?.O ?? cert?.issuer?.CN ?? "unknown"),
          };
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BODY_BYTES) {
            // Keep what we have and stop downloading.
            chunks.push(chunk.subarray(0, MAX_BODY_BYTES - (size - chunk.length)));
            res.destroy();
            finish();
            return;
          }
          chunks.push(chunk);
        });
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve({
            url: url.toString(),
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
            tls,
          });
        };
        res.on("end", finish);
        res.on("error", (e) => (done ? undefined : reject(e)));
      },
    );
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
    req.end();
  });
}

/**
 * Fetches a URL safely, following up to MAX_REDIRECTS redirects manually so
 * that every hop is validated. Returns all hops (the last one is the final page).
 * Throws on blocked destinations, timeouts and network errors.
 */
export async function safeFetch(startUrl: string): Promise<SafeResponse[]> {
  const hops: SafeResponse[] = [];
  let current = startUrl;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const check = checkTargetUrl(current);
    if (!check.ok) throw new Error(`Blocked destination: ${check.error}`);
    const res = await requestOnce(check.url);
    hops.push(res);
    const location = res.headers.location as string | undefined;
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, check.url).toString();
      continue;
    }
    return hops;
  }
  throw new Error(`Too many redirects (more than ${MAX_REDIRECTS})`);
}
