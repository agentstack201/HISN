"use client";
/**
 * Client-side form wrappers. They only display server responses (errors,
 * "saved" messages, pending state). All validation happens in app/actions.ts.
 */
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";

/** Three dots that pulse in sequence while a form is submitting. */
function Dots() {
  return (
    <span aria-hidden className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: `${i * 120}ms`, animationDuration: "900ms" }} />
      ))}
    </span>
  );
}

export function SubmitButton({
  children,
  className = "btn",
  pendingLabel,
}: {
  children: React.ReactNode;
  className?: string;
  /** Shown instead of the label while the action runs, e.g. "Scanning…". */
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Dots />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** A form bound to a server action that returns FormState. */
export function ActionForm({
  action,
  children,
  messages = {},
  className = "space-y-4",
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  children: React.ReactNode;
  messages?: Record<string, string>;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      {state.error && (
        <p role="alert" className="flex animate-[pop_var(--duration-fast)_var(--ease-out-soft)] items-start gap-2 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          <span aria-hidden>⚠</span>
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="flex animate-[pop_var(--duration-fast)_var(--ease-out-soft)] items-start gap-2 rounded-lg border border-teal/40 bg-teal/10 px-3 py-2 text-sm text-teal-strong">
          <span aria-hidden>✓</span>
          {messages[state.message] ?? state.message}
        </p>
      )}
    </form>
  );
}
