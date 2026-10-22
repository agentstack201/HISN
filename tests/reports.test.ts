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

describe("securityScore", () => {
  it("starts at 100 and subtracts by severity of failed checks only", async () => {
    const { securityScore } = await import("@/lib/reports");
    expect(securityScore([]).score).toBe(100);
    expect(securityScore([{ ...finding }, { ...finding, status: "passed" as const }])).toMatchObject({ score: 92, grade: "A" });
    expect(securityScore(Array(20).fill({ ...finding, severity: "high" })).score).toBe(0);
  });
  it("grades any 0-100 score with the same thresholds", async () => {
    const { gradeFor } = await import("@/lib/reports");
    expect([95, 85, 70, 55, 20].map((s) => gradeFor(s).grade)).toEqual(["A", "B", "C", "D", "F"]);
  });
});

describe("buildReport", () => {
  it("builds cover, contents, summary, charts, findings and methodology with a trend", async () => {
    const history = [3, 2, 1].map((issues, i) => ({ started_at: `2026-10-1${i}T00:00:00Z`, issues }));
    const pdf = await PDFDocument.load(await buildReport({ ...base, findings: [finding], history }));
    expect(pdf.getPageCount()).toBe(6);
  });
  it("creates a valid PDF for a completed scan with findings", async () => {
    const bytes = await buildReport({ ...base, findings: Array(40).fill(finding) });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1); // long reports wrap onto new pages
  });
  it("handles failed scans and empty results without crashing", async () => {
    const bytes = await buildReport({ ...base, status: "failed", error_message: "Request timed out" });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(4); // cover, contents, summary (failure box), methodology
    await expect(buildReport(base)).resolves.toBeInstanceOf(Uint8Array);
  });
  it("survives non-Latin text such as Arabic target names", async () => {
    await expect(buildReport({ ...base, target: { name: "موقعي", url: "https://example.com/" } })).resolves.toBeInstanceOf(Uint8Array);
  });
});
