/**
 * Loading a scan with its findings, and generating the PDF report.
 *
 * loadScan:     (supabase client, scan id) → scan + target + findings, or null.
 *               Used by the scan details page and the report route.
 * buildReport:  (loaded scan) → PDF bytes. Pure function, unit-tested.
 *
 * pdf-lib was chosen because it is pure JavaScript (no headless browser).
 * Its standard fonts only support Latin text, so reports are in English and
 * any other characters are replaced (see docs/decisions.md).
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SEVERITY_ORDER, type Finding } from "./security-checks";

export interface LoadedScan {
  id: string;
  status: "running" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  target: { name: string; url: string };
  findings: (Finding & { created_at: string })[];
}

export async function loadScan(supabase: SupabaseClient, id: string): Promise<LoadedScan | null> {
  // RLS ensures only the owner's scan (and its findings) can be returned.
  const { data } = await supabase
    .from("scans")
    .select("id, status, started_at, completed_at, error_message, target:targets(name, url), findings(*)")
    .eq("id", id)
    .single();
  if (!data) return null;
  const scan = data as unknown as LoadedScan;
  scan.findings.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
  return scan;
}

const LIMITATIONS = [
  "This is a basic, non-intrusive assessment of one URL using normal HTTP GET requests.",
  "It checks HTTPS/TLS, security headers, cookie attributes and simple misconfigurations only.",
  "It does not test application logic, authentication, injection flaws or pages behind login.",
  "No findings does not mean the website is completely secure.",
];

// Standard PDF fonts use WinAnsi encoding; replace anything else so drawing never fails.
function clean(text: string): string {
  return text.replace(/→/g, "->").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

export async function buildReport(scan: LoadedScan): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  const width = 595 - margin * 2; // A4 width in points
  let page: PDFPage = pdf.addPage([595, 842]);
  let y = 842 - margin;

  // Writes wrapped text and starts a new page when the current one is full.
  const write = (text: string, size = 10, f: PDFFont = font, color = rgb(0.1, 0.1, 0.15)) => {
    const words = clean(text).split(/\s+/);
    let line = "";
    const lines: string[] = [];
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(next, size) > width && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
    for (const l of lines) {
      if (y < margin + size) {
        page = pdf.addPage([595, 842]);
        y = 842 - margin;
      }
      page.drawText(l, { x: margin, y, size, font: f, color });
      y -= size * 1.4;
    }
  };
  const gap = (h = 8) => (y -= h);

  write("HISN - Web Security Assessment Report", 18, bold, rgb(0.04, 0.08, 0.15));
  gap();
  write(`Report date: ${new Date().toISOString().slice(0, 10)}`);
  write(`Target: ${scan.target.name} (${scan.target.url})`);
  write(`Scan ID: ${scan.id}`);
  write(`Scan status: ${scan.status}`);
  write(`Started: ${scan.started_at}   Completed: ${scan.completed_at ?? "-"}`);
  gap(12);

  if (scan.status !== "completed") {
    write("Scan did not complete", 14, bold);
    write(
      scan.status === "failed"
        ? `The scan failed, so no security conclusions can be drawn. Reason: ${scan.error_message ?? "unknown"}`
        : "The scan is still running. Generate the report again when it has finished.",
    );
  } else {
    const failed = scan.findings.filter((f) => f.status === "failed");
    write("Summary of checks", 14, bold);
    write(
      `${scan.findings.length} results: ${failed.length} issues, ` +
        `${scan.findings.filter((f) => f.status === "passed").length} passed, ` +
        `${scan.findings.filter((f) => f.status === "info").length} informational, ` +
        `${scan.findings.filter((f) => f.status === "inconclusive").length} inconclusive.`,
    );
    write(`Issues by severity: ${SEVERITY_ORDER.map((s) => `${s} ${failed.filter((f) => f.severity === s).length}`).join(", ")}`);
    gap(12);

    for (const severity of SEVERITY_ORDER) {
      const group = scan.findings.filter((f) => f.severity === severity);
      if (group.length === 0) continue;
      write(`${severity.toUpperCase()} (${group.length})`, 13, bold, rgb(0.05, 0.4, 0.38));
      gap(4);
      for (const f of group) {
        write(`[${f.status.toUpperCase()}] ${f.title}`, 11, bold);
        write(f.description);
        write(`Evidence: ${f.evidence}`, 9);
        write(`Remediation: ${f.remediation}`, 9);
        write(`Confidence: ${f.confidence}   Check: ${f.check_key}`, 8, font, rgb(0.4, 0.4, 0.45));
        gap(8);
      }
    }
  }

  gap(8);
  write("Assessment limitations", 14, bold);
  for (const l of LIMITATIONS) write(`- ${l}`, 9);
  return pdf.save();
}
