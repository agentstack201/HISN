"use client";
/**
 * Marks the header with data-scrolled="true" once the page is scrolled, so CSS
 * can give it a solid, blurred backdrop. Renders nothing itself.
 */
import { useEffect } from "react";

export default function ScrollState() {
  useEffect(() => {
    const header = document.querySelector("[data-site-header]");
    if (!header) return;
    const update = () => header.setAttribute("data-scrolled", String(window.scrollY > 12));
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return null;
}
