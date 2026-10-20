"use client";
/** Registers the service worker and offers a reload when a new version is ready. */
import { useEffect, useState } from "react";

export default function ServiceWorker() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        worker?.addEventListener("statechange", () => {
          // A new worker installed while an old one controls the page = update available.
          if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true);
        });
      });
    });
  }, []);

  if (!updateReady) return null;
  return (
    <div role="status" className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-md border border-teal bg-navy-900 px-4 py-2 text-sm">
      A new version of HISN is available.
      <button className="btn" onClick={() => window.location.reload()}>Reload</button>
    </div>
  );
}
