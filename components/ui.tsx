/** Small shared display components: badges, stat cards, score ring, page header. */
import type { Severity } from "@/lib/security-checks";
import CountUp from "./CountUp";

const severityStyle: Record<Severity, string> = {
  critical: "bg-red-600 text-white ring-red-400/40",
  high: "bg-orange-500 text-navy-950 ring-orange-300/40",
  medium: "bg-amber-300 text-navy-950 ring-amber-200/40",
  low: "bg-sky-300 text-navy-950 ring-sky-200/40",
  info: "bg-navy-700 text-ink ring-navy-700",
};

export function SeverityBadge({ severity, label }: { severity: Severity; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${severityStyle[severity]}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
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
    <span className={`inline-flex items-center gap-1.5 font-medium ${statusStyle[status] ?? ""}`}>
      <span aria-hidden className={status === "running" ? "animate-pulse" : undefined}>
        {icon}
      </span>
      {label}
    </span>
  );
}

/** One dashboard number. `accent` tints the top rule and the figure. */
export function Stat({ label, value, accent = "cyan" }: { label: string; value: number; accent?: "cyan" | "teal" | "red" | "muted" }) {
  const accents = {
    cyan: "from-cyan to-transparent text-ink",
    teal: "from-teal to-transparent text-teal-strong",
    red: "from-red-400 to-transparent text-red-300",
    muted: "from-navy-700 to-transparent text-ink",
  }[accent];
  return (
    <div className="card card-hover relative overflow-hidden">
      <span aria-hidden className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${accents}`} />
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-1 text-3xl font-bold tabular-nums ${accents.split(" ").pop()}`}>
        <CountUp value={value} />
      </div>
    </div>
  );
}

/**
 * Circular security score (0-100), drawn with one SVG circle whose dash offset
 * is animated by CSS. Colour follows the grade, like the PDF report.
 */
export function ScoreRing({ score, grade, label, caption, size = 132 }: { score: number; grade: string; label: string; caption: string; size?: number }) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = score >= 80 ? "var(--color-teal-strong)" : score >= 65 ? "#f9a825" : score >= 50 ? "#fb8c00" : "#ef5350";

  return (
    <figure className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${score} / 100`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-navy-800)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            // Start empty and draw to the real value; CSS keyframes do the motion.
            style={
              {
                "--ring-circumference": `${circumference}`,
                "--ring-offset": `${offset}`,
                strokeDashoffset: offset,
                animation: "draw-ring var(--duration-slow) var(--ease-out-soft) both",
                transform: "rotate(-90deg)",
                transformOrigin: "50% 50%",
              } as React.CSSProperties
            }
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums" style={{ color }}>
            {score}
          </span>
          <span className="text-[0.65rem] tracking-widest text-muted">/ 100</span>
        </div>
      </div>
      <figcaption>
        <div className="text-sm text-muted">{label}</div>
        <div className="text-2xl font-bold" style={{ color }}>
          {grade}
        </div>
        <p className="mt-1 max-w-[18rem] text-sm text-muted">{caption}</p>
      </figcaption>
    </figure>
  );
}

/** Consistent header for inner pages. */
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-navy-800 pb-5">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

/** Friendly empty state with an icon, a sentence and an optional action. */
export function EmptyState({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-navy-700 px-6 py-12 text-center">
      <svg aria-hidden width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className="text-navy-700">
        <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" />
        <path d="M12 9v4m0 3h.01" strokeLinecap="round" />
      </svg>
      <p className="font-semibold text-ink">{title}</p>
      <p className="max-w-sm text-sm text-muted">{text}</p>
      {children}
    </div>
  );
}
