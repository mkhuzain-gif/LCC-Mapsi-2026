"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const registerSW = () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((registration) => {
            console.log("[PWA] Service Worker terdaftar:", registration.scope);

            // Cek update setiap 60 detik
            setInterval(() => {
              registration.update().catch(() => {});
            }, 60 * 1000);
          })
          .catch((err) => {
            console.warn("[PWA] Service Worker gagal terdaftar:", err);
          });
      };

      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
        return () => window.removeEventListener("load", registerSW);
      }
    }
  }, []);

  return null;
}
