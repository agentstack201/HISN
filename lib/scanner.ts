/**
 * Scan orchestration.
 *
 * Receives: a target URL.
 * Returns:  { status, findings, error } — never throws for network problems.
 * Used by:  app/targets/actions.ts (startScan), which saves the result.
 *
 * A network failure is reported as a FAILED SCAN with an error message,
 * never as a vulnerability finding.
 */
import { checkCookies, checkHeaders, checkHttps, checkMisconfigurations, type Finding } from "./security-checks";
import { safeFetch } from "./targets";

export interface ScanResult {
  status: "completed" | "failed";
  findings: Finding[];
  error: string | null;
}

// Hard limit for a whole scan, in addition to the per-request timeout.
export const SCAN_TIMEOUT_MS = 30_000;

export async function runScan(targetUrl: string): Promise<ScanResult> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<ScanResult>((resolve) => {
    timer = setTimeout(() => resolve({ status: "failed", findings: [], error: "Scan exceeded the 30 second time limit" }), SCAN_TIMEOUT_MS);
  });
  const result = await Promise.race([collectFindings(targetUrl), timeout]);
  clearTimeout(timer);
  return result;
}

async function collectFindings(targetUrl: string): Promise<ScanResult> {
  let hops;
  try {
    hops = await safeFetch(targetUrl);
  } catch (err) {
    return { status: "failed", findings: [], error: err instanceof Error ? err.message : "Unknown network error" };
  }

  // Also try the plain-HTTP version to see whether it redirects to HTTPS.
  let httpHops = null;
  const url = new URL(targetUrl);
  if (url.protocol === "https:") {
    url.protocol = "http:";
    try {
      httpHops = await safeFetch(url.toString());
    } catch {
      httpHops = null; // reported as "inconclusive", not as a vulnerability
    }
  } else {
    httpHops = hops;
  }

  const final = hops[hops.length - 1];
  const findings = [
    ...checkHttps(hops, httpHops),
    ...checkHeaders(final),
    ...checkCookies(hops),
    ...checkMisconfigurations(final),
  ];
  return { status: "completed", findings, error: null };
}
