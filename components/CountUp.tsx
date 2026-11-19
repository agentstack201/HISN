"use client";
/**
 * Counts from 0 up to a real value when the number scrolls into view.
 *
 * Receives: the final value (always a real number from the database).
 * Used by: the dashboard statistic cards.
 *
 * The final value is rendered on the server too, so the correct number is in
 * the HTML even without JavaScript, and screen readers never read a moving
 * number (aria-hidden on the animated copy).
 */
import { useEffect, useRef, useState } from "react";

const DURATION = 900;

export default function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let start = 0;
      const step = (now: number) => {
        start ||= now;
        const progress = Math.min(1, (now - start) / DURATION);
        // ease-out so it slows down at the end
        setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) requestAnimationFrame(step);
      };
      setShown(0);
      requestAnimationFrame(step);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
