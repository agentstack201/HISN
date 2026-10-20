/**
 * Individual security checks.
 *
 * Receives: the HTTP responses collected by lib/scanner.ts (no network here,
 *           which makes every check easy to unit-test).
 * Returns:  a list of findings, one or more per check.
 * Used by:  lib/scanner.ts.
 *
 * Rules: every finding carries the evidence we actually observed. A passed
 * check is recorded as "passed", not hidden, so reports show what was tested.
 * Missing headers are rated Low/Medium, never Critical: they are hardening
 * measures, not proof of an exploitable vulnerability.
 */
import type { SafeResponse } from "./targets";

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type CheckStatus = "passed" | "failed" | "info" | "inconclusive";
export type Confidence = "high" | "medium" | "low";

export interface Finding {
  check_key: string;
  title: string;
  severity: Severity;
  description: string;
  evidence: string;
  remediation: string;
  confidence: Confidence;
  status: CheckStatus;
}

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

/** Checks HTTPS usage, HTTP→HTTPS redirect and certificate validity. */
export function checkHttps(hops: SafeResponse[], httpHops: SafeResponse[] | null): Finding[] {
  const findings: Finding[] = [];
  const final = hops[hops.length - 1];
  const finalUrl = new URL(final.url);

  if (finalUrl.protocol !== "https:") {
    findings.push({
      check_key: "https.used",
      title: "Site is not served over HTTPS",
      severity: "high",
      description: "Traffic between visitors and the site is not encrypted, so it can be read or modified on the network.",
      evidence: `Final URL after redirects: ${final.url}`,
      remediation: "Install a TLS certificate (for example from Let's Encrypt) and redirect all HTTP traffic to HTTPS.",
      confidence: "high",
      status: "failed",
    });
    return findings;
  }

  findings.push({
    check_key: "https.used",
    title: "Site is served over HTTPS",
    severity: "info",
    description: "The final page was delivered over an encrypted HTTPS connection.",
    evidence: `Final URL: ${final.url}${final.tls?.protocol ? `, protocol ${final.tls.protocol}` : ""}`,
    remediation: "No action needed.",
    confidence: "high",
    status: "passed",
  });

  const tls = final.tls;
  if (tls && !tls.authorized) {
    findings.push({
      check_key: "tls.certificate",
      title: "TLS certificate is not trusted",
      severity: "high",
      description: "Browsers will show a security warning because the certificate could not be verified.",
      evidence: `Verification error: ${tls.authorizationError ?? "unknown"}`,
      remediation: "Use a certificate from a trusted authority that matches the domain name and has not expired, and serve the full certificate chain.",
      confidence: "high",
      status: "failed",
    });
  } else if (tls) {
    const daysLeft = tls.validTo ? Math.floor((Date.parse(tls.validTo) - Date.now()) / 86_400_000) : NaN;
    const expiringSoon = !Number.isNaN(daysLeft) && daysLeft < 14;
    findings.push({
      check_key: "tls.certificate",
      title: expiringSoon ? "TLS certificate expires soon" : "TLS certificate is valid",
      severity: expiringSoon ? "low" : "info",
      description: expiringSoon
        ? "The certificate is trusted but will expire within 14 days."
        : "The certificate was verified by a trusted authority.",
      evidence: `Issuer: ${tls.issuer ?? "unknown"}; valid until: ${tls.validTo ?? "unknown"}`,
      remediation: expiringSoon ? "Renew the certificate, ideally with automatic renewal." : "No action needed.",
      confidence: "high",
      status: expiringSoon ? "failed" : "passed",
    });
  }

  // Did the plain-HTTP version of the site redirect to HTTPS?
  if (httpHops === null) {
    findings.push({
      check_key: "https.redirect",
      title: "HTTP to HTTPS redirect could not be tested",
      severity: "info",
      description: "The plain HTTP version of the site did not respond, so the redirect could not be verified.",
      evidence: "No response on http:// (connection failed or timed out).",
      remediation: "If port 80 is open, make it redirect permanently (301) to HTTPS.",
      confidence: "low",
      status: "inconclusive",
    });
  } else {
    const httpFinal = httpHops[httpHops.length - 1];
    const redirected = new URL(httpFinal.url).protocol === "https:";
    findings.push({
      check_key: "https.redirect",
      title: redirected ? "HTTP redirects to HTTPS" : "HTTP does not redirect to HTTPS",
      severity: redirected ? "info" : "medium",
      description: redirected
        ? "Visitors who type http:// are sent to the secure version."
        : "Visitors using http:// stay on an unencrypted connection.",
      evidence: `Redirect chain: ${httpHops.map((h) => `${h.status} ${h.url}`).join(" → ")}`,
      remediation: redirected ? "No action needed." : "Configure the web server to redirect all HTTP requests to HTTPS with a 301 status.",
      confidence: "high",
      status: redirected ? "passed" : "failed",
    });
  }
  return findings;
}

