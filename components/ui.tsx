/** Small shared display components: severity/status badges and a stat card. */
import type { Severity } from "@/lib/security-checks";

const severityStyle: Record<Severity, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-navy-950",
  medium: "bg-amber-300 text-navy-950",
  low: "bg-sky-300 text-navy-950",
  info: "bg-navy-700 text-ink",
};

export function SeverityBadge({ severity, label }: { severity: Severity; label: string }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${severityStyle[severity]}`}>{label}</span>;
}

const statusStyle: Record<string, string> = {
  completed: "text-teal-strong",
  passed: "text-teal-strong",
  failed: "text-red-300",
  running: "text-amber-300",
  inconclusive: "text-amber-300",
  info: "text-muted",
};

export function StatusText({ status, label }: { status: string; label: string }) {
  const icon = status === "passed" || status === "completed" ? "✓" : status === "failed" ? "✕" : "•";
  return (
    <span className={`font-medium ${statusStyle[status] ?? ""}`}>
      <span aria-hidden>{icon}</span> {label}
    </span>
  );
}

export function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}
