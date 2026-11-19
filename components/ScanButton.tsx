"use client";
/**
 * The "start scan" button and the progress panel shown while the scan runs.
 *
 * A scan is a normal form submission that can take up to 30 seconds, so without
 * feedback the page looks frozen. While the server action runs, this shows the
 * checks in order with a moving indicator. The steps are purely visual
 * reassurance; the real results always come from the server.
 */
import { useFormStatus } from "react-dom";
import { useEffect, useState } from "react";

const STEP_MS = 2200;

export default function ScanButton({
  label,
  pendingLabel,
  note,
  steps,
}: {
  label: string;
  pendingLabel: string;
  note: string;
  steps: string[];
}) {
  const { pending } = useFormStatus();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!pending) return setStep(0);
    // Walk through the steps, then hold on the last one until the server answers.
    const id = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), STEP_MS);
    return () => clearInterval(id);
  }, [pending, steps.length]);

  return (
    <>
      <button className="btn-hero min-h-11 px-6 py-2 text-sm" disabled={pending} aria-busy={pending}>
        {pending ? (
          <>
            <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-navy-950/30 border-t-navy-950" />
            {pendingLabel}
          </>
        ) : (
          <>
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            {label}
          </>
        )}
      </button>

      {pending && (
        <div role="status" className="mt-3 w-full max-w-xs rounded-xl border border-cyan/30 bg-navy-900/80 p-4 text-start shadow-glow">
          <p className="mb-3 text-xs text-muted">{note}</p>
          <ol className="space-y-2 text-sm">
            {steps.map((s, i) => (
              <li key={s} className={`flex items-center gap-2.5 ${i <= step ? "text-ink" : "text-muted/50"}`}>
                <span aria-hidden className="flex size-4 shrink-0 items-center justify-center">
                  {i < step ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-teal-strong)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 13 4 4L19 7" />
                    </svg>
                  ) : i === step ? (
                    <span className="size-2.5 rounded-full bg-cyan motion-safe:animate-ping" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-navy-700" />
                  )}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}
