/**
 * Loading a scan with its findings, and generating the PDF report.
 *
 * loadScan:     (supabase client, scan id) → scan + target + findings + the
 *               target's recent scan history, or null. Used by the scan
 *               details page and the report route.
 * buildReport:  (loaded scan, optional logo JPG bytes) → PDF bytes.
 *               Pure function (no network/database), unit-tested.
 *
 * Report layout (A4): cover · contents · executive summary (score gauge, KPIs,
 * priorities) · results overview (charts) · detailed findings · methodology
 * and limitations. Every content page has a frame, header, footer and
 * "Page x of y". All charts are drawn with simple pdf-lib shapes.
 *
 * pdf-lib was chosen because it is pure JavaScript (no headless browser).
 * Its standard fonts only support Latin text, so reports are in English and
 * any other characters are replaced (see docs/decisions.md).
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SEVERITY_ORDER, type Finding, type Severity } from "./security-checks";

export interface LoadedScan {
  id: string;
  status: "running" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  target: { name: string; url: string };
  findings: (Finding & { created_at: string })[];
  // Completed scans of the same target, oldest first, for the trend chart.
  history?: { started_at: string; issues: number }[];
}

export async function loadScan(supabase: SupabaseClient, id: string): Promise<LoadedScan | null> {
  // RLS ensures only the owner's scan (and its findings) can be returned.
  const { data } = await supabase
    .from("scans")
    .select("id, target_id, status, started_at, completed_at, error_message, target:targets(name, url), findings(*)")
    .eq("id", id)
    .single();
  if (!data) return null;
  const scan = data as unknown as LoadedScan & { target_id: string };
  scan.findings.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

  // Last 8 completed scans of this target (up to this one) for the trend chart.
  const { data: past } = await supabase
    .from("scans")
    .select("started_at, findings(status)")
    .eq("target_id", scan.target_id)
    .eq("status", "completed")
    .lte("started_at", scan.started_at)
    .order("started_at", { ascending: false })
    .limit(8);
  scan.history = (past ?? [])
    .map((s) => ({ started_at: s.started_at, issues: s.findings.filter((f: { status: string }) => f.status === "failed").length }))
    .reverse();
  return scan;
}

// ---------------------------------------------------------------------------
// Scoring. Simple, explainable rule: start at 100 and subtract points for
// each failed check by severity. It only reflects the checks HISN performs.
// ---------------------------------------------------------------------------
const PENALTY: Record<Severity, number> = { critical: 25, high: 15, medium: 8, low: 3, info: 0 };

export function securityScore(findings: Finding[]): { score: number; grade: string; label: string } {
  let score = 100;
  for (const f of findings) if (f.status === "failed") score -= PENALTY[f.severity];
  return gradeFor(Math.max(0, score));
}

/** Grade and risk label for a 0-100 score (also used for the dashboard average). */
export function gradeFor(score: number): { score: number; grade: string; label: string } {
  if (score >= 90) return { score, grade: "A", label: "Low risk" };
  if (score >= 80) return { score, grade: "B", label: "Guarded" };
  if (score >= 65) return { score, grade: "C", label: "Moderate risk" };
  if (score >= 50) return { score, grade: "D", label: "Elevated risk" };
  return { score, grade: "F", label: "High risk" };
}

// Check groups, shown in the category chart and the methodology table.
const CATEGORIES = [
  { prefix: ["https.", "tls."], name: "Transport security (HTTPS/TLS)", tests: "HTTPS in use, HTTP to HTTPS redirect, certificate trust and expiry" },
  { prefix: ["header."], name: "Security headers", tests: "CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy" },
  { prefix: ["cookies."], name: "Cookie security", tests: "Secure, HttpOnly and SameSite attributes of observed cookies" },
  { prefix: ["misconfig."], name: "Configuration", tests: "Version disclosure, clickjacking protection, directory listing, permissive CORS" },
];

const LIMITATIONS = [
  "This is a basic, non-intrusive assessment of one URL using normal HTTP GET requests.",
  "It checks HTTPS/TLS, security headers, cookie attributes and simple misconfigurations only.",
  "It does not test application logic, authentication, injection flaws or pages behind login.",
  "The security score reflects only these checks. No findings does not mean the website is completely secure.",
  "Results describe the target at the time of the scan; configuration may change afterwards.",
];

