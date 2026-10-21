"use client";
/**
 * Password input with a show/hide toggle.
 * The toggle only switches the input type; the value is never stored or sent
 * anywhere else, and the field keeps its name so the server action is unchanged.
 */
import { useState } from "react";

export default function PasswordField({
  label,
  showLabel,
  hideLabel,
  autoComplete,
}: {
  label: string;
  showLabel: string;
  hideLabel: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="label" htmlFor="password">
        {label}
      </label>
      <div className="relative">
        <input
          className="input pe-12"
          id="password"
          name="password"
          type={visible ? "text" : "password"}
          minLength={8}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-lg text-muted transition hover:text-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="m4 20 16-16" />}
          </svg>
        </button>
      </div>
    </div>
  );
}
