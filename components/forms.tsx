"use client";
/**
 * Client-side form wrappers. They only display server responses (errors,
 * "saved" messages, pending state). All validation happens in app/actions.ts.
 */
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";

export function SubmitButton({ children, className = "btn" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} aria-busy={pending}>
      {pending ? "…" : children}
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
      {state.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-teal-strong">{messages[state.message] ?? state.message}</p>}
    </form>
  );
}