// ---------------------------------------------------------------------------
// Design tokens (same brand colours as the website).
// ---------------------------------------------------------------------------
const hex = (h: string): RGB => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const C = {
  navy: hex("#0b1426"),
  navy2: hex("#12203a"),
  teal: hex("#2bb3a3"),
  cyan: hex("#22d3ee"),
  ink: hex("#1a2233"),
  muted: hex("#5b6678"),
  line: hex("#d9dee7"),
  soft: hex("#f3f6f9"),
  white: rgb(1, 1, 1),
  passed: hex("#2e7d32"),
};
const SEV_COLOR: Record<Severity, RGB> = {
  critical: hex("#b71c1c"),
  high: hex("#e65100"),
  medium: hex("#f9a825"),
  low: hex("#1e88e5"),
  info: hex("#78909c"),
};
const STATUS_COLOR: Record<Finding["status"], RGB> = {
  failed: hex("#d84315"),
  passed: C.passed,
  info: hex("#78909c"),
  inconclusive: hex("#f9a825"),
};

const W = 595; // A4 width in points
const H = 842; // A4 height
const M = 48; // page margin
const CONTENT_W = W - M * 2;

// Standard PDF fonts use WinAnsi encoding; replace anything else so drawing never fails.
function clean(text: string): string {
  return text.replace(/→/g, "->").replace(/[—–]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of clean(text).split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

const formatDate = (iso: string | null) => (iso ? new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC" : "-");

export async function buildReport(scan: LoadedScan, logoJpg?: Uint8Array): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(clean(`HISN Security Assessment - ${scan.target.name}`));
  pdf.setAuthor("HISN");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  let logo: PDFImage | null = null;
  if (logoJpg) {
    try {
      logo = await pdf.embedJpg(logoJpg);
    } catch {
      logo = null; // the report still works without the logo
    }
  }

  const failed = scan.findings.filter((f) => f.status === "failed");
  const count = (list: Finding[], sev: Severity) => list.filter((f) => f.severity === sev).length;
  const { score, grade, label } = securityScore(scan.findings);
  const completed = scan.status === "completed";

  // Small drawing helpers (y is measured from the bottom in PDF).
  const text = (page: PDFPage, s: string, x: number, y: number, size = 10, f: PDFFont = font, color: RGB = C.ink) =>
    page.drawText(clean(s), { x, y, size, font: f, color });
  const textRight = (page: PDFPage, s: string, right: number, y: number, size = 10, f: PDFFont = font, color: RGB = C.ink) =>
    text(page, s, right - f.widthOfTextAtSize(clean(s), size), y, size, f, color);
  const textCenter = (page: PDFPage, s: string, cx: number, y: number, size = 10, f: PDFFont = font, color: RGB = C.ink) =>
    text(page, s, cx - f.widthOfTextAtSize(clean(s), size) / 2, y, size, f, color);
  const box = (page: PDFPage, x: number, y: number, w: number, h: number, color: RGB, border?: RGB) =>
    page.drawRectangle({ x, y, width: w, height: h, color, borderColor: border, borderWidth: border ? 0.75 : 0 });
  const pill = (page: PDFPage, s: string, x: number, y: number, color: RGB, textColor: RGB = C.white) => {
    const w = bold.widthOfTextAtSize(clean(s), 7.5) + 12;
    box(page, x, y - 3, w, 13, color);
    text(page, s, x + 6, y + 0.5, 7.5, bold, textColor);
    return w;
  };

  // ---------------- Page frame for content pages ----------------
  const contentPages: PDFPage[] = [];
  const newPage = (section: string) => {
    const page = pdf.addPage([W, H]);
    contentPages.push(page);
    // thin brand frame
    page.drawRectangle({ x: 20, y: 20, width: W - 40, height: H - 40, borderColor: C.line, borderWidth: 0.75 });
    // header band
    box(page, 20, H - 62, W - 40, 42, C.navy);
    box(page, 20, H - 64, W - 40, 2, C.teal);
    if (logo) page.drawImage(logo, { x: M - 6, y: H - 57, width: 32, height: 32 * (logo.height / logo.width) });
    text(page, "HISN", M + 32, H - 40, 12, bold, C.white);
    text(page, "Web Security Assessment", M + 32, H - 52, 7.5, font, C.cyan);
    textRight(page, section.toUpperCase(), W - M, H - 46, 8, bold, C.white);
    // footer
    page.drawLine({ start: { x: M, y: 46 }, end: { x: W - M, y: 46 }, thickness: 0.5, color: C.line });
    text(page, `CONFIDENTIAL  |  ${scan.target.url}  |  Scan ${scan.id.slice(0, 8)}`, M, 34, 7, font, C.muted);
    return page;
  };

  const sectionTitle = (page: PDFPage, title: string, y: number, subtitle?: string) => {
    box(page, M, y - 4, 4, 22, C.teal);
    text(page, title, M + 12, y, 18, bold, C.navy);
    if (subtitle) {
      let yy = y - 20;
      for (const l of wrap(subtitle, font, 9, CONTENT_W)) {
        text(page, l, M, yy, 9, font, C.muted);
        yy -= 12;
      }
      return yy - 8;
    }
    return y - 30;
  };

  // ======================= 1. COVER =======================
  const cover = pdf.addPage([W, H]);
  box(cover, 0, 0, W, H, C.navy);
  box(cover, 0, H - 8, W, 8, C.teal);
  // decorative geometric grid (subtle)
  for (let i = 0; i < 9; i++) {
    cover.drawLine({ start: { x: W - 220 + i * 26, y: H - 8 }, end: { x: W, y: H - 228 - i * 26 }, thickness: 0.5, color: C.navy2 });
  }
  if (logo) {
    const lw = 150;
    cover.drawImage(logo, { x: M, y: H - 230, width: lw, height: lw * (logo.height / logo.width) });
  } else {
    text(cover, "HISN", M, H - 150, 48, bold, C.white);
  }
  text(cover, "WEB SECURITY", M, H - 330, 34, bold, C.white);
  text(cover, "ASSESSMENT REPORT", M, H - 368, 34, bold, C.cyan);
  box(cover, M, H - 392, 80, 3, C.teal);

  const coverRows: [string, string][] = [
    ["Target", scan.target.name],
    ["URL", scan.target.url],
    ["Scan ID", scan.id],
    ["Scan status", scan.status.toUpperCase()],
    ["Started", formatDate(scan.started_at)],
    ["Report date", formatDate(new Date().toISOString())],
  ];
  let cy = H - 440;
  for (const [k, v] of coverRows) {
    text(cover, k.toUpperCase(), M, cy, 8, bold, C.teal);
    text(cover, v.length > 70 ? v.slice(0, 70) + "..." : v, M + 100, cy, 10, font, C.white);
    cy -= 22;
  }
  if (completed) {
    // score badge on the cover
    box(cover, W - M - 150, H - 470, 150, 70, C.navy2, C.teal);
    text(cover, "SECURITY SCORE", W - M - 138, H - 420, 8, bold, C.teal);
    text(cover, `${score}`, W - M - 138, H - 455, 30, bold, C.white);
    text(cover, `/100  Grade ${grade}`, W - M - 138 + bold.widthOfTextAtSize(`${score}`, 30) + 6, H - 455, 10, font, C.cyan);
  }
  box(cover, M, 70, CONTENT_W, 0.75, C.navy2);
  text(cover, "CONFIDENTIAL", M, 52, 9, bold, C.cyan);
  text(cover, "Prepared by HISN - Computing Diploma graduation project. For the website owner only.", M, 38, 8, font, hex("#9fb0c8"));

  // ======================= 2. CONTENTS (filled at the end) =======================
  const tocPage = newPage("Contents");
  const sections: { title: string; page: number }[] = [];
  const startSection = (title: string) => {
    const page = newPage(title);
    sections.push({ title, page: pdf.getPageCount() });
    return page;
  };

  // ======================= 3. EXECUTIVE SUMMARY =======================
  let page = startSection("Executive summary");
  let y = sectionTitle(
    page,
    "Executive Summary",
    H - 110,
    "This report presents the results of an automated, non-intrusive security assessment. Findings are based only on evidence observed in the target's responses.",
  );

  if (!completed) {
    box(page, M, y - 90, CONTENT_W, 90, hex("#fff4f0"), STATUS_COLOR.failed);
    text(page, scan.status === "failed" ? "The scan did not complete" : "The scan is still running", M + 16, y - 26, 14, bold, STATUS_COLOR.failed);
    let yy = y - 46;
    const reason =
      scan.status === "failed"
        ? `No security conclusions can be drawn from this scan. A failed scan is not a vulnerability. Reason: ${scan.error_message ?? "unknown"}`
        : "Generate the report again when the scan has finished.";
    for (const l of wrap(reason, font, 10, CONTENT_W - 32)) {
      text(page, l, M + 16, yy, 10);
      yy -= 14;
    }
    y -= 120;
  } else {
    // --- Score gauge (semicircle) ---
    const gx = M + 110;
    const gy = y - 130;
    const r = 85;
    const arc = (from: number, to: number, color: RGB, width: number) => {
      // draw the arc as many short line segments (simple and reliable)
      const steps = 40;
      for (let i = 0; i < steps; i++) {
        const a1 = Math.PI - (from + ((to - from) * i) / steps) * Math.PI;
        const a2 = Math.PI - (from + ((to - from) * (i + 1)) / steps) * Math.PI;
        page.drawLine({
          start: { x: gx + r * Math.cos(a1), y: gy + r * Math.sin(a1) },
          end: { x: gx + r * Math.cos(a2), y: gy + r * Math.sin(a2) },
          thickness: width,
          color,
        });
      }
    };
    arc(0, 1, C.soft, 16);
    arc(0, 0.5, hex("#fde0dc"), 16);
    arc(0.5, 0.65, hex("#fff3d6"), 16);
    arc(0.65, 0.9, hex("#e0f2f1"), 16);
    arc(0.9, 1, hex("#d7f5ea"), 16);
    const scoreColor = score >= 80 ? C.passed : score >= 65 ? SEV_COLOR.medium : score >= 50 ? SEV_COLOR.high : SEV_COLOR.critical;
    arc(0, score / 100, scoreColor, 9);
    // needle
    const na = Math.PI - (score / 100) * Math.PI;
    page.drawLine({ start: { x: gx, y: gy }, end: { x: gx + (r - 22) * Math.cos(na), y: gy + (r - 22) * Math.sin(na) }, thickness: 2.5, color: C.navy });
    page.drawCircle({ x: gx, y: gy, size: 6, color: C.navy });
    textCenter(page, `${score}`, gx, gy - 34, 30, bold, C.navy);
    textCenter(page, `Grade ${grade}  -  ${label}`, gx, gy - 50, 10, bold, scoreColor);
    text(page, "0", gx - r - 4, gy - 14, 7, font, C.muted);
    textRight(page, "100", gx + r + 6, gy - 14, 7, font, C.muted);

    // --- KPI tiles ---
    const kx = M + 250;
    const kpis: [string, number, RGB][] = [
      ["Issues found", failed.length, STATUS_COLOR.failed],
      ["Checks passed", scan.findings.filter((f) => f.status === "passed").length, C.passed],
      ["Informational", scan.findings.filter((f) => f.status === "info").length, STATUS_COLOR.info],
      ["Inconclusive", scan.findings.filter((f) => f.status === "inconclusive").length, STATUS_COLOR.inconclusive],
    ];
    kpis.forEach(([name, value, color], i) => {
      const x = kx + (i % 2) * 125;
      const ty = y - 60 - Math.floor(i / 2) * 72;
      box(page, x, ty, 115, 62, C.soft);
      box(page, x, ty, 3, 62, color);
      text(page, `${value}`, x + 14, ty + 26, 24, bold, C.navy);
      text(page, name.toUpperCase(), x + 14, ty + 10, 7, bold, C.muted);
    });
    y -= 210;

    // --- Severity strip ---
    text(page, "ISSUES BY SEVERITY", M, y, 8, bold, C.muted);
    y -= 14;
    const sevs: Severity[] = ["critical", "high", "medium", "low"];
    const tileW = (CONTENT_W - 18) / 4;
    sevs.forEach((sev, i) => {
      const x = M + i * (tileW + 6);
      box(page, x, y - 40, tileW, 40, SEV_COLOR[sev]);
      text(page, `${count(failed, sev)}`, x + 12, y - 27, 18, bold, sev === "medium" ? C.navy : C.white);
      textRight(page, sev.toUpperCase(), x + tileW - 10, y - 24, 8, bold, sev === "medium" ? C.navy : C.white);
    });
    y -= 64;

    // --- Narrative ---
    const top = failed[0];
    const narrative =
      failed.length === 0
        ? `No issues were detected by the ${scan.findings.length} checks performed on ${scan.target.url}. This does not prove the website is completely secure; it means the implemented checks found no weaknesses.`
        : `The assessment of ${scan.target.url} performed ${scan.findings.length} checks and detected ${failed.length} issue(s): ` +
          `${count(failed, "high")} high, ${count(failed, "medium")} medium and ${count(failed, "low")} low severity. ` +
          `The most important item to address first is "${top.title}". Applying the remediation steps in this report would raise the security score.`;
    text(page, "ASSESSMENT OVERVIEW", M, y, 8, bold, C.muted);
    y -= 16;
    for (const l of wrap(narrative, font, 10, CONTENT_W)) {
      text(page, l, M, y, 10);
      y -= 14;
    }
    y -= 14;

    // --- Priority actions table ---
    if (failed.length > 0) {
      text(page, "PRIORITY ACTIONS", M, y, 8, bold, C.muted);
      y -= 10;
      box(page, M, y - 18, CONTENT_W, 18, C.navy);
      text(page, "#", M + 8, y - 12, 8, bold, C.white);
      text(page, "SEVERITY", M + 26, y - 12, 8, bold, C.white);
      text(page, "ISSUE", M + 100, y - 12, 8, bold, C.white);
      y -= 18;
      failed.slice(0, 6).forEach((f, i) => {
        box(page, M, y - 20, CONTENT_W, 20, i % 2 ? C.white : C.soft);
        text(page, `${i + 1}`, M + 8, y - 13, 9, bold, C.navy);
        pill(page, f.severity.toUpperCase(), M + 26, y - 13, SEV_COLOR[f.severity], f.severity === "medium" ? C.navy : C.white);
        const t = wrap(f.title, font, 9, CONTENT_W - 110)[0];
        text(page, t, M + 100, y - 13, 9);
        y -= 20;
      });
    }
  }

  // ======================= 4. RESULTS OVERVIEW (charts) =======================
  if (completed) {
    page = startSection("Results overview");
    y = sectionTitle(page, "Results Overview", H - 110, "Visual breakdown of all results: issue severity, outcome of each check, results per category, and the trend across recent scans of this target.");

    // --- Chart A: horizontal bar chart, issues by severity ---
    const chartW = CONTENT_W / 2 - 12;
    text(page, "ISSUES BY SEVERITY", M, y, 8, bold, C.muted);
    const maxSev = Math.max(1, ...SEVERITY_ORDER.map((s) => count(failed, s)));
    let by = y - 22;
    for (const sev of SEVERITY_ORDER.filter((s) => s !== "info")) {
      const n = count(failed, sev);
      text(page, sev[0].toUpperCase() + sev.slice(1), M, by, 8.5);
      box(page, M + 55, by - 3, chartW - 80, 12, C.soft);
      if (n > 0) box(page, M + 55, by - 3, ((chartW - 80) * n) / maxSev, 12, SEV_COLOR[sev]);
      textRight(page, `${n}`, M + chartW, by, 9, bold, C.navy);
      by -= 24;
    }

    // --- Chart B: donut, outcome of all checks ---
    const dx = M + CONTENT_W * 0.75;
    const dy = y - 62;
    text(page, "CHECK OUTCOMES", M + CONTENT_W / 2 + 12, y, 8, bold, C.muted);
    const statuses: Finding["status"][] = ["failed", "passed", "info", "inconclusive"];
    const total = Math.max(1, scan.findings.length);
    let start = 0;
    for (const st of statuses) {
      const share = scan.findings.filter((f) => f.status === st).length / total;
      const steps = Math.max(1, Math.round(share * 120));
      for (let i = 0; i < steps; i++) {
        const a1 = Math.PI / 2 - 2 * Math.PI * (start + (share * i) / steps);
        const a2 = Math.PI / 2 - 2 * Math.PI * (start + (share * (i + 1)) / steps);
        if (share === 0) break;
        page.drawLine({ start: { x: dx + 38 * Math.cos(a1), y: dy + 38 * Math.sin(a1) }, end: { x: dx + 38 * Math.cos(a2), y: dy + 38 * Math.sin(a2) }, thickness: 16, color: STATUS_COLOR[st] });
      }
      start += share;
    }
    textCenter(page, `${scan.findings.length}`, dx, dy - 4, 16, bold, C.navy);
    textCenter(page, "checks", dx, dy - 15, 7, font, C.muted);
    let ly = y - 24;
    for (const st of statuses) {
      box(page, M + CONTENT_W / 2 + 12, ly - 1, 8, 8, STATUS_COLOR[st]);
      text(page, `${st[0].toUpperCase() + st.slice(1)} (${scan.findings.filter((f) => f.status === st).length})`, M + CONTENT_W / 2 + 24, ly, 8);
      ly -= 16;
    }
    y -= 140;

    // --- Chart C: category table with stacked pass/fail bars ---
    text(page, "RESULTS BY CATEGORY", M, y, 8, bold, C.muted);
    y -= 10;
    box(page, M, y - 18, CONTENT_W, 18, C.navy);
    text(page, "CATEGORY", M + 8, y - 12, 8, bold, C.white);
    text(page, "CHECKS", M + 200, y - 12, 8, bold, C.white);
    text(page, "ISSUES", M + 250, y - 12, 8, bold, C.white);
    text(page, "DISTRIBUTION", M + 300, y - 12, 8, bold, C.white);
    y -= 18;
    CATEGORIES.forEach((cat, i) => {
      const list = scan.findings.filter((f) => cat.prefix.some((p) => f.check_key.startsWith(p)));
      const bad = list.filter((f) => f.status === "failed").length;
      box(page, M, y - 24, CONTENT_W, 24, i % 2 ? C.white : C.soft);
      text(page, cat.name, M + 8, y - 15, 9, bold, C.navy);
      text(page, `${list.length}`, M + 210, y - 15, 9);
      text(page, `${bad}`, M + 260, y - 15, 9, bold, bad ? STATUS_COLOR.failed : C.passed);
      const barW = CONTENT_W - 310;
      let bx = M + 300;
      for (const st of statuses) {
        const n = list.filter((f) => f.status === st).length;
        if (!n || !list.length) continue;
        const w = (barW * n) / list.length;
        box(page, bx, y - 17, w, 10, STATUS_COLOR[st]);
        bx += w;
      }
      y -= 24;
    });
    y -= 28;

    // --- Chart D: trend line across recent scans ---
    text(page, "ISSUES TREND (RECENT SCANS OF THIS TARGET)", M, y, 8, bold, C.muted);
    const hist = scan.history ?? [];
    const ch = 130;
    const top = y - 12;
    box(page, M, top - ch, CONTENT_W, ch, C.soft);
    if (hist.length < 2) {
      textCenter(page, "Run more scans of this target to see a trend over time.", M + CONTENT_W / 2, top - ch / 2, 9, font, C.muted);
    } else {
      const maxI = Math.max(1, ...hist.map((h) => h.issues));
      const px = (i: number) => M + 30 + (i * (CONTENT_W - 60)) / (hist.length - 1);
      const py = (v: number) => top - ch + 22 + ((ch - 44) * v) / maxI;
      for (let g = 0; g <= 4; g++) {
        const gy2 = top - ch + 22 + ((ch - 44) * g) / 4;
        page.drawLine({ start: { x: M + 20, y: gy2 }, end: { x: M + CONTENT_W - 20, y: gy2 }, thickness: 0.4, color: C.line });
      }
      for (let i = 1; i < hist.length; i++) {
        page.drawLine({ start: { x: px(i - 1), y: py(hist[i - 1].issues) }, end: { x: px(i), y: py(hist[i].issues) }, thickness: 2, color: C.teal });
      }
      hist.forEach((h, i) => {
        page.drawCircle({ x: px(i), y: py(h.issues), size: 3.5, color: i === hist.length - 1 ? C.navy : C.teal });
        textCenter(page, `${h.issues}`, px(i), py(h.issues) + 7, 8, bold, C.navy);
        textCenter(page, h.started_at.slice(5, 10), px(i), top - ch + 8, 7, font, C.muted);
      });
    }
  }

  // ======================= 5. DETAILED FINDINGS =======================
  if (completed) {
    page = startSection("Detailed findings");
    y = sectionTitle(page, "Detailed Findings", H - 110, "Every check is listed, ordered by severity. Evidence is the raw data observed in the response; cookie values are never recorded.");
    const cardPad = 12;
    const innerW = CONTENT_W - cardPad * 2 - 6;
    let n = 0;
    for (const sev of SEVERITY_ORDER) {
      const group = scan.findings.filter((f) => f.severity === sev);
      if (group.length === 0) continue;
      // Keep the severity heading together with its first card (no orphans).
      if (y < 230) {
        page = newPage("Detailed findings");
        y = H - 100;
      }
      box(page, M, y - 6, CONTENT_W, 22, SEV_COLOR[sev]);
      text(page, `${sev.toUpperCase()}  (${group.length})`, M + 10, y + 1, 10, bold, sev === "medium" ? C.navy : C.white);
      y -= 30;
      for (const f of group) {
        n++;
        const desc = wrap(f.description, font, 9, innerW);
        const ev = wrap(f.evidence, mono, 7.5, innerW - 12);
        const fix = wrap(`Remediation: ${f.remediation}`, font, 9, innerW);
        const cardH = 34 + desc.length * 12 + 12 + ev.length * 10 + 10 + fix.length * 12 + 10;
        if (y - cardH < 60) {
          page = newPage("Detailed findings");
          y = H - 100;
        }
        const top = y;
        box(page, M, top - cardH, CONTENT_W, cardH, C.white, C.line);
        box(page, M, top - cardH, 5, cardH, SEV_COLOR[f.severity]);
        let yy = top - 18;
        const x0 = M + cardPad + 6;
        text(page, `${n}. ${wrap(f.title, bold, 11, innerW - 150)[0]}`, x0, yy, 11, bold, C.navy);
        let px = W - M - cardPad;
        for (const [label, color] of [
          [`CONFIDENCE ${f.confidence.toUpperCase()}`, C.navy2],
          [f.status.toUpperCase(), STATUS_COLOR[f.status]],
        ] as [string, RGB][]) {
          const w = bold.widthOfTextAtSize(label, 7.5) + 12;
          px -= w;
          pill(page, label, px, yy, color);
          px -= 4;
        }
        yy -= 16;
        for (const l of desc) {
          text(page, l, x0, yy, 9, font, C.ink);
          yy -= 12;
        }
        yy -= 2;
        box(page, x0, yy - ev.length * 10 - 2, innerW, ev.length * 10 + 10, C.soft);
        for (const l of ev) {
          text(page, l, x0 + 6, yy - 4, 7.5, mono, C.navy2);
          yy -= 10;
        }
        yy -= 16;
        for (const l of fix) {
          text(page, l, x0, yy, 9, font, C.passed);
          yy -= 12;
        }
        text(page, f.check_key, W - M - cardPad - font.widthOfTextAtSize(f.check_key, 7), top - cardH + 6, 7, font, C.muted);
        y = top - cardH - 10;
      }
      y -= 6;
    }
  }

  // ======================= 6. METHODOLOGY & LIMITATIONS =======================
  page = startSection("Methodology");
  y = sectionTitle(page, "Methodology & Limitations", H - 110, "How the assessment was performed and what it does not cover.");
  const steps = [
    "The URL is validated: only http/https on default ports; private, loopback and cloud-metadata addresses are refused.",
    "Every DNS answer is checked and the connection is made to the verified address (DNS-rebinding protection).",
    "Up to 5 redirects are followed, each one validated again. Requests time out after 8 s; the scan after 30 s.",
    "The response headers, cookies and TLS certificate are analysed by the checks below. Nothing is attacked or modified.",
  ];
  steps.forEach((s, i) => {
    page.drawCircle({ x: M + 9, y: y + 3, size: 9, color: C.teal });
    textCenter(page, `${i + 1}`, M + 9, y, 9, bold, C.white);
    let yy = y;
    for (const l of wrap(s, font, 9.5, CONTENT_W - 30)) {
      text(page, l, M + 28, yy, 9.5);
      yy -= 13;
    }
    y = yy - 8;
  });
  y -= 6;
  box(page, M, y - 18, CONTENT_W, 18, C.navy);
  text(page, "CHECK CATEGORY", M + 8, y - 12, 8, bold, C.white);
  text(page, "WHAT IS TESTED", M + 190, y - 12, 8, bold, C.white);
  y -= 18;
  CATEGORIES.forEach((cat, i) => {
    const lines = wrap(cat.tests, font, 8.5, CONTENT_W - 200);
    const rh = lines.length * 11 + 10;
    box(page, M, y - rh, CONTENT_W, rh, i % 2 ? C.white : C.soft);
    text(page, cat.name, M + 8, y - 14, 8.5, bold, C.navy);
    lines.forEach((l, j) => text(page, l, M + 190, y - 14 - j * 11, 8.5));
    y -= rh;
  });
  y -= 22;
  text(page, "SCORING", M, y, 8, bold, C.muted);
  y -= 14;
  for (const l of wrap("The score starts at 100. Each failed check subtracts points by severity: critical 25, high 15, medium 8, low 3. Grades: A 90+, B 80+, C 65+, D 50+, F below 50.", font, 9.5, CONTENT_W)) {
    text(page, l, M, y, 9.5);
    y -= 13;
  }
  y -= 14;
  box(page, M, y - (LIMITATIONS.length * 15 + 26), CONTENT_W, LIMITATIONS.length * 15 + 26, hex("#fff8e6"), SEV_COLOR.medium);
  text(page, "KNOWN LIMITATIONS", M + 12, y - 16, 8, bold, hex("#8a6100"));
  let yy = y - 32;
  for (const l of LIMITATIONS) {
    text(page, `-  ${l}`, M + 12, yy, 8.5);
    yy -= 15;
  }

  // ======================= Fill contents page + page numbers =======================
  let ty = sectionTitle(tocPage, "Contents", H - 110);
  ty -= 10;
  sections.forEach((s, i) => {
    text(tocPage, `${String(i + 1).padStart(2, "0")}`, M, ty, 14, bold, C.teal);
    text(tocPage, s.title, M + 34, ty, 13, bold, C.navy);
    const dotsStart = M + 40 + bold.widthOfTextAtSize(s.title, 13);
    for (let dx = dotsStart; dx < W - M - 30; dx += 6) tocPage.drawCircle({ x: dx, y: ty + 3, size: 0.6, color: C.line });
    textRight(tocPage, `${s.page}`, W - M, ty, 12, bold, C.navy);
    ty -= 34;
  });
  ty -= 10;
  box(tocPage, M, ty - 86, CONTENT_W, 86, C.soft);
  text(tocPage, "ABOUT THIS REPORT", M + 14, ty - 20, 8, bold, C.muted);
  let ay = ty - 38;
  for (const l of wrap(`Automated assessment of ${scan.target.url} generated by HISN on ${formatDate(new Date().toISOString())}. The report contains only results stored in the HISN database for scan ${scan.id}. Treat it as confidential: it describes weaknesses of the website.`, font, 9, CONTENT_W - 28)) {
    text(tocPage, l, M + 14, ay, 9);
    ay -= 12;
  }

  const totalPages = pdf.getPageCount();
  contentPages.forEach((p) => {
    const index = pdf.getPages().indexOf(p) + 1;
    textRight(p, `Page ${index} of ${totalPages}`, W - M, 34, 7.5, bold, C.navy);
  });

  return pdf.save();
}
