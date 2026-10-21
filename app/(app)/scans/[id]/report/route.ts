/** GET /scans/:id/report — downloads the PDF report built from saved results. */
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { buildReport, loadScan } from "@/lib/reports";
import { uuidSchema } from "@/lib/validation";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabaseConfigured || !uuidSchema.safeParse(id).success) return new Response("Not found", { status: 404 });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return new Response("Unauthorized", { status: 401 });

  const scan = await loadScan(supabase, id);
  if (!scan) return new Response("Not found", { status: 404 });
  // The logo is optional: if the file is missing the report is still built.
  const logo = await readFile(path.join(process.cwd(), "public/images/hisn-logo.jpg")).catch(() => undefined);
  const pdf = await buildReport(scan, logo);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="hisn-report-${id.slice(0, 8)}.pdf"`,
      "Cache-Control": "private, no-store", // private results must never be cached
    },
  });
}
