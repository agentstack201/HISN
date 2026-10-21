import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildReport, type LoadedScan } from "@/lib/reports";

const base: LoadedScan = {
  id: "20000000-0000-0000-0000-00000000000a",
  status: "completed",
  started_at: "2026-10-20T10:00:00Z",
  completed_at: "2026-10-20T10:00:05Z",
  error_message: null,
  target: { name: "Demo", url: "https://example.com/" },
  findings: [],
};

const finding = {
  check_key: "header.csp",
  title: "Missing Content-Security-Policy header",
  severity: "medium" as const,
  description: "d",
  evidence: "Header absent → test",
  remediation: "Add a CSP",
  confidence: "high" as const,
  status: "failed" as const,
  created_at: "2026-10-20T10:00:05Z",
};

describe("buildReport", () => {
  it("creates a valid PDF for a completed scan with findings", async () => {
    const bytes = await buildReport({ ...base, findings: Array(40).fill(finding) });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1); // long reports wrap onto new pages
  });
  it("handles failed scans and empty results without crashing", async () => {
    const bytes = await buildReport({ ...base, status: "failed", error_message: "Request timed out" });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    await expect(buildReport(base)).resolves.toBeInstanceOf(Uint8Array);
  });
  it("survives non-Latin text such as Arabic target names", async () => {
    await expect(buildReport({ ...base, target: { name: "موقعي", url: "https://example.com/" } })).resolves.toBeInstanceOf(Uint8Array);
  });
});