interface HeaderRule {
  header: string;
  key: string;
  severity: Severity;
  why: string;
  fix: string;
  // Optional extra validation of the header value; returns a problem or null.
  validate?: (value: string) => string | null;
}

const HEADER_RULES: HeaderRule[] = [
  {
    header: "strict-transport-security",
    key: "header.hsts",
    severity: "medium",
    why: "HSTS tells browsers to always use HTTPS, protecting against downgrade attacks.",
    fix: "Add: Strict-Transport-Security: max-age=31536000; includeSubDomains",
    validate: (v) => {
      const m = v.match(/max-age=(\d+)/i);
      if (!m) return "max-age is missing";
      if (Number(m[1]) < 15552000) return `max-age=${m[1]} is shorter than 180 days`;
      return null;
    },
  },
  {
    header: "content-security-policy",
    key: "header.csp",
    severity: "medium",
    why: "A Content-Security-Policy limits which scripts can run, reducing the impact of cross-site scripting (XSS).",
    fix: "Add a Content-Security-Policy, starting with: default-src 'self'; and adjust for the resources your site needs.",
    validate: (v) => (/'unsafe-inline'/.test(v) && /script-src|default-src/.test(v) ? "allows 'unsafe-inline' scripts" : null),
  },
  {
    header: "x-content-type-options",
    key: "header.xcto",
    severity: "low",
    why: "Stops browsers from guessing (sniffing) file types, which can turn uploads into scripts.",
    fix: "Add: X-Content-Type-Options: nosniff",
    validate: (v) => (v.toLowerCase().trim() === "nosniff" ? null : `value "${v}" should be "nosniff"`),
  },
  {
    header: "referrer-policy",
    key: "header.referrer",
    severity: "low",
    why: "Controls how much of the page URL is sent to other sites, which may leak private paths or tokens.",
    fix: "Add: Referrer-Policy: strict-origin-when-cross-origin",
    validate: (v) => (/unsafe-url/i.test(v) ? "unsafe-url sends full URLs to every site" : null),
  },
  {
    header: "permissions-policy",
    key: "header.permissions",
    severity: "info",
    why: "Restricts powerful browser features (camera, microphone, location) the site does not need.",
    fix: "Add for example: Permissions-Policy: camera=(), microphone=(), geolocation=()",
  },
];

/** Checks common security headers on the final response. */
export function checkHeaders(final: SafeResponse): Finding[] {
  const findings: Finding[] = [];
  const isHttps = final.url.startsWith("https:");

  for (const rule of HEADER_RULES) {
    // HSTS is ignored by browsers over plain HTTP, so it is only meaningful on HTTPS.
    if (rule.key === "header.hsts" && !isHttps) continue;

    const raw = final.headers[rule.header];
    const value = Array.isArray(raw) ? raw.join(", ") : raw;
    const name = rule.header.replace(/(^|-)([a-z])/g, (_m, dash, c) => dash + c.toUpperCase());

    if (!value) {
      findings.push({
        check_key: rule.key,
        title: `Missing ${name} header`,
        severity: rule.severity,
        description: rule.why,
        evidence: `Header "${name}" was not present in the response from ${final.url}`,
        remediation: rule.fix,
        confidence: "high",
        status: rule.severity === "info" ? "info" : "failed",
      });
      continue;
    }
    const problem = rule.validate ? rule.validate(value) : null;
    findings.push({
      check_key: rule.key,
      title: problem ? `Weak ${name} header` : `${name} header is set`,
      severity: problem ? (rule.severity === "medium" ? "low" : rule.severity) : "info",
      description: problem ? `${rule.why} The current value ${problem}.` : rule.why,
      evidence: `${name}: ${value.slice(0, 300)}`,
      remediation: problem ? rule.fix : "No action needed.",
      confidence: "high",
      status: problem ? "failed" : "passed",
    });
  }
  return findings;
}

