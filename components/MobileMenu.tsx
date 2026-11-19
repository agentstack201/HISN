"use client";
/**
 * Mobile navigation drawer.
 *
 * It is a <details> element so it still opens without JavaScript. This small
 * client component adds what keyboard and touch users expect: Escape closes it,
 * a click outside closes it, and it closes after following a link.
 */
import { useEffect, useRef } from "react";

export default function MobileMenu({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const close = () => el.removeAttribute("open");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && el.open) {
        close();
        el.querySelector("summary")?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (el.open && !el.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <details ref={ref} className="group relative lg:hidden">
      <summary
        className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-white/15 bg-navy-950/60 px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan [&::-webkit-details-marker]:hidden"
        aria-label={label}
      >
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" className="origin-center transition-transform group-open:scale-x-75" />
        </svg>
        {label}
      </summary>
      <div
        className="absolute end-0 z-50 mt-2 w-64 origin-top space-y-1 rounded-xl border border-navy-700 bg-navy-900 p-3 shadow-e3 animate-[pop_var(--duration-fast)_var(--ease-out-soft)]"
        onClick={() => ref.current?.removeAttribute("open")}
      >
        {children}
      </div>
    </details>
  );
}