/** Checks Secure, HttpOnly and SameSite attributes of cookies set by the site. */
export function checkCookies(hops: SafeResponse[]): Finding[] {
  const cookies = hops.flatMap((h) => h.headers["set-cookie"] ?? []);
  if (cookies.length === 0) {
    return [
      {
        check_key: "cookies.flags",
        title: "No cookies observed",
        severity: "info",
        description: "The scanned page did not set cookies, so cookie attributes could not be assessed. Logged-in areas may still set cookies.",
        evidence: "No Set-Cookie headers in the responses.",
        remediation: "No action needed for this page.",
        confidence: "medium",
        status: "info",
      },
    ];
  }

  const problems: string[] = [];
  for (const cookie of cookies) {
    // Only the cookie NAME is stored as evidence, never its value.
    const name = cookie.split("=")[0].trim();
    const attrs = cookie.toLowerCase();
    const missing: string[] = [];
    if (!/;\s*secure/.test(attrs)) missing.push("Secure");
    if (!/;\s*httponly/.test(attrs)) missing.push("HttpOnly");
    if (!/;\s*samesite=/.test(attrs)) missing.push("SameSite");
    if (missing.length) problems.push(`${name}: missing ${missing.join(", ")}`);
  }

  if (problems.length === 0) {
    return [
      {
        check_key: "cookies.flags",
        title: "Cookies use secure attributes",
        severity: "info",
        description: "All observed cookies set Secure, HttpOnly and SameSite.",
        evidence: `${cookies.length} cookie(s) checked.`,
        remediation: "No action needed.",
        confidence: "high",
        status: "passed",
      },
    ];
  }
  return [
    {
      check_key: "cookies.flags",
      title: "Cookies missing security attributes",
      severity: "medium",
      description:
        "Without Secure, cookies can be sent over HTTP; without HttpOnly, scripts (and XSS) can read them; without SameSite, they are sent with cross-site requests (CSRF risk). Note: some cookies legitimately need script access.",
      evidence: problems.join("; "),
      remediation: "Set cookies with: Secure; HttpOnly; SameSite=Lax (or Strict). Session cookies should always be HttpOnly.",
      confidence: "medium",
      status: "failed",
    },
  ];
}

/** Checks for information disclosure and other simple misconfigurations. */
export function checkMisconfigurations(final: SafeResponse): Finding[] {
  const findings: Finding[] = [];

  const disclosed = ["server", "x-powered-by", "x-aspnet-version"]
    .map((h) => [h, final.headers[h]] as const)
    .filter(([, v]) => typeof v === "string" && /\d/.test(v)); // only when a version number is shown
  if (disclosed.length > 0) {
    findings.push({
      check_key: "misconfig.version_disclosure",
      title: "Server software version disclosed",
      severity: "low",
      description: "Revealing exact software versions helps attackers look up known vulnerabilities.",
      evidence: disclosed.map(([h, v]) => `${h}: ${v}`).join("; "),
      remediation: "Configure the web server/framework to hide version numbers (e.g. server_tokens off in nginx, remove X-Powered-By).",
      confidence: "high",
      status: "failed",
    });
  } else {
    findings.push({
      check_key: "misconfig.version_disclosure",
      title: "No software version numbers disclosed",
      severity: "info",
      description: "Server and X-Powered-By headers did not reveal version numbers.",
      evidence: `server: ${final.headers.server ?? "(absent)"}`,
      remediation: "No action needed.",
      confidence: "high",
      status: "passed",
    });
  }

  // Clickjacking: protected by X-Frame-Options or CSP frame-ancestors.
  const xfo = final.headers["x-frame-options"];
  const csp = String(final.headers["content-security-policy"] ?? "");
  const framed = !xfo && !/frame-ancestors/i.test(csp);
  findings.push({
    check_key: "misconfig.clickjacking",
    title: framed ? "Page can be embedded in frames (clickjacking)" : "Clickjacking protection present",
    severity: framed ? "low" : "info",
    description: framed
      ? "Other sites can load this page in an invisible frame and trick users into clicking on it."
      : "The page restricts which sites can embed it.",
    evidence: framed ? "Neither X-Frame-Options nor CSP frame-ancestors is set." : `X-Frame-Options: ${xfo ?? "(absent)"}; frame-ancestors in CSP: ${/frame-ancestors/i.test(csp)}`,
    remediation: framed ? "Add: Content-Security-Policy: frame-ancestors 'self' (or X-Frame-Options: DENY)." : "No action needed.",
    confidence: "high",
    status: framed ? "failed" : "passed",
  });

  // Open directory listing is a common, safely detectable misconfiguration.
  if (/<title>\s*Index of \//i.test(final.body)) {
    findings.push({
      check_key: "misconfig.directory_listing",
      title: "Directory listing enabled",
      severity: "medium",
      description: "The server lists the files in a folder, which may expose backups or private files.",
      evidence: 'Page title starts with "Index of /"',
      remediation: "Disable automatic directory indexes (Options -Indexes in Apache, autoindex off in nginx).",
      confidence: "high",
      status: "failed",
    });
  }

  // CORS: allowing any origin together with credentials is a real misconfiguration.
  const acao = final.headers["access-control-allow-origin"];
  if (acao === "*" && String(final.headers["access-control-allow-credentials"]).toLowerCase() === "true") {
    findings.push({
      check_key: "misconfig.cors",
      title: "Overly permissive CORS with credentials",
      severity: "medium",
      description: "The server allows any origin and credentials together, which can expose user data to other sites.",
      evidence: "Access-Control-Allow-Origin: *; Access-Control-Allow-Credentials: true",
      remediation: "Only allow specific trusted origins when credentials are needed.",
      confidence: "medium",
      status: "failed",
    });
  }
  return findings;
}
